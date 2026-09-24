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
  const branchCode = getBranchScope(req, oPayload?.kode_cabang);
  try {
    const cValidation = await validatePayload(
      { kode_kategori_produk: Joi.string().required().label("Kode"), nama: Joi.string().max(100).required().label("Nama Kategori"), deskripsi: Joi.string().max(255).allow("", null).label("Deskripsi"), status: Joi.string().valid("aktif", "nonaktif").required().label("Status") },
      { "any.required": "{#label} wajib diisi" }, oPayload, { allowUnknown: true }
    );
    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    await DB.transaction(async (trx) => {
      let qPrev = trx("mst_kategori_produk").where("kode_kategori_produk", oPayload.kode_kategori_produk);
      if (branchCode) {
        qPrev = qPrev.andWhere(function () {
          this.where("kode_cabang", branchCode).orWhereNull("kode_cabang");
        });
      }
      const prev = await qPrev.forUpdate().first();
      if (!prev) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }
      const oData = { nama: oPayload.nama, deskripsi: oPayload.deskripsi || null, status: oPayload.status, updated_by: username, updated_at: formatDateSystem() };
      await trx("mst_kategori_produk").where("kode_kategori_produk", oPayload.kode_kategori_produk).update(oData);
      await ChangesLog({ description: `Edit Kategori Produk ${oPayload.kode_kategori_produk}`, tableName: "mst_kategori_produk", referenceCode: oPayload.kode_kategori_produk, action: "UPDATE", dataBefore: prev, dataAfter: { ...prev, ...oData }, user: username, tz: oPayload.tz || "UTC" }, trx);
    });
    return res.status(200).json({ status: status.SUKSES, message: "Kategori produk berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/kategori_produk/kategori_produk_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});
export default router;
