/**
 * @copyright (c) 2026 PT Marstech Global
 * @project Sistem Klinik Kecantikan
 * @file rekam_medis_pasien.js
 * @description Endpoint riwayat rekam medis per pasien (trx_kunjungan -> trx_rekam_medis -> trx_rekam_medis_ruangan -> trx_rekam_medis_foto)
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

/**
 * Helper validasi karyawan aktif & warning jika penanggung jawab rekam medis bukan dokter
 */
export const validateKaryawanPenanggungJawab = async (kode_karyawan, expectedRole = 'dokter') => {
  if (!kode_karyawan) return { valid: false, message: "Kode karyawan wajib diisi" };

  const karyawan = await DB("mst_karyawan")
    .where("kode_karyawan", kode_karyawan)
    .first();

  if (!karyawan) {
    return { valid: false, message: `Kode karyawan '${kode_karyawan}' tidak ditemukan di mst_karyawan` };
  }

  if (karyawan.status !== "aktif") {
    return { valid: false, message: `Karyawan '${karyawan.nama}' (${kode_karyawan}) berstatus ${karyawan.status}` };
  }

  let warning = null;
  if (expectedRole === 'dokter' && karyawan.jabatan !== 'dokter') {
    warning = `Penanggung jawab '${karyawan.nama}' berjabatan ${karyawan.jabatan}, bukan dokter`;
  }

  return { valid: true, karyawan, warning };
};

