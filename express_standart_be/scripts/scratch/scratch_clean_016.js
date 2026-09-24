import DB from "./core/config/knex.js";

async function clean016() {
  try {
    const kodeTrx = "TRX-20260831-016";
    console.log(`Cleaning duplicate rows from ${kodeTrx}...`);

    const details = await DB("trx_detail_transaksi").where("kode_transaksi", kodeTrx);
    const seen = new Set();
    const idsToDelete = [];

    for (const d of details) {
      const key = d.kode_layanan ? `layanan:${d.kode_layanan}` : `produk:${d.kode_produk}`;
      if (seen.has(key)) {
        idsToDelete.push(d.id);
      } else {
        seen.add(key);
      }
    }

    if (idsToDelete.length > 0) {
      console.log("Deleting duplicate detail IDs:", idsToDelete);
      await DB("trx_detail_transaksi").whereIn("id", idsToDelete).del();
    } else {
      console.log("No duplicate detail rows in database for 016.");
    }

    // Recalculate totals
    const allDetails = await DB("trx_detail_transaksi").where("kode_transaksi", kodeTrx).sum("subtotal as total");
    const newTotal = parseFloat(allDetails[0]?.total || 0);

    await DB("trx_transaksi")
      .where("kode_transaksi", kodeTrx)
      .update({
        total_harga: newTotal,
        total_bayar: newTotal,
      });

    console.log(`Updated ${kodeTrx} total to: Rp ${newTotal}`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

clean016();
