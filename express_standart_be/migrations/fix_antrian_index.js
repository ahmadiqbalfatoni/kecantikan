import 'dotenv/config';
import DB from '../core/config/knex.js';

async function run() {
  try {
    const indexes = await DB.raw("SHOW INDEX FROM trx_antrian_awal WHERE Key_name = 'uq_nomor_antrian'");
    if (indexes[0].length > 0) {
      await DB.raw("ALTER TABLE trx_antrian_awal DROP INDEX uq_nomor_antrian");
      console.log("Successfully dropped index uq_nomor_antrian from trx_antrian_awal");
    } else {
      console.log("Index uq_nomor_antrian does not exist.");
    }
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

run();
