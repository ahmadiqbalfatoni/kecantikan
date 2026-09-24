import DB from '../core/config/knex.js';

async function run() {
    try {
        console.log("Modifying trx_antrian_awal.status column...");
        await DB.raw("ALTER TABLE trx_antrian_awal MODIFY COLUMN status ENUM('tersedia','terpakai','dipanggil','nonaktif') NOT NULL DEFAULT 'tersedia'");
        console.log("Column status updated successfully!");
        
        const [col] = await DB.raw("SHOW COLUMNS FROM trx_antrian_awal WHERE Field = 'status'");
        console.log("Updated Schema:", col);
        process.exit(0);
    } catch (err) {
        console.error("Error altering table:", err);
        process.exit(1);
    }
}

run();
