import DB from "../core/config/knex.js";

async function runIndexMigration() {
  try {
    console.log("Starting index audit & migration for trx_rekam_medis...");

    // 1. Cek & Tambah index pada kode_kunjungan
    const indexes = await DB.raw("SHOW INDEX FROM trx_rekam_medis");
    const existingIndexNames = indexes[0].map((i) => i.Key_name);
    const existingColumns = indexes[0].map((i) => i.Column_name);

    if (!existingColumns.includes("kode_kunjungan")) {
      await DB.raw("ALTER TABLE trx_rekam_medis ADD INDEX idx_kode_kunjungan (kode_kunjungan);");
      console.log("Migration SUCCESS: Added index idx_kode_kunjungan on trx_rekam_medis(kode_kunjungan).");
    } else {
      console.log("Migration SKIPPED: Index on kode_kunjungan already exists.");
    }

    // 2. Cek & Tambah index pada kode_antrian_layanan
    if (!existingColumns.includes("kode_antrian_layanan")) {
      await DB.raw("ALTER TABLE trx_rekam_medis ADD INDEX idx_rekammedis_antrian (kode_antrian_layanan);");
      console.log("Migration SUCCESS: Added index idx_rekammedis_antrian on trx_rekam_medis(kode_antrian_layanan).");
    } else {
      console.log("Migration SKIPPED: Index on kode_antrian_layanan already exists.");
    }

    // 3. Cek & Tambah index pada no_rm
    if (!existingColumns.includes("no_rm")) {
      await DB.raw("ALTER TABLE trx_rekam_medis ADD INDEX idx_rekammedis_norm (no_rm);");
      console.log("Migration SUCCESS: Added index idx_rekammedis_norm on trx_rekam_medis(no_rm).");
    } else {
      console.log("Migration SKIPPED: Index on no_rm already exists.");
    }

    console.log("All index audits completed successfully.");
  } catch (error) {
    console.error("Migration ERROR:", error);
  } finally {
    await DB.destroy();
  }
}

runIndexMigration();
