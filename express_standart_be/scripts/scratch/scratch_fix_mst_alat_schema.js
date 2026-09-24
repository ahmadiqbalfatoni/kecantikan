import DB from "./core/config/knex.js";

async function fixMstAlatSchema() {
  try {
    const hasTable = await DB.schema.hasTable("mst_alat");
    if (!hasTable) {
      console.log("Creating mst_alat table...");
      await DB.schema.createTable("mst_alat", (table) => {
        table.increments("id").primary();
        table.string("kode_alat", 50).notNullable().unique();
        table.string("kode_ruangan", 50).nullable();
        table.string("nama", 100).notNullable();
        table.string("merk", 100).nullable();
        table.date("tanggal_beli").nullable();
        table.string("kondisi", 50).defaultTo("baik");
        table.string("status", 50).defaultTo("aktif");
        table.string("tz", 50).defaultTo("Asia/Jakarta");
        table.string("created_by", 100).nullable();
        table.timestamp("created_at").defaultTo(DB.fn.now());
        table.string("updated_by", 100).nullable();
        table.timestamp("updated_at").defaultTo(DB.fn.now());
      });
      console.log("mst_alat table created successfully!");
    } else {
      const hasKodeRuangan = await DB.schema.hasColumn("mst_alat", "kode_ruangan");
      console.log("has kode_ruangan column:", hasKodeRuangan);
      if (!hasKodeRuangan) {
        console.log("Adding kode_ruangan column to mst_alat...");
        await DB.schema.table("mst_alat", (table) => {
          table.string("kode_ruangan", 50).nullable().after("kode_alat");
        });
        console.log("Column kode_ruangan added successfully!");
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Schema fix error:", err);
    process.exit(1);
  }
}

fixMstAlatSchema();
