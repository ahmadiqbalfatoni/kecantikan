import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DB_HOST = '127.0.0.1';
const DB_USER = 'root';
const DB_PASSWORD = '';
const DB_NAME = 'db_klinik_kecantikan';

const menuStructure = [
  {
    "label": "HOME",
    "icon": "pi pi-fw pi-home",
    "items": [
      { "label": "Dashboard", "icon": "pi pi-fw pi-home", "to": "/dashboard" }
    ]
  },
  {
    "label": "Pendaftaran & Antrean",
    "icon": "pi pi-fw pi-calendar",
    "items": [
      { "label": "Antrean Awal", "icon": "pi pi-fw pi-ticket", "to": "/pendaftaran-antrean/antrean-awal" },
      { "label": "Pendaftaran Pasien", "icon": "pi pi-fw pi-user-plus", "to": "/pendaftaran-antrean/pendaftaran-pasien" },
      { "label": "Antrean", "icon": "pi pi-fw pi-list", "to": "/pendaftaran-antrean/antrean" }
    ]
  },
  {
    "label": "Pelayanan Medis",
    "icon": "pi pi-fw pi-heart",
    "items": [
      { "label": "Rekam Medis", "icon": "pi pi-fw pi-folder", "to": "/pelayanan-medis/rekam-medis" },
      { "label": "Riwayat Treatment", "icon": "pi pi-fw pi-history", "to": "/pelayanan-medis/riwayat-treatment" }
    ]
  },
  {
    "label": "Layanan & Treatment",
    "icon": "pi pi-fw pi-sparkles",
    "items": [
      { "label": "Kategori Layanan", "icon": "pi pi-fw pi-tags", "to": "/layanan-treatment/kategori-layanan" },
      { "label": "Data Layanan", "icon": "pi pi-fw pi-briefcase", "to": "/layanan-treatment/data-layanan" },
      { "label": "Paket Layanan", "icon": "pi pi-fw pi-box", "to": "/layanan-treatment/paket-layanan" }
    ]
  },
  {
    "label": "Produk & Skincare",
    "icon": "pi pi-fw pi-shopping-bag",
    "items": [
      { "label": "Kategori Produk", "icon": "pi pi-fw pi-tags", "to": "/produk-skincare/kategori-produk" },
      { "label": "Data Produk", "icon": "pi pi-fw pi-box", "to": "/produk-skincare/data-produk" },
      { "label": "Paket Produk", "icon": "pi pi-fw pi-inbox", "to": "/produk-skincare/paket-produk" },
      { "label": "Stok / Inventori", "icon": "pi pi-fw pi-database", "to": "/produk-skincare/stok-inventori" }
    ]
  },
  {
    "label": "Kasir & Transaksi",
    "icon": "pi pi-fw pi-dollar",
    "items": [
      { "label": "Transaksi", "icon": "pi pi-fw pi-shopping-cart", "to": "/kasir-transaksi/transaksi" },
      { "label": "Promo", "icon": "pi pi-fw pi-percentage", "to": "/kasir-transaksi/promo" }
    ]
  },
  {
    "label": "Alat & Maintenance",
    "icon": "pi pi-fw pi-wrench",
    "to": "/alat-maintenance"
  },
  {
    "label": "Pembelian & Supplier",
    "icon": "pi pi-fw pi-truck",
    "items": [
      { "label": "Supplier", "icon": "pi pi-fw pi-users", "to": "/pembelian-supplier/supplier" },
      { "label": "Purchase Order", "icon": "pi pi-fw pi-file", "to": "/pembelian-supplier/purchase-order" }
    ]
  },
  {
    "label": "Karyawan & Jadwal",
    "icon": "pi pi-fw pi-id-card",
    "items": [
      { "label": "Data Karyawan", "icon": "pi pi-fw pi-users", "to": "/karyawan-jadwal/data-karyawan" },
      { "label": "Jadwal Praktik", "icon": "pi pi-fw pi-clock", "to": "/karyawan-jadwal/jadwal-praktik" }
    ]
  },
  {
    "label": "Master Data & User",
    "icon": "pi pi-fw pi-cog",
    "items": [
      { "label": "Data Pasien", "icon": "pi pi-fw pi-user", "to": "/master-data-user/data-pasien" },
      { "label": "Manajemen Menu", "icon": "pi pi-fw pi-bars", "to": "/setup/navigation" },
      { "label": "Manajemen User", "icon": "pi pi-fw pi-users", "to": "/setup/users" }
    ]
  },
  {
    "label": "Laporan & Analitik",
    "icon": "pi pi-fw pi-chart-bar",
    "to": "/laporan-analitik"
  }
];

