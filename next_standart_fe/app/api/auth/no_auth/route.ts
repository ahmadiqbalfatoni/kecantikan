/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk route API yang tidak memerlukan autentikasi
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

import { formatDateISO, formatDateSystem } from "@/lib/tools/dateTools";
import axios from "axios";
import { jwtVerify, SignJWT } from "jose";
import { User } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/tools/apiConfig";

interface CustomHeaders {
    'x-endpoint'?: string;
    'x-custom-header'?: string;
    'x-level'?: string;
    'x-credential'?: string;
}

interface TokenData {
    access_token?: string;
    token_type?: string;
}

interface AuthResponse {
    status?: string;
    message?: string;
    datetime?: string;
}

export const POST = async (req: NextRequest) => {

    try {

        const body = await req.json()
        const dTimestamp = formatDateISO(new Date());


        const headers: CustomHeaders = {};

        req.headers.forEach((value, key) => {
            if (key.toLowerCase().startsWith('x-')) {
                headers[key.toLowerCase() as keyof CustomHeaders] = value;
            }
        });

        const endpoint = headers['x-endpoint'];
        if (!endpoint) {
            return NextResponse.json(
                { error: 'Endpoint not specified' },
                { status: 400 }
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
            'Content-Type': 'application/json',
            'X-Timestamp': dTimestamp,
            ...customHeader,
        };

        const apiUrl = getBackendApiUrl();
        const result = await axios.post(
            `${apiUrl}${endpoint}`,
            body,
            { headers: requestHeaders }
        );

        return NextResponse.json(result.data);

    } catch (error: any) {
        let errorMessage = 'Login gagal';
        // console.log(error)

        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan';
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        const isConnectionRefused = /ECONNREFUSED/.test(errorMessage);
        const isIPExposed = /(\d{1,3}\.){3}\d{1,3}(:\d{1,5})?/.test(errorMessage);

        if (isConnectionRefused && isIPExposed) {
            return NextResponse.json(
                {
                    status: '99',
                    message: 'Koneksi ke server gagal. Silakan coba beberapa saat lagi.',
                    datetime: formatDateISO(new Date()),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                status: '99',
                message: errorMessage,
                datetime: formatDateISO(new Date()),
            },
            { status: 500 }
        );
    }
}