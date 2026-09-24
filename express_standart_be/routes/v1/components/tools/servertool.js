/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk helper server tools
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */


import { SignJWT } from "jose";
import axios from "axios";
import Joi from "joi";
import DB from '../../../../core/config/knex.js'
import { status, sanitizeString } from "./general.js";
import { formatDateSystem } from "./date_tools.js";
import crypto from 'crypto'

export const getSignature = async (req, payload, token, endpoint) => {
  try {
    const date = formatDateSystem(new Date(), "yyyy-MM-dd");

    const openSslSecret = `${process.env.USER_SECRET_BRICK}#${formatDateSystem(
      new Date(),
      "yyyyMMdd",
    )}#SecretKey`;

    const signature = `${date}#${payload}#${token}#${endpoint}`;

    const signatureOpenSsl = OpenSSLEncrypt(signature, openSslSecret);

    const signatureRSA = encryptChunkRSA(
      signatureOpenSsl,
      "../core/key/brick_public.pem",
    );

    return signatureRSA;
  } catch (error) {
    let ErrorResponse = "";

    if (error?.response?.data && typeof error?.response?.data == "object") {
      ErrorResponse = JSON.stringify(error.response.data);
    }

    await models.ErrorLog.create({
      Url: req.originalUrl,
      Method: req.method,
      Status: 500,
      Error: error.message,
      Stack: error.stack,
      ErrorResponse,
    });

    throw error;
  }
};

export const getToken = async (req) => {
  try {
    const dNow = new Date();
    const cUser = process.env.USER_KEY_BRICK;
    const cPass = process.env.USER_KEY_PAS_BRICK;
    const cSecret = process.env.USER_SECRET_BRICK;
    const dDate = formatDateSystem(dNow, "yyyyMMdd");

    const cHashedUser = hmac(
      `${cUser}#${dDate}#Key`,
      `${cSecret}#${dDate}#SecretKey`,
    );
    const cHashedPass = hmac(
      `${cPass}#${dDate}#PasKey`,
      `${cSecret}#${dDate}#SecretKey`,
    );

    const cEncryptedToken = Buffer.from(
      `${cHashedUser}:${cHashedPass}`,
    ).toString("base64");

    const headers = {
      "Content-Type": "application/json",
      "X-Timestamp": formatDateSystem(dNow),
      Authorization: "Basic " + cEncryptedToken,
    };

    return await axios.get(
      process.env.API_URL_BRICK + "/api/v1/intern/auth/token",
      { headers },
    );
  } catch (error) {
    let ErrorResponse = "";

    if (error?.response?.data && typeof error?.response?.data == "object") {
      ErrorResponse = JSON.stringify(error.response.data);
    }

    await models.ErrorLog.create({
      Url: req.originalUrl,
      Method: req.method,
      Status: 500,
      Error: error.message,
      Stack: error.stack,
      ErrorResponse,
    });

    throw error;
  }
};

export const encodePayload = async (req, json, endpoint, token) => {
  try {
    const signature = `${token}${endpoint}`;
    const jwtPayload = await new SignJWT(json)
      .setProtectedHeader({ alg: "HS512" })
      .sign(new TextEncoder().encode(signature));

    const payloadRSA = encryptChunkRSA(
      jwtPayload,
      "../core/key/brick_public.pem",
    );

    return payloadRSA;
  } catch (error) {
    let ErrorResponse = "";

    if (error?.response?.data && typeof error?.response?.data == "object") {
      ErrorResponse = JSON.stringify(error.response.data);
    }

    await models.ErrorLog.create({
      Url: req.originalUrl,
      Method: req.method,
      Status: 500,
      Error: error.message,
      Stack: error.stack,
      ErrorResponse,
    });

    throw error;
  }
};

export const Logging = async (
  error = null,
  { file = "", func = "", request = "", response = "", user = "" } = {},
) => {
  let fileName = file;
  let functionName = func;
  let stack = "";
  let message = response;

  console.log(error);

  if (error) {
    const stackLines = (error.stack || "").split("\n");
    const callerLine = stackLines[1] || "";

    const match =
      callerLine.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/) ||
      callerLine.match(/at\s+(.*?):(\d+):(\d+)/);

    if (match) {
      functionName = functionName || match[1] || "";
      fileName = fileName || match[2] || match[1];
    }

    stack = error.stack;
    message = response || error.message;
  }

  await DB("log").insert({
    Tgl: formatDateSystem(),
    Controller: fileName || "",
    Function: functionName || "",
    Request: request || "",
    Response: message || "",
    Stack: stack || "",
    User: user || "",
    DateTime: formatDateSystem(),
  });
};

