/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk route API untuk interceptor download global (post)
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/tools/serverTools';
import axios from 'axios';
import { formatDateISO, formatDateSystem } from '@/lib/tools/dateTools';
import { SignJWT } from 'jose';
import { auth } from '@/lib/tools/authTools';
import { getBackendApiUrl } from '@/lib/tools/apiConfig';

interface CustomHeaders {
    'x-endpoint'?: string;
    'x-custom-header'?: string;
    'x-level'?: string;
    'x-credential'?: string;
}

export const POST = async (request: NextRequest) => {
    try {
        const session = await auth();

        if (!session || !session.access_token || session.error === "AccessTokenExpired") {
            await clearSessionCookies();
            return NextResponse.json(
                { status: 99, message: 'Sesi Anda telah berakhir. Harap login kembali.', datetime: formatDateSystem(new Date()) },
                { status: 401 }
            );
        }

        return await postCRUD(request, session.access_token);

    } catch (error: any) {
        console.error("BFF Download Interceptor Error:", error);

        const isUnauthorized = error.response?.status === 401 || error.status === 401;
        if (isUnauthorized) {
            await clearSessionCookies();
        }

        const errorMessage = error.response?.data?.message || error.message || 'Internal server error';
        const isConnectionRefused = /ECONNREFUSED/.test(errorMessage);
        const isIPExposed = /(\d{1,3}\.){3}\d{1,3}(:\d{1,5})?/.test(errorMessage);

        if (isConnectionRefused && isIPExposed) {
            return NextResponse.json(
                {
                    status: '99',
                    message: 'Koneksi ke server gagal. Silakan coba beberapa saat lagi.',
                    datetime: formatDateSystem(new Date()),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { status: '99', message: errorMessage, datetime: formatDateSystem(new Date()), data: error.response?.data || null },
            { status: error.response?.status || 500 }
        );
    }
};

async function postCRUD(request: NextRequest, accessToken: string) {
    try {
        const headers: CustomHeaders = {};

        request.headers.forEach((value, key) => {
            if (key.toLowerCase().startsWith('x-')) {
                headers[key.toLowerCase() as keyof CustomHeaders] = value;
            }
        });

        const endpoint = headers['x-endpoint'];
        if (!endpoint) {
            return NextResponse.json(
                { status: '99', message: 'Endpoint not specified', datetime: formatDateSystem(new Date()) },
                { status: 500 }
            );
        }

        const body = await request.json();

        // Parse custom headers
        let customHeader: Record<string, any> = {};
        if (headers['x-custom-header']) {
            try {
                customHeader = JSON.parse(headers['x-custom-header']);
            } catch (e) {
                console.error('Failed to parse x-custom-header:', e);
            }
        }

        let requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Timestamp': formatDateISO(new Date()) as string,
            'Authorization': `Bearer ${accessToken}`,
            ...customHeader,
        };

        delete requestHeaders['X-Level'];

        const apiUrl = getBackendApiUrl();
        const result = await axios.post(
            `${apiUrl}${endpoint}`,
            body,
            {
                headers: requestHeaders,
                responseType: "arraybuffer",
                validateStatus: () => true,
            }
        );

        const contentType = result.headers["content-type"] || "";

        if (contentType.includes("application/json")) {
            const text = Buffer.from(result.data).toString("utf-8");
            const jsonResult = JSON.parse(text);

            if (result.status === 401) {
                await clearSessionCookies();
            }

            return NextResponse.json(jsonResult, { status: result.status });
        }

        return new NextResponse(Buffer.from(result.data), {
            status: result.status || 200,
            headers: {
                "Content-Type": contentType || "application/octet-stream",
                "Content-Disposition":
                    result.headers["content-disposition"] ??
                    'attachment; filename="WO.pdf"',
            },
        });

    } catch (err: any) {
        const resp = err?.response;
        let payload = resp?.data;

        // Dekode format arraybuffer apabila terjadi error mentah dari axios stream
        if (payload && (Buffer.isBuffer(payload) || payload instanceof ArrayBuffer)) {
            try {
                const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
                const text = buf.toString('utf8');
                payload = (() => {
                    try { return JSON.parse(text); } catch (e) { return text; }
                })();
            } catch (e) {
                payload = String(payload);
            }
        }

        if (err?.response?.status === 401 || err?.status === 401) {
            await clearSessionCookies();
            return NextResponse.json(
                payload || { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            payload || { error: 'Internal server error' },
            { status: resp?.status || 500 }
        );
    }
}