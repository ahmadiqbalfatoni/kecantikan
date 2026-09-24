import DB from "./core/config/knex.js";

async function testFetch() {
  try {
    const kode_kunjungan = "KJ-20260831-006";

    // 1. Cek dari draf transaksi kasir jika sudah ada
    const trxDraft = await DB("trx_transaksi")
      .where("kode_kunjungan", kode_kunjungan)
      .where("status", "draft")
      .first();

    if (trxDraft) {
      const products = await DB("trx_detail_transaksi as dt")
        .join("mst_produk as p", "dt.kode_produk", "p.kode_produk")
        .where("dt.kode_transaksi", trxDraft.kode_transaksi)
        .whereNotNull("dt.kode_produk")
        .groupBy("dt.kode_produk", "p.nama", "p.satuan")
        .select(
          "dt.kode_produk",
          "p.nama",
          DB.raw("MAX(COALESCE(dt.harga_satuan, p.harga_jual, 0)) as harga_jual"),
          DB.raw("COALESCE(p.satuan, 'pcs') as satuan"),
          DB.raw("SUM(dt.qty) as qty")
        );
      if (products && products.length > 0) {
        console.log("Found in draft transaction:", products);
        process.exit(0);
      }
    }

    // 2. Dari Rekam Medis
    const rm = await DB("trx_rekam_medis")
      .where("kode_kunjungan", kode_kunjungan)
      .first();

    if (rm && rm.detail_layanan_ruangan) {
      const detailRuangan = typeof rm.detail_layanan_ruangan === "string"
        ? JSON.parse(rm.detail_layanan_ruangan)
        : rm.detail_layanan_ruangan;

      let produkList = [];
      Object.values(detailRuangan).forEach((roomObj) => {
        if (!roomObj) return;
        let recItems = [];
        if (Array.isArray(roomObj.rekomendasi_items)) {
          recItems = roomObj.rekomendasi_items;
        } else if (roomObj.hasil_form) {
          let hForm = roomObj.hasil_form;
          if (typeof hForm === "string") {
            try { hForm = JSON.parse(hForm); } catch (_) {}
          }
          if (hForm && Array.isArray(hForm.rekomendasi_items)) {
            recItems = hForm.rekomendasi_items;
          }
        }

        recItems.forEach((item) => {
          const j = (item.jenis || item.tipe || "").toLowerCase();
          if (["produk", "paket_produk"].includes(j) || item.kode_produk) {
            produkList.push({
              kode_produk: item.kode || item.kode_produk,
              nama: item.nama || item.nama_produk,
              harga_jual: parseFloat(item.harga || item.harga_jual || 0),
              satuan: item.satuan || "pcs",
              qty: parseInt(item.qty || 1, 10),
            });
          }
        });
      });

      const mergedMap = {};
      produkList.forEach((p) => {
        if (p.kode_produk) {
          if (!mergedMap[p.kode_produk]) {
            mergedMap[p.kode_produk] = p;
          } else {
            mergedMap[p.kode_produk].qty += p.qty;
          }
        }
      });

      console.log("Found in Rekam Medis:", Object.values(mergedMap));
    }

    process.exit(0);
  } catch (err) {
    console.error("Fetch test error:", err);
    process.exit(1);
  }
}

testFetch();
