"use client";

import express from "express";
import Joi from "joi";
import { status } from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

// Data Dummy Laporan Tiket Servis
const dummyTickets = [
  // ─── TANGGAL HARI INI (2026-09-16) ───
  {
    id: 101,
    kode: "TKT26090001",
    kode_induk: null,
    tanggal_transaksi: "2026-09-16",
    kode_pelanggan: "PEL001",
    nama_pelanggan: "Budi Gunawan",
    kode_teknisi: "TEK001",
    nama_teknisi: "Soni Alamsyah",
    model_perangkat: "iPhone 14 Pro",
    imei_sn: "IMEI-14P-998811",
    status_fisik: "Mulus",
    keluhan_awal: "Layar pecah & blank hitam",
    diagnosa_teknisi: "Ganti modul OLED display original",
    kategori_servis: "Ringan",
    status: "selesai",
    jenis_tiket: "Premium",
    status_pembayaran: "Lunas",
    created_at: "2026-09-16 09:15:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 2100000,
    total_biaya_jasa: 350000,
    subtotal: 2450000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 269500,
    grandtotal: 2719500
  },
  {
    id: 102,
    kode: "TKT26090002",
    kode_induk: null,
    tanggal_transaksi: "2026-09-16",
    kode_pelanggan: "PEL002",
    nama_pelanggan: "Siti Aisyah",
    kode_teknisi: "TEK002",
    nama_teknisi: "Rian Hidayat",
    model_perangkat: "Samsung Galaxy S23",
    imei_sn: "SN-S23-443322",
    status_fisik: "Lecet Pemakaian",
    keluhan_awal: "Baterai kembung & restart berulang",
    diagnosa_teknisi: "Ganti baterai OEM & kalibrasi power",
    kategori_servis: "Sedang",
    status: "pengerjaan",
    jenis_tiket: "Reguler",
    status_pembayaran: "DP",
    created_at: "2026-09-16 10:20:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 650000,
    total_biaya_jasa: 150000,
    subtotal: 800000,
    diskon_persen: 5,
    diskon_nominal: 40000,
    pajak_persen: 11,
    pajak_nominal: 83600,
    grandtotal: 843600
  },
  {
    id: 103,
    kode: "TKT26090003",
    kode_induk: null,
    tanggal_transaksi: "2026-09-16",
    kode_pelanggan: "PEL003",
    nama_pelanggan: "Ahmad Fauzi",
    kode_teknisi: "TEK003",
    nama_teknisi: "Andi Wijaya",
    model_perangkat: "iPad Pro 11 M2",
    imei_sn: "SN-IPAD-119988",
    status_fisik: "Mulus",
    keluhan_awal: "Port type-C longgar tidak bisa charge",
    diagnosa_teknisi: "Pengecekan jalur charging flex & IC charger",
    kategori_servis: "Sedang",
    status: "pengecekan",
    jenis_tiket: "Garansi",
    status_pembayaran: "Belum Bayar",
    created_at: "2026-09-16 11:05:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 300000,
    total_biaya_jasa: 200000,
    subtotal: 500000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 0,
    pajak_nominal: 0,
    grandtotal: 500000
  },
  {
    id: 104,
    kode: "TKT26090004",
    kode_induk: null,
    tanggal_transaksi: "2026-09-16",
    kode_pelanggan: "PEL004",
    nama_pelanggan: "Rina Permata",
    kode_teknisi: "TEK001",
    nama_teknisi: "Soni Alamsyah",
    model_perangkat: "MacBook Pro M2",
    imei_sn: "SN-MBP-M2-8877",
    status_fisik: "Mulus",
    keluhan_awal: "Keyboard trackpad tidak respons",
    diagnosa_teknisi: "Menunggu suku cadang topcase assembly dari supplier",
    kategori_servis: "Berat",
    status: "menunggu_suku_cadang",
    jenis_tiket: "Premium",
    status_pembayaran: "DP",
    created_at: "2026-09-16 11:45:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 3200000,
    total_biaya_jasa: 500000,
    subtotal: 3700000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 407000,
    grandtotal: 4107000
  },
  {
    id: 105,
    kode: "TKT26090005",
    kode_induk: null,
    tanggal_transaksi: "2026-09-16",
    kode_pelanggan: "PEL005",
    nama_pelanggan: "Dedi Kurniawan",
    kode_teknisi: "TEK002",
    nama_teknisi: "Rian Hidayat",
    model_perangkat: "Xiaomi 13T",
    imei_sn: "IMEI-MI13T-6655",
    status_fisik: "Lecet Pemakaian",
    keluhan_awal: "Speaker atas kresek-kresek",
    diagnosa_teknisi: "Antrean menunggu alokasi teknisi",
    kategori_servis: "Ringan",
    status: "menunggu",
    jenis_tiket: "Reguler",
    status_pembayaran: "Belum Bayar",
    created_at: "2026-09-16 12:10:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 150000,
    total_biaya_jasa: 100000,
    subtotal: 250000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 27500,
    grandtotal: 277500
  },
  {
    id: 106,
    kode: "TKT26090006",
    kode_induk: null,
    tanggal_transaksi: "2026-09-16",
    kode_pelanggan: "PEL006",
    nama_pelanggan: "Maya Sari",
    kode_teknisi: "TEK003",
    nama_teknisi: "Andi Wijaya",
    model_perangkat: "Oppo Reno 10",
    imei_sn: "IMEI-RENO10-99",
    status_fisik: "Mulus",
    keluhan_awal: "Kaca kamera retak",
    diagnosa_teknisi: "Ganti kaca kamera belakang & selesai diambil pelanggan",
    kategori_servis: "Ringan",
    status: "diambil",
    jenis_tiket: "Reguler",
    status_pembayaran: "Lunas",
    created_at: "2026-09-16 13:00:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 120000,
    total_biaya_jasa: 80000,
    subtotal: 200000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 22000,
    grandtotal: 222000
  },
  {
    id: 107,
    kode: "TKT26090007",
    kode_induk: null,
    tanggal_transaksi: "2026-09-16",
    kode_pelanggan: "PEL007",
    nama_pelanggan: "Eko Prasetyo",
    kode_teknisi: "TEK001",
    nama_teknisi: "Soni Alamsyah",
    model_perangkat: "Vivo V29",
    imei_sn: "IMEI-VIVO-V29-11",
    status_fisik: "Baret Halus",
    keluhan_awal: "Mati total tercebur air",
    diagnosa_teknisi: "Korosi berat pada motherboard, pelanggan membatalkan servis",
    kategori_servis: "Berat",
    status: "batal",
    jenis_tiket: "Reguler",
    status_pembayaran: "Belum Bayar",
    created_at: "2026-09-16 13:30:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 0,
    total_biaya_jasa: 50000,
    subtotal: 50000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 0,
    pajak_nominal: 0,
    grandtotal: 50000
  },

  // ─── TANGGAL KEMARIN (2026-09-15) ───
  {
    id: 108,
    kode: "TKT26090008",
    kode_induk: null,
    tanggal_transaksi: "2026-09-15",
    kode_pelanggan: "PEL008",
    nama_pelanggan: "Hendra Wijaya",
    kode_teknisi: "TEK001",
    nama_teknisi: "Soni Alamsyah",
    model_perangkat: "iPhone 13",
    imei_sn: "IMEI-IP13-554433",
    status_fisik: "Mulus",
    keluhan_awal: "Ganti baterai health drop 70%",
    diagnosa_teknisi: "Selesai ganti baterai original health 100%",
    kategori_servis: "Ringan",
    status: "selesai",
    jenis_tiket: "Reguler",
    status_pembayaran: "Lunas",
    created_at: "2026-09-15 10:15:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 550000,
    total_biaya_jasa: 150000,
    subtotal: 700000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 77000,
    grandtotal: 777000
  },
  {
    id: 109,
    kode: "TKT26090009",
    kode_induk: null,
    tanggal_transaksi: "2026-09-15",
    kode_pelanggan: "PEL009",
    nama_pelanggan: "Ratna Sari",
    kode_teknisi: "TEK002",
    nama_teknisi: "Rian Hidayat",
    model_perangkat: "Samsung A54",
    imei_sn: "SN-A54-998877",
    status_fisik: "Mulus",
    keluhan_awal: "Touchscreen macet di area tengah",
    diagnosa_teknisi: "Perbaikan connector LCD",
    kategori_servis: "Ringan",
    status: "selesai",
    jenis_tiket: "Garansi",
    status_pembayaran: "Lunas",
    created_at: "2026-09-15 14:00:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 0,
    total_biaya_jasa: 0,
    subtotal: 0,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 0,
    pajak_nominal: 0,
    grandtotal: 0
  },

  // ─── TANGGAL AWAL BULAN SEPTEMBER (2026-09-01 s.d 2026-09-10) ───
  {
    id: 110,
    kode: "TKT26090010",
    kode_induk: null,
    tanggal_transaksi: "2026-09-10",
    kode_pelanggan: "PEL010",
    nama_pelanggan: "Bayu Pratama",
    kode_teknisi: "TEK003",
    nama_teknisi: "Andi Wijaya",
    model_perangkat: "MacBook Air M2",
    imei_sn: "SN-MBA-M2-1122",
    status_fisik: "Mulus",
    keluhan_awal: "Speaker kanan sember",
    diagnosa_teknisi: "Ganti modul speaker kanan",
    kategori_servis: "Sedang",
    status: "selesai",
    jenis_tiket: "Premium",
    status_pembayaran: "Lunas",
    created_at: "2026-09-10 11:30:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 850000,
    total_biaya_jasa: 250000,
    subtotal: 1100000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 121000,
    grandtotal: 1221000
  },
  {
    id: 111,
    kode: "TKT26090011",
    kode_induk: null,
    tanggal_transaksi: "2026-09-02",
    kode_pelanggan: "PEL011",
    nama_pelanggan: "Dina Mariana",
    kode_teknisi: "TEK002",
    nama_teknisi: "Rian Hidayat",
    model_perangkat: "iPad Air 5",
    imei_sn: "SN-IPADAIR5-77",
    status_fisik: "Mulus",
    keluhan_awal: "Baterai drop cepat",
    diagnosa_teknisi: "Ganti baterai baru",
    kategori_servis: "Sedang",
    status: "diambil",
    jenis_tiket: "Reguler",
    status_pembayaran: "Lunas",
    created_at: "2026-09-02 15:45:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 950000,
    total_biaya_jasa: 200000,
    subtotal: 1150000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 126500,
    grandtotal: 1276500
  },

  // ─── TANGGAL AGUSTUS 2026 (DATA HISTORIS) ───
  {
    id: 1,
    kode: "TKT23110001",
    kode_induk: null,
    tanggal_transaksi: "2026-08-01",
    kode_pelanggan: "PEL001",
    nama_pelanggan: "Budi Gunawan",
    kode_teknisi: "TEK001",
    nama_teknisi: "Soni Alamsyah",
    model_perangkat: "iPhone 13 Pro",
    imei_sn: "IMEI-998877",
    status_fisik: "Mulus",
    keluhan_awal: "Layar pecah & blank",
    diagnosa_teknisi: "LCD pecah, ganti modul LCD",
    kategori_servis: "Ringan",
    status: "selesai",
    jenis_tiket: "Premium",
    status_pembayaran: "Lunas",
    created_at: "2026-08-01 10:00:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 1500000,
    total_biaya_jasa: 250000,
    subtotal: 1750000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 192500,
    grandtotal: 1942500
  },
  {
    id: 2,
    kode: "TKT23110002",
    kode_induk: null,
    tanggal_transaksi: "2026-08-02",
    kode_pelanggan: "PEL002",
    nama_pelanggan: "Ahmad Riyadi",
    kode_teknisi: "TEK002",
    nama_teknisi: "Rian Hidayat",
    model_perangkat: "Samsung S22",
    imei_sn: "SN-S22-4433",
    status_fisik: "Lecet Pemakaian",
    keluhan_awal: "Baterai kembung & cepat habis",
    diagnosa_teknisi: "Battery degradasi, ganti baterai baru",
    kategori_servis: "Ringan",
    status: "pengerjaan",
    jenis_tiket: "Reguler",
    status_pembayaran: "DP",
    created_at: "2026-08-02 11:30:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 450000,
    total_biaya_jasa: 100000,
    subtotal: 550000,
    diskon_persen: 5,
    diskon_nominal: 27500,
    pajak_persen: 11,
    pajak_nominal: 57475,
    grandtotal: 579975
  },
  {
    id: 3,
    kode: "TKT23110003",
    kode_induk: null,
    tanggal_transaksi: "2026-08-03",
    kode_pelanggan: "PEL003",
    nama_pelanggan: "Citra Lestari",
    kode_teknisi: "TEK001",
    nama_teknisi: "Soni Alamsyah",
    model_perangkat: "MacBook Air M1",
    imei_sn: "SN-MAC-M1-2211",
    status_fisik: "Mulus",
    keluhan_awal: "Keyboard mati beberapa tombol",
    diagnosa_teknisi: "Kerusakan jalur flex keyboard, ganti assembly",
    kategori_servis: "Berat",
    status: "selesai",
    jenis_tiket: "Premium",
    status_pembayaran: "Lunas",
    created_at: "2026-08-03 09:15:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 2100000,
    total_biaya_jasa: 450000,
    subtotal: 2550000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 280500,
    grandtotal: 2830500
  },
  {
    id: 4,
    kode: "TKT23110004",
    kode_induk: "TKT23110001",
    tanggal_transaksi: "2026-08-04",
    kode_pelanggan: "PEL001",
    nama_pelanggan: "Budi Gunawan",
    kode_teknisi: "TEK003",
    nama_teknisi: "Andi Wijaya",
    model_perangkat: "iPhone 13 Pro",
    imei_sn: "IMEI-998877",
    status_fisik: "Mulus",
    keluhan_awal: "OIS kamera belakang bergetar setelah ganti LCD",
    diagnosa_teknisi: "Garansi perbaikan - penyesuaian konektor kamera",
    kategori_servis: "Garansi",
    status: "selesai",
    jenis_tiket: "Garansi",
    status_pembayaran: "Lunas",
    created_at: "2026-08-04 14:00:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 0,
    total_biaya_jasa: 0,
    subtotal: 0,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 0,
    pajak_nominal: 0,
    grandtotal: 0
  },
  {
    id: 5,
    kode: "TKT23110005",
    kode_induk: null,
    tanggal_transaksi: "2026-08-05",
    kode_pelanggan: "PEL004",
    nama_pelanggan: "Dewi Safitri",
    kode_teknisi: "TEK002",
    nama_teknisi: "Rian Hidayat",
    model_perangkat: "Asus ROG Phone 5",
    imei_sn: "SN-ROG5-9090",
    status_fisik: "Baret Halus",
    keluhan_awal: "Mati total pasca overcharge",
    diagnosa_teknisi: "Kerusakan jalur IC Power utama",
    kategori_servis: "Berat",
    status: "batal",
    jenis_tiket: "Reguler",
    status_pembayaran: "Belum Bayar",
    created_at: "2026-08-05 16:30:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 800000,
    total_biaya_jasa: 300000,
    subtotal: 1100000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 121000,
    grandtotal: 1221000
  }
];

