import DB from "../core/config/knex.js";
import { up } from "./create_mst_wilayah_tables.js";

async function runWilayahMigration() {
  try {
    await up(DB);
    console.log("Migration SUCCESS: Created mst_wilayah tables (mst_provinsi, mst_kabupaten, mst_kecamatan, mst_kelurahan).");
  } catch (error) {
    console.error("Migration ERROR:", error);
  } finally {
    await DB.destroy();
  }
}

runWilayahMigration();
