import DB from '../core/config/knex.js';
import { terbitkanAntreanLanjutanRuangan } from '../routes/v1/master/ruangan/antrian_lanjutan_service.js';
import { formatDateSystem } from '../routes/v1/components/tools/date_tools.js';

async function runTest() {
  console.log('=== RUNNING FULL LIFECYCLE TEST ===');
  
  // 1. Check services with optional or mandatory consultation
  const service = await DB('mst_layanan').where('kode_layanan', 'LAY-006').first();
  console.log('Test Service:', service.kode_layanan, service.nama, 'Room:', service.kode_ruangan, 'Wajib Konsul:', service.wajib_konsultasi);

  const consultRoom = await DB('mst_ruangan').where('is_konsultasi', 1).first();
  console.log('Consultation Room:', consultRoom.kode_ruangan, consultRoom.nama_ruangan);

  const treatmentRoom = await DB('mst_ruangan').where('kode_ruangan', service.kode_ruangan).first();
  console.log('Treatment Room:', treatmentRoom.kode_ruangan, treatmentRoom.nama_ruangan);

  // 2. Simulate new Kunjungan & Antrean Konsultasi
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const testKodeKunjungan = `KJ-${todayStr}-999`;
  const testKodeAntrianKonsul = `AL-${todayStr}-991`;
  const testKodeDetailKonsul = `DAL-${todayStr}-991-01`;

  console.log('\nStep 1: Creating simulated consultation queue', testKodeAntrianKonsul, 'for visit', testKodeKunjungan);

  await DB('trx_kunjungan').insert({
    kode_kunjungan: testKodeKunjungan,
    no_rm: 'RM-000001',
    tanggal_kunjungan: new Date(),
    jam_datang: '10:00:00',
    status: 'berlangsung',
    kode_cabang: 'CBG-001',
    created_by: 'test_script',
    created_at: formatDateSystem(),
    updated_by: 'test_script',
    updated_at: formatDateSystem()
  });

  await DB('trx_antrian_layanan').insert({
    kode_cabang: 'CBG-001',
    kode_antrian_layanan: testKodeAntrianKonsul,
    kode_kunjungan: testKodeKunjungan,
    nomor_antrian: '99',
    kode_ruangan: consultRoom.kode_ruangan,
    nama_ruangan: consultRoom.nama_ruangan,
    status: 'menunggu',
    lanjut_ke_tindakan: 1,
    kode_ruangan_tujuan_lanjutan: service.kode_ruangan,
    created_by: 'test_script',
    created_at: formatDateSystem(),
    updated_by: 'test_script',
    updated_at: formatDateSystem()
  });

  await DB('trx_detail_antrian_layanan').insert({
    kode_detail_antrian_layanan: testKodeDetailKonsul,
    kode_antrian_layanan: testKodeAntrianKonsul,
    kode_kunjungan: testKodeKunjungan,
    jenis_layanan: 'layanan',
    kode_layanan: service.kode_layanan,
    nama_layanan: service.nama,
    harga: 100000,
    durasi_menit: 30,
    kode_ruangan: consultRoom.kode_ruangan,
    nama_ruangan: consultRoom.nama_ruangan,
    created_by: 'test_script',
    created_at: formatDateSystem(),
    updated_by: 'test_script',
    updated_at: formatDateSystem()
  });

  console.log('✓ Simulated consultation queue created successfully');

  // 3. Step 2: Doctor calls and finishes consultation
  console.log('\nStep 2: Doctor completes consultation and triggers referral...');
  
  let referrals = [];
  await DB.transaction(async (trx) => {
    // Update consultation queue to selesai
    await trx('trx_antrian_layanan')
      .where('kode_antrian_layanan', testKodeAntrianKonsul)
      .update({
        status: 'selesai',
        selesai_at: formatDateSystem(),
        lanjut_ke_tindakan: 1,
        kode_karyawan: '440101010002',
        updated_by: 'dr_amanda',
        updated_at: formatDateSystem()
      });

    const currentAntrian = await trx('trx_antrian_layanan').where('kode_antrian_layanan', testKodeAntrianKonsul).first();

    // Trigger terbitkanAntreanLanjutanRuangan
    referrals = await terbitkanAntreanLanjutanRuangan(trx, {
      currentAntrian,
      kodeKunjungan: testKodeKunjungan,
      username: 'dr_amanda',
      rekomendasiItems: [
        {
          jenis: 'layanan',
          kode: service.kode_layanan,
          nama: service.nama,
          harga: 100000,
          kode_ruangan: service.kode_ruangan,
          nama_ruangan: treatmentRoom.nama_ruangan
        }
      ],
      tz: 'Asia/Jakarta'
    });
  });

  console.log('✓ terbitkanAntreanLanjutanRuangan executed. Referrals returned:', referrals.length);

  // 4. Step 3: Verify that treatment room grid query finds this referral queue!
  console.log('\nStep 3: Querying Treatment Room queues (simulating UI query to /master/antrian-layanan-data)...');

  const treatmentRoomQueues = await DB('trx_antrian_layanan as al')
    .leftJoin('trx_kunjungan as k', 'al.kode_kunjungan', 'k.kode_kunjungan')
    .leftJoin('mst_pasien as p', 'k.no_rm', 'p.no_rm')
    .leftJoin('trx_detail_antrian_layanan as dal', 'al.kode_antrian_layanan', 'dal.kode_antrian_layanan')
    .where(function() {
      this.where('al.kode_cabang', 'CBG-001').orWhereNull('al.kode_cabang');
    })
    .where('al.kode_ruangan', service.kode_ruangan)
    .where('al.kode_kunjungan', testKodeKunjungan)
    .select('al.kode_antrian_layanan', 'al.kode_ruangan', 'al.nomor_antrian', 'al.status', 'al.kode_cabang', 'dal.nama_layanan');

  console.log('Treatment Room Query Results:', treatmentRoomQueues);

  if (treatmentRoomQueues.length > 0 && treatmentRoomQueues[0].status === 'menunggu') {
    console.log('\n✅ TEST PASSED: Queue correctly entered Treatment Room', treatmentRoomQueues[0].kode_ruangan, 'with status', treatmentRoomQueues[0].status, 'and branch', treatmentRoomQueues[0].kode_cabang);
  } else {
    console.error('\n❌ TEST FAILED: Queue was not found in Treatment Room!');
  }

  // Cleanup test data
  console.log('\nCleaning up test records...');
  await DB('trx_detail_antrian_layanan').where('kode_kunjungan', testKodeKunjungan).del();
  await DB('trx_antrian_layanan').where('kode_kunjungan', testKodeKunjungan).del();
  await DB('trx_kunjungan').where('kode_kunjungan', testKodeKunjungan).del();
  console.log('Cleanup completed.');

  process.exit(0);
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
