import 'dotenv/config';

function simulateBurst() {
  console.log("=== SIMULASI A: BURST 10 PASIEN WALK-IN MENDADAK PUKUL 11:00 ===");

  const bookingTimeStr = "13:00:00";
  const bookingTimeMin = 13 * 60; // 780 menit
  const bufferMenit = 15;

  // 10 Pasien mendaftar berturut-turut cepat mulai pukul 11:00:00
  const burstPatients = [
    { no: 1,  jamDaftar: "11:00:00", durasi: 30, nama: "Pasien Burst 01", tindakan: "Body Slimming" },
    { no: 2,  jamDaftar: "11:00:30", durasi: 25, nama: "Pasien Burst 02", tindakan: "Body Massage" },
    { no: 3,  jamDaftar: "11:01:00", durasi: 40, nama: "Pasien Burst 03", tindakan: "Body Tightening" },
    { no: 4,  jamDaftar: "11:01:30", durasi: 30, nama: "Pasien Burst 04", tindakan: "Body Slimming" },
    { no: 5,  jamDaftar: "11:02:00", durasi: 35, nama: "Pasien Burst 05", tindakan: "Body Contour" },
    { no: 6,  jamDaftar: "11:02:30", durasi: 30, nama: "Pasien Burst 06", tindakan: "Body Slimming" },
    { no: 7,  jamDaftar: "11:03:00", durasi: 45, nama: "Pasien Burst 07", tindakan: "Full Body Treatment" },
    { no: 8,  jamDaftar: "11:03:30", durasi: 30, nama: "Pasien Burst 08", tindakan: "Body Slimming" },
    { no: 9,  jamDaftar: "11:04:00", durasi: 35, nama: "Pasien Burst 09", tindakan: "Body Contour" },
    { no: 10, jamDaftar: "11:04:30", durasi: 30, nama: "Pasien Burst 10", tindakan: "Body Slimming" },
  ];

  let currentRoomBusyUntilMin = 11 * 60; // 11:00 ruangan mulai melayani antrean burst ini
  const results = [];

  for (const p of burstPatients) {
    const [h, m, s] = p.jamDaftar.split(":").map(Number);
    const regMin = h * 60 + m + s / 60;

    // Sisa beban antrean yang belum selesai di ruangan
    const sisaBebanMenit = Math.max(0, currentRoomBusyUntilMin - regMin);
    const totalBebanMenit = sisaBebanMenit + p.durasi;

    const estimasiSelesaiMin = regMin + totalBebanMenit;
    const batasAmanMin = estimasiSelesaiMin + bufferMenit;

    const estH = Math.floor(estimasiSelesaiMin / 60);
    const estM = Math.floor(estimasiSelesaiMin % 60);
    const estS = Math.round((estimasiSelesaiMin * 60) % 60);

    const batH = Math.floor(batasAmanMin / 60);
    const batM = Math.floor(batasAmanMin % 60);
    const batS = Math.round((batasAmanMin * 60) % 60);

    const estimasiSelesaiStr = `${String(estH).padStart(2, '0')}:${String(estM).padStart(2, '0')}:${String(estS).padStart(2, '0')}`;
    const batasAmanStr = `${String(batH).padStart(2, '0')}:${String(batM).padStart(2, '0')}:${String(batS).padStart(2, '0')}`;

    // Operator persis backend: batasAmanStr > bkgTime
    const isBentrok = batasAmanStr > bookingTimeStr;
    const slackMenit = bookingTimeMin - batasAmanMin;

    currentRoomBusyUntilMin = estimasiSelesaiMin;

    results.push({
      no: p.no,
      jamDaftar: p.jamDaftar,
      durasi: `${p.durasi} m`,
      totalBebanRuangan: `${Math.round(totalBebanMenit)} menit`,
      estimasiSelesai: estimasiSelesaiStr.slice(0, 5) + " WIB",
      batasAman: batasAmanStr.slice(0, 5) + " WIB",
      peringatanMuncul: isBentrok ? "YA (BENTROK)" : "TIDAK",
      perluOverride: isBentrok ? "YA" : "TIDAK",
      slackTime: slackMenit >= 0 ? `+${Math.round(slackMenit)} menit` : `${Math.round(slackMenit)} menit (LEWAT)`,
    });
  }

  console.table(results);
}

simulateBurst();
