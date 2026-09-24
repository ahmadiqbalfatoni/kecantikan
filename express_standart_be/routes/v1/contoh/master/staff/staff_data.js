import express from "express";
import { formatDateSystem } from "../../../components/tools/date_tools.js";
import { Logging } from "../../../components/tools/servertool.js";
import { status } from "../../../components/tools/general.js";

const router = express.Router();

// Data dummy pengganti tabel mst_staff
const dummyStaff = [
  {
    id: 1,
    kode: "STF001",
    nama: "Budi Santoso",
    alamat: "Jakarta Selatan",
    telepon: "081234567890",
    tz: "Asia/Jakarta",
    created_at: "2023-01-10 08:00:00",
    updated_at: "2023-01-10 08:00:00",
  },
  {
    id: 2,
    kode: "STF002",
    nama: "Siti Rahma",
    alamat: "Bandung",
    telepon: "081298765432",
    tz: "Asia/Jakarta",
    created_at: "2023-01-11 09:00:00",
    updated_at: "2023-01-11 09:00:00",
  },
  {
    id: 3,
    kode: "STF003",
    nama: "Andi Wijaya",
    alamat: "Surabaya",
    telepon: "081345678901",
    tz: "Asia/Jakarta",
    created_at: "2023-01-12 10:00:00",
    updated_at: "2023-01-12 10:00:00",
  },
  {
    id: 4,
    kode: "STF004",
    nama: "Dewi Lestari",
    alamat: "Yogyakarta",
    telepon: "081456789012",
    tz: "Asia/Jakarta",
    created_at: "2023-01-13 11:00:00",
    updated_at: "2023-01-13 11:00:00",
  },
  {
    id: 5,
    kode: "STF005",
    nama: "Eko Prasetyo",
    alamat: "Semarang",
    telepon: "081567890123",
    tz: "Asia/Jakarta",
    created_at: "2023-01-14 12:00:00",
    updated_at: "2023-01-14 12:00:00",
  },
];

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";

  const hasPagination =
    oPayload.page !== undefined || oPayload.perPage !== undefined;
  const sortField = oPayload.sortField || "kode";
  const sortOrder = oPayload.sortOrder || "asc";
  const keyword = oPayload.keyword || "";

  try {
    // 1. Simulasi Filtering berdasarkan keyword
    let filteredData = [...dummyStaff];
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredData = filteredData.filter((item) => {
        const matchNama = item.nama ? item.nama.toLowerCase().includes(lowerKeyword) : false;
        const matchKode = item.kode ? item.kode.toLowerCase().includes(lowerKeyword) : false;
        const matchAlamat = item.alamat ? item.alamat.toLowerCase().includes(lowerKeyword) : false;
        return matchNama || matchKode || matchAlamat;
      });
    }

    // 2. Simulasi Sorting
    filteredData.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined) valA = "";
      if (valB === undefined) valB = "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder.toLowerCase() === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder.toLowerCase() === "asc" ? valA - valB : valB - valA;
      }
    });

    let totalRecords = filteredData.length;
    let vaData = [];

    // 3. Simulasi Pagination
    if (hasPagination) {
      const page = parseInt(oPayload.page) || 1;
      const perPage = parseInt(oPayload.perPage) || 10;
      const offset = (page - 1) * perPage;

      vaData = filteredData.slice(offset, offset + perPage);
    } else {
      vaData = filteredData;
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "contoh/master/staff/staff_data.js",
      func: "data",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;