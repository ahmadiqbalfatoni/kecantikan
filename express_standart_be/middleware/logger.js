/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File middleware untuk logging error dan request ke database
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


import DB from "../core/config/knex.js";
import { formatDateSystem } from "../routes/v1/components/tools/date_tools.js";

const Logger = async (err, req, res, next) => {
  const { method, url, body, user } = req;

  res.on("finish", async () => {
    const message = err?.message || res.locals?.logMessage || "";
    const stack = err?.stack || "";

    let fileName = "";
    let functionName = "";
    if (err && err.stack) {
      const stackLines = err.stack.split("\n");
      const callerLine = stackLines[1] || "";
      const match =
        callerLine.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/) ||
        callerLine.match(/at\s+(.*?):(\d+):(\d+)/);
      if (match) {
        functionName = match[1] || "";
        fileName = match[2] || match[1];
      }
    }

    await DB("log").insert({
      Tgl: formatDateSystem(),
      Controller: fileName,
      Function: functionName,
      Request: JSON.stringify(body || {}),
      Response: message,
      Stack: stack,
      User: user?.id || "",
      Datetime: formatDateSystem(),
    });
  });

  next(err);
};

export default Logger;
