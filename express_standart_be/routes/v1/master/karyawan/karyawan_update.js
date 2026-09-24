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
      { no_sip: Joi.string().max(20).required().label("No SIP"), nama: Joi.string().max(100).required().label("Nama Karyawan"), jabatan: Joi.string().valid("owner", "manager", "dokter", "beautician", "terapis", "kasir", "warehouse", "logistik", "superadmin", "perawat", "admin", "apoteker").required().label("Jabatan"), no_hp: Joi.string().max(20).allow("", null).label("No HP"), email: Joi.string().email().max(100).allow("", null).label("Email"), kode_user: Joi.string().allow("", null).label("Kode User"), status: Joi.string().valid("aktif", "nonaktif").required().label("Status") },
      { "any.required": "{#label} wajib diisi" }, oPayload, { allowUnknown: true }
    );
    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    await DB.transaction(async (trx) => {
      const qPrev = trx("mst_karyawan").where("no_sip", oPayload.no_sip);
      if (branchCode) qPrev.where("kode_cabang", branchCode);
      const prev = await qPrev.forUpdate().first();
      if (!prev) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }
      const oData = { nama: oPayload.nama, jabatan: oPayload.jabatan, no_hp: oPayload.no_hp || null, email: oPayload.email || null, kode_user: oPayload.kode_user || null, status: oPayload.status, updated_by: username, updated_at: formatDateSystem() };
      await trx("mst_karyawan").where("no_sip", oPayload.no_sip).update(oData);
      await ChangesLog({ description: `Edit Karyawan ${oPayload.no_sip}`, tableName: "mst_karyawan", referenceCode: oPayload.no_sip, action: "UPDATE", dataBefore: prev, dataAfter: { ...prev, ...oData }, user: username, tz: oPayload.tz || "UTC" }, trx);
    });
    return res.status(200).json({ status: status.SUKSES, message: "Karyawan berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/karyawan/karyawan_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});
export default router;
