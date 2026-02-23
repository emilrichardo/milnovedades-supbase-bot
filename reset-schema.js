import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  try {
    await client.query('DROP SCHEMA IF EXISTS payload CASCADE;')
    await client.query('CREATE SCHEMA payload;')
    console.log("Schema payload dropped and recreated.")
  } catch (e) {
    console.error("Error resetting schema:", e)
  }
  await client.end()
}

run()
