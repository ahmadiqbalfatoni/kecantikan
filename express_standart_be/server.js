/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk menjalankan server Express.js
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */


import app from "./app.js";

const configuredPorts = [
  process.env.PORT,
  process.env.APP_PORT,
  3000,
  8000,
  8010
].map(p => Number(p)).filter(p => !isNaN(p) && p > 0);

const uniquePorts = [...new Set(configuredPorts)];

console.log(`[Server] Starting Express servers on ports:`, uniquePorts);

let dbInitTriggered = false;

for (const port of uniquePorts) {
  try {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${port} (0.0.0.0)`);
      if (!dbInitTriggered) {
        dbInitTriggered = true;
        import("./core/init_db.js")
          .then(({ checkAndInitDatabase }) => checkAndInitDatabase())
          .catch((err) => console.error("Auto DB Init Error:", err.message));
      }
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`⚠️ Port ${port} is already in use, skipping`);
      } else {
        console.error(`❌ Port ${port} error:`, err.message);
      }
    });
  } catch (err) {
    console.warn(`⚠️ Could not listen on port ${port}:`, err.message);
  }
}

