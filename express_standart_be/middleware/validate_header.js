/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File middleware untuk memeriksa header pada setiap request
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



import { jwtVerify } from "jose";
import {
  status,
} from "../routes/v1/components/tools/general.js";
import DB from "../core/config/knex.js";
import { Logging } from "../routes/v1/components/tools/servertool.js";
import { AsyncLocalStorage } from "async_hooks"
import { formatDateSystem } from "../routes/v1/components/tools/date_tools.js";

const als = new AsyncLocalStorage();


export const validateTimestamp = async (req, res, next) => {
  try {
    const timestamp = req.headers["x-timestamp"];
    if (process.env.APP_DEBUG && process.env.APP_DEBUG == 'true' && req.headers["x-uniqueid"]) {

      return next()
    }

    if (!timestamp) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Missing timetstamp header",
        datetime: formatDateSystem(),
      });
    }
    const inputDate = new Date(timestamp);

    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Invalid timestamp format. Use ISO 8601.",
        datetime: formatDateSystem(),

      });
    }

    const now = new Date();

    const diffMs = Math.abs(now - inputDate);

    const diffMinutes = diffMs / 1000 / 60;

    if (diffMinutes > 5) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Request timestamp expired",
        datetime: formatDateSystem(),
      });
    }

    next();
  } catch (error) {
    Logging(error)

    return res.status(401).json({
      status: status.BAD_REQUEST,
      message: "Unauthorized",
      datetime: formatDateSystem(),
    });
  }
};

export const getRequestContext = () => als.getStore();

export const contextMiddleware = (req, res, next) => {
  const store = {
    requestId: Date.now(),
    method: req.method,
    url: req.url,
    body: req.body,
    auth: req?.auth || null
  };

  als.run(store, () => {
    next();
  });
};

export const validateAccessToken = async (req, res, next) => {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];

  if (process.env.APP_DEBUG === 'true' && req.headers["x-uniqueid"]) {
    req.auth = { user_code: req.headers["x-uniqueid"], role: "DEV", username: "DEV" };
    return next();
  }

  if (!token || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      status: status.BAD_REQUEST,
      message: "Akses ditolak. Token tidak ditemukan.",
      datetime: formatDateSystem(),
    });
  }

  try {
    const secretKey = new TextEncoder().encode(process.env.USER_SECRET);
    const { payload } = await jwtVerify(token, secretKey);

    const headerCabang = req.headers["x-kode-cabang"];
    const isSuperAdmin = (payload.role || "").toLowerCase() === "superadmin";

    req.auth = {
      user_code: payload.user_code,
      username: payload.username,
      role: payload.role,
      kode_cabang: isSuperAdmin && headerCabang ? headerCabang : (payload.kode_cabang || null),
      nama_cabang: payload.nama_cabang || null,
      is_superadmin: isSuperAdmin,
    };
    req.user = req.auth;

    return next();
  } catch (error) {
    Logging(error, { func: "validateAccessToken", file: 'middleware/validate_header.js' });
    const errorMessage = error.message.includes('|') ? error.message.split('|')[1] : "Token tidak valid harap login ulang";
    const statusCode = error.message.includes('|') ? parseInt(error.message.split('|')[0]) : 500;

    const oResult = {
      status: status.BAD_REQUEST,
      message: errorMessage,
      datetime: formatDateSystem(),
    };

    return res.status(401).json(oResult);
  }
};