/**
 * @file cabang_update.js
 * @description Endpoint untuk mengupdate informasi cabang
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { status } from "../../components/tools/general.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import Joi from "joi";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = { ...req.body };
  const username = req?.auth?.username || "SUPERADMIN";

  try {
    const cValidation = await validatePayload(
      {
        kode_cabang: Joi.string().required().label("Kode Cabang"),
        nama_cabang: Joi.string().max(150).required().label("Nama Cabang"),
        alamat: Joi.string().allow("", null).label("Alamat"),
        no_telp: Joi.string().allow("", null).label("No Telepon"),
        email: Joi.string().email().allow("", null).label("Email"),
        pj_manager: Joi.string().allow("", null).label("Penanggung Jawab / Manager"),
        status: Joi.string().valid("aktif", "tidak aktif").label("Status"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
      },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: formatDateSystem(),
      });
    }

    const exist = await DB("mst_cabang")
      .where("kode_cabang", oPayload.kode_cabang)
      .first();

    if (!exist) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data cabang tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    const updateData = {
      nama_cabang: oPayload.nama_cabang.trim(),
      alamat: oPayload.alamat !== undefined ? oPayload.alamat.trim() : exist.alamat,
      no_telp: oPayload.no_telp !== undefined ? oPayload.no_telp.trim() : exist.no_telp,
      email: oPayload.email !== undefined ? oPayload.email.trim() : exist.email,
      pj_manager: oPayload.pj_manager !== undefined ? oPayload.pj_manager.trim() : exist.pj_manager,
      status: oPayload.status !== undefined ? oPayload.status : exist.status,
      updated_by: username,
      updated_at: formatDateSystem(),
    };

    await DB("mst_cabang")
      .where("kode_cabang", oPayload.kode_cabang)
      .update(updateData);

    return res.status(200).json({
      status: status.SUKSES,
      message: `Data cabang ${oPayload.kode_cabang} berhasil diperbarui`,
      data: {
        ...exist,
        ...updateData,
      },
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, {
      file: "/master/cabang/cabang_update.js",
      func: "update",
      request: oPayload,
      user: username,
    });
    return res.status(500).json({
      status: status.GAGAL,
      message: "Gagal memperbarui data cabang",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
