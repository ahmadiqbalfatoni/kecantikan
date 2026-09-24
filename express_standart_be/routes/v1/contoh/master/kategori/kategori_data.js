import express from "express";
import { formatDateSystem } from "../../../components/tools/date_tools.js";
import { Logging } from "../../../components/tools/servertool.js";
import { status } from "../../../components/tools/general.js";

const router = express.Router();

// Data dummy pengganti tabel mst_kategori_barang
const dummyKategoriBarang = [
  {
    id: 1,
    kode: "KAT001",
    keterangan: "Online",
    tz: "Asia/Jakarta",
    created_at: "2023-01-10 10:00:00",
    updated_at: "2023-01-10 10:00:00",
  },
  {
    id: 2,
    kode: "KAT002",
    keterangan: "Retail",
    tz: "Asia/Jakarta",
    created_at: "2023-01-11 11:00:00",
    updated_at: "2023-01-11 11:00:00",
  },
  {
    id: 3,
    kode: "KAT003",
    keterangan: "Pabrik",
    tz: "Asia/Jakarta",
    created_at: "2023-01-12 12:00:00",
    updated_at: "2023-01-12 12:00:00",
  },
];

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";

  const hasPagination =
    oPayload.page !== undefined || oPayload.perPage !== undefined;

  const keyword = oPayload.keyword || "";
  const sortField = oPayload.sortField || "updated_at";
  const sortOrder = oPayload.sortOrder || "desc";

  try {
    // 1. Simulasi Filtering berdasarkan keyword
    let filteredData = [...dummyKategoriBarang];
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredData = filteredData.filter((item) => {
        const matchKeterangan = item.keterangan
          ? item.keterangan.toLowerCase().includes(lowerKeyword)
          : false;
        const matchKode = item.kode
          ? item.kode.toLowerCase().includes(lowerKeyword)
          : false;
        return matchKeterangan || matchKode;
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
      file: "contoh/kategori/kategori_data.js",
      func: "data",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;