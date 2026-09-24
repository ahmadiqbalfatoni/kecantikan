/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk konfigurasi dan tools terkait autentikasi next auth
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

import NextAuth, { CredentialsSignin, NextAuthConfig, Session, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';
import { refreshToken } from '@/lib/tools/serverTools'; // Pastikan path import ini benar

const authOptions: NextAuthConfig = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                userData: { label: 'User Data', type: 'text' }
            },
            async authorize(credentials): Promise<any> {
                try {
                    if (!credentials.userData) {
                        throw new CredentialsSignin();
                    }
                    const userData = JSON.parse(credentials.userData as string);
                    return userData;
                } catch (error: any) {
                    console.error('Auth error:', error);
                    throw new CredentialsSignin();
                }
            }
        }),
    ],
    pages: {
        signIn: '/auth/login',
        error: '/auth/login',
        signOut: '/auth/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user }: { token: JWT; user?: User; }) {
            // 1. Initial sign in (Pertama kali login)
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.user_code = user.user_code;
                token.name = user.name;
                token.username = user.username;
                token.remember_me = user.remember_me;
                token.kode_cabang = user.kode_cabang || null;
                token.nama_cabang = user.nama_cabang || null;

                token.access_token = user.access_token;
                token.refresh_token = user.refresh_token;

                const expireDurationInSeconds = user.remember_me ? (24 * 60 * 60) : (7 * 60 * 60);
                token.access_token_expires = Math.floor(Date.now() / 1000) + expireDurationInSeconds - 120;

                return token;
            }

            // 2. Saat user bernavigasi / melakukan request API
            const now = Math.floor(Date.now() / 1000);
            if (token.access_token_expires && now > token.access_token_expires) {
                try {
                    // Jalankan rotasi token di sini
                    const refreshedTokens = await refreshToken(
                        token.user_code || token.id || '',
                        token.refresh_token || '',
                        token.remember_me ? 'true' : 'false'
                    );

                    // Perbarui token di dalam cookie NextAuth
                    token.access_token = refreshedTokens.access_token;
                    token.refresh_token = refreshedTokens.refresh_token ?? token.refresh_token; // Gunakan yang baru atau pertahankan yang lama

                    const expireDurationInSeconds = token.remember_me ? (24 * 60 * 60) : (7 * 60 * 60);
                    token.access_token_expires = Math.floor(Date.now() / 1000) + expireDurationInSeconds - 120;

                    delete token.error; // Hapus flag error jika sukses diperbarui
                } catch (error) {
                    console.error("Gagal melakukan refresh token:", error);
                    token.error = "AccessTokenExpired"; // Set error agar di-logout oleh interceptor
                }
            }

            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            session.user.id = token.id;
            session.user.role = token.role;
            session.user.user_code = token.user_code;
            session.user.name = token.name;
            session.user.username = token.username;
            session.user.kode_cabang = token.kode_cabang || null;
            session.user.nama_cabang = token.nama_cabang || null;
            session.remember_me = token.remember_me;

            session.access_token = token.access_token;
            session.refresh_token = token.refresh_token;
            session.error = token.error;

            return session;
        },
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                // domain: 'localhost'
            }
        }
    },
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "random",
    debug: process.env.NODE_ENV === 'development',
};

const { handlers, auth } = NextAuth(authOptions);

export { authOptions, handlers, auth };