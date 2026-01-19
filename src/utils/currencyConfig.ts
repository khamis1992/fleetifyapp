export interface CurrencyConfig {
  fractionDigits: number;
  symbol: string;
  showSymbolFirst?: boolean;
  locale: string;
}

export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  KWD: { 
    fractionDigits: 3, 
    symbol: 'د.ك',
    locale: 'ar-KW'
  },
  QAR: { 
    fractionDigits: 2, 
    symbol: 'ر.ق',
    locale: 'en-US'
  },
  SAR: { 
    fractionDigits: 2, 
    symbol: 'ر.س',
    locale: 'en-US'
  },
  AED: { 
    fractionDigits: 2, 
    symbol: 'د.إ',
    locale: 'ar-AE'
  },
  OMR: { 
    fractionDigits: 3, 
    symbol: 'ر.ع',
    locale: 'ar-OM'
  },
  BHD: { 
    fractionDigits: 3, 
    symbol: 'د.ب',
    locale: 'ar-BH'
  },
  USD: { 
    fractionDigits: 2, 
    symbol: '$',
    locale: 'en-US'
  },
  EUR: { 
    fractionDigits: 2, 
    symbol: '€',
    locale: 'de-DE'
  },
};

export const getCurrencyConfig = (currency: string): CurrencyConfig => {
  return CURRENCY_CONFIGS[currency.toUpperCase()] || CURRENCY_CONFIGS.QAR;
};

export const getCurrencyFractionDigits = (currency: string): number => {
  return getCurrencyConfig(currency).fractionDigits;
};