export const validatePayload = async (
  oValidation,
  oMessage,
  oPayload,
  {
    uniqueField = [],
    table = "",
    excludedField = "",
    allowUnknown = false,
    branchCode = null,
  } = {},
) => {
  try {
    for (const k of Object.keys(oPayload)) {
      if (typeof oPayload[k] === "string") {
        const { dangerous } = sanitizeString(oPayload[k], { mode: "detect" });
        if (dangerous) {
          return `Field ${k} mengandung konten berbahaya`;
        }
      }
    }

    const oSchema = Joi.object(oValidation).messages(oMessage);
    await oSchema.validateAsync(oPayload, { abortEarly: true, allowUnknown });

    if (uniqueField.length > 0 && table) {
      const normalizedPayload = Object.fromEntries(
        Object.entries(oPayload).map(([k, v]) => [k.toLowerCase(), v]),
      );

      const resolvedBranch = branchCode || oPayload.kode_cabang || oPayload.kodeCabang || null;
      let hasCabangCol = false;
      if (resolvedBranch) {
        try {
          hasCabangCol = await DB.schema.hasColumn(table, "kode_cabang");
        } catch {
          hasCabangCol = false;
        }
      }

      for (const field of uniqueField) {
        const value = normalizedPayload[field.toLowerCase()];
        if (value !== undefined) {
          let query;
          if (typeof value === "number" || /^\d+$/.test(value)) {
            query = DB(table).where(field, value);
          } else {
            query = DB(table).whereILike(field, value);
          }

          if (hasCabangCol && resolvedBranch) {
            query = query.andWhere("kode_cabang", resolvedBranch);
          }

          if (excludedField) {
            query = query.andWhereNot(
              excludedField,
              normalizedPayload[excludedField.toLowerCase()],
            );
          }

          const exists = await query.first();
          if (exists) {
            return `Data dengan ${field} tersebut sudah digunakan`;
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.log(err);
    const rawMessage = err?.details?.[0]?.message || "Invalid payload";
    const cleanMessage = rawMessage.replace(/"/g, "");
    return cleanMessage;
  }
};

export const getDBConfig = async (kode = [], trx = DB) => {
  try {
    const vaData = await trx.table('config').whereIn('kode', kode);

    const configObject = vaData.reduce((acc, curr) => {
      acc[curr.kode] = curr.keterangan;
      return acc;
    }, {});

    if (kode.length > 1) {
      return configObject;
    } else {
      return vaData.length > 0 ? { [kode[0]]: vaData[0].keterangan } : {};
    }
  } catch (err) {
    return {};
  }
};

export const ChangesLog = async (
  {
    description,
    tableName,
    referenceCode,
    action,
    dataBefore = null,
    dataAfter = null,
    user,
    tz = "UTC",
  },
  transaction = null,
) => {
  const inputPayload = {
    description,
    tableName,
    referenceCode,
    action,
    dataBefore,
    dataAfter,
    user,
    tz,
  };

  try {
    console.log(description);

    const executeQuery = transaction || DB;

    const validActions = ["CREATE", "UPDATE", "DELETE", "RESTORE"];
    const normalizedAction = validActions.includes((action || "").toUpperCase())
      ? (action || "").toUpperCase()
      : "UPDATE";

    await executeQuery("log_perubahan").insert({
      keterangan: description || "",
      nama_tabel: tableName,
      kode_referensi: referenceCode,
      aksi: normalizedAction,
      data_sebelum: dataBefore ? JSON.stringify(dataBefore) : null,
      data_sesudah: dataAfter ? JSON.stringify(dataAfter) : null,
      tz: tz,
      created_by: user || "system",
      created_at: formatDateSystem(),
      created_at_eng: formatDateSystem(new Date(), "yyyy-MM-dd HH:mm:ss", tz),
    });
  } catch (err) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(err, {
      file: "components/tools/servertool.js",
      func: "create",
      request: inputPayload,
      response: oResult,
      user: user,
    });
  }
};

export const generateUserTokens = async (user, rememberMe = false) => {
  if (!user || !user.user_code || !user.role) {
    throw new Error("FATAL: Data user tidak lengkap untuk pembuatan token. Pastikan user_code dan role tersedia.");
  }

  const secretKey = new TextEncoder().encode(process.env.USER_SECRET || "random");

  const accessExpireTime = rememberMe ? "1d" : "7h";
  const refreshExpireInSeconds = rememberMe ? (7 * 24 * 60 * 60) : (24 * 60 * 60);

  const accessToken = await new SignJWT({
    user_code: user.user_code,
    username: user.username,
    role: user.role,
    kode_cabang: user.kode_cabang || null,
    nama_cabang: user.nama_cabang || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(accessExpireTime)
    .sign(secretKey);

  const refreshToken = crypto.randomBytes(40).toString('hex');

  const expiresAt = new Date(Date.now() + refreshExpireInSeconds * 1000);

  try {
    await DB("access_token")
      .where("user_code", user.user_code)
      .andWhere("expired", "0")
      .update({ expired: "1" });

    await DB("access_token").insert({
      user_code: user.user_code,
      token: refreshToken,
      expired: "0",
      expires_at: expiresAt
    });

  } catch (error) {
    throw new Error(`Gagal menyimpan token ke database: ${error.message}`);
  }


  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
};