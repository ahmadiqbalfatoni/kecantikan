import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    // 1. Modifikasi tabel trx_booking: tambahkan kode_ruangan, total_biaya, dan nullable pada jenis_layanan & kode_layanan
    const hasKodeRuangan = await DB.schema.hasColumn("trx_booking", "kode_ruangan");
    if (!hasKodeRuangan) {
      await DB.schema.table("trx_booking", (table) => {
        table.string("kode_ruangan", 20).nullable().after("no_rm");
      });
      console.log("Migration SUCCESS: Added kode_ruangan column to trx_booking.");
    } else {
      console.log("Migration SKIPPED: Column kode_ruangan already exists in trx_booking.");
    }

    const hasTotalBiaya = await DB.schema.hasColumn("trx_booking", "total_biaya");
    if (!hasTotalBiaya) {
      await DB.schema.table("trx_booking", (table) => {
        table.decimal("total_biaya", 12, 2).notNullable().defaultTo(0).after("catatan_pasien");
      });
      console.log("Migration SUCCESS: Added total_biaya column to trx_booking.");
    } else {
      console.log("Migration SKIPPED: Column total_biaya already exists in trx_booking.");
    }

    // Ubah jenis_layanan dan kode_layanan menjadi nullable
    await DB.schema.raw(`
      ALTER TABLE trx_booking 
      MODIFY COLUMN jenis_layanan ENUM('layanan','paket') NULL,
      MODIFY COLUMN kode_layanan VARCHAR(20) NULL;
    `);
    console.log("Migration SUCCESS: Modified jenis_layanan and kode_layanan to be nullable in trx_booking.");

    // 2. Buat tabel trx_detail_booking jika belum ada
    const hasTrxDetailBooking = await DB.schema.hasTable("trx_detail_booking");
    if (!hasTrxDetailBooking) {
      await DB.schema.raw(`
        CREATE TABLE trx_detail_booking (
          id INT AUTO_INCREMENT,
          kode_detail_booking VARCHAR(35) NOT NULL,
          kode_booking VARCHAR(20) NOT NULL,
          jenis_layanan ENUM('layanan','paket') NOT NULL,
          kode_layanan VARCHAR(20) NOT NULL,
          nama_layanan VARCHAR(150) NOT NULL,
          harga DECIMAL(12,2) NOT NULL DEFAULT 0,
          durasi_menit INT NOT NULL DEFAULT 0,
          tz VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
          created_by VARCHAR(100) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(100) DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_kode_detail_booking (kode_detail_booking),
          KEY idx_kode_booking (kode_booking),
          FOREIGN KEY (kode_booking) REFERENCES trx_booking(kode_booking) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("Migration SUCCESS: Created table trx_detail_booking.");
    } else {
      console.log("Migration SKIPPED: Table trx_detail_booking already exists.");
    }

    // 3. Backfill data lama jika ada trx_booking tanpa trx_detail_booking
    const existingBookings = await DB("trx_booking").select("kode_booking", "jenis_layanan", "kode_layanan", "created_by");
    for (const b of existingBookings) {
      if (b.kode_layanan) {
        const details = await DB("trx_detail_booking").where("kode_booking", b.kode_booking);
        if (details.length === 0) {
          let nama = b.kode_layanan;
          let harga = 0;
          let durasi = 30;
          if (b.jenis_layanan === "layanan") {
            const lay = await DB("mst_layanan").where("kode_layanan", b.kode_layanan).first();
            if (lay) {
              nama = lay.nama;
              harga = parseFloat(lay.harga || 0);
              durasi = lay.durasi_menit || 30;
            }
          } else if (b.jenis_layanan === "paket") {
            const pkt = await DB("mst_paket_layanan").where("kode_paket_layanan", b.kode_layanan).first();
            if (pkt) {
              nama = pkt.nama;
              harga = parseFloat(pkt.harga_paket || 0);
              durasi = 60;
            }
          }

          await DB("trx_detail_booking").insert({
            kode_detail_booking: `DBKG-${b.kode_booking.replace("BKG-", "")}-01`,
            kode_booking: b.kode_booking,
            jenis_layanan: b.jenis_layanan || "layanan",
            kode_layanan: b.kode_layanan,
            nama_layanan: nama,
            harga: harga,
            durasi_menit: durasi,
            created_by: b.created_by || "system",
          });

          await DB("trx_booking").where("kode_booking", b.kode_booking).update({
            total_biaya: harga,
          });
        }
      }
    }
    console.log("Migration SUCCESS: Backfill existing bookings completed.");
  } catch (error) {
    console.error("Migration ERROR:", error);
    process.exit(1);
  } finally {
    await DB.destroy();
  }
}

runMigration();
