import express from "express";
import DB from "../../../../core/config/knex.js";
import { datetime, formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import Joi from "joi";
import { status } from "../../components/tools/general.js";

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
            },
            {
                "string.base": "{#label} harus berupa string",
                "string.empty": "{#label} tidak boleh kosong",
                "any.required": "{#label} wajib diisi",
            },
            oPayload, {
        });


        if (cValidation) {
            const oResult = {
                status: status.BAD_REQUEST,
                message: cValidation || "Terdapat kesalahan pada data anda",
                datetime: formatDateSystem(),
            };

            Logging(null, {
                file: "mst_navigation_data.js",
                func: "get",
                request: oPayload,
                response: oResult,
                user: username,
            });

            return res.status(422).json(oResult);
        }


        const role = String(oPayload?.role || 'master').toLowerCase();

        const masterRecord = await DB("mst_navigation").where('role', 'master').first();
        const roleRecord = role !== 'master' ? await DB("mst_navigation").where('role', role).first() : null;

        const masterMenu = masterRecord?.menu ? JSON.parse(masterRecord.menu) : [];
        const roleMenu = roleRecord?.menu ? JSON.parse(roleRecord.menu) : masterMenu;

        return res.status(200).json({
            status: status.SUKSES,
            message: "Data ditemukan",
            datetime: formatDateSystem(),
            data: roleMenu,
            master_menu: masterMenu,
            is_custom: Boolean(roleRecord)
        });
    } catch (error) {
        const oResult = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "mst_navigation_data.js",
            func: "get",
            request: oPayload,
            response: oResult,
            user: username,
        });

        return res.status(500).json(oResult);
    }
});

export default router;
