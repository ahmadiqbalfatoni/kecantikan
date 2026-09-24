import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    const hasMetode = await DB.schema.hasColumn("trx_booking", "metode_pembayaran_dp");
    if (!hasMetode) {
      await DB.schema.table("trx_booking", (table) => {
        table.string("metode_pembayaran_dp", 20).nullable().after("dp_dibayar_at");
      });
      console.log("Migration SUCCESS: Added metode_pembayaran_dp column to trx_booking.");
    } else {
      console.log("Migration SKIPPED: Column metode_pembayaran_dp already exists in trx_booking.");
    }

    const hasAlasan = await DB.schema.hasColumn("trx_booking", "alasan_bebas_dp");
    if (!hasAlasan) {
      await DB.schema.table("trx_booking", (table) => {
        table.string("alasan_bebas_dp", 100).nullable().after("metode_pembayaran_dp");
      });
      console.log("Migration SUCCESS: Added alasan_bebas_dp column to trx_booking.");
    } else {
      console.log("Migration SKIPPED: Column alasan_bebas_dp already exists in trx_booking.");
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration ERROR:", error);
    process.exit(1);
  } finally {
    await DB.destroy();
  }
}

runMigration();
