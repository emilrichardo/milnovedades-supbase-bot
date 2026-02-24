import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions para productos (lectura)
const toolsProductosLectura = [
  {
    type: "function",
    function: {
      name: "buscar_productos",
      description: "Busca productos en el inventario por código, nombre o categoría",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Texto a buscar en código, nombre o rubro del producto"
          },
          limite: {
            type: "number",
            description: "Cantidad máxima de resultados a devolver",
            default: 10
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "obtener_producto",
      description: "Obtiene información detallada de un producto específico por código",
      parameters: {
        type: "object",
        properties: {
          codigo: {
            type: "string",
            description: "Código del producto a buscar"
          }
        },
        required: ["codigo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listar_categorias",
      description: "Lista todas las categorías de productos disponibles",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// Funciones de consulta a la base de datos
async function buscar_productos(query: string, limite: number = 10, supabasePublic: any) {
  const { data, error } = await supabasePublic
    .from('products_data')
    .select('codigo_product, nombre, precio_minorista, precio_mayorista, precio_emprendedor, rubro, subrubro, stock_json, imagen, permalink')
    .or(`codigo_product.ilike.%${query}%,nombre.ilike.%${query}%,rubro.ilike.%${query}%`)
    .limit(limite);

  if (error) throw new Error(`Error buscando productos: ${error.message}`);
  return data || [];
}

async function obtener_producto(codigo: string, supabasePublic: any) {
  const { data, error } = await supabasePublic
    .from('products_data')
    .select('*')
    .eq('codigo_product', codigo)
    .maybeSingle();

  if (error) throw new Error(`Error obteniendo producto: ${error.message}`);
  return data;
}

async function listar_categorias(supabasePublic: any) {
  const { data, error } = await supabasePublic
    .from('categories')
    .select('nombre, slug')
    .order('nombre');

  if (error) throw new Error(`Error listando categorías: ${error.message}`);
  return data || [];
}

// Ejecutar tool según el nombre
async function ejecutarTool(toolName: string, args: any, supabasePublic: any) {
  switch (toolName) {
    case 'buscar_productos':
      return await buscar_productos(args.query, args.limite, supabasePublic);
    case 'obtener_producto':
      return await obtener_producto(args.codigo, supabasePublic);
    case 'listar_categorias':
      return await listar_categorias(supabasePublic);
    default:
      throw new Error(`Tool no reconocida: ${toolName}`);
  }
}

// Generar tools según permisos del agente
function generarTools(permisos: Record<string, string>) {
  const tools: any[] = [];

  // Productos - Lectura
  if (permisos.productos && (permisos.productos.includes('lectura') || permisos.productos === 'lectura_escritura')) {
    tools.push(...toolsProductosLectura);
  }

  // TODO: Agregar más tablas aquí (clientes, ventas, etc.)

  return tools;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, conversation_id, agente_id } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 0. Verify Bot API Key
    const authHeader = req.headers.get("Authorization");
    const CHAT_API_KEY = Deno.env.get("CHAT_API_KEY");

    if (CHAT_API_KEY && authHeader !== `Bearer ${CHAT_API_KEY}`) {
      console.warn("[Chat] Unauthorized access attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: 'payload' }
    });

    // 1. Get Agent Config (v2 - payload schema)
    console.log("[Chat] Fetching agent config from payload schema...");
    let agente;
    if (agente_id) {
      const { data, error } = await supabase.from('agentes').select('*').eq('id', agente_id).maybeSingle();
      if (error || !data) throw new Error(`Agent not found: ${error?.message || "No results"}`);
      agente = data;
    } else {
      // Find the main agent
      const { data, error } = await supabase.from('agentes').select('*').eq('is_main', true).maybeSingle();
      if (error || !data) {
        console.log("No main agent found, falling back to the first available agent");
        const { data: firstAgent, error: e2 } = await supabase.from('agentes').select('*').limit(1).maybeSingle();
        if (e2 || !firstAgent) throw new Error(`No agents available: ${e2?.message || "No results"}`);
        agente = firstAgent;
      } else {
        agente = data;
      }
    }

    if (!agente) {
      throw new Error("No agent configuration could be loaded");
    }

    console.log(`[Chat] Using agent: ${agente.nombre} (Model: ${agente.modelo})`);

    // 2. Get Agent Permissions
    console.log("[Chat] Fetching agent permissions...");
    const { data: accesosData, error: accesosError } = await supabase
      .from('agentes_accesos_tablas')
      .select('tabla, permiso')
      .eq('_parent_id', agente.id);

    if (accesosError) {
      console.warn("Error fetching permissions:", accesosError.message);
    }

    // Mapear permisos a estructura usable
    const permisos: Record<string, string> = {};
    accesosData?.forEach(acc => {
      permisos[acc.tabla] = acc.permiso;
    });

    console.log("[Chat] Agent permissions:", permisos);

    // Generar tools disponibles según permisos
    const availableTools = generarTools(permisos);
    console.log("[Chat] Available tools:", availableTools.map(t => t.function.name));

    // Crear cliente Supabase para schema public (consultas de datos)
    const supabasePublic = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: 'public' }
    });

    // 3. Prepare Messages
    const formattingInstruction = `
INSTRUCCIONES DE FORMATO:
- Cuando muestres productos, intenta siempre incluir su imagen y el enlace a la web.
- Los datos están en los campos 'imagen' y 'permalink' de cada producto.
- Formato para imagen: ![imagen]({url_imagen})
- Formato para enlace: [Ver en la web]({permalink})
- Si hay varios productos, preséntalos de forma organizada.
`.trim();

    const messages: Array<{role: string, content: string}> = [
      {
        role: 'system',
        content: `${agente.prompt_sistema || ''}\n\nPersonalidad: ${agente.personalidad || ''}\n\n${formattingInstruction}`.trim()
      }
    ];

    const currentConvId = conversation_id || crypto.randomUUID();

    // If a conversation_id is provided, we would fetch history here.
    // For now we just check if it's sent to log "new" or "existing".
    if (conversation_id) {
      console.log(`[Chat] Returning user with conversation_id: ${conversation_id}`);
      // Implementation ready to inject chat history here
    } else {
      console.log(`[Chat] New conversation started: ${currentConvId}`);
    }

    messages.push({ role: 'user', content: text });

    // 4. Call Model Provider with Tools Support
    const model = agente.modelo || 'gpt-4o-mini';
    const temperatura = typeof agente.temperatura === 'number' ? agente.temperatura : 0.7;
    let responseText = "";

    if (model.startsWith('gpt')) {
      // OpenAI with Tools Support
      const apiKey = agente.api_key || Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY config");

      // Loop para manejar tool calls
      let currentMessages = [...messages];
      let maxIterations = 5; // Prevenir loops infinitos
      let iteration = 0;

      while (iteration < maxIterations) {
        const requestBody: any = {
          model: model,
          messages: currentMessages,
          temperature: temperatura
        };

        // Agregar tools si están disponibles
        if (availableTools.length > 0) {
          requestBody.tools = availableTools;
          requestBody.tool_choice = "auto";
        }

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "OpenAI API Error");

        const choice = json.choices[0];
        const message = choice.message;

        // Si no hay tool calls, usar la respuesta directa
        if (!message.tool_calls || message.tool_calls.length === 0) {
          responseText = message.content;
          break;
        }

        // Agregar el mensaje del asistente con tool calls
        currentMessages.push(message);

        // Ejecutar cada tool call
        for (const toolCall of message.tool_calls) {
          try {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);

            console.log(`[Chat] Executing tool: ${toolName} with args:`, toolArgs);

            const toolResult = await ejecutarTool(toolName, toolArgs, supabasePublic);

            // Agregar resultado como mensaje de tool
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          } catch (error) {
            console.error(`[Chat] Error executing tool ${toolCall.function.name}:`, error);
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message })
            });
          }
        }

        iteration++;
      }

      if (iteration >= maxIterations) {
        throw new Error("Maximum tool execution iterations reached");
      }

    } else if (model.includes('claude')) {
      // Anthropic (sin tools por ahora)
      const apiKey = agente.api_key || Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY config");

      const claudeMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';

      // Agregar información sobre tools disponibles al system message si existen
      let enhancedSystemMessage = systemMessage;
      if (availableTools.length > 0) {
        const toolsInfo = availableTools.map(t =>
          `- ${t.function.name}: ${t.function.description}`
        ).join('\n');
        enhancedSystemMessage += `\n\nHerramientas disponibles:\n${toolsInfo}\n\nNOTA: Para usar estas herramientas, menciona que necesitas buscar información específica y yo te ayudaré.`;
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          system: enhancedSystemMessage,
          messages: claudeMessages,
          temperature: temperatura,
          max_tokens: 1024
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Anthropic API Error");
      responseText = json.content[0].text;

    } else if (model.includes('gemini')) {
      // Google Gemini (sin tools por ahora)
      const apiKey = agente.api_key || Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) throw new Error("Missing GEMINI_API_KEY config");

      const geminiModel = model === 'gemini-1.5-pro' ? 'gemini-1.5-pro' :
                        model === 'gemini-2.0-flash' ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
      const contents = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      let systemInstruction = messages.find(m => m.role === 'system')?.content;

      // Agregar información sobre tools disponibles al system instruction si existen
      if (availableTools.length > 0 && systemInstruction) {
        const toolsInfo = availableTools.map(t =>
          `- ${t.function.name}: ${t.function.description}`
        ).join('\n');
        systemInstruction += `\n\nHerramientas disponibles:\n${toolsInfo}\n\nNOTA: Para usar estas herramientas, menciona que necesitas buscar información específica y yo te ayudaré.`;
      }

      const body: any = {
        contents,
        generationConfig: { temperature: temperatura }
      };
      if (systemInstruction) {
        body.systemInstruction = {
          role: "system",
          parts: [{ text: systemInstruction }]
        };
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gemini API Error");
      responseText = json.candidates[0].content.parts[0].text;

    } else {
      throw new Error(`Model not supported: ${model}`);
    }

    // 4. Return Response
    return new Response(JSON.stringify({
      response: responseText,
      agente: agente.nombre,
      model: model,
      conversation_id: currentConvId,
      is_new_conversation: !conversation_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error internally:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
