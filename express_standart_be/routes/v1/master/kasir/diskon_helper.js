/**
 * @project Sistem Klinik Kecantikan
 * @file diskon_helper.js
 * @description Helper kalkulasi diskon kasir murni (reusable, deterministic, testable)
 */

/**
 * Cek apakah promo memenuhi syarat (eligible) untuk keranjang saat ini.
 * Promo item spesifik HANYA bisa dipakai jika item target ada di keranjang dengan qty > 0.
 *
 * @param {Object} promo - Opsi promo { kode_item, nama_item, jenis_diskon, nilai_diskon, ... }
 * @param {Array} cart - Daftar item keranjang [{ kode, qty, subtotal, ... }]
 * @returns {{ eligible: boolean, reason?: string, targetItem?: Object }}
 */
export function checkPromoEligibility(promo, cart = []) {
  if (!promo) return { eligible: false, reason: "Promo tidak valid" };

  if (promo.kode_item) {
    const target = cart.find((c) => c.kode === promo.kode_item && (c.qty || 0) > 0);
    if (!target) {
      return {
        eligible: false,
        reason: `Tambahkan "${promo.nama_item || promo.kode_item}" ke keranjang untuk memakai promo ini`,
      };
    }
    return { eligible: true, targetItem: target };
  }

  // Promo global (tanpa target spesifik) memenuhi syarat jika keranjang tidak kosong
  if (cart.length === 0) {
    return { eligible: false, reason: "Keranjang masih kosong" };
  }
  return { eligible: true };
}

/**
 * Hitung diskon per-item.
 * Aturan:
 * - Persen: (subtotal * nilai_diskon) / 100
 * - Nominal: nilai_diskon * qty (diterapkan ke seluruh qty item target sesuai aturan project)
 * - Nilai diskon dibatasi maksimal sebesar subtotal item (tidak boleh membuat total negatif).
 *
 * @param {Object} item - { qty, harga_satuan, subtotal }
 * @param {Object} promo - { jenis_diskon: 'persen'|'nominal', nilai_diskon: number }
 * @returns {{ diskon: number, subtotal_setelah_diskon: number }}
 */
export function calculateItemDiscount(item, promo) {
  if (!item || !promo) {
    const subtotal = parseFloat(item?.subtotal || 0);
    return { diskon: 0, subtotal_setelah_diskon: subtotal };
  }

  const qty = parseInt(item.qty || 1, 10);
  const hargaSatuan = parseFloat(item.harga_satuan || 0);
  const subtotal = item.subtotal !== undefined ? parseFloat(item.subtotal) : qty * hargaSatuan;
  const nilaiDiskon = parseFloat(promo.nilai_diskon || 0);

  let diskon = 0;
  if (promo.jenis_diskon === "persen") {
    diskon = (subtotal * nilaiDiskon) / 100;
  } else if (promo.jenis_diskon === "nominal") {
    // Terapkan ke seluruh qty item target (nilai_diskon * qty), dibatasi sebesar subtotal
    diskon = Math.min(nilaiDiskon * qty, subtotal);
  }

  // Batasi diskon antara 0 s/d subtotal item (tidak boleh membuat total item menjadi negatif)
  diskon = Math.max(0, Math.min(diskon, subtotal));
  const subtotalSetelahDiskon = Math.max(0, subtotal - diskon);

  return {
    diskon,
    subtotal_setelah_diskon: subtotalSetelahDiskon,
  };
}

/**
 * Resolusi konflik promo bertumpuk (1 diskon per item).
 * Jika ada promo baru yang menargetkan item yang sama dengan promo yang sudah ada,
 * promo lama dilepas dan digantikan oleh promo baru (last selected / paling baru dipilih).
 *
 * @param {Array} currentPromos - Daftar promo yang saat ini terpilih
 * @param {Object} newPromo - Promo yang baru dicentang/dipilih
 * @returns {{ nextPromos: Array, replacedPromo: Object|null, message?: string }}
 */
export function resolvePromoConflict(currentPromos = [], newPromo) {
  if (!newPromo) return { nextPromos: currentPromos, replacedPromo: null };

  const existingTargetIdx = currentPromos.findIndex((p) => p.kode_item === newPromo.kode_item);

  if (existingTargetIdx >= 0) {
    const replacedPromo = currentPromos[existingTargetIdx];
    const nextPromos = [...currentPromos];
    nextPromos[existingTargetIdx] = newPromo;
    return {
      nextPromos,
      replacedPromo,
      message: `Promo "${replacedPromo.nama_promo}" digantikan oleh "${newPromo.nama_promo}" untuk ${newPromo.nama_item || "item tersebut"} (hanya 1 promo per item)`,
    };
  }

  return {
    nextPromos: [...currentPromos, newPromo],
    replacedPromo: null,
  };
}

