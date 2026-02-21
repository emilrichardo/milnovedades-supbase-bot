const fetch = require('node-fetch'); // the environment already has node run, but maybe I use native fetch
async function test() {
  try {
    const res = await fetch("http://aleph.dyndns.info/integracion/api/Pedidos/GetComprobantes?fechadesde=01-11-2025&fechahasta=01-02-2026", {
      headers: {
        "Apikey": "ADCT-8100-0004", 
        "Clientid": "LASMILNOVEDADES"
      }
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.substring(0, 500) + (text.length > 500 ? "..." : ""));
  } catch(e) { console.error(e) }
}
test();
