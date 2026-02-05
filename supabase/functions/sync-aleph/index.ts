import { createClient } from "jsr:@supabase/supabase-js@2";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
// Use SERVICE_ROLE_KEY (local) or fallback to platform injected SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

const ALEPH_API_URL = Deno.env.get("ALEPH_API_URL") ?? "";
const ALEPH_API_KEY = Deno.env.get("ALEPH_API_KEY") ?? "";
const ALEPH_CLIENT_ID = Deno.env.get("ALEPH_CLIENT_ID") ?? "";
const WC_API_URL = Deno.env.get("WC_API_URL") ?? "";
const WC_CONSUMER_KEY = Deno.env.get("WC_CONSUMER_KEY") ?? "";
const WC_CONSUMER_SECRET = Deno.env.get("WC_CONSUMER_SECRET") ?? "";

// Headers & Auth
const ALEPH_HEADERS = {
  Apikey: ALEPH_API_KEY,
  Clientid: ALEPH_CLIENT_ID,
  "Content-Type": "application/json",
  "User-Agent": "BotMilu/1.0",
};

const WC_AUTH_HEADER = `Basic ${btoa(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`)}`;

// Helper: Slugify
function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Helper: Fetch with Timeout
async function fetchWithTimeout(resource: string, options: RequestInit = {}) {
  const { timeout = 10000 } = options as any;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse Offset
    let body = {};
    try {
      body = await req.json();
    } catch (e) {}
    const offset = (body as any).offset || 0;
    const BATCH_LIMIT = 10; // Drastically reduced to prevent Supervisor Timeout (CPU/Memory limits)

    console.log(`[Sync] Starting run. Offset: ${offset}`);

    // Fetch Products (Retry Logic)
    const productsUrl = `${ALEPH_API_URL}/Productos/GetArticulosallsinimagen`;
    let prodRes;
    let attempts = 0;
    const MAX_RETRIES = 3;

    while (attempts < MAX_RETRIES) {
      try {
        prodRes = await fetchWithTimeout(productsUrl, {
          headers: ALEPH_HEADERS,
          timeout: 60000,
        });
        if (prodRes.ok) break;
        console.warn(
          `[Sync] Attempt ${attempts + 1} failed: ${prodRes.status} ${prodRes.statusText}`,
        );
      } catch (e) {
        console.warn(`[Sync] Attempt ${attempts + 1} exception:`, e);
      }
      attempts++;
      if (attempts < MAX_RETRIES) await new Promise((r) => setTimeout(r, 2000));
    }

    if (!prodRes || !prodRes.ok) {
      const errorBody = prodRes ? await prodRes.text() : "No response";
      throw new Error(
        `[Sync] Aleph API Failed. Status: ${prodRes?.status}. details: ${errorBody.substring(0, 200)}`,
      );
    }

    const allProducts = await prodRes.json();
    if (!Array.isArray(allProducts))
      throw new Error("[Sync] Invalid format from Aleph");

    const totalProducts = allProducts.length;
    console.log(`[Sync] Total Products available: ${totalProducts}`);

    // Check if we are done
    if (offset >= totalProducts) {
      console.log("[Sync] All batches complete. Running final cleanup...");
      const threshold = new Date(Date.now() - 1000 * 60 * 60).toISOString();

      const { error: prodDelError, count: deletedProds } = await supabase
        .from("products_data")
        .delete({ count: "exact" })
        .lt("updated_at", threshold);

      if (prodDelError) {
        console.error("[Sync] Cleanup error:", prodDelError);
      }
      console.log(
        `[Sync] Final Cleanup complete. Deleted ${deletedProds} stale products.`,
      );
      return new Response(
        JSON.stringify({ success: true, message: "Sync Completed" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Process Batch
    const batch = allProducts.slice(offset, offset + BATCH_LIMIT);
    console.log(
      `[Sync] Processing batch ${offset} to ${offset + batch.length} of ${totalProducts}...`,
    );

    // Check if target missing product is in this batch
    const missingTarget = batch.find((p: any) => p.Codigo === "HA0383");
    if (missingTarget)
      console.log(
        `[DEBUG] Found HA0383 in batch. Raw Data:`,
        JSON.stringify(missingTarget),
      );

    const categoriesMap = new Map();
    const addCategory = (name: string, parentName: string | null = null) => {
      if (!name) return null;
      const slug = slugify(name);
      const parentSlug = parentName ? slugify(parentName) : null;
      if (!categoriesMap.has(slug))
        categoriesMap.set(slug, { name, parentSlug, slug });
      return slug;
    };

    let upsertedCount = 0;
    let deletedCount = 0;

    await Promise.all(
      batch.map(async (product: any) => {
        const productCode = product.Codigo;
        if (!productCode) return;

        try {
          // 1. Get Stock
          let stockData: any = null;
          try {
            const stockUrl = `http://aleph.dyndns.info/integracion/Stock/GetStock?Producto=${productCode}`;
            const stockRes = await fetchWithTimeout(stockUrl, {
              headers: ALEPH_HEADERS,
              timeout: 5000,
            });
            if (stockRes.ok) stockData = await stockRes.json();
          } catch (e) {}

          // 2. Calculate Total Stock
          let totalStock = 0;
          let hasEmptyStockArray = false; // Flag for [] response

          if (Array.isArray(stockData)) {
            if (stockData.length === 0) hasEmptyStockArray = true;
            else
              totalStock = stockData.reduce(
                (acc: number, item: any) =>
                  acc + (parseFloat(item.Cantidad) || 0),
                0,
              );
          } else if (typeof stockData === "number") {
            totalStock = stockData;
          } else if (stockData && stockData.Stock) {
            totalStock = parseFloat(stockData.Stock);
          }

          // Debug specific product stock
          if (productCode === "HA0383") {
            console.log(
              `[DEBUG] HA0383 Stock Data:`,
              JSON.stringify(stockData),
              ` Calculated Total: ${totalStock}, EmptyArray: ${hasEmptyStockArray}`,
            );
          }

          // ACTION: Delete if No Stock (AND not an explicit empty array case if that means "Available but uncounted"?)
          // User Request: "carga los que tengaan stock [] aaunque esten vacios" -> Load them even if they are empty arrays.
          if (totalStock <= 0 && !hasEmptyStockArray) {
            const { error } = await supabase
              .from("products_data")
              .delete()
              .eq("codigo_product", productCode);
            if (!error) deletedCount++;
            return;
          }

          // 3. Get Image (WooCommerce)
          let imageUrl = null;
          let permalink = null;
          try {
            // Note: Searching by SKU is efficient in WC. Pagination is not needed for single SKU lookup.
            const wcRes = await fetchWithTimeout(
              `${WC_API_URL}/wc/v3/products?sku=${productCode}`,
              {
                headers: { Authorization: WC_AUTH_HEADER },
                timeout: 5000,
              },
            );
            if (wcRes.ok) {
              const wcData = await wcRes.json();
              if (Array.isArray(wcData) && wcData.length > 0) {
                const match = wcData[0]; // Assume first match is correct
                permalink = match.permalink;
                if (match.images?.length > 0) imageUrl = match.images[0].src;

                if (productCode === "HA0383")
                  console.log(`[DEBUG] HA0383 Image Found: ${imageUrl}`);
              }
            }
          } catch (e) {}

          // 4. Prepare Record
          const record = {
            codigo_product: productCode,
            nombre: product.Nombre,
            stock_json: stockData || {},
            imagen: imageUrl || product.Imagen1,
            precio_minorista: product.Precio1,
            precio_mayorista: product.Precio2,
            precio_emprendedor: product.Precio3,
            permalink: permalink,
            rubro: product.Rubro,
            subrubro: product.SubRubro,
            sku: product.Barras || productCode,
            updated_at: new Date().toISOString(),
          };

          const rubroName = (product.Rubro || "").trim();
          const subRubroName = (product.SubRubro || "").trim();
          if (rubroName) addCategory(rubroName);
          if (subRubroName) addCategory(subRubroName, rubroName || null);

          // 5. Upsert
          const { error } = await supabase
            .from("products_data")
            .upsert(record, { onConflict: "codigo_product" });
          if (!error) upsertedCount++;
          else
            console.error(
              `[Sync] Upsert Error for ${productCode}: ${error.message}`,
            );
        } catch (err) {
          console.error(`[Sync] Error processing item ${productCode}:`, err);
        }
      }),
    );

    // Upsert Categories found in this batch
    const cats = Array.from(categoriesMap.values());
    for (const c of cats) {
      // Simple linear upsert for safety
      if (!c.parentSlug) {
        await supabase.from("categories").upsert(
          {
            slug: c.slug,
            nombre: c.name,
            parent_id: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" },
        );
      } else {
        // resolving parent id is hard without checking DB.
        // Ideally we cache this or we trust the slug relationship if we enforce strict slug consistency.
        // For batching, let's look up parent slug in DB.
        const { data: pData } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", c.parentSlug)
          .single();
        if (pData) {
          await supabase.from("categories").upsert(
            {
              slug: c.slug,
              nombre: c.name,
              parent_id: pData.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "slug" },
          );
        }
      }
    }

    console.log(
      `[Sync] Batch Result: ${upsertedCount} Upserted, ${deletedCount} Deleted (No Stock).`,
    );

    // Recursive Invocation
    const nextOffset = offset + BATCH_LIMIT;
    if (nextOffset < totalProducts) {
      console.log(`[Sync] Scheduling next batch: ${nextOffset}`);

      const authHeader =
        req.headers.get("Authorization") ||
        `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

      // Use EdgeRuntime.waitUntil to prevent blocking response
      // @ts-ignore
      const promise = fetch(req.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ offset: nextOffset }),
      });

      // Check if EdgeRuntime is available
      if (typeof EdgeRuntime !== "undefined") {
        EdgeRuntime.waitUntil(promise);
      } else {
        // Local fallback: we don't await the result body, but we await the request sending?
        // Or just let it float (might get killed)
        promise.catch((e) => console.error("Recursive fetch failed", e));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        offset: nextOffset,
        upserted: upsertedCount,
        deleted_no_stock: deletedCount,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Sync] Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
