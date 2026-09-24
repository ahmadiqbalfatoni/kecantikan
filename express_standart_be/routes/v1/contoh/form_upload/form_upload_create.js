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

    // Explicit Type Casting dari Form-Data ke Number
    let cFullPathLogo = null;
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
        if (!oPayload || Object.keys(oPayload).length < 1) {
            return res.status(400).json({
                status: status.BAD_REQUEST,
                message: "Payload tidak boleh kosong",
                datetime: formatDateSystem(),
            });
        }

        const validationRules = {
            method_code: Joi.string()
                .max(50)
                .regex(/^[a-zA-Z0-9_-]+$/)
                .required()
                .label("Kode Metode"),
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
            status: Joi.number().valid(1, 0).default(1).label("Status"),
            tz: Joi.string().required().label("Timezone"),
        };

        const validationMessages = {
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.max": "{#label} maksimal memiliki {#limit} karakter",
            "number.base": "{#label} harus berupa angka numerik",
            "number.min": "{#label} minimal bernilai {#limit}",
            "number.max": "{#label} maksimal bernilai {#limit}",
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} nilainya tidak valid",
            "any.unknown": "{#label} tidak boleh diisi jika menggunakan tipe pembayaran ini",
            "string.pattern.base": "{#label} hanya boleh berisi huruf, angka, underscore (_), atau dash (-)"
        };

        const cValidation = await validatePayload(
            validationRules,
            validationMessages,
            oPayload,
            {
                uniqueField: ["method_code"],
                table: "mst_payment_methods",
                allowUnknown: true,
            }
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

        const oLogo = files?.find((f) => f.fieldname === "logo");
        let cFileNameLogo = null;

        if (oLogo) {
            const allowedExt = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
            const ext = path.extname(oLogo.originalname).toLowerCase();

            if (!allowedExt.includes(ext)) {
                files?.forEach((f) => {
                    if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
                });
                return res.status(400).json({
                    status: status.BAD_REQUEST,
                    message: "Format file gambar logo tidak didukung (Gunakan PNG, JPG, atau SVG)",
                    datetime: formatDateSystem(),
                });
            }

            const uploadDir = path.join(process.cwd(), "public", "uploads", "payment_logos");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filename = `logo_${oPayload.method_code}_${Date.now()}${ext}`;
            cFullPathLogo = path.join(uploadDir, filename);
            fs.renameSync(oLogo.path, cFullPathLogo);

            cFileNameLogo = `${filename}`;
        }

        files?.forEach((f) => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });

        const bIsManual = oPayload.method_type === "MANUAL_TRANSFER";

        await DB.transaction(async (trx) => {
            const oInsertData = {
                method_code: oPayload.method_code,
                method_type: oPayload.method_type,
                name: oPayload.name,
                description: oPayload.description || null,
                logo_url: cFileNameLogo || null,

                bank_name: bIsManual ? oPayload.bank_name : null,
                account_number: bIsManual ? oPayload.account_number : null,
                account_name: bIsManual ? oPayload.account_name : null,

                pg_provider: !bIsManual ? oPayload.pg_provider : null,
                pg_channel_code: !bIsManual ? oPayload.pg_channel_code : null,

                admin_fee_type: oPayload.admin_fee_type,
                admin_fee_value: Number(oPayload.admin_fee_value),
                requires_unique_code: bIsManual ? (oPayload.requires_unique_code || 0) : 0,
                status: oPayload.status !== undefined ? oPayload.status : 1,
                tz: oPayload.tz,
                created_at: formatDateSystem(),
                updated_at: formatDateSystem(),
            };

            await trx("mst_payment_methods").insert(oInsertData);
        });

        const oResultSuccess = {
            status: status.SUKSES,
            message: "Metode pembayaran baru berhasil disimpan",
            datetime: formatDateSystem(),
        };

        return res.status(200).json(oResultSuccess);

    } catch (error) {
        files?.forEach((f) => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });

        // Hapus file fisik baru jika penyimpanan database transaksional gagal
        if (cFullPathLogo && fs.existsSync(cFullPathLogo)) {
            fs.unlinkSync(cFullPathLogo);
        }

        const oResultError = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "/contoh/form_upload/form_upload_create.js",
            func: "create",
            request: body,
            response: oResultError,
            user: username,
        });

        return res.status(500).json(oResultError);
    }
});

export default router;