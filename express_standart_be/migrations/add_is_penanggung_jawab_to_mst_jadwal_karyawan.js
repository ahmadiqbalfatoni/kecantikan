import DB from "../core/config/knex.js";

async function up() {
  try {
    const hasCol = await DB.schema.hasColumn("mst_jadwal_karyawan", "is_penanggung_jawab");
    if (!hasCol) {
      await DB.raw(
        "ALTER TABLE `mst_jadwal_karyawan` ADD COLUMN `is_penanggung_jawab` TINYINT(1) NOT NULL DEFAULT 0 AFTER `kode_ruangan`;"
      );
      console.log("Migration SUCCESS: Added is_penanggung_jawab to mst_jadwal_karyawan.");
    } else {
      console.log("Migration SKIPPED: Column is_penanggung_jawab already exists in mst_jadwal_karyawan.");
    }
  } catch (error) {
    console.error("Migration ERROR in add_is_penanggung_jawab_to_mst_jadwal_karyawan:", error);
  }
}

up().then(() => process.exit(0));
