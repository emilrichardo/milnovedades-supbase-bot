---
name: supabase-edge-functions-workflow
description: Flujo de trabajo y mejores prácticas para el desarrollo de Supabase Edge Functions con Deno, incluyendo integraciones con IA. SIEMPRE responder en español.
---

# Flujo de Trabajo para Supabase Edge Functions

Esta skill define el estándar para crear, modificar y gestionar Edge Functions en Supabase usando Deno, con un enfoque particular en integraciones de backend e IA.

## REGLA DE IDIOMA CRÍTICA Y OBLIGATORIA

**SIEMPRE DEBES RESPONDER Y COMUNICARTE CON EL USUARIO EN ESPAÑOL.** Sin excepciones.

## Protocolo de Gestión de Edge Functions

Al recibir una orden para trabajar con Edge Functions, sigue este procedimiento:

### 1. Estructura y Creación

1. Todas las funciones deben residir en la carpeta `supabase/functions/<nombre-funcion>`.
2. El archivo principal debe ser `index.ts`.
3. Al crear una nueva función, utiliza el CLI si es posible (`run_command`: `supabase functions new <nombre-funcion>`), o crea la estructura de directorios y el archivo `index.ts` directamente.

### 2. Desarrollo con Deno y Mejores Prácticas

1. **Deno:** Recuerda que las Edge Functions usan Deno, no Node.js.
   - No uses paquetes de `npm:` a menos que sea a través de un CDN como esm.sh: `import { ... } from "https://esm.sh/<paquete>@<version>"`.
   - Alternativamente, puedes usar `npm:<paquete>` que está soportado en las versiones recientes de Deno Deploy que utiliza Supabase, pero prefiere el estándar de dependencias centralizadas.
   - Crea un archivo `import_map.json` en la raíz de `supabase/functions/` o a nivel global si necesitas resolver versiones centralizadas.
2. **CORS:** SIEMPRE implementa manejo de CORS, especialmente para solicitudes de `OPTIONS`. Crea un archivo `shared/cors.ts` o declara los headers en cada función.
   ```typescript
   export const corsHeaders = {
     "Access-Control-Allow-Origin": "*",
     "Access-Control-Allow-Headers":
       "authorization, x-client-info, apikey, content-type",
   };
   ```
3. **Manejo de Respuestas:** Retorna `Response` nativas del estándar Fetch API. En caso de error, siempre retorna un JSON con un código de estado apropiado (400, 500) y detalles del error.
4. **Cliente de Supabase:** Para acceder a la base de datos desde la función, instancia SIEMPRE el cliente de Supabase con los headers provistos en la solicitud para respetar el RLS (Row Level Security):

   ```typescript
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

   // Dentro de serve
   const supabaseClient = createClient(
     Deno.env.get("SUPABASE_URL") ?? "",
     Deno.env.get("SUPABASE_ANON_KEY") ?? "",
     {
       global: {
         headers: { Authorization: req.headers.get("Authorization")! },
       },
     },
   );
   ```

   Si necesitas hacer bypass del RLS para tareas de administración asíncronas, usa `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Integración con Inteligencia Artificial (IA)

1. Edge Functions es ideal para servir como proxy de APIs de IA (OpenAI, Anthropic, Gemini) ocultando las claves de API del cliente.
2. Al integrar endpoints de IA:
   - Configura un timeout razonable si la tarea de IA es larga.
   - Si la respuesta es lenta y el cliente lo soporta, considera usar Server-Sent Events (SSE) para stream: `return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }})`.
3. Utiliza la variable de entorno `OPENAI_API_KEY` (o la respectiva) que debe ser configurada a través de `supabase secrets set`.

### 4. Testing y Envío a Producción

- Instruye siempre al usuario cómo probar localmente la función: `supabase functions serve <nombre-funcion>`.
- Explícale cómo desplegarla: `supabase functions deploy <nombre-funcion>` y recuérdale subir los secretos si son nuevos: `supabase secrets set --env-file ./supabase/.env.local`.
