require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function test() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SERVICE_ROLE_KEY,
  );

  // fetch aleph data first
  const fetchUrl =
    "http://aleph.dyndns.info/integracion/api/Pedidos/GetComprobantes?fechadesde=1-11-2025&fechahasta=1-2-2026";
  const res = await fetch(fetchUrl, {
    headers: {
      Apikey: process.env.ALEPH_API_KEY,
      Clientid: process.env.ALEPH_CLIENT_ID,
    },
  });
  const data = await res.json();

  const voucherRecords = data.map((v) => {
    const { PedidosItems: _items, ...rawWithoutItems } = v;
    return {
      cliente_id: v.cliente,
      comprobante_tipo_id: v.comprobante,
      numero: v.numero,
      fecha: v.fecha
        ? new Date(v.fecha.split("-").reverse().join("-")).toISOString()
        : null, // or just whatever parseAlephDate does
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
      fecha_pedido:
        v.fechapedido &&
        v.fechapedido.includes("-") &&
        v.fechapedido.split("-")[0].length === 4
          ? new Date(v.fechapedido).toISOString()
          : null,
      cotizacion_uss: v.cotizacionUSS,
      responsable: v.responsable,
      estado_comprobante: v.estadoComprobante,
      raw_data: rawWithoutItems,
      updated_at: new Date().toISOString(),
    };
  });

  console.log("Vouchers:", voucherRecords.length);

  const result = await supabase
    .from("comprobantes")
    .upsert(voucherRecords.slice(0, 10), { onConflict: "numero" })
    .select("id, numero");
  console.log(
    "Result:",
    result.error ? result.error : "SUCCESS: " + result.data.length,
  );
}
test().catch(console.error);
