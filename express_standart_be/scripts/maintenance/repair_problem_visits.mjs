import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { default: DB } = await import('../../core/config/knex.js');
const { formatDateSystem } = await import('../../routes/v1/components/tools/date_tools.js');

/**
 * Script perbaikan data SATU KALI untuk kunjungan bermasalah:
 * - KJ-20260909-003: Menambahkan item rujukan LAY-002 yang hilang ke TRX-20260909-002 dan update total ke Rp 350.000
 * - KJ-20260909-001, KJ-20260908-001, KJ-20260908-002, KJ-20260907-005 s.d. 009:
 *   Membuat draf transaksi baru lengkap dengan detail layanan asli dan update status kunjungan/antrean ke 'selesai'
 *
 * PERINGATAN: Jangan jalankan script ini sebelum konfirmasi pengguna!
 */
export async function executeRepair() {
  console.log('Menjalankan perbaikan data...');

  const results = [];

  await DB.transaction(async (trx) => {
    // 1. KJ-20260909-003 (Item hilang: LAY-002 Acne Care Treatment Rp 200.000)
    const kj003 = await trx('trx_kunjungan').where('kode_kunjungan', 'KJ-20260909-003').first();
    if (kj003) {
      const existingTrx = await trx('trx_transaksi').where('kode_kunjungan', 'KJ-20260909-003').first();
      if (existingTrx) {
        const existingDetails = await trx('trx_detail_transaksi').where('kode_transaksi', existingTrx.kode_transaksi);
        const hasLay002 = existingDetails.some(d => d.kode_layanan === 'LAY-002');
        if (!hasLay002) {
          const prefixDetail = `DT-20260909-`;
          const lastDetail = await trx('trx_detail_transaksi')
            .where('kode_detail_transaksi', 'like', `${prefixDetail}%`)
            .orderBy('id', 'desc')
            .first();

          let dtSeq = 1;
          if (lastDetail && lastDetail.kode_detail_transaksi) {
            const parts = lastDetail.kode_detail_transaksi.split('-');
            const num = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(num)) dtSeq = num + 1;
          }

          const cKodeDetail = `${prefixDetail}${String(dtSeq).padStart(3, '0')}`;
          await trx('trx_detail_transaksi').insert({
            kode_detail_transaksi: cKodeDetail,
            kode_transaksi: existingTrx.kode_transaksi,
            kode_layanan: 'LAY-002',
            kode_produk: null,
            qty: 1,
            harga_satuan: 200000,
            subtotal: 200000,
            is_from_pendaftaran: 1,
            tz: 'Asia/Jakarta',
            created_by: 'system_repair',
            created_at: formatDateSystem(),
            updated_by: 'system_repair',
            updated_at: formatDateSystem(),
          });

          // Recalculate total
          const sumRes = await trx('trx_detail_transaksi')
            .where('kode_transaksi', existingTrx.kode_transaksi)
            .sum('subtotal as total');

          const newTotal = parseFloat(sumRes[0]?.total || 350000);
          await trx('trx_transaksi')
            .where('kode_transaksi', existingTrx.kode_transaksi)
            .update({
              total_harga: newTotal,
              total_bayar: newTotal,
              updated_by: 'system_repair',
              updated_at: formatDateSystem(),
            });

          results.push({
            kunjungan: 'KJ-20260909-003',
            transaksi: existingTrx.kode_transaksi,
            status: 'BERHASIL: Ditambahkan LAY-002 (Rp 200.000). Total baru: Rp ' + newTotal,
          });
        } else {
          results.push({
            kunjungan: 'KJ-20260909-003',
            status: 'LEWAT: Item LAY-002 sudah ada di transaksi',
          });
        }
      }
    }

    // 2. Kunjungan tanpa draf transaksi
    const visitsWithoutTrx = [
      'KJ-20260909-001',
      'KJ-20260908-001',
      'KJ-20260908-002',
      'KJ-20260907-005',
      'KJ-20260907-006',
      'KJ-20260907-007',
      'KJ-20260907-008',
      'KJ-20260907-009',
      'KJ-20260911-001',
      'KJ-20260911-002',
    ];

    for (const kodeKunjungan of visitsWithoutTrx) {
      const kj = await trx('trx_kunjungan').where('kode_kunjungan', kodeKunjungan).first();
      if (!kj) continue;

      let existingTrx = await trx('trx_transaksi').where('kode_kunjungan', kodeKunjungan).first();
      const dalList = await trx('trx_detail_antrian_layanan').where('kode_kunjungan', kodeKunjungan);

      const tglRaw = kj.tanggal_kunjungan ? new Date(kj.tanggal_kunjungan) : new Date();
      const ymd = tglRaw.toISOString().slice(0, 10);
      const ymdClean = ymd.replace(/-/g, '');

      if (!existingTrx) {
        const prefixTrx = `TRX-${ymdClean}-`;
        const lastTrx = await trx('trx_transaksi')
          .where('kode_transaksi', 'like', `${prefixTrx}%`)
          .orderBy('id', 'desc')
          .first();

        let nextTrxSeq = 1;
        if (lastTrx && lastTrx.kode_transaksi) {
          const parts = lastTrx.kode_transaksi.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num)) nextTrxSeq = num + 1;
        }
        const createdTransaksiKode = `${prefixTrx}${String(nextTrxSeq).padStart(3, '0')}`;

        await trx('trx_transaksi').insert({
          kode_transaksi: createdTransaksiKode,
          kode_kunjungan: kodeKunjungan,
          no_rm: kj.no_rm,
          tanggal_transaksi: ymd,
          total_harga: 0,
          total_diskon: 0,
          total_bayar: 0,
          metode_bayar: 'tunai',
          status: 'draft',
          tz: kj.tz || 'Asia/Jakarta',
          created_by: 'system_repair',
          created_at: formatDateSystem(),
          updated_by: 'system_repair',
          updated_at: formatDateSystem(),
        });

        existingTrx = { kode_transaksi: createdTransaksiKode };
      }

      // Insert detail items
      const prefixDetail = `DT-${ymdClean}-`;
      const lastDetail = await trx('trx_detail_transaksi')
        .where('kode_detail_transaksi', 'like', `${prefixDetail}%`)
        .orderBy('id', 'desc')
        .first();

      let dtSeq = 1;
      if (lastDetail && lastDetail.kode_detail_transaksi) {
        const parts = lastDetail.kode_detail_transaksi.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num)) dtSeq = num + 1;
      }

      const existingDetails = await trx('trx_detail_transaksi')
        .where('kode_transaksi', existingTrx.kode_transaksi);
      const existingCodes = new Set(existingDetails.map(d => d.kode_layanan).filter(Boolean));

      for (const dal of dalList) {
        if (!existingCodes.has(dal.kode_layanan)) {
          existingCodes.add(dal.kode_layanan);
          const cKodeDetail = `${prefixDetail}${String(dtSeq).padStart(3, '0')}`;
          dtSeq++;

          const isKlaim = (dal.jenis_layanan || '').toLowerCase() === 'klaim_paket';
          const harga = isKlaim ? 0 : parseFloat(dal.harga || 0);

          await trx('trx_detail_transaksi').insert({
            kode_detail_transaksi: cKodeDetail,
            kode_transaksi: existingTrx.kode_transaksi,
            kode_layanan: dal.kode_layanan,
            kode_produk: null,
            qty: 1,
            harga_satuan: harga,
            subtotal: harga,
            is_from_pendaftaran: 1,
            tz: kj.tz || 'Asia/Jakarta',
            created_by: 'system_repair',
            created_at: formatDateSystem(),
            updated_by: 'system_repair',
            updated_at: formatDateSystem(),
          });
        }
      }

      // Recalculate total
      const sumRes = await trx('trx_detail_transaksi')
        .where('kode_transaksi', existingTrx.kode_transaksi)
        .sum('subtotal as total');
      const grandTotal = parseFloat(sumRes[0]?.total || 0);

      await trx('trx_transaksi')
        .where('kode_transaksi', existingTrx.kode_transaksi)
        .update({
          total_harga: grandTotal,
          total_bayar: grandTotal,
          updated_by: 'system_repair',
          updated_at: formatDateSystem(),
        });

      // Update antrian & kunjungan ke status 'selesai'
      await trx('trx_antrian_layanan')
        .where('kode_kunjungan', kodeKunjungan)
        .where('status', '!=', 'batal')
        .update({
          status: 'selesai',
          selesai_at: formatDateSystem(),
          updated_by: 'system_repair',
          updated_at: formatDateSystem(),
        });

      await trx('trx_kunjungan')
        .where('kode_kunjungan', kodeKunjungan)
        .update({
          status: 'selesai',
          updated_by: 'system_repair',
          updated_at: formatDateSystem(),
        });

      results.push({
        kunjungan: kodeKunjungan,
        transaksi: existingTrx.kode_transaksi,
        status: `BERHASIL: Dibuat draf transaksi dengan total Rp ${grandTotal}, status kunjungan & antrian diupdate ke 'selesai'`,
      });
    }
  });

  console.log('HASIL PERBAIKAN:');
  console.log(JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[2] === '--confirm-execute') {
  executeRepair().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
