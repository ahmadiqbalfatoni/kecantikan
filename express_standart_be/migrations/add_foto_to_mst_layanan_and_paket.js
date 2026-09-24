import DB, { defaultDb } from "../core/config/knex.js";

async function up() {
  try {
    console.log("Starting migration: add foto to mst_layanan & mst_paket_layanan...");

    // 1. Check & Add column foto to mst_layanan
    const hasLayananFoto = await DB.schema.hasColumn("mst_layanan", "foto");
    if (!hasLayananFoto) {
      await DB.raw("ALTER TABLE mst_layanan ADD COLUMN foto VARCHAR(255) NULL AFTER status;");
      console.log("✅ Migration SUCCESS: Added column 'foto' to mst_layanan.");
    } else {
      console.log("ℹ️ Migration SKIPPED: Column 'foto' already exists in mst_layanan.");
    }

    // 2. Check & Add column foto to mst_paket_layanan
    const hasPaketFoto = await DB.schema.hasColumn("mst_paket_layanan", "foto");
    if (!hasPaketFoto) {
      await DB.raw("ALTER TABLE mst_paket_layanan ADD COLUMN foto VARCHAR(255) NULL AFTER status;");
      console.log("✅ Migration SUCCESS: Added column 'foto' to mst_paket_layanan.");
    } else {
      console.log("ℹ️ Migration SKIPPED: Column 'foto' already exists in mst_paket_layanan.");
    }

    console.log("All migrations executed successfully.");
  } catch (error) {
    console.error("❌ Migration ERROR in add_foto_to_mst_layanan_and_paket:", error);
  } finally {
    try {
      await defaultDb.destroy();
    } catch (_) {}
    process.exit(0);
  }
}

up();
