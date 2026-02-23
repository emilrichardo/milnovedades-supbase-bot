import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  try {
    const res = await client.query("SELECT * FROM products_data LIMIT 1;")
    console.log("Success:", JSON.stringify(res.rows, null, 2))
  } catch (e) {
    console.error("Error:", e.message)
  }
  await client.end()
}

run()
