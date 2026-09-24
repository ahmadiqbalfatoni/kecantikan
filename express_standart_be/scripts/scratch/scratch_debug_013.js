import DB from "./core/config/knex.js";

async function debug013() {
  try {
    const trxObj = await DB("trx_transaksi").where("kode_transaksi", "TRX-20260831-013").first();
    console.log("=== TRX-20260831-013 ===", trxObj);

    if (trxObj) {
      const details = await DB("trx_detail_transaksi").where("kode_transaksi", trxObj.kode_transaksi);
      console.log("=== TRX DETAILS FOR 013 ===", details);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

debug013();
