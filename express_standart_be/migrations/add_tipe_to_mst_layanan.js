import DB from "../core/config/knex.js";

async function up() {
  try {
    const hasTipe = await DB.schema.hasColumn("mst_layanan", "tipe");
    if (!hasTipe) {
      await DB.schema.table("mst_layanan", (table) => {
        table.string("tipe", 50).defaultTo("BEAUTY TREATMENT").nullable();
      });
      console.log("Migration SUCCESS: Added tipe column to mst_layanan.");
    } else {
      console.log("Migration SKIPPED: Column tipe already exists in mst_layanan.");
    }
  } catch (error) {
    console.error("Migration ERROR in add_tipe_to_mst_layanan:", error);
  }
}

up().then(() => process.exit(0));
