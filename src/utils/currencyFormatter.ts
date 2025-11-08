import { getCurrencyConfig } from './currencyConfig';

export const formatCurrency = (amount: number | string, currency: string = 'QAR'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    const config = getCurrencyConfig(currency);
    return `0.${'0'.repeat(config.fractionDigits)} ${currency}`;
  }

  const config = getCurrencyConfig(currency);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
  }).format(numAmount);
};

export const parseCurrency = (formattedAmount: string): number => {
  // Remove currency symbol and spaces, then parse
  const cleanAmount = formattedAmount.replace(/[^\d.-]/g, '');
  return parseFloat(cleanAmount) || 0;
};