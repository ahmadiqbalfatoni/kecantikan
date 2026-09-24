import express from "express";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { status } from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

const upload = multer({
    dest: "temp/",
    limits: { fileSize: 2 * 1024 * 1024 }, // Maksimal 2MB
});

router.post("/", upload.any(), async (req, res) => {
    const { body, auth, files } = req;
    const username = auth?.username || "SYSTEM";
    const oPayload = { ...body };

    let cFullPathNewLogo = null;
    // Explicit Type Casting dari Form-Data ke Number
    if (oPayload.status !== undefined) {
        oPayload.status = Number(oPayload.status);
    }
    if (oPayload.admin_fee_value !== undefined) {
        oPayload.admin_fee_value = Number(oPayload.admin_fee_value);
    }
    if (oPayload.requires_unique_code !== undefined) {
        oPayload.requires_unique_code = Number(oPayload.requires_unique_code);
    }

    try {
        if (!oPayload || !oPayload.method_code) {
            return res.status(400).json({
                status: status.BAD_REQUEST,
                message: "Kode Metode (method_code) wajib disertakan untuk melakukan pembaruan data",
                datetime: formatDateSystem(),
            });
        }

        const validationRules = {
            method_code: Joi.string().max(50).required().label("Kode Metode"),
            method_type: Joi.string()
                .valid("MANUAL_TRANSFER", "PG_VA", "PG_QRIS", "PG_EWALLET", "PG_CREDIT_CARD", "PG_RETAIL")
                .required()
                .label("Tipe Metode"),
            name: Joi.string().max(100).required().label("Nama Metode Pembayaran"),
            description: Joi.string().allow(null, "").label("Deskripsi / Panduan"),

            // Validasi manual transfer
            bank_name: Joi.string()
                .max(50)
                .allow(null, "")
                .when("method_type", {
                    is: "MANUAL_TRANSFER",
                    then: Joi.required(),
                    otherwise: Joi.forbidden()
                })
                .label("Nama Bank"),
            account_number: Joi.string()
                .max(50)
                .allow(null, "")
                .when("method_type", {
                    is: "MANUAL_TRANSFER",
                    then: Joi.required(),
                    otherwise: Joi.forbidden()
                })
                .label("Nomor Rekening"),
            account_name: Joi.string()
                .max(150)
                .allow(null, "")
                .when("method_type", {
                    is: "MANUAL_TRANSFER",
                    then: Joi.required(),
                    otherwise: Joi.forbidden()
                })
                .label("Nama Pemilik Rekening"),

            // Validasi otomatis untuk semua tipe PG
            pg_provider: Joi.string()
                .max(50)
                .allow(null, "")
                .when("method_type", {
                    not: "MANUAL_TRANSFER",
                    then: Joi.required(),
                    otherwise: Joi.forbidden()
                })
                .label("Provider Payment Gateway"),
            pg_channel_code: Joi.string()
                .max(50)
                .allow(null, "")
                .when("method_type", {
                    not: "MANUAL_TRANSFER",
                    then: Joi.required(),
                    otherwise: Joi.forbidden()
                })
                .label("PG Channel Code"),

            admin_fee_type: Joi.string()
                .valid("FIXED", "PERCENTAGE")
                .required()
                .label("Tipe Biaya Admin"),
            admin_fee_value: Joi.number()
                .min(0)
                .required()
                .when("admin_fee_type", {
                    is: "PERCENTAGE",
                    then: Joi.number().max(100),
                })
                .label("Nilai Biaya Admin"),

            requires_unique_code: Joi.number().valid(1, 0).default(0).label("Butuh Kode Unik"),
            status: Joi.number().valid(1, 0).required().label("Status"),
            tz: Joi.string().required().label("Timezone"),
        };

        const validationMessages = {
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.max": "{#label} maksimal memiliki {#limit} karakter",
            "number.base": "{#label} harus berupa angka",
            "number.min": "{#label} minimal bernilai {#limit}",
            "number.max": "{#label} maksimal bernilai {#limit}",
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} nilainya tidak valid",
            "any.unknown": "{#label} tidak boleh diisi jika menggunakan tipe pembayaran ini"
        };

        const cValidation = await validatePayload(
            validationRules,
            validationMessages,
            oPayload,
            { allowUnknown: true }
        );

        if (cValidation) {
            files?.forEach((f) => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });

            const oResult = {
                status: status.BAD_REQUEST,
                message: cValidation || "Terdapat kesalahan pengisian data",
                datetime: formatDateSystem(),
            };

            return res.status(422).json(oResult);
        }

        const oExistingMethod = await DB("mst_payment_methods")
            .where("method_code", oPayload.method_code)
            .first();

        if (!oExistingMethod) {
            files?.forEach((f) => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            return res.status(404).json({
                status: status.BAD_REQUEST,
                message: `Metode pembayaran dengan kode '${oPayload.method_code}' tidak ditemukan`,
                datetime: formatDateSystem(),
            });
        }

        const oLogo = files?.find((f) => f.fieldname === "logo");
        let cFilename = oExistingMethod.logo_url;
        let cFullPathOldLogo = null;

        if (oLogo) {
            const allowedExt = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
            const ext = path.extname(oLogo.originalname).toLowerCase();

            if (!allowedExt.includes(ext)) {
                files?.forEach((f) => {
                    if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
                });
                return res.status(400).json({
                    status: status.BAD_REQUEST,
                    message: "Format file logo tidak didukung (Gunakan PNG, JPG, atau SVG)",
                    datetime: formatDateSystem(),
                });
            }

            const uploadDir = path.join(process.cwd(), "public", "uploads", "payment_logos");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            if (oExistingMethod.logo_url) {
                cFullPathOldLogo = path.join(uploadDir, oExistingMethod.logo_url);
            }

            cFilename = `logo_${oPayload.method_code}_${Date.now()}${ext}`;
            cFullPathNewLogo = path.join(uploadDir, cFilename);
            fs.renameSync(oLogo.path, cFullPathNewLogo);
        }

        files?.forEach((f) => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });

        const isManual = oPayload.method_type === "MANUAL_TRANSFER";

        await DB.transaction(async (trx) => {
            await trx("mst_payment_methods")
                .where("method_code", oPayload.method_code)
                .update({
                    method_type: oPayload.method_type,
                    name: oPayload.name,
                    description: oPayload.description || null,
                    logo_url: cFilename || null,

                    bank_name: isManual ? oPayload.bank_name : null,
                    account_number: isManual ? oPayload.account_number : null,
                    account_name: isManual ? oPayload.account_name : null,

                    pg_provider: !isManual ? oPayload.pg_provider : null,
                    pg_channel_code: !isManual ? oPayload.pg_channel_code : null,

                    admin_fee_type: oPayload.admin_fee_type,
                    admin_fee_value: Number(oPayload.admin_fee_value),
                    requires_unique_code: isManual ? (oPayload.requires_unique_code || 0) : 0,
                    status: oPayload.status,
                    tz: oPayload.tz,
                    updated_at: formatDateSystem(),
                });
        });

        // Hapus file logo lama setelah database berhasil di-update tanpa error
        if (oLogo && cFullPathOldLogo && fs.existsSync(cFullPathOldLogo)) {
            fs.unlinkSync(cFullPathOldLogo);
        }

        const oResultSuccess = {
            status: status.SUKSES,
            message: "Konfigurasi metode pembayaran berhasil diperbarui",
            datetime: formatDateSystem(),
        };

        return res.status(200).json(oResultSuccess);

    } catch (error) {
        files?.forEach((f) => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });

        // Rollback fisik berkas logo baru jika SQL update gagal
        if (cFullPathNewLogo && fs.existsSync(cFullPathNewLogo)) {
            fs.unlinkSync(cFullPathNewLogo);
        }

        const oResultError = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "/contoh/form_upload/form_upload_update.js",
            func: "update",
            request: body,
            response: oResultError,
            user: username,
        });

        return res.status(500).json(oResultError);
    }
});

export default router;