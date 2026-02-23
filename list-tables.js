import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'payload';")
  console.log(JSON.stringify(res.rows, null, 2))
  await client.end()
}

run()
