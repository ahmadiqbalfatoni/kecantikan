import 'next-auth';
import 'next-auth/jwt';
import { UserRole } from './layout';

declare module 'next-auth' {
    interface User {
        id?: string;
        role?: string;
        user_code?: string;
        username?: string;
        name?: string;
        remember_me?: boolean;
        access_token?: string;
        refresh_token?: string;
        kode_cabang?: string | null;
        nama_cabang?: string | null;
    }

    interface Session {
        user: {
            id?: string;
            role?: string;
            user_code?: string;
            name?: string;
            username?: string;
            kode_cabang?: string | null;
            nama_cabang?: string | null;
        };
        remember_me?: boolean; 
        access_token?: string;
        refresh_token?: string;
        error?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string;
        role?: string;
        user_code?: string;
        username?: string;
        name?: string;
        access_token?: string;
        refresh_token?: string;
        access_token_expires?: number;
        error?: string;
        remember_me?: boolean; 
        kode_cabang?: string | null;
        nama_cabang?: string | null;
    }
}

export interface UserCredential {
    user_code: string;
    username: string;
    fullname: string;
    role: UserRole;
}