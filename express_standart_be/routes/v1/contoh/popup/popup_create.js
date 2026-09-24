import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import {
  Logging,
  ChangesLog,
  validatePayload,
} from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { getLastKodeRegister, setLastKodeRegister } from "../../components/tools/getter_setter.js";

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
        nama: Joi.string().max(255).required().label("Nama Shift"),
        waktu_mulai: Joi.string().required().label("Jam Mulai"),
        waktu_selesai: Joi.string().required().label("Jam Selesai"),
        status: Joi.string().valid("1", "0").required().label("Status Aktif"),
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
      oPayload,
      {
        // uniqueField: ['kode'],
        table: "mst_shift",
        allowUnknown: true,
      },
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      };

      return res.status(422).json(oResult);
    }

    let cUniqueCode = "";

    await DB.transaction(async (trx) => {
      cUniqueCode = await getLastKodeRegister("SFT", 4, true, trx);

      const oData = {
        kode: cUniqueCode,
        nama: oPayload.nama,
        waktu_mulai: oPayload.waktu_mulai,
        waktu_selesai: oPayload.waktu_selesai,
        status: oPayload.status,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_at: formatDateSystem(),
      };

      await trx("mst_shift").insert(oData);

      await setLastKodeRegister("SFT", trx);

      await ChangesLog(
        {
          description: "Tambah Shift",
          tableName: "mst_shift",
          referenceCode: cUniqueCode,
          action: "CREATE",
          dataBefore: null,
          dataAfter: oData,
          user: username,
          tz: oPayload.tz || "UTC",
        },
        trx,
      );
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil dibuat",
      datetime: formatDateSystem(),
      data: {
        kode: cUniqueCode,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "popup/popup_create.js",
      func: "create",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
