import DB from "../core/config/knex.js";

async function runDataMigration() {
  try {
    console.log("=== MEMULAI MIGRASI DATA LAMA KE TRX_REKAM_MEDIS_RUANGAN ===");

    const targetIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14];
    const oldRows = await DB("trx_rekam_medis").whereIn("id", targetIds).orderBy("id", "asc");
    const roomsMaster = await DB("mst_ruangan").select("*");
    const roomFormFields = await DB("mst_ruangan_form").select("*");

    let totalCreatedRoomRows = 0;
    let totalUpdatedFotos = 0;

    for (const row of oldRows) {
      console.log(`\n--------------------------------------------------`);
      console.log(`[BEFORE] Processing trx_rekam_medis ID: ${row.id} | Kunjungan: ${row.kode_kunjungan}`);
      console.log(`  - detail_layanan_ruangan:`, row.detail_layanan_ruangan);
      console.log(`  - data_form:`, row.data_form);
      console.log(`  - catatan_petugas:`, row.catatan_petugas);
      console.log(`  - tindakan:`, row.tindakan);
      console.log(`  - catatan:`, row.catatan);

      // Clean existing migrated records for this ID if re-running
      await DB("trx_rekam_medis_ruangan").where("id_rekam_medis", row.id).del();

      let createdRoomRows = [];

      // -----------------------------------------------------------------
      // STRATEGI 1: Jika detail_layanan_ruangan (namespaced JSON) terisi
      // -----------------------------------------------------------------
      let parsedDetailRuangan = null;
      if (row.detail_layanan_ruangan) {
        try {
          parsedDetailRuangan = typeof row.detail_layanan_ruangan === "string"
            ? JSON.parse(row.detail_layanan_ruangan)
            : row.detail_layanan_ruangan;
        } catch (_) {
          parsedDetailRuangan = null;
        }
      }

      if (parsedDetailRuangan && Object.keys(parsedDetailRuangan).length > 0) {
        for (const [kKodeRuangan, rVal] of Object.entries(parsedDetailRuangan)) {
          const kodeRuangan = rVal.kode_ruangan || kKodeRuangan;
          const namaRuangan = rVal.nama_ruangan || roomsMaster.find(r => r.kode_ruangan === kodeRuangan)?.nama_ruangan || "Ruangan Treatment";
          
          let dataForm = rVal.hasil_form || {};
          let catTindakan = dataForm.catatan_tindakan || null;
          let catPetugas = rVal.catatan_petugas || row.catatan_petugas || null;
          let catHasil = rVal.catatan_hasil_treatment || null;

          const kodeRMR = `RMR-${row.kode_kunjungan}-${kodeRuangan}-${Date.now().toString().slice(-4)}`;

          const [newId] = await DB("trx_rekam_medis_ruangan").insert({
            kode_rekam_medis_ruangan: kodeRMR,
            id_rekam_medis: row.id,
            kode_kunjungan: row.kode_kunjungan,
            kode_antrian_layanan: row.kode_antrian_layanan || null,
            kode_ruangan: kodeRuangan,
            nama_ruangan: namaRuangan,
            kode_karyawan: row.kode_karyawan || null,
            data_form: JSON.stringify(dataForm),
            catatan_tindakan: catTindakan,
            catatan_petugas: catPetugas,
            catatan_hasil_treatment: catHasil,
            status: "selesai",
            created_by: row.created_by || "system_migration",
            created_at: row.created_at || new Date(),
            updated_by: "system_migration",
            updated_at: new Date()
          });

          createdRoomRows.push({ id: newId, kode_ruangan: kodeRuangan, nama_ruangan: namaRuangan, data_form: dataForm });
          totalCreatedRoomRows++;
        }
      }
      // -----------------------------------------------------------------
      // STRATEGI 2: Jika detail_layanan_ruangan NULL tapi data_form (flat) terisi
      // -----------------------------------------------------------------
      else {
        let parsedDataForm = null;
        if (row.data_form) {
          try {
            parsedDataForm = typeof row.data_form === "string" ? JSON.parse(row.data_form) : row.data_form;
          } catch (_) {
            parsedDataForm = null;
          }
        }

        // Tentukan kode_ruangan
        let targetKodeRuangan = null;
        let targetNamaRuangan = null;

        // Cek dari antrian layanan
        let antrian = null;
        if (row.kode_antrian_layanan) {
          antrian = await DB("trx_antrian_layanan").where("kode_antrian_layanan", row.kode_antrian_layanan).first();
        }
        if (!antrian && row.kode_kunjungan) {
          antrian = await DB("trx_antrian_layanan").where("kode_kunjungan", row.kode_kunjungan).first();
        }

        if (antrian && antrian.kode_ruangan) {
          targetKodeRuangan = antrian.kode_ruangan;
          targetNamaRuangan = antrian.nama_ruangan;
        } else if (row.kode_kunjungan) {
          const detailAntrian = await DB("trx_detail_antrian_layanan").where("kode_kunjungan", row.kode_kunjungan).first();
          if (detailAntrian && detailAntrian.kode_ruangan) {
            targetKodeRuangan = detailAntrian.kode_ruangan;
            targetNamaRuangan = detailAntrian.nama_ruangan;
          }
        }

        // Tentukan dari content / prefix jika belum ketemu
        const textContent = `${row.tindakan || ""} ${row.catatan || ""}`;
        if (!targetKodeRuangan) {
          if (textContent.includes("Keramas") || parsedDataForm?.kondisi_rambut_scalp_saat_ini) {
            targetKodeRuangan = "RNG-006";
            targetNamaRuangan = "Ruang Hair & Scalp";
          } else if (textContent.includes("facial") || textContent.includes("Kulit") || parsedDataForm?.kondisi_keluhan_pasien_saat_ini) {
            targetKodeRuangan = "RNG-002";
            targetNamaRuangan = "Ruangan Facial & Peeling";
          } else if (textContent.includes("Device") || textContent.includes("Wajah") || parsedDataForm?.jumlah_pass_shot) {
            targetKodeRuangan = "RNG-004";
            targetNamaRuangan = "Ruang Device / Energy-Based";
          } else if (textContent.includes("Konsultasi") || parsedDataForm?.rekomendasi_treatment) {
            targetKodeRuangan = "RNG-007";
            targetNamaRuangan = "Ruang Konsultasi";
          }
        }

        // Penanganan bug concat "---"
        let catPetugasClean = row.catatan_petugas;
        if (!catPetugasClean && textContent.includes("---")) {
          const segments = textContent.split("---").map(s => s.trim()).filter(Boolean);
          const lastSegment = segments[segments.length - 1];
          if (lastSegment) {
            catPetugasClean = lastSegment;
          }
        }

        // Jika data_form atau textContent memiliki informasi ruangan
        if (targetKodeRuangan || (parsedDataForm && Object.keys(parsedDataForm).length > 0) || catPetugasClean) {
          targetKodeRuangan = targetKodeRuangan || "RNG-007";
          targetNamaRuangan = targetNamaRuangan || roomsMaster.find(r => r.kode_ruangan === targetKodeRuangan)?.nama_ruangan || "Ruangan Treatment";

          const dataFormFinal = parsedDataForm || {};
          let catTindakan = dataFormFinal.catatan_tindakan || dataFormFinal.catatan_tindakan_alat_digunakan || null;

          const kodeRMR = `RMR-${row.kode_kunjungan}-${targetKodeRuangan}-${Date.now().toString().slice(-4)}`;

          const [newId] = await DB("trx_rekam_medis_ruangan").insert({
            kode_rekam_medis_ruangan: kodeRMR,
            id_rekam_medis: row.id,
            kode_kunjungan: row.kode_kunjungan,
            kode_antrian_layanan: row.kode_antrian_layanan || null,
            kode_ruangan: targetKodeRuangan,
            nama_ruangan: targetNamaRuangan,
            kode_karyawan: row.kode_karyawan || null,
            data_form: JSON.stringify(dataFormFinal),
            catatan_tindakan: catTindakan,
            catatan_petugas: catPetugasClean || null,
            catatan_hasil_treatment: null,
            status: "selesai",
            created_by: row.created_by || "system_migration",
            created_at: row.created_at || new Date(),
            updated_by: "system_migration",
            updated_at: new Date()
          });

          createdRoomRows.push({ id: newId, kode_ruangan: targetKodeRuangan, nama_ruangan: targetNamaRuangan, data_form: dataFormFinal });
          totalCreatedRoomRows++;
        }
      }

      // -----------------------------------------------------------------
      // Update trx_rekam_medis_foto id_rekam_medis_ruangan
      // -----------------------------------------------------------------
      if (createdRoomRows.length > 0) {
        const primaryRoomId = createdRoomRows[0].id;
        const updatedCount = await DB("trx_rekam_medis_foto")
          .where("id_rekam_medis", row.id)
          .update({ id_rekam_medis_ruangan: primaryRoomId });

        totalUpdatedFotos += updatedCount;
      }

      console.log(`[AFTER] Result for ID ${row.id}: Created ${createdRoomRows.length} trx_rekam_medis_ruangan row(s):`);
      console.log(JSON.stringify(createdRoomRows, null, 2));
    }

    console.log(`\n==================================================`);
    console.log(`MIGRASI DATA SELESAI SUKSES!`);
    console.log(`Total baris trx_rekam_medis_ruangan dibuat: ${totalCreatedRoomRows}`);
    console.log(`Total foto diperbarui dengan id_rekam_medis_ruangan: ${totalUpdatedFotos}`);
    console.log(`==================================================`);

  } catch (error) {
    console.error("Migration Error:", error);
  } finally {
    await DB.destroy();
  }
}

runDataMigration();
