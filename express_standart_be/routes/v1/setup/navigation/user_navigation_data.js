import "dotenv/config";

import express from "express";
import {
    status,
} from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
    const { body } = req;
    const oPayload = body;

    try {
        if (!oPayload || Object.keys(oPayload).length < 1) {
            return res.status(400).json({
                status: status.BAD_REQUEST,
                message: "Invalid request body",
                datetime: formatDateSystem(),
            });
        }

        const cValidation = await validatePayload({
            user_code: Joi.string().required().label("UniqueId"),
        }, {
            "string.base": "{#label} harus berupa string",
            "string.empty": "{#label} tidak boleh kosong",
            "any.required": "{#label} wajib diisi",
        }, oPayload);


        if (cValidation) {
            const oResult = {
                status: status.BAD_REQUEST,
                message: cValidation || "Terdapat kesalahan pada data anda",
                datetime: formatDateSystem(),
            }

            return res.status(422).json(oResult);
        }


        console.log("oPayload", oPayload)


        let oNavigation = await DB('user_navigation')
            .select('menu')
            .where('user_code', oPayload.user_code)
            .first();

        if (!oNavigation || !oNavigation?.menu) {
            oNavigation = await DB('user_navigation')
                .select('menu')
                .where('user_code', 'USR000000')
                .first();
        }

        if (!oNavigation || !oNavigation?.menu) {
            oNavigation = await DB('user_navigation')
                .select('menu')
                .whereNotNull('menu')
                .first();
        }

        if (!oNavigation || !oNavigation?.menu) {
            return res.status(400).json({
                status: status.GAGAL,
                message: "Data navigasi tidak ditemukan",
                datetime: formatDateSystem(),
            });
        }

        const vaData = JSON.parse(oNavigation.menu)

        return res.status(200).json({
            status: status.SUKSES,
            message: "Data ditemukan",
            datetime: formatDateSystem(),
            data: vaData
        })

    } catch (error) {
        const oResult = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        }

        Logging(error, {
            file: "user_navigation_data.js",
            func: "get",
            request: oPayload,
            response: oResult,
            user: req?.auth?.username || ""
        })

        return res.status(500).json(oResult);
    }
});

export default router;
