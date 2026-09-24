/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk helper encrypt dan decrypt data
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

const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const password = process.env.TOKEN_SECRET; // Kunci rahasia yang digunakan untuk enkripsi dan dekripsi

export const hash = (text: string, alg = 'sha256') => {
    return crypto.createHash(alg).update(text).digest('hex');
};
export const hmac = (text: string, secret: string, alg = 'sha256') => {
    return crypto.createHmac(alg, secret).update(text).digest('hex');
};

export const hashEquals = (hashedInput: string, storedHash: string) => {
    const bufferInput = Buffer.from(hashedInput, 'hex');
    const bufferStored = Buffer.from(storedHash, 'hex');

    if (bufferInput.length !== bufferStored.length) return false;

    return crypto.timingSafeEqual(bufferInput, bufferStored);
};
