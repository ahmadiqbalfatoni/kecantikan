/**
 * @project Sistem Klinik Kecantikan
 * @file kasir_bayar.js
 * @description Endpoint proses bayar - ubah status draft menjadi lunas
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, body?.kode_cabang);

  const { kode_transaksi, metode_bayar, nominal_bayar } = body;

  if (!kode_transaksi) {
    return res.status(400).json({ status: status.BAD_REQUEST, message: "kode_transaksi wajib diisi", datetime: formatDateSystem() });
  }

  const validMetode = ["tunai", "debit", "kredit", "qris", "transfer"];
  if (!validMetode.includes(metode_bayar)) {
    return res.status(400).json({ status: status.BAD_REQUEST, message: "Metode bayar tidak valid", datetime: formatDateSystem() });
  }

  try {
    let qExisting = DB("trx_transaksi").where("kode_transaksi", kode_transaksi);
    if (branchCode) {
      qExisting = qExisting.andWhere("kode_cabang", branchCode);
    }
    const existing = await qExisting.first();
    if (!existing) {
      return res.status(404).json({ status: status.BAD_REQUEST, message: "Transaksi tidak ditemukan", datetime: formatDateSystem() });
    }
    if (existing.status === "lunas") {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Transaksi sudah lunas", datetime: formatDateSystem() });
    }
    if (existing.status === "batal") {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Transaksi sudah dibatalkan", datetime: formatDateSystem() });
    }

    const totalBayar = parseFloat(existing.total_bayar || 0);
    const dpNominal = parseFloat(existing.dp_nominal || 0);
    const tagihanPelunasan = existing.sisa_bayar !== null && existing.sisa_bayar !== undefined
      ? parseFloat(existing.sisa_bayar)
      : Math.max(0, totalBayar - dpNominal);

    const nominalBayar = parseFloat(nominal_bayar !== undefined && nominal_bayar !== null ? nominal_bayar : tagihanPelunasan);

    if (metode_bayar === "tunai" && nominalBayar < tagihanPelunasan) {
      return res.status(400).json({ status: status.BAD_REQUEST, message: `Nominal bayar kurang. Diperlukan: Rp ${tagihanPelunasan.toLocaleString("id-ID")}`, datetime: formatDateSystem() });
    }

    const kembalian = metode_bayar === "tunai" ? Math.max(0, nominalBayar - tagihanPelunasan) : 0;

    await DB("trx_transaksi").where("kode_transaksi", kode_transaksi).update({
      metode_bayar,
      sisa_bayar: tagihanPelunasan,
      status: "lunas",
      updated_by: username,
      updated_at: DB.fn.now(),
    });

    if (existing.kode_kunjungan) {
      await DB("trx_kunjungan").where("kode_kunjungan", existing.kode_kunjungan).update({
        status: "selesai",
        updated_by: username,
        updated_at: DB.fn.now(),
      });
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Pembayaran berhasil",
      datetime: formatDateSystem(),
      data: {
        kode_transaksi,
        metode_bayar,
        kode_promo: existing.kode_promo || null,
        nama_promo: existing.nama_promo || null,
        total_harga: parseFloat(existing.total_harga || 0),
        total_diskon: parseFloat(existing.total_diskon || 0),
        total_bayar: totalBayar,
        dp_nominal: dpNominal,
        metode_pembayaran_dp: existing.metode_pembayaran_dp || null,
        sisa_bayar: tagihanPelunasan,
        nominal_bayar: nominalBayar,
        kembalian,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, { file: "/master/kasir/kasir_bayar.js", user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
