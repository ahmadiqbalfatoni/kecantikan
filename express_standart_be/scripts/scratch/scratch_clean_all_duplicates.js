import DB from "./core/config/knex.js";

async function cleanAllDuplicates() {
  try {
    console.log("=== STARTING COMPREHENSIVE CLEANUP OF ALL DRAFT TRANSACTIONS & ANTREAN DETAILS ===");

    // 1. Clean trx_detail_antrian_layanan
    const allAntrianDetails = await DB("trx_detail_antrian_layanan");
    const antrianSeen = new Set();
    const antrianToDelete = [];

    for (const d of allAntrianDetails) {
      const key = `${d.kode_kunjungan}:${d.kode_layanan}`;
      if (antrianSeen.has(key)) {
        antrianToDelete.push(d.id);
      } else {
        antrianSeen.add(key);
      }
    }

    if (antrianToDelete.length > 0) {
      console.log(`Deleting ${antrianToDelete.length} duplicate antrean detail rows:`, antrianToDelete);
      await DB("trx_detail_antrian_layanan").whereIn("id", antrianToDelete).del();
    } else {
      console.log("No duplicate antrean details found.");
    }

    // 2. Clean trx_detail_transaksi for all draft transactions
    const draftTrxs = await DB("trx_transaksi").where("status", "draft");

    for (const trxObj of draftTrxs) {
      const details = await DB("trx_detail_transaksi").where("kode_transaksi", trxObj.kode_transaksi);
      const detailSeen = new Set();
      const detailToDelete = [];

      for (const d of details) {
        const key = d.kode_layanan ? `layanan:${d.kode_layanan}` : `produk:${d.kode_produk}`;
        if (detailSeen.has(key)) {
          detailToDelete.push(d.id);
        } else {
          detailSeen.add(key);
        }
      }

      if (detailToDelete.length > 0) {
        console.log(`Deleting ${detailToDelete.length} duplicate transaction detail rows for ${trxObj.kode_transaksi}`);
        await DB("trx_detail_transaksi").whereIn("id", detailToDelete).del();
      }

      // Recalculate transaction total
      const allDetails = await DB("trx_detail_transaksi").where("kode_transaksi", trxObj.kode_transaksi).sum("subtotal as total");
      const newTotal = parseFloat(allDetails[0]?.total || 0);

      await DB("trx_transaksi")
        .where("kode_transaksi", trxObj.kode_transaksi)
        .update({
          total_harga: newTotal,
          total_bayar: newTotal,
        });

      console.log(`Updated ${trxObj.kode_transaksi} total to: Rp ${newTotal}`);
    }

    console.log("=== COMPREHENSIVE CLEANUP COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

cleanAllDuplicates();
