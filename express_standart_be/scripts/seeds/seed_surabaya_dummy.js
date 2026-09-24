/**
 * Seeder Data Dummy Lengkap Cabang Surabaya (CBG-002)
 * Menambahkan data master (ruangan, karyawan, jadwal, layanan, produk, supplier, alat, paket, promo, pasien)
 * dan data transaksi operasional (kunjungan, kasir, omzet) untuk Cabang Surabaya.
 */

import DB from "../../core/config/knex.js";
import { formatDateSystem } from "../../routes/v1/components/tools/date_tools.js";

const KODE_CABANG = "CBG-002";
const USERNAME = "manager.surabaya@klinik.com";
const TZ = "Asia/Jakarta";

async function runSeed() {
  console.log("=================================================");
  console.log("Memulai Seeder Data Dummy Cabang Surabaya (CBG-002)");
  console.log("=================================================");

  // 1. RUANGAN
  console.log("\n1. Memeriksa & Menambahkan Ruangan...");
  const roomsToAdd = [
    { nama_ruangan: "Ruang Tindakan Medis & Laser", is_konsultasi: 0 },
    { nama_ruangan: "Ruang Facial & Skincare", is_konsultasi: 0 },
    { nama_ruangan: "Ruang Body & Spa Treatment", is_konsultasi: 0 },
  ];

  for (const r of roomsToAdd) {
    const exists = await DB("mst_ruangan")
      .where("kode_cabang", KODE_CABANG)
      .where("nama_ruangan", r.nama_ruangan)
      .first();

    if (!exists) {
      const last = await DB("mst_ruangan").orderBy("id", "desc").first();
      let n = 1;
      if (last?.kode_ruangan) {
        n = (parseInt(last.kode_ruangan.replace("RNG-", ""), 10) || 0) + 1;
      }
      const kode = `RNG-${String(n).padStart(3, "0")}`;
      await DB("mst_ruangan").insert({
        kode_ruangan: kode,
        nama_ruangan: r.nama_ruangan,
        is_konsultasi: r.is_konsultasi,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Ruangan ditambahkan: [${kode}] ${r.nama_ruangan}`);
    }
  }

  // Dapatkan referensi ruangan Surabaya
  const surabayaRooms = await DB("mst_ruangan").where("kode_cabang", KODE_CABANG).select("kode_ruangan", "nama_ruangan", "is_konsultasi");
  const ruangKonsul = surabayaRooms.find(r => r.is_konsultasi === 1) || surabayaRooms[0];
  const ruangTindakan = surabayaRooms.find(r => r.is_konsultasi === 0) || surabayaRooms[0];

  // 2. KARYAWAN & DOKTER
  console.log("\n2. Menambahkan Karyawan & Dokter...");
  const employeesToAdd = [
    {
      nama: "dr. Amanda Pramudita, Sp.DV",
      jabatan: "dokter",
      no_sip: "SIP-SBY-001",
      no_hp: "081234567801",
      email: "amanda.pramudita@klinik.com",
    },
    {
      nama: "dr. Kevin Sanjaya",
      jabatan: "dokter",
      no_sip: "SIP-SBY-002",
      no_hp: "081234567802",
      email: "kevin.sanjaya@klinik.com",
    },
    {
      nama: "Siti Rahayu, A.Md.Kep",
      jabatan: "perawat",
      no_sip: "SIP-SBY-003",
      no_hp: "081234567803",
      email: "siti.rahayu@klinik.com",
    },
    {
      nama: "Rina Kartika",
      jabatan: "terapis",
      no_sip: "SIP-SBY-004",
      no_hp: "081234567804",
      email: "rina.kartika@klinik.com",
    },
    {
      nama: "Dina Olivia",
      jabatan: "kasir",
      no_sip: "SIP-SBY-005",
      no_hp: "081234567805",
      email: "dina.olivia@klinik.com",
    },
    {
      nama: "Farhan Ramadhan, S.Farm., Apt.",
      jabatan: "apoteker",
      no_sip: "SIP-SBY-006",
      no_hp: "081234567806",
      email: "farhan.ramadhan@klinik.com",
    }
  ];

  for (const emp of employeesToAdd) {
    const exists = await DB("mst_karyawan").where("no_sip", emp.no_sip).first();
    if (!exists) {
      const last = await DB("mst_karyawan").orderBy("id", "desc").first();
      let n = 1;
      if (last?.kode_karyawan) {
        n = (parseInt(last.kode_karyawan.replace("KAR-", ""), 10) || 0) + 1;
      }
      const kode = `KAR-${String(n).padStart(3, "0")}`;
      await DB("mst_karyawan").insert({
        kode_karyawan: kode,
        no_sip: emp.no_sip,
        nama: emp.nama,
        jabatan: emp.jabatan,
        no_hp: emp.no_hp,
        email: emp.email,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Karyawan ditambahkan: [${kode}] ${emp.nama} (${emp.jabatan})`);
    }
  }

  // 3. JADWAL KARYAWAN
  console.log("\n3. Menambahkan Jadwal Praktik Karyawan...");
  const schedulesToAdd = [
    { no_sip: "SIP-SBY-001", kode_ruangan: ruangKonsul.kode_ruangan, is_pj: 1, hari: "Senin", jam_mulai: "09:00:00", jam_selesai: "15:00:00", kuota: 15 },
    { no_sip: "SIP-SBY-001", kode_ruangan: ruangKonsul.kode_ruangan, is_pj: 1, hari: "Rabu", jam_mulai: "09:00:00", jam_selesai: "15:00:00", kuota: 15 },
    { no_sip: "SIP-SBY-001", kode_ruangan: ruangKonsul.kode_ruangan, is_pj: 1, hari: "Jumat", jam_mulai: "09:00:00", jam_selesai: "15:00:00", kuota: 15 },
    { no_sip: "SIP-SBY-002", kode_ruangan: ruangKonsul.kode_ruangan, is_pj: 1, hari: "Selasa", jam_mulai: "13:00:00", jam_selesai: "19:00:00", kuota: 15 },
    { no_sip: "SIP-SBY-002", kode_ruangan: ruangKonsul.kode_ruangan, is_pj: 1, hari: "Kamis", jam_mulai: "13:00:00", jam_selesai: "19:00:00", kuota: 15 },
    { no_sip: "SIP-SBY-002", kode_ruangan: ruangKonsul.kode_ruangan, is_pj: 1, hari: "Sabtu", jam_mulai: "10:00:00", jam_selesai: "16:00:00", kuota: 20 },
    { no_sip: "SIP-SBY-003", kode_ruangan: ruangTindakan.kode_ruangan, is_pj: 0, hari: "Senin", jam_mulai: "09:00:00", jam_selesai: "17:00:00", kuota: 20 },
    { no_sip: "SIP-SBY-004", kode_ruangan: ruangTindakan.kode_ruangan, is_pj: 0, hari: "Selasa", jam_mulai: "09:00:00", jam_selesai: "17:00:00", kuota: 20 },
  ];

  for (const s of schedulesToAdd) {
    const exists = await DB("mst_jadwal_karyawan")
      .where("no_sip", s.no_sip)
      .where("hari", s.hari)
      .where("kode_cabang", KODE_CABANG)
      .first();

    if (!exists) {
      const last = await DB("mst_jadwal_karyawan").orderBy("id", "desc").first();
      let n = 1;
      if (last?.kode_jadwal) {
        n = (parseInt(last.kode_jadwal.replace("JAD-", ""), 10) || 0) + 1;
      }
      const kode = `JAD-${String(n).padStart(3, "0")}`;
      await DB("mst_jadwal_karyawan").insert({
        kode_jadwal: kode,
        no_sip: s.no_sip,
        kode_ruangan: s.kode_ruangan,
        is_penanggung_jawab: s.is_pj,
        hari: s.hari,
        jam_mulai: s.jam_mulai,
        jam_selesai: s.jam_selesai,
        kuota: s.kuota,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Jadwal ditambahkan: [${kode}] ${s.no_sip} (${s.hari} ${s.jam_mulai} - ${s.jam_selesai})`);
    }
  }

  // 4. SUPPLIER
  console.log("\n4. Menambahkan Supplier...");
  const suppliersToAdd = [
    { nama: "PT Surabaya Dermapharm Medika", alamat: "Kawasan Industri Rungkut Blok B-12, Surabaya", no_hp: "0318432190", email: "sales@sbydermapharm.co.id" },
    { nama: "CV Estetika Jaya Abadi", alamat: "Jl. Mayjen Sungkono No. 88, Surabaya", no_hp: "0315678901", email: "order@estetikajaya.id" },
  ];

  for (const sup of suppliersToAdd) {
    const exists = await DB("mst_supplier").where("nama", sup.nama).first();
    if (!exists) {
      const last = await DB("mst_supplier").orderBy("id", "desc").first();
      let n = 1;
      if (last?.kode_supplier) {
        n = (parseInt(last.kode_supplier.replace("SUP-", ""), 10) || 0) + 1;
      }
      const kode = `SUP-${String(n).padStart(3, "0")}`;
      await DB("mst_supplier").insert({
        kode_supplier: kode,
        nama: sup.nama,
        alamat: sup.alamat,
        no_hp: sup.no_hp,
        email: sup.email,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Supplier ditambahkan: [${kode}] ${sup.nama}`);
    }
  }

  // 5. LAYANAN
  console.log("\n5. Menambahkan Layanan Treatment...");
  const servicesToAdd = [
    {
      nama: "Facial Deep Cleansing & HydraGlow",
      kode_kategori_layanan: "KAT-001",
      tipe: "BEAUTY TREATMENT",
      wajib_konsultasi: "tidak",
      kode_ruangan: ruangTindakan.kode_ruangan,
      harga: 185000,
      durasi_menit: 45,
    },
    {
      nama: "Laser Rejuvenation & Pori Treatment",
      kode_kategori_layanan: "KAT-001",
      tipe: "MEDICAL TREATMENT",
      wajib_konsultasi: "wajib",
      kode_ruangan: ruangTindakan.kode_ruangan,
      kode_ruangan_konsultasi: ruangKonsul.kode_ruangan,
      harga: 650000,
      durasi_menit: 40,
    },
    {
      nama: "Chemical Peeling Acne Defense",
      kode_kategori_layanan: "KAT-002",
      tipe: "MEDICAL TREATMENT",
      wajib_konsultasi: "wajib",
      kode_ruangan: ruangTindakan.kode_ruangan,
      kode_ruangan_konsultasi: ruangKonsul.kode_ruangan,
      harga: 320000,
      durasi_menit: 30,
    },
    {
      nama: "Skin Booster Salmon DNA Glow",
      kode_kategori_layanan: "KAT-005",
      tipe: "MEDICAL TREATMENT",
      wajib_konsultasi: "wajib",
      kode_ruangan: ruangTindakan.kode_ruangan,
      kode_ruangan_konsultasi: ruangKonsul.kode_ruangan,
      harga: 1500000,
      durasi_menit: 45,
    },
    {
      nama: "Underarm Brightening & Hair Removal Laser",
      kode_kategori_layanan: "KAT-004",
      tipe: "BEAUTY TREATMENT",
      wajib_konsultasi: "opsional",
      kode_ruangan: ruangTindakan.kode_ruangan,
      harga: 250000,
      durasi_menit: 30,
    },
    {
      nama: "Scalp Detox & Hair Revitalizing Spa",
      kode_kategori_layanan: "KAT-003",
      tipe: "SERVICE TREATMENT",
      wajib_konsultasi: "tidak",
      kode_ruangan: ruangTindakan.kode_ruangan,
      harga: 160000,
      durasi_menit: 60,
    },
  ];

  for (const s of servicesToAdd) {
    const exists = await DB("mst_layanan")
      .where("nama", s.nama)
      .where("kode_cabang", KODE_CABANG)
      .first();

    if (!exists) {
      const last = await DB("mst_layanan").orderBy("id", "desc").first();
      let n = 1;
      if (last?.kode_layanan) {
        n = (parseInt(last.kode_layanan.replace("LAY-", ""), 10) || 0) + 1;
      }
      const kode = `LAY-${String(n).padStart(3, "0")}`;
      await DB("mst_layanan").insert({
        kode_layanan: kode,
        kode_kategori_layanan: s.kode_kategori_layanan,
        kode_ruangan: s.kode_ruangan,
        wajib_konsultasi: s.wajib_konsultasi,
        kode_ruangan_konsultasi: s.kode_ruangan_konsultasi || null,
        nama: s.nama,
        tipe: s.tipe,
        harga: s.harga,
        durasi_menit: s.durasi_menit,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Layanan ditambahkan: [${kode}] ${s.nama} (${s.tipe} - Rp ${s.harga.toLocaleString("id-ID")})`);
    }
  }

  // 6. PRODUK & STOK
  console.log("\n6. Menambahkan Produk Skincare & Stok...");
  const productsToAdd = [
    { nama: "Gentle Refreshing Cleanser 100ml", satuan: "Botol", harga_beli: 45000, harga_jual: 75000, stok_tersedia: 45, stok_minimum: 10 },
    { nama: "Brightening Niacinamide Serum 20ml", satuan: "Botol", harga_beli: 75000, harga_jual: 135000, stok_tersedia: 30, stok_minimum: 8 },
    { nama: "Physical Sunscreen UV Shield SPF50 50g", satuan: "Tube", harga_beli: 60000, harga_jual: 110000, stok_tersedia: 50, stok_minimum: 15 },
    { nama: "Acne Relief Spot Treatment 15g", satuan: "Tube", harga_beli: 35000, harga_jual: 65000, stok_tersedia: 35, stok_minimum: 10 },
    { nama: "Ceramide Moisture Barrier Cream 50ml", satuan: "Jar", harga_beli: 80000, harga_jual: 145000, stok_tersedia: 25, stok_minimum: 5 },
    { nama: "Soothing Cica Sheet Mask (5 pcs/box)", satuan: "Box", harga_beli: 50000, harga_jual: 85000, stok_tersedia: 60, stok_minimum: 15 },
  ];

  for (const p of productsToAdd) {
    const exists = await DB("mst_produk")
      .where("nama", p.nama)
      .where("kode_cabang", KODE_CABANG)
      .first();

    if (!exists) {
      const allPrd = await DB("mst_produk").where("kode_produk", "like", "PRD-%").select("kode_produk");
      let maxNum = 0;
      for (const pr of allPrd) {
        const num = parseInt(pr.kode_produk.replace("PRD-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      const kode = `PRD-${String(maxNum + 1).padStart(3, "0")}`;

      await DB("mst_produk").insert({
        kode_produk: kode,
        kode_kategori_produk: "KATPRD-001",
        nama: p.nama,
        satuan: p.satuan,
        harga_beli: p.harga_beli,
        harga_jual: p.harga_jual,
        stok_minimum: p.stok_minimum,
        stok_tersedia: p.stok_tersedia,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Produk ditambahkan: [${kode}] ${p.nama} (Stok: ${p.stok_tersedia})`);
    }
  }

  // 7. PAKET LAYANAN
  console.log("\n7. Menambahkan Paket Layanan...");
  const sbyServices = await DB("mst_layanan").where("kode_cabang", KODE_CABANG).select("kode_layanan", "nama");
  const sbyLay1 = sbyServices[0]?.kode_layanan || "LAY-012";
  const sbyLay2 = sbyServices[1]?.kode_layanan || "LAY-013";

  const paketLayananToAdd = [
    {
      nama: "Paket Radiant Glow Surabaya (3x Facial + 1x Peeling)",
      tipe: "BEAUTY TREATMENT",
      harga_paket: 699000,
      masa_berlaku_hari: 90,
      is_selamanya: 1,
      details: [
        { kode_layanan: sbyLay1, jumlah_sesi: 3 },
        { kode_layanan: sbyLay2, jumlah_sesi: 1 },
      ]
    },
    {
      nama: "Paket Bebas Jerawat Intensif (4x Treatment)",
      tipe: "MEDICAL TREATMENT",
      harga_paket: 1200000,
      masa_berlaku_hari: 120,
      is_selamanya: 1,
      details: [
        { kode_layanan: sbyLay1, jumlah_sesi: 4 },
      ]
    }
  ];

  for (const pkt of paketLayananToAdd) {
    const exists = await DB("mst_paket_layanan")
      .where("nama", pkt.nama)
      .where("kode_cabang", KODE_CABANG)
      .first();

    if (!exists) {
      const last = await DB("mst_paket_layanan").orderBy("id", "desc").first();
      let n = 1;
      if (last?.kode_paket_layanan) {
        n = (parseInt(last.kode_paket_layanan.replace("PKT-", ""), 10) || 0) + 1;
      }
      const kode = `PKT-${String(n).padStart(3, "0")}`;

      await DB("mst_paket_layanan").insert({
        kode_paket_layanan: kode,
        nama: pkt.nama,
        tipe: pkt.tipe,
        kode_ruangan: ruangTindakan.kode_ruangan,
        harga_paket: pkt.harga_paket,
        masa_berlaku_hari: pkt.masa_berlaku_hari,
        is_masa_berlaku_selamanya: 0,
        is_selamanya: 1,
        tanggal_mulai: formatDateSystem(new Date(), "yyyy-MM-dd"),
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });

      let dSeq = 1;
      for (const d of pkt.details) {
        await DB("mst_detail_paket_layanan").insert({
          kode_detail_paket_layanan: `DPKT-${kode}-${String(dSeq++).padStart(2, "0")}`,
          kode_paket_layanan: kode,
          kode_layanan: d.kode_layanan,
          jumlah_sesi: d.jumlah_sesi,
          tz: TZ,
          created_by: USERNAME,
          created_at: formatDateSystem(),
          updated_by: USERNAME,
          updated_at: formatDateSystem(),
        });
      }
      console.log(`  -> Paket Layanan ditambahkan: [${kode}] ${pkt.nama}`);
    }
  }

  // 8. PAKET PRODUK
  console.log("\n8. Menambahkan Paket Produk Skincare...");
  const sbyProds = await DB("mst_produk").where("kode_cabang", KODE_CABANG).select("kode_produk", "nama");
  if (sbyProds.length >= 2) {
    const paketProdukToAdd = [
      {
        nama: "Bundling Glowing Starter Pack Surabaya",
        harga_paket: 275000,
        masa_berlaku_hari: 180,
        details: [
          { kode_produk: sbyProds[0].kode_produk, jumlah: 1 },
          { kode_produk: sbyProds[1].kode_produk, jumlah: 1 },
        ]
      }
    ];

    for (const pkt of paketProdukToAdd) {
      const exists = await DB("mst_paket_produk")
        .where("nama", pkt.nama)
        .where("kode_cabang", KODE_CABANG)
        .first();

      if (!exists) {
        const last = await DB("mst_paket_produk").orderBy("id", "desc").first();
        let n = 1;
        if (last?.kode_paket_produk) {
          n = (parseInt(last.kode_paket_produk.replace("PKTPRD-", ""), 10) || 0) + 1;
        }
        const kode = `PKTPRD-${String(n).padStart(3, "0")}`;

        await DB("mst_paket_produk").insert({
          kode_paket_produk: kode,
          nama: pkt.nama,
          harga_paket: pkt.harga_paket,
          masa_berlaku_hari: pkt.masa_berlaku_hari,
          tanggal_mulai: formatDateSystem(new Date(), "yyyy-MM-dd"),
          status: "aktif",
          kode_cabang: KODE_CABANG,
          tz: TZ,
          created_by: USERNAME,
          created_at: formatDateSystem(),
          updated_by: USERNAME,
          updated_at: formatDateSystem(),
        });

        let dSeq = 1;
        for (const d of pkt.details) {
          await DB("mst_detail_paket_produk").insert({
            kode_detail_paket_produk: `DPPRD-${kode}-${String(dSeq++).padStart(2, "0")}`,
            kode_paket_produk: kode,
            kode_produk: d.kode_produk,
            jumlah: d.jumlah,
            tz: TZ,
            created_by: USERNAME,
            created_at: formatDateSystem(),
            updated_by: USERNAME,
            updated_at: formatDateSystem(),
          });
        }
        console.log(`  -> Paket Produk ditambahkan: [${kode}] ${pkt.nama}`);
      }
    }
  }

  // 9. ALAT & PERALATAN
  console.log("\n9. Menambahkan Alat & Peralatan Medis...");
  const alatToAdd = [
    { nama: "Q-Switched Nd:YAG Laser Machine 1064nm", merk: "Alma Lasers Korea", kondisi: "baik" },
    { nama: "HydraFacial 7in1 Dermabrasion Device", merk: "AquaPeel Pro", kondisi: "baik" },
    { nama: "Autoclave Sterilisasi Instrumen Medis 24L", merk: "Midmark Digital", kondisi: "baik" },
    { nama: "High Frequency & Electrocauter Skincare Wand", merk: "DermaTech USA", kondisi: "baik" },
  ];

  for (const alt of alatToAdd) {
    const exists = await DB("mst_alat")
      .where("nama", alt.nama)
      .where("kode_cabang", KODE_CABANG)
      .first();

    if (!exists) {
      const last = await DB("mst_alat").orderBy("id", "desc").first();
      let n = 1;
      if (last?.kode_alat) {
        n = (parseInt(last.kode_alat.replace("ALT-", ""), 10) || 0) + 1;
      }
      const kode = `ALT-${String(n).padStart(3, "0")}`;
      await DB("mst_alat").insert({
        kode_alat: kode,
        kode_ruangan: ruangTindakan.kode_ruangan,
        nama: alt.nama,
        merk: alt.merk,
        tanggal_beli: "2026-01-15",
        kondisi: alt.kondisi,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Alat ditambahkan: [${kode}] ${alt.nama}`);
    }
  }

  // 10. PROMO & DISKON
  console.log("\n10. Menambahkan Promo & Diskon Surabaya...");
  const promosToAdd = [
    {
      nama: "Promo Grand Opening Surabaya Diskon 20%",
      jenis_diskon: "persen",
      nilai_diskon: 20,
      tanggal_mulai: "2026-09-01",
      tanggal_selesai: "2026-10-31",
    },
    {
      nama: "Voucher Diskon Treatment Rp 50.000 Pelajar & Mahasiswa",
      jenis_diskon: "nominal",
      nilai_diskon: 50000,
      tanggal_mulai: "2026-09-01",
      tanggal_selesai: "2026-12-31",
    }
  ];

  for (const prm of promosToAdd) {
    const exists = await DB("mst_promo")
      .where("nama", prm.nama)
      .where("kode_cabang", KODE_CABANG)
      .first();

    if (!exists) {
      const last = await DB("mst_promo").orderBy("id", "desc").first();
      let n = 1;
      if (last?.kode_promo) {
        n = (parseInt(last.kode_promo.replace("PRM-", ""), 10) || 0) + 1;
      }
      const kode = `PRM-${String(n).padStart(3, "0")}`;
      await DB("mst_promo").insert({
        kode_promo: kode,
        nama: prm.nama,
        jenis_diskon: prm.jenis_diskon,
        nilai_diskon: prm.nilai_diskon,
        tanggal_mulai: prm.tanggal_mulai,
        tanggal_selesai: prm.tanggal_selesai,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Promo ditambahkan: [${kode}] ${prm.nama}`);
    }
  }

  // 11. PASIEN SURABAYA
  console.log("\n11. Menambahkan Data Pasien Cabang Surabaya...");
  const patientsToAdd = [
    {
      nama: "Jessica Tanuwijaya",
      nik: "3578016508980001",
      tempat_lahir: "Surabaya",
      tanggal_lahir: "1998-08-25",
      jenis_kelamin: "P",
      golongan_darah: "B",
      agama: "Kristen",
      status_perkawinan: "belum_menikah",
      pekerjaan: "Wiraswasta",
      provinsi: "Jawa Timur",
      kota_kabupaten: "Kota Surabaya",
      kecamatan: "Gubeng",
      kelurahan_desa: "Kertajaya",
      no_hp: "081133445501",
      email: "jessica.tan@gmail.com",
      alergi: "Tidak ada",
    },
    {
      nama: "Nabila Putri Anggraini",
      nik: "3578015504010002",
      tempat_lahir: "Surabaya",
      tanggal_lahir: "2001-04-15",
      jenis_kelamin: "P",
      golongan_darah: "O",
      agama: "Islam",
      status_perkawinan: "belum_menikah",
      pekerjaan: "Mahasiswi",
      provinsi: "Jawa Timur",
      kota_kabupaten: "Kota Surabaya",
      kecamatan: "Mulyorejo",
      kelurahan_desa: "Dharmahusada",
      no_hp: "081133445502",
      email: "nabila.putri@gmail.com",
      alergi: "Alergi Seafood",
    },
    {
      nama: "dr. Hendra Wicaksono",
      nik: "3578011202880003",
      tempat_lahir: "Malang",
      tanggal_lahir: "1988-02-12",
      jenis_kelamin: "L",
      golongan_darah: "A",
      agama: "Islam",
      status_perkawinan: "menikah",
      pekerjaan: "Karyawan Swasta",
      provinsi: "Jawa Timur",
      kota_kabupaten: "Kota Surabaya",
      kecamatan: "Wonokromo",
      kelurahan_desa: "Darmo",
      no_hp: "081133445503",
      email: "hendra.wicaksono@yahoo.com",
      alergi: "Tidak ada",
    },
    {
      nama: "Clara Stephanie",
      nik: "3578014509950004",
      tempat_lahir: "Surabaya",
      tanggal_lahir: "1995-09-05",
      jenis_kelamin: "P",
      golongan_darah: "AB",
      agama: "Katolik",
      status_perkawinan: "menikah",
      pekerjaan: "Content Creator",
      provinsi: "Jawa Timur",
      kota_kabupaten: "Kota Surabaya",
      kecamatan: "Sambikerep",
      kelurahan_desa: "Citraland",
      no_hp: "081133445504",
      email: "clara.steph@gmail.com",
      alergi: "Sensitif Debu",
    },
    {
      nama: "Rizky Firmansyah",
      nik: "3578012306960005",
      tempat_lahir: "Sidoarjo",
      tanggal_lahir: "1996-06-23",
      jenis_kelamin: "L",
      golongan_darah: "O",
      agama: "Islam",
      status_perkawinan: "belum_menikah",
      pekerjaan: "Digital Marketer",
      provinsi: "Jawa Timur",
      kota_kabupaten: "Kota Surabaya",
      kecamatan: "Rungkut",
      kelurahan_desa: "Kalirungkut",
      no_hp: "081133445505",
      email: "rizky.firman@gmail.com",
      alergi: "Tidak ada",
    },
  ];

  const createdPatients = [];
  for (const p of patientsToAdd) {
    let patientRecord = await DB("mst_pasien").where("nik", p.nik).first();
    if (!patientRecord) {
      const allPasien = await DB("mst_pasien").where("no_rm", "like", "RM-%").select("no_rm");
      let maxNum = 0;
      for (const pr of allPasien) {
        const num = parseInt(pr.no_rm.replace("RM-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      const noRm = `RM-${String(maxNum + 1).padStart(6, "0")}`;

      await DB("mst_pasien").insert({
        no_rm: noRm,
        nama: p.nama,
        nik: p.nik,
        tempat_lahir: p.tempat_lahir,
        tanggal_lahir: p.tanggal_lahir,
        jenis_kelamin: p.jenis_kelamin,
        golongan_darah: p.golongan_darah,
        agama: p.agama,
        status_perkawinan: p.status_perkawinan,
        kewarganegaraan: "WNI",
        pekerjaan: p.pekerjaan,
        provinsi: p.provinsi,
        kota_kabupaten: p.kota_kabupaten,
        kecamatan: p.kecamatan,
        kelurahan_desa: p.kelurahan_desa,
        kode_pos: "60286",
        no_hp: p.no_hp,
        email: p.email,
        nama_kontak_darurat: "Keluarga",
        no_hp_kontak_darurat: p.no_hp,
        hubungan_kontak_darurat: "Keluarga",
        alergi: p.alergi,
        status: "aktif",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: formatDateSystem(),
        updated_by: USERNAME,
        updated_at: formatDateSystem(),
      });
      console.log(`  -> Pasien ditambahkan: [${noRm}] ${p.nama} (${p.kota_kabupaten})`);
      patientRecord = { no_rm: noRm, nama: p.nama };
    }
    createdPatients.push(patientRecord);
  }

  // 12. TRANSAKSI KASIR & OMZET (Data Operasional Dummy)
  console.log("\n12. Menambahkan Kunjungan & Transaksi Kasir Operasional Surabaya...");
  const sbyLayananList = await DB("mst_layanan").where("kode_cabang", KODE_CABANG).limit(3);
  const sbyProdukList = await DB("mst_produk").where("kode_cabang", KODE_CABANG).limit(2);

  const today = formatDateSystem(new Date(), "yyyy-MM-dd");
  const yesterday = formatDateSystem(new Date(Date.now() - 86400000), "yyyy-MM-dd");
  const dates = [yesterday, today];

  for (let i = 0; i < createdPatients.length; i++) {
    const pt = createdPatients[i];
    const visitDate = dates[i % dates.length];

    // Cek apakah pasien ini sudah pernah punya transaksi di tanggal tsb
    const existsTrx = await DB("trx_transaksi")
      .where("no_rm", pt.no_rm)
      .where("kode_cabang", KODE_CABANG)
      .first();

    if (!existsTrx) {
      // Buat Kunjungan
      const prefixKunj = `KJ-${visitDate.replace(/-/g, "")}-`;
      const allKunj = await DB("trx_kunjungan").where("kode_kunjungan", "like", `${prefixKunj}%`).select("kode_kunjungan");
      let maxKunj = 0;
      for (const k of allKunj) {
        const num = parseInt(k.kode_kunjungan.replace(prefixKunj, ""), 10);
        if (!isNaN(num) && num > maxKunj) maxKunj = num;
      }
      const kodeKunjungan = `${prefixKunj}${String(maxKunj + 1).padStart(3, "0")}`;

      await DB("trx_kunjungan").insert({
        kode_kunjungan: kodeKunjungan,
        no_rm: pt.no_rm,
        tanggal_kunjungan: visitDate,
        jam_datang: "10:30:00",
        status: "selesai",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: `${visitDate} 10:30:00`,
        updated_by: USERNAME,
        updated_at: `${visitDate} 12:00:00`,
      });

      // Hitung rincian pembelian
      const layItem = sbyLayananList[i % sbyLayananList.length] || { kode_layanan: "LAY-012", harga: 75000 };
      const prodItem = sbyProdukList[i % sbyProdukList.length] || { kode_produk: "PRD-007", harga_jual: 30000 };
      const totalHarga = Number(layItem.harga) + Number(prodItem.harga_jual);

      // Buat Transaksi Kasir
      const prefixTrx = `TRX-${visitDate.replace(/-/g, "")}-`;
      const allTrx = await DB("trx_transaksi").where("kode_transaksi", "like", `${prefixTrx}%`).select("kode_transaksi");
      let maxTrx = 0;
      for (const t of allTrx) {
        const num = parseInt(t.kode_transaksi.replace(prefixTrx, ""), 10);
        if (!isNaN(num) && num > maxTrx) maxTrx = num;
      }
      const kodeTrx = `${prefixTrx}${String(maxTrx + 1).padStart(3, "0")}`;

      await DB("trx_transaksi").insert({
        kode_transaksi: kodeTrx,
        kode_kunjungan: kodeKunjungan,
        no_rm: pt.no_rm,
        tanggal_transaksi: visitDate,
        total_harga: totalHarga,
        total_diskon: 0,
        dp_nominal: 0,
        total_bayar: totalHarga,
        sisa_bayar: 0,
        metode_bayar: i % 2 === 0 ? "qris" : "tunai",
        status: "lunas",
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: `${visitDate} 12:15:00`,
        updated_by: USERNAME,
        updated_at: `${visitDate} 12:15:00`,
      });

      // Detail Transaksi
      const prefixDt = `DT-${visitDate.replace(/-/g, "")}-`;
      const allDt = await DB("trx_detail_transaksi").where("kode_detail_transaksi", "like", `${prefixDt}%`).select("kode_detail_transaksi");
      let maxDt = 0;
      for (const d of allDt) {
        const num = parseInt(d.kode_detail_transaksi.replace(prefixDt, ""), 10);
        if (!isNaN(num) && num > maxDt) maxDt = num;
      }
      const kodeDt1 = `${prefixDt}${String(maxDt + 1).padStart(3, "0")}`;
      const kodeDt2 = `${prefixDt}${String(maxDt + 2).padStart(3, "0")}`;

      // Detail Transaksi (Layanan)
      await DB("trx_detail_transaksi").insert({
        kode_detail_transaksi: kodeDt1,
        kode_transaksi: kodeTrx,
        kode_layanan: layItem.kode_layanan,
        qty: 1,
        harga_satuan: layItem.harga,
        subtotal: layItem.harga,
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: `${visitDate} 12:15:00`,
        updated_by: USERNAME,
        updated_at: `${visitDate} 12:15:00`,
      });

      // Detail Transaksi (Produk)
      await DB("trx_detail_transaksi").insert({
        kode_detail_transaksi: kodeDt2,
        kode_transaksi: kodeTrx,
        kode_produk: prodItem.kode_produk,
        qty: 1,
        harga_satuan: prodItem.harga_jual,
        subtotal: prodItem.harga_jual,
        kode_cabang: KODE_CABANG,
        tz: TZ,
        created_by: USERNAME,
        created_at: `${visitDate} 12:15:00`,
        updated_by: USERNAME,
        updated_at: `${visitDate} 12:15:00`,
      });

      console.log(`  -> Transaksi Kasir dibuat: [${kodeTrx}] Pasien ${pt.nama} - Total: Rp ${totalHarga.toLocaleString("id-ID")} (${visitDate})`);
    }
  }

  console.log("\n=================================================");
  console.log("SELESAI! Seluruh Data Dummy Cabang Surabaya Berhasil Ditambahkan.");
  console.log("=================================================");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("FATAL ERROR SEEDING:", err);
  process.exit(1);
});
