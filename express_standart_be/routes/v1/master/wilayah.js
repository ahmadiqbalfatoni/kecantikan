/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file wilayah.js
 * @description Endpoint Wilayah Indonesia (Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan) dari database mst_* dengan fallback ke emsifa/data-indonesia
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
import DB from "../../../core/config/knex.js";
import { Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { formatDateSystem } from "../components/tools/date_tools.js";

const router = express.Router();
const BASE_URL = "https://emsifa.github.io/api-wilayah-indonesia/api";

const _cache = {};
async function fetchFallback(key, url) {
  if (_cache[key]) return _cache[key];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    _cache[key] = data;
    return data;
  } catch (err) {
    return [];
  }
}

// Handler Provinsi
export const handleProvinsi = async (req, res) => {
  const username = req?.auth?.username || "";
  try {
    let data = [];
    const hasTable = await DB.schema.hasTable("mst_provinsi");
    if (hasTable) {
      data = await DB("mst_provinsi").select("kode", "nama").orderBy("nama", "asc");
    }

    if (!data || data.length === 0) {
      const raw = await fetchFallback("prov", `${BASE_URL}/provinces.json`);
      data = raw.map((p) => ({ kode: String(p.id), nama: p.name }));
    }

    const formatted = data.map((p) => ({
      id: String(p.kode),
      kode: String(p.kode),
      nama: p.nama,
      name: p.nama,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "OK",
      datetime: formatDateSystem(),
      data: formatted,
    });
  } catch (error) {
    Logging(error, { file: "/master/wilayah.js", func: "provinsi", request: {}, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal memuat data provinsi",
      datetime: formatDateSystem(),
    });
  }
};

// Handler Kabupaten / Kota
export const handleKabupaten = async (req, res) => {
  const username = req?.auth?.username || "";
  const oPayload = { ...req.query, ...req.body };
  const kode_provinsi = (oPayload.kode_provinsi || oPayload.id_provinsi || oPayload.province_id || "").trim();

  try {
    let data = [];
    const hasTable = await DB.schema.hasTable("mst_kabupaten");
    if (hasTable) {
      if (kode_provinsi) {
        data = await DB("mst_kabupaten")
          .select("kode", "kode_provinsi", "nama")
          .where("kode_provinsi", kode_provinsi)
          .orderBy("nama", "asc");
      } else {
        data = await DB("mst_kabupaten").select("kode", "kode_provinsi", "nama").orderBy("nama", "asc").limit(100);
      }
    }

    if ((!data || data.length === 0) && kode_provinsi) {
      const raw = await fetchFallback(`kab_${kode_provinsi}`, `${BASE_URL}/regencies/${kode_provinsi}.json`);
      data = raw.map((r) => ({ kode: String(r.id), kode_provinsi: String(r.province_id || kode_provinsi), nama: r.name }));
    }

    const formatted = data.map((k) => ({
      id: String(k.kode),
      kode: String(k.kode),
      kode_provinsi: String(k.kode_provinsi),
      province_id: String(k.kode_provinsi),
      nama: k.nama,
      name: k.nama,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "OK",
      datetime: formatDateSystem(),
      data: formatted,
    });
  } catch (error) {
    Logging(error, { file: "/master/wilayah.js", func: "kabupaten", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal memuat data kabupaten/kota",
      datetime: formatDateSystem(),
    });
  }
};

// Handler Kecamatan
export const handleKecamatan = async (req, res) => {
  const username = req?.auth?.username || "";
  const oPayload = { ...req.query, ...req.body };
  const kode_kota = (oPayload.kode_kota || oPayload.kode_kabupaten || oPayload.id_kabupaten || oPayload.regency_id || "").trim();

  try {
    let data = [];
    const hasTable = await DB.schema.hasTable("mst_kecamatan");
    if (hasTable) {
      if (kode_kota) {
        data = await DB("mst_kecamatan")
          .select("kode", "kode_kabupaten", "nama")
          .where("kode_kabupaten", kode_kota)
          .orderBy("nama", "asc");
      } else {
        data = await DB("mst_kecamatan").select("kode", "kode_kabupaten", "nama").orderBy("nama", "asc").limit(100);
      }
    }

    if ((!data || data.length === 0) && kode_kota) {
      const raw = await fetchFallback(`kec_${kode_kota}`, `${BASE_URL}/districts/${kode_kota}.json`);
      data = raw.map((c) => ({ kode: String(c.id), kode_kabupaten: String(c.regency_id || kode_kota), nama: c.name }));
    }

    const formatted = data.map((c) => ({
      id: String(c.kode),
      kode: String(c.kode),
      kode_kabupaten: String(c.kode_kabupaten),
      regency_id: String(c.kode_kabupaten),
      nama: c.nama,
      name: c.nama,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "OK",
      datetime: formatDateSystem(),
      data: formatted,
    });
  } catch (error) {
    Logging(error, { file: "/master/wilayah.js", func: "kecamatan", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal memuat data kecamatan",
      datetime: formatDateSystem(),
    });
  }
};

// Handler Kelurahan
export const handleKelurahan = async (req, res) => {
  const username = req?.auth?.username || "";
  const oPayload = { ...req.query, ...req.body };
  const kode_kecamatan = (oPayload.kode_kecamatan || oPayload.id_kecamatan || oPayload.district_id || "").trim();

  try {
    let data = [];
    const hasTable = await DB.schema.hasTable("mst_kelurahan");
    if (hasTable) {
      if (kode_kecamatan) {
        data = await DB("mst_kelurahan")
          .select("kode", "kode_kecamatan", "nama")
          .where("kode_kecamatan", kode_kecamatan)
          .orderBy("nama", "asc");
      } else {
        data = await DB("mst_kelurahan").select("kode", "kode_kecamatan", "nama").orderBy("nama", "asc").limit(100);
      }
    }

    if ((!data || data.length === 0) && kode_kecamatan) {
      const raw = await fetchFallback(`kel_${kode_kecamatan}`, `${BASE_URL}/villages/${kode_kecamatan}.json`);
      data = raw.map((l) => ({ kode: String(l.id), kode_kecamatan: String(l.district_id || kode_kecamatan), nama: l.name }));
    }

    const formatted = data.map((l) => ({
      id: String(l.kode),
      kode: String(l.kode),
      kode_kecamatan: String(l.kode_kecamatan),
      district_id: String(l.kode_kecamatan),
      nama: l.nama,
      name: l.nama,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "OK",
      datetime: formatDateSystem(),
      data: formatted,
    });
  } catch (error) {
    Logging(error, { file: "/master/wilayah.js", func: "kelurahan", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal memuat data kelurahan/desa",
      datetime: formatDateSystem(),
    });
  }
};

// Generic dispatch router
router.all("/provinsi", handleProvinsi);
router.all("/kota", handleKabupaten);
router.all("/kabupaten", handleKabupaten);
router.all("/kecamatan", handleKecamatan);
router.all("/kelurahan", handleKelurahan);

export default router;
