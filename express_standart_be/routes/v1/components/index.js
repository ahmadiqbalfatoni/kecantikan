/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File index untuk routing components
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

const router = express.Router();
import getLastFaktur from "./endpoint/get_last_faktur.js";
import getDBConfig from "./endpoint/get_db_config.js";

router.use("/get-last-faktur", getLastFaktur);
router.use("/get-db-config", getDBConfig);

export default router;
