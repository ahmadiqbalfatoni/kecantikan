import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import path from "path";
import fs from "fs";

const router = express.Router();

router.post("/", async (req, res) => {
    const { body } = req;
    const oPayload = body;
    const username = req?.auth?.username || "SYSTEM";

    try {
        if (!oPayload || Object.keys(oPayload).length < 1) {
            return res.status(400).json({
                status: status.BAD_REQUEST,
                message: "Payload tidak boleh kosong",
                datetime: formatDateSystem(),
            });
        }

        const cValidation = await validatePayload(
            {
                method_code: Joi.array()
                    .items(Joi.string().required())
                    .min(1)
                    .required()
                    .label("Kode Metode Pembayaran"),
            },
            {
                "array.base": "{#label} harus berupa daftar data (array)",
                "array.min": "{#label} minimal harus berisi 1 kode metode",
                "string.base": "Item di dalam {#label} harus berupa teks (string)",
                "string.empty": "Item di dalam {#label} tidak boleh kosong",
                "any.required": "{#label} wajib diisi",
            },
            oPayload
        );

        if (cValidation) {
            const oResult = {
                status: status.BAD_REQUEST,
                message: cValidation || "Terdapat kesalahan pada format parameter penghapusan",
                datetime: formatDateSystem(),
            };

            return res.status(422).json(oResult);
        }

        const vaTargetPaymentMethods = await DB("mst_payment_methods")
            .select("method_code", "logo_url")
            .whereIn("method_code", oPayload.method_code);

        if (vaTargetPaymentMethods.length === 0) {
            return res.status(404).json({
                status: status.NOT_FOUND,
                message: "Metode pembayaran dengan kode tersebut tidak ditemukan",
                datetime: formatDateSystem(),
            });
        }

        const oDeletedCount = await DB("mst_payment_methods")
            .whereIn('method_code', oPayload.method_code)
            .del();

        if (oDeletedCount > 0) {
            vaTargetPaymentMethods.forEach((method) => {
                if (method.logo_url) {
                    const uploadDir = path.join(process.cwd(), "public", "uploads", "payment_logos");

                    const cOldFilePath = path.join(uploadDir, method.logo_url);
                    if (fs.existsSync(cOldFilePath)) {
                        fs.unlinkSync(cOldFilePath);
                    }
                }
            });
        }

        const oResultSuccess = {
            status: status.SUKSES,
            message: `${oDeletedCount} metode pembayaran berhasil dihapus dari sistem`,
            datetime: formatDateSystem(),
        };

        return res.status(200).json(oResultSuccess);

    } catch (error) {
        const oResultError = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang mengalami pemeliharaan, mohon coba beberapa saat lagi",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "/contoh/form_upload/form_upload_delete.js",
            func: "delete",
            request: oPayload,
            response: oResultError,
            user: username,
        });

        return res.status(500).json(oResultError);
    }
});

export default router;