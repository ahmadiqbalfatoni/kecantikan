'use client';

import { signOut } from 'next-auth/react';
import { clearSessionCookies, clearUserMenuCache } from './serverTools';

export const handleClientLogout = async () => {
    try {
        await clearUserMenuCache();
    } catch (e) {}

    try {
        await clearSessionCookies();
    } catch (e) {}

    try {
        await signOut({ redirect: false });
    } catch (e) {
        console.warn('signOut error:', e);
    }

    if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        }
    }

    if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
    }
};

export default handleClientLogout;
