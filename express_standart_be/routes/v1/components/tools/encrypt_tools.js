/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk tools enkripsi dan dekripsi
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


import crypto, { publicEncrypt, sign } from "crypto";
import path from "path";
import fs from "fs";
import * as jose from "jose";
import { fileURLToPath } from "url";
import { formatDateSystem } from "./date_tools.js";


const __filename = fileURLToPath(import.meta.url);

export const __dirname = path.dirname(__filename);

export const hash = (text, alg = "sha256") => {
    return crypto.createHash(alg).update(text).digest("hex");
};
export const hmac = (text, secret, alg = "sha256") => {
    return crypto.createHmac(alg, secret).update(text).digest("hex");
};

export const hashEquals = (hashedInput, storedHash) => {
    const bufferInput = Buffer.from(hashedInput, "hex");
    const bufferStored = Buffer.from(storedHash, "hex");

    if (bufferInput.length !== bufferStored.length) return false;

    return crypto.timingSafeEqual(bufferInput, bufferStored);
};

export const uniqueId = () =>
    Date.now().toString(36) + Math.random().toString(36).substr(2, 5);


export const decryptXCredential = async (req) => {
    const cCredential = req.headers["x-credential"];
    const cAuth = req.headers["authorization"];
    const cEndpoint = req.originalUrl;

    try {

        if (!cCredential) {
            throw new Error("Invalid request credential");
        }

        const cToken = cAuth && cAuth.split(" ")[1];
        const signature = `${cToken}${cEndpoint}`;

        const cCredentialDecrypted = OpenSSLDecrypt(
            cCredential,
            process.env.USER_KEY + formatDateSystem(new Date(), "yyyyMMdd")
        );

        const { payload } = await jwtVerify(
            cCredentialDecrypted,
            new TextEncoder().encode(signature),
            { algorithms: ["HS512"] }
        );

        return payload;
    } catch (error) {
        Logging(error, {
            file: 'encrypt_tools.js',
            func: 'decryptXCredential'
        });

        return null
    }
};