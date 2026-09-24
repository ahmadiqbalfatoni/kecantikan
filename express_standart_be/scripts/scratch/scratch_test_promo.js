import DB from "./core/config/knex.js";

async function testKasirOptions() {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    console.log("TEST TODAY DATE:", todayStr);

    const vaPromo = await DB("mst_promo as p")
      .where("p.status", "aktif")
      .whereRaw("CURDATE() BETWEEN DATE(p.tanggal_mulai) AND DATE(p.tanggal_selesai)")
      .select(
        "p.kode_promo",
        "p.nama as nama_promo",
        "p.jenis_diskon",
        "p.nilai_diskon",
        "p.tanggal_mulai",
        "p.tanggal_selesai"
      )
      .orderBy("p.nama", "asc");

    console.log("PROMO DISCOVERED BY KASIR OPTIONS:", vaPromo);

    // Also check promo without strict date filter or with flexible date check
    const vaPromoFlexible = await DB("mst_promo as p")
      .where("p.status", "aktif")
      .select("*");
    console.log("ALL AKTIF PROMOS:", vaPromoFlexible);

  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit();
  }
}

testKasirOptions();
