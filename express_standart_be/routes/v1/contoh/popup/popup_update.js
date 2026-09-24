import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";

  try {
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Invalid request body",
        datetime: formatDateSystem(),
      });
    }

    const cValidation = await validatePayload(
      {
        kode: Joi.string().required().label("Kode Shift"),
        nama: Joi.string().max(255).required().label("Nama Shift"),
        waktu_mulai: Joi.string().required().label("Jam Mulai"),
        waktu_selesai: Joi.string().required().label("Jam Selesai"),
        status: Joi.string().valid("1", "0").required().label("Status Aktif")
      },
      {
        "string.base": "{#label} harus berupa teks",
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} tidak boleh lebih dari {#limit} karakter",
        "any.only": "{#label} kategori tidak valid",
        "any.required": "{#label} wajib diisi",
        "number.base": "{#label} harus berupa angka",
        "number.min": "{#label} tidak boleh kurang dari {#limit}",
      },
      oPayload, {
      table: "mst_shift",
      excludedField: "kode",
      allowUnknown: true
    });

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      };

      return res.status(422).json(oResult);
    }

    let previousRecord = null;

    await DB.transaction(async (trx) => {
      previousRecord = await trx("mst_shift")
        .where('kode', oPayload.kode)
        .forUpdate()
        .first();

      if (!previousRecord) {
        const error = new Error("Data tidak ditemukan");
        error.statusCode = 404;
        throw error;
      }

      const oData = {
        nama: oPayload.nama,
        waktu_mulai: oPayload.waktu_mulai,
        waktu_selesai: oPayload.waktu_selesai,
        status: oPayload.status,
        tz: oPayload.tz || 'UTC',
        updated_by: username,
        updated_at: formatDateSystem(),
      };

      const affectedRows = await trx("mst_shift")
        .where('kode', oPayload.kode)
        .update(oData);

      if (affectedRows > 0) {
        const currentRecord = {
          ...previousRecord,
          nama: oPayload.nama,
          waktu_mulai: oPayload.waktu_mulai,
          waktu_selesai: oPayload.waktu_selesai,
          status: oPayload.status,
          tz: oPayload.tz || 'UTC',
          updated_by: username,
          updated_at: oData.updated_at
        };

        await ChangesLog({
          description: "Edit Shift",
          tableName: "mst_shift",
          referenceCode: oPayload.kode,
          action: "UPDATE",
          dataBefore: previousRecord,
          dataAfter: currentRecord,
          user: username,
          tz: oPayload.tz || "UTC"
        }, trx);
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil diupdate",
      datetime: formatDateSystem(),
    });

  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data tidak ditemukan atau sudah terhapus sebelumnya",
        datetime: formatDateSystem(),
      });
    }

    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "popup/popup_update.js",
      func: "update",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;