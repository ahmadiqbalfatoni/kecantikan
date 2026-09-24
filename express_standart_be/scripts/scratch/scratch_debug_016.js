import DB from "./core/config/knex.js";

async function debug016() {
  try {
    const trxObj = await DB("trx_transaksi").where("kode_transaksi", "TRX-20260831-016").first();
    console.log("=== TRX-20260831-016 ===", JSON.stringify(trxObj, null, 2));

    if (trxObj) {
      const details = await DB("trx_detail_transaksi").where("kode_transaksi", trxObj.kode_transaksi);
      console.log("=== TRX DETAILS ===");
      details.forEach(d => {
        console.log(`  [${d.is_from_pendaftaran ? 'PENDAFTARAN' : 'TAMBAHAN'}] ${d.kode_layanan || d.kode_produk} - subtotal: ${d.subtotal} - created_at: ${d.created_at}`);
      });

      const antrianDetails = await DB("trx_detail_antrian_layanan").where("kode_kunjungan", trxObj.kode_kunjungan);
      console.log("\n=== ANTREAN DETAILS ===");
      antrianDetails.forEach(d => {
        console.log(`  [${d.kode_antrian_layanan}] ${d.kode_layanan} - ${d.nama_layanan} - ruangan: ${d.kode_ruangan}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

debug016();