async function main() {
  console.log('Connecting to MySQL server...');
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  console.log(`Creating database ${DB_NAME} if not exists...`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
  await connection.query(`USE \`${DB_NAME}\`;`);

  // Read SQL dump file
  const sqlDumpPath = path.join(process.cwd(), '../db_klinik_kecantikan.sql');
  if (fs.existsSync(sqlDumpPath)) {
    console.log('Executing db_klinik_kecantikan.sql dump...');
    const sqlDump = fs.readFileSync(sqlDumpPath, 'utf8');
    const statements = sqlDump
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.warn('Query warning:', e.message);
        }
      }
    }
  }

  // Recreate access_token table with framework schema
  await connection.query('DROP TABLE IF EXISTS `access_token`;');
  await connection.query(`
    CREATE TABLE \`access_token\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`token\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      \`user_code\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
      \`expired\` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
      \`expires_at\` datetime DEFAULT NULL,
      \`datetime\` datetime DEFAULT NULL,
      PRIMARY KEY (\`id\`) USING BTREE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create log table
  await connection.query('DROP TABLE IF EXISTS `log`;');
  await connection.query(`
    CREATE TABLE \`log\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`tgl\` date DEFAULT NULL,
      \`controller\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`function\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`request\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`response\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      \`stack\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      \`user\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`tz\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UTC',
      \`datetime\` datetime DEFAULT NULL,
      \`datetime_eng\` datetime DEFAULT NULL,
      PRIMARY KEY (\`id\`) USING BTREE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create log_perubahan table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`log_perubahan\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`aksi\` enum('CREATE','UPDATE','DELETE','RESTORE') CHARACTER SET armscii8 COLLATE armscii8_bin NOT NULL,
      \`keterangan\` varchar(255) NOT NULL,
      \`nama_tabel\` varchar(50) NOT NULL,
      \`kode_referensi\` varchar(36) CHARACTER SET armscii8 COLLATE armscii8_bin NOT NULL,
      \`data_sebelum\` json DEFAULT NULL,
      \`data_sesudah\` json DEFAULT NULL,
      \`tz\` varchar(50) DEFAULT 'UTC',
      \`created_by\` varchar(50) DEFAULT NULL,
      \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
      \`created_at_eng\` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_log_perubahan_tabel_ref\` (\`nama_tabel\`,\`kode_referensi\`),
      KEY \`idx_log_perubahan_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  // Recreate user_credential table
  await connection.query('DROP TABLE IF EXISTS `user_credential`;');
  await connection.query(`
    CREATE TABLE \`user_credential\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`user_code\` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`username\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`fullname\` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`telp\` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`role\` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`password\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      \`status\` enum('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
      \`tz\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UTC',
      \`created_at\` datetime DEFAULT NULL,
      \`created_by\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`updated_by\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`updated_at\` datetime DEFAULT NULL,
      PRIMARY KEY (\`id\`) USING BTREE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure user_navigation table
  await connection.query('DROP TABLE IF EXISTS `user_navigation`;');
  await connection.query(`
    CREATE TABLE \`user_navigation\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`user_code\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`menu\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      \`tz\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UTC',
      \`created_at\` datetime DEFAULT NULL,
      \`updated_at\` datetime DEFAULT NULL,
      PRIMARY KEY (\`id\`) USING BTREE,
      UNIQUE KEY \`uq_user_navigation_uniqueid\` (\`user_code\`) USING BTREE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure mst_navigation table
  await connection.query('DROP TABLE IF EXISTS `mst_navigation`;');
  await connection.query(`
    CREATE TABLE \`mst_navigation\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`menu\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      \`role\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`tz\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UTC',
      \`created_at\` datetime DEFAULT NULL,
      \`updated_at\` datetime DEFAULT NULL,
      PRIMARY KEY (\`id\`) USING BTREE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Insert superadmin in users table
  console.log('Inserting/updating superadmin in users table...');
  await connection.query(`
    INSERT INTO \`users\` (\`kode_user\`, \`nama\`, \`email\`, \`role\`, \`status\`, \`created_at\`)
    VALUES ('USR000000', 'Superadmin', 'superadmin@admin.com', 'admin', 'aktif', NOW())
    ON DUPLICATE KEY UPDATE \`nama\`='Superadmin', \`role\`='admin', \`status\`='aktif';
  `);

  // Insert superadmin in user_credential table
  const hashedPassword = '5e7bd870d5c8563803be2973dd4403ef50c918d3b728f22787c9514d0f379f94d7f6bbb7e8b0a8cc338a6a18bd399aa8e5888a28b5f91452ad55fd6e2cf0b58c';

  console.log('Inserting superadmin into user_credential...');
  await connection.query(`
    INSERT INTO \`user_credential\` (\`id\`, \`user_code\`, \`username\`, \`fullname\`, \`telp\`, \`role\`, \`password\`, \`status\`, \`tz\`, \`created_at\`, \`updated_at\`)
    VALUES (1, 'USR000000', 'superadmin@admin.com', 'Superadmin', '08100000000', 'superadmin', ?, '1', 'UTC', NOW(), NOW());
  `, [hashedPassword]);

  // Insert user_navigation and mst_navigation
  console.log('Inserting navigation menu with "Menu" section and "Dashboard" sub-item without emojis...');
  const menuJson = JSON.stringify(menuStructure);

  await connection.query(`
    INSERT INTO \`user_navigation\` (\`id\`, \`user_code\`, \`menu\`, \`tz\`, \`created_at\`, \`updated_at\`)
    VALUES (1, 'USR000000', ?, 'UTC', NOW(), NOW());
  `, [menuJson]);

  await connection.query(`
    INSERT INTO \`mst_navigation\` (\`menu\`, \`role\`, \`tz\`, \`created_at\`, \`updated_at\`)
    VALUES (?, 'master', 'UTC', NOW(), NOW());
  `, [menuJson]);

  console.log('Database setup completed successfully!');
  await connection.end();
}

main().catch((err) => {
  console.error('Error setting up database:', err);
  process.exit(1);
});
