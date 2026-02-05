const cron = require("node-cron");
const { exec } = require("child_process");

console.log("Initializing Cron Job for Product Sync...");
console.log("Schedule: Every hour (0 * * * *)");

// Schedule task to run every hour at minute 0
cron.schedule("0 * * * *", () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting scheduled sync...`);

  exec("npm run sync", (error, stdout, stderr) => {
    if (error) {
      console.error(`[${timestamp}] Error executing sync: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`[${timestamp}] Sync Stderr: ${stderr}`);
    }
    console.log(`[${timestamp}] Sync Output:\n${stdout}`);
    console.log(`[${timestamp}] Sync finished.`);
  });
});

console.log("Cron job started. Press Ctrl+C to exit.");
