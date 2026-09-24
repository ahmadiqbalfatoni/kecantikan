/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk melakukan download file dari server menggunakan axios
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
    baseURL: process.env.NEXT_PUBLIC_API_DIR_DOWNLOAD_PATH || '/api/interceptor_download',
    responseType: 'blob',
    withCredentials: true,
});


Axios.interceptors.response.use(
    r => r,
    async (error) => {
        if (error.config?.responseType === 'blob') {
            return Promise.reject(error);
        }

        if (error.response?.status === 401) {
            await signOut({ callbackUrl: "/auth/login" });
        }
        return Promise.reject(error);
    }
);


async function fileDownload(endpoint: string, data = {}, customHeader = {}) {
    try {
        // console.log(process.env.NEXT_PUBLIC_API_DIR_PATH)
        const header = {
            'X-ENDPOINT': endpoint,
            'X-Custom-Header': JSON.stringify({
                'X-Level': "1",
                ...customHeader
            }),
        };

        const response = await Axios.post('', data, {
            headers: header,
            responseType: 'blob',
            transitional: {
                silentJSONParsing: true
            }
        });
        return response;
    } catch (error: any) {
        const resp = error?.response;
        if (resp && resp.data) {
            try {
                // baca blob jadi teks
                const text = await resp.data.text();
                let parsed;
                try {
                    parsed = JSON.parse(text);
                } catch {
                    parsed = text;
                }
                error.response.data = parsed;
            } catch {
                error.response.data = { message: "Gagal membaca response error" };
            }
        }
        if (error?.response?.status == 401) {
            logout(null, true);
        }
        throw error;
    }
}

export default fileDownload;
