import { useMemo } from "react";
import { useCompanyCurrency } from "./useCompanyCurrency";
import { formatNumberWithPreferences, getNumberPreferences, convertToArabicDigits } from "@/utils/numberFormatter";

interface FormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  currency?: string; // override currency if needed (e.g., invoice-specific)
  locale?: string;   // override locale if needed
}

export const useCurrencyFormatter = () => {
  const { currency, locale } = useCompanyCurrency();

  const formatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }, [currency, locale]);

  const formatCurrency = (amount: number, opts?: FormatOptions) => {
    let formatted: string;
    
    if (opts) {
      const custom = new Intl.NumberFormat(opts.locale || locale, {
        style: "currency",
        currency: opts.currency || currency,
        minimumFractionDigits: opts.minimumFractionDigits ?? 3,
        maximumFractionDigits: opts.maximumFractionDigits ?? opts.minimumFractionDigits ?? 3,
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
