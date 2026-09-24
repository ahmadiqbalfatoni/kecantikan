import DB from "./core/config/knex.js";

async function cleanTrx009() {
  try {
    const kodeTrx = "TRX-20260831-009";
    const trxObj = await DB("trx_transaksi").where("kode_transaksi", kodeTrx).first();

    if (!trxObj) {
      console.log("Trx 009 not found");
      process.exit(0);
    }

    const details = await DB("trx_detail_transaksi").where("kode_transaksi", kodeTrx);
    console.log("Current details for TRX-20260831-009:", details.map(d => ({ id: d.id, kode_layanan: d.kode_layanan, kode_produk: d.kode_produk, qty: d.qty, subtotal: d.subtotal })));

    // Keep unique kode_layanan / kode_produk
    const seen = new Set();
    const idsToDelete = [];

    for (const d of details) {
      const key = d.kode_layanan ? `layanan:${d.kode_layanan}` : `produk:${d.kode_produk}`;
      if (seen.has(key)) {
        idsToDelete.push(d.id);
      } else {
        seen.add(key);
      }
    }

    if (idsToDelete.length > 0) {
      console.log("Deleting duplicate detail ids:", idsToDelete);
      await DB("trx_detail_transaksi").whereIn("id", idsToDelete).del();
    }

    // Recalculate transaction totals
    const allDetails = await DB("trx_detail_transaksi").where("kode_transaksi", kodeTrx).sum("subtotal as total");
    const newTotal = parseFloat(allDetails[0]?.total || 0);

    await DB("trx_transaksi")
      .where("kode_transaksi", kodeTrx)
      .update({
        total_harga: newTotal,
        total_bayar: newTotal,
      });

    console.log("Updated TRX-20260831-009 total to:", newTotal);

    // Also clean duplicate antrean details for KJ-20260831-006
    const antrianDetails = await DB("trx_detail_antrian_layanan").where("kode_kunjungan", trxObj.kode_kunjungan);
    const seenAntrian = new Set();
    const antrianIdsToDelete = [];

    for (const ad of antrianDetails) {
      const key = `${ad.kode_antrian_layanan}:${ad.kode_layanan}`;
      if (seenAntrian.has(key)) {
        antrianIdsToDelete.push(ad.id);
      } else {
        seenAntrian.add(key);
      }
    }

    if (antrianIdsToDelete.length > 0) {
      console.log("Deleting duplicate antrean detail ids:", antrianIdsToDelete);
      await DB("trx_detail_antrian_layanan").whereIn("id", antrianIdsToDelete).del();
    }

    process.exit(0);
  } catch (err) {
    console.error("Clean error:", err);
    process.exit(1);
  }
}

cleanTrx009();
