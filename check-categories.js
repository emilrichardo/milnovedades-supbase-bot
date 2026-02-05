require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function check() {
  console.log("Checking Categories Table...");
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("nombre");

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${categories.length} categories.`);
  console.log(
    categories.map((c) => `${c.nombre} (Parent: ${c.parent_id})`).join("\n"),
  );
}

check();
