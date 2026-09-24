/**
 * @file cabang_create.js
 * @description Endpoint untuk menambah cabang baru
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { status } from "../../components/tools/general.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import Joi from "joi";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = { ...req.body };
  const username = req?.auth?.username || "SUPERADMIN";

  try {
    const cValidation = await validatePayload(
      {
        nama_cabang: Joi.string().max(150).required().label("Nama Cabang"),
        alamat: Joi.string().allow("", null).label("Alamat"),
        no_telp: Joi.string().allow("", null).label("No Telepon"),
        email: Joi.string().email().allow("", null).label("Email"),
        pj_manager: Joi.string().allow("", null).label("Penanggung Jawab / Manager"),
        status: Joi.string().valid("aktif", "tidak aktif").default("aktif").label("Status"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
      },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: formatDateSystem(),
      });
    }

    // Generate kode_cabang otomatis: CBG-001, CBG-002, dst.
    const lastBranch = await DB("mst_cabang")
      .where("kode_cabang", "like", "CBG-%")
      .orderBy("id", "desc")
      .first();

    let nextNum = 1;
    if (lastBranch && lastBranch.kode_cabang) {
      const num = parseInt(lastBranch.kode_cabang.replace("CBG-", ""), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const kodeCabang = `CBG-${String(nextNum).padStart(3, "0")}`;

    const newBranch = {
      kode_cabang: kodeCabang,
      nama_cabang: oPayload.nama_cabang.trim(),
      alamat: oPayload.alamat ? oPayload.alamat.trim() : "",
      no_telp: oPayload.no_telp ? oPayload.no_telp.trim() : "",
      email: oPayload.email ? oPayload.email.trim() : "",
      pj_manager: oPayload.pj_manager ? oPayload.pj_manager.trim() : "",
      status: oPayload.status || "aktif",
      created_by: username,
      created_at: formatDateSystem(),
      updated_at: formatDateSystem(),
    };

    const [id] = await DB("mst_cabang").insert(newBranch);

    return res.status(200).json({
      status: status.SUKSES,
      message: `Cabang ${newBranch.nama_cabang} (${kodeCabang}) berhasil ditambahkan.`,
      data: {
        id,
        ...newBranch,
      },
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, {
      file: "/master/cabang/cabang_create.js",
      func: "create",
      request: oPayload,
      user: username,
    });
    return res.status(500).json({
      status: status.GAGAL,
      message: "Gagal menambahkan cabang baru",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
