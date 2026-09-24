/**
 * @file cabang_delete.js
 * @description Endpoint untuk menghapus atau menonaktifkan cabang
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { status } from "../../components/tools/general.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = { ...req.body };
  const username = req?.auth?.username || "SUPERADMIN";
  const kodeCabang = oPayload.kode_cabang;

  if (!kodeCabang) {
    return res.status(400).json({
      status: status.BAD_REQUEST,
      message: "Kode cabang wajib disertakan",
      datetime: formatDateSystem(),
    });
  }

  if (kodeCabang === "CBG-001") {
    return res.status(400).json({
      status: status.BAD_REQUEST,
      message: "Cabang Utama (CBG-001) tidak boleh dihapus dari sistem.",
      datetime: formatDateSystem(),
    });
  }

  try {
    const exist = await DB("mst_cabang").where("kode_cabang", kodeCabang).first();
    if (!exist) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data cabang tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    // Cek apakah ada data transaksi yang terkait dengan cabang ini
    const countTrx = await DB("trx_transaksi").where("kode_cabang", kodeCabang).count("id as total").first();
    const countKunjungan = await DB("trx_kunjungan").where("kode_cabang", kodeCabang).count("id as total").first();
    const totalLinked = Number(countTrx?.total || 0) + Number(countKunjungan?.total || 0);

    if (totalLinked > 0) {
      // Jika sudah ada data transaksi, nonaktifkan saja untuk menjaga integritas data
      await DB("mst_cabang")
        .where("kode_cabang", kodeCabang)
        .update({
          status: "tidak aktif",
          updated_by: username,
          updated_at: formatDateSystem(),
        });

      return res.status(200).json({
        status: status.SUKSES,
        message: `Cabang memiliki riwayat transaksi aktif, status berhasil diubah menjadi Nonaktif.`,
        datetime: formatDateSystem(),
      });
    }

    // Hapus fisik jika cabang baru dan belum ada transaksi
    await DB("mst_cabang").where("kode_cabang", kodeCabang).del();

    return res.status(200).json({
      status: status.SUKSES,
      message: `Cabang ${exist.nama_cabang} (${kodeCabang}) berhasil dihapus.`,
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, {
      file: "/master/cabang/cabang_delete.js",
      func: "delete",
      request: oPayload,
      user: username,
    });
    return res.status(500).json({
      status: status.GAGAL,
      message: "Gagal memproses penghapusan cabang",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
