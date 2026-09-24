import DB from "./core/config/knex.js";

async function checkNotNull() {
  try {
    const cols = await DB("trx_rekam_medis").columnInfo();
    console.log("trx_rekam_medis column info:", cols);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkNotNull();
