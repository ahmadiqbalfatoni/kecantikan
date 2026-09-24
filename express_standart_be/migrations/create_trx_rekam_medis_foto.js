import DB from "../core/config/knex.js";

async function runSchemaMigration() {
  try {
    console.log("Starting schema migration for trx_rekam_medis_foto & field_key...");

    // 1. Check data_form column in trx_rekam_medis
    const hasDataForm = await DB.schema.hasColumn("trx_rekam_medis", "data_form");
    if (!hasDataForm) {
      await DB.raw("ALTER TABLE trx_rekam_medis ADD COLUMN data_form JSON NULL AFTER catatan;");
      console.log("Added column data_form to trx_rekam_medis.");
    } else {
      console.log("Column data_form already exists in trx_rekam_medis.");
    }

    // 2. Check field_key column in mst_ruangan_form
    const hasFieldKey = await DB.schema.hasColumn("mst_ruangan_form", "field_key");
    if (!hasFieldKey) {
      await DB.raw("ALTER TABLE mst_ruangan_form ADD COLUMN field_key VARCHAR(100) NULL AFTER label_field;");
      console.log("Added column field_key to mst_ruangan_form.");
    } else {
      console.log("Column field_key already exists in mst_ruangan_form.");
    }

    // 3. Create table trx_rekam_medis_foto
    const hasFotoTable = await DB.schema.hasTable("trx_rekam_medis_foto");
    if (!hasFotoTable) {
      await DB.schema.createTable("trx_rekam_medis_foto", (table) => {
        table.increments("id").primary();
        table.integer("id_rekam_medis").unsigned().notNullable();
        table.enum("tipe", ["before", "after"]).notNullable().defaultTo("before");
        table.string("url_foto", 500).notNullable();
        table.timestamp("created_at").defaultTo(DB.fn.now());
        table.index("id_rekam_medis", "idx_rm_foto_id_rm");
      });
      console.log("Created table trx_rekam_medis_foto.");
    } else {
      console.log("Table trx_rekam_medis_foto already exists.");
    }

    // 4. Populate field_key in mst_ruangan_form where field_key is null
    const formFields = await DB("mst_ruangan_form").whereNull("field_key");
    for (const f of formFields) {
      // Slugify label_field to field_key
      const slug = f.label_field
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      await DB("mst_ruangan_form").where("id", f.id).update({ field_key: slug });
    }
    console.log(`Updated field_key for ${formFields.length} rows in mst_ruangan_form.`);

    console.log("Schema migration completed successfully.");
  } catch (error) {
    console.error("Schema Migration Error:", error);
  } finally {
    await DB.destroy();
  }
}

runSchemaMigration();
