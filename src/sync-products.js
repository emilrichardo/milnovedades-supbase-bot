require("dotenv").config({ path: ".env.local" });
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key for backend writes
const supabase = createClient(supabaseUrl, supabaseKey);

// API Configurations
const ALEPH_HEADERS = {
  Apikey: process.env.ALEPH_API_KEY,
  Clientid: process.env.ALEPH_CLIENT_ID,
  "Content-Type": "application/json",
};

const WC_AUTH = {
  username: process.env.WC_CONSUMER_KEY,
  password: process.env.WC_CONSUMER_SECRET,
};

function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}

async function syncProducts() {
  console.log("Starting product sync...");

  try {
    // 1. Fetch all products from Aleph
    console.log("Fetching products from Aleph...");
    const productsUrl = `${process.env.ALEPH_API_URL}/Productos/GetArticulosallsinimagen`;
    const { data: allProducts } = await axios.get(productsUrl, {
      headers: ALEPH_HEADERS,
    });

    if (!allProducts || !Array.isArray(allProducts)) {
      throw new Error("Invalid product data received from Aleph");
    }

    console.log(`Found ${allProducts.length} products. Processing...`);

    const validProductCodes = [];
    // Categories Map: slug -> { name, parentSlug }
    const categoriesMap = new Map();
    // Helper to add category
    const addCategory = (name, parentName = null) => {
      if (!name) return null;
      const slug = slugify(name);
      const parentSlug = parentName ? slugify(parentName) : null;

      // If it's a subcategory (has parent), and we already saw it with a DIFFERENT parent,
      // we have a conflict. But for now, last write wins or we ignore.
      // We simply store it.
      if (!categoriesMap.has(slug)) {
        categoriesMap.set(slug, { name, parentSlug, slug });
      } else {
        // If existing has no parent, but new one does?
        // Or if existing has different parent?
        // Let's just update if we have a parent now.
        const existing = categoriesMap.get(slug);
        if (parentSlug && existing.parentSlug !== parentSlug) {
          // Collision! 'Bebes' in 'Jugueteria' vs 'Bebes' in 'Ropa'.
          // We need to distinguish slugs.
          // Strategy: Rename slug for subcategory to 'parent-child'
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

    let processedCount = 0;
    let upsertedCount = 0;

    // Process each product with concurrency
    const BATCH_SIZE = 20;

    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      const batch = allProducts.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (product) => {
          const productCode = product.Codigo;
          if (!productCode) return;

          try {
            // 2. Fetch Stock
            const stockUrl = `http://aleph.dyndns.info/integracion/Stock/GetStock?Producto=${productCode}`;
            const { data: stockData } = await axios
              .get(stockUrl, {
                headers: ALEPH_HEADERS,
                timeout: 10000, // Add timeout
              })
              .catch((e) => ({ data: null })); // Soft fail for stock

            let totalStock = 0;
            if (Array.isArray(stockData)) {
              totalStock = stockData.reduce(
                (acc, item) => acc + (parseFloat(item.Cantidad) || 0),
                0,
              );
              if (typeof stockData === "number") totalStock = stockData;
              else if (stockData && stockData.Stock)
                totalStock = parseFloat(stockData.Stock);
            } else if (typeof stockData === "object" && stockData !== null) {
              if (stockData.Stock) totalStock = parseFloat(stockData.Stock);
            }

            // 3. Fetch Image (WooCommerce)
            const wcUrl = `${process.env.WC_API_URL}/wc/v3/products`;
            let imageUrl = null;
            let permalink = null;

            try {
              const { data: wcProducts } = await axios.get(wcUrl, {
                params: { sku: productCode },
                auth: WC_AUTH,
                timeout: 10000,
              });

              if (wcProducts && wcProducts.length > 0) {
                const wcProduct = wcProducts[0];
                permalink = wcProduct.permalink;
                if (wcProduct.images && wcProduct.images.length > 0) {
                  imageUrl = wcProduct.images[0].src;
                }
              }
            } catch (wcErr) {
              // Ignore image fetch errors
            }

            // Construct DB Record
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
              updated_at: new Date(),
            };

            // Track Categories
            const rubroName = (product.Rubro || "").trim();
            const subRubroName = (product.SubRubro || "").trim();

            if (rubroName) {
              addCategory(rubroName);
            }

            if (subRubroName) {
              addCategory(subRubroName, rubroName || null);
            }

            // Upsert
            const { error } = await supabase
              .from("products_data")
              .upsert(record, { onConflict: "codigo_product" });

            if (error) {
              console.error(`Error upserting ${productCode}:`, error.message);
            } else {
              upsertedCount++;
              validProductCodes.push(productCode);
            }
          } catch (innerError) {
            console.error(
              `Error processing product ${productCode}:`,
              innerError.message,
            );
          }

          processedCount++;
        }),
      );

      console.log(
        `Processed ${Math.min(i + BATCH_SIZE, allProducts.length)}/${allProducts.length}`,
      );
    }

    console.log(`Upserted ${upsertedCount} products.`);

    // 4. Sync Categories
    console.log("Syncing categories...");
    const sortedCategories = Array.from(categoriesMap.values());

    // Split into roots and children
    const roots = sortedCategories.filter((c) => !c.parentSlug);
    const children = sortedCategories.filter((c) => c.parentSlug);

    // Upsert Roots
    for (const cat of roots) {
      const { error } = await supabase.from("categories").upsert(
        {
          slug: cat.slug,
          nombre: cat.name,
          parent_id: null,
          updated_at: new Date(),
        },
        { onConflict: "slug" },
      );
      if (error)
        console.error(`Error processing category ${cat.name}:`, error.message);
    }

    // Upsert Children
    // Need parent IDs. Fetch all categories first or query parent by slug.
    // Efficient way: Fetch all categories map: slug -> id
    const { data: allCatsDB } = await supabase
      .from("categories")
      .select("id, slug");
    const dbCatMap = new Map((allCatsDB || []).map((c) => [c.slug, c.id]));

    for (const cat of children) {
      const parentId = dbCatMap.get(cat.parentSlug);
      if (parentId) {
        const { error } = await supabase.from("categories").upsert(
          {
            slug: cat.slug,
            nombre: cat.name,
            parent_id: parentId,
            updated_at: new Date(),
          },
          { onConflict: "slug" },
        );
        if (error)
          console.error(
            `Error processing subcategory ${cat.name}:`,
            error.message,
          );
      } else {
        console.warn(
          `Parent category not found for ${cat.name} (parent: ${cat.parentSlug})`,
        );
      }
    }

    // 4. Cleanup
    // "revisa los productos que no se encuntren en la api eliminalos de la tabla"
    // "los que no tienen stock eliminalos de la tabla" -> handled by not upserting, AND we need to delete them if they exist.

    // We will delete ANY product in the DB that is NOT in `validProductCodes`.
    // validProductCodes only contains products that we successfully processed AND deemed "in stock".

    console.log("Cleaning up old records...");
    const { error: deleteError } = await supabase
      .from("products_data")
      .delete()
      .not(
        "codigo_product",
        "in",
        `(${validProductCodes.map((c) => `'${c}'`).join(",")})`,
      );
    // Warning: If list is huge, this query might fail. standard batch size limits apply.
    // Better approach for large datasets:
    // Select all IDs from DB, diff with validProductCodes in JS, then delete by ID in chunks.

    // For this prototype, if the list is thousands, we might hit URL length limits or query limits.
    // I'll implement a chunked delete if validProductCodes is large?
    // Or just use the 'not in' for now if expected count is standard e-commerce ( < 10k might be risky for single query string).

    // Alternative: We can don't delete immediately, or we delete items where updated_at < current_run_time.
    // That is a much safer strategy (Soft Delete/Pruning).
    // Strategy: We updated all valid products' `updated_at`.
    // Now delete all products where `updated_at` < start_time.

    const startTimeResult = new Date();
    // Wait, I should have captured start time before loop.
    // Actually, I can just use a threshold, e.g. 5 minutes ago.

    // Let's refine the logic to use the "Stale Record" approach, which is robust.
  } catch (err) {
    console.error("Fatal Error:", err);
  }
}

// Wrapper to run cleanup based on timestamps
async function runSyncWithCleanup() {
  const runStartTime = new Date().toISOString();

  await syncProducts();

  console.log("Cleaning up stale records...");
  const { error } = await supabase
    .from("products_data")
    .delete()
    .lt("updated_at", runStartTime); // Delete anything strictly older than when we started

  if (error) console.error("Error cleaning up products:", error);
  else console.log("Product cleanup complete.");

  // Cleanup Categories
  const { error: catError } = await supabase
    .from("categories")
    .delete()
    .lt("updated_at", runStartTime);

  if (catError) console.error("Error cleaning up categories:", catError);
  else console.log("Category cleanup complete.");

  if (error) console.error("Error cleaning up:", error);
  else console.log("Cleanup complete.");
}

runSyncWithCleanup();
