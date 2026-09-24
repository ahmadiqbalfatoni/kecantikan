import "dotenv/config";
import DB from "../../core/config/knex.js";
import { formatDateSystem } from "../../routes/v1/components/tools/date_tools.js";
import { hmac } from "../../routes/v1/components/tools/encrypt_tools.js";

// Definisi Template Menu untuk Masing-Masing Role
const MASTER_FULL_MENU = [
  {
    label: "HOME",
    icon: "pi pi-fw pi-home",
    items: [
      { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/dashboard" }
    ]
  },
  {
    label: "MASTER DATA",
    icon: "pi pi-fw pi-database",
    items: [
      { label: "Kategori Layanan", icon: "pi pi-fw pi-tags", to: "/master-data/kategori-layanan" },
      { label: "Data Layanan", icon: "pi pi-fw pi-briefcase", to: "/master-data/layanan" },
      { label: "Paket Layanan", icon: "pi pi-fw pi-box", to: "/master-data/paket-layanan" },
      { label: "Kategori Produk", icon: "pi pi-fw pi-tags", to: "/master-data/kategori-produk" },
      { label: "Data Produk", icon: "pi pi-fw pi-box", to: "/master-data/produk" },
      { label: "Paket Produk", icon: "pi pi-fw pi-inbox", to: "/master-data/paket-produk" },
      { label: "Inventori", icon: "pi pi-fw pi-box", to: "/master-data/inventori" },
      { label: "Supplier", icon: "pi pi-fw pi-truck", to: "/master-data/supplier" },
      { label: "Karyawan", icon: "pi pi-fw pi-users", to: "/master-data/karyawan" },
      { label: "Jadwal Karyawan", icon: "pi pi-fw pi-calendar-times", to: "/master-data/jadwal-karyawan" },
      { label: "Alat & Peralatan", icon: "pi pi-fw pi-wrench", to: "/master-data/alat" },
      { label: "Data Ruangan", icon: "pi pi-fw pi-building", to: "/master-data/ruangan" },
      { label: "Data Promo", icon: "pi pi-fw pi-percentage", to: "/master-data/promo" },
      { label: "Detail Promo", icon: "pi pi-fw pi-tags", to: "/master-data/detail-promo" }
    ]
  },
  {
    label: "Pendaftaran & Antrean",
    icon: "pi pi-fw pi-calendar",
    items: [
      { label: "Antrean Pendaftaran", icon: "pi pi-fw pi-ticket", to: "/antrian-awal" },
      { label: "Pasien Baru", icon: "UserPlus", to: "/pendaftaran-antrean/registrasi-pasien" },
      { label: "Pendaftaran Kunjungan", icon: "ClipboardList", to: "/pendaftaran-antrean/pendaftaran-pasien" },
      { label: "Data Pasien", icon: "pi pi-fw pi-user", to: "/master-data-user/data-pasien" }
    ]
  },
  {
    label: "LAYANAN",
    icon: "pi pi-fw pi-sparkles",
    items: [
      { label: "Tindakan", icon: "pi pi-fw pi-sparkles", to: "/pendaftaran-antrean/antrean?type=layanan" },
      { label: "Konsultasi", icon: "pi pi-fw pi-comments", to: "/pendaftaran-antrean/antrean?type=konsul" },
      { label: "Antrean Ruangan", icon: "pi pi-fw pi-calendar-times", to: "/pendaftaran-antrean/antrean" }
    ]
  },
  {
    label: "KASIR",
    icon: "pi pi-fw pi-calculator",
    items: [
      { label: "Kasir", icon: "pi pi-fw pi-calculator", to: "/kasir" }
    ]
  },
  {
    label: "LAPORAN",
    icon: "pi pi-fw pi-chart-bar",
    items: [
      { label: "Laporan & Rekam Medis", icon: "pi pi-fw pi-file", to: "/riwayat/rekam-medis" }
    ]
  },
  {
    label: "PENGATURAN KLINIK",
    icon: "pi pi-fw pi-cog",
    items: [
      { label: "Monitoring Cabang", icon: "pi pi-fw pi-chart-line", to: "/setup/monitoring-cabang" },
      { label: "Manajemen Cabang", icon: "pi pi-fw pi-building", to: "/setup/cabang" },
      { label: "Pengaturan Klinik", icon: "pi pi-fw pi-sliders-h", to: "/setup/config" },
      { label: "Manajemen User", icon: "pi pi-fw pi-users", to: "/setup/users" },
      { label: "Manajemen Role", icon: "pi pi-fw pi-shield", to: "/setup/navigation" }
    ]
  }
];

// Template Role: OWNER / MANAGER (Akses Penuh Operasional Cabang)
const OWNER_MENU = [
  {
    label: "HOME",
    icon: "pi pi-fw pi-home",
    items: [
      { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/dashboard" }
    ]
  },
  {
    label: "MASTER DATA",
    icon: "pi pi-fw pi-database",
    items: [
      { label: "Kategori Layanan", icon: "pi pi-fw pi-tags", to: "/master-data/kategori-layanan" },
      { label: "Data Layanan", icon: "pi pi-fw pi-briefcase", to: "/master-data/layanan" },
      { label: "Paket Layanan", icon: "pi pi-fw pi-box", to: "/master-data/paket-layanan" },
      { label: "Kategori Produk", icon: "pi pi-fw pi-tags", to: "/master-data/kategori-produk" },
      { label: "Data Produk", icon: "pi pi-fw pi-box", to: "/master-data/produk" },
      { label: "Paket Produk", icon: "pi pi-fw pi-inbox", to: "/master-data/paket-produk" },
      { label: "Inventori", icon: "pi pi-fw pi-box", to: "/master-data/inventori" },
      { label: "Supplier", icon: "pi pi-fw pi-truck", to: "/master-data/supplier" },
      { label: "Karyawan", icon: "pi pi-fw pi-users", to: "/master-data/karyawan" },
      { label: "Jadwal Karyawan", icon: "pi pi-fw pi-calendar-times", to: "/master-data/jadwal-karyawan" },
      { label: "Alat & Peralatan", icon: "pi pi-fw pi-wrench", to: "/master-data/alat" },
      { label: "Data Ruangan", icon: "pi pi-fw pi-building", to: "/master-data/ruangan" },
      { label: "Data Promo", icon: "pi pi-fw pi-percentage", to: "/master-data/promo" },
      { label: "Detail Promo", icon: "pi pi-fw pi-tags", to: "/master-data/detail-promo" }
    ]
  },
  {
    label: "Pendaftaran & Antrean",
    icon: "pi pi-fw pi-calendar",
    items: [
      { label: "Antrean Pendaftaran", icon: "pi pi-fw pi-ticket", to: "/antrian-awal" },
      { label: "Pasien Baru", icon: "UserPlus", to: "/pendaftaran-antrean/registrasi-pasien" },
      { label: "Pendaftaran Kunjungan", icon: "ClipboardList", to: "/pendaftaran-antrean/pendaftaran-pasien" },
      { label: "Data Pasien", icon: "pi pi-fw pi-user", to: "/master-data-user/data-pasien" }
    ]
  },
  {
    label: "LAYANAN",
    icon: "pi pi-fw pi-sparkles",
    items: [
      { label: "Tindakan", icon: "pi pi-fw pi-sparkles", to: "/pendaftaran-antrean/antrean?type=layanan" },
      { label: "Konsultasi", icon: "pi pi-fw pi-comments", to: "/pendaftaran-antrean/antrean?type=konsul" },
      { label: "Antrean Ruangan", icon: "pi pi-fw pi-calendar-times", to: "/pendaftaran-antrean/antrean" }
    ]
  },
  {
    label: "KASIR",
    icon: "pi pi-fw pi-calculator",
    items: [
      { label: "Kasir", icon: "pi pi-fw pi-calculator", to: "/kasir" }
    ]
  },
  {
    label: "LAPORAN",
    icon: "pi pi-fw pi-chart-bar",
    items: [
      { label: "Laporan & Rekam Medis", icon: "pi pi-fw pi-file", to: "/riwayat/rekam-medis" }
    ]
  },
  {
    label: "PENGATURAN KLINIK",
    icon: "pi pi-fw pi-cog",
    items: [
      { label: "Pengaturan Klinik", icon: "pi pi-fw pi-sliders-h", to: "/setup/config" },
      { label: "Manajemen User", icon: "pi pi-fw pi-users", to: "/setup/users" }
    ]
  }
];

// Template Role: DOKTER
const DOKTER_MENU = [
  {
    label: "HOME",
    icon: "pi pi-fw pi-home",
    items: [
      { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/dashboard" }
    ]
  },
  {
    label: "LAYANAN",
    icon: "pi pi-fw pi-sparkles",
    items: [
      { label: "Konsultasi", icon: "pi pi-fw pi-comments", to: "/pendaftaran-antrean/antrean?type=konsul" },
      { label: "Tindakan", icon: "pi pi-fw pi-sparkles", to: "/pendaftaran-antrean/antrean?type=layanan" },
      { label: "Antrean Ruangan", icon: "pi pi-fw pi-calendar-times", to: "/pendaftaran-antrean/antrean" }
    ]
  },
  {
    label: "DATA PASIEN & REKAM MEDIS",
    icon: "pi pi-fw pi-folder",
    items: [
      { label: "Data Pasien", icon: "pi pi-fw pi-user", to: "/master-data-user/data-pasien" },
      { label: "Rekam Medis Pasien", icon: "pi pi-fw pi-file", to: "/riwayat/rekam-medis" }
    ]
  },
  {
    label: "REFERENSI LAYANAN",
    icon: "pi pi-fw pi-briefcase",
    items: [
      { label: "Data Layanan", icon: "pi pi-fw pi-briefcase", to: "/master-data/layanan" },
      { label: "Paket Layanan", icon: "pi pi-fw pi-box", to: "/master-data/paket-layanan" },
      { label: "Jadwal Praktik", icon: "pi pi-fw pi-calendar-times", to: "/master-data/jadwal-karyawan" }
    ]
  }
];

// Template Role: BEAUTICIAN / TERAPIS
const BEAUTICIAN_MENU = [
  {
    label: "HOME",
    icon: "pi pi-fw pi-home",
    items: [
      { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/dashboard" }
    ]
  },
  {
    label: "LAYANAN",
    icon: "pi pi-fw pi-sparkles",
    items: [
      { label: "Tindakan Perawatan", icon: "pi pi-fw pi-sparkles", to: "/pendaftaran-antrean/antrean?type=layanan" },
      { label: "Antrean Ruangan", icon: "pi pi-fw pi-calendar-times", to: "/pendaftaran-antrean/antrean" }
    ]
  },
  {
    label: "REKAM MEDIS & TREATMENT",
    icon: "pi pi-fw pi-file",
    items: [
      { label: "Riwayat Treatment", icon: "pi pi-fw pi-file", to: "/riwayat/rekam-medis" }
    ]
  },
  {
    label: "REFERENSI",
    icon: "pi pi-fw pi-calendar",
    items: [
      { label: "Data Layanan", icon: "pi pi-fw pi-briefcase", to: "/master-data/layanan" },
      { label: "Jadwal Kerja", icon: "pi pi-fw pi-calendar-times", to: "/master-data/jadwal-karyawan" }
    ]
  }
];

// Template Role: KASIR
const KASIR_MENU = [
  {
    label: "HOME",
    icon: "pi pi-fw pi-home",
    items: [
      { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/dashboard" }
    ]
  },
  {
    label: "KASIR",
    icon: "pi pi-fw pi-calculator",
    items: [
      { label: "Kasir Pembayaran", icon: "pi pi-fw pi-calculator", to: "/kasir" }
    ]
  },
  {
    label: "PROMO & DISKON",
    icon: "pi pi-fw pi-percentage",
    items: [
      { label: "Data Promo", icon: "pi pi-fw pi-percentage", to: "/master-data/promo" },
      { label: "Detail Promo", icon: "pi pi-fw pi-tags", to: "/master-data/detail-promo" }
    ]
  },
  {
    label: "LAPORAN KASIR",
    icon: "pi pi-fw pi-chart-bar",
    items: [
      { label: "Laporan Keuangan & Kasir", icon: "pi pi-fw pi-file", to: "/riwayat/rekam-medis" }
    ]
  }
];

// Template Role: WAREHOUSE / LOGISTIK
const WAREHOUSE_MENU = [
  {
    label: "HOME",
    icon: "pi pi-fw pi-home",
    items: [
      { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/dashboard" }
    ]
  },
  {
    label: "INVENTORI & LOGISTIK",
    icon: "pi pi-fw pi-box",
    items: [
      { label: "Kategori Produk", icon: "pi pi-fw pi-tags", to: "/master-data/kategori-produk" },
      { label: "Data Produk", icon: "pi pi-fw pi-box", to: "/master-data/produk" },
      { label: "Paket Produk", icon: "pi pi-fw pi-inbox", to: "/master-data/paket-produk" },
      { label: "Stok Inventori", icon: "pi pi-fw pi-box", to: "/master-data/inventori" },
      { label: "Supplier", icon: "pi pi-fw pi-truck", to: "/master-data/supplier" },
      { label: "Alat & Peralatan", icon: "pi pi-fw pi-wrench", to: "/master-data/alat" }
    ]
  },
  {
    label: "LAPORAN LOGISTIK",
    icon: "pi pi-fw pi-file",
    items: [
      { label: "Laporan Stok & Pengadaan", icon: "pi pi-fw pi-file", to: "/riwayat/rekam-medis" }
    ]
  }
];

// Template Role: SUPERADMIN
const SUPERADMIN_MENU = [
  {
    label: "HOME",
    icon: "pi pi-fw pi-home",
    items: [
      { label: "Dashboard", icon: "pi pi-fw pi-home", to: "/dashboard" }
    ]
  },
  {
    label: "PENGATURAN KLINIK",
    icon: "pi pi-fw pi-cog",
    items: [
      { label: "Monitoring Cabang", icon: "pi pi-fw pi-chart-line", to: "/setup/monitoring-cabang" },
      { label: "Manajemen Cabang", icon: "pi pi-fw pi-building", to: "/setup/cabang" },
      { label: "Pengaturan Klinik", icon: "pi pi-fw pi-sliders-h", to: "/setup/config" },
      { label: "Manajemen User", icon: "pi pi-fw pi-users", to: "/setup/users" },
      { label: "Manajemen Role", icon: "pi pi-fw pi-shield", to: "/setup/navigation" }
    ]
  }
];

const ROLE_TEMPLATES = {
  master: MASTER_FULL_MENU,
  owner: OWNER_MENU,
  dokter: DOKTER_MENU,
  beautician: BEAUTICIAN_MENU,
  kasir: KASIR_MENU,
  warehouse: WAREHOUSE_MENU,
  superadmin: SUPERADMIN_MENU,
};

async function seedBranchRoles() {
  console.log("==================================================================");
  console.log(" Memulai Seeding Role Navigation & Akun Role Cabang Utama (CBG-001)");
  console.log("==================================================================");

  const now = formatDateSystem();
  const rawPassword = "password123";
  const userKey = process.env.USER_KEY || "random";
  const secret = process.env.USER_SECRET || "random";

  // 1. Sinkronisasi Template Menu di `mst_navigation`
  console.log("\n1. Memperbarui template navigasi di `mst_navigation`...");
  for (const [roleKey, menuObj] of Object.entries(ROLE_TEMPLATES)) {
    const menuJson = JSON.stringify(menuObj);
    const existing = await DB("mst_navigation").where("role", roleKey).first();
    if (existing) {
      await DB("mst_navigation")
        .where("id", existing.id)
        .update({
          menu: menuJson,
          updated_at: now,
        });
      console.log(`   -> Template role '${roleKey}' diperbarui.`);
    } else {
      await DB("mst_navigation").insert({
        role: roleKey,
        menu: menuJson,
        tz: "Asia/Jakarta",
        created_at: now,
        updated_at: now,
      });
      console.log(`   -> Template role '${roleKey}' baru berhasil dibuat.`);
    }
  }

  // 2. Daftar Akun Role yang Harus Ada di Cabang Utama (CBG-001)
  const branchUsers = [
    {
      username: "dokter@klinik.com",
      fullname: "dr. Amanda Putri Wijaya",
      telp: "081211223344",
      role: "dokter",
      kode_cabang: "CBG-001",
      jabatan_karyawan: "dokter",
      kode_karyawan: "KRY-002",
    },
    {
      username: "beautician@klinik.com",
      fullname: "Dewi Anjani",
      telp: "081222334455",
      role: "beautician",
      kode_cabang: "CBG-001",
      jabatan_karyawan: "terapis",
      kode_karyawan: "KRY-006",
    },
    {
      username: "kasir@klinik.com",
      fullname: "Rina Melati (Kasir)",
      telp: "081233445566",
      role: "kasir",
      kode_cabang: "CBG-001",
      jabatan_karyawan: "kasir",
      kode_karyawan: "KRY-008",
    },
    {
      username: "warehouse@klinik.com",
      fullname: "Budi Santoso (Logistik)",
      telp: "081244556677",
      role: "warehouse",
      kode_cabang: "CBG-001",
      jabatan_karyawan: "apoteker",
      kode_karyawan: "KRY-009",
    },
  ];

  console.log("\n2. Memeriksa dan membuat akun role di Cabang Utama (CBG-001)...");

  for (const item of branchUsers) {
    let existingUser = await DB("user_credential").where("username", item.username).first();
    let userCode = existingUser?.user_code;

    if (!existingUser) {
      // Ambil user_code berikutnya
      const lastUser = await DB("user_credential")
        .where("user_code", "like", "USR%")
        .orderBy("user_code", "desc")
        .first();

      let nextNum = 1;
      if (lastUser && lastUser.user_code) {
        const numPart = parseInt(lastUser.user_code.replace("USR", ""), 10);
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }
      userCode = `USR${String(nextNum).padStart(6, "0")}`;

      const cPassword = userKey + userCode + rawPassword;
      const hashedPassword = hmac(cPassword, secret, "sha512");

      await DB("user_credential").insert({
        user_code: userCode,
        username: item.username,
        fullname: item.fullname,
        telp: item.telp,
        role: item.role,
        password: hashedPassword,
        status: "1",
        kode_cabang: item.kode_cabang,
        tz: "Asia/Jakarta",
        created_by: "SYSTEM",
        created_at: now,
        updated_at: now,
      });

      console.log(`   [BARU] Akun ${item.role.toUpperCase()}: ${item.username} (${userCode}) berhasil dibuat.`);
    } else {
      // Pastikan password, status, dan cabang sesuai
      const cPassword = userKey + userCode + rawPassword;
      const hashedPassword = hmac(cPassword, secret, "sha512");

      await DB("user_credential")
        .where("user_code", userCode)
        .update({
          fullname: item.fullname,
          role: item.role,
          password: hashedPassword,
          status: "1",
          kode_cabang: item.kode_cabang,
          updated_at: now,
        });

      console.log(`   [UPDATE] Akun ${item.role.toUpperCase()}: ${item.username} (${userCode}) sudah ada & diperbarui.`);
    }

    // Sinkronkan ke `user_navigation`
    const roleMenu = ROLE_TEMPLATES[item.role] || MASTER_FULL_MENU;
    const menuJson = JSON.stringify(roleMenu);

    const existingUserNav = await DB("user_navigation").where("user_code", userCode).first();
    if (existingUserNav) {
      await DB("user_navigation")
        .where("user_code", userCode)
        .update({
          menu: menuJson,
          updated_at: now,
        });
    } else {
      await DB("user_navigation").insert({
        user_code: userCode,
        menu: menuJson,
        created_at: now,
        updated_at: now,
      });
    }
    console.log(`      -> user_navigation disinkronkan untuk ${userCode}.`);

    // Hubungkan dengan `mst_karyawan`
    if (item.kode_karyawan) {
      const emp = await DB("mst_karyawan").where("kode_karyawan", item.kode_karyawan).first();
      if (emp) {
        await DB("mst_karyawan")
          .where("kode_karyawan", item.kode_karyawan)
          .update({
            kode_user: userCode,
            kode_cabang: item.kode_cabang,
            updated_at: now,
          });
        console.log(`      -> mst_karyawan ${item.kode_karyawan} (${emp.nama}) dihubungkan ke ${userCode}.`);
      } else {
        // Jika belum ada di mst_karyawan, buatkan datanya
        await DB("mst_karyawan").insert({
          kode_karyawan: item.kode_karyawan,
          no_sip: `SIP-${item.kode_karyawan}`,
          kode_user: userCode,
          nama: item.fullname,
          jabatan: item.jabatan_karyawan,
          no_hp: item.telp,
          email: item.username,
          status: "aktif",
          kode_cabang: item.kode_cabang,
          tz: "Asia/Jakarta",
          created_by: "SYSTEM",
          created_at: now,
          updated_at: now,
        });
        console.log(`      -> mst_karyawan baru ${item.kode_karyawan} (${item.fullname}) dibuat dan dihubungkan.`);
      }
    }
  }

  // 3. Pastikan Akun Manager Cabang Utama (CBG-001) juga memiliki navigasi OWNER_MENU yang lengkap
  console.log("\n3. Memeriksa akun Manager Cabang Utama (manager@klinik.com)...");
  const manager = await DB("user_credential").where("username", "manager@klinik.com").first();
  if (manager) {
    const ownerMenuJson = JSON.stringify(OWNER_MENU);
    const existingMgrNav = await DB("user_navigation").where("user_code", manager.user_code).first();
    if (existingMgrNav) {
      await DB("user_navigation")
        .where("user_code", manager.user_code)
        .update({
          menu: ownerMenuJson,
          updated_at: now,
        });
    } else {
      await DB("user_navigation").insert({
        user_code: manager.user_code,
        menu: ownerMenuJson,
        created_at: now,
        updated_at: now,
      });
    }
    console.log(`   -> Menu navigasi Manager (${manager.user_code}) berhasil disinkronkan ke OWNER_MENU.`);
  }

  // 4. Pastikan Akun Superadmin juga memiliki navigasi SUPERADMIN_MENU yang lengkap
  console.log("\n4. Memeriksa akun Superadmin (superadmin@admin.com)...");
  const superadmin = await DB("user_credential").where("username", "superadmin@admin.com").first();
  if (superadmin) {
    const saMenuJson = JSON.stringify(SUPERADMIN_MENU);
    const existingSaNav = await DB("user_navigation").where("user_code", superadmin.user_code).first();
    if (existingSaNav) {
      await DB("user_navigation")
        .where("user_code", superadmin.user_code)
        .update({
          menu: saMenuJson,
          updated_at: now,
        });
    } else {
      await DB("user_navigation").insert({
        user_code: superadmin.user_code,
        menu: saMenuJson,
        created_at: now,
        updated_at: now,
      });
    }
    console.log(`   -> Menu navigasi Superadmin (${superadmin.user_code}) berhasil disinkronkan ke SUPERADMIN_MENU.`);
  }

  console.log("\n==================================================================");
  console.log(" SEEDING ROLE & USER CABANG UTAMA BERHASIL DILAKUKAN!");
  console.log("==================================================================");
  process.exit(0);
}

seedBranchRoles().catch((err) => {
  console.error("FATAL ERROR SAAT SEEDING ROLE:", err);
  process.exit(1);
});
