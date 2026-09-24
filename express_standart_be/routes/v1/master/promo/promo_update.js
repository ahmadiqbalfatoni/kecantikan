import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = req.body;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const cValidation = await validatePayload(
      {
        kode_promo: Joi.string().required().label("Kode Promo"),
        nama: Joi.string().max(100).required().label("Nama Promo"),
        jenis_diskon: Joi.string().valid("persen", "nominal").required().label("Jenis Diskon"),
        nilai_diskon: Joi.number().min(0).required().label("Nilai Diskon"),
        tanggal_mulai: Joi.string().required().label("Tanggal Mulai"),
        tanggal_selesai: Joi.string().required().label("Tanggal Selesai"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status")
      },
      { "any.required": "{#label} wajib diisi" }, oPayload, { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    await DB.transaction(async (trx) => {
      let qPrev = trx("mst_promo").where("kode_promo", oPayload.kode_promo);
      if (branchCode) qPrev = qPrev.andWhere("kode_cabang", branchCode);
      const prev = await qPrev.forUpdate().first();
      if (!prev) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      const oData = {
        nama: oPayload.nama,
        jenis_diskon: oPayload.jenis_diskon,
        nilai_diskon: oPayload.nilai_diskon,
        tanggal_mulai: oPayload.tanggal_mulai,
        tanggal_selesai: oPayload.tanggal_selesai,
        status: oPayload.status,
        updated_by: username,
        updated_at: formatDateSystem()
      };

      await trx("mst_promo").where("kode_promo", oPayload.kode_promo).update(oData);
      await ChangesLog({ description: `Edit Promo ${oPayload.kode_promo}`, tableName: "mst_promo", referenceCode: oPayload.kode_promo, action: "UPDATE", dataBefore: prev, dataAfter: { ...prev, ...oData }, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Promo berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/promo/promo_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
