import DB from "./core/config/knex.js";

async function debugRekomendasi() {
  try {
    const rms = await DB("trx_rekam_medis").orderBy("id", "desc").limit(5);
    console.log("=== REKAM MEDIS LAST 5 ===");
    rms.forEach((r) => {
      console.log(`ID: ${r.id}, Kode Kunjungan: ${r.kode_kunjungan}, Detail: ${r.detail_layanan_ruangan}`);
    });

    const antrians = await DB("trx_antrian_layanan").orderBy("id", "desc").limit(5);
    console.log("=== ANTREAN LAYANAN LAST 5 ===");
    antrians.forEach((a) => {
      console.log(`Kode Antrian: ${a.kode_antrian_layanan}, Kode Kunjungan: ${a.kode_kunjungan}, Status: ${a.status}`);
    });

    const trxs = await DB("trx_transaksi").orderBy("id", "desc").limit(5);
    console.log("=== TRANSAKSI LAST 5 ===");
    trxs.forEach((t) => {
      console.log(`Kode Trx: ${t.kode_transaksi}, Kode Kunjungan: ${t.kode_kunjungan}, Status: ${t.status}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

debugRekomendasi();
