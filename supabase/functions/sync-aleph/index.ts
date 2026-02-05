import { createClient } from "jsr:@supabase/supabase-js@2";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);
  return response;
}

Deno.serve(async (req) => {
  try {
    console.log("Starting sync-aleph function...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const runStartTime = new Date().toISOString();

    // 1. Fetch Products
    console.log("Fetching products from Aleph...");
    const productsUrl = `${ALEPH_API_URL}/Productos/GetArticulosallsinimagen`;
    const prodRes = await fetch(productsUrl, { headers: ALEPH_HEADERS });

    if (!prodRes.ok) throw new Error(`Aleph API Error: ${prodRes.statusText}`);
    const allProducts = await prodRes.json();

    if (!Array.isArray(allProducts))
      throw new Error("Invalid product data from Aleph");

    console.log(`Found ${allProducts.length} products to process.`);

    const validProductCodes: string[] = [];
    const categoriesMap = new Map();
    let upsertedCount = 0;

    // Category Helper
    const addCategory = (name: string, parentName: string | null = null) => {
      if (!name) return null;
      const slug = slugify(name);
      const parentSlug = parentName ? slugify(parentName) : null;

      if (!categoriesMap.has(slug)) {
        categoriesMap.set(slug, { name, parentSlug, slug });
      } else {
        const existing = categoriesMap.get(slug);
        if (parentSlug && existing.parentSlug !== parentSlug) {
          const compoundedSlug = slugify(`${parentName}-${name}`);
          categoriesMap.set(compoundedSlug, {
            name,
            parentSlug,
            slug: compoundedSlug,
          });
          return compoundedSlug;
        }
      }
      return slug;
    };

    // 2. Process in Batches
    const BATCH_SIZE = 20;

    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      const batch = allProducts.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (product: any) => {
          const productCode = product.Codigo;
          if (!productCode) return;

          try {
            // Fetch Stock
            let stockData: any = null;
            try {
              const stockUrl = `http://aleph.dyndns.info/integracion/Stock/GetStock?Producto=${productCode}`;
              const stockRes = await fetchWithTimeout(stockUrl, {
                headers: ALEPH_HEADERS,
              });
              if (stockRes.ok) stockData = await stockRes.json();
            } catch (e) {
              // console.warn(`Stock fetch failed for ${productCode}`, e);
            }

            // Process Stock
            let totalStock = 0;
            // Logic adapted from Node script
            if (Array.isArray(stockData)) {
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

            // Fetch Image (WooCommerce)
            let imageUrl = null;
            let permalink = null;
            try {
              const wcUrl = `${WC_API_URL}/wc/v3/products?sku=${productCode}`;
              const wcRes = await fetchWithTimeout(wcUrl, {
                headers: { Authorization: WC_AUTH_HEADER },
              });
              if (wcRes.ok) {
                const wcProducts = await wcRes.json();
                if (Array.isArray(wcProducts) && wcProducts.length > 0) {
                  const p = wcProducts[0];
                  permalink = p.permalink;
                  if (p.images && p.images.length > 0)
                    imageUrl = p.images[0].src;
                }
              }
            } catch (e) {
              // console.warn(`Image fetch failed for ${productCode}`);
            }

            // DB Record
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

            // Categories
            const rubroName = (product.Rubro || "").trim();
            const subRubroName = (product.SubRubro || "").trim();
            if (rubroName) addCategory(rubroName);
            if (subRubroName) addCategory(subRubroName, rubroName || null);

            // Upsert Product
            const { error } = await supabase
              .from("products_data")
              .upsert(record, { onConflict: "codigo_product" });

            if (!error) {
              upsertedCount++;
              validProductCodes.push(productCode);
            } else {
              console.error(`DB Error ${productCode}:`, error.message);
            }
          } catch (err) {
            console.error(`Processing Error ${productCode}:`, err);
          }
        }),
      );
    }

    console.log(`Products Upserted: ${upsertedCount}`);

    // 3. Process Categories
    console.log("Syncing categories...");
    const sortedCategories = Array.from(categoriesMap.values());
    const roots = sortedCategories.filter((c: any) => !c.parentSlug);
    const children = sortedCategories.filter((c: any) => c.parentSlug);

    // Roots
    for (const cat of roots) {
      await supabase.from("categories").upsert(
        {
          slug: cat.slug,
          nombre: cat.name,
          parent_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      );
    }

    // Children
    const { data: allCatsDB } = await supabase
      .from("categories")
      .select("id, slug");
    const dbCatMap = new Map((allCatsDB || []).map((c: any) => [c.slug, c.id]));

    for (const cat of children) {
      const parentId = dbCatMap.get(cat.parentSlug);
      if (parentId) {
        await supabase.from("categories").upsert(
          {
            slug: cat.slug,
            nombre: cat.name,
            parent_id: parentId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" },
        );
      }
    }

    // 4. Stale Record Cleanup
    console.log("Cleaning up stale records...");

    const { error: prodDelError } = await supabase
      .from("products_data")
      .delete()
      .lt("updated_at", runStartTime);

    const { error: catDelError } = await supabase
      .from("categories")
      .delete()
      .lt("updated_at", runStartTime);

    return new Response(
      JSON.stringify({
        success: true,
        processed: allProducts.length,
        upserted: upsertedCount,
        cleanup_status: {
          product_error: prodDelError,
          category_error: catDelError,
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
