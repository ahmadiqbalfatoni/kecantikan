import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    // 1. Pastikan kolom kode_booking ada di trx_kunjungan
    const hasKodeBooking = await DB.schema.hasColumn("trx_kunjungan", "kode_booking");
    if (!hasKodeBooking) {
      await DB.schema.table("trx_kunjungan", (table) => {
        table.string("kode_booking", 20).nullable().after("no_rm");
      });
      console.log("Migration SUCCESS: Added kode_booking column to trx_kunjungan.");
    } else {
      console.log("Migration SKIPPED: Column kode_booking already exists in trx_kunjungan.");
    }

    // 2. Buat tabel trx_booking jika belum ada
    const hasTrxBooking = await DB.schema.hasTable("trx_booking");
    if (!hasTrxBooking) {
      await DB.schema.raw(`
        CREATE TABLE trx_booking (
          id INT AUTO_INCREMENT,
          kode_booking VARCHAR(20) NOT NULL,
          no_rm VARCHAR(20) NOT NULL,
          jenis_layanan ENUM('layanan','paket') NOT NULL,
          kode_layanan VARCHAR(20) NOT NULL,
          kode_jadwal VARCHAR(20) NOT NULL,
          tanggal_booking DATE NOT NULL,
          jam_booking TIME NOT NULL,
          catatan_pasien TEXT NULL,
          status ENUM('dikonfirmasi','dibatalkan','selesai','tidak_hadir') NOT NULL DEFAULT 'dikonfirmasi',
          dp_nominal DECIMAL(12,2) NOT NULL DEFAULT 0,
          dp_status ENUM('belum_bayar','sudah_bayar','hangus','dipotong_treatment') NOT NULL DEFAULT 'belum_bayar',
          dp_dibayar_at TIMESTAMP NULL,
          sumber ENUM('staff','whatsapp') NOT NULL DEFAULT 'staff',
          tz VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
          created_by VARCHAR(100) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(100) DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_kode_booking (kode_booking),
          FOREIGN KEY (no_rm) REFERENCES mst_pasien(no_rm),
          FOREIGN KEY (kode_jadwal) REFERENCES mst_jadwal_karyawan(kode_jadwal)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("Migration SUCCESS: Created table trx_booking.");
    } else {
      console.log("Migration SKIPPED: Table trx_booking already exists.");
    }
  } catch (error) {
    console.error("Migration ERROR:", error);
    process.exit(1);
  } finally {
    await DB.destroy();
  }
}

runMigration();
