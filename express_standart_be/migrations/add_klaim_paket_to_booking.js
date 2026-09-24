import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    console.log("Starting migration: add_klaim_paket_to_booking...");

    // 1. Modifikasi jenis_layanan pada trx_booking
    await DB.schema.raw(`
      ALTER TABLE trx_booking 
      MODIFY COLUMN jenis_layanan ENUM('layanan', 'paket', 'klaim_paket', 'campuran') NULL;
    `);
    console.log("Migration SUCCESS: Altered jenis_layanan in trx_booking.");

    // 2. Tambahkan kolom ke trx_detail_booking jika belum ada
    const hasJenisItem = await DB.schema.hasColumn("trx_detail_booking", "jenis_item");
    if (!hasJenisItem) {
      await DB.schema.raw(`
        ALTER TABLE trx_detail_booking
        ADD COLUMN jenis_item ENUM('layanan_baru', 'paket_baru', 'klaim_paket') NOT NULL DEFAULT 'layanan_baru' AFTER jenis_layanan,
        ADD COLUMN kode_kepemilikan_paket_layanan VARCHAR(20) NULL DEFAULT NULL AFTER kode_layanan,
        ADD COLUMN kode_detail_kepemilikan_paket_layanan VARCHAR(20) NULL DEFAULT NULL AFTER kode_kepemilikan_paket_layanan,
        ADD INDEX idx_kpl (kode_kepemilikan_paket_layanan),
        ADD INDEX idx_dkpl (kode_detail_kepemilikan_paket_layanan);
      `);
      console.log("Migration SUCCESS: Added jenis_item, kode_kepemilikan_paket_layanan, kode_detail_kepemilikan_paket_layanan to trx_detail_booking.");
    } else {
      console.log("Migration SKIPPED: Columns already exist in trx_detail_booking.");
    }

    // 3. Tambahkan Foreign Key constraints jika belum ada
    try {
      await DB.schema.raw(`
        ALTER TABLE trx_detail_booking
        ADD CONSTRAINT fk_detail_booking_kpl 
          FOREIGN KEY (kode_kepemilikan_paket_layanan) 
          REFERENCES trx_kepemilikan_paket_layanan(kode_kepemilikan_paket_layanan) 
          ON DELETE SET NULL;
      `);
      console.log("Migration SUCCESS: Added fk_detail_booking_kpl.");
    } catch (fkErr) {
      console.log("FK fk_detail_booking_kpl note:", fkErr.message);
    }

    try {
      await DB.schema.raw(`
        ALTER TABLE trx_detail_booking
        ADD CONSTRAINT fk_detail_booking_dkpl 
          FOREIGN KEY (kode_detail_kepemilikan_paket_layanan) 
          REFERENCES trx_detail_kepemilikan_paket_layanan(kode_detail_kepemilikan_paket_layanan) 
          ON DELETE SET NULL;
      `);
      console.log("Migration SUCCESS: Added fk_detail_booking_dkpl.");
    } catch (fkErr) {
      console.log("FK fk_detail_booking_dkpl note:", fkErr.message);
    }

    // 4. Sinkronisasi data lama & perluas jenis_layanan
    await DB.schema.raw(`
      UPDATE trx_detail_booking 
      SET jenis_item = IF(jenis_layanan = 'paket', 'paket_baru', 'layanan_baru')
      WHERE jenis_item = 'layanan_baru' AND jenis_layanan = 'paket';
    `);

    await DB.schema.raw(`
      ALTER TABLE trx_detail_booking
      MODIFY COLUMN jenis_layanan ENUM('layanan', 'paket', 'klaim_paket') NOT NULL;
    `);
    console.log("Migration SUCCESS: Updated jenis_layanan enum in trx_detail_booking.");

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration ERROR:", error);
    process.exit(1);
  } finally {
    await DB.destroy();
  }
}

runMigration();
