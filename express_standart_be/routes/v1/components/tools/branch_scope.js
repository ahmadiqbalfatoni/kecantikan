/**
 * Helper untuk branch scoping (Multi-Cabang Klinik)
 */
export const getBranchScope = (req, explicitPayloadCabang = null) => {
  const role = (req?.auth?.role || "").toLowerCase();
  const userCabang = req?.auth?.kode_cabang || null;
  const isSuperAdmin = role === "superadmin" || role === "admin_pusat" || req?.auth?.is_superadmin;

  if (!isSuperAdmin) {
    // Non-superadmin (Manager, Dokter, Kasir, Terapis, dll.) selalu diisolasi ke cabangnya sendiri
    return userCabang || "CBG-001";
  }

  // Jika superadmin: bisa memilih filter cabang tertentu atau ALL
  const headerCabang = req.headers ? req.headers["x-kode-cabang"] : null;
  const target = explicitPayloadCabang || headerCabang || null;
  if (!target || target === "ALL" || target === "all") {
    return null; // Seluruh cabang
  }
  return target;
};

export const applyBranchFilter = (query, columnRef, branchCode) => {
  if (branchCode) {
    query.where(columnRef, branchCode);
  }
  return query;
};
