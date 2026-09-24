/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File konfigurasi database untuk Knex.js
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


import 'dotenv/config';
import pg from 'pg';

const IS_ONSITE = process.env.APP_PREMISE === "ONSITE";
const TARGET_TZ = IS_ONSITE ? (process.env.APP_TZ || 'Asia/Jakarta') : 'UTC';
const MYSQL_TZ = IS_ONSITE ? 'local' : '+00:00';

const parseFn = (val) => val;
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, parseFn);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, parseFn);
pg.types.setTypeParser(pg.types.builtins.DATE, parseFn);

const getConnectionConfig = ({ dbms, host, port, username, password, database }) => {
  const baseConfig = {
    host: host || "localhost",
    port: Number(port) || (dbms === "pg" || dbms === "postgresql" ? 5432 : 3306),
    user: username || "",
    password: password || "",
    database: database || "",
  };

  if (dbms === "mysql" || dbms === "mysql2") {
    return {
      ...baseConfig,
      timezone: MYSQL_TZ,
      dateStrings: false,
      multipleStatements: true,
      connectTimeout: 30000,
    };
  }

  if (dbms === "pg" || dbms === "postgresql") {
    return {
      ...baseConfig,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    };
  }

  return baseConfig;
};


const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;

let urlHost = '';
let urlPort = '';
let urlUser = '';
let urlPassword = '';
let urlDatabase = '';

if (dbUrl) {
  try {
    const parsed = new URL(dbUrl);
    urlHost = parsed.hostname;
    urlPort = parsed.port;
    urlUser = decodeURIComponent(parsed.username);
    urlPassword = decodeURIComponent(parsed.password);
    urlDatabase = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch (e) {
    console.warn("⚠️ Failed to parse DATABASE_URL:", e.message);
  }
}

const isLocalhostHost = (h) => !h || h === 'localhost' || h === '127.0.0.1';

// Jika ada Railway MySQL (MYSQLHOST / urlHost / DATABASE_URL), SELALU gunakan Railway MySQL!
const hasRailwayDb = Boolean(
  (process.env.MYSQLHOST && !isLocalhostHost(process.env.MYSQLHOST)) ||
  (urlHost && !isLocalhostHost(urlHost)) ||
  (process.env.DATABASE_URL && !isLocalhostHost(urlHost))
);

const connectionHost = hasRailwayDb
  ? (process.env.MYSQLHOST || urlHost)
  : (process.env.DB_HOST || "localhost");

const connectionPort = hasRailwayDb
  ? (process.env.MYSQLPORT || urlPort || 3306)
  : (process.env.DB_PORT || (process.env.DB_DBMS === "pg" ? 5432 : 3306));

const connectionUser = hasRailwayDb
  ? (urlUser || process.env.MYSQLUSER || "root")
  : (process.env.DB_USERNAME || process.env.DB_USER || "root");

const connectionPassword = hasRailwayDb
  ? (urlPassword || (connectionUser === 'root' ? (process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQLPASSWORD) : (process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD)) || "")
  : (process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "");

const connectionDatabase = hasRailwayDb
  ? (process.env.MYSQLDATABASE || urlDatabase || "railway")
  : (process.env.DB_DATABASE || process.env.DB_NAME || "db_klinik_kecantikan");

console.log(`[DB Config] hasRailwayDb: ${hasRailwayDb}, Target DB: ${connectionHost}:${connectionPort} (${connectionDatabase}) user: ${connectionUser}`);

const knexConfig = {
  default: {
    client: process.env.DB_DBMS || "mysql2",
    connection: getConnectionConfig({
      dbms: process.env.DB_DBMS || "mysql2",
      host: connectionHost,
      port: connectionPort,
      username: connectionUser,
      password: connectionPassword,
      database: connectionDatabase,
    }),
    pool: {
      min: 0, // min 0 penting agar tidak crash saat build atau saat DB belum siap
      max: process.env.DB_DBMS === "pg" ? 10 : 20,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,

      afterCreate: function (conn, done) {
        const dbms = process.env.DB_DBMS || "mysql2";
        if (dbms === "pg" || dbms === "postgresql") {
          conn.query(`SET TIME ZONE '${TARGET_TZ}';`, function (err) {
            done(err, conn);
          });
        } else {
          conn.query(`SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci; SET time_zone = '${MYSQL_TZ}';`, function (err) {
            done(err, conn);
          });
        }
      }
    }
  },
};

const configuration = {
  development: knexConfig.default,
  production: knexConfig.default,
  test: knexConfig.default,
};

export default configuration;