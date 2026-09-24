/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File index untuk routing v1
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


import express from "express";
import RefreshToken from "./auth/refresh_token.js";
import Login from "./auth/login.js";
import Setup from "./setup/index.js";
import Contoh from "./contoh/index.js";
import Function from "./components/index.js";
import Master from "./master/index.js";
import Transaksi from "./transaksi/index.js";

import {
  contextMiddleware,
  validateAccessToken,
} from "../../middleware/validate_header.js";
const router = express.Router();

//auth
router.use("/auth/refresh-token", [], RefreshToken);
router.use("/auth/login", [], Login);

// Modul
// Setup
router.use(
  "/setup",
  [validateAccessToken, contextMiddleware],
  Setup
);

// Master
router.use(
  "/master",
  [validateAccessToken, contextMiddleware],
  Master
);

// Transaksi
router.use(
  "/transaksi",
  [validateAccessToken, contextMiddleware],
  Transaksi
);

// Contoh
router.use(
  "/contoh",
  [validateAccessToken, contextMiddleware],
  Contoh
);

// Function
router.use(
  "/function",
  [validateAccessToken, contextMiddleware],
  Function
);

export default router;
