import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  const schemas = await client.query("SELECT schema_name FROM information_schema.schemata;")
  console.log("Schemas:", JSON.stringify(schemas.rows, null, 2))

  const tables = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%product%' OR table_name LIKE '%data%';")
  console.log("Tables:", JSON.stringify(tables.rows, null, 2))

  await client.end()
}

run()
