/**
 * @project Sistem Klinik Kecantikan
 * @file diskonKasir.ts
 * @description Helper murni untuk eligibility, perhitungan, dan resolusi konflik voucher/promo diskon kasir.
 * Terpisah dari UI sehingga mudah diuji (unit test) dan konsisten antara layar kasir dan struk.
 */

export interface CartItem {
  jenis: 'layanan' | 'produk' | string;
  kode: string;
  nama: string;
  nama_kategori?: string;
  satuan?: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
  is_promo?: boolean;
  kode_promo_item?: string;
  is_from_pendaftaran?: boolean;
  // Snapshot promo per-item
  kode_promo?: string | null;
  nama_promo?: string | null;
  jenis_diskon?: 'persen' | 'nominal' | null;
  nilai_diskon?: number | null;
  diskon?: number | null; // Nominal diskon rupiah untuk item ini
  subtotal_setelah_diskon?: number | null;
}

export interface PromoOption {
  kode_detail_promo: string;
  kode_promo: string;
  nama_promo: string;
  jenis_diskon: 'persen' | 'nominal';
  nilai_diskon: number;
  jenis_item?: 'layanan' | 'paket' | 'produk' | string;
  kode_item: string;
  nama_item: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
}

export interface PromoEligibility {
  eligible: boolean;
  reason?: string;
  targetItem?: CartItem;
}

export interface ItemDiscountResult {
  diskon: number;
  subtotal_setelah_diskon: number;
}

export interface TransactionDiscountSummary {
  totalHarga: number;
  totalDiskon: number;
  totalBayar: number;
  itemDiscounts: Record<string, {
    diskon: number;
    subtotal_setelah_diskon: number;
    promo: PromoOption;
  }>;
  appliedPromos: PromoOption[];
  promoBreakdown: Array<{
    kode_promo: string;
    kode_detail_promo?: string;
    nama_promo: string;
    nama_item: string;
    diskon: number;
  }>;
}

export const formatRupiah = (val: number | string | null | undefined): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);

/**
 * Cek apakah sebuah promo memenuhi syarat (eligible) untuk keranjang saat ini.
 * ATURAN (PENTING):
 * Diskon HANYA bisa dicentang jika item layanan/produk yang menjadi target promo
 * sedang ada di keranjang dengan qty > 0.
 */
export function checkPromoEligibility(promo: PromoOption, cart: CartItem[] = []): PromoEligibility {
  if (!promo) {
    return { eligible: false, reason: 'Promo tidak valid' };
  }

  if (promo.kode_item) {
    const target = cart.find((c) => c.kode === promo.kode_item && (c.qty || 0) > 0);
    if (!target) {
      const namaItem = promo.nama_item || promo.kode_item;
      const jenisItem = promo.jenis_item === 'layanan' ? 'layanan' : 'produk';
      return {
        eligible: false,
        reason: `Tambahkan ${jenisItem} "${namaItem}" ke keranjang untuk memakai promo ini`,
      };
    }
    return { eligible: true, targetItem: target };
  }

  // Promo global (jika tidak ada spesifik kode_item)
  if (cart.length === 0) {
    return { eligible: false, reason: 'Keranjang belanja masih kosong' };
  }
  return { eligible: true };
}

/**
 * Hitung nominal diskon untuk satu item spesifik.
 * ATURAN PERHITUNGAN:
 * - Dihitung berdasarkan item targetnya saja, bukan seluruh subtotal cart.
 * - Persen: (subtotal * nilai_diskon) / 100
 * - Nominal: nilai_diskon * qty (diterapkan ke seluruh qty item target)
 * - Nilai diskon TIDAK BOLEH membuat total item menjadi negatif (maksimal = subtotal).
 */
export function calculateItemDiscount(item: CartItem, promo: PromoOption): ItemDiscountResult {
  const qty = item.qty || 1;
  const hargaSatuan = item.harga_satuan || 0;
  const subtotal = item.subtotal !== undefined ? item.subtotal : qty * hargaSatuan;
  const nilaiDiskon = promo.nilai_diskon || 0;

  let diskon = 0;
  if (promo.jenis_diskon === 'persen') {
    diskon = (subtotal * nilaiDiskon) / 100;
  } else if (promo.jenis_diskon === 'nominal') {
    // Sesuai aturan: terapkan ke seluruh qty item target (nilai_diskon * qty), dibatasi sebesar subtotal
    diskon = Math.min(nilaiDiskon * qty, subtotal);
  }

  // Jaga agar diskon tidak negatif dan tidak melebihi subtotal item
  diskon = Math.max(0, Math.min(diskon, subtotal));
  const subtotalSetelahDiskon = Math.max(0, subtotal - diskon);

  return {
    diskon,
    subtotal_setelah_diskon: subtotalSetelahDiskon,
  };
}

