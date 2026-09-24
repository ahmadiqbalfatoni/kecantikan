import express from "express";
import Joi from "joi";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
const router = express.Router();

router.post("/", async (req, res) => {
    const oPayload = req.body;
    const username = req?.auth?.username || "";

    try {
        const cValidation = await validatePayload(
            {
                kode: Joi.array().items(Joi.string().required()).required().label("Kode"),
            },
            {
                "array.base": "{#label} harus berupa array",
                "any.required": "{#label} wajib diisi",
            },
            oPayload
        );

        if (cValidation) {
            const oResult = {
                status: status.GAGAL,
                message: cValidation,
                datetime: formatDateSystem(),
            };

            return res.status(422).json(oResult);
        }
        const vaData = await DB("config")
            .whereIn("kode", oPayload.kode)
            .select("kode", "keterangan");

        const oFormatted = {};
        // Initialize all requested keys with fallback ""
        oPayload.kode.forEach((k) => {
            oFormatted[k] = "";
        });

        if (vaData && vaData.length > 0) {
            vaData.forEach((row) => {
                oFormatted[row.kode] = row.keterangan || "";

                if (row.kode == "msLogoPerusahaan" && row.keterangan) {
                    oFormatted['msLogoPerusahaan'] = `${process.env.ASSETS_PATH}/uploads/config/logo_perusahaan/${row.keterangan}`
                }
            });
        }

        const oResult = {
            status: status.SUKSES,
            message: "Berhasil Mendapatkan Data",
            datetime: formatDateSystem(),
            data: oFormatted,
        };

        return res.status(200).json(oResult);

    } catch (error) {
        console.log(error)
        const oResult = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),

        };
        Logging(error, {
            file: "info_perusahaan_data.js",
            func: "data",
            request: oPayload,
            response: oResult,
            user: username,
        });

        return res.status(500).json(oResult);
    }
});

export default router;
