import DB from "./core/config/knex.js";

async function testAlat() {
  try {
    const hasTable = await DB.schema.hasTable("mst_alat");
    console.log("has mst_alat table:", hasTable);

    if (hasTable) {
      const cols = await DB("mst_alat").columnInfo();
      console.log("mst_alat columns:", Object.keys(cols));

      const count = await DB("mst_alat").count("* as total").first();
      console.log("mst_alat row count:", count);

      const rows = await DB("mst_alat").limit(5);
      console.log("Sample rows:", rows);
    } else {
      console.log("Table mst_alat DOES NOT EXIST!");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

testAlat();