// Endpoint untuk menyediakan opsi filter yang tersedia di database / sistem
router.post("/options", async (req, res) => {
    try {
        const distinctJenisTiket = Array.from(new Set(dummyTickets.map(it => it.jenis_tiket).filter(Boolean)));
        const distinctPembayaran = ["Belum Bayar", "DP", "Lunas"];
        const teknisiMap = new Map();
        dummyTickets.forEach(it => {
            if (it.kode_teknisi && it.nama_teknisi && !teknisiMap.has(it.kode_teknisi)) {
                teknisiMap.set(it.kode_teknisi, it.nama_teknisi);
            }
        });

        return res.status(200).json({
            status: status.SUKSES || 200,
            message: "Berhasil memuat opsi filter laporan",
            data: {
                status: [
                    { label: 'Menunggu', value: 'menunggu' },
                    { label: 'Pengecekan', value: 'pengecekan' },
                    { label: 'Pengerjaan', value: 'pengerjaan' },
                    { label: 'Menunggu Suku Cadang', value: 'menunggu_suku_cadang' },
                    { label: 'Selesai', value: 'selesai' },
                    { label: 'Sudah Diambil', value: 'diambil' },
                    { label: 'Batal', value: 'batal' }
                ],
                jenis_tiket: distinctJenisTiket.map(val => ({ label: val, value: val })),
                status_pembayaran: distinctPembayaran.map(val => ({ label: val === 'DP' ? 'DP / Sebagian' : val, value: val })),
                teknisi: Array.from(teknisiMap.entries()).map(([kode, nama]) => ({
                    label: `${nama} (${kode})`,
                    value: kode
                }))
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: status.BAD_REQUEST || 400,
            message: "Gagal memuat opsi filter"
        });
    }
});

router.post("/", async (req, res) => {
    const { body: oPayload } = req;
    const username = req?.auth?.username || "system";

    try {
        // 1. Validasi parameter masukan wajib menggunakan Joi (Halaman & Per Halaman diatur opsional)
        const cValidation = await validatePayload(
            {
                tanggal_awal: Joi.string().required().label("Tanggal Awal"),
                tanggal_akhir: Joi.string().required().label("Tanggal Akhir"),
                page: Joi.number().min(1).optional().label("Halaman"),
                perPage: Joi.number().min(1).optional().label("Data Per Halaman"),
            },
            {
                "any.required": "{#label} wajib diisi.",
                "number.min": "{#label} tidak boleh kurang dari {#limit}"
            },
            oPayload,
            { allowUnknown: true }
        );

        if (cValidation) {
            const oResult = {
                status: status.BAD_REQUEST || 400,
                message: cValidation,
                datetime: formatDateSystem(),
            };

            return res.status(422).json(oResult);
        }

        const {
            tanggal_awal,
            tanggal_akhir,
            status: filteredStatus,
            jenis_tiket,
            status_pembayaran,
            teknisi,
            page,
            perPage,
            keyword,
            sortField = "created_at",
            sortOrder = "desc"
        } = oPayload;

        const hasPagination = page !== undefined && perPage !== undefined;

        // 2. Simulasi query filter dasar dari array dummy
        let filteredData = dummyTickets.filter((item) => {
            // Filter rentang tanggal
            const matchTanggal = item.tanggal_transaksi >= tanggal_awal && item.tanggal_transaksi <= tanggal_akhir;
            if (!matchTanggal) return false;

            // Filter status pekerjaan (MultiSelect / array)
            if (Array.isArray(filteredStatus) && filteredStatus.length > 0) {
                const statuses = filteredStatus.map(s => String(s).toLowerCase());
                const matchStatus = statuses.some(s => {
                    if (s === 'pengerjaan' || s === 'proses') {
                        return item.status === 'pengerjaan' || item.status === 'proses';
                    }
                    if (s === 'diambil' || s === 'sudah_diambil' || s === 'sudah diambil') {
                        return item.status === 'diambil' || item.status === 'sudah_diambil';
                    }
                    return item.status === s;
                });
                if (!matchStatus) return false;
            }

            // Filter jenis tiket (bisa string tunggal atau array)
            if (jenis_tiket) {
                if (Array.isArray(jenis_tiket) && jenis_tiket.length > 0) {
                    const lowerList = jenis_tiket.map(j => String(j).toLowerCase());
                    if (!lowerList.includes((item.jenis_tiket || '').toLowerCase())) return false;
                } else if (typeof jenis_tiket === 'string' && jenis_tiket.trim()) {
                    if ((item.jenis_tiket || '').toLowerCase() !== jenis_tiket.trim().toLowerCase()) return false;
                }
            }

            // Filter status pembayaran (bisa string tunggal atau array)
            if (status_pembayaran) {
                const matchPayment = (target, testVal) => {
                    const t = String(target || '').toLowerCase();
                    const v = String(testVal || '').toLowerCase();
                    if (v.includes('dp') || v.includes('sebagian')) {
                        return t.includes('dp') || t.includes('sebagian');
                    }
                    if (v.includes('belum')) {
                        return t.includes('belum');
                    }
                    if (v.includes('lunas')) {
                        return t.includes('lunas');
                    }
                    return t === v;
                };

                if (Array.isArray(status_pembayaran) && status_pembayaran.length > 0) {
                    const match = status_pembayaran.some(sp => matchPayment(item.status_pembayaran, sp));
                    if (!match) return false;
                } else if (typeof status_pembayaran === 'string' && status_pembayaran.trim()) {
                    if (!matchPayment(item.status_pembayaran, status_pembayaran.trim())) return false;
                }
            }

            // Filter teknisi (bisa kode_teknisi atau nama_teknisi)
            if (teknisi && typeof teknisi === 'string' && teknisi.trim()) {
                const tekVal = teknisi.trim().toLowerCase();
                const matchTek = (item.kode_teknisi || '').toLowerCase() === tekVal ||
                                 (item.nama_teknisi || '').toLowerCase() === tekVal ||
                                 (item.nama_teknisi || '').toLowerCase().includes(tekVal);
                if (!matchTek) return false;
            }

            // Filter pencarian kata kunci (keyword)
            if (keyword && typeof keyword === 'string' && keyword.trim()) {
                const lowerKeyword = keyword.trim().toLowerCase();
                const matchKeyword = 
                    (item.kode && item.kode.toLowerCase().includes(lowerKeyword)) ||
                    (item.model_perangkat && item.model_perangkat.toLowerCase().includes(lowerKeyword)) ||
                    (item.imei_sn && item.imei_sn.toLowerCase().includes(lowerKeyword)) ||
                    (item.nama_pelanggan && item.nama_pelanggan.toLowerCase().includes(lowerKeyword)) ||
                    (item.nama_teknisi && item.nama_teknisi.toLowerCase().includes(lowerKeyword));
                if (!matchKeyword) return false;
            }

            return true;
        });

        // 3. Simulasi Agregasi Total Finansial secara keseluruhan sebelum di-paginasi
        let total_biaya_suku_cadang = 0;
        let total_biaya_jasa = 0;
        let subtotal = 0;
        let diskon_nominal = 0;
        let pajak_nominal = 0;
        let grandtotal = 0;

        filteredData.forEach((item) => {
            total_biaya_suku_cadang += item.total_biaya_suku_cadang;
            total_biaya_jasa += item.total_biaya_jasa;
            subtotal += item.subtotal;
            diskon_nominal += item.diskon_nominal;
            pajak_nominal += item.pajak_nominal;
            grandtotal += item.grandtotal;
        });

        const oTotalsFormatted = {
            total_biaya_suku_cadang,
            total_biaya_jasa,
            subtotal,
            diskon_nominal,
            pajak_nominal,
            grandtotal
        };

        const nTotalRecords = filteredData.length;

        // 4. Pengurutan Data (Sorting)
        filteredData.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Penanganan mapping kolom sorting custom
            if (sortField === "nama_pelanggan") {
                valA = a.nama_pelanggan;
                valB = b.nama_pelanggan;
            } else if (sortField === "nama_teknisi") {
                valA = a.nama_teknisi;
                valB = b.nama_teknisi;
            }

            if (valA === undefined || valA === null) valA = "";
            if (valB === undefined || valB === null) valB = "";

            if (typeof valA === "string" && typeof valB === "string") {
                return sortOrder.toLowerCase() === "asc"
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            } else {
                return sortOrder.toLowerCase() === "asc" ? valA - valB : valB - valA;
            }
        });

        // 5. Pembatasan Halaman (Pagination) - diabaikan jika parameter tidak didefinisikan
        let vaData = [];
        let offsetVal = 0;

        if (hasPagination) {
            const pageInt = parseInt(page) || 1;
            const perPageInt = parseInt(perPage) || 10;
            offsetVal = (pageInt - 1) * perPageInt;
            vaData = filteredData.slice(offsetVal, offsetVal + perPageInt);
        } else {
            vaData = filteredData;
        }

        // 6. Format standardisasi output data
        const vaResult = vaData.map((item, idx) => ({
            no: offsetVal + idx + 1,
            id: item.id,
            kode: item.kode || "-",
            kode_induk: item.kode_induk,
            nama_pelanggan: item.nama_pelanggan || "Umum/Walk-In",
            nama_teknisi: item.nama_teknisi || "Belum Ditugaskan",
            model_perangkat: item.model_perangkat || "-",
            imei_sn: item.imei_sn || "-",
            status_fisik: item.status_fisik,
            keluhan_awal: item.keluhan_awal || "-",
            diagnosa_teknisi: item.diagnosa_teknisi || "-",
            kategori_servis: item.kategori_servis || "-",
            status: item.status,
            jenis_tiket: item.jenis_tiket,
            status_pembayaran: item.status_pembayaran,
            created_at: item.created_at,
            created_by_fullname: item.created_by_fullname || "-",

            total_biaya_suku_cadang: parseFloat(item.total_biaya_suku_cadang) || 0,
            total_biaya_jasa: parseFloat(item.total_biaya_jasa) || 0,
            subtotal: parseFloat(item.subtotal) || 0,
            diskon_persen: parseFloat(item.diskon_persen) || 0,
            diskon_nominal: parseFloat(item.diskon_nominal) || 0,
            pajak_persen: parseFloat(item.pajak_persen) || 0,
            pajak_nominal: parseFloat(item.pajak_nominal) || 0,
            grandtotal: parseFloat(item.grandtotal) || 0
        }));

        return res.status(200).json({
            status: status.SUKSES || 200,
            message: "Berhasil memuat laporan operasional service",
            datetime: formatDateSystem(),
            data: vaResult,
            total_data: nTotalRecords,
            totals: oTotalsFormatted
        });

    } catch (error) {
        const oResult = {
            status: status.BAD_REQUEST || 400,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "/contoh/laporan/laporan_data.js",
            func: "data",
            request: oPayload,
            response: oResult,
            user: username,
        });

        return res.status(500).json(oResult);
    }
});

export default router;