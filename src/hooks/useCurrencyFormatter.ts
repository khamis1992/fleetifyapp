import { useMemo } from "react";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { getNumberPreferences } from "@/utils/numberFormatter";
import { getCurrencyConfig } from "@/utils/currencyConfig";

interface FormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  currency?: string;
  locale?: string;
}

export const useCurrencyFormatter = () => {
  const { currency, locale } = useCompanyCurrency();
  const fractionDigits = getCurrencyConfig(currency).fractionDigits;
  const numberingSystem = getNumberPreferences().useArabicDigits ? 'arab' : 'latn';
  const formatter = useMemo(() => new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    numberingSystem,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }), [currency, locale, fractionDigits, numberingSystem]);

  const formatCurrency = (amount: number, opts?: FormatOptions) => {
    if (!opts) return formatter.format(amount);
    const targetCurrency = opts.currency || currency;
    const defaultDigits = getCurrencyConfig(targetCurrency).fractionDigits;
    return new Intl.NumberFormat(opts.locale || locale, {
      style: "currency",
      currency: targetCurrency,
      numberingSystem,
      minimumFractionDigits: opts.minimumFractionDigits ?? defaultDigits,
      maximumFractionDigits: opts.maximumFractionDigits ?? opts.minimumFractionDigits ?? defaultDigits,
    }).format(amount);
  };
  return { formatCurrency, currency, locale };
};
