/**
 * Internationalization Provider Component
 *
 * Main i18n provider for FleetifyApp with RTL/LTR support,
 * mixed content handling, and icon mirroring.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { initializeI18n, SupportedLanguage, getCurrentLanguage } from '../../lib/i18n/config';

interface I18nProviderProps {
  children: React.ReactNode;
  language?: SupportedLanguage;
  fallbackLanguage?: SupportedLanguage;
  onLanguageChange?: (language: SupportedLanguage) => void;
  enableRTL?: boolean;
  enableIconMirroring?: boolean;
  enableMixedContent?: boolean;
}

const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  language,
  fallbackLanguage = 'en',
  onLanguageChange,
  enableRTL = true,
  enableIconMirroring = true,
  enableMixedContent = true
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(fallbackLanguage);

  // Initialize i18n
  useEffect(() => {
    const initI18n = async () => {
      try {
        await initializeI18n();
        const lang = language || getCurrentLanguage();
        setCurrentLanguage(lang);
        setIsInitialized(true);

        if (onLanguageChange) {
          onLanguageChange(lang);
        }
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initI18n();
  }, [language, onLanguageChange]);

  // Apply RTL styles and font classes
  useEffect(() => {
    if (!isInitialized) return;

    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    // Get language configuration
    const lang = currentLanguage;
    const isRTL = enableRTL && (
      lang === 'ar' ||
      lang === 'he' ||
      lang === 'fa' ||
      lang === 'ur'
    );

    // Set HTML attributes
    htmlElement.setAttribute('lang', lang);
    htmlElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

    // Add/remove RTL classes
    if (isRTL) {
      bodyElement.classList.add('rtl');
      bodyElement.classList.remove('ltr');
      bodyElement.style.direction = 'rtl';
    } else {
      bodyElement.classList.add('ltr');
      bodyElement.classList.remove('rtl');
      bodyElement.style.direction = 'ltr';
    }

    // Add language-specific font classes
    const fontClasses: Record<string, string> = {
      ar: 'font-arabic',
      zh: 'font-chinese',
      ja: 'font-japanese',
      hi: 'font-hindi',
      ko: 'font-korean',
      th: 'font-thai'
    };

    // Remove existing font classes
    Object.values(fontClasses).forEach(fontClass => {
      bodyElement.classList.remove(fontClass);
    });

    // Add current language font class
    const fontClass = fontClasses[lang];
    if (fontClass) {
      bodyElement.classList.add(fontClass);
    }

    // Apply mixed content handling styles
    if (enableMixedContent) {
      const style = document.createElement('style');
      style.id = 'i18n-mixed-content-styles';

      style.textContent = `
        /* Mixed content handling for RTL/LTR */
        .mixed-content {
          unicode-bidi: plaintext;
          text-align: start;
        }

        .mixed-content[dir="rtl"] {
          text-align: right;
        }

        .mixed-content[dir="ltr"] {
          text-align: left;
        }

        /* Icon mirroring for RTL */
        ${isRTL && enableIconMirroring ? `
          .icon-mirror {
            transform: scaleX(-1);
          }

          .icon-mirror-inline {
            display: inline-block;
            transform: scaleX(-1);
          }
        ` : ''}

        /* Language-specific adjustments */
        ${lang === 'ar' ? `
          /* Arabic-specific styles */
          body {
            font-family: 'Noto Sans Arabic', 'Arial', sans-serif;
            line-height: 1.6;
          }

          .arabic-text {
            font-family: 'Noto Sans Arabic', 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
          }

          .numbers-arabic {
            font-family: 'Arial', sans-serif;
          }
        ` : ''}

        ${lang === 'zh' ? `
          /* Chinese-specific styles */
          body {
            font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', sans-serif;
            line-height: 1.5;
          }

          .chinese-text {
            font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', sans-serif;
            writing-mode: horizontal-tb;
          }
        ` : ''}

        ${lang === 'ja' ? `
          /* Japanese-specific styles */
          body {
            font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
            line-height: 1.6;
          }

          .japanese-text {
            font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
          }
        ` : ''}

        ${lang === 'hi' ? `
          /* Hindi-specific styles */
          body {
            font-family: 'Noto Sans Devanagari', 'Mangal', sans-serif;
            line-height: 1.6;
          }

          .hindi-text {
            font-family: 'Noto Sans Devanagari', 'Mangal', sans-serif;
          }
        ` : ''}
      `;

      // Remove existing style if present
      const existingStyle = document.getElementById('i18n-mixed-content-styles');
      if (existingStyle) {
        existingStyle.remove();
      }

      // Add new style
      document.head.appendChild(style);
    }

    // Cleanup function
    return () => {
      const style = document.getElementById('i18n-mixed-content-styles');
      if (style) {
        style.remove();
      }
    };
  }, [currentLanguage, isInitialized, enableRTL, enableIconMirroring, enableMixedContent]);

  // Memoize i18n instance
  const i18nInstance = useMemo(() => {
    try {
      const i18n = require('i18next');
      return i18n.default || i18n;
    } catch (error) {
      console.error('Failed to load i18next:', error);
      return null;
    }
  }, []);

  // Error state
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Internationalization Error
          </h2>
          <p className="text-slate-600 mb-4">
            Failed to initialize internationalization: {initError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isInitialized || !i18nInstance) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading internationalization...</p>
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18nInstance}>
      {children}
    </I18nextProvider>
  );
};

export default I18nProvider;