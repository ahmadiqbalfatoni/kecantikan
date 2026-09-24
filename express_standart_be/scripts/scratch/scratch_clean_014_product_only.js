import DB from "./core/config/knex.js";

async function clean014() {
  try {
    const kodeTrx = "TRX-20260831-014";
    console.log(`Cleaning ${kodeTrx} to be product-only...`);

    // Delete service rows (kode_layanan not null)
    const deleted = await DB("trx_detail_transaksi")
      .where("kode_transaksi", kodeTrx)
      .whereNotNull("kode_layanan")
      .del();
    console.log(`Deleted ${deleted} layanan rows from ${kodeTrx}`);

    // Recalculate total for product items only
    const allDetails = await DB("trx_detail_transaksi")
      .where("kode_transaksi", kodeTrx)
      .sum("subtotal as total");
    const newTotal = parseFloat(allDetails[0]?.total || 0);

    await DB("trx_transaksi")
      .where("kode_transaksi", kodeTrx)
      .update({
        total_harga: newTotal,
        total_bayar: newTotal,
        is_product_only: 1,
      });

    console.log(`Updated ${kodeTrx}: is_product_only = 1, total = Rp ${newTotal}`);

    const final = await DB("trx_detail_transaksi").where("kode_transaksi", kodeTrx);
    console.log("Final details:", final.map(d => ({ kode: d.kode_produk || d.kode_layanan, subtotal: d.subtotal })));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

clean014();
