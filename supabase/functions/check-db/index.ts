import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

console.log(`Checking DB at: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from("products_data")
  .select("*")
  .eq("codigo_product", "HA0383");

if (error) {
  console.error("Error fetching:", error);
} else {
  console.log("Result:", data);
  console.log("Count:", data?.length);
}
