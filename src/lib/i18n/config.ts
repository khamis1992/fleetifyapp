/**
 * Internationalization Configuration
 *
 * Comprehensive i18n setup for FleetifyApp with RTL/LTR support,
 * mixed content handling, and locale-specific business rules.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import { LANGUAGE_STORAGE_KEY, readLanguagePreference, saveLanguagePreference } from './languagePreference';

// Import locale configurations
import { localeConfigs } from './locales';

// Ship the official language with the app so every namespace is available on first render.
const arabicFiles = import.meta.glob<Record<string, unknown>>('../../../public/locales/ar/*.json', {
  eager: true,
  import: 'default',
});
const arabicResources = Object.fromEntries(Object.entries(arabicFiles).map(([path, resource]) => [
  path.slice(path.lastIndexOf('/') + 1, -5), resource,
]));

// Translation namespaces
export const TRANSLATION_NAMESPACES = {
  COMMON: 'common',
  NAVIGATION: 'navigation',
  FLEET: 'fleet',
  CONTRACTS: 'contracts',
  CUSTOMERS: 'customers',
  FINANCIAL: 'financial',
  LEGAL: 'legal',
  HR: 'hr',
  INVENTORY: 'inventory',
  SALES: 'sales',
  REPORTS: 'reports',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  ERRORS: 'errors',
  VALIDATION: 'validation',
  BUSINESS_RULES: 'businessRules',
  UI: 'ui'
} as const;

// Supported languages with their configurations
export const SUPPORTED_LANGUAGES = {
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
    config: localeConfigs.en
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇶🇦',
    dir: 'rtl',
    config: localeConfigs.ar
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    config: localeConfigs.fr
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    config: localeConfigs.es
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
    config: localeConfigs.de
  },
  zh: {
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    dir: 'ltr',
    config: localeConfigs.zh
  },
  hi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    dir: 'ltr',
    config: localeConfigs.hi
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
    config: localeConfigs.ja
  }
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Default language configuration
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ar';
export const FALLBACK_LANGUAGE: SupportedLanguage = 'ar';

// i18n initialization
export const initializeI18n = async (): Promise<void> => {
  // Check if i18n is already initialized
  if (i18n.isInitialized) {
    return;
  }

  // Arabic is official. Only a deliberate language choice overrides it.
  let initialLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
  try {
    initialLanguage = readLanguagePreference(localStorage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
  } catch { /* Arabic remains available when browser storage is blocked. */ }
  applyLocaleConfig(initialLanguage);

  await i18n
    .use(Backend)
    .use(initReactI18next)
    .init({
      lng: initialLanguage,
      fallbackLng: FALLBACK_LANGUAGE,
      // Only declare supported languages that have translation files
      supportedLngs: ['en', 'ar'],
      debug: import.meta.env.DEV,

      // Namespace configuration
      defaultNS: TRANSLATION_NAMESPACES.COMMON,
      ns: Object.values(TRANSLATION_NAMESPACES),

      // Backend configuration
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
        addPath: '/locales/{{lng}}/{{ns}}.json'
      },

      // Interpolation
      interpolation: {
        escapeValue: false, // React already escapes
        // Legacy format function removed — use formatCurrency/formatNumber/formatDate directly
        // See: https://www.i18next.com/translation-function/formatting
      },

      // React configuration
      react: {
        useSuspense: false,
        bindI18n: 'languageChanged',
        bindI18nStore: 'added removed'
      },

      // Plural rules
      pluralSeparator: '_',
      contextSeparator: '_',

      // Key separator and nesting
      keySeparator: '.',
      nsSeparator: ':',

      resources: { ar: arabicResources },
      partialBundledLanguages: true,

      // Performance
      load: 'languageOnly',
      preload: ['ar'],

      // Return empty string for missing keys instead of the key itself
      returnEmptyString: false,
      returnNull: false,
      returnObjects: false
    });

  // Apply initial locale configuration
  applyLocaleConfig(initialLanguage);
};

// Apply locale-specific configurations
export const applyLocaleConfig = (language: SupportedLanguage): void => {
  const config = SUPPORTED_LANGUAGES[language].config;

  // Set HTML direction
  document.documentElement.dir = config.direction;
  document.documentElement.lang = language;

  // Set document title direction
  if (config.direction === 'rtl') {
    document.body.style.direction = 'rtl';
  } else {
    document.body.style.direction = 'ltr';
  }

  // Apply locale-specific CSS classes
  document.body.classList.toggle('rtl', config.direction === 'rtl');
  document.body.classList.toggle('ltr', config.direction === 'ltr');

  // Apply locale-specific font classes if configured
  if (config.fontClass) {
    document.body.classList.add(config.fontClass);
  }
};

// Utility functions for locale-specific formatting
export const formatCurrency = (
  value: number,
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string => {
  const config = SUPPORTED_LANGUAGES[language].config;

  try {
    return new Intl.NumberFormat(config.currency.locale, {
      style: 'currency',
      currency: config.currency.code,
      minimumFractionDigits: config.currency.decimals,
      maximumFractionDigits: config.currency.decimals
    }).format(value);
  } catch {
    // Fallback formatting
    const symbol = config.currency.symbol;
    return `${symbol}${value.toFixed(config.currency.decimals)}`;
  }
};

export const formatNumber = (
  value: number,
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string => {
  const config = SUPPORTED_LANGUAGES[language].config;

  try {
    return new Intl.NumberFormat(config.number.locale).format(value);
  } catch {
    // Fallback formatting
    return value.toLocaleString();
  }
};

export const formatDate = (
  value: Date | string | number,
  language: SupportedLanguage = DEFAULT_LANGUAGE,
  options?: Intl.DateTimeFormatOptions
): string => {
  const config = SUPPORTED_LANGUAGES[language].config;
  const date = typeof value === 'string' || typeof value === 'number'
    ? new Date(value)
    : value;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: config.date.format === 'dmy' ? '2-digit' : 'long',
    day: '2-digit'
  };

  const formatOptions = { ...defaultOptions, ...options };

  try {
    return new Intl.DateTimeFormat(config.date.locale, formatOptions).format(date);
  } catch {
    // Fallback formatting
    return date.toISOString().split('T')[0];
  }
};

export const formatDateTime = (
  value: Date | string | number,
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string => {
  return formatDate(value, language, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (
  value: Date | string | number,
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string => {
  const config = SUPPORTED_LANGUAGES[language].config;
  const date = typeof value === 'string' || typeof value === 'number'
    ? new Date(value)
    : value;

  try {
    return new Intl.DateTimeFormat(config.time.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: config.time.use12Hour
    }).format(date);
  } catch {
    // Fallback formatting
    return date.toTimeString().slice(0, 5);
  }
};

// Export i18n instance for direct usage
export { i18n };

// Export current language getter
export const getCurrentLanguage = (): SupportedLanguage => {
  const language = (i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE).split('-')[0];
  return language === 'en' ? 'en' : DEFAULT_LANGUAGE;
};

// Export language change function
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language);
  try { saveLanguagePreference(localStorage, language); } catch { /* Session-only preference. */ }
  applyLocaleConfig(language);
};

// Export utility to check if current language is RTL
export const isRTL = (): boolean => {
  const currentLang = getCurrentLanguage();
  return SUPPORTED_LANGUAGES[currentLang].dir === 'rtl';
};

// Export utility to get text direction for a language
export const getTextDirection = (language?: SupportedLanguage): 'rtl' | 'ltr' => {
  const lang = language || getCurrentLanguage();
  return SUPPORTED_LANGUAGES[lang].dir;
};

export default i18n;
