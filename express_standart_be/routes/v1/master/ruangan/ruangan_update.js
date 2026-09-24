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
        kode_ruangan: Joi.string().required().label("Kode Ruangan"),
        nama_ruangan: Joi.string().max(30).required().label("Nama Ruangan"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status")
      },
      { "any.required": "{#label} wajib diisi" }, oPayload, { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    await DB.transaction(async (trx) => {
      let qPrev = trx("mst_ruangan").where("kode_ruangan", oPayload.kode_ruangan);
      if (branchCode) qPrev = qPrev.andWhere("kode_cabang", branchCode);
      const prev = await qPrev.forUpdate().first();
      if (!prev) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      const oData = {
        nama_ruangan: oPayload.nama_ruangan,
        status: oPayload.status,
        is_konsultasi: parseInt(oPayload.is_konsultasi || 0) === 1 ? 1 : 0,
        updated_by: username,
        updated_at: formatDateSystem()
      };

      await trx("mst_ruangan").where("kode_ruangan", oPayload.kode_ruangan).update(oData);
      await ChangesLog({ description: `Edit Ruangan ${oPayload.kode_ruangan}`, tableName: "mst_ruangan", referenceCode: oPayload.kode_ruangan, action: "UPDATE", dataBefore: prev, dataAfter: { ...prev, ...oData }, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Ruangan berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/ruangan/ruangan_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
