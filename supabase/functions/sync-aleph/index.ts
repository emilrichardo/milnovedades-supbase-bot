import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const { timeout = 30000 } = options as any;
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

// Helper: Map Concurrent (Optimized for void/no-result accumulation)
async function mapConcurrentVoid(
  items: any[],
  concurrency: number,
  fn: (item: any) => Promise<void>,
) {
  const executing: Promise<void>[] = [];
  for (const item of items) {
    const p = fn(item).then(() => {
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

// Image Cache Map: SKU -> Data
const imageCache = new Map<string, any>();

async function preloadWcImages() {
  console.log("[Sync] Preloading WC Images...");
  // ... (Keep existing fetch logic if needed, but for now assuming it works or we optimize later)
  // For safety, let's keep the original logic but handle errors better
  try {
    // Simplification: We will run this but with better error handling
    let page = 1;
    const perPage = 100;

    // First fetch pages count.
    const url = `${WC_API_URL}/wc/v3/products?per_page=${perPage}&page=1&fields=id,sku,images,permalink`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: WC_AUTH_HEADER },
    });
    if (!res.ok) {
      console.log(`[Sync] WC Error (Skipping Images): ${res.status}`);
      return;
    }

    const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1");
    const data = await res.json();
    processWcChunk(data);
    console.log(`[Sync] Page 1/${totalPages} cached.`);

    if (totalPages > 1) {
      const pages = [];
      for (let p = 2; p <= totalPages; p++) pages.push(p);

      // Lower concurrency for WC too
      await mapConcurrentVoid(pages, 3, async (p) => {
        try {
          const pUrl = `${WC_API_URL}/wc/v3/products?per_page=${perPage}&page=${p}&fields=id,sku,images,permalink`;
          const pRes = await fetchWithTimeout(pUrl, {
            headers: { Authorization: WC_AUTH_HEADER },
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            processWcChunk(pData);
          }
        } catch (e) {
          console.error(`Error fetching WC page ${p}`, e);
        }
      });
    }
  } catch (e) {
    console.error("Error preloading images", e);
  }
  console.log(`[Sync] Cached images for ${imageCache.size} products.`);
}

function processWcChunk(data: any[]) {
  if (!Array.isArray(data)) return;
  for (const item of data) {
    if (item.sku) {
      const images =
        item.images?.map((img: any) => ({
          id: img.id,
          src: img.src,
          name: img.name,
          alt: img.alt,
        })) || [];
      imageCache.set(item.sku, { images, permalink: item.permalink });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response("Sync Service Ready");
  }

  try {
    imageCache.clear(); // Ensure fresh cache for each execution
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Preload Images
    await preloadWcImages();

    // 2. Fetch All Products from Aleph
    console.log("[Sync] Fetching Aleph Products...");
    // Add cache buster to URL
    const productsUrl = `${ALEPH_API_URL}/Productos/GetArticulosallsinimagen?t=${Date.now()}`;
    const prodRes = await fetchWithTimeout(productsUrl, {
      headers: {
        ...ALEPH_HEADERS,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      timeout: 60000,
    });
    if (!prodRes.ok) throw new Error("Aleph API Failed");
    const allProducts = await prodRes.json();
    if (!Array.isArray(allProducts))
      throw new Error("Invalid format from Aleph");

    const total = allProducts.length;
    console.log(`[Sync] Processing ${total} products...`);

    // 3. Process in chunks
    // Reduced chunk size and concurrency to fit within CPU limits
    const CHUNK_SIZE = 50;
    const FETCH_CONCURRENCY = 25; // Increased from 10 to 25 to improve speed

    let processed = 0;
    let upserted = 0;

    const categoriesMap = new Map();
    const addCategory = (name: string, parentName: string | null = null) => {
      if (!name) return null;
      const slug = slugify(name);
      const parentSlug = parentName ? slugify(parentName) : null;
      if (!categoriesMap.has(slug))
        categoriesMap.set(slug, { name, parentSlug, slug });
      return slug;
    };

    const startTime = Date.now();

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = allProducts.slice(i, i + CHUNK_SIZE);
      const records: any[] = [];

      // Fetch Stock Concurrently
      await mapConcurrentVoid(
        chunk,
        FETCH_CONCURRENCY,
        async (product: any) => {
          const code = product.Codigo;
          if (!code) return;

          // Stock
          let stockData: any = null;
          let totalStock = 0;
          try {
            const stockUrl = `http://aleph.dyndns.info/integracion/Stock/GetStock?Producto=${code}`;
            const stockRes = await fetchWithTimeout(stockUrl, {
              headers: ALEPH_HEADERS,
              timeout: 5000,
            });
            if (stockRes.ok) stockData = await stockRes.json();

            if (Array.isArray(stockData)) {
              totalStock = stockData.reduce(
                (acc: number, item: any) =>
                  acc + (parseFloat(item.Cantidad) || 0),
                0,
              );
            } else if (typeof stockData === "number") totalStock = stockData;
            else if (stockData?.Stock) totalStock = parseFloat(stockData.Stock);
          } catch (e) {}

          if (totalStock <= 0) return;

          // Images (From Cache)
          const cached = imageCache.get(code) || imageCache.get(product.Barras);
          const images = cached?.images || [];
          const permalink = cached?.permalink || null;

          // Categories
          const rubroName = (product.Rubro || "").trim();
          const subRubroName = (product.SubRubro || "").trim();
          if (rubroName) addCategory(rubroName);
          if (subRubroName) addCategory(subRubroName, rubroName || null);

          // Record
          records.push({
            codigo_product: code,
            nombre: product.Nombre,
            stock_json: stockData || {},
            imagen: images.length > 0 ? images[0].src : product.Imagen1,
            images: images,
            precio_minorista: product.Precio1,
            precio_mayorista: product.Precio2,
            precio_emprendedor: product.Precio3,
            permalink: permalink,
            rubro: product.Rubro,
            subrubro: product.SubRubro,
            sku: product.Barras || code,
            updated_at: new Date().toISOString(),
          });
        },
      );

      // Bulk Upsert
      if (records.length > 0) {
        const { error } = await supabase
          .from("products_data")
          .upsert(records, { onConflict: "codigo_product" });
        if (error) console.error("[Sync] Bulk Upsert Error:", error);
        else upserted += records.length;
      }

      processed += chunk.length;
      console.log(`[Sync] Progress: ${processed}/${total}`);
    }

    // 4. Upsert Categories
    console.log("[Sync] Upserting Categories...");
    const cats = Array.from(categoriesMap.values());

    // Roots
    const roots = cats.filter((c) => !c.parentSlug);
    if (roots.length > 0) {
      // Batch categories upsert too
      const CAT_CHUNK = 50;
      for (let i = 0; i < roots.length; i += CAT_CHUNK) {
        await supabase.from("categories").upsert(
          roots.slice(i, i + CAT_CHUNK).map((c) => ({
            slug: c.slug,
            nombre: c.name,
            parent_id: null,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "slug" },
        );
      }
    }

    // Childs
    const childs = cats.filter((c) => c.parentSlug);
    if (childs.length > 0) {
      const { data: catData } = await supabase
        .from("categories")
        .select("id, slug");
      const catIdMap = new Map(catData?.map((x: any) => [x.slug, x.id]));

      const childRecords = childs.map((c) => ({
        slug: c.slug,
        nombre: c.name,
        parent_id: catIdMap.get(c.parentSlug) || null,
        updated_at: new Date().toISOString(),
      }));

      const CAT_CHUNK = 50;
      for (let i = 0; i < childRecords.length; i += CAT_CHUNK) {
        await supabase
          .from("categories")
          .upsert(childRecords.slice(i, i + CAT_CHUNK), { onConflict: "slug" });
      }
    }

    // 5. Cleanup
    console.log("[Sync] Cleaning up stale products...");
    const threshold = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    await supabase
      .from("products_data")
      .delete({ count: "exact" })
      .lt("updated_at", threshold);

    console.log("[Sync] Done.");
    return new Response(JSON.stringify({ success: true, count: upserted }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Sync] Fatal:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
