import 'dotenv/config';
import DB from '../../core/config/knex.js';
import { SignJWT } from 'jose';

async function main() {
  const todayYmd = '2026-09-17';
  const targetRoom = 'RNG-001';
  const baseUrl = 'http://127.0.0.1:8000/api/v1/master/pendaftaran-pasien-ambil-antrian-layanan';

  // Ambil data superadmin dari database
  const userAdmin = await DB('user_credential').where('username', 'superadmin@admin.com').first();
  console.log("Found user:", userAdmin?.username, "Role:", userAdmin?.role);

  // Buat Real JWT Token
  const secretKey = new TextEncoder().encode(process.env.USER_SECRET || "random");
  const realJwtToken = await new SignJWT({
    user_code: userAdmin.user_code,
    username: userAdmin.username,
    role: userAdmin.role,
    kode_cabang: userAdmin.kode_cabang || null,
    nama_cabang: userAdmin.nama_cabang || 'Kantor Pusat',
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secretKey);

  console.log("Real JWT Token generated successfully.");

  // 1. Setup Booking Jam 16:30:00 untuk Pasien hais
  const pasienHais = await DB('mst_pasien').where('nama', 'hais').orWhere('no_rm', 'RM-000002').first();
  const jadwal = await DB('mst_jadwal_karyawan').where('kode_ruangan', targetRoom).first();
  const kodeJadwal = jadwal?.kode_jadwal || 'JAD-001';

  let bookingRow = await DB('trx_booking').where('tanggal_booking', todayYmd).where('kode_ruangan', targetRoom).first();
  if (bookingRow) {
    await DB('trx_booking').where('id', bookingRow.id).update({
      jam_booking: '16:30:00',
      status: 'dikonfirmasi',
      no_rm: pasienHais.no_rm,
      kode_cabang: 'CBG-001',
      kode_jadwal: kodeJadwal,
    });
  } else {
    await DB('trx_booking').insert({
      kode_booking: 'BKG-20260917-001',
      no_rm: pasienHais.no_rm,
      tanggal_booking: todayYmd,
      jam_booking: '16:30:00',
      kode_ruangan: targetRoom,
      kode_jadwal: kodeJadwal,
      status: 'dikonfirmasi',
      kode_cabang: 'CBG-001',
      created_by: 'system',
      created_at: new Date(),
    });
  }

  // 2. Bersihkan antrean hari ini
  const oldQueues = await DB('trx_antrian_layanan').where('kode_ruangan', targetRoom).whereRaw('DATE(created_at) = ?', [todayYmd]);
  if (oldQueues.length > 0) {
    const oldCodes = oldQueues.map(q => q.kode_antrian_layanan);
    await DB('trx_detail_antrian_layanan').whereIn('kode_antrian_layanan', oldCodes).delete();
    await DB('trx_antrian_layanan').whereIn('kode_antrian_layanan', oldCodes).delete();
  }

  // 3. Masukkan 3 walk-in pertama (yang lolos langsung)
  for (let i = 1; i <= 3; i++) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${realJwtToken}`,
        'x-timestamp': new Date().toISOString(),
      },
      body: JSON.stringify({
        no_rm: pasienHais.no_rm,
        kode_cabang: 'CBG-001',
        items: [{ jenis_layanan: 'layanan', kode_layanan: 'LAY-006', durasi_menit: 30 }],
        override_peringatan_booking: false,
      }),
    });
    const data = await res.json();
    console.log(`Walk-in ${i}: Status ${data.status} | Msg: ${data.message}`);
  }

  // 4. Request ke-4 (BENTURAN PERTAMA) - Ambil RESPONSE JSON LENGKAP
  console.log("\n==================== RESPONSE BODY JSON LENGKAP REQUEST KE-4 ====================");
  const res4 = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${realJwtToken}`,
      'x-timestamp': new Date().toISOString(),
    },
    body: JSON.stringify({
      no_rm: pasienHais.no_rm,
      kode_cabang: 'CBG-001',
      items: [{ jenis_layanan: 'layanan', kode_layanan: 'LAY-006', durasi_menit: 30 }],
      override_peringatan_booking: false,
    }),
  });
  const res4Json = await res4.json();
  console.log(JSON.stringify(res4Json, null, 2));

  // 5. Lakukan OVERRIDE pada Request ke-4 menggunakan JWT Token Asli
  console.log("\n==================== MELAKUKAN OVERRIDE DENGAN JWT TOKEN ASLI ====================");
  const resOverride = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${realJwtToken}`,
      'x-timestamp': new Date().toISOString(),
    },
    body: JSON.stringify({
      no_rm: pasienHais.no_rm,
      kode_cabang: 'CBG-001',
      items: [{ jenis_layanan: 'layanan', kode_layanan: 'LAY-006', durasi_menit: 30 }],
      override_peringatan_booking: true,
    }),
  });
  const resOverrideJson = await resOverride.json();
  console.log("Status Override:", resOverrideJson.status, "| Message:", resOverrideJson.message);

  // 6. Cek baris database hasil override
  console.log("\n==================== HASIL QUERY DB SETELAH OVERRIDE DENGAN JWT ====================");
  const row = await DB('trx_antrian_layanan')
    .where('kode_ruangan', targetRoom)
    .where('override_peringatan_booking', 1)
    .orderBy('id', 'desc')
    .first();

  console.log({
    id: row.id,
    kode_antrian_layanan: row.kode_antrian_layanan,
    kode_ruangan: row.kode_ruangan,
    override_peringatan_booking: row.override_peringatan_booking,
    catatan_override_booking: row.catatan_override_booking,
    created_by: row.created_by,
    created_at: row.created_at,
  });

  process.exit(0);
}

main();
