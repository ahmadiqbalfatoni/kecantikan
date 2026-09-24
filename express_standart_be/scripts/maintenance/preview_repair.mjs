import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { default: DB } = await import('../../core/config/knex.js');

async function main() {
  const targetVisits = [
    'KJ-20260909-003',
    'KJ-20260909-001',
    'KJ-20260910-005',
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

  console.log('='.repeat(80));
  console.log('PREVIEW PERBAIKAN DATA HISTORIS');
  console.log('='.repeat(80));

  const previewResults = [];

  for (const kodeKunjungan of targetVisits) {
    const kunjungan = await DB('trx_kunjungan as k')
      .leftJoin('mst_pasien as p', 'k.no_rm', 'p.no_rm')
      .where('k.kode_kunjungan', kodeKunjungan)
      .select('k.*', 'p.nama as nama_pasien')
      .first();

    if (!kunjungan) {
      previewResults.push({
        kode_kunjungan: kodeKunjungan,
        nama_pasien: '-',
        status_kunjungan: 'TIDAK DITEMUKAN',
        aksi: 'Dilewati (Record kunjungan tidak ada di database)',
        item_sebelumnya: [],
        item_yang_akan_ditambahkan: [],
        total_harga_sebelum: 0,
        total_harga_sesudah: 0,
      });
      continue;
    }

    // Ambil antrean layanan & detail antrean layanan
    const antrianList = await DB('trx_antrian_layanan')
      .where('kode_kunjungan', kodeKunjungan)
      .orderBy('id', 'asc');

    const dalList = await DB('trx_detail_antrian_layanan as dal')
      .join('trx_antrian_layanan as al', 'dal.kode_antrian_layanan', 'al.kode_antrian_layanan')
      .where('al.kode_kunjungan', kodeKunjungan)
      .select('dal.*', 'al.status as status_antrian', 'al.nama_ruangan')
      .orderBy('dal.id', 'asc');

    // Cek transaksi yang ada
    const existingTrx = await DB('trx_transaksi')
      .where('kode_kunjungan', kodeKunjungan)
      .first();

    let existingDetails = [];
    if (existingTrx) {
      existingDetails = await DB('trx_detail_transaksi')
        .where('kode_transaksi', existingTrx.kode_transaksi)
        .orderBy('id', 'asc');
    }

    const totalSebelum = existingTrx ? parseFloat(existingTrx.total_harga || 0) : 0;

    // Hitung item yang harusnya ada
    const existingServiceCodes = new Set(existingDetails.map(d => d.kode_layanan).filter(Boolean));
    const itemsToAdd = [];

    for (const dal of dalList) {
      if (!existingServiceCodes.has(dal.kode_layanan)) {
        const isKlaim = (dal.jenis_layanan || '').toLowerCase() === 'klaim_paket';
        const harga = isKlaim ? 0 : parseFloat(dal.harga || 0);
        itemsToAdd.push({
          kode_layanan: dal.kode_layanan,
          nama_layanan: dal.nama_layanan,
          harga: harga,
          jenis_layanan: dal.jenis_layanan,
          antrian: dal.kode_antrian_layanan,
          ruangan: dal.nama_ruangan,
        });
      }
    }

    const totalSesudah = totalSebelum + itemsToAdd.reduce((sum, it) => sum + it.harga, 0);

    let aksi = '';
    if (!existingTrx) {
      aksi = 'Buat Draft Transaksi Baru & Isi Detail Layanan';
    } else if (itemsToAdd.length > 0) {
      aksi = `Update Draft Transaksi (${existingTrx.kode_transaksi}) - Tambah ${itemsToAdd.length} Item Hilang`;
    } else {
      aksi = 'Sudah Lengkap (Tidak ada perubahan)';
    }

    previewResults.push({
      kode_kunjungan: kodeKunjungan,
      no_rm: kunjungan.no_rm,
      nama_pasien: kunjungan.nama_pasien || '-',
      tanggal_kunjungan: kunjungan.tanggal_kunjungan,
      status_kunjungan_sekarang: kunjungan.status,
      status_antrian: antrianList.map(a => `${a.kode_antrian_layanan} (${a.status})`).join(', '),
      transaksi_sekarang: existingTrx ? `${existingTrx.kode_transaksi} [${existingTrx.status}]` : 'Belum Ada',
      total_sebelum: totalSebelum,
      items_sebelumnya: existingDetails.map(d => `${d.kode_layanan || d.kode_produk} (Rp ${parseFloat(d.subtotal)})`),
      items_akan_ditambah: itemsToAdd,
      total_sesudah: totalSesudah,
      aksi: aksi,
    });
  }

  console.log(JSON.stringify(previewResults, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
