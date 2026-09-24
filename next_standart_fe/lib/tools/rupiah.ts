/**
 * Currency Formatter Utility
 */
export const formatRupiah = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return 'Rp 0';
  }
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export default formatRupiah;
