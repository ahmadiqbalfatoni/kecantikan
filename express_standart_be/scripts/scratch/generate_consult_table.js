import 'dotenv/config';

function generateFullConsultRouteTable() {
  console.log("=== SIMULASI BAGIAN C: SEMUA 15 PASIEN MEMILIH RUTE KONSUL DULU ===");

  const bookingTimeStr = "13:00";
  const bookingTimeMin = 13 * 60; // 780
  const bufferMenit = 15;

  const walkinRegistrations = [
    { no: 1,  jamDaftar: "08:00", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 01" },
    { no: 2,  jamDaftar: "08:10", durKonsul: 10, durTindakan: 35, namaPasien: "Pasien 02" },
    { no: 3,  jamDaftar: "08:25", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 03" },
    { no: 4,  jamDaftar: "08:40", durKonsul: 10, durTindakan: 40, namaPasien: "Pasien 04" },
    { no: 5,  jamDaftar: "08:55", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 05" },
    { no: 6,  jamDaftar: "09:10", durKonsul: 10, durTindakan: 45, namaPasien: "Pasien 06" },
    { no: 7,  jamDaftar: "09:20", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 07" },
    { no: 8,  jamDaftar: "09:35", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 08" },
    { no: 9,  jamDaftar: "09:50", durKonsul: 10, durTindakan: 35, namaPasien: "Pasien 09" },
    { no: 10, jamDaftar: "10:05", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 10" },
    { no: 11, jamDaftar: "10:20", durKonsul: 10, durTindakan: 40, namaPasien: "Pasien 11" },
    { no: 12, jamDaftar: "10:35", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 12" },
    { no: 13, jamDaftar: "10:50", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 13" },
    { no: 14, jamDaftar: "11:05", durKonsul: 10, durTindakan: 45, namaPasien: "Pasien 14" },
    { no: 15, jamDaftar: "11:20", durKonsul: 10, durTindakan: 30, namaPasien: "Pasien 15" },
  ];

  let konsulBusyUntil = 8 * 60; // 08:00
  let bodyBusyUntil = 8 * 60;   // 08:00

  const tableRows = [];

  for (const p of walkinRegistrations) {
    const [h, m] = p.jamDaftar.split(":").map(Number);
    const regMin = h * 60 + m;

    // 1. Sisa antrean di Ruang Konsultasi pada saat regMin
    const sisaKonsul = Math.max(0, konsulBusyUntil - regMin);
    const totalKonsul = sisaKonsul + p.durKonsul;
    const estSelesaiKonsul = regMin + totalKonsul;

    // 2. Sisa antrean di Ruang Tindakan (Body Treatment) pada saat regMin
    const sisaBody = Math.max(0, bodyBusyUntil - regMin);

    // 3. Kalkulasi rumus collision backend:
    // totalBebanTargetMenit = totalKonsul + sisaBody + durTindakan
    const totalBebanTargetMenit = totalKonsul + sisaBody + p.durTindakan;
    const estimasiSelesaiMin = regMin + totalBebanTargetMenit;
    const batasAmanMin = estimasiSelesaiMin + bufferMenit;

    const estH = Math.floor(estimasiSelesaiMin / 60);
    const estM = estimasiSelesaiMin % 60;
    const batH = Math.floor(batasAmanMin / 60);
    const batM = batasAmanMin % 60;

    const estimasiSelesaiStr = `${String(estH).padStart(2, '0')}:${String(estM).padStart(2, '0')}`;
    const batasAmanStr = `${String(batH).padStart(2, '0')}:${String(batM).padStart(2, '0')}`;

    const isBentrok = batasAmanMin > bookingTimeMin;
    const slackMenit = bookingTimeMin - batasAmanMin;

    // Update state ruangan setelah pendaftaran (atau override)
    konsulBusyUntil = estSelesaiKonsul;
    const bodyStart = Math.max(estSelesaiKonsul, bodyBusyUntil);
    bodyBusyUntil = bodyStart + p.durTindakan;

    tableRows.push({
      no: p.no,
      jamDaftar: `${p.jamDaftar} WIB`,
      namaPasien: p.namaPasien,
      alur: "Konsul (10m) -> Body",
      sisaAntreanKonsul: `${sisaKonsul} m`,
      sisaAntreanBody: `${sisaBody} m`,
      durTindakan: `${p.durTindakan} m`,
      totalBeban: `${totalBebanTargetMenit} m`,
      estimasiSelesai: `${estimasiSelesaiStr} WIB`,
      batasAman: `${batasAmanStr} WIB`,
      bentrokBooking1300: isBentrok ? "YA (BENTROK)" : "TIDAK",
      statusModal: isBentrok ? "⚠️ MUNCUL WARNING" : "Lolos (Aman)",
      perluOverride: isBentrok ? "YA" : "TIDAK",
      slackTime: slackMenit >= 0 ? `+${slackMenit} menit` : `${slackMenit} menit (LEWAT)`,
    });
  }

  console.table(tableRows);
}

generateFullConsultRouteTable();
