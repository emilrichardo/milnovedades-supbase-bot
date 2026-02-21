import { STATUS_CODE, STATUS_TEXT } from "https://deno.land/std/http/status.ts";
import * as posix from "https://deno.land/std/path/posix/mod.ts";

function getResponse(payload: any, status: number, customHeaders = {}) {
  const headers = { ...customHeaders };
  let body: string | null = null;
  if (payload) {
    if (typeof payload === "object") {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(payload);
    } else if (typeof payload === "string") {
      headers["Content-Type"] = "text/plain";
      body = payload;
    }
  }
  return new Response(body, { status, headers });
}

Deno.serve({
  handler: async (req: Request) => {
    const url = new URL(req.url);
    const { pathname } = url;

    // handle health checks
    if (pathname === "/_internal/health") {
      return getResponse({ message: "ok" }, STATUS_CODE.OK);
    }

    const pathParts = pathname.split("/").filter(Boolean);

    // Extrahimos functionName. Ejemplo: /functions/v1/sync-aleph -> sync-aleph
    // En auto-hosted, /functions/v1 es enviado por KONG.
    let functionName = "";
    if (pathParts[0] === "functions" && pathParts[1] === "v1") {
      functionName = pathParts[2];
    } else {
      functionName = pathParts[0];
    }

    if (!functionName) {
      return getResponse(
        "Function name is missing in URL",
        STATUS_CODE.NotFound,
      );
    }

    // Ruta donde se encuentran las funciones dentro del contendor (-v ./supabase/functions:/home/deno/functions)
    const servicePath = posix.join("/home/deno/functions", functionName);
    const absEntrypoint = posix.join(servicePath, "index.ts");
    const maybeEntrypoint = posix.toFileUrl(absEntrypoint).href;

    try {
      // Chequear si el archivo index.ts existe
      await Deno.lstat(absEntrypoint);
    } catch {
      return getResponse(
        `Function ${functionName} not found`,
        STATUS_CODE.NotFound,
      );
    }

    try {
      const worker = await EdgeRuntime.userWorkers.create({
        servicePath,
        memoryLimitMb: 256,
        workerTimeoutMs: 120000,
        noModuleCache: false,
        noNpm: false,
        envVars: Object.entries(Deno.env.toObject()),
        forceCreate: false,
        customModuleRoot: "",
        cpuTimeSoftLimitMs: 1000,
        cpuTimeHardLimitMs: 2000,
        decoratorType: "tc39",
        maybeEntrypoint,
        context: { useReadSyncFileAPI: true },
      });

      return await worker.fetch(req);
    } catch (e: any) {
      console.error(e);
      return getResponse(
        { message: "Worker creation or execution failed", error: e.toString() },
        STATUS_CODE.InternalServerError,
      );
    }
  },
  onListen: () => {
    console.log(`Supabase Self-Hosted Edge Runtime Router listening.`);
  },
});
