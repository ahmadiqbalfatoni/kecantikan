/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file create_mst_wilayah_tables.js
 * @description Migration untuk membuat tabel master wilayah Indonesia (mst_provinsi, mst_kabupaten, mst_kecamatan, mst_kelurahan)
 */

export async function up(knex) {
  // 1. mst_provinsi
  const hasProv = await knex.schema.hasTable('mst_provinsi');
  if (!hasProv) {
    await knex.schema.createTable('mst_provinsi', (table) => {
      table.string('kode', 10).primary();
      table.string('nama', 100).notNullable();
      table.timestamps(true, true);
    });
  }

  // 2. mst_kabupaten
  const hasKab = await knex.schema.hasTable('mst_kabupaten');
  if (!hasKab) {
    await knex.schema.createTable('mst_kabupaten', (table) => {
      table.string('kode', 10).primary();
      table.string('kode_provinsi', 10).notNullable().index();
      table.string('nama', 100).notNullable();
      table.timestamps(true, true);
    });
  }

  // 3. mst_kecamatan
  const hasKec = await knex.schema.hasTable('mst_kecamatan');
  if (!hasKec) {
    await knex.schema.createTable('mst_kecamatan', (table) => {
      table.string('kode', 10).primary();
      table.string('kode_kabupaten', 10).notNullable().index();
      table.string('nama', 100).notNullable();
      table.timestamps(true, true);
    });
  }

  // 4. mst_kelurahan
  const hasKel = await knex.schema.hasTable('mst_kelurahan');
  if (!hasKel) {
    await knex.schema.createTable('mst_kelurahan', (table) => {
      table.string('kode', 15).primary();
      table.string('kode_kecamatan', 10).notNullable().index();
      table.string('nama', 100).notNullable();
      table.timestamps(true, true);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('mst_kelurahan');
  await knex.schema.dropTableIfExists('mst_kecamatan');
  await knex.schema.dropTableIfExists('mst_kabupaten');
  await knex.schema.dropTableIfExists('mst_provinsi');
}
