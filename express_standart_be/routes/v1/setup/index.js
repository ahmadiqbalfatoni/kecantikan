/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File index untuk routing setup
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

import user from "./user_login/user_data.js";
import userCreate from "./user_login/user_create.js";
import userUpdate from "./user_login/user_update.js";
import userDelete from "./user_login/user_delete.js";

import navBase from "./navigation/mst_navigation_data.js";
import navUser from "./navigation/user_navigation_data.js";
import navUserEdit from "./navigation/user_navigation_data_edit.js";
import navUserInsert from "./navigation/user_navigation_insert.js";
import navRoleSave from "./navigation/role_navigation_save.js";

import configCreate from './config/config_create.js'
import configData from './config/config_data.js'

// master
// user
router.use("/user-login/user-data", user);
router.use("/user-login/user-create", userCreate);
router.use("/user-login/user-update", userUpdate);
router.use("/user-login/user-delete", userDelete);
//config
router.use("/config-data", configData);
router.use("/config-create", configCreate);
//navigation
router.use("/nav/base-data", navBase);
router.use("/nav/user-data", navUser);
router.use("/nav/user-data-edit", navUserEdit);
router.use("/nav/user-insert", navUserInsert);
router.use("/nav/role-save", navRoleSave);

export default router;
