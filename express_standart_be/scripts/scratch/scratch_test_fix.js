import DB from "./core/config/knex.js";

async function testFix() {
  try {
    const hasCol = await DB.schema.hasColumn("trx_rekam_medis", "detail_layanan_ruangan");
    console.log("Column detail_layanan_ruangan exists:", hasCol);

    if (!hasCol) {
      console.log("Adding column detail_layanan_ruangan to trx_rekam_medis...");
      await DB.schema.table("trx_rekam_medis", (table) => {
        table.text("detail_layanan_ruangan").nullable();
      });
      console.log("Column added successfully!");
    }

    process.exit(0);
  } catch (err) {
    console.error("Test fix error:", err);
    process.exit(1);
  }
}

testFix();
