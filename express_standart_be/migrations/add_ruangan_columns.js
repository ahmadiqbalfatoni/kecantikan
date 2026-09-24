import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    // 1. mst_layanan
    const hasLayananKodeRuangan = await DB.schema.hasColumn("mst_layanan", "kode_ruangan");
    if (!hasLayananKodeRuangan) {
      await DB.schema.table("mst_layanan", (table) => {
        table.string("kode_ruangan", 20).nullable().after("durasi_menit");
        table.string("nama_ruangan", 100).nullable().after("kode_ruangan");
      });
      console.log("Migration SUCCESS: Added kode_ruangan & nama_ruangan to mst_layanan.");
    } else {
      console.log("Migration SKIPPED: Columns already exist in mst_layanan.");
    }

    // 2. mst_paket_layanan
    const hasPaketKodeRuangan = await DB.schema.hasColumn("mst_paket_layanan", "kode_ruangan");
    if (!hasPaketKodeRuangan) {
      await DB.schema.table("mst_paket_layanan", (table) => {
        table.string("kode_ruangan", 20).nullable().after("masa_berlaku_hari");
        table.string("nama_ruangan", 100).nullable().after("kode_ruangan");
      });
      console.log("Migration SUCCESS: Added kode_ruangan & nama_ruangan to mst_paket_layanan.");
    } else {
      console.log("Migration SKIPPED: Columns already exist in mst_paket_layanan.");
    }

    // 3. trx_antrian_layanan
    const hasAntrianKodeRuangan = await DB.schema.hasColumn("trx_antrian_layanan", "kode_ruangan");
    if (!hasAntrianKodeRuangan) {
      await DB.schema.table("trx_antrian_layanan", (table) => {
        table.string("kode_ruangan", 20).nullable().after("nomor_antrian");
        table.string("nama_ruangan", 100).nullable().after("kode_ruangan");
      });
      console.log("Migration SUCCESS: Added kode_ruangan & nama_ruangan to trx_antrian_layanan.");
    } else {
      console.log("Migration SKIPPED: Columns already exist in trx_antrian_layanan.");
    }

    // Seed default sample ruangan for existing records if null
    await DB("mst_layanan")
      .whereNull("kode_ruangan")
      .update({ kode_ruangan: "R-01", nama_ruangan: "Ruang Treatment Wajah" });

    await DB("mst_paket_layanan")
      .whereNull("kode_ruangan")
      .update({ kode_ruangan: "R-02", nama_ruangan: "Ruang Laser & Rejuvenation" });

    console.log("Default room seeding completed.");

  } catch (error) {
    console.error("Migration ERROR:", error);
  } finally {
    await DB.destroy();
  }
}

runMigration();
