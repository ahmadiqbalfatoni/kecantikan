/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk helper date tools yang digunakan di project ini
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

import { TZKey } from "@/types/layout";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import * as Locales from "date-fns/locale";


export const timeZoneMap: Record<string, TZKey> = {
  wib: "Asia/Jakarta",
  wita: "Asia/Makassar",
  wit: "Asia/Jayapura",
  utc: "UTC",
};

export const formatDateISO = (date = new Date()) => {
  if (!date) return '-';

  const d = new Date(date);

  if (isNaN(d.getTime())) return '-';

  return d.toISOString();
};

export const getTzUser = () => {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return browserTz;
};

export const formatDateSystem = (
  date: string | Date = new Date(),
  formatStr: string | null = null,
  timeZone: string | null = null,
  loc: string | null = null,
): string | null => {
  const locale = loc ? (Locales as any)[loc] : Locales['enUS'];

  let dateObj: Date;
  const envTz = process.env.NEXT_PUBLIC_APP_TZ?.trim();
  const tz = timeZone || (envTz !== "" ? envTz : null) || getTzUser() || "UTC";

  let formatStrFinal = "yyyy-MM-dd HH:mm:ss"

  if (formatStr) {
    formatStrFinal = formatStr
  }


  if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = new Date(date);

    if (isNaN(dateObj.getTime()) && typeof date === "string") {
      const parts = date.split("-");
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        dateObj = new Date(`${yyyy}-${mm}-${dd}`);
      }
    }
  }

  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  if (tz) {
    return formatInTimeZone(dateObj, tz, formatStrFinal, { locale });
  }

  return format(dateObj, formatStrFinal, { locale });
}


export const formatTime = (date: any) => {
  if (!date) return null;
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export const formatTimeOnlyTZ = (value: Date | string | null, formatStr = "HH:mm") => {
  if (!value) return "-";

  try {
    const tz = getTzUser() || "UTC";
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
}

export const formatTimeStringToDate = (timeStr: any): Date | null => {
  if (!timeStr) return null;
  if (timeStr instanceof Date) return timeStr;

  // Jika string berformat ISO (ada huruf 'T', contoh: "2026-07-22T08:00:00.000Z")
  if (typeof timeStr === 'string' && timeStr.includes('T')) {
    const parsed = new Date(timeStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // Jika string jam murni (contoh: "08:00" atau "08:00:00")
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;

    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  const parsed = new Date(timeStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const getBulanSekarangRange = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const start = new Date(y, m, 1);
  const end = now;

  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    awal: format(start),
    akhir: format(end)
  };
};

export const formatDateHoursISO = (date: Date | null, isEndOfDay: boolean = false): string | null => {
  if (!date) return null;
  const targetDate = new Date(date.getTime());
  if (isEndOfDay) {
    targetDate.setHours(23, 59, 59, 999);
  } else {
    targetDate.setHours(0, 0, 0, 0);
  }
  return targetDate.toISOString();
};

export const subtractOneDay = (dateString: string) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1); // Mengurangkan 1 hari dari tanggal
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

