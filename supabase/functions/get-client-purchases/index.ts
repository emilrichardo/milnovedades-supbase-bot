import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuración obligatoria de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Manejo de la solicitud pre-flight (OPTIONS) por CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const cliente_id = url.searchParams.get("cliente_id");

    if (!cliente_id) {
      return new Response(
        JSON.stringify({ error: "El parámetro 'cliente_id' es obligatorio." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Inicializamos el cliente de Supabase
    // ADVERTENCIA DE SEGURIDAD:
    // Por defecto, inicializamos usando el token JWT provisto en el header Authorization
    // de la llamada para respetar el RLS (Row Level Security) del cliente logueado.
    // Si esta función se usará como admin sin logueo frontend, cámbialo a SUPABASE_SERVICE_ROLE_KEY
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization")!,
          },
        },
      },
    );

    // Buscamos los comprobantes asociados a este cliente en la BD
    // Incorporamos la relación con comprobantes_items para devolver el detalle de la compra
    console.log(
      `Buscando historial de compras para el cliente_id: ${cliente_id}`,
    );
    const { data: comprobantes, error } = await supabaseClient
      .from("comprobantes")
      .select(
        `
        id,
        numero,
        fecha,
        hora,
        estado,
        tipo,
        total,
        comprobantes_items (
          producto_codigo,
          cantidad,
          precio_unitario,
          total_linea
        )
      `,
      )
      .eq("cliente_id", cliente_id)
      .order("fecha", { ascending: false });

    if (error) throw error;

    console.log(
      `Se encontraron ${comprobantes?.length || 0} compras para el cliente_id: ${cliente_id}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        count: comprobantes?.length,
        data: comprobantes,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error(
      "Error procesando solicitud get-client-purchases:",
      error.message,
    );
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
