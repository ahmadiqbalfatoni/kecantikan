# Backend Environment & Architecture Guide

Dokumen ini menjelaskan konfigurasi environment backend, struktur routing, aturan middleware, keamanan key, serta standar database yang WAJIB diikuti.

# Environment Variables (Backend)

Semua variable di bawah WAJIB diisi sesuai environment (dev / staging / production).

- Application
APP_DEBUG=true

APP_PORT=8000
APP_SERVER=http://127.0.0.1
ORIGIN="http://localhost:3000"
ASSETS_PATH="http://localhost:3000/api/assets"

Penjelasan:

APP_DEBUG
Mode debug aplikasi.

APP_PORT
Port server backend.

APP_SERVER
Base server URL.

ORIGIN
Origin frontend yang diizinkan (CORS).

ASSETS_PATH
Berisi url fe yang digunakan sebagai proxy assets BE

- Database Configuration
DB_DBMS=mysql2
DB_HOST=127.0.0.1
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=
DB_PORT=3306


Catatan Penting Database:

Jika menggunakan MySQL, collation WAJIB:

utf8mb4_unicode_ci


Nama table: snake_case

Nama field/column: snake_case

Contoh:

user_profiles
UserName
CreatedAt

- Security & Encryption Key
USER_KEY=random
USER_PAS_KEY=random
USER_SECRET=random


- Semua key HARUS random, tidak boleh hardcoded, dan berbeda tiap environment.

- Object Storage (MinIO)
MINIO_ENDPOINT=
MINIO_PORT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=


Digunakan untuk penyimpanan file (upload, asset, dll).

# RSA Key Policy

Lokasi penyimpanan RSA key:

/core/key

Terdiri dari:

public.pem

private.pem

Minimal key size: 2048 bit

Public key HARUS sama dengan public key di frontend

- Routing Architecture
- Versioned Controller

Routing WAJIB versioning, contoh:

v1/

# One File = One Endpoint

Setiap endpoint HARUS berada di satu file sendiri.

Contoh struktur:

v1/
 ├─ auth/
 │   └─ login.js
 │
 ├─ setup/
 │   └─ users/
 │       ├─ user_create.js
 │       ├─ user_update.js
 │       └─ user_delete.js

# Modul Routing (Index per Modul)

Setiap modul memiliki index.js sebagai router utama.

Contoh: setup/index.js
import express from "express";
const router = express.Router();

import user from "./user_login/user_data.js";
import userCreate from "./user_login/user_create.js";
import userUpdate from "./user_login/user_update.js";
import userDelete from "./user_login/user_delete.js";

import navBase from "./navigation/mst_navigation_data.js";
import navUser from "./navigation/user_navigation_data.js";
import navUserEdit from "./navigation/user_navigation_data_edit.js";
import navUserInsert from "./navigation/user_navigation_insert.js";

// user
router.use("/user-login/user-data", user);
router.use("/user-login/user-create", userCreate);
router.use("/user-login/user-update", userUpdate);
router.use("/user-login/user-delete", userDelete);

// navigation
router.use("/nav/base-data", navBase);
router.use("/nav/user-data", navUser);
router.use("/nav/user-data-edit", navUserEdit);
router.use("/nav/user-data-insert", navUserInsert);

export default router;

# Main Version Router
v1/index.js

File ini berfungsi sebagai router utama untuk semua modul.

import express from "express";
const router = express.Router();

import AccessToken from "./auth/token_get.js";
import Login from "./auth/login.js";
import Setup from "./setup/index.js";
import Function from "./components/index.js";

import {
  contextMiddleware,
  validateAccessToken,
  validateBaseToken,
  validateSignature,
} from "../../middleware/validate_header.js";

// Auth
router.use("/auth/token", [validateBaseToken], AccessToken);
router.use("/auth/login", [validateAccessToken], Login);

// Setup module
router.use(
  "/setup",
  [validateAccessToken, validateSignature, contextMiddleware],
  Setup
);

// Function module
router.use(
  "/function",
  [validateAccessToken, validateSignature, contextMiddleware],
  Function
);

export default router;

- Middleware Policy (WAJIB)
- Middleware Utama

Terdapat 3 middleware penting:

validateAccessToken
validateSignature
contextMiddleware

# Aturan:

SEMUA route wajib menggunakan 3 middleware ini

KECUALI route auth

/auth/login

/auth/token

Middleware ini digunakan untuk:

Validasi token

Validasi signature

Inject context user & aplikasi

# Best Practices (Wajib)

- Jangan commit .env

- Gunakan .env.example

- Satu file = satu endpoint

- Semua route harus versioned

- Semua route non-auth wajib pakai middleware

- RSA minimal 2048 bit

- Field snake_case, table snake_case

- MySQL collation utf8mb4_unicode_ci