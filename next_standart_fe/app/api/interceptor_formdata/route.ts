/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk route API untuk interceptor route global (formdata)
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

        // Autentikasi menggunakan NextAuth (auth)
        if (!session || !session.access_token || session.error === "AccessTokenExpired") {
            await clearSessionCookies();
            return NextResponse.json(
                { status: 99, message: 'Sesi Anda telah berakhir. Harap login kembali.', datetime: formatDateSystem(new Date()) },
                { status: 401 }
            );
        }

        return await postCRUD(request, session.access_token);

    } catch (error: any) {
        console.error("BFF FormData Interceptor Error:", error);

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
        const formData = await request.formData();

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
            'X-Timestamp': formatDateISO(new Date()) as string,
            'Authorization': `Bearer ${accessToken}`,
            ...customHeader,
        };

        // Hapus header duplikat yang dapat mengganggu parsing multipart/form-data otomatis oleh Axios
        delete requestHeaders['x-endpoint'];
        delete requestHeaders['Content-Type'];
        delete requestHeaders['content-type'];

        const newFormData = new FormData();

        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                const blob = new Blob([await value.arrayBuffer()], { type: value.type });
                newFormData.append(key, blob, value.name);
            } else {
                newFormData.append(key, value);
            }
        }

        const apiUrl = getBackendApiUrl();
        const result = await axios.post(
            `${apiUrl}${endpoint}`,
            newFormData,
            { headers: requestHeaders }
        );

        return NextResponse.json(result.data);

    } catch (err: any) {
        console.error("POST CRUD FormData error:", err);

        if (err?.response?.status === 401) {
            await clearSessionCookies();
            return NextResponse.json(
                err?.response?.data || { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            err?.response?.data || { error: 'Internal server error' },
            { status: err?.response?.status || 500 }
        );
    }
}