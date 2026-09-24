import DB from "../../core/config/knex.js";

async function runMultiRoomSimulation() {
  console.log("=== SIMULASI 2: ALUR PIPELINE (KONSULTASI 10m + TINDAKAN BODY TREATMENT 30m) ===");

  const bookingTime = "13:00";
  const bookingTimeMin = 13 * 60;
  const bufferMenit = 15;

  // 15 pasien datang di pagi hari untuk layanan yang lewat dokter dulu
  const walkins = [
    { no: 1,  jamDaftar: "08:00", durKonsul: 10, durTindakan: 30 },
    { no: 2,  jamDaftar: "08:10", durKonsul: 10, durTindakan: 35 },
    { no: 3,  jamDaftar: "08:25", durKonsul: 10, durTindakan: 30 },
    { no: 4,  jamDaftar: "08:40", durKonsul: 10, durTindakan: 40 },
    { no: 5,  jamDaftar: "08:55", durKonsul: 10, durTindakan: 30 },
    { no: 6,  jamDaftar: "09:10", durKonsul: 10, durTindakan: 45 },
    { no: 7,  jamDaftar: "09:20", durKonsul: 10, durTindakan: 30 },
    { no: 8,  jamDaftar: "09:35", durKonsul: 10, durTindakan: 30 },
    { no: 9,  jamDaftar: "09:50", durKonsul: 10, durTindakan: 35 },
    { no: 10, jamDaftar: "10:05", durKonsul: 10, durTindakan: 30 },
    { no: 11, jamDaftar: "10:20", durKonsul: 10, durTindakan: 40 },
    { no: 12, jamDaftar: "10:35", durKonsul: 10, durTindakan: 30 },
    { no: 13, jamDaftar: "10:50", durKonsul: 10, durTindakan: 30 },
    { no: 14, jamDaftar: "11:05", durKonsul: 10, durTindakan: 45 },
    { no: 15, jamDaftar: "11:20", durKonsul: 10, durTindakan: 30 },
  ];

  let konsulBusyUntilMin = 8 * 60;
  let bodyBusyUntilMin = 8 * 60;

  const results = [];

  for (const p of walkins) {
    const [h, m] = p.jamDaftar.split(":").map(Number);
    const regMin = h * 60 + m;

    // Sisa beban di Ruang Konsultasi
    const sisaKonsul = Math.max(0, konsulBusyUntilMin - regMin);
    const totalKonsul = sisaKonsul + p.durKonsul;
    const estSelesaiKonsul = regMin + totalKonsul;

    // Sisa beban di Ruang Body Treatment saat ini
    const sisaBody = Math.max(0, bodyBusyUntilMin - regMin);
    
    // Sesuai kode backend pendaftaran_pasien_ambil_antrian_layanan.js:
    // totalBebanTargetMenit = totalBebanRuanganMenit (konsul) + sisaTarget (body) + tr.durasi
    // totalBebanTargetMenit = totalKonsul + sisaBody + p.durTindakan
    const totalBebanTarget = totalKonsul + sisaBody + p.durTindakan;
    const estimasiSelesaiTargetMin = regMin + totalBebanTarget;
    const batasAmanMin = estimasiSelesaiTargetMin + bufferMenit;

    const estH = Math.floor(estimasiSelesaiTargetMin / 60);
    const estM = estimasiSelesaiTargetMin % 60;
    const batH = Math.floor(batasAmanMin / 60);
    const batM = batasAmanMin % 60;

    const isBentrok = batasAmanMin > bookingTimeMin;
    const slack = bookingTimeMin - batasAmanMin;

    // Update state pipeline
    konsulBusyUntilMin = estSelesaiKonsul;
    // Ruang body baru mulai melayani pasien ini setelah selesai konsul ATAU setelah antrean body sebelumnya beres
    const bodyStartPasien = Math.max(estSelesaiKonsul, bodyBusyUntilMin);
    bodyBusyUntilMin = bodyStartPasien + p.durTindakan;

    results.push({
      no: p.no,
      jamDaftar: p.jamDaftar,
      sisaAntreanKonsul: sisaKonsul,
      sisaAntreanBody: sisaBody,
      durTindakan: p.durTindakan,
      estimasiSelesai: `${String(estH).padStart(2, "0")}:${String(estM).padStart(2, "0")}`,
      batasAman: `${String(batH).padStart(2, "0")}:${String(batM).padStart(2, "0")}`,
      isBentrok,
      perluOverride: isBentrok ? "YA" : "TIDAK",
      slack: slack >= 0 ? `+${slack}m` : `${slack}m (LEWAT)`,
    });
  }

  console.table(results);
  process.exit(0);
}

runMultiRoomSimulation();
