/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File middleware untuk memeriksa User Agent pada setiap request
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


import { formatDateSystem } from "../routes/v1/components/tools/date_tools.js";
import { status } from "../routes/v1/components/tools/general.js";
import { Logging } from "../routes/v1/components/tools/servertool.js";

// const ALLOWEDUSERAGENT = [
//     "MyApp/1.0",
//     "PostmanRuntime/11.49.2",
//     "curl/8.5.0"
// ];

const ALLOWEDUSERAGENT = [
  // "MyApp/",
  // "axios/",
  // "Mozilla/",
  "PostmanRuntime/",
  // "curl/",
];

const detectOS = (userAgent) => {
  const OS = {
    "windows nt 10": "Windows 10",
    "windows nt 6.3": "Windows 8.1",
    "windows nt 6.2": "Windows 8",
    "windows nt 6.1": "Windows 7",
    "windows nt 6.0": "Windows Vista",
    "windows nt 5.2": "Windows Server 2003/XP x64",
    "windows nt 5.1": "Windows XP",
    "windows xp": "Windows XP",
    macintosh: "Mac OS X",
    "mac os x": "Mac OS X",
    linux: "Linux",
    ubuntu: "Ubuntu",
    iphone: "iPhone",
    android: "Android",
    blackberry: "BlackBerry",
    webos: "Mobile",
    postman: "Postman",
  };

  const ua = userAgent.toLowerCase();

  for (const key in OS) {
    return OS[key];
  }

  return "Unknown OS";
};

export const useragentMiddleware = async (req, res, next) => {
  try {
    const userAgent = req.headers["user-agent"] || "";
    const isAllowed = ALLOWEDUSERAGENT.some((ua) => userAgent.includes(ua));

    if (!isAllowed) {
      return res.status(403).json({
        status: status.BAD_REQUEST,
        message: "User Agent not allowed",
        datetime: formatDateSystem(),
      });
    }

    next();
  } catch (error) {
    Logging(error)

    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Internal server error",
      datetime: formatDateSystem(),
    });
  }
};
