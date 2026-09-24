/**
 * @project Sistem Klinik Kecantikan
 * @file kasir_options.js
 * @description Endpoint opsi untuk kasir: pasien (kunjungan hari ini + layanan pendaftaran), semua layanan & paket aktif, produk aktif, promo aktif
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getCompletedItemsForKasir } from "./kasir_sync_service.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, body?.kode_cabang);
  const todayStr = new Date().toISOString().slice(0, 10);

  try {
    // 1. Pasien dengan kunjungan 'selesai' dan BELUM ada transaksi lunas
    let kunjunganQuery = DB("trx_kunjungan as k")
      .join("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("trx_booking as b", "k.kode_booking", "b.kode_booking")
      .leftJoin("trx_transaksi as t_lunas", function () {
        this.on("k.kode_kunjungan", "=", "t_lunas.kode_kunjungan")
          .andOn("t_lunas.status", "=", DB.raw("?", ["lunas"]));
      })
      .where("k.status", "selesai")
      .whereNull("t_lunas.id")
      .select(
        "k.kode_kunjungan",
        "k.kode_booking",
        "k.no_rm",
        "p.nama as nama_pasien",
        "p.no_hp",
        "k.jam_datang",
        "k.status as status_kunjungan",
        "b.dp_nominal",
        "b.dp_status",
        "b.metode_pembayaran_dp"
      )
      .orderBy("k.jam_datang", "asc");

    if (branchCode) {
      kunjunganQuery = kunjunganQuery.where("k.kode_cabang", branchCode);
    }

    if (body?.tanggal_kunjungan) {
      kunjunganQuery = kunjunganQuery.where("k.tanggal_kunjungan", body.tanggal_kunjungan);
    }

    const vaKunjungan = await kunjunganQuery;

    // Ambil SEMUA antrean layanan yang statusnya 'selesai' dengan deduplikasi rujukan terpusat
    const kodeKunjunganList = vaKunjungan.map((k) => k.kode_kunjungan).filter(Boolean);
    let vaLayananPendaftaran = [];
    if (kodeKunjunganList.length > 0) {
      vaLayananPendaftaran = await getCompletedItemsForKasir(DB, kodeKunjunganList);
    }

    const kunjunganMapped = vaKunjungan.map((k) => {
      const roomItems = vaLayananPendaftaran.filter((l) => l.kode_kunjungan === k.kode_kunjungan);
      const mappedItems = roomItems.map((l) => {
        const isProduct = ["produk", "paket_produk"].includes((l.jenis_layanan || "").toLowerCase());
        const isKlaim = (l.jenis_layanan || "").toLowerCase() === "klaim_paket";
        const itemHarga = isKlaim ? 0 : parseFloat(l.harga || 0);
        return {
          id: l.id,
          kode_detail_antrian_layanan: l.kode_detail_antrian_layanan,
          jenis: isProduct ? "produk" : (isKlaim ? "klaim_paket" : "layanan"),
          kode: l.kode_layanan,
          nama: l.nama_layanan,
          satuan: isProduct ? "pcs" : "tindakan",
          qty: 1,
          harga_satuan: itemHarga,
          subtotal: itemHarga,
          is_from_pendaftaran: isProduct ? false : true,
          is_klaim_paket: isKlaim,
          kode_promo: l.kode_promo || null,
          nama_promo: l.nama_promo || null,
          jenis_diskon: l.jenis_diskon || null,
          nilai_diskon: l.nilai_diskon ? parseFloat(l.nilai_diskon) : null,
        };
      });
      return {
        ...k,
        dp_nominal: parseFloat(k.dp_nominal || 0),
        dp_status: k.dp_status || null,
        metode_pembayaran_dp: k.metode_pembayaran_dp || null,
        layanan_pendaftaran: mappedItems,
      };
    });

    const host = req.get("host");
    const protocol = req.protocol || "http";
    const assetsBase = `${protocol}://${host}`;

    // 2a. Layanan Single Aktif
    const qLayananSingle = DB("mst_layanan as l")
      .leftJoin("mst_kategori_layanan as k", "l.kode_kategori_layanan", "k.kode_kategori_layanan")
      .leftJoin("mst_ruangan as r", "l.kode_ruangan", "r.kode_ruangan")
      .where("l.status", "aktif");

    if (branchCode) qLayananSingle.where("l.kode_cabang", branchCode);

    const vaLayananSingle = await qLayananSingle
      .select(
        "l.kode_layanan",
        "l.nama",
        "l.harga",
        "l.durasi_menit",
        "l.wajib_konsultasi",
        "l.tipe",
        "l.foto",
        "l.kode_ruangan",
        "r.nama_ruangan",
        "k.nama as nama_kategori"
      )
      .orderBy("l.nama", "asc");

    // 2b. Paket Layanan Aktif
    const qPaketLayanan = DB("mst_paket_layanan as pl")
      .leftJoin("mst_ruangan as r", "pl.kode_ruangan", "r.kode_ruangan")
      .where("pl.status", "aktif");

    if (branchCode) qPaketLayanan.where("pl.kode_cabang", branchCode);

    const vaPaketLayanan = await qPaketLayanan
      .select(
        "pl.kode_paket_layanan",
        "pl.nama",
        "pl.harga_paket as harga",
        "pl.tipe",
        "pl.foto",
        "pl.kode_ruangan",
        "r.nama_ruangan"
      )
      .orderBy("pl.nama", "asc");

    // Gabungkan Single Layanan + Paket Layanan di tab Layanan
    const listLayanan = [
      ...vaLayananSingle.map((item) => ({
        jenis: "layanan",
        kode: item.kode_layanan,
        nama: item.nama,
        nama_kategori: item.nama_kategori || "Layanan",
        nama_ruangan: item.nama_ruangan || item.kode_ruangan || "-",
        durasi_menit: item.durasi_menit || 30,
        wajib_konsultasi: item.wajib_konsultasi || "opsional",
        tipe: item.tipe || "BEAUTY TREATMENT",
        foto: item.foto ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/layanan/${item.foto}`) : null,
        harga: parseFloat(item.harga || 0),
      })),
      ...vaPaketLayanan.map((item) => ({
        jenis: "layanan",
        kode: item.kode_paket_layanan,
        nama: item.nama,
        nama_kategori: "Paket Layanan",
        nama_ruangan: item.nama_ruangan || item.kode_ruangan || "-",
        durasi_menit: 45,
        wajib_konsultasi: item.tipe === "MEDICAL TREATMENT" ? "wajib" : item.tipe === "SERVICE TREATMENT" ? "tidak" : "opsional",
        tipe: item.tipe || "BEAUTY TREATMENT",
        foto: item.foto ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/paket_layanan/${item.foto}`) : null,
        harga: parseFloat(item.harga || 0),
      })),
    ].sort((a, b) => a.nama.localeCompare(b.nama));

    // 3. Produk aktif
    const qProduk = DB("mst_produk as p")
      .leftJoin("mst_kategori_produk as k", "p.kode_kategori_produk", "k.kode_kategori_produk")
      .where("p.status", "aktif")
      .whereRaw("p.kode_produk NOT LIKE 'CUSTOM-%' AND p.kode_produk NOT LIKE 'CST-%'");

    if (branchCode) qProduk.where("p.kode_cabang", branchCode);

    const vaProduk = await qProduk
      .select(
        "p.kode_produk",
        "p.nama",
        "p.foto",
        "p.harga_jual as harga",
        "p.satuan",
        "k.nama as nama_kategori"
      )
      .orderBy("p.nama", "asc");

    const listProduk = vaProduk.map((item) => ({
      jenis: "produk",
      foto: item.foto ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/produk/${item.foto}`) : null,
      kode: item.kode_produk,
      nama: item.nama,
      nama_kategori: item.nama_kategori || "Produk",
      satuan: item.satuan || "pcs",
      harga: parseFloat(item.harga || 0),
    }));

    // 4. Detail promo aktif hari ini (per baris mst_detail_promo)
    const qDetailPromo = DB("mst_detail_promo as dp")
      .join("mst_promo as p", "dp.kode_promo", "p.kode_promo")
      .where("dp.status", "aktif")
      .where("p.status", "aktif")
      .whereRaw("CURDATE() BETWEEN DATE(p.tanggal_mulai) AND DATE(p.tanggal_selesai)");

    if (branchCode) qDetailPromo.where("p.kode_cabang", branchCode);

    const vaDetailPromo = await qDetailPromo
      .select(
        "dp.kode_detail_promo",
        "dp.kode_promo",
        "p.nama as nama_promo",
        "p.jenis_diskon",
        "p.nilai_diskon",
        "p.tanggal_mulai",
        "p.tanggal_selesai",
        "dp.jenis_item",
        "dp.kode_item"
      )
      .orderBy("p.nama", "asc");

    // Ambil nama item per jenis
    const kodesLayanan = vaDetailPromo.filter((d) => d.jenis_item === "layanan").map((d) => d.kode_item);
    const kodesPaket   = vaDetailPromo.filter((d) => d.jenis_item === "paket").map((d) => d.kode_item);
    const kodesProduk  = vaDetailPromo.filter((d) => d.jenis_item === "produk").map((d) => d.kode_item);

    const [namaLayanan, namaPaket, namaProduk] = await Promise.all([
      kodesLayanan.length > 0 ? DB("mst_layanan").whereIn("kode_layanan", kodesLayanan).select("kode_layanan as kode", "nama") : Promise.resolve([]),
      kodesPaket.length   > 0 ? DB("mst_paket_layanan").whereIn("kode_paket_layanan", kodesPaket).select("kode_paket_layanan as kode", "nama") : Promise.resolve([]),
      kodesProduk.length  > 0 ? DB("mst_produk").whereIn("kode_produk", kodesProduk).select("kode_produk as kode", "nama") : Promise.resolve([]),
    ]);

    const namaMap = {};
    [...namaLayanan, ...namaPaket, ...namaProduk].forEach((i) => { namaMap[i.kode] = i.nama; });

    const listPromo = vaDetailPromo.map((dp) => ({
      kode_detail_promo: dp.kode_detail_promo,
      kode_promo: dp.kode_promo,
      nama_promo: dp.nama_promo,
      jenis_diskon: dp.jenis_diskon,
      nilai_diskon: parseFloat(dp.nilai_diskon || 0),
      tanggal_mulai: dp.tanggal_mulai,
      tanggal_selesai: dp.tanggal_selesai,
      jenis_item: dp.jenis_item,
      kode_item: dp.kode_item,
      nama_item: namaMap[dp.kode_item] || dp.kode_item,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data opsi kasir berhasil dimuat",
      datetime: formatDateSystem(),
      data: {
        kunjungan: kunjunganMapped,
        layanan: listLayanan,
        produk: listProduk,
        promo: listPromo,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, { file: "/master/kasir/kasir_options.js", func: "options", user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
