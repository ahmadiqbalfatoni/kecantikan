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
    const cValidation = await validatePayload(
      {
        kode_promo: Joi.string().required().label("Kode Promo"),
        jenis_item: Joi.string().valid("produk", "layanan", "paket").optional().default("produk").label("Jenis Item"),
        status: Joi.string().valid("aktif", "nonaktif").optional().default("aktif").label("Status"),
      },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    let itemsToProcess = [];
    if (Array.isArray(oPayload.details) && oPayload.details.length > 0) {
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
    } else if (typeof oPayload.kode_item === "string" && oPayload.kode_item.trim()) {
      itemsToProcess = [{
        kode_item: oPayload.kode_item.trim(),
        jenis_item: oPayload.jenis_item || "produk"
      }];
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

    // Validate kode_promo exists
    const promo = await DB("mst_promo").where("kode_promo", oPayload.kode_promo).first();
    if (!promo) return res.status(422).json({ status: status.BAD_REQUEST, message: "Promo tidak ditemukan", datetime: formatDateSystem() });

    // Check existing records for this promo
    const existingRecords = await DB("mst_detail_promo")
      .where("kode_promo", oPayload.kode_promo)
      .select("jenis_item", "kode_item");

    const existingKeySet = new Set(existingRecords.map((r) => `${r.jenis_item}:${r.kode_item}`));
    const itemsToAdd = itemsToProcess.filter((item) => !existingKeySet.has(`${item.jenis_item}:${item.kode_item}`));

    if (itemsToAdd.length === 0) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: itemsToProcess.length > 1
          ? "Seluruh item yang dipilih sudah terdaftar pada promo ini"
          : "Item ini sudah terdaftar pada promo yang sama",
        datetime: formatDateSystem(),
      });
    }

    let createdCount = 0;
    const insertedCodes = [];

    await DB.transaction(async (trx) => {
      const allDpr = await trx("mst_detail_promo").where("kode_detail_promo", "like", "DPRM-%").select("kode_detail_promo");
      let maxNum = 0;
      for (const d of allDpr) {
        const num = parseInt(d.kode_detail_promo.replace("DPRM-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      let n = maxNum + 1;

      for (const item of itemsToAdd) {
        const kode = `DPRM-${String(n).padStart(4, "0")}`;
        n++;

        const oData = {
          kode_detail_promo: kode,
          kode_promo: oPayload.kode_promo,
          jenis_item: item.jenis_item || "produk",
          kode_item: item.kode_item,
          status: oPayload.status || "aktif",
          tz: oPayload.tz || "UTC",
          created_by: username,
          created_at: formatDateSystem(),
          updated_by: username,
          updated_at: formatDateSystem(),
        };

        await trx("mst_detail_promo").insert(oData);
        await ChangesLog({ description: `Tambah Detail Promo ${kode}`, tableName: "mst_detail_promo", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
        insertedCodes.push(kode);
        createdCount++;
      }
    });

    const skippedCount = itemsToProcess.length - itemsToAdd.length;
    let msg = createdCount > 1 
      ? `${createdCount} item promo berhasil ditambahkan` 
      : "Detail item promo berhasil ditambahkan";
    if (skippedCount > 0) {
      msg += ` (${skippedCount} item dilewati karena sudah terdaftar)`;
    }

    return res.status(200).json({ status: status.SUKSES, message: msg, datetime: formatDateSystem(), data: { inserted_codes: insertedCodes } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/detail_promo/detail_promo_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
