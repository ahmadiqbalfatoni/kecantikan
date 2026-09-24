/**
 * Migration Script: Multi-Branch / Cabang Klinik
 * Menambahkan tabel mst_cabang, kolom kode_cabang ke tabel master & transaksi,
 * migrasi data eksisting ke CBG-001, dan membuat akun manager pertama.
 */
import DB from "../../core/config/knex.js";
import { formatDateSystem } from "../../routes/v1/components/tools/date_tools.js";
import { hmac } from "../../routes/v1/components/tools/encrypt_tools.js";
import { getLastKodeRegister, setLastKodeRegister } from "../../routes/v1/components/tools/getter_setter.js";

async function runMigration() {
  console.log("=== MULAI MIGRASI MULTI-CABANG ===");

  // 1. Buat tabel mst_cabang jika belum ada
  const hasCabangTable = await DB.schema.hasTable("mst_cabang");
  if (!hasCabangTable) {
    console.log("Membuat tabel mst_cabang...");
    await DB.schema.createTable("mst_cabang", (table) => {
      table.increments("id").primary();
      table.string("kode_cabang", 50).notNullable().unique();
      table.string("nama_cabang", 150).notNullable();
      table.text("alamat").nullable();
      table.string("no_telp", 50).nullable();
      table.string("email", 100).nullable();
      table.string("pj_manager", 100).nullable();
      table.enum("status", ["aktif", "tidak aktif"]).defaultTo("aktif");
      table.string("tz", 50).defaultTo("Asia/Jakarta");
      table.string("created_by", 100).nullable();
      table.timestamp("created_at").defaultTo(DB.fn.now());
      table.string("updated_by", 100).nullable();
      table.timestamp("updated_at").defaultTo(DB.fn.now());
    });
    console.log("Tabel mst_cabang berhasil dibuat.");
  } else {
    console.log("Tabel mst_cabang sudah ada.");
  }

  // 2. Daftar tabel yang harus memiliki kolom kode_cabang
  const targetTables = [
    "user_credential",
    // Master
    "mst_pasien",
    "mst_karyawan",
    "mst_jadwal_karyawan",
    "mst_ruangan",
    "mst_alat",
    "mst_produk",
    "mst_layanan",
    "mst_paket_layanan",
    "mst_paket_produk",
    "mst_promo",
    "mst_detail_promo",
    "mst_supplier",
    // Transaksi
    "trx_kunjungan",
    "trx_antrian_awal",
    "trx_antrian_layanan",
    "trx_booking",
    "trx_transaksi",
    "trx_detail_transaksi",
    "trx_rekam_medis",
    "trx_purchase_order",
    "trx_stok_movement",
    "trx_kepemilikan_paket_layanan",
    "trx_kepemilikan_paket_produk"
  ];

  for (const tbl of targetTables) {
    const hasTbl = await DB.schema.hasTable(tbl);
    if (!hasTbl) {
      console.log(`Tabel ${tbl} tidak ditemukan di database, lewati.`);
      continue;
    }

    const hasCol = await DB.schema.hasColumn(tbl, "kode_cabang");
    if (!hasCol) {
      console.log(`Menambahkan kolom kode_cabang ke ${tbl}...`);
      await DB.schema.table(tbl, (table) => {
        table.string("kode_cabang", 50).nullable().index();
      });
    } else {
      console.log(`Kolom kode_cabang di ${tbl} sudah ada.`);
    }
  }

  // 3. Pastikan Cabang Utama (CBG-001) terdaftar
  let cbgUtama = await DB("mst_cabang").where("kode_cabang", "CBG-001").first();
  if (!cbgUtama) {
    console.log("Mendaftarkan Cabang Utama (CBG-001)...");
    await DB("mst_cabang").insert({
      kode_cabang: "CBG-001",
      nama_cabang: "Klinik Cabang Utama",
      alamat: "Kantor Pusat Klinik Kecantikan",
      no_telp: "081234567890",
      email: "pusat@klinik.com",
      pj_manager: "Manager Utama",
      status: "aktif",
      created_by: "SYSTEM",
      created_at: formatDateSystem(),
      updated_at: formatDateSystem(),
    });
    console.log("Cabang Utama (CBG-001) berhasil didaftarkan.");
  } else {
    console.log("Cabang Utama (CBG-001) sudah ada.");
  }

  // 4. Update data eksisting ke CBG-001 jika masih NULL / kosong
  console.log("Menghubungkan seluruh data eksisting ke CBG-001...");
  for (const tbl of targetTables) {
    if (tbl === "user_credential") continue; // user superadmin dibiarkan NULL / ALL
    const hasTbl = await DB.schema.hasTable(tbl);
    if (!hasTbl) continue;

    const updatedRows = await DB(tbl)
      .whereNull("kode_cabang")
      .orWhere("kode_cabang", "")
      .update({ kode_cabang: "CBG-001" });

    if (updatedRows > 0) {
      console.log(`-> ${tbl}: ${updatedRows} baris data berhasil dihubungkan ke CBG-001.`);
    }
  }

  // 5. Buat Akun Manager Cabang Utama jika belum ada
  const managerUsername = "manager@klinik.com";
  let managerUser = await DB("user_credential").where("username", managerUsername).first();

  if (!managerUser) {
    console.log(`Membuat akun Manager Pertama (${managerUsername})...`);
    const lastUser = await DB("user_credential")
      .where("user_code", "like", "USR%")
      .orderBy("user_code", "desc")
      .first();
    let nextNum = 1;
    if (lastUser && lastUser.user_code) {
      const numPart = parseInt(lastUser.user_code.replace("USR", ""), 10);
      if (!isNaN(numPart)) nextNum = numPart + 1;
    }
    const cUserCode = `USR${String(nextNum).padStart(6, "0")}`;

    // Ambil template navigasi lengkap dari superadmin/master
    let navTemplate = await DB("mst_navigation").where("role", "master").first();
    if (!navTemplate) {
      navTemplate = await DB("user_navigation").where("user_code", "USR000000").first();
    }

    const rawPassword = "password123";
    const userKey = process.env.USER_KEY || "random";
    const secret = process.env.USER_SECRET || "random";
    const cPassword = userKey + cUserCode + rawPassword;
    const hashedPassword = hmac(cPassword, secret, "sha512");

    await DB("user_credential").insert({
      user_code: cUserCode,
      username: managerUsername,
      fullname: "Manager Cabang Utama",
      telp: "081122334455",
      role: "owner", // role owner/manager sesuai sistem role yang ada
      password: hashedPassword,
      status: "1",
      kode_cabang: "CBG-001",
      tz: "Asia/Jakarta",
      created_by: "SYSTEM",
      created_at: formatDateSystem(),
      updated_at: formatDateSystem(),
    });

    if (navTemplate?.menu) {
      await DB("user_navigation").insert({
        user_code: cUserCode,
        menu: navTemplate.menu,
        created_at: formatDateSystem(),
        updated_at: formatDateSystem(),
      });
    }

    console.log(`Akun Manager Pertama berhasil dibuat:`);
    console.log(`   User Code: ${cUserCode}`);
    console.log(`   Username : ${managerUsername}`);
    console.log(`   Password : ${rawPassword}`);
    console.log(`   Cabang   : CBG-001 (Klinik Cabang Utama)`);
  } else {
    // Pastikan kode_cabang terisi CBG-001
    await DB("user_credential")
      .where("username", managerUsername)
      .update({ kode_cabang: "CBG-001" });
    console.log(`Akun Manager (${managerUsername}) sudah terdaftar dan terhubung ke CBG-001.`);
  }

  console.log("=== MIGRASI MULTI-CABANG SELESAI DENGAN SUKSES ===");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("FATAL ERROR MIGRASI:", err);
  process.exit(1);
});
