import DB from "./core/config/knex.js";

async function clean013() {
  try {
    const kodeTrx = "TRX-20260831-013";
    console.log("Cleaning TRX-20260831-013 to be product-only...");

    // Delete service detail rows for TRX-20260831-013
    await DB("trx_detail_transaksi")
      .where("kode_transaksi", kodeTrx)
      .whereNotNull("kode_layanan")
      .del();

    // Recalculate total for product items only
    const allDetails = await DB("trx_detail_transaksi").where("kode_transaksi", kodeTrx).sum("subtotal as total");
    const newTotal = parseFloat(allDetails[0]?.total || 0);

    await DB("trx_transaksi")
      .where("kode_transaksi", kodeTrx)
      .update({
        total_harga: newTotal,
        total_bayar: newTotal,
        is_product_only: 1,
      });

    console.log(`Updated TRX-20260831-013: is_product_only = 1, total = Rp ${newTotal}`);
    process.exit(0);
  } catch (err) {
    console.error("Clean error:", err);
    process.exit(1);
  }
}

clean013();
