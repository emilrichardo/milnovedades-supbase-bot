import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  const res = await client.query(`
    SELECT pid, query, state, wait_event_type, wait_event
    FROM pg_stat_activity
    WHERE datname = 'postgres' AND state != 'idle';
  `)
  console.log(JSON.stringify(res.rows, null, 2))
  await client.end()
}

run()
