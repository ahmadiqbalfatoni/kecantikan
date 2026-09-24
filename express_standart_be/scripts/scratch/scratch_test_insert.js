import DB from "./core/config/knex.js";
import { syncRekamMedisPerKunjungan } from "./routes/v1/master/ruangan/rekam_medis_service.js";

async function testInsert() {
  try {
    const testKunjungan = "KJ-20260831-006";
    console.log("Testing syncRekamMedisPerKunjungan for", testKunjungan);

    await syncRekamMedisPerKunjungan({
      kode_kunjungan: testKunjungan,
      kode_ruangan: "RNG-KONSUL",
      nama_ruangan: "Ruang Konsultasi",
      hasil_form: {
        rekomendasi_items: [
          { jenis: "produk", kode: "PRD-001", nama: "Nivia men", harga: 45000, qty: 1 },
          { jenis: "produk", kode: "PRD-002", nama: "Deo", harga: 5000, qty: 1 }
        ]
      },
      catatan_petugas: "Test catatan",
      username: "test",
    });

    const rm = await DB("trx_rekam_medis").where("kode_kunjungan", testKunjungan).first();
    console.log("RM Result:", rm);

    process.exit(0);
  } catch (err) {
    console.error("Test insert error:", err);
    process.exit(1);
  }
}

testInsert();
