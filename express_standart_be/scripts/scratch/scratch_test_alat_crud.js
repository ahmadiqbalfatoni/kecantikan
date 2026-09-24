import DB from "./core/config/knex.js";

async function testAlatCrud() {
  try {
    console.log("=== TESTING ALAT DATA ===");
    const vaData = await DB("mst_alat as a")
      .leftJoin("mst_ruangan as r", "r.kode_ruangan", "a.kode_ruangan")
      .select("a.kode_alat", "a.kode_ruangan", "r.nama_ruangan", "a.nama", "a.merk", "a.tanggal_beli", "a.kondisi", "a.status");

    console.log("Alat data query result:", vaData);

    console.log("=== TESTING ALAT INSERT ===");
    const last = await DB("mst_alat").orderBy("id", "desc").first();
    let n = 1;
    if (last?.kode_alat) {
      n = (parseInt(last.kode_alat.replace("ALT-", "")) || 0) + 1;
    }
    const kode = `ALT-${String(n).padStart(3, "0")}`;

    const oData = {
      kode_alat: kode,
      kode_ruangan: "RNG-001",
      nama: `Tes Alat ${n}`,
      merk: "Samsung Medical",
      tanggal_beli: "2026-08-31",
      kondisi: "baik",
      status: "aktif",
      tz: "Asia/Jakarta",
      created_by: "test@admin.com",
      created_at: new Date(),
      updated_by: "test@admin.com",
      updated_at: new Date(),
    };

    await DB("mst_alat").insert(oData);
    console.log("Inserted test alat successfully:", kode);

    const inserted = await DB("mst_alat as a")
      .leftJoin("mst_ruangan as r", "r.kode_ruangan", "a.kode_ruangan")
      .where("a.kode_alat", kode)
      .select("a.kode_alat", "a.kode_ruangan", "r.nama_ruangan", "a.nama", "a.merk", "a.tanggal_beli", "a.kondisi", "a.status")
      .first();

    console.log("Fetched inserted record:", inserted);

    // Clean up test record
    await DB("mst_alat").where("kode_alat", kode).del();
    console.log("Deleted test record:", kode);

    process.exit(0);
  } catch (err) {
    console.error("CRUD Test Error:", err);
    process.exit(1);
  }
}

testAlatCrud();
