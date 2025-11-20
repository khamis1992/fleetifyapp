/**
 * React Translation Hooks
 *
 * Custom hooks for internationalization functionality in FleetifyApp
 * including translation, locale management, and mixed content handling.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useTranslation as useReactTranslation, Trans } from 'react-i18next';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
  isRTL,
  getTextDirection,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber
} from '../lib/i18n/config';
import { LocaleBusinessRuleEngine, createBusinessRuleEngine } from '../lib/i18n/businessRules';
import { useLocaleBusinessRules } from '../lib/i18n/businessRules';
import { translationValidator } from '../lib/i18n/validation';

// Enhanced translation hook with FleetifyApp-specific features
export const useFleetifyTranslation = (namespace?: string | string[]) => {
  const {
    t,
    i18n,
    ...rest
  } = useReactTranslation(namespace, {
    useSuspense: false
  });

  const currentLanguage = useMemo(() => getCurrentLanguage(), []);
  const currentLocale = useMemo(() => SUPPORTED_LANGUAGES[currentLanguage], [currentLanguage]);
  const businessRulesEngine = useMemo(() => createBusinessRuleEngine(currentLanguage), [currentLanguage]);

  // Change language function
  const changeAppLanguage = useCallback(async (language: SupportedLanguage) => {
    try {
      await changeLanguage(language);
      // Trigger any post-language-change logic
      if (window.__APP_DEBUG__) {
        console.log(`Language changed to: ${language}`);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  }, []);

  // RTL/LTR utilities
  const rtl = useMemo(() => isRTL(), [currentLanguage]);
  const textDirection = useMemo(() => getTextDirection(), [currentLanguage]);

  // Mixed content handling for RTL/LTR
  const renderMixedContent = useCallback((content: string, options?: {
    rtlClassName?: string;
    ltrClassName?: string;
    wrapperClassName?: string;
  }) => {
    const {
      rtlClassName = 'text-right',
      ltrClassName = 'text-left',
      wrapperClassName = ''
    } = options || {};

    if (!content) return null;

    // Simple implementation - in production, you'd want more sophisticated mixed content detection
    const direction = isRTL() ? 'rtl' : 'ltr';
    const className = direction === 'rtl' ? rtlClassName : ltrClassName;

    return (
      <span className={`${className} ${wrapperClassName}`} dir={direction}>
        {content}
      </span>
    );
  }, []);

  // Icon mirroring for RTL
  const getMirroredIcon = useCallback((iconName: string): string => {
    if (!isRTL()) return iconName;

    const mirroredIcons = currentLocale.config.mirroredIcons;
    return mirroredIcons.includes(iconName) ? `${iconName}-mirrored` : iconName;
  }, [currentLocale, rtl]);

  // Check if icon should be mirrored
  const shouldMirrorIcon = useCallback((iconName: string): boolean => {
    return isRTL() && currentLocale.config.mirroredIcons.includes(iconName);
  }, [currentLocale, rtl]);

  // Get icon transform style
  const getIconTransform = useCallback((iconName: string): React.CSSProperties => {
    if (!shouldMirrorIcon(iconName)) return {};

    return {
      transform: 'scaleX(-1)'
    };
  }, [shouldMirrorIcon]);

  // Locale-aware formatting functions
  const formatLocalCurrency = useCallback((value: number) =>
    formatCurrency(value, currentLanguage), [currentLanguage]);

  const formatLocalDate = useCallback((value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
    formatDate(value, currentLanguage, options), [currentLanguage]);

  const formatLocalDateTime = useCallback((value: Date | string | number) =>
    formatDateTime(value, currentLanguage), [currentLanguage]);

  const formatLocalTime = useCallback((value: Date | string | number) =>
    formatTime(value, currentLanguage), [currentLanguage]);

  const formatLocalNumber = useCallback((value: number) =>
    formatNumber(value, currentLanguage), [currentLanguage]);

  // Business rules helpers
  const getBusinessRules = useCallback((category?: string) => {
    if (category) {
      return businessRulesEngine.getRuleCategory(category as any);
    }
    return businessRulesEngine.getRules();
  }, [businessRulesEngine]);

  const applyBusinessRule = useCallback((category: string, ruleName: string, params?: any) => {
    return businessRulesEngine.applyRule(category as any, ruleName, params);
  }, [businessRulesEngine]);

  const validateBusinessData = useCallback((data: any, category: string) => {
    return businessRulesEngine.validateBusinessData(data, category as any);
  }, [businessRulesEngine]);

  // Translation with fallback and logging
  const safeTranslate = useCallback((key: string, options?: any, fallback?: string) => {
    try {
      const translation = t(key, options);

      // Log missing translations in development
      if (process.env.NODE_ENV === 'development' && translation === key && !fallback) {
        console.warn(`Translation missing for key: ${key} in language: ${currentLanguage}`);
      }

      return translation === key ? (fallback || key) : translation;
    } catch (error) {
      console.error(`Translation error for key: ${key}`, error);
      return fallback || key;
    }
  }, [t, currentLanguage]);

  // Plural translation helper
  const translatePlural = useCallback((key: string, count: number, options?: any) => {
    return t(key, { count, ...options });
  }, [t]);

  // Translation with rich content (HTML support)
  const translateRich = useCallback((key: string, options?: any) => {
    return (
      <Trans
        i18nKey={key}
        components={options?.components}
        values={options?.values}
        defaults={options?.defaults}
      />
    );
  }, []);

  // Get available languages
  const availableLanguages = useMemo(() => {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => ({
      code: code as SupportedLanguage,
      name: config.name,
      nativeName: config.nativeName,
      flag: config.flag,
      direction: config.dir,
      isCurrent: code === currentLanguage
    }));
  }, [currentLanguage]);

  return {
    // Core translation functions
    t,
    safeTranslate,
    translatePlural,
    translateRich,
    i18n,

    // Language and locale info
    currentLanguage,
    currentLocale,
    availableLanguages,
    changeLanguage: changeAppLanguage,

    // RTL/LTR support
    rtl,
    textDirection,
    renderMixedContent,
    getMirroredIcon,
    shouldMirrorIcon,
    getIconTransform,

    // Locale-aware formatting
    formatCurrency: formatLocalCurrency,
    formatDate: formatLocalDate,
    formatDateTime: formatLocalDateTime,
    formatTime: formatLocalTime,
    formatNumber: formatLocalNumber,

    // Business rules
    businessRules: businessRulesEngine,
    getBusinessRules,
    applyBusinessRule,
    validateBusinessData,

    // Utilities
    isRTL,
    getTextDirection,

    ...rest
  };
};

// Hook for language switcher functionality
export const useLanguageSwitcher = () => {
  const { currentLanguage, changeLanguage, availableLanguages } = useFleetifyTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = useCallback(async (language: SupportedLanguage) => {
    if (language === currentLanguage || isChanging) return;

    setIsChanging(true);
    try {
      await changeLanguage(language);
      // Save preference to localStorage (handled in config.ts)
    } catch (error) {
      console.error('Failed to change language:', error);
      // You might want to show an error toast here
    } finally {
      setIsChanging(false);
    }
  }, [currentLanguage, changeLanguage, isChanging]);

  return {
    currentLanguage,
    availableLanguages,
    changeLanguage: handleLanguageChange,
    isChanging
  };
};

// Hook for RTL layout management
export const useRTLLayout = () => {
  const { rtl, textDirection } = useFleetifyTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getRTLClassName = useCallback((baseClassName: string) => {
    if (!mounted) return baseClassName;
    return `${baseClassName} ${rtl ? 'rtl' : 'ltr'}`;
  }, [rtl, mounted]);

  const getDirectionalStyles = useCallback((styles: {
    ltr?: React.CSSProperties;
    rtl?: React.CSSProperties;
  }) => {
    if (!mounted) return {};
    return rtl ? styles.rtl : styles.ltr;
  }, [rtl, mounted]);

  const getDirectionalPadding = useCallback((ltr: string | number, rtl: string | number) => {
    if (!mounted) return ltr;
    return rtl ? rtl : ltr;
  }, [rtl, mounted]);

  const getDirectionalMargin = useCallback((ltr: string | number, rtl: string | number) => {
    if (!mounted) return ltr;
    return rtl ? rtl : ltr;
  }, [rtl, mounted]);

  return {
    rtl,
    textDirection,
    mounted,
    getRTLClassName,
    getDirectionalStyles,
    getDirectionalPadding,
    getDirectionalMargin
  };
};

// Hook for translation validation
export const useTranslationValidation = () => {
  const { currentLanguage } = useFleetifyTranslation();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);

  const validateCurrentLanguage = useCallback(async (namespace?: string) => {
    setIsValidating(true);
    try {
      const results = namespace
        ? [await translationValidator.validateLanguageNamespace(currentLanguage, namespace)]
        : await translationValidator.validateAllTranslations();

      setValidationResults(results);
      return results;
    } catch (error) {
      console.error('Translation validation failed:', error);
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, [currentLanguage]);

  const getValidationReport = useCallback(() => {
    return validationResults.length > 0
      ? translationValidator.generateValidationReport(validationResults)
      : null;
  }, [validationResults]);

  const clearValidationCache = useCallback(() => {
    translationValidator.clearCache();
    setValidationResults([]);
  }, []);

  return {
    isValidating,
    validationResults,
    validateCurrentLanguage,
    getValidationReport,
    clearValidationCache
  };
};

// Hook for locale-specific date and time handling
export const useLocaleDateTime = () => {
  const { currentLanguage, formatDate, formatDateTime, formatTime } = useFleetifyTranslation();

  const getLocaleCalendarConfig = useCallback(() => {
    const config = SUPPORTED_LANGUAGES[currentLanguage].config;
    return {
      firstDayOfWeek: config.date.firstDayOfWeek,
      locale: config.date.locale,
      format: config.date.format
    };
  }, [currentLanguage]);

  const formatLocaleDate = useCallback((date: Date, format?: 'short' | 'long' | 'full') => {
    switch (format) {
      case 'short':
        return formatDate(date, { month: 'numeric', day: 'numeric', year: '2-digit' });
      case 'long':
        return formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' });
      case 'full':
        return formatDateTime(date);
      default:
        return formatDate(date);
    }
  }, [formatDate, formatDateTime]);

  const getLocaleWeekDays = useCallback(() => {
    const config = SUPPORTED_LANGUAGES[currentLanguage].config;
    const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const startDay = config.date.firstDayOfWeek;

    // Rotate array to start with the correct day
    return [...weekDays.slice(startDay), ...weekDays.slice(0, startDay)];
  }, [currentLanguage]);

  return {
    getLocaleCalendarConfig,
    formatLocaleDate,
    formatDateTime,
    formatTime,
    getLocaleWeekDays
  };
};

// Hook for business logic validation
export const useLocaleBusinessLogic = () => {
  const { currentLanguage, validateBusinessData, getBusinessRules } = useFleetifyTranslation();
  const { businessRules } = useLocaleBusinessRules(currentLanguage);

  const validateContractData = useCallback((contractData: any) => {
    return validateBusinessData(contractData, 'contracts');
  }, [validateBusinessData]);

  const validateFinancialData = useCallback((financialData: any) => {
    return validateBusinessData(financialData, 'financial');
  }, [validateBusinessData]);

  const validateFleetData = useCallback((fleetData: any) => {
    return validateBusinessData(fleetData, 'fleet');
  }, [validateBusinessData]);

  const getWorkingHours = useCallback((type: 'regular' | 'weekend' = 'regular') => {
    const rules = getBusinessRules('hr');
    return rules.workingHours[type] || rules.workingHours.regular;
  }, [getBusinessRules]);

  const getPaymentTerms = useCallback(() => {
    const rules = getBusinessRules('financial');
    return rules.paymentTerms;
  }, [getBusinessRules]);

  const getCurrencyInfo = useCallback(() => {
    const config = SUPPORTED_LANGUAGES[currentLanguage].config;
    return {
      code: config.currency.code,
      symbol: config.currency.symbol,
      position: config.currency.symbolPosition,
      decimals: config.currency.decimals
    };
  }, [currentLanguage]);

  return {
    businessRules,
    validateContractData,
    validateFinancialData,
    validateFleetData,
    getWorkingHours,
    getPaymentTerms,
    getCurrencyInfo
  };
};

export default useFleetifyTranslation;