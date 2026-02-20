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
  const { timeout = 120000 } = options as any;
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

// Helper: Format Date dd-MM-yyyy for Aleph API
function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper: Parse Aleph Date (dd-MM-yyyy or dd/MM/yyyy) to ISO Date Object
function parseAlephDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  // If already ISO (e.g. 2024-01-01T...), pass through
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4)
    return new Date(dateStr);

  // Try parsing dd-MM-yyyy or dd/MM/yyyy
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

// Client Sync Logic
async function syncClients(supabase: any) {
  console.log("[Sync] Syncing Clients (Full Update)...");

  // Fetch ALL clients (no date filter supported)
  const url = `${ALEPH_API_URL}/Clientes/GetClientesAll`;

  console.log(`[Sync] Fetching all clients from Aleph...`);
  const res = await fetchWithTimeout(url, {
    headers: { ...ALEPH_HEADERS, "Cache-Control": "no-cache" },
    timeout: 300000,
  });

  if (!res.ok) throw new Error(`Aleph API Error: ${res.status}`);
  const clients = await res.json();

  if (!Array.isArray(clients)) {
    console.log("[Sync] No clients to update or invalid response.");
    return { success: true, count: 0 };
  }

  const totalClients = clients.length;
  console.log(`[Sync] Found ${totalClients} clients to update.`);

  const CHUNK_SIZE = 100;
  let processedCount = 0;

  for (let i = 0; i < totalClients; i += CHUNK_SIZE) {
    const chunk = clients.slice(i, i + CHUNK_SIZE);

    // Prepare upsert
    const records = chunk.map((c: any) => ({
      codigo_cliente: c.Codigo || c.ID || c.id || c.cliente,
      // Separate Name and Razon Social
      nombre: c.nombre || c.Nombre || c.NOMBRE,
      razon_social: c.razon_social || c.RAZONSOCIAL || c.RazonSocial,
      cuit: c.cuit || c.CUIT || "",
      lis_pre: c.LIS_PRE,
      email: c.EMAIL,
      contacto: c.CONTACTO,
      descuento: c.DESCUENTO,
      descuento_item: c.DESCUENTOITEM,
      fecha_cambio: parseAlephDate(c.FECHACAMBIO),
      fecha_alta: parseAlephDate(c.FECHAALTA),
      cp_ent: c.CP_ENT,
      localidad_ent: c.LOCALIDAD_ENT,
      provincia_ent: c.PROVINCIA_ENT,
      provincia_ent_desc: c.PROVINCIA_ENT_DESC,
      cot_calle: c.COT_CALLE,
      cot_altura: c.COT_ALTURA,
      cot_piso: c.COT_PISO,
      cot_dpto: c.COT_DPTO,
      horario_entrega: c.HORARIO_ENTREGA,
      // New fields mapping
      direccion: c.DIRECCION,
      localidad: c.LOCALIDAD,
      telefono: c.TELEFONO,
      cod_pos: c.COD_POS,
      provincia: c.PROVINCIA,
      expreso: c.EXPRESO,
      dir_ent: c.DIR_ENT,
      pcia_desc: c.PCIA_DESC,
      tip_ins: c.tip_ins || c.TIP_INS, // check casing if needed
      tip_ins_desc: c.TIP_INS_DESC,

      raw_data: c,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("clientes")
      .upsert(records, { onConflict: "codigo_cliente" });

    if (upsertError) {
      console.error(
        `[Sync] Error upserting clients batch ${i}-${i + CHUNK_SIZE}:`,
        upsertError,
      );
      throw upsertError;
    }

    processedCount += records.length;
    console.log(`[Sync] Clients Progress: ${processedCount}/${totalClients}`);

    // Yield to event loop
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return { success: true, count: processedCount };
}

// Vouchers Sync Logic
async function syncVouchers(
  supabase: any,
  fromDateStr?: string,
  toDateStr?: string,
) {
  console.log("[Sync] Syncing Vouchers...");

  // Default dates if not provided
  let fromDate = fromDateStr;
  let toDate = toDateStr;

  if (!fromDate) {
    // Check last voucher date
    const { data: lastVoucher } = await supabase
      .from("comprobantes")
      .select("fecha")
      .order("fecha", { ascending: false })
      .limit(1)
      .single();

    const lastDate = lastVoucher?.fecha
      ? new Date(lastVoucher.fecha)
      : new Date(2025, 0, 1); // Default to Jan 1, 2025 to catch older data if DB is empty

    if (lastVoucher?.fecha) {
      // Enforce fetching starting a few days before the last voucher to catch late inserts
      lastDate.setDate(lastDate.getDate() - 5);
    }

    fromDate = formatDateDDMMYYYY(lastDate);
  }
  if (!toDate) {
    toDate = formatDateDDMMYYYY(new Date());
  }

  const url = `${ALEPH_API_URL}/Pedidos/GetComprobantes?fechadesde=${fromDate}&fechahasta=${toDate}&t=${Date.now()}`;
  console.log(`[Sync] Fetching vouchers from ${fromDate} to ${toDate}...`);

  const res = await fetchWithTimeout(url, {
    headers: { ...ALEPH_HEADERS, "Cache-Control": "no-cache" },
    timeout: 300000,
  });

  if (!res.ok) throw new Error(`Aleph API Error: ${res.status}`);
  const vouchers = await res.json();

  if (!Array.isArray(vouchers)) {
    console.log("[Sync] No vouchers found or invalid response.");
    return { success: true, count: 0 };
  }

  console.log(`[Sync] Found ${vouchers.length} vouchers.`);

  // Process in small chunks - each voucher has nested PedidosItems so payloads get large
  const CHUNK_SIZE = 10;
  let totalUpserted = 0;

  for (let i = 0; i < vouchers.length; i += CHUNK_SIZE) {
    const chunk = vouchers.slice(i, i + CHUNK_SIZE);
    const voucherRecords: any[] = [];

    for (const v of chunk) {
      // Strip PedidosItems from raw_data to reduce payload (items stored separately)
      const { PedidosItems: _items, ...rawWithoutItems } = v;
      voucherRecords.push({
        cliente_id: v.cliente,
        comprobante_tipo_id: v.comprobante,
        numero: v.numero,
        fecha: parseAlephDate(v.fecha),
        hora: v.hora,
        estado: v.estado,
        deposito: v.deposito,
        expreso: v.expreso,
        expreso_cuit: v.expreso_cuit,
        vendedor_id: v.vendedor,
        tipo: v.Tipo,
        descuento: v.Descuento,
        porc_descuento: v.Pordscto,
        iva1: v.iva1,
        iva2: v.iva2,
        porc_iva1: v.poriva1,
        porc_iva2: v.poriva2,
        total: v.Total,
        lis_pre: v.lis_pre,
        cotizacion: v.cotizacion,
        observaciones: v.observ,
        fecha_pedido: parseAlephDate(v.fechapedido),
        cotizacion_uss: v.cotizacionUSS,
        responsable: v.responsable,
        estado_comprobante: v.estadoComprobante,
        raw_data: rawWithoutItems,
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert vouchers with retry
    let upsertedVouchers: any[] | null = null;
    let vError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await supabase
        .from("comprobantes")
        .upsert(voucherRecords, { onConflict: "numero" })
        .select("id, numero");

      if (!result.error) {
        upsertedVouchers = result.data;
        vError = null;
        break;
      }

      vError = result.error;
      console.error(
        `[Sync] Voucher Upsert Error (attempt ${attempt}/3):`,
        vError,
      );
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
    }

    if (vError || !upsertedVouchers) {
      console.error(
        `[Sync] Skipping chunk ${i}-${i + CHUNK_SIZE} after 3 failures`,
      );
      continue;
    }

    totalUpserted += upsertedVouchers.length;

    // Map items to inserted voucher IDs
    const voucherMap = new Map();
    upsertedVouchers.forEach((uv: any) => voucherMap.set(uv.numero, uv.id));

    const itemsRecords: any[] = [];
    for (const v of chunk) {
      const vId = voucherMap.get(v.numero);
      if (!vId || !v.PedidosItems || !Array.isArray(v.PedidosItems)) continue;

      for (const item of v.PedidosItems) {
        itemsRecords.push({
          comprobante_id: vId,
          producto_codigo: item.producto,
          cantidad: item.cantidad,
          precio_unitario: item.preuni,
          porc_desc: item.porcendesc,
          total_linea: item.total,
          cantidad2: item.cantidad2,
          id_lectura: item.idlectura,
        });
      }
    }

    // Replace items for these vouchers
    if (itemsRecords.length > 0) {
      const voucherIds = Array.from(voucherMap.values());
      await supabase
        .from("comprobantes_items")
        .delete()
        .in("comprobante_id", voucherIds);

      // Insert items in sub-chunks of 50 to avoid large payloads
      const ITEMS_CHUNK = 50;
      for (let j = 0; j < itemsRecords.length; j += ITEMS_CHUNK) {
        const itemChunk = itemsRecords.slice(j, j + ITEMS_CHUNK);
        const { error: iError } = await supabase
          .from("comprobantes_items")
          .insert(itemChunk);
        if (iError) console.error("[Sync] Items Insert Error:", iError);
      }
    }

    console.log(
      `[Sync] Vouchers Progress: ${Math.min(i + CHUNK_SIZE, vouchers.length)}/${vouchers.length} (upserted: ${totalUpserted})`,
    );

    // Yield to event loop
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return { success: true, count: vouchers.length };
}

// Config Update Helper
async function updateSyncConfig(supabase: any, collectionName: string) {
  try {
    const now = new Date().toISOString();
    await supabase
      .from("sync_config")
      .update({
        last_run_at: now,
        updated_at: now,
      })
      .eq("collection", collectionName);
  } catch (err) {
    console.error(
      `[Sync] Error updating sync_config for ${collectionName}:`,
      err,
    );
  }
}

// Products Sync Logic
async function syncProducts(supabase: any) {
  console.log("[Sync] Syncing Products...");
  imageCache.clear();
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
    timeout: 300000,
  });
  if (!prodRes.ok) throw new Error("Aleph API Failed");
  const allProducts = await prodRes.json();
  if (!Array.isArray(allProducts)) throw new Error("Invalid format from Aleph");

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
    await mapConcurrentVoid(chunk, FETCH_CONCURRENCY, async (product: any) => {
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
            (acc: number, item: any) => acc + (parseFloat(item.Cantidad) || 0),
            0,
          );
        } else if (typeof stockData === "number") totalStock = stockData;
        else if (stockData?.Stock) totalStock = parseFloat(stockData.Stock);
      } catch (e) {}

      // STOCK FILTER REMOVED: Sync all products regardless of stock
      // if (totalStock <= 0) return;

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
    });

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
        .upsert(childRecords.slice(i, i + CAT_CHUNK), {
          onConflict: "slug",
        });
    }
  }

  // 5. Cleanup
  console.log("[Sync] Cleaning up stale products...");
  const threshold = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  await supabase
    .from("products_data")
    .delete({ count: "exact" })
    .lt("updated_at", threshold);

  const result = { success: true, count: upserted };
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response(
      "Sync Service Ready. Use POST with ?type=products|clients|comprobantes|all",
    );
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all";
    const fromDate = url.searchParams.get("fechadesde");
    const toDate = url.searchParams.get("fechahasta");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let result;

    if (type === "clients") {
      result = await syncClients(supabase);
      await updateSyncConfig(supabase, "clients");
    } else if (type === "comprobantes") {
      result = await syncVouchers(
        supabase,
        fromDate || undefined,
        toDate || undefined,
      );
      await updateSyncConfig(supabase, "comprobantes");
    } else if (type === "products") {
      result = await syncProducts(supabase);
      await updateSyncConfig(supabase, "products");
    } else {
      console.log("[Sync] Starting FULL Sync...");
      const resClients = await syncClients(supabase);
      await updateSyncConfig(supabase, "clients");

      const resVouchers = await syncVouchers(
        supabase,
        fromDate || undefined,
        toDate || undefined,
      );
      await updateSyncConfig(supabase, "comprobantes");

      const resProducts = await syncProducts(supabase);
      await updateSyncConfig(supabase, "products");

      result = {
        clients: resClients,
        comprobantes: resVouchers,
        products: resProducts,
      };
    }

    console.log("[Sync] Done.");
    return new Response(JSON.stringify(result), {
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
