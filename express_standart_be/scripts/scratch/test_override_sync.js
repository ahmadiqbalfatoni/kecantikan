import 'dotenv/config';
import DB from '../../core/config/knex.js';

async function testOverrideSync() {
  console.log("=== PENGUJIAN MIKRO SINKRONISASI OVERRIDE (DB RAW QUERY) ===");

  const testKodeRuangan = "RNG-TEST-001";
  const trx = await DB.transaction();

  try {
    const durasiList = [30, 35, 30, 40, 30, 45, 30, 30, 35, 30];
    const snapResults = [];

    for (let i = 0; i < durasiList.length; i++) {
      const noAntrian = i + 1;
      const kodeAntrian = `AL-TEST-${String(noAntrian).padStart(3, '0')}`;
      const kodeKunjungan = `KNJ-TEST-${String(noAntrian).padStart(3, '0')}`;
      const durasi = durasiList[i];

      // 1. Jalankan algoritma getSisaBebanRuangan SEBELUM insert pasien ke-(i+1)
      const activeQueuesBefore = await trx("trx_antrian_layanan as al")
        .where("al.kode_ruangan", testKodeRuangan)
        .whereIn("al.status", ["dipanggil", "menunggu"])
        .select("al.id", "al.kode_antrian_layanan", "al.status");

      let sisaBebanMenit = 0;
      if (activeQueuesBefore.length > 0) {
        const queueCodes = activeQueuesBefore.map(q => q.kode_antrian_layanan);
        const details = await trx("trx_detail_antrian_layanan")
          .whereIn("kode_antrian_layanan", queueCodes)
          .whereIn("jenis_layanan", ["layanan", "paket", "klaim_paket"])
          .select("kode_antrian_layanan", "durasi_menit");
        
        details.forEach(d => {
          sisaBebanMenit += parseInt(d.durasi_menit, 10) || 0;
        });
      }

      const totalBebanKalkulasiSistem = sisaBebanMenit + durasi;

      // 2. Simulasikan pendaftaran Override (Insert ke DB)
      await trx("trx_antrian_layanan").insert({
        kode_antrian_layanan: kodeAntrian,
        kode_kunjungan: kodeKunjungan,
        kode_ruangan: testKodeRuangan,
        nama_ruangan: "Ruang Body Treatment Test",
        nomor_antrian: `B-${noAntrian}`,
        status: i === 0 ? "dipanggil" : "menunggu",
        override_peringatan_booking: i >= 7 ? 1 : 0,
        catatan_override_booking: i >= 7 ? "Override benturan booking 13:00 WIB" : null,
        dipanggil_at: i === 0 ? new Date() : null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await trx("trx_detail_antrian_layanan").insert({
        kode_detail_antrian_layanan: `DAL-TEST-${String(noAntrian).padStart(3, '0')}`,
        kode_antrian_layanan: kodeAntrian,
        kode_kunjungan: kodeKunjungan,
        jenis_layanan: "layanan",
        kode_layanan: `LAY-TEST-${noAntrian}`,
        nama_layanan: `Treatment Test ${noAntrian}`,
        durasi_menit: durasi,
        created_at: new Date(),
      });

      // 3. Raw Query Verifikasi Langsung dari DB (SUM durasi_menit di database setelah insert)
      const rawDbSum = await trx("trx_antrian_layanan as al")
        .join("trx_detail_antrian_layanan as dal", "al.kode_antrian_layanan", "dal.kode_antrian_layanan")
        .where("al.kode_ruangan", testKodeRuangan)
        .whereIn("al.status", ["dipanggil", "menunggu"])
        .sum("dal.durasi_menit as total_durasi_db")
        .first();

      const totalDurasiDiDb = parseInt(rawDbSum.total_durasi_db, 10);

      snapResults.push({
        pasienKe: noAntrian,
        kodeAntrian,
        durasiPasienBaru: durasi,
        sisaAntreanSebelumnya: `${sisaBebanMenit}m`,
        totalBebanKalkulasi: `${totalBebanKalkulasiSistem}m`,
        rawDbSumSetelahInsert: `${totalDurasiDiDb}m`,
        statusSinkronisasi: totalBebanKalkulasiSistem === totalDurasiDiDb ? "✅ 100% IDENTIK" : "❌ BUG (BEDA)"
      });
    }

    console.table(snapResults);

    // Rollback agar bersih
    await trx.rollback();
    console.log("Pengujian selesai & database di-rollback bersih.");
    process.exit(0);
  } catch (err) {
    await trx.rollback();
    console.error("Error testing:", err);
    process.exit(1);
  }
}

testOverrideSync();
