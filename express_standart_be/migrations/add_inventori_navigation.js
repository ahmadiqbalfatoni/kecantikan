import DB from "../core/config/knex.js";

async function run() {
  try {
    console.log("Starting navigation migration for Inventori...");

    const newItem = {
      label: "Inventori",
      icon: "pi pi-fw pi-box",
      to: "/master-data/inventori",
    };

    // 1. Update mst_navigation
    const mstRows = await DB("mst_navigation").select("id", "menu");
    for (const row of mstRows) {
      if (!row.menu) continue;
      const menu = typeof row.menu === "string" ? JSON.parse(row.menu) : row.menu;
      const masterGroup = menu.find((g) => g.label === "MASTER DATA");
      if (masterGroup && masterGroup.items) {
        const exists = masterGroup.items.some((it) => it.to === "/master-data/inventori");
        if (!exists) {
          // Sisipkan setelah Paket Produk atau sebelum Supplier
          const supIdx = masterGroup.items.findIndex((it) => it.to === "/master-data/supplier" || it.label === "Supplier");
          if (supIdx !== -1) {
            masterGroup.items.splice(supIdx, 0, newItem);
          } else {
            masterGroup.items.push(newItem);
          }
          await DB("mst_navigation")
            .where("id", row.id)
            .update({ menu: JSON.stringify(menu) });
          console.log(`Updated mst_navigation id ${row.id}`);
        }
      }
    }

    // 2. Update user_navigation
    const userRows = await DB("user_navigation").select("id", "user_code", "menu");
    for (const row of userRows) {
      if (!row.menu) continue;
      const menu = typeof row.menu === "string" ? JSON.parse(row.menu) : row.menu;
      const masterGroup = menu.find((g) => g.label === "MASTER DATA");
      if (masterGroup && masterGroup.items) {
        const exists = masterGroup.items.some((it) => it.to === "/master-data/inventori");
        if (!exists) {
          const supIdx = masterGroup.items.findIndex((it) => it.to === "/master-data/supplier" || it.label === "Supplier");
          if (supIdx !== -1) {
            masterGroup.items.splice(supIdx, 0, newItem);
          } else {
            masterGroup.items.push(newItem);
          }
          await DB("user_navigation")
            .where("id", row.id)
            .update({ menu: JSON.stringify(menu) });
          console.log(`Updated user_navigation id ${row.id} (${row.user_code})`);
        }
      }
    }

    console.log("Inventori navigation migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

run();
