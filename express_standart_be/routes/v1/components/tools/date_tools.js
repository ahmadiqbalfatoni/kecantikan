/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk tools date
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


import { format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export const timeZoneMap = {
    WIB: "Asia/Jakarta",
    WITA: "Asia/Makassar",
    WIT: "Asia/Jayapura",
    UTC: "UTC",
};

export const getXMinutesFromNow = (x) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + x);
    return now;
};


export const parseYmdHis = (input) => {
    if (!/^\d{14}$/.test(input)) return null; // invalid format

    const yyyy = input.slice(0, 4);
    const MM = input.slice(4, 6);
    const dd = input.slice(6, 8);
    const HH = input.slice(8, 10);
    const mm = input.slice(10, 12);
    const ss = input.slice(12, 14);

    return new Date(`${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`);
}


export const formatDateSystem = (
    date = new Date(),
    formatStr = "yyyy-MM-dd HH:mm:ss",
    timeZoneKey
) => {
    const dateObj = typeof date === "string" || typeof date === "number"
        ? new Date(date)
        : date;

    let tz = process.env.APP_TZ || "UTC";

    if (timeZoneKey) {
        tz = timeZoneKey;
    }

    if (isNaN(dateObj.getTime())) return null;

    return formatInTimeZone(dateObj, tz, formatStr);
}

export function datetime() {
    const now = new Date();
    const datetime =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");

    return datetime;
}

export function datetimeIso(now = "") {
    if (!now) {
        now = new Date();
    }
    return now?.toISOString().slice(0, 19).replace("T", " ");
}

export const isoDateNowYmd = () =>
    new Date().toISOString().split("T")[0].replace(/-/g, "");
export const isoDateNow = () => new Date().toISOString().split("T")[0];

export const formatTimeOnlyTZ = (value, formatStr = "HH:mm", timeZoneKey) => {
    if (!value) return "-";

    try {
        const tz = timeZoneKey || process.env.APP_TZ || "UTC";
        let dateObj;

        if (value instanceof Date) {
            dateObj = value;
        } else {
            if (/^\d{2}:\d{2}/.test(value)) {
                dateObj = new Date(`1970-01-01T${value}Z`);
            } else {
                const dateString = value.endsWith('Z') ? value : `${value}Z`;
                dateObj = new Date(dateString);
            }
        }

        if (isNaN(dateObj.getTime())) return "-";

        return formatInTimeZone(dateObj, tz, formatStr);
    } catch (e) {
        console.error("Format Time Error:", e);
        return "-";
    }
};