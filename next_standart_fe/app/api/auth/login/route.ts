/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk route API login
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

interface Credentials {
    username: string;
    password: string;
    remember_me?: string;
}

interface TokenData {
    access_token?: string;
    token_type?: string;
}

interface AuthResponse {
    status?: string;
    message?: string;
    datetime?: string;
    data?: {
        access_token: string,
        refresh_token: string,
        user_info: {
            user_code: string,
            username: string,
            fullname: string,
            role: string,
            kode_cabang?: string | null,
            nama_cabang?: string | null,
        }
    };
}

export const POST = async (req: NextRequest) => {

    try {

        const credentials = await req.json()

        const dTimestamp = formatDateISO(new Date());

        const credential: Credentials | any = {
            username: credentials?.username as string,
            password: credentials?.password as string,
            remember_me: credentials?.remember_me as string,
        };

        const headers = {
            'Content-Type': 'application/json',
            'X-Timestamp': formatDateISO(new Date()),
        };

        const apiUrl = getBackendApiUrl();

        const result = await axios.post<AuthResponse & User>(
            `${apiUrl}/auth/login`,
            credential,
            { headers }
        );

        const dataResponse = result.data;

        if (dataResponse?.data) {

            const oData = dataResponse.data

            const userData = {
                id: oData?.user_info.user_code || oData.user_info?.username,
                role: oData?.user_info.role,
                name: oData?.user_info.fullname,
                username: oData?.user_info.username,
                user_code: oData?.user_info.user_code,
                kode_cabang: oData?.user_info?.kode_cabang || null,
                nama_cabang: oData?.user_info?.nama_cabang || null,
                remember_me: credentials?.remember_me === '1',
                access_token: oData.access_token,
                refresh_token: oData.refresh_token,
            };

            return NextResponse.json(
                {
                    status: '00',
                    message: 'Login Berhasil',
                    datetime: formatDateISO(new Date()),
                    data: userData
                },
                { status: 200 }
            );

        }

        return NextResponse.json(
            {
                status: '99',
                message: 'Login Gagal Credential Tidak Ditemukan',
                datetime: formatDateISO(new Date()),
            },
            { status: 500 }
        );

    } catch (error: any) {
        let errorMessage = 'Login gagal';
        // console.log(error)

        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.message || error.message || 'Login gagal';
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