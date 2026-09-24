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
        kode: Joi.array()
          .items(Joi.string())
          .min(1)
          .required()
          .label("Kode supplier"),
      },
      {
        "array.base": "{#label} harus berupa array",
        "array.min": "Minimal pilih satu data untuk dihapus",
        "any.required": "{#label} wajib dikirim",
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

    let recordsBeforeDelete = [];

    await DB.transaction(async (trx) => {
      recordsBeforeDelete = await trx("mst_supplier")
        .whereIn("kode", oPayload.kode)
        .forUpdate();

      if (!recordsBeforeDelete || recordsBeforeDelete.length < 1) {
        const error = new Error("Data tidak ditemukan");
        error.statusCode = 404;
        throw error;
      }

      const affectedRows = await trx("mst_supplier")
        .whereIn("kode", oPayload.kode)
        .del();

      if (affectedRows > 0) {
        for (const record of recordsBeforeDelete) {
          await ChangesLog(
            {
              description: "Hapus Supplier",
              tableName: "mst_supplier",
              referenceCode: record.kode,
              action: "DELETE",
              dataBefore: record,
              dataAfter: null,
              user: username,
              tz: oPayload.tz || "UTC",
            },
            trx,
          );
        }
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil dihapus",
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
      file: "/contoh/tabview/tabview_delete.js",
      func: "delete",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
