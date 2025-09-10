import { useMemo } from "react";
import { useCompanyCurrency } from "./useCompanyCurrency";
import { formatNumberWithPreferences, getNumberPreferences, convertToArabicDigits } from "@/utils/numberFormatter";
import { getCurrencyConfig } from "@/utils/currencyConfig";

interface FormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  currency?: string; // override currency if needed (e.g., invoice-specific)
  locale?: string;   // override locale if needed
}

export const useCurrencyFormatter = () => {
  const { currency, locale } = useCompanyCurrency();
  const currencyConfig = getCurrencyConfig(currency);

  const formatter = useMemo(() => {
    const fractionDigits = currencyConfig.fractionDigits;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }, [currency, locale, currencyConfig.fractionDigits]);

  const formatCurrency = (amount: number, opts?: FormatOptions) => {
    let formatted: string;
    
    if (opts) {
      const targetCurrency = opts.currency || currency;
      const targetConfig = getCurrencyConfig(targetCurrency);
      const defaultFractionDigits = targetConfig.fractionDigits;
      
      const custom = new Intl.NumberFormat('en-US', { // Force English locale
        style: "currency",
        currency: targetCurrency,
        minimumFractionDigits: opts.minimumFractionDigits ?? defaultFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits ?? opts.minimumFractionDigits ?? defaultFractionDigits,
      });
      formatted = custom.format(amount);
    } else {
      // Use English locale with correct fraction digits for the currency
      const config = getCurrencyConfig(currency);
      const englishFormatter = new Intl.NumberFormat('en-US', {
        style: "currency",
        currency,
        minimumFractionDigits: config.fractionDigits,
        maximumFractionDigits: config.fractionDigits,
      });
      formatted = englishFormatter.format(amount);
    }

    // Always use English digits - no Arabic conversion
    return formatted;
  };
  return { formatCurrency, currency, locale };
};
