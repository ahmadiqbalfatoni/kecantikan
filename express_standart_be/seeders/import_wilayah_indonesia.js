/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file import_wilayah_indonesia.js
 * @description Seeder script untuk mengunggah dataset resmi Wilayah Indonesia (emsifa/api-wilayah-indonesia) ke MySQL
 */

import DB from '../core/config/knex.js';

const BASE_URL = 'https://emsifa.github.io/api-wilayah-indonesia/api';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP Error ${res.status}: ${url}`);
  return await res.json();
}

export async function runSeeder() {
  console.log('🚀 Memulai Import Dataset Wilayah Indonesia...');
  const startTime = Date.now();

  try {
    // 1. Check existing provinces
    const existingProvCount = await DB('mst_provinsi').count('kode as total').first();
    const totalProv = parseInt(existingProvCount?.total || 0, 10);

    if (totalProv > 0) {
      console.log(`ℹ️ Data mst_provinsi sudah terisi (${totalProv} provinsi). Skipping full import.`);
      return;
    }

    // 2. Import Provinsi
    console.log('📦 1/4 Mengunduh data Provinsi...');
    const rawProvinces = await fetchJson(`${BASE_URL}/provinces.json`);
    const provInserts = rawProvinces.map((p) => ({
      kode: String(p.id).trim(),
      nama: String(p.name).trim().toUpperCase(),
    }));
    await DB.batchInsert('mst_provinsi', provInserts, 50);
    console.log(`✅ Berhasil menyimpan ${provInserts.length} Provinsi.`);

    // 3. Import Kabupaten/Kota
    console.log('📦 2/4 Mengunduh data Kabupaten / Kota...');
    let allRegencies = [];
    for (const prov of provInserts) {
      try {
        const regList = await fetchJson(`${BASE_URL}/regencies/${prov.kode}.json`);
        const formatted = regList.map((r) => ({
          kode: String(r.id).trim(),
          kode_provinsi: String(r.province_id || prov.kode).trim(),
          nama: String(r.name).trim().toUpperCase(),
        }));
        allRegencies.push(...formatted);
      } catch (err) {
        console.warn(`⚠️ Gagal memuat kabupaten untuk provinsi ${prov.kode} (${prov.nama})`);
      }
    }
    await DB.batchInsert('mst_kabupaten', allRegencies, 200);
    console.log(`✅ Berhasil menyimpan ${allRegencies.length} Kabupaten / Kota.`);

    // 4. Import Kecamatan
    console.log('📦 3/4 Mengunduh data Kecamatan...');
    let allDistricts = [];
    for (const reg of allRegencies) {
      try {
        const distList = await fetchJson(`${BASE_URL}/districts/${reg.kode}.json`);
        const formatted = distList.map((d) => ({
          kode: String(d.id).trim(),
          kode_kabupaten: String(d.regency_id || reg.kode).trim(),
          nama: String(d.name).trim().toUpperCase(),
        }));
        allDistricts.push(...formatted);
      } catch (err) {
        console.warn(`⚠️ Gagal memuat kecamatan untuk kabupaten ${reg.kode} (${reg.nama})`);
      }
    }
    await DB.batchInsert('mst_kecamatan', allDistricts, 500);
    console.log(`✅ Berhasil menyimpan ${allDistricts.length} Kecamatan.`);

    // 5. Import Kelurahan/Desa
    console.log('📦 4/4 Mengunduh data Kelurahan / Desa (~80.000 data)...');
    let totalVillagesCount = 0;
    let villageBuffer = [];

    for (let i = 0; i < allDistricts.length; i++) {
      const dist = allDistricts[i];
      try {
        const vilList = await fetchJson(`${BASE_URL}/villages/${dist.kode}.json`);
        const formatted = vilList.map((v) => ({
          kode: String(v.id).trim(),
          kode_kecamatan: String(v.district_id || dist.kode).trim(),
          nama: String(v.name).trim().toUpperCase(),
        }));
        villageBuffer.push(...formatted);

        if (villageBuffer.length >= 2000 || i === allDistricts.length - 1) {
          await DB.batchInsert('mst_kelurahan', villageBuffer, 1000);
          totalVillagesCount += villageBuffer.length;
          villageBuffer = [];
          if (i % 500 === 0 || i === allDistricts.length - 1) {
            console.log(`   Progress Kelurahan: ${totalVillagesCount} terproses... (${Math.round((i / allDistricts.length) * 100)}%)`);
          }
        }
      } catch (err) {
        // Continue if single district fails
      }
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`🎉 SUKSES! Import Wilayah Indonesia Selesai dalam ${durationSec} detik.`);
    console.log(`   - Provinsi: ${provInserts.length}`);
    console.log(`   - Kabupaten/Kota: ${allRegencies.length}`);
    console.log(`   - Kecamatan: ${allDistricts.length}`);
    console.log(`   - Kelurahan/Desa: ${totalVillagesCount}`);
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat seeding wilayah:', error);
  }
}

if (process.argv[1] && process.argv[1].endsWith('import_wilayah_indonesia.js')) {
  runSeeder().then(() => process.exit(0));
}
