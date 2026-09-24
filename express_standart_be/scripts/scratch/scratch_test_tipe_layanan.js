import DB from "./core/config/knex.js";

async function test() {
  console.log("Checking mst_layanan rows...");
  const rows = await DB("mst_layanan").select("kode_layanan", "nama", "tipe").limit(5);
  console.log("MST_LAYANAN SAMPLE:", rows);

  // Update existing layanan to have different types for testing
  if (rows.length >= 2) {
    await DB("mst_layanan").where("kode_layanan", rows[0].kode_layanan).update({ tipe: "MEDICAL TREATMENT" });
    await DB("mst_layanan").where("kode_layanan", rows[1].kode_layanan).update({ tipe: "BEAUTY TREATMENT" });
    console.log(`Set ${rows[0].kode_layanan} -> MEDICAL TREATMENT`);
    console.log(`Set ${rows[1].kode_layanan} -> BEAUTY TREATMENT`);
  }

  const updatedRows = await DB("mst_layanan").select("kode_layanan", "nama", "tipe").limit(5);
  console.log("UPDATED MST_LAYANAN:", updatedRows);
  process.exit(0);
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