const handleGetRekamMedis = async (req, res) => {
  const oPayload = { ...req.query, ...req.body, ...req.params };
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  const no_rm = (oPayload.no_rm || "").trim();
  const page = parseInt(oPayload.page, 10) || 1;
  const perPage = parseInt(oPayload.perPage, 10) || 10;
  const offset = (page - 1) * perPage;

  const tanggal_dari = oPayload.tanggal_dari || null;
  const tanggal_sampai = oPayload.tanggal_sampai || null;
  const filterDokter = oPayload.kode_dokter || null;
  const filterStatus = oPayload.status || null;

  const keyword = (oPayload.keyword || "").trim();
  const exclude_kode_kunjungan = (oPayload.exclude_kode_kunjungan || "").trim();
  const only_selesai = oPayload.only_selesai === true || oPayload.only_selesai === 'true' || oPayload.only_selesai === 1 || oPayload.only_selesai === '1';

  try {
    // 1. Fetch form field labels map (kode_ruangan -> field_key -> label_field)
    const masterFormFields = await DB("mst_ruangan_form").select("kode_ruangan", "field_key", "label_field");
    const labelMap = {};
    masterFormFields.forEach((f) => {
      if (!labelMap[f.kode_ruangan]) labelMap[f.kode_ruangan] = {};
      if (f.field_key) {
        labelMap[f.kode_ruangan][f.field_key] = f.label_field;
      }
    });

    // Resolusi dokter identifier (kode_karyawan dan no_sip) agar filter dokter akurat
    let dokterIdentifiers = [];
    if (filterDokter) {
      dokterIdentifiers.push(filterDokter);
      const dokterRow = await DB("mst_karyawan")
        .where("kode_karyawan", filterDokter)
        .orWhere("no_sip", filterDokter)
        .first();
      if (dokterRow) {
        if (dokterRow.kode_karyawan) dokterIdentifiers.push(dokterRow.kode_karyawan);
        if (dokterRow.no_sip) dokterIdentifiers.push(dokterRow.no_sip);
      }
      dokterIdentifiers = [...new Set(dokterIdentifiers.filter(Boolean))];
    }

    // 2. Count total kunjungan pasien (driving table trx_kunjungan)
    const countQuery = DB("trx_kunjungan as k")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("trx_rekam_medis as rm", "k.kode_kunjungan", "rm.kode_kunjungan")
      .leftJoin("trx_rekam_medis_ruangan as rmr", "k.kode_kunjungan", "rmr.kode_kunjungan")
      .leftJoin("trx_antrian_layanan as al", "k.kode_kunjungan", "al.kode_kunjungan")
      .modify((qb) => {
        if (branchCode) qb.where("k.kode_cabang", branchCode);
        if (no_rm) qb.where("k.no_rm", no_rm);
        if (exclude_kode_kunjungan) qb.whereNot("k.kode_kunjungan", exclude_kode_kunjungan);
        if (only_selesai) {
          qb.where("k.status", "selesai");
        } else if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("k.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim()) {
            qb.where("k.status", filterStatus.trim());
          }
        } else {
          qb.where("k.status", "!=", "batal");
        }
        if (filterDokter && dokterIdentifiers.length > 0) {
          qb.where(function () {
            this.whereIn("rm.kode_karyawan", dokterIdentifiers)
              .orWhereIn("rm.no_sip", dokterIdentifiers)
              .orWhereIn("rmr.kode_karyawan", dokterIdentifiers)
              .orWhereIn("al.kode_karyawan", dokterIdentifiers);

            dokterIdentifiers.forEach((idVal) => {
              this.orWhereRaw("rm.no_sip LIKE ?", [`${idVal}%`])
                .orWhereRaw("rm.kode_karyawan LIKE ?", [`${idVal}%`])
                .orWhereRaw("rmr.kode_karyawan LIKE ?", [`${idVal}%`])
                .orWhereRaw("al.kode_karyawan LIKE ?", [`${idVal}%`]);
            });
          });
        }
        if (tanggal_dari) {
          qb.where("k.tanggal_kunjungan", ">=", tanggal_dari);
        }
        if (tanggal_sampai) {
          qb.where("k.tanggal_kunjungan", "<=", tanggal_sampai);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_kunjungan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nik) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.diagnosis) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.keluhan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.riwayat_alergi) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.nama_ruangan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_tindakan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_petugas) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_hasil_treatment) LIKE ?", [`%${lower}%`]);
          });
        }
      })
      .countDistinct("k.id as total")
      .first();

    const countRes = await countQuery;
    const totalRecords = parseInt(countRes?.total || 0, 10);

    // 3. Ambil list kunjungan
    const vaKunjungan = await DB("trx_kunjungan as k")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("trx_rekam_medis as rm", "k.kode_kunjungan", "rm.kode_kunjungan")
      .leftJoin("trx_rekam_medis_ruangan as rmr", "k.kode_kunjungan", "rmr.kode_kunjungan")
      .leftJoin("trx_antrian_layanan as al", "k.kode_kunjungan", "al.kode_kunjungan")
      .groupBy("k.id", "p.id")
      .modify((qb) => {
        if (branchCode) qb.where("k.kode_cabang", branchCode);
        if (no_rm) qb.where("k.no_rm", no_rm);
        if (exclude_kode_kunjungan) qb.whereNot("k.kode_kunjungan", exclude_kode_kunjungan);
        if (only_selesai) {
          qb.where("k.status", "selesai");
        } else if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("k.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim()) {
            qb.where("k.status", filterStatus.trim());
          }
        } else {
          qb.where("k.status", "!=", "batal");
        }
        if (filterDokter && dokterIdentifiers.length > 0) {
          qb.where(function () {
            this.whereIn("rm.kode_karyawan", dokterIdentifiers)
              .orWhereIn("rm.no_sip", dokterIdentifiers)
              .orWhereIn("rmr.kode_karyawan", dokterIdentifiers)
              .orWhereIn("al.kode_karyawan", dokterIdentifiers);

            dokterIdentifiers.forEach((idVal) => {
              this.orWhereRaw("rm.no_sip LIKE ?", [`${idVal}%`])
                .orWhereRaw("rm.kode_karyawan LIKE ?", [`${idVal}%`])
                .orWhereRaw("rmr.kode_karyawan LIKE ?", [`${idVal}%`])
                .orWhereRaw("al.kode_karyawan LIKE ?", [`${idVal}%`]);
            });
          });
        }
        if (tanggal_dari) {
          qb.where("k.tanggal_kunjungan", ">=", tanggal_dari);
        }
        if (tanggal_sampai) {
          qb.where("k.tanggal_kunjungan", "<=", tanggal_sampai);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_kunjungan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nik) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.diagnosis) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.keluhan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.riwayat_alergi) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.nama_ruangan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_tindakan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_petugas) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_hasil_treatment) LIKE ?", [`%${lower}%`]);
          });
        }
      })
      .select(
        "k.id as kunjungan_id",
        "k.kode_kunjungan",
        "k.no_rm",
        "k.tanggal_kunjungan",
        "k.jam_datang",
        "k.status as status_kunjungan",
        "k.created_at",
        "p.nama as nama_pasien",
        "p.nik",
        "p.jenis_kelamin",
        "p.tempat_lahir",
        "p.tanggal_lahir",
        "p.golongan_darah",
        "p.agama",
        "p.status_perkawinan",
        "p.pekerjaan",
        "p.provinsi",
        "p.kota_kabupaten",
        "p.kecamatan",
        "p.kelurahan_desa",
        "p.patokan",
        "p.kode_pos",
        "p.no_hp",
        "p.email",
        "p.alergi"
      )
      .orderBy("k.tanggal_kunjungan", "desc")
      .orderBy("k.jam_datang", "desc")
      .orderBy("k.id", "desc")
      .limit(perPage)
      .offset(offset);

    const kodeKunjunganList = vaKunjungan.map((k) => k.kode_kunjungan).filter(Boolean);

    let mapLayanan = {};
    let headerRmMap = {};

    if (kodeKunjunganList.length > 0) {
      // 4. Ambil header trx_rekam_medis per kunjungan
      const vaHeaderRM = await DB("trx_rekam_medis as rm")
        .leftJoin("trx_kunjungan as k", "rm.kode_kunjungan", "k.kode_kunjungan")
        .leftJoin("trx_booking as b", "k.kode_booking", "b.kode_booking")
        .leftJoin("mst_jadwal_karyawan as j_book", "b.kode_jadwal", "j_book.kode_jadwal")
        .leftJoin("mst_karyawan as kar_book", function () {
          this.on("j_book.no_sip", "=", "kar_book.no_sip")
            .orOn("j_book.no_sip", "=", "kar_book.kode_karyawan")
            .orOn(DB.raw("kar_book.no_sip = SUBSTRING_INDEX(j_book.no_sip, '#', 1)"));
        })
        .leftJoin("mst_karyawan as d", function () {
          this.on("rm.kode_karyawan", "=", "d.kode_karyawan")
            .orOn("rm.kode_karyawan", "=", "d.no_sip")
            .orOn("rm.kode_karyawan", "=", "d.kode_user")
            .orOn("rm.no_sip", "=", "d.no_sip")
            .orOn("rm.no_sip", "=", "d.kode_karyawan")
            .orOn(DB.raw("d.no_sip = SUBSTRING_INDEX(rm.no_sip, '#', 1)"))
            .orOn(DB.raw("d.no_sip = SUBSTRING_INDEX(rm.kode_karyawan, '#', 1)"));
        })
        .whereIn("rm.kode_kunjungan", kodeKunjunganList)
        .select(
          "rm.id as header_rm_id",
          "rm.kode_kunjungan",
          "rm.kode_rekam_medis",
          "rm.no_rm",
          "rm.no_sip",
          "rm.keluhan",
          "rm.durasi_keluhan",
          "rm.riwayat_alergi",
          "rm.riwayat_treatment",
          "rm.pemeriksaan_acne",
          "rm.pemeriksaan_inflammation",
          "rm.pemeriksaan_skin_type",
          "rm.pemeriksaan_pigmentation",
          "rm.pemeriksaan_sensitivity",
          "rm.diagnosis",
          "rm.subjective",
          "rm.objective",
          "rm.assessment",
          "rm.plan",
          "rm.kode_karyawan",
          DB.raw("COALESCE(d.nama, kar_book.nama) as dokter_nama"),
          DB.raw("COALESCE(d.jabatan, kar_book.jabatan) as dokter_jabatan")
        );

      const rmHeaderIds = [];
      vaHeaderRM.forEach((h) => {
        headerRmMap[h.kode_kunjungan] = h;
        rmHeaderIds.push(h.header_rm_id);
      });

      // 5. Ambil data sesi antrian layanan per kunjungan
      const vaAntrianLayanan = await DB("trx_antrian_layanan as al")
        .leftJoin("trx_kunjungan as k", "al.kode_kunjungan", "k.kode_kunjungan")
        .leftJoin("trx_booking as b", "k.kode_booking", "b.kode_booking")
        .leftJoin("mst_jadwal_karyawan as j_book", "b.kode_jadwal", "j_book.kode_jadwal")
        .leftJoin("mst_karyawan as kar_book", function () {
          this.on("j_book.no_sip", "=", "kar_book.no_sip")
            .orOn("j_book.no_sip", "=", "kar_book.kode_karyawan")
            .orOn(DB.raw("kar_book.no_sip = SUBSTRING_INDEX(j_book.no_sip, '#', 1)"));
        })
        .leftJoin("mst_karyawan as p", function () {
          this.on("al.kode_karyawan", "=", "p.kode_karyawan")
            .orOn("al.kode_karyawan", "=", "p.no_sip")
            .orOn("al.kode_karyawan", "=", "p.kode_user")
            .orOn(DB.raw("p.no_sip = SUBSTRING_INDEX(al.kode_karyawan, '#', 1)"));
        })
        .leftJoin("trx_detail_antrian_layanan as dal", "al.kode_antrian_layanan", "dal.kode_antrian_layanan")
        .whereIn("al.kode_kunjungan", kodeKunjunganList)
        .select(
          "al.kode_antrian_layanan",
          "al.kode_kunjungan",
          "al.kode_ruangan",
          "al.nama_ruangan",
          "al.catatan_petugas as al_catatan_petugas",
          "al.status as al_status",
          "al.dipanggil_at",
          "al.selesai_at",
          "al.kode_karyawan as al_kode_karyawan",
          "al.hasil_form as al_hasil_form",
          DB.raw("COALESCE(p.nama, kar_book.nama) as petugas_nama"),
          DB.raw("COALESCE(p.jabatan, kar_book.jabatan) as petugas_jabatan"),
          "j_book.no_sip as booking_no_sip",
          "kar_book.nama as booking_nama_petugas",
          "kar_book.jabatan as booking_jabatan_petugas",
          "dal.nama_layanan as dal_nama_layanan",
          "dal.jenis_layanan as dal_jenis_layanan",
          "dal.harga"
        );

      vaAntrianLayanan.forEach((al) => {
        const kKunjungan = al.kode_kunjungan;
        if (!mapLayanan[kKunjungan]) mapLayanan[kKunjungan] = {};
        const key = al.kode_antrian_layanan;
        const headerRM = headerRmMap[kKunjungan] || {};

        let parsedAlForm = {};
        if (al.al_hasil_form) {
          try {
            parsedAlForm = typeof al.al_hasil_form === "string" ? JSON.parse(al.al_hasil_form) : al.al_hasil_form;
          } catch (_) {
            parsedAlForm = {};
          }
        }

        const terapisList = Array.isArray(parsedAlForm.terapis_pendamping) && parsedAlForm.terapis_pendamping.length > 0
          ? parsedAlForm.terapis_pendamping
          : (Array.isArray(parsedAlForm.petugas_pendamping) ? parsedAlForm.petugas_pendamping : []);

        const dokterInfo = parsedAlForm.dokter_pelaksana || (
          al.petugas_nama || al.booking_nama_petugas || al.al_kode_karyawan ? {
            nama: al.petugas_nama || al.booking_nama_petugas || al.al_kode_karyawan,
            no_sip: al.al_kode_karyawan || al.booking_no_sip || "-",
            jabatan: al.petugas_jabatan || al.booking_jabatan_petugas || "Dokter",
          } : (headerRM.dokter_nama ? {
            nama: headerRM.dokter_nama,
            no_sip: headerRM.no_sip || headerRM.kode_karyawan || "-",
            jabatan: headerRM.dokter_jabatan || "Dokter",
          } : null)
        );

        const daftarPetugas = [];
        if (dokterInfo && dokterInfo.nama) {
          daftarPetugas.push({
            nama: dokterInfo.nama,
            role: (dokterInfo.jabatan || 'DOKTER').toUpperCase(),
            jabatan: dokterInfo.jabatan || 'Dokter',
            no_sip: dokterInfo.no_sip || '-',
            is_dokter_pj: true,
          });
        }
        terapisList.forEach((t) => {
          if (t && (t.nama || t.nama_petugas)) {
            const tName = t.nama || t.nama_petugas;
            if (!daftarPetugas.some((p) => p.nama === tName)) {
              daftarPetugas.push({
                nama: tName,
                role: (t.role || t.jabatan || 'TERAPIS').toUpperCase(),
                jabatan: t.jabatan || 'Terapis',
                no_sip: t.no_sip || t.sip || '-',
                shift: t.shift || (t.jam_mulai && t.jam_selesai ? `${t.jam_mulai.slice(0, 5)} - ${t.jam_selesai.slice(0, 5)}` : ''),
                is_dokter_pj: false,
              });
            }
          }
        });

        mapLayanan[kKunjungan][key] = {
          kode_antrian_layanan: al.kode_antrian_layanan,
          kode_rekam_medis_ruangan: null,
          nama_layanan: al.dal_nama_layanan || al.nama_ruangan || "Pelayanan Klinik",
          jenis_layanan: al.dal_jenis_layanan || "layanan",
          harga: parseFloat(al.harga || 0),
          kode_ruangan: al.kode_ruangan,
          nama_ruangan: al.nama_ruangan || "Ruangan Treatment",
          status: al.al_status || "selesai",
          dipanggil_at: al.dipanggil_at || null,
          selesai_at: al.selesai_at || null,
          catatan_tindakan: null,
          catatan_petugas: al.al_catatan_petugas || null,
          catatan_hasil_treatment: null,
          terapis_pendamping: terapisList,
          daftar_petugas: daftarPetugas,
          petugas: dokterInfo || (al.al_kode_karyawan
            ? {
                kode_karyawan: al.al_kode_karyawan,
                nama: al.petugas_nama || al.al_kode_karyawan,
                jabatan: al.petugas_jabatan || "petugas",
              }
            : null),
          rekam_medis: {
            kode_rekam_medis: headerRM.kode_rekam_medis || `RM-${headerRM.header_rm_id || key}`,
            no_sip: headerRM.no_sip || null,
            keluhan: headerRM.keluhan || "-",
            durasi_keluhan: headerRM.durasi_keluhan || null,
            riwayat_alergi: headerRM.riwayat_alergi || null,
            riwayat_treatment: headerRM.riwayat_treatment || null,
            pemeriksaan_acne: headerRM.pemeriksaan_acne || null,
            pemeriksaan_inflammation: headerRM.pemeriksaan_inflammation || null,
            pemeriksaan_skin_type: headerRM.pemeriksaan_skin_type || null,
            pemeriksaan_pigmentation: headerRM.pemeriksaan_pigmentation || null,
            pemeriksaan_sensitivity: headerRM.pemeriksaan_sensitivity || null,
            diagnosis: headerRM.diagnosis || "-",
            subjective: headerRM.subjective || null,
            objective: headerRM.objective || null,
            assessment: headerRM.assessment || null,
            plan: headerRM.plan || null,
            data_form: {},
            formatted_data_form: [],
            fotos: [],
            dokter_penanggung_jawab: headerRM.kode_karyawan || headerRM.dokter_nama
              ? {
                  kode_karyawan: headerRM.kode_karyawan || headerRM.no_sip,
                  nama: headerRM.dokter_nama || headerRM.kode_karyawan,
                  jabatan: headerRM.dokter_jabatan || "dokter",
                }
              : null,
          },
        };
      });

      // 6. Ambil data terstruktur per ruangan dari trx_rekam_medis_ruangan
      const vaRuanganRows = await DB("trx_rekam_medis_ruangan as rmr")
        .leftJoin("trx_kunjungan as k", "rmr.kode_kunjungan", "k.kode_kunjungan")
        .leftJoin("trx_booking as b", "k.kode_booking", "b.kode_booking")
        .leftJoin("mst_jadwal_karyawan as j_book", "b.kode_jadwal", "j_book.kode_jadwal")
        .leftJoin("mst_karyawan as kar_book", function () {
          this.on("j_book.no_sip", "=", "kar_book.no_sip")
            .orOn("j_book.no_sip", "=", "kar_book.kode_karyawan")
            .orOn(DB.raw("kar_book.no_sip = SUBSTRING_INDEX(j_book.no_sip, '#', 1)"));
        })
        .leftJoin("mst_karyawan as p", function () {
          this.on("rmr.kode_karyawan", "=", "p.no_sip")
            .orOn("rmr.kode_karyawan", "=", "p.kode_user")
            .orOn("rmr.kode_karyawan", "=", "p.kode_karyawan")
            .orOn(DB.raw("p.no_sip = SUBSTRING_INDEX(rmr.kode_karyawan, '#', 1)"));
        })
        .leftJoin("trx_antrian_layanan as al", "rmr.kode_antrian_layanan", "al.kode_antrian_layanan")
        .leftJoin("trx_detail_antrian_layanan as dal", "al.kode_antrian_layanan", "dal.kode_antrian_layanan")
        .whereIn("rmr.kode_kunjungan", kodeKunjunganList)
        .select(
          "rmr.id as rmr_id",
          "rmr.id_rekam_medis",
          "rmr.kode_rekam_medis_ruangan",
          "rmr.kode_kunjungan",
          "rmr.kode_antrian_layanan",
          "rmr.kode_ruangan",
          "rmr.nama_ruangan",
          "rmr.data_form",
          "rmr.catatan_tindakan",
          "rmr.catatan_petugas",
          "rmr.catatan_hasil_treatment",
          "rmr.status as status_ruangan",
          "rmr.created_at",
          "rmr.kode_karyawan as rmr_kode_karyawan",
          "al.hasil_form as al_hasil_form",
          DB.raw("COALESCE(p.nama, kar_book.nama) as petugas_nama"),
          DB.raw("COALESCE(p.jabatan, kar_book.jabatan) as petugas_jabatan"),
          "j_book.no_sip as booking_no_sip",
          "kar_book.nama as booking_nama_petugas",
          "kar_book.jabatan as booking_jabatan_petugas",
          "dal.nama_layanan",
          "dal.jenis_layanan",
          "dal.harga",
          "al.dipanggil_at",
          "al.selesai_at"
        );

      const rmrIds = vaRuanganRows.map((r) => r.rmr_id);

      // Fetch foto before/after via id_rekam_medis_ruangan (atau id_rekam_medis fallback)
      let mapFotosRmr = {};
      if (rmrIds.length > 0 || rmHeaderIds.length > 0) {
        const fotoRows = await DB("trx_rekam_medis_foto")
          .modify((qb) => {
            if (rmrIds.length > 0 && rmHeaderIds.length > 0) {
              qb.whereIn("id_rekam_medis_ruangan", rmrIds).orWhereIn("id_rekam_medis", rmHeaderIds);
            } else if (rmrIds.length > 0) {
              qb.whereIn("id_rekam_medis_ruangan", rmrIds);
            } else {
              qb.whereIn("id_rekam_medis", rmHeaderIds);
            }
          })
          .select("*");

        fotoRows.forEach((f) => {
          const targetKey = f.id_rekam_medis_ruangan ? `RMR_${f.id_rekam_medis_ruangan}` : `RM_${f.id_rekam_medis}`;
          if (!mapFotosRmr[targetKey]) mapFotosRmr[targetKey] = [];

          const existingIdx = mapFotosRmr[targetKey].findIndex((x) => x.tipe === f.tipe);
          if (existingIdx !== -1) {
            mapFotosRmr[targetKey][existingIdx] = { id: f.id, tipe: f.tipe, url_foto: f.url_foto };
          } else {
            mapFotosRmr[targetKey].push({ id: f.id, tipe: f.tipe, url_foto: f.url_foto });
          }
        });
      }

      // Merge data dari trx_rekam_medis_ruangan
      vaRuanganRows.forEach((item) => {
        const kKunjungan = item.kode_kunjungan;
        if (!mapLayanan[kKunjungan]) mapLayanan[kKunjungan] = {};

        const headerRM = headerRmMap[kKunjungan] || {};
        const keyRuangan = item.kode_antrian_layanan || item.kode_rekam_medis_ruangan || `RMR-${item.rmr_id}`;

        let parsedDataForm = {};
        if (item.data_form) {
          try {
            parsedDataForm = typeof item.data_form === "string" ? JSON.parse(item.data_form) : item.data_form;
          } catch (_) {
            parsedDataForm = {};
          }
        }
        let parsedAlForm = {};
        if (item.al_hasil_form) {
          try {
            parsedAlForm = typeof item.al_hasil_form === "string" ? JSON.parse(item.al_hasil_form) : item.al_hasil_form;
          } catch (_) {
            parsedAlForm = {};
          }
        }

        const terapisList = Array.isArray(parsedDataForm.terapis_pendamping) && parsedDataForm.terapis_pendamping.length > 0
          ? parsedDataForm.terapis_pendamping
          : (Array.isArray(parsedAlForm.terapis_pendamping) && parsedAlForm.terapis_pendamping.length > 0
              ? parsedAlForm.terapis_pendamping
              : (Array.isArray(parsedDataForm.petugas_pendamping) ? parsedDataForm.petugas_pendamping : []));

        const dokterInfo = parsedDataForm.dokter_pelaksana || parsedAlForm.dokter_pelaksana || (
          item.petugas_nama || item.booking_nama_petugas || item.rmr_kode_karyawan
            ? {
                nama: item.petugas_nama || item.booking_nama_petugas || item.rmr_kode_karyawan,
                no_sip: item.rmr_kode_karyawan || item.booking_no_sip || "-",
                jabatan: item.petugas_jabatan || item.booking_jabatan_petugas || "Dokter",
              }
            : (headerRM.dokter_nama ? {
                nama: headerRM.dokter_nama,
                no_sip: headerRM.no_sip || headerRM.kode_karyawan || "-",
                jabatan: headerRM.dokter_jabatan || "Dokter",
              } : null)
        );

        const daftarPetugas = [];
        if (dokterInfo && dokterInfo.nama) {
          daftarPetugas.push({
            nama: dokterInfo.nama,
            role: (dokterInfo.jabatan || 'DOKTER').toUpperCase(),
            jabatan: dokterInfo.jabatan || 'Dokter',
            no_sip: dokterInfo.no_sip || '-',
            is_dokter_pj: true,
          });
        }
        terapisList.forEach((t) => {
          if (t && (t.nama || t.nama_petugas)) {
            const tName = t.nama || t.nama_petugas;
            if (!daftarPetugas.some((p) => p.nama === tName)) {
              daftarPetugas.push({
                nama: tName,
                role: (t.role || t.jabatan || 'TERAPIS').toUpperCase(),
                jabatan: t.jabatan || 'Terapis',
                no_sip: t.no_sip || t.sip || '-',
                shift: t.shift || (t.jam_mulai && t.jam_selesai ? `${t.jam_mulai.slice(0, 5)} - ${t.jam_selesai.slice(0, 5)}` : ''),
                is_dokter_pj: false,
              });
            }
          }
        });

        const roomLabels = labelMap[item.kode_ruangan] || {};
        const formattedForm = Object.entries(parsedDataForm || {})
          .filter(([k]) => !['terapis_pendamping', 'petugas_pendamping', 'dokter_pelaksana', 'foto_before', 'foto_after'].includes(k))
          .map(([k, v]) => {
            const label = roomLabels[k] || k.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            return { key: k, label: label, value: v };
          });

        const fotosRoom = mapFotosRmr[`RMR_${item.rmr_id}`] || mapFotosRmr[`RM_${item.id_rekam_medis}`] || [];

        mapLayanan[kKunjungan][keyRuangan] = {
          kode_antrian_layanan: item.kode_antrian_layanan || keyRuangan,
          kode_rekam_medis_ruangan: item.kode_rekam_medis_ruangan,
          nama_layanan: item.nama_layanan || mapLayanan[kKunjungan]?.[keyRuangan]?.nama_layanan || "Sesi Pelayanan Ruangan",
          jenis_layanan: item.jenis_layanan || mapLayanan[kKunjungan]?.[keyRuangan]?.jenis_layanan || "layanan",
          harga: parseFloat(item.harga || mapLayanan[kKunjungan]?.[keyRuangan]?.harga || 0),
          kode_ruangan: item.kode_ruangan || mapLayanan[kKunjungan]?.[keyRuangan]?.kode_ruangan,
          nama_ruangan: item.nama_ruangan || mapLayanan[kKunjungan]?.[keyRuangan]?.nama_ruangan || "Ruangan Treatment",
          status: item.status_ruangan || "selesai",
          dipanggil_at: item.dipanggil_at || mapLayanan[kKunjungan]?.[keyRuangan]?.dipanggil_at || null,
          selesai_at: item.selesai_at || mapLayanan[kKunjungan]?.[keyRuangan]?.selesai_at || null,
          catatan_tindakan: item.catatan_tindakan || null,
          catatan_petugas: item.catatan_petugas || null,
          catatan_hasil_treatment: item.catatan_hasil_treatment || null,
          terapis_pendamping: terapisList,
          daftar_petugas: daftarPetugas.length > 0 ? daftarPetugas : (mapLayanan[kKunjungan]?.[keyRuangan]?.daftar_petugas || []),
          petugas: dokterInfo || (item.rmr_kode_karyawan
            ? {
                kode_karyawan: item.rmr_kode_karyawan,
                nama: item.petugas_nama || item.booking_nama_petugas || item.rmr_kode_karyawan,
                jabatan: item.petugas_jabatan || item.booking_jabatan_petugas || "petugas",
              }
            : mapLayanan[kKunjungan]?.[keyRuangan]?.petugas || null),
          rekam_medis: {
            kode_rekam_medis: headerRM.kode_rekam_medis || `RM-${headerRM.header_rm_id || item.rmr_id}`,
            no_sip: headerRM.no_sip || null,
            keluhan: headerRM.keluhan || "-",
            durasi_keluhan: headerRM.durasi_keluhan || null,
            riwayat_alergi: headerRM.riwayat_alergi || null,
            riwayat_treatment: headerRM.riwayat_treatment || null,
            pemeriksaan_acne: headerRM.pemeriksaan_acne || null,
            pemeriksaan_inflammation: headerRM.pemeriksaan_inflammation || null,
            pemeriksaan_skin_type: headerRM.pemeriksaan_skin_type || null,
            pemeriksaan_pigmentation: headerRM.pemeriksaan_pigmentation || null,
            pemeriksaan_sensitivity: headerRM.pemeriksaan_sensitivity || null,
            diagnosis: headerRM.diagnosis || "-",
            subjective: headerRM.subjective || null,
            objective: headerRM.objective || null,
            assessment: headerRM.assessment || null,
            plan: headerRM.plan || null,
            data_form: parsedDataForm,
            formatted_data_form: formattedForm,
            fotos: fotosRoom,
            dokter_penanggung_jawab: (headerRM.kode_karyawan || headerRM.dokter_nama)
              ? {
                  kode_karyawan: headerRM.kode_karyawan || headerRM.no_sip,
                  nama: headerRM.dokter_nama || headerRM.kode_karyawan,
                  jabatan: headerRM.dokter_jabatan || "dokter",
                }
              : null,
          },
        };
      });
    }

    // 6. Assemble Kunjungan Records
    const kunjunganMap = {};
    vaKunjungan.forEach((k) => {
      const headerRM = headerRmMap[k.kode_kunjungan] || {};
      const layananList = mapLayanan[k.kode_kunjungan] ? Object.values(mapLayanan[k.kode_kunjungan]) : [];

      // Resolusi dokter dan terapis terlengkap
      let resolvedDokterNama = headerRM.dokter_nama || null;
      let resolvedDokterJabatan = headerRM.dokter_jabatan || null;
      let resolvedNoSip = headerRM.no_sip || null;
      const allDaftarPetugas = [];
      const allTerapisList = [];

      layananList.forEach((lay) => {
        if (!resolvedDokterNama) {
          if (lay.petugas?.nama) {
            resolvedDokterNama = lay.petugas.nama;
            resolvedDokterJabatan = lay.petugas.jabatan || 'Dokter';
            resolvedNoSip = lay.petugas.no_sip || lay.petugas.kode_karyawan || resolvedNoSip;
          } else if (lay.rekam_medis?.dokter_penanggung_jawab?.nama) {
            resolvedDokterNama = lay.rekam_medis.dokter_penanggung_jawab.nama;
            resolvedDokterJabatan = lay.rekam_medis.dokter_penanggung_jawab.jabatan || 'Dokter';
          }
        }
        if (Array.isArray(lay.daftar_petugas)) {
          lay.daftar_petugas.forEach((dp) => {
            if (dp && dp.nama && !allDaftarPetugas.some((x) => x.nama === dp.nama)) {
              allDaftarPetugas.push(dp);
            }
          });
        }
        if (Array.isArray(lay.terapis_pendamping)) {
          lay.terapis_pendamping.forEach((tp) => {
            if (tp && (tp.nama || tp.nama_petugas)) {
              const tpName = tp.nama || tp.nama_petugas;
              if (!allTerapisList.some((x) => (x.nama || x.nama_petugas) === tpName)) {
                allTerapisList.push(tp);
              }
            }
          });
        }
      });

      if (!resolvedDokterNama && allDaftarPetugas.length > 0) {
        const pj = allDaftarPetugas.find((p) => p.is_dokter_pj || p.role === 'DOKTER') || allDaftarPetugas[0];
        if (pj) {
          resolvedDokterNama = pj.nama;
          resolvedDokterJabatan = pj.jabatan || 'Dokter';
          resolvedNoSip = pj.no_sip;
        }
      }

      const mergedHeaderRM = {
        ...headerRM,
        dokter_nama: resolvedDokterNama,
        dokter_jabatan: resolvedDokterJabatan,
        no_sip: resolvedNoSip,
        daftar_petugas: allDaftarPetugas,
        terapis_list: allTerapisList,
      };

      kunjunganMap[k.kode_kunjungan] = {
        kode_kunjungan: k.kode_kunjungan,
        no_rm: k.no_rm,
        nama_pasien: k.nama_pasien || "-",
        dokter_nama: resolvedDokterNama || headerRM.dokter_nama || "-",
        dokter_jabatan: resolvedDokterJabatan || headerRM.dokter_jabatan || "-",
        nik: k.nik || "-",
        jenis_kelamin: k.jenis_kelamin || "-",
        tanggal_lahir: k.tanggal_lahir || null,
        no_hp: k.no_hp || "-",
        alergi: k.alergi || null,
        tanggal_kunjungan: k.tanggal_kunjungan,
        jam_datang: k.jam_datang ? String(k.jam_datang).slice(0, 5) : "-",
        status_kunjungan: k.status_kunjungan || "selesai",
        header_rekam_medis: mergedHeaderRM,
        layanan: layananList,
      };
    });

    const resultData = Object.values(kunjunganMap).sort((a, b) =>
      a.tanggal_kunjungan < b.tanggal_kunjungan ? 1 : -1
    );

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data riwayat rekam medis berhasil dimuat",
      datetime: formatDateSystem(),
      total_data: totalRecords,
      data: resultData,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/rekam_medis/rekam_medis_pasien.js",
      func: "get_rekam_medis",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
};

router.get("/:no_rm", handleGetRekamMedis);
router.post("/:no_rm", handleGetRekamMedis);
router.post("/", handleGetRekamMedis);

export default router;
