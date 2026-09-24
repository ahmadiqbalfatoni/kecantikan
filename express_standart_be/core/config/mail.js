/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk konfigurasi transporter email menggunakan Nodemailer
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


import "dotenv/config";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "",
  port: process.env.MAIL_PORT || 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_PASS || "",
  },
});

// export const transporter = nodemailer.createTransport({
//   host: process.env.MAIL_HOST || "",
//   port: process.env.MAIL_PORT || 465,
//   secure: false,
//   // auth: {
//   //   user: process.env.MAIL_USER || "",
//   //   pass: process.env.MAIL_PASS || "",
//   // },
// });
