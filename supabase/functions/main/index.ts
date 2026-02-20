import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  // The edge runtime routes /functionName to the correct function
  // This main service acts as the dispatcher
  if (pathParts.length === 0) {
    return new Response(
      JSON.stringify({
        message: "Edge Functions service is running",
        functions: ["sync-aleph"],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response("Not Found", { status: 404 });
});
