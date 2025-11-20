/**
 * Internationalization Components Index
 *
 * Export all i18n-related components and utilities for FleetifyApp.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

export { default as I18nProvider } from './I18nProvider';
export { default as LanguageSwitcher } from './LanguageSwitcher';
export { default as MirroredIcon, withMirroring, useIconMirror, mirrorIconStyles } from './MirroredIcon';

// Re-export hooks for convenience
export {
  useFleetifyTranslation,
  useLanguageSwitcher,
  useRTLLayout,
  useTranslationValidation,
  useLocaleDateTime,
  useLocaleBusinessLogic
} from '../../hooks/useTranslation';

// Re-export types
export type { SupportedLanguage } from '../../lib/i18n/config';
export type { LocaleConfig } from '../../lib/i18n/locales';
export type { TranslationValidationResult, ValidationIssue } from '../../lib/i18n/validation';