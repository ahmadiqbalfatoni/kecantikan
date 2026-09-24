import DB from "./core/config/knex.js";

async function debug014() {
  try {
    const trxObj = await DB("trx_transaksi").where("kode_transaksi", "TRX-20260831-014").first();
    console.log("=== TRX-20260831-014 ===", JSON.stringify(trxObj, null, 2));

    if (trxObj) {
      const details = await DB("trx_detail_transaksi").where("kode_transaksi", trxObj.kode_transaksi);
      console.log("=== TRX DETAILS ===", JSON.stringify(details, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

debug014();
