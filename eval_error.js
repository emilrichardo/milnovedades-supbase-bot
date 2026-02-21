const { createClient } = require("@supabase/supabase-js");
const v = {
  cliente: 37599,
  comprobante: 100,
  numero: "X0007-00014193",
  fecha: "01-12-2025",
  hora: "08:22:15",
};

async function test() {
  const supabase = createClient(
    "http://127.0.0.1:54321",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE2MTg1NzksImV4cCI6MjA4Njk3ODU3OX0.nSichv8WJWPnl8ppwr4kEgHgcyGgeAdQlu8x2-QpxdM",
  );

  const rec = {
    cliente_id: v.cliente,
    comprobante_tipo_id: v.comprobante,
    numero: v.numero,
    fecha: null,
    hora: v.hora,
  };

  const res = await supabase.from("comprobantes").upsert([rec]);
  console.log("Upsert response:", JSON.stringify(res));
}
test().catch(console.error);
