/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk melakukan post data ke server menggunakan axios
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

import axios from 'axios';
import { logout } from '../tools/serverTools';
import { signOut } from "next-auth/react";

const Axios = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_DIR_PATH || '/api/interceptor',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

Axios.interceptors.response.use(
    r => r,
    async (error) => {
        if (error.response?.status === 401) {
            await signOut({ callbackUrl: "/auth/login" });
        }
        return Promise.reject(error);
    }
);

async function postData(endpoint: string, data = {}, customHeader = {}) {
    try {
        const header = {
            'X-ENDPOINT': endpoint,
            'X-Custom-Header': JSON.stringify({
                'X-Level': "1",
                ...customHeader
            }),
        };

        const response = await Axios.post('', data, {
            headers: header,
        });
        return response;
    } catch (error: any) {
        console.log(error);
        if (error?.response?.status == 401) {
            logout(null, true);
        }
        throw error;
    }
}

export default postData;
