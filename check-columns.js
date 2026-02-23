import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'payload' AND table_name = 'agentes';")
  console.log(JSON.stringify(res.rows, null, 2))
  await client.end()
}

run()