/**
 * Aturan tumpang tindih (Conflict Resolution):
 * Default aman: 1 diskon per item target (kode_item).
 * Jika memilih promo baru yang menargetkan item yang sama dengan promo yang sudah aktif,
 * promo lama otomatis digantikan oleh promo baru (last selected), dan kembalikan pesan jelas.
 */
export function resolvePromoConflict(
  currentPromos: PromoOption[] = [],
  newPromo: PromoOption
): { nextPromos: PromoOption[]; replacedPromo: PromoOption | null; message?: string } {
  if (!newPromo) return { nextPromos: currentPromos, replacedPromo: null };

  const existingTargetIdx = currentPromos.findIndex((p) => p.kode_item === newPromo.kode_item);

  if (existingTargetIdx >= 0) {
    const replaced = currentPromos[existingTargetIdx];
    // Jika promo yang sama diklik ulang, biarkan caller menangani uncheck
    if (replaced.kode_detail_promo === newPromo.kode_detail_promo) {
      return { nextPromos: currentPromos, replacedPromo: null };
    }
    const next = [...currentPromos];
    next[existingTargetIdx] = newPromo;
    return {
      nextPromos: next,
      replacedPromo: replaced,
      message: `Promo "${replaced.nama_promo}" digantikan oleh "${newPromo.nama_promo}" untuk ${newPromo.nama_item || 'item ini'} (1 diskon per item)`,
    };
  }

  return {
    nextPromos: [...currentPromos, newPromo],
    replacedPromo: null,
  };
}

/**
 * Lepas promo otomatis jika item targetnya dihapus dari keranjang.
 * Mengembalikan promo yang tetap valid dan daftar promo yang terlepas.
 */
export function filterValidPromosForCart(
  cart: CartItem[] = [],
  selectedPromos: PromoOption[] = []
): { validPromos: PromoOption[]; droppedPromos: PromoOption[] } {
  const validPromos: PromoOption[] = [];
  const droppedPromos: PromoOption[] = [];

  const cartItemKodes = new Set(cart.map((c) => c.kode));

  for (const promo of selectedPromos) {
    if (promo.kode_item) {
      if (cartItemKodes.has(promo.kode_item)) {
        validPromos.push(promo);
      } else {
        droppedPromos.push(promo);
      }
    } else {
      if (cart.length > 0) validPromos.push(promo);
      else droppedPromos.push(promo);
    }
  }

  return { validPromos, droppedPromos };
}

/**
 * Hitung kalkulasi diskon keseluruhan transaksi secara reaktif dan deterministik.
 * Memastikan total diskon di struk = total diskon di layar kasir.
 */
export function calculateTransactionDiscounts(
  cart: CartItem[] = [],
  selectedPromos: PromoOption[] = []
): TransactionDiscountSummary {
  const totalHarga = cart.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  // Filter promo agar hanya yang targetnya ada di keranjang
  const { validPromos } = filterValidPromosForCart(cart, selectedPromos);

  // Pastikan hanya 1 promo per target item (ambil yang terakhir dipilih)
  const promoMapByItem = new Map<string, PromoOption>();
  for (const promo of validPromos) {
    if (promo.kode_item) {
      promoMapByItem.set(promo.kode_item, promo);
    }
  }

  let totalDiskon = 0;
  const itemDiscounts: TransactionDiscountSummary['itemDiscounts'] = {};
  const breakdownMap: Record<string, { kode_promo: string; kode_detail_promo?: string; nama_promo: string; nama_item: string; diskon: number }> = {};

  for (const item of cart) {
    const promo = promoMapByItem.get(item.kode);
    if (promo) {
      const calc = calculateItemDiscount(item, promo);
      totalDiskon += calc.diskon;

      itemDiscounts[item.kode] = {
        diskon: calc.diskon,
        subtotal_setelah_diskon: calc.subtotal_setelah_diskon,
        promo,
      };

      const breakdownKey = promo.kode_detail_promo || `${promo.kode_promo}_${promo.kode_item}`;
      if (!breakdownMap[breakdownKey]) {
        breakdownMap[breakdownKey] = {
          kode_promo: promo.kode_promo,
          kode_detail_promo: promo.kode_detail_promo,
          nama_promo: promo.nama_promo,
          nama_item: promo.nama_item || item.nama,
          diskon: 0,
        };
      }
      breakdownMap[breakdownKey].diskon += calc.diskon;
    } else if (item.diskon && item.diskon > 0) {
      // Pertahankan diskon snapshot jika item sudah memiliki diskon tersimpan (misal struk / reload)
      totalDiskon += item.diskon;
    }
  }

  // Batasi total diskon maksimal seharga total belanja
  totalDiskon = Math.min(totalDiskon, totalHarga);
  const totalBayar = Math.max(0, totalHarga - totalDiskon);

  return {
    totalHarga,
    totalDiskon,
    totalBayar,
    itemDiscounts,
    appliedPromos: Array.from(promoMapByItem.values()),
    promoBreakdown: Object.values(breakdownMap),
  };
}
