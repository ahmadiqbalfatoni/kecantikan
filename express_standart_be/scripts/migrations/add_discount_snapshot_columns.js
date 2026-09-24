import dotenv from "dotenv";
dotenv.config();
import DB from "../../core/config/knex.js";

async function run() {
  console.log("Checking trx_transaksi for nama_promo...");
  const hasNamaPromoTrx = await DB.schema.hasColumn("trx_transaksi", "nama_promo");
  if (!hasNamaPromoTrx) {
    await DB.schema.alterTable("trx_transaksi", (table) => {
      table.string("nama_promo", 255).nullable().after("kode_promo");
    });
    console.log("Added nama_promo to trx_transaksi");
  } else {
    console.log("trx_transaksi already has nama_promo");
  }

  console.log("Checking trx_detail_transaksi discount snapshot columns...");
  const detailCols = [
    { name: "kode_promo", type: (t) => t.string("kode_promo", 50).nullable() },
    { name: "nama_promo", type: (t) => t.string("nama_promo", 150).nullable() },
    { name: "jenis_diskon", type: (t) => t.string("jenis_diskon", 20).nullable() },
    { name: "nilai_diskon", type: (t) => t.decimal("nilai_diskon", 12, 2).nullable() },
    { name: "diskon", type: (t) => t.decimal("diskon", 12, 2).defaultTo(0) },
    { name: "subtotal_setelah_diskon", type: (t) => t.decimal("subtotal_setelah_diskon", 12, 2).defaultTo(0) },
  ];

  for (const col of detailCols) {
    const hasCol = await DB.schema.hasColumn("trx_detail_transaksi", col.name);
    if (!hasCol) {
      await DB.schema.alterTable("trx_detail_transaksi", (table) => {
        col.type(table);
      });
      console.log(`Added ${col.name} to trx_detail_transaksi`);
    } else {
      console.log(`trx_detail_transaksi already has ${col.name}`);
    }
  }

  console.log("Migration completed successfully.");
  await DB.destroy();
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
