require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function check() {
  const { data: rubros, error } = await supabase
    .from("products_data")
    .select("rubro")
    .order("rubro");

  if (error) {
    console.error(error);
    return;
  }

  const uniqueRubros = [...new Set(rubros.map((r) => r.rubro))];
  console.log("Unique Rubros in DB:", uniqueRubros);

  const { data: subrubros } = await supabase
    .from("products_data")
    .select("subrubro");

  const uniqueSub = [...new Set(subrubros.map((r) => r.subrubro))];
  console.log("Unique SubRubros in DB:", uniqueSub);

  const { count } = await supabase
    .from("products_data")
    .select("*", { count: "exact", head: true });
  console.log("Total Products in DB:", count);
}

check();
