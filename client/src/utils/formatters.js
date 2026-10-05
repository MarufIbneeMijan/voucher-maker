/**
 * Global Currency & Number Formatters
 * Strict English numerals with comma separation and 2 decimal places.
 */

export const formatCurrency = (amount) => {
  const val = Number(amount) || 0;
  return '৳ ' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatSAR = (amount) => {
  const val = Number(amount) || 0;
  return 'SAR ' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatNumber = (amount) => {
  const val = Number(amount) || 0;
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
