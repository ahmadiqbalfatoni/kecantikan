import DB from "./core/config/knex.js";

async function testKasirDetail011() {
  try {
    const kode_transaksi = "TRX-20260831-011";

    const trx = await DB("trx_transaksi as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .leftJoin("trx_kunjungan as k", "t.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_promo as pr", "t.kode_promo", "pr.kode_promo")
      .where("t.kode_transaksi", kode_transaksi)
      .select(
        "t.*",
        "p.nama as nama_pasien",
        "p.no_hp",
        "pr.nama as nama_promo",
        "pr.jenis_diskon",
        "pr.nilai_diskon as nilai_diskon_promo"
      )
      .first();

    const details = await DB("trx_detail_transaksi as dt")
      .leftJoin("mst_layanan as l", "dt.kode_layanan", "l.kode_layanan")
      .leftJoin("mst_produk as prod", "dt.kode_produk", "prod.kode_produk")
      .where("dt.kode_transaksi", kode_transaksi)
      .select(
        "dt.kode_detail_transaksi",
        "dt.kode_layanan",
        "dt.kode_produk",
        "l.nama as nama_layanan",
        "prod.nama as nama_produk",
        "prod.satuan",
        "dt.qty",
        "dt.harga_satuan",
        "dt.subtotal",
        DB.raw("COALESCE(dt.is_from_pendaftaran, 0) as is_from_pendaftaran")
      )
      .orderBy("dt.is_from_pendaftaran", "desc")
      .orderBy("dt.id", "asc");

    const detailsMapped = details.map((d) => ({
      ...d,
      jenis: d.kode_layanan ? "layanan" : "produk",
      kode: d.kode_layanan || d.kode_produk,
      nama: d.nama_layanan || d.nama_produk || "-",
      satuan: d.satuan || (d.kode_layanan ? "tindakan" : "pcs"),
      is_from_pendaftaran: Boolean(d.is_from_pendaftaran),
    }));

    console.log("TRX-20260831-011 Summary:");
    console.log("Header Total Bayar:", trx.total_bayar);
    console.log("Details Count:", detailsMapped.length);
    console.log("Details:", detailsMapped);

    const detailSum = detailsMapped.reduce((acc, curr) => acc + parseFloat(curr.subtotal), 0);
    console.log("Calculated Detail Sum:", detailSum);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

testKasirDetail011();
