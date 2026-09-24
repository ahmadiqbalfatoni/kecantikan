import "dotenv/config";
import express from "express";
import { status } from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
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
        role: Joi.string().required().label("Role"),
        menu: Joi.any().required().label("Menu"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
      },
      oPayload
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada parameter input",
        datetime: formatDateSystem(),
      };
      return res.status(422).json(oResult);
    }

    const role = String(oPayload.role).toLowerCase();
    const targetRole = role;

    let menuStr = "";
    if (typeof oPayload.menu === "string") {
      menuStr = oPayload.menu;
    } else {
      menuStr = JSON.stringify(oPayload.menu);
    }

    // 1. Simpan template ke mst_navigation (role spesifik, tidak menimpa template 'master')
    if (targetRole !== "master") {
      const existingMst = await DB("mst_navigation").where("role", targetRole).first();
      if (existingMst) {
        await DB("mst_navigation")
          .where("id", existingMst.id)
          .update({
            menu: menuStr,
            updated_at: formatDateSystem(),
          });
      } else {
        await DB("mst_navigation").insert({
          role: targetRole,
          menu: menuStr,
          created_at: formatDateSystem(),
          updated_at: formatDateSystem(),
        });
      }
    }

    // 2. Sinkronkan navigasi ke seluruh pengguna yang memiliki role ini
    const usersInRole = await DB("user_credential")
      .select("user_code")
      .where("role", role);

    for (const u of usersInRole) {
      await DB("user_navigation")
        .insert({
          user_code: u.user_code,
          menu: menuStr,
          created_at: formatDateSystem(),
          updated_at: formatDateSystem(),
        })
        .onConflict("user_code")
        .merge({
          menu: menuStr,
          updated_at: formatDateSystem(),
        });
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: `Hak akses navigasi role '${role}' berhasil disimpan dan disinkronkan ke ${usersInRole.length} pengguna`,
      datetime: formatDateSystem(),
      data: {
        role: role,
        synced_users: usersInRole.length,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Terjadi kesalahan saat menyimpan pengaturan navigasi role",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "role_navigation_save.js",
      func: "save",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
