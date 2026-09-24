import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = req.body;
  const username = req?.auth?.username || "";

  try {
    // If kode_promo with details is passed, synchronize items (products & services) for that promo
    if (oPayload.kode_promo && (Array.isArray(oPayload.details) || Array.isArray(oPayload.kode_item))) {
      const kodePromo = oPayload.kode_promo;
      let itemsToProcess = [];
      if (Array.isArray(oPayload.details)) {
        itemsToProcess = oPayload.details.map((d) => {
          if (typeof d === "string") {
            return { kode_item: d.trim(), jenis_item: oPayload.jenis_item || "produk" };
          }
          const kode = d.kode_item || d.kode_produk || d.kode_layanan;
          const jenis = d.jenis_item || (d.kode_layanan ? "layanan" : oPayload.jenis_item || "produk");
          return { kode_item: kode ? String(kode).trim() : "", jenis_item: jenis };
        }).filter((it) => it.kode_item);
      } else if (Array.isArray(oPayload.kode_item)) {
        itemsToProcess = oPayload.kode_item.map((code) => ({
          kode_item: String(code).trim(),
          jenis_item: oPayload.jenis_item || "produk"
        })).filter((it) => it.kode_item);
      }

      // Deduplicate within payload
      const seenMap = new Map();
      itemsToProcess = itemsToProcess.filter((it) => {
        const key = `${it.jenis_item}:${it.kode_item}`;
        if (seenMap.has(key)) return false;
        seenMap.set(key, true);
        return true;
      });

      if (itemsToProcess.length === 0) {
        return res.status(422).json({ status: status.BAD_REQUEST, message: "Minimal tambahkan 1 produk atau layanan dalam promo", datetime: formatDateSystem() });
      }

      const statusPromo = oPayload.status || "aktif";

      await DB.transaction(async (trx) => {
        // Delete previous items for this promo
        await trx("mst_detail_promo")
          .where("kode_promo", kodePromo)
          .del();

        const allDpr = await trx("mst_detail_promo").where("kode_detail_promo", "like", "DPRM-%").select("kode_detail_promo");
        let maxNum = 0;
        for (const d of allDpr) {
          const num = parseInt(d.kode_detail_promo.replace("DPRM-", ""), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
        let n = maxNum + 1;

        for (const item of itemsToProcess) {
          const kode = `DPRM-${String(n).padStart(4, "0")}`;
          n++;

          const oData = {
            kode_detail_promo: kode,
            kode_promo: kodePromo,
            jenis_item: item.jenis_item || "produk",
            kode_item: item.kode_item,
            status: statusPromo,
            tz: oPayload.tz || "UTC",
            created_by: username,
            created_at: formatDateSystem(),
            updated_by: username,
            updated_at: formatDateSystem(),
          };

          await trx("mst_detail_promo").insert(oData);
        }

        // Optionally update promo status in mst_promo as well
        if (oPayload.status) {
          await trx("mst_promo").where("kode_promo", kodePromo).update({
            status: statusPromo,
            updated_by: username,
            updated_at: formatDateSystem(),
          });
        }
      });

      return res.status(200).json({ status: status.SUKSES, message: "Detail promo berhasil diperbarui", datetime: formatDateSystem() });
    }

    // Legacy single detail promo update
    const cValidation = await validatePayload(
      {
        kode_detail_promo: Joi.string().required().label("Kode Detail Promo"),
        kode_promo: Joi.string().required().label("Kode Promo"),
        jenis_item: Joi.string().valid("produk", "layanan", "paket").required().label("Jenis Item"),
        kode_item: Joi.string().required().label("Kode Item"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
      },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    await DB.transaction(async (trx) => {
      const prev = await trx("mst_detail_promo").where("kode_detail_promo", oPayload.kode_detail_promo).forUpdate().first();
      if (!prev) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      const oData = {
        kode_promo: oPayload.kode_promo,
        jenis_item: oPayload.jenis_item,
        kode_item: oPayload.kode_item,
        status: oPayload.status,
        updated_by: username,
        updated_at: formatDateSystem(),
      };

      await trx("mst_detail_promo").where("kode_detail_promo", oPayload.kode_detail_promo).update(oData);
      await ChangesLog({ description: `Edit Detail Promo ${oPayload.kode_detail_promo}`, tableName: "mst_detail_promo", referenceCode: oPayload.kode_detail_promo, action: "UPDATE", dataBefore: prev, dataAfter: { ...prev, ...oData }, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Detail promo berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    if (error.statusCode === 422) return res.status(422).json({ status: status.BAD_REQUEST, message: error.message, datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/detail_promo/detail_promo_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
