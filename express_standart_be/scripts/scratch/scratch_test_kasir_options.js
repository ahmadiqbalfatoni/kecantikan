import DB from "./core/config/knex.js";

async function testKasirOptions() {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const vaKunjungan = await DB("trx_kunjungan as k")
      .join("mst_pasien as p", "k.no_rm", "p.no_rm")
      .where("k.tanggal_kunjungan", todayStr)
      .where("k.status", "berlangsung")
      .select(
        "k.kode_kunjungan",
        "k.no_rm",
        "p.nama as nama_pasien",
        "p.no_hp",
        "k.jam_datang",
        "k.status as status_kunjungan"
      )
      .orderBy("k.jam_datang", "asc");

    const kodeKunjunganList = vaKunjungan.map((k) => k.kode_kunjungan).filter(Boolean);
    let vaLayananPendaftaran = [];
    if (kodeKunjunganList.length > 0) {
      vaLayananPendaftaran = await DB("trx_detail_antrian_layanan as dal")
        .whereIn("dal.kode_kunjungan", kodeKunjunganList)
        .select(
          "dal.kode_kunjungan",
          "dal.jenis_layanan",
          "dal.kode_layanan",
          "dal.nama_layanan",
          "dal.harga",
          "dal.kode_promo",
          "dal.nama_promo",
          "dal.jenis_diskon",
          "dal.nilai_diskon"
        );
    }

    const kunjunganMapped = vaKunjungan.map((k) => {
      const roomItems = vaLayananPendaftaran.filter((l) => l.kode_kunjungan === k.kode_kunjungan);
      const uniqueItemsMap = {};
      roomItems.forEach((l) => {
        if (l.kode_layanan && !uniqueItemsMap[l.kode_layanan]) {
          uniqueItemsMap[l.kode_layanan] = {
            jenis: "layanan",
            kode: l.kode_layanan,
            nama: l.nama_layanan,
            satuan: "tindakan",
            qty: 1,
            harga_satuan: parseFloat(l.harga || 0),
            subtotal: parseFloat(l.harga || 0),
            is_from_pendaftaran: true,
          };
        }
      });
      return {
        ...k,
        layanan_pendaftaran: Object.values(uniqueItemsMap),
      };
    });

    console.log("Kunjungan Mapped:", JSON.stringify(kunjunganMapped, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

testKasirOptions();
