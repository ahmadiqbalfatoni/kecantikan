import DB from "./core/config/knex.js";

async function checkSchema() {
  try {
    const rmCols = await DB("trx_rekam_medis").columnInfo();
    console.log("trx_rekam_medis columns:", Object.keys(rmCols));

    const rmRows = await DB("trx_rekam_medis").limit(3);
    console.log("trx_rekam_medis rows:", rmRows);

    process.exit(0);
  } catch (err) {
    console.error("Schema check error:", err);
    process.exit(1);
  }
}

checkSchema();
