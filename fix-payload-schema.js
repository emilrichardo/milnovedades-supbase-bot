import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres'
})

async function run() {
  await client.connect()
  try {
    console.log("Fixing agentes_accesos_tablas...")
    await client.query(`
      ALTER TABLE payload.agentes_accesos_tablas RENAME COLUMN parent_id TO _parent_id;
      ALTER TABLE payload.agentes_accesos_tablas RENAME COLUMN "order" TO _order;
    `)
    console.log("Successfully renamed columns in agentes_accesos_tablas.")
  } catch (e) {
    if (e.message.includes("already exists") || e.message.includes("does not exist")) {
        console.log("Columns might already be correct or partially fixed. Detail:", e.message)
    } else {
        console.error("Error fixing agentes_accesos_tablas:", e)
    }
  }

  try {
    console.log("Fixing agentes...")
    await client.query(`
      ALTER TABLE payload.agentes RENAME COLUMN agente_padre_id TO _agente_padre_id;
    `)
    console.log("Successfully renamed column in agentes.")
  } catch (e) {
    console.log("Agentes fix detail:", e.message)
  }

  try {
    console.log("Fixing informacion_general_sucursales...")
    await client.query(`
      ALTER TABLE payload.informacion_general_sucursales RENAME COLUMN parent_id TO _parent_id;
      ALTER TABLE payload.informacion_general_sucursales RENAME COLUMN "order" TO _order;
    `)
  } catch (e) {
    console.log("InformacionGlobal fix detail:", e.message)
  }

  await client.end()
}

run()
