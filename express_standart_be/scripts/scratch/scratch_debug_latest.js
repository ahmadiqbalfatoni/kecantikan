import DB from "./core/config/knex.js";

async function debugLatest() {
  try {
    const latestAntrian = await DB("trx_antrian_layanan").orderBy("id", "desc").limit(5);
    console.log("=== LATEST 5 ANTREAN LAYANAN ===");
    latestAntrian.forEach(a => {
      console.log(`ID: ${a.id}, Kode: ${a.kode_antrian_layanan}, Kunjungan: ${a.kode_kunjungan}, Ruangan: ${a.nama_ruangan} (${a.kode_ruangan}), Status: ${a.status}`);
    });

    const latestRM = await DB("trx_rekam_medis").orderBy("id", "desc").limit(5);
    console.log("=== LATEST 5 REKAM MEDIS ===");
    latestRM.forEach(r => {
      console.log(`ID: ${r.id}, Kunjungan: ${r.kode_kunjungan}`);
      console.log(`Detail Layanan Ruangan:`, r.detail_layanan_ruangan);
      console.log(`Catatan:`, r.catatan);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

debugLatest();
