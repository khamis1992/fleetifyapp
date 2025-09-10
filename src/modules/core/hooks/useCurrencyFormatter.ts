import { useMemo } from 'react';

export function useCurrencyFormatter(currency: string = 'SAR', locale: string = 'ar-SA') {
  const formatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }, [currency, locale]);

  const formatCurrency = (amount: number): string => {
    return formatter.format(amount);
  };

  const formatCompactCurrency = (amount: number): string => {
    const compactFormatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return compactFormatter.format(amount);
  };

  return {
    formatCurrency,
    formatCompactCurrency,
  };
}