import express from "express";
import { status } from "../../components/tools/general.js";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = req.body;
  const username = req?.auth?.username || "";

  try {
    const promoCodes = Array.isArray(oPayload.kode_promo)
      ? oPayload.kode_promo
      : oPayload.kode_promo
      ? [oPayload.kode_promo]
      : [];

    const detailCodes = Array.isArray(oPayload.kode_detail_promo)
      ? oPayload.kode_detail_promo
      : oPayload.kode_detail_promo
      ? [oPayload.kode_detail_promo]
      : [];

    if (promoCodes.length === 0 && detailCodes.length === 0) {
      return res.status(422).json({ status: status.BAD_REQUEST, message: "Kode promo atau detail promo wajib diisi", datetime: formatDateSystem() });
    }

    await DB.transaction(async (trx) => {
      let query = trx("mst_detail_promo");
      if (promoCodes.length > 0) {
        query = query.whereIn("kode_promo", promoCodes);
      } else {
        query = query.whereIn("kode_detail_promo", detailCodes);
      }

      const records = await query.forUpdate();
      if (records && records.length > 0) {
        if (promoCodes.length > 0) {
          await trx("mst_detail_promo").whereIn("kode_promo", promoCodes).del();
        } else {
          await trx("mst_detail_promo").whereIn("kode_detail_promo", detailCodes).del();
        }

        for (const record of records) {
          await ChangesLog({ description: `Hapus Detail Promo ${record.kode_detail_promo}`, tableName: "mst_detail_promo", referenceCode: record.kode_detail_promo, action: "DELETE", dataBefore: record, dataAfter: null, user: username, tz: oPayload.tz || "UTC" }, trx);
        }
      }
    });

    const deletedCount = promoCodes.length > 0 ? promoCodes.length : detailCodes.length;
    return res.status(200).json({ status: status.SUKSES, message: `${deletedCount} detail promo berhasil dihapus`, datetime: formatDateSystem() });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/detail_promo/detail_promo_delete.js", func: "delete", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
