import { useMemo } from "react";
import { useCompanyCurrency } from "./useCompanyCurrency";
import { getCurrencyConfig } from "@/utils/currencyConfig";
import { formatNumberWithPreferences, convertToArabicDigits, getNumberPreferences } from "@/utils/numberFormatter";

export const useDynamicCurrencyFormat = () => {
  const { currency, locale } = useCompanyCurrency();
  const currencyConfig = getCurrencyConfig(currency);

  const formatAmount = useMemo(() => {
    return (amount: number, options?: {
      overrideFractionDigits?: number;
      forceLocale?: string;
      forceCurrency?: string;
    }) => {
      const targetCurrency = options?.forceCurrency || currency;
      const targetConfig = getCurrencyConfig(targetCurrency);
      const targetLocale = options?.forceLocale || locale;
      const fractionDigits = options?.overrideFractionDigits ?? targetConfig.fractionDigits;

      const formatter = new Intl.NumberFormat(targetLocale, {
        style: "currency",
        currency: targetCurrency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });

      let formatted = formatter.format(amount);

      // Apply number preferences for Arabic digits
      const preferences = getNumberPreferences();
      if (preferences.useArabicDigits) {
        formatted = convertToArabicDigits(formatted);
      }

      return formatted;
    };
  }, [currency, locale, currencyConfig]);

  const formatSimpleNumber = useMemo(() => {
    return (amount: number, fractionDigits?: number) => {
      const digits = fractionDigits ?? currencyConfig.fractionDigits;
      
      const formatted = amount.toLocaleString(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

      // Apply number preferences
      const preferences = getNumberPreferences();
      if (preferences.useArabicDigits) {
        return convertToArabicDigits(formatted);
      }

      return formatted;
    };
  }, [locale, currencyConfig.fractionDigits]);

  return {
    formatAmount,
    formatSimpleNumber,
    currencyConfig,
    currency,
    locale,
    defaultFractionDigits: currencyConfig.fractionDigits,
  };
};