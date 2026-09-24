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

const port = process.env.PORT || process.env.APP_PORT || 8010;

app
  .listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port} (0.0.0.0)`);
    import("./core/init_db.js")
      .then(({ checkAndInitDatabase }) => checkAndInitDatabase())
      .catch((err) => console.error("Auto DB Init Error:", err.message));
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${port} is already in use`);
      process.exit(1);
    } else {
      throw err;
    }
  });
