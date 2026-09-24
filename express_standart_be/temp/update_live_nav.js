import 'dotenv/config';
import knex from 'knex';

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'db_klinik_kecantikan',
    port: Number(process.env.DB_PORT) || 3306
  }
});

const updatedMenuObj = [
  {
    "label": "HOME",
    "icon": "pi pi-fw pi-home",
    "items": [
      { "label": "Dashboard", "icon": "pi pi-fw pi-home", "to": "/dashboard" }
    ]
  },
  {
    "label": "MASTER DATA",
    "icon": "pi pi-fw pi-database",
    "items": [
      { "label": "Kategori Layanan", "icon": "pi pi-fw pi-tags", "to": "/master-data/kategori-layanan" },
      { "label": "Data Layanan", "icon": "pi pi-fw pi-briefcase", "to": "/master-data/layanan" },
      { "label": "Paket Layanan", "icon": "pi pi-fw pi-box", "to": "/master-data/paket-layanan" },
      { "label": "Kategori Produk", "icon": "pi pi-fw pi-tags", "to": "/master-data/kategori-produk" },
      { "label": "Data Produk", "icon": "pi pi-fw pi-box", "to": "/master-data/produk" },
      { "label": "Paket Produk", "icon": "pi pi-fw pi-inbox", "to": "/master-data/paket-produk" },
      { "label": "Inventori", "icon": "pi pi-fw pi-box", "to": "/master-data/inventori" },
      { "label": "Supplier", "icon": "pi pi-fw pi-truck", "to": "/master-data/supplier" },
      { "label": "Karyawan", "icon": "pi pi-fw pi-users", "to": "/master-data/karyawan" },
      { "label": "Jadwal Karyawan", "icon": "pi pi-fw pi-calendar-times", "to": "/master-data/jadwal-karyawan" },
      { "label": "Alat & Peralatan", "icon": "pi pi-fw pi-wrench", "to": "/master-data/alat" },
      { "label": "Data Ruangan", "icon": "pi pi-fw pi-building", "to": "/master-data/ruangan" },
      { "label": "Data Promo", "icon": "pi pi-fw pi-percentage", "to": "/master-data/promo" },
      { "label": "Detail Promo", "icon": "pi pi-fw pi-tags", "to": "/master-data/detail-promo" }
    ]
  },
  {
    "label": "Pendaftaran & Antrean",
    "icon": "pi pi-fw pi-calendar",
    "items": [
      { "label": "Antrean Pendaftaran", "icon": "pi pi-fw pi-ticket", "to": "/antrian-awal" },
      { "label": "Pendaftaran Pasien", "icon": "pi pi-fw pi-user-plus", "to": "/pendaftaran-antrean/pendaftaran-pasien" }
    ]
  },
  {
    "label": "PENGATURAN",
    "icon": "pi pi-fw pi-cog",
    "items": [
      { "label": "Data Pasien", "icon": "pi pi-fw pi-user", "to": "/master-data-user/data-pasien" },
      { "label": "Manajemen Menu", "icon": "pi pi-fw pi-bars", "to": "/setup/navigation" },
      { "label": "Manajemen User", "icon": "pi pi-fw pi-users", "to": "/setup/users" }
    ]
  }
];

async function updateDbNav() {
  try {
    const menuStr = JSON.stringify(updatedMenuObj);
    const updated = await db('mst_navigation')
      .where({ role: 'master' })
      .update({ menu: menuStr });
    
    console.log('DB nav update count:', updated);
    
    // Also check if user_navigation table has rows and update them if needed
    const hasUserNav = await db.schema.hasTable('user_navigation');
    if (hasUserNav) {
      const updatedUserNav = await db('user_navigation').update({ menu: menuStr });
      console.log('user_navigation update count:', updatedUserNav);
    }
  } catch (err) {
    console.error('Error updating DB nav:', err.message);
  } finally {
    await db.destroy();
  }
}

updateDbNav();
