import express from "express";
import Joi from "joi";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

const upload = multer({
    dest: "temp/",
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
});

const mimeToExt = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg"
};

router.post("/", upload.any(), async (req, res) => {
    const oPayload = req.body;
    const files = req.files || [];
    const username = req?.auth?.username || "";

    try {
        const cValidation = await validatePayload(
            {
                kode: Joi.string().required().label("Kode"),
                keterangan: Joi.string().required().label("Keterangan"),
            },
            {
                "any.required": "{#label} wajib diisi",
                "array.base": "{#label} harus berupa array",
                "string.base": "{#label} harus berupa string",
                "string.empty": "{#label} tidak boleh kosong",
            },
            oPayload
        );

        if (cValidation) {
            const oResult = {
                status: status.GAGAL,
                message: cValidation,
                datetime: formatDateSystem(),
            };

            Logging(null, {
                file: "info_perusahaan_create.js",
                func: "create",
                request: oPayload,
                response: oResult,
                user: username,
            });

            // Bersihkan file temp jika ada kegagalan validasi
            if (files.length > 0) {
                for (const file of files) {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
            }

            return res.status(422).json(oResult);
        }

        let { kode, keterangan } = oPayload;

        kode = JSON.parse(kode);
        keterangan = JSON.parse(keterangan);

        if (kode.length !== keterangan.length) {
            const oResult = {
                status: status.BAD_REQUEST,
                message: "Jumlah data kode dan keterangan tidak sama.",
                datetime: formatDateSystem(),
            };

            Logging(null, {
                file: "info_perusahaan_create.js",
                func: "create",
                request: oPayload,
                response: oResult,
                user: username,
            });

            // Bersihkan file temp jika ada kegagalan validasi
            if (files.length > 0) {
                for (const file of files) {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
            }

            return res.status(422).json(oResult);
        }

        // Ambil data logo perusahaan lama
        const oldData = await DB("config")
            .select("Kode", "Keterangan", "kode", "keterangan")
            .where("kode", "msLogoPerusahaan")
            .orWhere("Kode", "msLogoPerusahaan")
            .first();

        const oldKeterangan = oldData ? (oldData.keterangan ?? oldData.Keterangan) : "";

        let filename = oldKeterangan || "";
        const file = files[0];

        if (file) {
            const userRole = (req?.auth?.role || "").toLowerCase();
            const isSuperAdmin = userRole === "superadmin";

            if (!isSuperAdmin) {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                return res.status(403).json({
                    status: status.GAGAL,
                    message: "Akses ditolak: Hanya Superadmin (Kantor Pusat) yang dapat mengubah logo klinik.",
                    datetime: formatDateSystem(),
                });
            }

            const uploadDir = path.join(process.cwd(), "public", "uploads", "config", "logo_perusahaan");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const ext = path.extname(file.originalname) || mimeToExt[file.mimetype] || "";
            filename = `logo_perusahaan${ext}`;
            const filepath = path.join(uploadDir, filename);

            // Hapus file lama jika ada
            if (oldKeterangan) {
                const oldPath = path.join(uploadDir, oldKeterangan);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            fs.renameSync(file.path, filepath);
        }

        // Tambahkan konfigurasi logo ke dalam antrean penyimpanan data
        kode.push("msLogoPerusahaan");
        keterangan.push(filename);

        // Eksekusi penyimpanan data dengan transaksi database
        await DB.transaction(async (trx) => {
            for (let i = 0; i < kode.length; i++) {
                const cKode = kode[i];
                const cKeterangan = keterangan[i] ?? null;

                const existing = await trx("config")
                    .select("kode", "keterangan", "Kode", "Keterangan")
                    .where("kode", cKode)
                    .orWhere("Kode", cKode)
                    .first();

                const currentKode = existing ? (existing.kode ?? existing.Kode) : cKode;
                const currentKeterangan = existing ? (existing.keterangan ?? existing.Keterangan) : null;

                if (existing) {
                    // Update hanya dilakukan bila ada perbedaan keterangan data
                    if (currentKeterangan !== cKeterangan) {
                        const oDataBefore = { kode: currentKode, keterangan: currentKeterangan };
                        const oDataAfter = { kode: currentKode, keterangan: cKeterangan };

                        await trx("config")
                            .where("kode", currentKode)
                            .orWhere("Kode", currentKode)
                            .update({
                                keterangan: cKeterangan,
                            });

                        await ChangesLog(
                            {
                                description: `Update Config ${currentKode}`,
                                tableName: "config",
                                referenceCode: currentKode,
                                action: "UPDATE",
                                dataBefore: oDataBefore,
                                dataAfter: oDataAfter,
                                user: username,
                                tz: oPayload.tz || "UTC",
                            },
                            trx
                        );
                    }
                } else {
                    const oDataAfter = { kode: cKode, keterangan: cKeterangan };

                    await trx("config").insert({
                        kode: cKode,
                        keterangan: cKeterangan,
                    });

                    await ChangesLog(
                        {
                            description: `Tambah Config ${cKode}`,
                            tableName: "config",
                            referenceCode: cKode,
                            action: "CREATE",
                            dataBefore: null,
                            dataAfter: oDataAfter,
                            user: username,
                            tz: oPayload.tz || "UTC",
                        },
                        trx
                    );
                }
            }
        });

        const oResult = {
            status: status.SUKSES,
            message: "Berhasil Menambahkan Data",
            datetime: formatDateSystem(),
        };

        return res.status(200).json(oResult);

    } catch (error) {
        const oResult = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "info_perusahaan_create.js",
            func: "create",
            request: oPayload,
            response: oResult,
            user: username,
        });

        // Hapus file sisa di folder temp bila terjadi error sistem
        if (files.length > 0) {
            for (const file of files) {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            }
        }

        return res.status(500).json(oResult);
    }
});

export default router;