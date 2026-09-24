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
        nama: Joi.string().max(255).required().label("Nama Supplier"),
        alamat: Joi.string().max(255).required().label("Alamat"),
        telepon: Joi.string().max(50).required().label("Telepon"),
        kode_kategori: Joi.string()
          .max(36)
          .required()
          .label("Kategori Supplier"),
        rekening: Joi.string()
          .max(50)
          .allow(null, "")
          .optional()
          .label("No Rekening"),
        plafond_1: Joi.number()
          .min(0)
          .allow(null, "")
          .optional()
          .label("Plafond 1"),
        plafond_2: Joi.number()
          .min(0)
          .allow(null, "")
          .optional()
          .label("Plafond 2"),

        // Contact Person 1 (Dibuat opsional secara eksplisit)
        nama_cp_1: Joi.string()
          .max(100)
          .allow(null, "")
          .optional()
          .label("Nama CP 1"),
        email_cp_1: Joi.string()
          .max(100)
          .allow(null, "")
          .optional()
          .label("Email CP 1"),
        telepon_cp_1: Joi.string()
          .max(50)
          .allow(null, "")
          .optional()
          .label("Telepon CP 1"),
        hp_cp_1: Joi.string()
          .max(50)
          .allow(null, "")
          .optional()
          .label("HP CP 1"),
        alamat_cp_1: Joi.string()
          .max(255)
          .allow(null, "")
          .optional()
          .label("Alamat CP 1"),

        // Contact Person 2 (Dibuat opsional secara eksplisit)
        nama_cp_2: Joi.string()
          .max(100)
          .allow(null, "")
          .optional()
          .label("Nama CP 2"),
        email_cp_2: Joi.string()
          .max(100)
          .allow(null, "")
          .optional()
          .label("Email CP 2"),
        telepon_cp_2: Joi.string()
          .max(50)
          .allow(null, "")
          .optional()
          .label("Telepon CP 2"),
        hp_cp_2: Joi.string()
          .max(50)
          .allow(null, "")
          .optional()
          .label("HP CP 2"),
        alamat_cp_2: Joi.string()
          .max(255)
          .allow(null, "")
          .optional()
          .label("Alamat CP 2"),
      },
      {
        "string.base": "{#label} harus berupa teks",
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} tidak boleh lebih dari {#limit} karakter",
        "any.only": "{#label} tidak valid",
        "any.required": "{#label} wajib diisi",
        "number.base": "{#label} harus berupa angka",
        "number.min": "{#label} tidak boleh kurang dari {#limit}",
      },
      oPayload,
      {
        table: "mst_supplier",
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
      cUniqueCode = await getLastKodeRegister("SPL", 4, true, trx);

      const oData = {
        kode: cUniqueCode,
        nama: oPayload.nama,
        alamat: oPayload.alamat || null,
        telepon: oPayload.telepon || null,
        kode_kategori: oPayload.kode_kategori || null,
        rekening: oPayload.rekening || null,
        plafond_1: oPayload.plafond_1 || 0,
        plafond_2: oPayload.plafond_2 || 0,

        // Data Contact Person 1
        nama_cp_1: oPayload.nama_cp_1 || null,
        email_cp_1: oPayload.email_cp_1 || null,
        telepon_cp_1: oPayload.telepon_cp_1 || null,
        hp_cp_1: oPayload.hp_cp_1 || null,
        alamat_cp_1: oPayload.alamat_cp_1 || null,

        // Data Contact Person 2
        nama_cp_2: oPayload.nama_cp_2 || null,
        email_cp_2: oPayload.email_cp_2 || null,
        telepon_cp_2: oPayload.telepon_cp_2 || null,
        hp_cp_2: oPayload.hp_cp_2 || null,
        alamat_cp_2: oPayload.alamat_cp_2 || null,

        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_at: formatDateSystem(),
      };

      await trx("mst_supplier").insert(oData);

      await setLastKodeRegister("SPL", trx);

      await ChangesLog(
        {
          description: "Tambah Supplier",
          tableName: "mst_supplier",
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
      file: "/contoh/tabview/tabview_create.js",
      func: "create",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
