/**
 * Locale Configurations
 *
 * Comprehensive locale-specific configurations for FleetifyApp
 * including cultural adaptations, business rules, and formatting.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

export interface LocaleConfig {
  // Basic locale information
  direction: 'ltr' | 'rtl';
  locale: string;
  name: string;
  nativeName: string;

  // Date and time formatting
  date: {
    locale: string;
    format: 'mdy' | 'dmy' | 'ymd';
    separator: '/' | '-' | '.';
    firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
  };

  time: {
    locale: string;
    use12Hour: boolean;
    separator: ':' | '.';
  };

  // Number and currency formatting
  number: {
    locale: string;
    decimal: ',' | '.';
    thousands: ',' | '.' | ' ' | '';
  };

  currency: {
    code: string;
    symbol: string;
    locale: string;
    decimals: number;
    symbolPosition: 'before' | 'after';
  };

  // Cultural adaptations
  business: {
    workingDays: number[]; // 0-6, 0 = Sunday
    weekendDays: number[];
    workingHours: { start: string; end: string };
    dateFormat: string; // For date pickers
    timeFormat: string; // For time inputs
  };

  // Address formatting
  address: {
    format: string; // Order of address components
    postalCodeBefore: boolean;
    postalCodeLabel: string;
  };

  // Phone number formatting
  phone: {
    format: string;
    countryCode: string;
    validation: RegExp;
  };

  // Font and typography
  fontClass?: string;
  fontFamily?: string;

  // Icon mirroring
  iconMirroring: boolean;
  mirroredIcons: string[]; // Icon names that should be mirrored

  // Legal and compliance
  legal: {
    dateFormat: string; // For legal documents
    currencyFormat: string;
    numberWords: boolean; // Whether to write out numbers in words
    languageCode: string; // ISO 639-1 code
  };
}

// Comprehensive locale configurations
export const localeConfigs: Record<string, LocaleConfig> = {
  en: {
    direction: 'ltr',
    locale: 'en-US',
    name: 'English',
    nativeName: 'English',

    date: {
      locale: 'en-US',
      format: 'mdy',
      separator: '/',
      firstDayOfWeek: 0
    },

    time: {
      locale: 'en-US',
      use12Hour: true,
      separator: ':'
    },

    number: {
      locale: 'en-US',
      decimal: '.',
      thousands: ','
    },

    currency: {
      code: 'USD',
      symbol: '$',
      locale: 'en-US',
      decimals: 2,
      symbolPosition: 'before'
    },

    business: {
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      weekendDays: [0, 6], // Sunday, Saturday
      workingHours: { start: '09:00', end: '17:00' },
      dateFormat: 'MM/DD/YYYY',
      timeFormat: 'h:mm A'
    },

    address: {
      format: '{street}, {city}, {state} {postalCode}',
      postalCodeBefore: false,
      postalCodeLabel: 'ZIP Code'
    },

    phone: {
      format: '+1 (XXX) XXX-XXXX',
      countryCode: '+1',
      validation: /^\+1[\s\-]?(\(\d{3}\)|\d{3})[\s\-]?\d{3}[\s\-]?\d{4}$/
    },

    fontClass: 'font-en',
    fontFamily: 'Inter, system-ui, sans-serif',

    iconMirroring: false,
    mirroredIcons: [],

    legal: {
      dateFormat: 'MM/DD/YYYY',
      currencyFormat: '${amount}',
      numberWords: false,
      languageCode: 'en'
    }
  },

  ar: {
    direction: 'rtl',
    locale: 'ar-QA',
    name: 'Arabic',
    nativeName: 'العربية',

    date: {
      locale: 'ar-QA',
      format: 'dmy',
      separator: '/',
      firstDayOfWeek: 6 // Saturday
    },

    time: {
      locale: 'ar-QA',
      use12Hour: true,
      separator: ':'
    },

    number: {
      locale: 'ar-QA',
      decimal: '.',
      thousands: ','
    },

    currency: {
      code: 'QAR',
      symbol: 'ر.ق',
      locale: 'ar-QA',
      decimals: 2,
      symbolPosition: 'before'
    },

    business: {
      workingDays: [0, 1, 2, 3, 4], // Sunday to Thursday
      weekendDays: [5, 6], // Friday, Saturday
      workingHours: { start: '07:00', end: '15:00' },
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'h:mm A'
    },

    address: {
      format: '{postalCode} {city}, {street}',
      postalCodeBefore: true,
      postalCodeLabel: 'الرمز البريدي'
    },

    phone: {
      format: '+974 XXXX XXXX',
      countryCode: '+974',
      validation: /^\+974[\s]?[3-9]\d{3}[\s]?\d{4}$/
    },

    fontClass: 'font-ar',
    fontFamily: 'Noto Sans Arabic, system-ui, sans-serif',

    iconMirroring: true,
    mirroredIcons: [
      'arrow-left', 'arrow-right', 'chevron-left', 'chevron-right',
      'arrow-back', 'arrow-forward', 'skip-back', 'skip-forward',
      'fast-forward', 'rewind', 'step-forward', 'step-back',
      'angle-left', 'angle-right', 'angle-double-left', 'angle-double-right'
    ],

    legal: {
      dateFormat: 'DD/MM/YYYY',
      currencyFormat: '{amount} ر.ق',
      numberWords: true, // Islamic finance requires numbers written in words
      languageCode: 'ar'
    }
  },

  fr: {
    direction: 'ltr',
    locale: 'fr-FR',
    name: 'French',
    nativeName: 'Français',

    date: {
      locale: 'fr-FR',
      format: 'dmy',
      separator: '/',
      firstDayOfWeek: 1 // Monday
    },

    time: {
      locale: 'fr-FR',
      use12Hour: false,
      separator: ':'
    },

    number: {
      locale: 'fr-FR',
      decimal: ',',
      thousands: ' '
    },

    currency: {
      code: 'EUR',
      symbol: '€',
      locale: 'fr-FR',
      decimals: 2,
      symbolPosition: 'after'
    },

    business: {
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      weekendDays: [0, 6], // Sunday, Saturday
      workingHours: { start: '09:00', end: '18:00' },
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm'
    },

    address: {
      format: '{street}, {postalCode} {city}',
      postalCodeBefore: true,
      postalCodeLabel: 'Code Postal'
    },

    phone: {
      format: '+33 X XX XX XX XX',
      countryCode: '+33',
      validation: /^\+33[\s]?[1-9][\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}$/
    },

    fontClass: 'font-fr',
    fontFamily: 'Inter, system-ui, sans-serif',

    iconMirroring: false,
    mirroredIcons: [],

    legal: {
      dateFormat: 'DD/MM/YYYY',
      currencyFormat: '{amount} €',
      numberWords: false,
      languageCode: 'fr'
    }
  },

  es: {
    direction: 'ltr',
    locale: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',

    date: {
      locale: 'es-ES',
      format: 'dmy',
      separator: '/',
      firstDayOfWeek: 1 // Monday
    },

    time: {
      locale: 'es-ES',
      use12Hour: false,
      separator: ':'
    },

    number: {
      locale: 'es-ES',
      decimal: ',',
      thousands: '.'
    },

    currency: {
      code: 'EUR',
      symbol: '€',
      locale: 'es-ES',
      decimals: 2,
      symbolPosition: 'after'
    },

    business: {
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      weekendDays: [0, 6], // Sunday, Saturday
      workingHours: { start: '09:00', end: '18:00' },
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm'
    },

    address: {
      format: '{street}, {postalCode} {city}',
      postalCodeBefore: true,
      postalCodeLabel: 'Código Postal'
    },

    phone: {
      format: '+34 XXX XXX XXX',
      countryCode: '+34',
      validation: /^\+34[\s]?[6-9]\d{2}[\s]?\d{3}[\s]?\d{3}$/
    },

    fontClass: 'font-es',
    fontFamily: 'Inter, system-ui, sans-serif',

    iconMirroring: false,
    mirroredIcons: [],

    legal: {
      dateFormat: 'DD/MM/YYYY',
      currencyFormat: '{amount} €',
      numberWords: false,
      languageCode: 'es'
    }
  },

  de: {
    direction: 'ltr',
    locale: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',

    date: {
      locale: 'de-DE',
      format: 'dmy',
      separator: '.',
      firstDayOfWeek: 1 // Monday
    },

    time: {
      locale: 'de-DE',
      use12Hour: false,
      separator: ':'
    },

    number: {
      locale: 'de-DE',
      decimal: ',',
      thousands: '.'
    },

    currency: {
      code: 'EUR',
      symbol: '€',
      locale: 'de-DE',
      decimals: 2,
      symbolPosition: 'after'
    },

    business: {
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      weekendDays: [0, 6], // Sunday, Saturday
      workingHours: { start: '09:00', end: '17:00' },
      dateFormat: 'DD.MM.YYYY',
      timeFormat: 'HH:mm'
    },

    address: {
      format: '{street}, {postalCode} {city}',
      postalCodeBefore: true,
      postalCodeLabel: 'PLZ'
    },

    phone: {
      format: '+49 XXX XXXXXXX',
      countryCode: '+49',
      validation: /^\+49[\s]?[1-9]\d{1,4}[\s]?\d{3,8}$/
    },

    fontClass: 'font-de',
    fontFamily: 'Inter, system-ui, sans-serif',

    iconMirroring: false,
    mirroredIcons: [],

    legal: {
      dateFormat: 'DD.MM.YYYY',
      currencyFormat: '{amount} €',
      numberWords: false,
      languageCode: 'de'
    }
  },

  zh: {
    direction: 'ltr',
    locale: 'zh-CN',
    name: 'Chinese',
    nativeName: '中文',

    date: {
      locale: 'zh-CN',
      format: 'ymd',
      separator: '-',
      firstDayOfWeek: 1 // Monday
    },

    time: {
      locale: 'zh-CN',
      use12Hour: false,
      separator: ':'
    },

    number: {
      locale: 'zh-CN',
      decimal: '.',
      thousands: ','
    },

    currency: {
      code: 'CNY',
      symbol: '¥',
      locale: 'zh-CN',
      decimals: 2,
      symbolPosition: 'before'
    },

    business: {
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      weekendDays: [0, 6], // Sunday, Saturday
      workingHours: { start: '09:00', end: '18:00' },
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm'
    },

    address: {
      format: '{postalCode} {city} {street}',
      postalCodeBefore: true,
      postalCodeLabel: '邮编'
    },

    phone: {
      format: '+86 XXX XXXX XXXX',
      countryCode: '+86',
      validation: /^\+86[\s]?1[3-9]\d{1}[\s]?\d{4}[\s]?\d{4}$/
    },

    fontClass: 'font-zh',
    fontFamily: 'Noto Sans SC, system-ui, sans-serif',

    iconMirroring: false,
    mirroredIcons: [],

    legal: {
      dateFormat: 'YYYY年MM月DD日',
      currencyFormat: '¥{amount}',
      numberWords: true, // Chinese legal documents often use formal number characters
      languageCode: 'zh'
    }
  },

  hi: {
    direction: 'ltr',
    locale: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',

    date: {
      locale: 'hi-IN',
      format: 'dmy',
      separator: '/',
      firstDayOfWeek: 0 // Sunday (traditional) or 1 (business)
    },

    time: {
      locale: 'hi-IN',
      use12Hour: true,
      separator: ':'
    },

    number: {
      locale: 'hi-IN',
      decimal: '.',
      thousands: ','
    },

    currency: {
      code: 'INR',
      symbol: '₹',
      locale: 'hi-IN',
      decimals: 2,
      symbolPosition: 'before'
    },

    business: {
      workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      weekendDays: [0], // Sunday only
      workingHours: { start: '10:00', end: '19:00' },
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'h:mm A'
    },

    address: {
      format: '{street}, {city} - {postalCode}',
      postalCodeBefore: false,
      postalCodeLabel: 'पिन कोड'
    },

    phone: {
      format: '+91 XXXXX XXXXX',
      countryCode: '+91',
      validation: /^\+91[\s]?[6-9]\d{4}[\s]?\d{5}$/
    },

    fontClass: 'font-hi',
    fontFamily: 'Noto Sans Devanagari, system-ui, sans-serif',

    iconMirroring: false,
    mirroredIcons: [],

    legal: {
      dateFormat: 'DD/MM/YYYY',
      currencyFormat: '₹{amount}',
      numberWords: true, // Indian legal documents often write amounts in words
      languageCode: 'hi'
    }
  },

  ja: {
    direction: 'ltr',
    locale: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',

    date: {
      locale: 'ja-JP',
      format: 'ymd',
      separator: '-',
      firstDayOfWeek: 0 // Sunday
    },

    time: {
      locale: 'ja-JP',
      use12Hour: false,
      separator: ':'
    },

    number: {
      locale: 'ja-JP',
      decimal: '.',
      thousands: ','
    },

    currency: {
      code: 'JPY',
      symbol: '¥',
      locale: 'ja-JP',
      decimals: 0, // Japanese Yen doesn't use decimals
      symbolPosition: 'before'
    },

    business: {
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      weekendDays: [0, 6], // Sunday, Saturday
      workingHours: { start: '09:00', end: '18:00' },
      dateFormat: 'YYYY/MM/DD',
      timeFormat: 'HH:mm'
    },

    address: {
      format: '〒{postalCode} {city}, {street}',
      postalCodeBefore: true,
      postalCodeLabel: '郵便番号'
    },

    phone: {
      format: '+81 XX-XXXX-XXXX',
      countryCode: '+81',
      validation: /^\+81[\s\-]?[0-9]{2}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}$/
    },

    fontClass: 'font-ja',
    fontFamily: 'Noto Sans JP, system-ui, sans-serif',

    iconMirroring: false,
    mirroredIcons: [],

    legal: {
      dateFormat: 'YYYY年MM月DD日',
      currencyFormat: '¥{amount}',
      numberWords: true, // Japanese legal documents use formal number characters
      languageCode: 'ja'
    }
  }
};

export default localeConfigs;