import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  try {
    await client.query('ALTER TABLE "payload"."agentes" ADD COLUMN IF NOT EXISTS "is_main" BOOLEAN DEFAULT false;')
    console.log("Column is_main added to agentes")
  } catch (e) {
    console.error("Error adding column:", e)
  }
  await client.end()
}

run()
