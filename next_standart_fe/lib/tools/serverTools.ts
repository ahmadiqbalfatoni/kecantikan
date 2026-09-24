/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk helper server tools
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

'use server'

import axios from "axios";
import { destroyCookie } from 'nookies'
import { signOut } from 'next-auth/react';
import { parse } from 'date-fns';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { findToValuesRecursive } from "./generalTools";
import NextAuth from 'next-auth';
import { auth } from "./authTools";
import { cookies } from "next/headers";
import { formatDateISO } from "./dateTools";
import { getBackendApiUrl } from "./apiConfig";

let isLoggingOut = false;

const logout = async (
    context: any = null,
    redirectToLogin: boolean = true
) => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    clearUserMenuCache();

    const cookieNames = ["_A2R", "_A2F"];
    cookieNames.forEach((name) => {
        destroyCookie(context, name, { path: "/" });
    });

    if (typeof window !== "undefined") {
        if (redirectToLogin) {
            const base = window.location.origin;
            setTimeout(() => { isLoggingOut = false; }, 2000);
            try {
                await signOut({ callbackUrl: `${base}/auth/login` });
            } catch (e) {
                console.error("SignOut error:", e);
            }
            window.location.href = `${base}/auth/login`;
        }
        return;
    }
    setTimeout(() => { isLoggingOut = false; }, 2000);
    return;
};

export default logout;


// Cache menu izin user di memory server (TTL 5 menit) untuk menghilangkan overhead request HTTP ke backend pada setiap pindah halaman
const userMenuCache = new Map<string, { menu: any; timestamp: number }>();
const MENU_CACHE_TTL = 5 * 60 * 1000;

export const clearUserMenuCache = async (userCode?: string) => {
    if (userCode) {
        userMenuCache.delete(userCode);
    } else {
        userMenuCache.clear();
    }
};

const routeMiddleware = async (searchUrl: string) => {
    const session = await auth();

    if (!session?.user) {
        return '99';
    }

    const dSessionExp = parse(session?.expires, 'yyyy-MM-dd HH:mm:ss', new Date());
    const dNow = new Date();

    if ((dNow.getTime() > dSessionExp.getTime())) {
        return '99';
    }

    if (session.user.user_code) {
        try {
            const userCode = session.user.user_code;
            let menu: any = null;

            const cached = userMenuCache.get(userCode);
            if (cached && (Date.now() - cached.timestamp < MENU_CACHE_TTL)) {
                menu = cached.menu;
            } else {
                const apiUrl = getBackendApiUrl();
                const resp = await axios.post(
                    `${apiUrl}/setup/nav/user-data`,
                    { user_code: userCode },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Timestamp': formatDateISO(new Date()) as string,
                            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
                        }
                    }
                );
                menu = resp.data?.data;
                userMenuCache.set(userCode, { menu, timestamp: Date.now() });
            }

            let urlFix = searchUrl;
            if (searchUrl.length > 1) {
                urlFix = searchUrl.replace(new RegExp(/\/$/), '');
            }

            const res = findToValuesRecursive(menu, urlFix);

            if (res.length < 1) {
                if (urlFix === '/pendaftaran-antrean/jadwal-karyawan') {
                    return '00';
                }
                return '98';
            }
        } catch (error: any) {
            if (error?.response?.status == '401') {
                return '99';
            }
            console.log(error);
        }
    } else {
        return '99';
    }

    return '00';
};

const refreshToken = async (userCode: string, refreshToken: string, rememberMe: string) => {
    const timestamp = formatDateISO(new Date());

    const credentialPayload = {
        user_code: userCode,
        refresh_token: refreshToken,
        remember_me: rememberMe,
    };

    const encryptedBody = credentialPayload;

    const apiUrl = getBackendApiUrl();
    const refreshResponse = await axios.post(
        `${apiUrl}/auth/refresh-token`,
        encryptedBody,
        {
            headers: {
                'X-Timestamp': timestamp,
                'Content-Type': 'application/json',
            }
        }
    );

    return refreshResponse.data.data;
}

const clearSessionCookies = async () => {
    try {
        const cookieStore = await cookies();
        const isProd = process.env.NODE_ENV === 'production';

        const sessionCookieName = isProd
            ? '__Secure-next-auth.session-token'
            : 'next-auth.session-token';

        const csrfCookieName = isProd
            ? '__Host-next-auth.csrf-token'
            : 'next-auth.csrf-token';

        const callbackCookieName = isProd
            ? '__Secure-next-auth.callback-url'
            : 'next-auth.callback-url';

        cookieStore.delete(sessionCookieName);
        cookieStore.delete(csrfCookieName);
        cookieStore.delete(callbackCookieName);
    } catch (cookieError) {
        console.error("Gagal menghapus cookies:", cookieError);
    }
}

export { logout, routeMiddleware, refreshToken, clearSessionCookies };