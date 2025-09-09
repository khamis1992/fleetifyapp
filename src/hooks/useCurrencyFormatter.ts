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
      
      const custom = new Intl.NumberFormat(opts.locale || locale, {
        style: "currency",
        currency: targetCurrency,
        minimumFractionDigits: opts.minimumFractionDigits ?? defaultFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits ?? opts.minimumFractionDigits ?? defaultFractionDigits,
      });
      formatted = custom.format(amount);
    } else {
      formatted = formatter.format(amount);
    }

    // تطبيق تفضيلات الأرقام الموحدة
    const preferences = getNumberPreferences();
    if (preferences.useArabicDigits) {
      formatted = convertToArabicDigits(formatted);
    }
    
    return formatted;
  };
  return { formatCurrency, currency, locale };
};
