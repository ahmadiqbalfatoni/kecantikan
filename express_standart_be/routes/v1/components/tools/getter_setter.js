/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk helper getter dan setter
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


import DB from "../../../../core/config/knex.js";

export const getLastKodeRegister = async (
    key,
    len,
    prefix = false,
    trx = DB,
) => {
    const kode = key.replace(/\s/g, "");
    let record = await trx("nomor_faktur").where({ kode: kode }).first();

    let id = 1;

    if (record) {
        id = record.id + 1;
    } else {
        await trx("nomor_faktur").insert({ kode: kode, id: 0 });
        record = await trx("nomor_faktur").where({ kode: kode }).first();
        if (record) {
            id = record.id + 1;
        }
    }

    const padded = String(id).padStart(len, "0");

    if (prefix) {
        return `${key}${padded}`;
    } else {
        return padded;
    }
};

export const getLastFaktur = async (key, len, trx = DB) => {
    const tgl = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const tahunBulan = tgl.slice(0, 6);
    const faktur = await getLastKodeRegister(key + tahunBulan, len, false, trx);
    const kode = key.replace(/\s/g, "") + tgl;
    return kode + faktur;
};

export const setLastFaktur = async (kode, trx = DB) => {
    const tahunBulan = new Date().toISOString().slice(0, 7).replace(/-/g, "");
    const fullKode = kode + tahunBulan;

    const record = await trx("nomor_faktur").where({ kode: fullKode }).first();

    if (record) {
        await trx("nomor_faktur")
            .where({ kode: fullKode })
            .update({ id: record.id + 1 });
    } else {
        await trx("nomor_faktur").insert({ kode: fullKode, id: 1 });
    }
};

export const setLastKodeRegister = async (kode, trx = DB) => {
    const vaData = await trx("nomor_faktur")
        .select("kode", "id")
        .where("kode", kode)
        .first();

    if (vaData) {
        const nId = vaData.id + 1;
        await trx("nomor_faktur").where("kode", kode).update({ id: nId });
    } else {
        const nId = 1;
        await trx("nomor_faktur").insert({ kode: kode, id: nId });
    }
};

export const getNextSequence = async (kode) => {
    const cleanKode = kode.replace(/\s/g, "");

    let record = await DB("nomor_faktur").where({ kode: cleanKode }).first();

    if (!record) {
        await DB("nomor_faktur").insert({
            kode: cleanKode,
            id: 0,
        });

        return 1;
    }

    return record.id + 1;
};