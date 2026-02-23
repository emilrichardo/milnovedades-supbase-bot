import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // 2. Prepare Messages
    const messages: Array<{role: string, content: string}> = [
      {
        role: 'system',
        content: `${agente.prompt_sistema || ''}\n\nPersonalidad: ${agente.personalidad || ''}`.trim()
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

    // 3. Call Model Provider
    const model = agente.modelo || 'gpt-4o-mini';
    const temperatura = typeof agente.temperatura === 'number' ? agente.temperatura : 0.7;
    let responseText = "";

    if (model.startsWith('gpt')) {
      // OpenAI
      const apiKey = agente.api_key || Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY config");

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: temperatura
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "OpenAI API Error");
      responseText = json.choices[0].message.content;

    } else if (model.includes('claude')) {
      // Anthropic
      const apiKey = agente.api_key || Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY config");

      const claudeMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          system: systemMessage,
          messages: claudeMessages,
          temperature: temperatura,
          max_tokens: 1024
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Anthropic API Error");
      responseText = json.content[0].text;

    } else if (model.includes('gemini')) {
      // Google Gemini
      const apiKey = agente.api_key || Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) throw new Error("Missing GEMINI_API_KEY config");

      const geminiModel = model === 'gemini-1.5-pro' ? 'gemini-1.5-pro' : 
                        model === 'gemini-2.0-flash' ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
      const contents = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      const systemInstruction = messages.find(m => m.role === 'system')?.content;

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
