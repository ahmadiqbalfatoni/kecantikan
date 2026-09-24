-- =============================================================================
-- MIGRATION SCHEMA NORMALISASI REKAM MEDIS
-- File: migration_rekam_medis_normalisasi.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `trx_rekam_medis_ruangan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kode_rekam_medis_ruangan` varchar(50) NOT NULL,
  `id_rekam_medis` int NOT NULL COMMENT 'FK ke trx_rekam_medis.id (header per kunjungan)',
  `kode_kunjungan` varchar(20) NOT NULL,
  `kode_antrian_layanan` varchar(20) DEFAULT NULL,
  `kode_ruangan` varchar(20) NOT NULL,
  `nama_ruangan` varchar(100) DEFAULT NULL COMMENT 'Denormalisasi nama ruangan saat itu, untuk histori jika nama berubah',
  `kode_karyawan` varchar(20) DEFAULT NULL COMMENT 'Petugas/dokter yang menangani di ruangan ini',
  `data_form` json DEFAULT NULL,
  `catatan_tindakan` text COMMENT 'Catatan tindakan dari Form Penanganan Pasien (step 1)',
  `catatan_petugas` text COMMENT 'Catatan petugas untuk ruangan ini (overwrite, bukan concat)',
  `catatan_hasil_treatment` text COMMENT 'Dari step "Hasil Treatment" -- kondisi pasien setelah treatment',
  `status` enum('berlangsung','selesai','batal') NOT NULL DEFAULT 'berlangsung',
  `tz` varchar(50) NOT NULL DEFAULT 'Asia/Jakarta',
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(100) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kode_rekam_medis_ruangan` (`kode_rekam_medis_ruangan`),
  KEY `idx_id_rekam_medis` (`id_rekam_medis`),
  KEY `idx_kode_kunjungan` (`kode_kunjungan`),
  KEY `idx_kode_antrian_layanan` (`kode_antrian_layanan`),
  KEY `idx_kode_ruangan` (`kode_ruangan`),
  CONSTRAINT `fk_rmr_rekam_medis` FOREIGN KEY (`id_rekam_medis`) REFERENCES `trx_rekam_medis` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Memastikan kolom id_rekam_medis_ruangan & FK terpasang di trx_rekam_medis_foto
SET @exist_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trx_rekam_medis_foto' AND COLUMN_NAME = 'id_rekam_medis_ruangan');
SET @sql_col := IF(@exist_col = 0, 'ALTER TABLE `trx_rekam_medis_foto` ADD COLUMN `id_rekam_medis_ruangan` INT NULL AFTER `id_rekam_medis`', 'SELECT 1');
PREPARE stmt FROM @sql_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trx_rekam_medis_foto' AND CONSTRAINT_NAME = 'fk_foto_rekam_medis_ruangan');
SET @sql_fk := IF(@exist_fk = 0, 'ALTER TABLE `trx_rekam_medis_foto` ADD CONSTRAINT `fk_foto_rekam_medis_ruangan` FOREIGN KEY (`id_rekam_medis_ruangan`) REFERENCES `trx_rekam_medis_ruangan` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
