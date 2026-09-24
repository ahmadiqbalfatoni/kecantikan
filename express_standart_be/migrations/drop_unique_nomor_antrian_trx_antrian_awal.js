import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    const [indexes] = await DB.raw("SHOW INDEX FROM trx_antrian_awal WHERE Key_name = 'uq_nomor_antrian'");
    if (indexes && indexes.length > 0) {
      console.log("Dropping UNIQUE constraint 'uq_nomor_antrian' from trx_antrian_awal...");
      await DB.raw("ALTER TABLE trx_antrian_awal DROP INDEX uq_nomor_antrian");
      console.log("SUCCESS: Dropped uq_nomor_antrian.");

      // Tambahkan index non-unique agar query filter nomor_antrian tetap cepat
      await DB.raw("ALTER TABLE trx_antrian_awal ADD INDEX idx_nomor_antrian (nomor_antrian)");
      console.log("SUCCESS: Added non-unique index 'idx_nomor_antrian'.");
    } else {
      console.log("SKIPPED: uq_nomor_antrian not found or already dropped.");
    }
  } catch (error) {
    console.error("Migration ERROR:", error);
  } finally {
    await DB.destroy();
  }
}

runMigration();