/**
 * Filter promo terpilih agar hanya mempertahankan promo yang item targetnya masih ada di cart.
 * Mengembalikan promo valid dan daftar promo yang terlepas otomatis.
 *
 * @param {Array} cart - Item di keranjang
 * @param {Array} selectedPromos - Promo yang sedang dipilih
 * @returns {{ validPromos: Array, droppedPromos: Array }}
 */
export function filterValidPromosForCart(cart = [], selectedPromos = []) {
  const validPromos = [];
  const droppedPromos = [];

  const cartItemKodes = new Set(cart.map((c) => c.kode));

  for (const promo of selectedPromos) {
    if (promo.kode_item) {
      if (cartItemKodes.has(promo.kode_item)) {
        validPromos.push(promo);
      } else {
        droppedPromos.push(promo);
      }
    } else {
      // Global promo
      if (cart.length > 0) validPromos.push(promo);
      else droppedPromos.push(promo);
    }
  }

  return { validPromos, droppedPromos };
}

/**
 * Hitung seluruh kalkulasi diskon transaksi secara deterministik.
 * Memastikan total diskon di struk = total diskon di layar kasir,
 * dan per-item breakdown tersusun rapi.
 *
 * @param {Array} cart - Daftar item keranjang
 * @param {Array} selectedPromos - Daftar promo yang terpilih
 * @returns {Object} Hasil kalkulasi { totalHarga, totalDiskon, totalBayar, itemDiscounts, promoBreakdown, mappedItems }
 */
export function calculateTransactionDiscounts(cart = [], selectedPromos = []) {
  let totalHarga = 0;
  cart.forEach((c) => {
    const qty = parseInt(c.qty || 1, 10);
    const hargaSatuan = parseFloat(c.harga_satuan || 0);
    totalHarga += c.subtotal !== undefined ? parseFloat(c.subtotal) : qty * hargaSatuan;
  });

  // Pastikan hanya 1 promo per kode_item (ambil yang terakhir dipilih)
  const promoMapByItem = new Map();
  for (const promo of selectedPromos) {
    if (promo.kode_item) {
      promoMapByItem.set(promo.kode_item, promo);
    }
  }

  let totalDiskon = 0;
  const itemDiscounts = {};
  const breakdownMap = {};

  const mappedItems = cart.map((item) => {
    const qty = parseInt(item.qty || 1, 10);
    const hargaSatuan = parseFloat(item.harga_satuan || 0);
    const subtotal = item.subtotal !== undefined ? parseFloat(item.subtotal) : qty * hargaSatuan;

    const promo = promoMapByItem.get(item.kode) || null;

    if (promo) {
      const calc = calculateItemDiscount(item, promo);
      const diskonItem = calc.diskon;
      const subtotalSetelah = calc.subtotal_setelah_diskon;
      totalDiskon += diskonItem;

      itemDiscounts[item.kode] = {
        diskon: diskonItem,
        subtotal_setelah_diskon: subtotalSetelah,
        promo,
      };

      const breakdownKey = promo.kode_detail_promo || `${promo.kode_promo}_${promo.kode_item}`;
      if (!breakdownMap[breakdownKey]) {
        breakdownMap[breakdownKey] = {
          kode_promo: promo.kode_promo,
          nama_promo: promo.nama_promo,
          nama_item: promo.nama_item || item.nama,
          diskon: 0,
        };
      }
      breakdownMap[breakdownKey].diskon += diskonItem;

      return {
        ...item,
        qty,
        harga_satuan: hargaSatuan,
        subtotal,
        kode_promo: promo.kode_promo,
        nama_promo: promo.nama_promo,
        jenis_diskon: promo.jenis_diskon,
        nilai_diskon: promo.nilai_diskon,
        diskon: diskonItem,
        subtotal_setelah_diskon: subtotalSetelah,
      };
    }

    // Jika item tidak mendapat diskon dari promo aktif kasir
    // Tetapi memiliki snapshot diskon sebelumnya (misal saat reload transaksi lunas):
    const existingDiskon = parseFloat(item.diskon || 0);
    if (existingDiskon > 0) {
      totalDiskon += existingDiskon;
      return {
        ...item,
        qty,
        harga_satuan: hargaSatuan,
        subtotal,
        diskon: existingDiskon,
        subtotal_setelah_diskon: item.subtotal_setelah_diskon !== undefined ? parseFloat(item.subtotal_setelah_diskon) : Math.max(0, subtotal - existingDiskon),
      };
    }

    return {
      ...item,
      qty,
      harga_satuan: hargaSatuan,
      subtotal,
      kode_promo: null,
      nama_promo: null,
      jenis_diskon: null,
      nilai_diskon: null,
      diskon: 0,
      subtotal_setelah_diskon: subtotal,
    };
  });

  // Cap total diskon maksimal totalHarga
  totalDiskon = Math.min(totalDiskon, totalHarga);
  const totalBayar = Math.max(0, totalHarga - totalDiskon);

  return {
    totalHarga,
    totalDiskon,
    totalBayar,
    itemDiscounts,
    mappedItems,
    promoBreakdown: Object.values(breakdownMap),
  };
}
