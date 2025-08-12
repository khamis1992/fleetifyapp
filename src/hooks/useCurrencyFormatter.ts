import { useMemo } from "react";
import { useCompanyCurrency } from "./useCompanyCurrency";

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
    if (opts) {
      const custom = new Intl.NumberFormat(opts.locale || locale, {
        style: "currency",
        currency: opts.currency || currency,
        minimumFractionDigits: opts.minimumFractionDigits ?? 3,
        maximumFractionDigits: opts.maximumFractionDigits ?? opts.minimumFractionDigits ?? 3,
      });
      return custom.format(amount);
    }
    return formatter.format(amount);
  };
  return { formatCurrency, currency, locale };
};
