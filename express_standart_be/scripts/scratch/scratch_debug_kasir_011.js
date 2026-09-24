import DB from "./core/config/knex.js";

async function debugKasir011() {
  try {
    const trxObj = await DB("trx_transaksi").where("kode_transaksi", "TRX-20260831-011").first();
    console.log("=== TRX-20260831-011 ===", trxObj);

    if (trxObj) {
      const details = await DB("trx_detail_transaksi").where("kode_transaksi", trxObj.kode_transaksi);
      console.log("=== TRX DETAILS ===", details);

      const antrianDetails = await DB("trx_detail_antrian_layanan").where("kode_kunjungan", trxObj.kode_kunjungan);
      console.log("=== ANTREAN DETAILS ===", antrianDetails);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

debugKasir011();
