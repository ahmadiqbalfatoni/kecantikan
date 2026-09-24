/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_create.js
 * @description Endpoint untuk membuat data antrian awal baru
 *
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-08-15
 *
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * - Antigravity (2026-08-20)
 *
 * @lastModified Antigravity (2026-08-20)
 * @version 1.1.0
 */

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

    const branchCode = oPayload.kode_cabang || req?.auth?.kode_cabang || "CBG-001";

    // ─── MODE BULK (TAMBAH CEPAT RANGE 01-50) ──────────────────────────────
    if (oPayload.mode === "bulk" || (oPayload.dari !== undefined && oPayload.sampai !== undefined)) {
      const dari = parseInt(oPayload.dari, 10);
      const sampai = parseInt(oPayload.sampai, 10);
      const statusParam = oPayload.status || "tersedia";

      if (isNaN(dari) || isNaN(sampai) || dari < 1 || sampai < dari) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Range nomor antrian dari dan sampai tidak valid (contoh: 1 sampai 50)",
          datetime: formatDateSystem(),
        });
      }

      if (sampai - dari > 500) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Maksimal pembuatan tambah cepat adalah 500 nomor antrian per batch",
          datetime: formatDateSystem(),
        });
      }

      const rawDariStr = String(oPayload.dari).trim();
      const padLen = rawDariStr.length > 1 && rawDariStr.startsWith("0") 
        ? rawDariStr.length 
        : (sampai >= 100 ? 3 : 2);

      let createdCount = 0;
      let skippedCount = 0;
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const prefixAntrian = `A-${todayStr}-`;

      await DB.transaction(async (trx) => {
        const lastRecord = await trx("trx_antrian_awal")
          .where("kode_antrian_awal", "like", `${prefixAntrian}%`)
          .where("kode_cabang", branchCode)
          .orderBy("id", "desc")
          .first();

        let nextSeq = 1;
        if (lastRecord && lastRecord.kode_antrian_awal) {
          const parts = lastRecord.kode_antrian_awal.split("-");
          const lastNum = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastNum)) {
            nextSeq = lastNum + 1;
          }
        }

        const existingRecords = await trx("trx_antrian_awal")
          .where("kode_cabang", branchCode)
          .select("nomor_antrian");
        const existingSet = new Set(existingRecords.map((r) => String(r.nomor_antrian).toLowerCase()));

        const vaInsertData = [];

        for (let i = dari; i <= sampai; i++) {
          const cNoAntrian = String(i).padStart(padLen, "0");

          if (existingSet.has(cNoAntrian.toLowerCase())) {
            skippedCount++;
            continue;
          }

          const seqPadded = String(nextSeq).padStart(3, "0");
          const cKodeAntrian = `${prefixAntrian}${seqPadded}`;
          nextSeq++;

          const oData = {
            kode_cabang: branchCode,
            kode_antrian_awal: cKodeAntrian,
            nomor_antrian: cNoAntrian,
            status: statusParam === "diambil" || statusParam === "selesai" ? "terpakai" : statusParam,
            diambil_at: statusParam === "diambil" || statusParam === "selesai" ? formatDateSystem() : null,
            dipanggil_at: statusParam === "dipanggil" || statusParam === "selesai" ? formatDateSystem() : null,
            tz: oPayload.tz || "UTC",
            created_by: username,
            created_at: formatDateSystem(),
            updated_by: username,
            updated_at: formatDateSystem(),
          };

          vaInsertData.push(oData);
          existingSet.add(cNoAntrian.toLowerCase());
          createdCount++;
        }

        if (vaInsertData.length > 0) {
          await trx("trx_antrian_awal").insert(vaInsertData);

          await ChangesLog(
            {
              description: `Tambah Cepat Nomor Antrian (${dari} - ${sampai}) total ${createdCount} data`,
              tableName: "trx_antrian_awal",
              referenceCode: `BULK-${dari}-${sampai}`,
              action: "CREATE",
              dataBefore: null,
              dataAfter: { total_created: createdCount, total_skipped: skippedCount },
              user: username,
              tz: oPayload.tz || "UTC",
            },
            trx
          );
        }
      });

      let message = `${createdCount} nomor antrian berhasil ditambahkan`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} nomor dilewati karena sudah ada)`;
      }

      return res.status(200).json({
        status: status.SUKSES,
        message: message,
        datetime: formatDateSystem(),
        data: { created: createdCount, skipped: skippedCount },
      });
    }

    // ─── MODE SINGLE ────────────────────────────────────────────────────────
    const cValidation = await validatePayload(
      {
        no_antrian: Joi.string().max(10).required().label("Nomor Antrian"),
        status: Joi.string()
          .valid("tersedia", "diambil", "dipanggil", "selesai", "nonaktif")
          .optional()
          .label("Status"),
      },
      {
        "string.base": "{#label} harus berupa teks",
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} tidak boleh lebih dari {#limit} karakter",
        "any.only": "{#label} tidak valid",
        "any.required": "{#label} wajib diisi",
      },
      oPayload,
      {
        allowUnknown: true,
      }
    );

    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      });
    }

    let cKodeAntrian = "";
    let cNoAntrian = "";

    await DB.transaction(async (trx) => {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const prefixAntrian = `A-${todayStr}-`;

      const lastRecord = await trx("trx_antrian_awal")
        .where("kode_antrian_awal", "like", `${prefixAntrian}%`)
        .where("kode_cabang", branchCode)
        .orderBy("id", "desc")
        .first();

      let nextSeq = 1;
      if (lastRecord && lastRecord.kode_antrian_awal) {
        const parts = lastRecord.kode_antrian_awal.split("-");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          nextSeq = lastNum + 1;
        }
      }

      const seqPadded = String(nextSeq).padStart(3, "0");
      cKodeAntrian = `${prefixAntrian}${seqPadded}`;
      cNoAntrian = oPayload.no_antrian || seqPadded;

      const existingNo = await trx("trx_antrian_awal")
        .where("nomor_antrian", cNoAntrian)
        .where("kode_cabang", branchCode)
        .first();

      if (existingNo) {
        const error = new Error(`Nomor antrian ${cNoAntrian} sudah digunakan / sudah ada di cabang ini.`);
        error.statusCode = 422;
        throw error;
      }

      const oData = {
        kode_cabang: branchCode,
        kode_antrian_awal: cKodeAntrian,
        nomor_antrian: cNoAntrian,
        status: oPayload.status === "diambil" || oPayload.status === "selesai" ? "terpakai" : (oPayload.status || "tersedia"),
        diambil_at: oPayload.status === "diambil" || oPayload.status === "selesai" ? formatDateSystem() : null,
        dipanggil_at: oPayload.status === "dipanggil" || oPayload.status === "selesai" ? formatDateSystem() : null,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      };

      await trx("trx_antrian_awal").insert(oData);

      await ChangesLog(
        {
          description: "Tambah Nomor Antrian Awal",
          tableName: "trx_antrian_awal",
          referenceCode: cKodeAntrian,
          action: "CREATE",
          dataBefore: null,
          dataAfter: oData,
          user: username,
          tz: oPayload.tz || "UTC",
        },
        trx
      );
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Nomor antrian berhasil ditambahkan",
      datetime: formatDateSystem(),
      data: {
        kode_antrian: cKodeAntrian,
        no_antrian: cNoAntrian,
      },
    });
  } catch (error) {
    if (error.statusCode === 422) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: error.message,
        datetime: formatDateSystem(),
      });
    }

    const oResult = {
      status: status.BAD_REQUEST,
      message: error.message || "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/antrian_awal/antrian_awal_create.js",
      func: "create",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
