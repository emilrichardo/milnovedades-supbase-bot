import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts";

async function generate() {
  // 1. Generate a strong JWT Secret
  const jwtSecret =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "");

  // 2. Generate Postgres Password
  const pgPassword = crypto.randomUUID().replace(/-/g, "") + "!!";

  // 3. Generate Realtime Enc Key
  const realtimeKey = crypto.randomUUID();

  // 4. Crypto Key for signing
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );

  // 5. Generate Anon Key
  const anonPayload = {
    role: "anon",
    iss: "supabase",
    iat: getNumericDate(0),
    exp: getNumericDate(60 * 60 * 24 * 365 * 10), // 10 years
  };
  const anonKey = await create({ alg: "HS256", typ: "JWT" }, anonPayload, key);

  // 6. Generate Service Role Key
  const servicePayload = {
    role: "service_role",
    iss: "supabase",
    iat: getNumericDate(0),
    exp: getNumericDate(60 * 60 * 24 * 365 * 10), // 10 years
  };
  const serviceKey = await create(
    { alg: "HS256", typ: "JWT" },
    servicePayload,
    key,
  );

  console.log(
    "----------------------------------------------------------------",
  );
  console.log(
    "COPY AND PASTE THESE IDENTICAL VALUES INTO COOLIFY ENV VARIABLES",
  );
  console.log(
    "----------------------------------------------------------------",
  );
  console.log(`POSTGRES_PASSWORD=${pgPassword}`);
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`ANON_KEY=${anonKey}`);
  console.log(`SERVICE_ROLE_KEY=${serviceKey}`);
  console.log(`SUPABASE_ANON_KEY=${anonKey}`);
  console.log(`SUPABASE_SERVICE_KEY=${serviceKey}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
  console.log(`REALTIME_ENC_KEY=${realtimeKey}`);
  console.log(
    "----------------------------------------------------------------",
  );
}

generate();
