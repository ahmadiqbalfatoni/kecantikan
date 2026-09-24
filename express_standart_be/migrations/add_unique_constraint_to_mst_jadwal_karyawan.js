import DB from "../core/config/knex.js";

async function up() {
  try {
    // 1. Bersihkan duplikat sejati (jam_mulai, jam_selesai, hari, ruangan, no_sip sama persis dan PJ=0)
    const toDelete = ["JDW-002", "JDW-032", "JDW-005", "JDW-076"];
    const deletedCount = await DB("mst_jadwal_karyawan").whereIn("kode_jadwal", toDelete).del();
    console.log(`Cleaned ${deletedCount} duplicate rows from mst_jadwal_karyawan:`, toDelete);

    // 2. Cek apakah unique key sudah ada
    const indexCheck = await DB.raw(`
      SHOW INDEX FROM mst_jadwal_karyawan WHERE Key_name = 'uq_jadwal_ruangan_hari_karyawan_jam'
    `);
    const exists = indexCheck[0] && indexCheck[0].length > 0;

    if (!exists) {
      await DB.raw(`
        ALTER TABLE mst_jadwal_karyawan 
        ADD UNIQUE KEY uq_jadwal_ruangan_hari_karyawan_jam (kode_ruangan, hari, no_sip, jam_mulai, jam_selesai)
      `);
      console.log("Migration SUCCESS: Added UNIQUE KEY uq_jadwal_ruangan_hari_karyawan_jam to mst_jadwal_karyawan.");
    } else {
      console.log("Migration SKIPPED: UNIQUE KEY uq_jadwal_ruangan_hari_karyawan_jam already exists.");
    }
  } catch (error) {
    console.error("Migration ERROR in add_unique_constraint_to_mst_jadwal_karyawan:", error);
  }
}

up().then(() => process.exit(0));
