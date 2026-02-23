import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  await client.query("GRANT ALL ON SCHEMA payload TO supabase_admin;")
  await client.query("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA payload TO supabase_admin;")
  await client.query("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA payload TO supabase_admin;")
  console.log("Permissions granted to supabase_admin")
  await client.end()
}

run()
