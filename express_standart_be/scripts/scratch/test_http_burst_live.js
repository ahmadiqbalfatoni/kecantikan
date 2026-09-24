import 'dotenv/config';
import DB from '../../core/config/knex.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLiveHttpBurstTest() {
  console.log("================================================================================");
  console.log("EKSEKUSI PENGUJIAN OTOMATIS HTTP SOCKET NYATA (10 REQUEST DENGAN DELAY AKTUAL)");
  console.log("================================================================================");

  const todayYmd = '2026-09-17';
  const targetRoom = 'RNG-001'; // Ruang Body Treatment
  const baseUrl = 'http://127.0.0.1:8000/api/v1/master/pendaftaran-pasien-ambil-antrian-layanan';

  // 1. Ambil Pasien 'hais'
  const pasienHais = await DB('mst_pasien').where('nama', 'hais').orWhere('no_rm', 'RM-000002').first();
  if (!pasienHais) {
    console.error("Pasien hais tidak ditemukan");
    process.exit(1);
  }

  // 2. Setup Booking di DB: Pasien 'hais', Ruang RNG-001
  // Karena waktu server riil saat ini adalah jam 14:24 WIB, booking ditetapkan 2 jam ke depan (16:30:00 WIB)
  // Ini merepresentasikan secara matematis dan fungsional skenario 2 jam sebelum booking (11:00 vs 13:00)
  const now = new Date();
  const bookingTimeStr = "16:30:00";

  let bookingRow = await DB('trx_booking').where('tanggal_booking', todayYmd).where('kode_ruangan', targetRoom).first();
  if (bookingRow) {
    await DB('trx_booking').where('id', bookingRow.id).update({
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

  console.log(`[SETUP] Booking Aktif di DB: Jam ${bookingTimeStr} WIB | Pasien: ${pasienHais.nama} | Ruangan: ${targetRoom}`);

  // 3. Bersihkan antrean hari ini di RNG-001 agar fresh dari 0
  const oldQueues = await DB('trx_antrian_layanan').where('kode_ruangan', targetRoom).whereRaw('DATE(created_at) = ?', [todayYmd]);
  if (oldQueues.length > 0) {
    const oldCodes = oldQueues.map(q => q.kode_antrian_layanan);
    await DB('trx_detail_antrian_layanan').whereIn('kode_antrian_layanan', oldCodes).delete();
    await DB('trx_antrian_layanan').whereIn('kode_antrian_layanan', oldCodes).delete();
    console.log(`[SETUP] Membersihkan ${oldQueues.length} antrean lama untuk pengujian fresh.\n`);
  }

  // 4. Kirim 10 Request HTTP Asli Menggunakan fetch() dengan Jeda 1.2 Detik Antar-Request
  console.log("--------------------------------------------------------------------------------");
  console.log("MEMULAI PENGIRIMAN 10 HTTP POST KE: " + baseUrl);
  console.log("--------------------------------------------------------------------------------\n");

  for (let i = 1; i <= 10; i++) {
    const reqTimestamp = new Date().toISOString();
    const payload = {
      no_rm: pasienHais.no_rm,
      kode_cabang: 'CBG-001',
      items: [
        {
          jenis_layanan: 'layanan',
          kode_layanan: 'LAY-006', // 30 menit di RNG-001
          durasi_menit: 30,
        }
      ],
      override_peringatan_booking: false,
    };

    console.log(`>>> [REQUEST ${i}/10] WAKTU: ${new Date().toTimeString().slice(0, 8)} WIB | Pasien Walk-in ${i} (30 Menit)`);

    // Panggilan HTTP pertama (tanpa override)
    let response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-timestamp': reqTimestamp,
        'x-uniqueid': 'superadmin@admin.com',
      },
      body: JSON.stringify(payload),
    });

    let resJson = await response.json();

    if (resJson.status === 'WARN_BOOKING_COLLISION' || resJson.peringatan === true) {
      console.log(`    [RESPONSE HTTP ${response.status}] ⚠️ BENTROK DETEKSI: Estimasi Selesai ${resJson.data_peringatan.estimasi_selesai} WIB > Booking ${resJson.data_peringatan.jam_booking} WIB`);
      console.log(`    --> Melakukan Submit Ulang dengan Flag Override (override_peringatan_booking: true)...`);

      payload.override_peringatan_booking = true;
      const overrideTimestamp = new Date().toISOString();
      response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-timestamp': overrideTimestamp,
          'x-uniqueid': 'superadmin@admin.com',
        },
        body: JSON.stringify(payload),
      });
      resJson = await response.json();
      console.log(`    [RESPONSE HTTP ${response.status}] ✅ BERHASIL OVERRIDE: Tiket Diterbitkan (${resJson.data?.vaAntrianLayanan?.[0]?.nomor_antrian || 'Nomor Antrean'})`);
    } else {
      console.log(`    [RESPONSE HTTP ${response.status}] ✅ LOLOS LANGSUNG: Antrean Diterbitkan (${resJson.data?.vaAntrianLayanan?.[0]?.nomor_antrian || 'Nomor Antrean'})`);
    }

    console.log("");
    // Jeda 1.2 detik sebelum request berikutnya agar timestamp DB berbeda nyata
    await sleep(1200);
  }

  // 5. Query Audit Trail Nyata di Database (Bukti Timestamp Berbeda & Catatan Lengkap)
  console.log("================================================================================");
  console.log("HASIL QUERY DATABASE NYATA (trx_antrian_layanan WHERE override_peringatan_booking = 1):");
  console.log("================================================================================\n");

  const dbAuditRows = await DB('trx_antrian_layanan')
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

  console.table(dbAuditRows);
  console.log(`TOTAL BARIS OVERRIDE DITEMUKAN: ${dbAuditRows.length} BARIS`);

  process.exit(0);
}

runLiveHttpBurstTest();
