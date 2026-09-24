import 'dotenv/config';
import DB from '../../core/config/knex.js';
import ambilAntrianRouter from '../../routes/v1/master/pendaftaran_pasien/pendaftaran_pasien_ambil_antrian_layanan.js';

function callRouteHandler(reqBody, username = 'superadmin@admin.com') {
  return new Promise((resolve) => {
    const req = {
      body: reqBody,
      auth: { username, kode_cabang: 'CBG-001' },
      user: { username, kode_cabang: 'CBG-001' },
    };

    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resolve({ statusCode, body: data });
      },
      setHeader() {},
    };

    const postHandler = ambilAntrianRouter.stack.find(
      (layer) => layer.route && layer.route.methods.post
    ).route.stack[0].handle;

    postHandler(req, res).catch((err) => {
      resolve({ statusCode: 500, body: { error: err.message, stack: err.stack } });
    });
  });
}

async function runRealBurstTest() {
  console.log("=== EKSEKUSI END-TO-END NYATA KE DATABASE (SKENARIO BURST 10 PASIEN) ===");

  const todayYmd = '2026-09-17';
  const targetRoom = 'RNG-001'; // Ruang Body Treatment

  const pasienHais = await DB('mst_pasien').where('nama', 'hais').orWhere('no_rm', 'RM-000002').first();
  if (!pasienHais) {
    console.error("Pasien hais tidak ditemukan");
    process.exit(1);
  }

  // Set booking 2 jam ke depan dari waktu sekarang
  const now = new Date();
  const bookingHour = (now.getHours() + 2) % 24;
  const bookingTimeStr = `${String(bookingHour).padStart(2, '0')}:15:00`;

  let bookingHais = await DB('trx_booking').where('tanggal_booking', todayYmd).where('kode_ruangan', targetRoom).first();
  if (bookingHais) {
    await DB('trx_booking').where('id', bookingHais.id).update({
      jam_booking: bookingTimeStr,
      status: 'dikonfirmasi',
      no_rm: pasienHais.no_rm,
      kode_cabang: 'CBG-001',
    });
  } else {
    await DB('trx_booking').insert({
      kode_booking: 'BKG-20260917-001',
      no_rm: pasienHais.no_rm,
      tanggal_booking: todayYmd,
      jam_booking: bookingTimeStr,
      kode_ruangan: targetRoom,
      status: 'dikonfirmasi',
      kode_cabang: 'CBG-001',
      created_by: 'system',
      created_at: new Date(),
    });
  }

  console.log(`1. Booking Aktif di DB: Jam ${bookingTimeStr} WIB (Pasien: ${pasienHais.nama}, Ruangan: ${targetRoom})`);

  // Bersihkan antrean lama di RNG-001 untuk hari ini agar fresh dari 0
  const oldQueues = await DB('trx_antrian_layanan').where('kode_ruangan', targetRoom).whereRaw('DATE(created_at) = ?', [todayYmd]);
  if (oldQueues.length > 0) {
    const oldCodes = oldQueues.map(q => q.kode_antrian_layanan);
    await DB('trx_detail_antrian_layanan').whereIn('kode_antrian_layanan', oldCodes).delete();
    await DB('trx_antrian_layanan').whereIn('kode_antrian_layanan', oldCodes).delete();
    console.log(`Membersihkan ${oldQueues.length} antrean lama untuk pengujian fresh.`);
  }

  // Siapkan kartu pool antrean awal
  for (let i = 1; i <= 30; i++) {
    const kd = `AWAL-TEST-${String(i).padStart(3, '0')}`;
    const exist = await DB('trx_antrian_awal').where('kode_antrian_awal', kd).first();
    if (!exist) {
      await DB('trx_antrian_awal').insert({
        kode_antrian_awal: kd,
        nomor_antrian: String(i),
        status: 'tersedia',
        kode_cabang: 'CBG-001',
        created_at: new Date(),
      });
    } else {
      await DB('trx_antrian_awal').where('id', exist.id).update({ status: 'tersedia', kode_kunjungan: null });
    }
  }

  // Daftarkan 10 Pasien Walk-in Secara Beruntun melalui Route Handler
  console.log("\n2. Mengeksekusi 10 Pendaftaran Walk-in Beruntun ke API / DB...");
  const registrationLogs = [];

  for (let i = 1; i <= 10; i++) {
    const payload = {
      no_rm: pasienHais.no_rm,
      kode_cabang: 'CBG-001',
      items: [
        {
          jenis_layanan: 'layanan',
          kode_layanan: 'LAY-006', // Keramas / Treatment di RNG-001 (30 menit)
          durasi_menit: 30,
        }
      ],
      override_peringatan_booking: false,
    };

    // Percobaan pertama: submit tanpa override
    let res = await callRouteHandler(payload);

    let statusPeringatan = "TIDAK (Lolos Langsung)";
    let perluOverride = "TIDAK";
    let warningPayload = null;

    if (res.body?.status === "WARN_BOOKING_COLLISION" || res.body?.peringatan === true) {
      statusPeringatan = "⚠️ MUNCUL WARNING BENTROK";
      perluOverride = "YA";
      warningPayload = res.body.data_peringatan;

      // Submit ulang dengan flag override = true
      payload.override_peringatan_booking = true;
      res = await callRouteHandler(payload);
    }

    registrationLogs.push({
      pasienKe: i,
      responseStatus: res.body?.status,
      kodeAntrianDiterbitkan: res.body?.data?.vaAntrianLayanan?.[0]?.kode_antrian_layanan || "-",
      statusPeringatan,
      perluOverride,
      estimasiSelesaiDiWarning: warningPayload?.estimasi_selesai || "-",
      batasAmanDiWarning: warningPayload?.batas_aman || "-",
      totalBebanDiWarning: warningPayload ? `${warningPayload.total_beban_menit}m` : "-",
    });
  }

  console.table(registrationLogs);

  // 4. Eksekusi Query Verifikasi Sesuai Permintaan Bagian A.1
  console.log("\n3. HASIL QUERY DATABASE NYATA (A.1 Scope yang Benar):");
  const rawDbResults = await DB('trx_antrian_layanan')
    .select(
      'id',
      'kode_antrian_layanan',
      'kode_ruangan',
      'override_peringatan_booking',
      'catatan_override_booking',
      'created_by',
      'created_at'
    )
    .where('kode_ruangan', targetRoom)
    .whereRaw('DATE(created_at) = ?', [todayYmd])
    .where('override_peringatan_booking', 1)
    .orderBy('created_at', 'asc');

  console.table(rawDbResults);
  console.log(`TOTAL BARIS OVERRIDE DITEMUKAN DI DATABASE: ${rawDbResults.length} BARIS`);

  process.exit(0);
}

runRealBurstTest();
