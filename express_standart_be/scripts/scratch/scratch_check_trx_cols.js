import DB from "./core/config/knex.js";

async function checkTrxCols() {
  try {
    const hasCol = await DB.schema.hasColumn("trx_transaksi", "is_product_only");
    console.log("has is_product_only column:", hasCol);

    if (!hasCol) {
      console.log("Adding is_product_only column to trx_transaksi...");
      await DB.schema.table("trx_transaksi", (table) => {
        table.integer("is_product_only").defaultTo(0);
      });
      console.log("Column is_product_only added successfully!");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkTrxCols();
