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
    const username = req?.auth?.username || "SYSTEM";
    const oPayload = { ...body };

    try {
        const cValidation = await validatePayload(
            {
                status: Joi.number().valid(1, 0).allow('', null).label("Status"),
                method_type: Joi.string()
                    .valid("MANUAL_TRANSFER", "PG_VA", "PG_QRIS", "PG_EWALLET", "PG_CREDIT_CARD", "PG_RETAIL")
                    .allow('', null)
                    .label("Tipe Pembayaran"),
                search: Joi.string().allow('', null).label("Global Search"),

                first: Joi.number().integer().min(0).allow(null).label("Offset First"),
                page: Joi.number().integer().min(0).allow(null).label("Page"),
                rows: Joi.number().integer().min(1).allow(null).label("Limit Rows"),
            },
            {
                "string.base": "{#label} harus berupa string",
                "string.empty": "{#label} tidak boleh kosong",
                "string.max": "{#label} tidak boleh lebih dari {#limit} karakter",
                "any.required": "{#label} wajib diisi",
                "number.base": "{#label} harus berupa angka",
                "number.integer": "{#label} harus berupa angka bulat",
            },
            oPayload,
            { allowUnknown: true }
        );

        if (cValidation) {
            const oResult = {
                status: status.BAD_REQUEST,
                message: cValidation || "Terdapat kesalahan pada parameter filter",
                datetime: formatDateSystem(),
            };

            return res.status(422).json(oResult);
        }

        let oQuery = DB('mst_payment_methods')
            .select(
                'id',
                'method_code',
                'method_type',
                'name',
                'description',
                'logo_url',
                'bank_name',
                'account_number',
                'account_name',
                'pg_provider',
                'pg_channel_code',
                'admin_fee_type',
                'admin_fee_value',
                'requires_unique_code',
                'status',
                'tz',
                'created_at',
                'updated_at'
            );

        if (oPayload.status !== undefined && oPayload.status !== null && oPayload.status !== "") {
            oQuery.where('status', oPayload.status);
        }

        if (oPayload.method_type) {
            oQuery.where('method_type', oPayload.method_type);
        }

        if (oPayload.search) {
            const searchKeyword = `%${oPayload.search}%`;
            oQuery.where(function () {
                this.where('method_code', 'like', searchKeyword)
                    .orWhere('name', 'like', searchKeyword)
                    .orWhere('description', 'like', searchKeyword)
                    .orWhere('bank_name', 'like', searchKeyword)
                    .orWhere('account_number', 'like', searchKeyword)
                    .orWhere('account_name', 'like', searchKeyword)
                    .orWhere('pg_provider', 'like', searchKeyword);
            });
        }

        const oCountQuery = oQuery.clone();

        const nTotalRecordObj = await oCountQuery.clearSelect().count('id as total').first();
        const nTotalDataCount = nTotalRecordObj ? Number(nTotalRecordObj.total) : 0;

        if (oPayload.rows !== undefined && oPayload.rows !== null) {
            oQuery.limit(Number(oPayload.rows));

            if (oPayload.first !== undefined && oPayload.first !== null) {
                oQuery.offset(Number(oPayload.first));
            }
        }

        const vaPaymentMethods = await oQuery.orderBy('created_at', 'desc');

        const vaResult = vaPaymentMethods.map((v) => {
            const logoAbsoluteUrl = v.logo_url
                ? `${process.env.ASSETS_PATH}/uploads/payment_logos/${v.logo_url}`
                : null;

            return {
                ...v,
                logo_url: logoAbsoluteUrl,
            };
        });

        return res.status(200).json({
            status: status.SUKSES,
            message: "Data metode pembayaran berhasil diambil.",
            data: vaResult,
            total_data: nTotalDataCount,
            datetime: formatDateSystem(),
        });

    } catch (error) {
        const oResultError = {
            status: status.GAGAL,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "/contoh/form_upload/form_upload_data.js",
            func: "data",
            request: req.body,
            response: oResultError,
            user: username,
        });

        return res.status(500).json(oResultError);
    }
});

export default router;