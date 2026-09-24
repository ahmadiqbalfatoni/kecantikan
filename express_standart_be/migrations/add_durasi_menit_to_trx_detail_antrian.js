import DB from "../core/config/knex.js";

async function up() {
  try {
    const hasCol = await DB.schema.hasColumn("trx_detail_antrian_layanan", "durasi_menit");
    if (!hasCol) {
      await DB.schema.table("trx_detail_antrian_layanan", (table) => {
        table.integer("durasi_menit").notNullable().defaultTo(30).after("harga");
      });
      console.log("Migration SUCCESS: Added durasi_menit to trx_detail_antrian_layanan.");
    } else {
      console.log("Migration SKIPPED: Column durasi_menit already exists.");
    }
  } catch (error) {
    console.error("Migration ERROR:", error);
  } finally {
    process.exit(0);
  }
}

up();
