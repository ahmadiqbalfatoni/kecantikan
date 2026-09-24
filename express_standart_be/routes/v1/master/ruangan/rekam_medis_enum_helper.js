/**
 * Helper terpusat untuk memetakan label UI ke nilai ENUM sah database MySQL `trx_rekam_medis` dan `trx_rekam_medis_ruangan`,
 * serta memetakan nilai ENUM database kembali ke label tampilan UI.
 *
 * Nilai ENUM MySQL trx_rekam_medis:
 * - pemeriksaan_acne: 'Tidak Ada', 'Ringan', 'Sedang', 'Berat'
 * - pemeriksaan_inflammation: 'Tidak Ada', 'Ringan', 'Sedang', 'Berat'
 * - pemeriksaan_skin_type: 'Normal', 'Berminyak', 'Kering', 'Kombinasi', 'Sensitif'
 * - pemeriksaan_pigmentation: 'Tidak Ada', 'Ringan', 'Sedang', 'Berat'
 * - pemeriksaan_sensitivity: 'Rendah', 'Sedang', 'Tinggi'
 *
 * Nilai ENUM MySQL trx_rekam_medis_ruangan:
 * - kondisi_kulit: 'normal', 'kering', 'berminyak', 'kombinasi', 'sensitif'
 */

export function mapAcneToEnum(val) {
  if (!val) return "Tidak Ada";
  const v = String(val).toLowerCase();
  if (v.includes("none") || v.includes("tidak")) return "Tidak Ada";
  if (v.includes("grade 1") || v.includes("mild") || v.includes("ringan")) return "Ringan";
  if (v.includes("grade 2") || v.includes("moderate") || v.includes("sedang")) return "Sedang";
  if (v.includes("grade 3") || v.includes("grade 4") || v.includes("severe") || v.includes("cystic") || v.includes("berat")) return "Berat";
  return "Tidak Ada";
}

export function mapInflammationToEnum(val) {
  if (!val) return "Tidak Ada";
  const v = String(val).toLowerCase();
  if (v.includes("none") || v.includes("tidak")) return "Tidak Ada";
  if (v.includes("ringan") || v.includes("mild")) return "Ringan";
  if (v.includes("sedang") || v.includes("moderate")) return "Sedang";
  if (v.includes("berat") || v.includes("severe")) return "Berat";
  return "Tidak Ada";
}

export function mapSkinTypeToEnum(val) {
  if (!val) return "Normal";
  const v = String(val).toLowerCase();
  if (v.includes("berminyak") || v.includes("oily")) return "Berminyak";
  if (v.includes("kering") || v.includes("dry")) return "Kering";
  if (v.includes("kombinasi") || v.includes("combination")) return "Kombinasi";
  if (v.includes("sensitif") || v.includes("sensitive")) return "Sensitif";
  return "Normal";
}

export function mapPigmentationToEnum(val) {
  if (!val) return "Tidak Ada";
  const v = String(val).toLowerCase();
  if (v.includes("none") || v.includes("tidak")) return "Tidak Ada";
  if (v.includes("melasma") || v.includes("freckles") || v.includes("ringan") || v.includes("mild")) return "Ringan";
  if (v.includes("pih") || v.includes("lentigo") || v.includes("sedang") || v.includes("moderate")) return "Sedang";
  if (v.includes("pie") || v.includes("berat") || v.includes("severe")) return "Berat";
  return "Tidak Ada";
}

export function mapSensitivityToEnum(val) {
  if (!val) return "Rendah";
  const v = String(val).toLowerCase();
  if (v.includes("rendah") || v.includes("low")) return "Rendah";
  if (v.includes("sedang") || v.includes("medium")) return "Sedang";
  if (v.includes("tinggi") || v.includes("high")) return "Tinggi";
  return "Rendah";
}

export function mapKondisiKulitRuanganToEnum(val) {
  if (!val) return "normal";
  const v = String(val).toLowerCase();
  if (v.includes("berminyak") || v.includes("oily")) return "berminyak";
  if (v.includes("kering") || v.includes("dry")) return "kering";
  if (v.includes("kombinasi") || v.includes("combination")) return "kombinasi";
  if (v.includes("sensitif") || v.includes("sensitive")) return "sensitif";
  return "normal";
}

export function mapHeaderRMDataToDB(headerData = {}) {
  if (!headerData || typeof headerData !== "object") return {};
  const mapped = { ...headerData };

  if (mapped.pemeriksaan_acne !== undefined) {
    mapped.pemeriksaan_acne = mapAcneToEnum(mapped.pemeriksaan_acne);
  }
  if (mapped.pemeriksaan_inflammation !== undefined) {
    mapped.pemeriksaan_inflammation = mapInflammationToEnum(mapped.pemeriksaan_inflammation);
  }
  if (mapped.pemeriksaan_skin_type !== undefined) {
    mapped.pemeriksaan_skin_type = mapSkinTypeToEnum(mapped.pemeriksaan_skin_type);
  }
  if (mapped.pemeriksaan_pigmentation !== undefined) {
    mapped.pemeriksaan_pigmentation = mapPigmentationToEnum(mapped.pemeriksaan_pigmentation);
  }
  if (mapped.pemeriksaan_sensitivity !== undefined) {
    mapped.pemeriksaan_sensitivity = mapSensitivityToEnum(mapped.pemeriksaan_sensitivity);
  }

  return mapped;
}

export function mapEnumToDisplayLabel(columnName, val) {
  if (!val) return "-";
  const v = String(val).toLowerCase();

  switch (columnName) {
    case "pemeriksaan_acne":
      if (v === "none" || v === "tidak ada") return "Tidak Ada";
      if (v === "mild" || v === "ringan") return "Grade 1 (Mild)";
      if (v === "moderate" || v === "sedang") return "Grade 2 (Moderate)";
      if (v === "severe" || v === "berat") return "Grade 3 / 4 (Severe)";
      return val;

    case "pemeriksaan_inflammation":
      if (v === "none" || v === "tidak ada") return "Tidak Ada";
      if (v === "mild" || v === "ringan") return "Ringan";
      if (v === "moderate" || v === "sedang") return "Sedang";
      if (v === "severe" || v === "berat") return "Berat";
      return val;

    case "pemeriksaan_skin_type":
      if (v === "oily" || v === "berminyak") return "Berminyak";
      if (v === "dry" || v === "kering") return "Kering";
      if (v === "combination" || v === "kombinasi") return "Kombinasi";
      if (v === "sensitive" || v === "sensitif") return "Sensitif";
      return "Normal";

    case "pemeriksaan_pigmentation":
      if (v === "none" || v === "tidak ada") return "Tidak Ada";
      if (v === "mild" || v === "ringan") return "Ringan";
      if (v === "moderate" || v === "sedang") return "Sedang";
      if (v === "severe" || v === "berat") return "Berat";
      return val;

    case "pemeriksaan_sensitivity":
      if (v === "low" || v === "rendah") return "Rendah";
      if (v === "medium" || v === "sedang") return "Sedang";
      if (v === "high" || v === "tinggi") return "Tinggi";
      return val;

    default:
      return val;
  }
}
