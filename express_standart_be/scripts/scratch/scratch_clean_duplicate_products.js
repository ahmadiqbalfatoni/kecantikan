import DB from "./core/config/knex.js";

async function cleanDuplicates() {
  try {
    const draftTrx = await DB("trx_transaksi").where("status", "draft");
    console.log(`Found ${draftTrx.length} draft transactions`);

    for (const trx of draftTrx) {
      const details = await DB("trx_detail_transaksi")
        .where("kode_transaksi", trx.kode_transaksi)
        .whereNotNull("kode_produk");

      if (details.length === 0) continue;

      const productMap = {};
      const idsToDelete = [];

      for (const d of details) {
        if (!productMap[d.kode_produk]) {
          productMap[d.kode_produk] = d;
        } else {
          // Add qty to the first entry and mark this duplicate id for deletion
          productMap[d.kode_produk].qty = (parseInt(productMap[d.kode_produk].qty) || 1) + (parseInt(d.qty) || 1);
          idsToDelete.push(d.id);
        }
      }

      if (idsToDelete.length > 0) {
        console.log(`Deleting ${idsToDelete.length} duplicate detail rows for transaction ${trx.kode_transaksi}`);
        await DB("trx_detail_transaksi").whereIn("id", idsToDelete).del();

        for (const kp of Object.keys(productMap)) {
          const pObj = productMap[kp];
          const subtotal = pObj.qty * parseFloat(pObj.harga_satuan || 0);
          await DB("trx_detail_transaksi")
            .where("id", pObj.id)
            .update({ qty: pObj.qty, subtotal });
        }
      }
    }

    console.log("Cleanup completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

cleanDuplicates();
