import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import DB from "./config/knex.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function ensureRequiredColumnsExist() {
  try {
    const hasTrx = await DB.schema.hasTable("trx_transaksi");
    if (hasTrx) {
      const hasNamaPromo = await DB.schema.hasColumn("trx_transaksi", "nama_promo");
      if (!hasNamaPromo) {
        await DB.schema.alterTable("trx_transaksi", (table) => {
          table.string("nama_promo", 255).nullable().after("kode_promo");
        });
        console.log("✅ Column 'nama_promo' added to trx_transaksi");
      }
    }

    const hasTrxDetail = await DB.schema.hasTable("trx_detail_transaksi");
    if (hasTrxDetail) {
      const detailCols = [
        { name: "kode_cabang", type: (t) => t.string("kode_cabang", 20).nullable().defaultTo("CBG-001") },
        { name: "kode_promo", type: (t) => t.string("kode_promo", 50).nullable() },
        { name: "nama_promo", type: (t) => t.string("nama_promo", 150).nullable() },
        { name: "jenis_diskon", type: (t) => t.string("jenis_diskon", 20).nullable() },
        { name: "nilai_diskon", type: (t) => t.decimal("nilai_diskon", 12, 2).nullable() },
        { name: "diskon", type: (t) => t.decimal("diskon", 12, 2).defaultTo(0) },
        { name: "subtotal_setelah_diskon", type: (t) => t.decimal("subtotal_setelah_diskon", 12, 2).defaultTo(0) },
      ];
      for (const col of detailCols) {
        const hasCol = await DB.schema.hasColumn("trx_detail_transaksi", col.name);
        if (!hasCol) {
          await DB.schema.alterTable("trx_detail_transaksi", (table) => {
            col.type(table);
          });
          console.log(`✅ Column '${col.name}' added to trx_detail_transaksi`);
        }
      }
    }
  } catch (err) {
    console.error("⚠️ Error ensuring required columns:", err.message);
  }
}

export async function checkAndInitDatabase(force = false) {
  try {
    const hasTable = await DB.schema.hasTable("user_credential");
    if (hasTable && !force) {
      console.log("✅ Database verified: table 'user_credential' exists.");
      await ensureRequiredColumnsExist();
      return { status: "ready", message: "Database already initialized." };
    }

    console.log("⚠️ Table 'user_credential' not found. Initializing database from SQL dump...");

    const possiblePaths = [
      path.join(__dirname, "../db_klinik_kecantikan.sql"),
      path.join(process.cwd(), "db_klinik_kecantikan.sql"),
      path.join(process.cwd(), "../db_klinik_kecantikan.sql"),
    ];

    const sqlFile = possiblePaths.find((p) => fs.existsSync(p));
    if (!sqlFile) {
      console.error("❌ SQL dump file db_klinik_kecantikan.sql not found!");
      return { status: "error", message: "SQL dump file not found." };
    }

    const sqlContent = fs.readFileSync(sqlFile, "utf8");

    // Execute SQL script
    await DB.raw(sqlContent);
    console.log("✅ Database initialized successfully from db_klinik_kecantikan.sql!");
    await ensureRequiredColumnsExist();
    return { status: "success", message: "Database initialized successfully." };
  } catch (error) {
    console.error("❌ Error initializing database:", error.message);
    return { status: "error", message: error.message };
  }
}
