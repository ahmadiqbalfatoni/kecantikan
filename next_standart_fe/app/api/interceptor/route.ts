/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk route API untuk interceptor route global (post)
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
        console.error("BFF Interceptor Error:", error);

        const isUnauthorized = error.response?.status === 401 || error.status === 401;
        if (isUnauthorized) {
            await clearSessionCookies();
        }

        const errorMessage = error.response?.data?.message || error.message || 'Internal server error';
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
            { headers: requestHeaders }
        );

        return NextResponse.json(result.data);

    } catch (err: any) {
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