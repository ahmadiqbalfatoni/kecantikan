import DB from './core/config/knex.js';

async function test() {
  try {
    const filterTanggal = '2026-08-22';
    const baseQuery = DB('trx_antrian_layanan as al')
      .leftJoin('trx_kunjungan as k', 'al.kode_kunjungan', 'k.kode_kunjungan')
      .leftJoin('mst_pasien as p', 'k.no_rm', 'p.no_rm')
      .leftJoin('mst_layanan as ml', function () {
        this.on('al.kode_layanan', '=', 'ml.kode_layanan').andOnVal('al.jenis_layanan', '=', 'layanan');
      })
      .leftJoin('mst_paket_layanan as mp', function () {
        this.on('al.kode_layanan', '=', 'mp.kode_paket_layanan').andOnVal('al.jenis_layanan', '=', 'paket');
      })
      .leftJoin('mst_ruangan as rml', 'ml.kode_ruangan', 'rml.kode_ruangan')
      .leftJoin('mst_ruangan as rmp', 'mp.kode_ruangan', 'rmp.kode_ruangan')
      .leftJoin('mst_ruangan as ral', 'al.kode_ruangan', 'ral.kode_ruangan')
      .modify((qb) => {
        if (filterTanggal) qb.whereRaw('DATE(al.created_at) = ?', [filterTanggal]);
      });

    const selectFields = [
      'al.id',
      'al.kode_antrian_layanan',
      'al.kode_kunjungan',
      'al.nomor_antrian',
      'al.jenis_layanan',
      'al.kode_layanan',
      'al.status',
      'al.dipanggil_at',
      'al.selesai_at',
      'al.created_at',
      'k.no_rm',
      'k.jam_datang',
      'p.nama as nama_pasien',
      'p.no_hp',
      DB.raw("COALESCE(al.kode_ruangan, ml.kode_ruangan, mp.kode_ruangan, 'RG-01') as kode_ruangan"),
      DB.raw("COALESCE(ral.nama_ruangan, rml.nama_ruangan, rmp.nama_ruangan, 'Ruang Treatment') as nama_ruangan"),
      DB.raw("COALESCE(ml.nama, mp.nama, '-') as nama_layanan"),
      DB.raw("(SELECT COALESCE(SUM(jumlah_sesi), 1) FROM mst_detail_paket_layanan WHERE kode_paket_layanan = al.kode_layanan) as jumlah_sesi_paket")
    ];

    const vaData = await baseQuery.clone().select(selectFields);
    console.log('vaData RESULT SUCCESS:', JSON.stringify(vaData, null, 2));
  } catch (e) {
    console.error('QUERY CATCH ERROR:', e);
  }
  process.exit(0);
}

test();
