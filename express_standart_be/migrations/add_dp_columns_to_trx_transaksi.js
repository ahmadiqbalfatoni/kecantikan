/**
 * @project Sistem Klinik Kecantikan
 * @file add_dp_columns_to_trx_transaksi.js
 * @description Migrasi penambahan kolom dp_nominal, metode_pembayaran_dp, dan sisa_bayar ke tabel trx_transaksi
 */
import DB from "../core/config/knex.js";

async function runMigration() {
  try {
    console.log("Starting migration: add DP and sisa_bayar columns to trx_transaksi...");

    const hasDpNominal = await DB.schema.hasColumn("trx_transaksi", "dp_nominal");
    if (!hasDpNominal) {
      await DB.schema.table("trx_transaksi", (table) => {
        table.decimal("dp_nominal", 12, 2).notNullable().defaultTo(0).after("total_diskon");
      });
      console.log("Column 'dp_nominal' added successfully.");
    } else {
      console.log("Column 'dp_nominal' already exists.");
    }

    const hasMetodeDp = await DB.schema.hasColumn("trx_transaksi", "metode_pembayaran_dp");
    if (!hasMetodeDp) {
      await DB.schema.table("trx_transaksi", (table) => {
        table.string("metode_pembayaran_dp", 50).nullable().after("dp_nominal");
      });
      console.log("Column 'metode_pembayaran_dp' added successfully.");
    } else {
      console.log("Column 'metode_pembayaran_dp' already exists.");
    }

    const hasSisaBayar = await DB.schema.hasColumn("trx_transaksi", "sisa_bayar");
    if (!hasSisaBayar) {
      await DB.schema.table("trx_transaksi", (table) => {
        table.decimal("sisa_bayar", 12, 2).notNullable().defaultTo(0).after("total_bayar");
      });
      console.log("Column 'sisa_bayar' added successfully.");
    } else {
      console.log("Column 'sisa_bayar' already exists.");
    }

    // Set default value for existing rows: sisa_bayar = Math.max(0, total_bayar - COALESCE(dp_nominal, 0))
    await DB.raw("UPDATE trx_transaksi SET sisa_bayar = GREATEST(0, total_bayar - COALESCE(dp_nominal, 0)) WHERE sisa_bayar = 0 AND total_bayar > 0");
    console.log("Existing rows updated with default sisa_bayar.");

    console.log("Migration finished successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration ERROR:", error);
    process.exit(1);
  } finally {
    await DB.destroy();
  }
}

runMigration();
