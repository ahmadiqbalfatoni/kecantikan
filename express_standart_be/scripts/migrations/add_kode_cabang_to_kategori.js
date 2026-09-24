import dotenv from "dotenv";
dotenv.config();
import DB from "../../core/config/knex.js";

async function run() {
  console.log("Checking mst_kategori_layanan...");
  const hasColLayanan = await DB.schema.hasColumn("mst_kategori_layanan", "kode_cabang");
  if (!hasColLayanan) {
    await DB.schema.alterTable("mst_kategori_layanan", (table) => {
      table.string("kode_cabang", 20).nullable().after("id");
    });
    console.log("Added kode_cabang to mst_kategori_layanan");
  } else {
    console.log("mst_kategori_layanan already has kode_cabang");
  }

  console.log("Checking mst_kategori_produk...");
  const hasColProduk = await DB.schema.hasColumn("mst_kategori_produk", "kode_cabang");
  if (!hasColProduk) {
    await DB.schema.alterTable("mst_kategori_produk", (table) => {
      table.string("kode_cabang", 20).nullable().after("id");
    });
    console.log("Added kode_cabang to mst_kategori_produk");
  } else {
    console.log("mst_kategori_produk already has kode_cabang");
  }

  await DB.destroy();
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
