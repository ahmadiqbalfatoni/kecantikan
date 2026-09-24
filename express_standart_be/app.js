/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk menggabungkan semua routing setup dan middleware
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


import cors from "cors";
import express from "express";

import APIV1 from "./routes/v1/index.js";

import { formatDateSystem } from "./routes/v1/components/tools/date_tools.js";
import { validateTimestamp } from "./middleware/validate_header.js";
import { useragentMiddleware } from "./middleware/allow_user_agent.js";
import secureHeader from "./middleware/secure_header.js";
import Logger from "./middleware/logger.js";

const app = express();

const allowedOrigins = (process.env.ORIGIN || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((o) => Boolean(o) && !o.includes("<") && !o.includes(">"));

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.includes(".railway.app") ||
        origin.includes(".railway.internal") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Timestamp",
      "X-Signature",
      "X-Credential",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    optionSuccessStatus: 200,
  })
);

// app.use(logger("dev"));
app.use(Logger);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

import { checkAndInitDatabase } from "./core/init_db.js";

// Healthcheck / Root endpoint
app.get("/", (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "Klinik Kecantikan Backend API is running",
    datetime: formatDateSystem(),
  });
});

app.get("/health", (req, res) => {
  return res.status(200).send("OK");
});

import mysql from "mysql2/promise";

app.get("/db-test", async (req, res) => {
  const host = process.env.MYSQLHOST || "mysql.railway.internal";
  const port = Number(process.env.MYSQLPORT || 3306);
  const database = process.env.MYSQLDATABASE || "railway";

  let urlPass = '';
  let urlUser = '';
  if (process.env.DATABASE_URL) {
    try {
      const p = new URL(process.env.DATABASE_URL);
      urlPass = decodeURIComponent(p.password);
      urlUser = decodeURIComponent(p.username);
    } catch (e) {}
  }

  const passwords = [
    "lxbghIiorDJGDdwrbXXioKBtMyxtw1VY",
    urlPass,
    process.env.MYSQL_ROOT_PASSWORD,
    process.env.MYSQLPASSWORD,
    process.env.DB_PASSWORD,
  ].filter(Boolean);

  const users = [
    urlUser,
    process.env.MYSQLUSER,
    "root",
    "railway",
  ].filter(Boolean);

  const attempts = [];
  let successConfig = null;

  for (const u of [...new Set(users)]) {
    for (const p of [...new Set(passwords)]) {
      try {
        const conn = await mysql.createConnection({
          host,
          port,
          user: u,
          password: p,
          database,
          connectTimeout: 5000,
        });
        await conn.query("SELECT 1");
        await conn.end();
        successConfig = { user: u, passPreview: p.slice(0, 3) + '...', host, database };
        attempts.push({ user: u, passPreview: p.slice(0, 3) + '...', status: "SUCCESS" });
        break;
      } catch (err) {
        attempts.push({ user: u, passPreview: p.slice(0, 3) + '...', error: err.message });
      }
    }
    if (successConfig) break;
  }

  return res.json({
    status: successConfig ? "connected" : "failed",
    successConfig,
    attempts,
    envKeysPresent: {
      hasDATABASE_URL: Boolean(process.env.DATABASE_URL),
      hasMYSQLHOST: Boolean(process.env.MYSQLHOST),
      hasMYSQLUSER: Boolean(process.env.MYSQLUSER),
      hasMYSQLPASSWORD: Boolean(process.env.MYSQLPASSWORD),
      hasMYSQL_ROOT_PASSWORD: Boolean(process.env.MYSQL_ROOT_PASSWORD),
      hasMYSQLDATABASE: Boolean(process.env.MYSQLDATABASE),
    }
  });
});

app.get("/init-db", async (req, res) => {
  const force = req.query.force === "true";
  const result = await checkAndInitDatabase(force);
  return res.status(result.status === "error" ? 500 : 200).json(result);
});

app.get("/api/v1/init-db", async (req, res) => {
  const force = req.query.force === "true";
  const result = await checkAndInitDatabase(force);
  return res.status(result.status === "error" ? 500 : 200).json(result);
});

// useragentMiddleware,
// Middleware global untuk semua api
app.use(
  "/api/v1",
  [secureHeader, validateTimestamp],
  APIV1
);

app.use('/uploads', express.static('public/uploads'))

app.use((req, res, next) => {
  console.log(req.url)
  return res.status(404).json({
    status: "404",
    message: "Endpoint tidak ditemukan",
    datetime: formatDateSystem(),
  });
});




export default app;
