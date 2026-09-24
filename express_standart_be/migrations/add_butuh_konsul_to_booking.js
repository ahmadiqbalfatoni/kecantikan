import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    console.log("Starting migration: add_butuh_konsul_to_booking...");

    // 1. Tambah butuh_konsul ke trx_booking jika belum ada
    const hasTrxBookingCol = await DB.schema.hasColumn("trx_booking", "butuh_konsul");
    if (!hasTrxBookingCol) {
      await DB.schema.table("trx_booking", (table) => {
        table.boolean("butuh_konsul").notNullable().defaultTo(false).after("total_biaya");
      });
      console.log("Migration SUCCESS: Added butuh_konsul to trx_booking.");
    } else {
      console.log("Migration SKIPPED: Column butuh_konsul already exists in trx_booking.");
    }

    // 2. Tambah butuh_konsul ke trx_detail_booking jika belum ada
    const hasTrxDetailCol = await DB.schema.hasColumn("trx_detail_booking", "butuh_konsul");
    if (!hasTrxDetailCol) {
      await DB.schema.table("trx_detail_booking", (table) => {
        table.boolean("butuh_konsul").notNullable().defaultTo(false).after("durasi_menit");
      });
      console.log("Migration SUCCESS: Added butuh_konsul to trx_detail_booking.");
    } else {
      console.log("Migration SKIPPED: Column butuh_konsul already exists in trx_detail_booking.");
    }

    console.log("Migration finished successfully!");
  } catch (error) {
    console.error("Migration ERROR:", error);
    process.exit(1);
  } finally {
    await DB.destroy();
  }
}

runMigration();
