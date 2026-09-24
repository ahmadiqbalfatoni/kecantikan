import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    const hasNoRm = await DB.schema.hasColumn("trx_antrian_awal", "no_rm");
    if (!hasNoRm) {
      await DB.schema.table("trx_antrian_awal", (table) => {
        table.string("no_rm", 20).nullable().after("status");
        table.string("kode_kunjungan", 20).nullable().after("no_rm");
      });
      console.log("Migration SUCCESS: Added no_rm and kode_kunjungan columns to trx_antrian_awal.");
    } else {
      console.log("Migration SKIPPED: Columns already exist in trx_antrian_awal.");
    }
  } catch (error) {
    console.error("Migration ERROR:", error);
  } finally {
    await DB.destroy();
  }
}

runMigration();
