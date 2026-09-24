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

const knexConfig = {
  default: {
    client: process.env.DB_DBMS || "mysql2",
    connection: dbUrl
      ? (dbUrl.includes("?")
          ? `${dbUrl}&multipleStatements=true`
          : `${dbUrl}?multipleStatements=true`)
      : getConnectionConfig({
      dbms: process.env.DB_DBMS || "mysql2",
      host: process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST,
      port: process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT,
      username: process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER,
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD,
      database: process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE,
    }),
    pool: {
      min: 2,
      max: process.env.DB_DBMS === "pg" ? 10 : 20,
      idleTimeoutMillis: 30000,

      afterCreate: function (conn, done) {
        const dbms = process.env.DB_DBMS;
        if (dbms === "pg" || dbms === "postgresql") {
          conn.query(`SET TIME ZONE '${TARGET_TZ}';`, function (err) {
            done(err, conn);
          });
        } else {
          done(null, conn);
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