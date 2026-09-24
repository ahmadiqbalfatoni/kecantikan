import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    // 1. Create table mst_ruangan_form if not exists
    const hasRuanganFormTable = await DB.schema.hasTable("mst_ruangan_form");
    if (!hasRuanganFormTable) {
      await DB.schema.createTable("mst_ruangan_form", (table) => {
        table.increments("id").primary();
        table.string("kode_ruangan", 20).notNullable();
        table.string("label_field", 150).notNullable();
        table.string("tipe_field", 30).defaultTo("text"); // text, textarea, number, select, checkbox
        table.text("options").nullable(); // JSON string array of choices if select
        table.boolean("is_required").defaultTo(false);
        table.integer("urutan").defaultTo(0);
        table.string("created_by", 50).nullable();
        table.string("created_at", 30).nullable();
        table.string("updated_by", 50).nullable();
        table.string("updated_at", 30).nullable();
      });
      console.log("Migration SUCCESS: Created table mst_ruangan_form.");
    } else {
      console.log("Migration SKIPPED: Table mst_ruangan_form already exists.");
    }

    // 2. Add columns hasil_form and catatan_petugas to trx_antrian_layanan
    const hasHasilForm = await DB.schema.hasColumn("trx_antrian_layanan", "hasil_form");
    if (!hasHasilForm) {
      await DB.schema.table("trx_antrian_layanan", (table) => {
        table.text("hasil_form").nullable().after("nama_ruangan");
        table.text("catatan_petugas").nullable().after("hasil_form");
      });
      console.log("Migration SUCCESS: Added hasil_form & catatan_petugas to trx_antrian_layanan.");
    } else {
      console.log("Migration SKIPPED: Columns already exist in trx_antrian_layanan.");
    }

    // Seed default sample fields for existing rooms if table is empty
    const countForm = await DB("mst_ruangan_form").count("id as count").first();
    if (countForm && parseInt(countForm.count, 10) === 0) {
      const sampleRooms = await DB("mst_ruangan").select("kode_ruangan").limit(5);
      for (const r of sampleRooms) {
        await DB("mst_ruangan_form").insert([
          {
            kode_ruangan: r.kode_ruangan,
            label_field: "Kondisi / Keluhan Pasien Saat Ini",
            tipe_field: "textarea",
            is_required: false,
            urutan: 1,
            created_by: "system",
            created_at: new Date().toISOString(),
          },
          {
            kode_ruangan: r.kode_ruangan,
            label_field: "Catatan Tindakan / Alat Digunakan",
            tipe_field: "text",
            is_required: false,
            urutan: 2,
            created_by: "system",
            created_at: new Date().toISOString(),
          },
        ]);
      }
      console.log("Seeded sample form fields for rooms.");
    }

  } catch (error) {
    console.error("Migration ERROR:", error);
  } finally {
    await DB.destroy();
  }
}

runMigration();
