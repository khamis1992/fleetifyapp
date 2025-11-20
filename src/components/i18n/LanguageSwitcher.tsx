/**
 * Language Switcher Component
 *
 * Dropdown component for switching between languages with RTL/LTR support,
 * flags, and native language names.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useFleetifyTranslation, useLanguageSwitcher } from '../../hooks/useTranslation';
import { ChevronDown, Globe, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'flags' | 'compact';
  showFlag?: boolean;
  showNativeName?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
  disabled?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  showFlag = true,
  showNativeName = true,
  position = 'bottom-right',
  className = '',
  disabled = false
}) => {
  const { currentLanguage, availableLanguages, changeLanguage, isChanging } = useLanguageSwitcher();
  const { getTextDirection } = useFleetifyTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Current language info
  const currentLangInfo = availableLanguages.find(lang => lang.isCurrent);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Handle language change
  const handleLanguageChange = async (languageCode: string) => {
    if (isChanging || disabled) return;

    try {
      await changeLanguage(languageCode as any);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'right-0 mt-2';
      case 'bottom-left':
        return 'left-0 mt-2';
      case 'top-right':
        return 'right-0 bottom-full mb-2';
      case 'top-left':
        return 'left-0 bottom-full mb-2';
      default:
        return 'right-0 mt-2';
    }
  };

  // Render compact variant
  if (variant === 'compact') {
    return (
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isChanging}
        className={`
          flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700
          bg-white border border-gray-300 rounded-md shadow-sm
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        title={`Current language: ${currentLangInfo?.nativeName} (${currentLangInfo?.name})`}
      >
        <Globe className="w-4 h-4" />
        <span>{currentLangInfo?.nativeName || currentLanguage}</span>
        {isChanging && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        )}
      </button>
    );
  }

  // Render flags-only variant
  if (variant === 'flags') {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {availableLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={disabled || isChanging}
            className={`
              relative w-10 h-10 flex items-center justify-center rounded-lg border-2
              transition-all duration-200 hover:scale-110
              ${lang.isCurrent
                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-300 hover:border-gray-400'
              }
              ${disabled || isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={`${lang.nativeName} (${lang.name})`}
          >
            <span className="text-xl">{lang.flag}</span>
            {lang.isCurrent && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-2 h-2 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Render default dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isChanging}
        className={`
          flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700
          bg-white border border-gray-300 rounded-lg shadow-sm
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {showFlag && currentLangInfo && (
          <span className="text-lg">{currentLangInfo.flag}</span>
        )}
        <Globe className="w-4 h-4" />
        <span>{showNativeName ? currentLangInfo?.nativeName : currentLangInfo?.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        {isChanging && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className={`
            absolute z-50 w-64 bg-white border border-gray-200 rounded-lg shadow-lg
            ${getPositionClasses()}
          `}>
            <div className="py-1 max-h-96 overflow-y-auto">
              {availableLanguages.map((lang) => {
                const isRTL = lang.direction === 'rtl';
                const textDir = isRTL ? 'rtl' : 'ltr';

                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    disabled={disabled || isChanging}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left
                      hover:bg-gray-50 focus:outline-none focus:bg-gray-50
                      transition-colors duration-200
                      ${lang.isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                      ${disabled || isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    dir={textDir}
                  >
                    {/* Flag */}
                    {showFlag && (
                      <span className="text-xl flex-shrink-0">{lang.flag}</span>
                    )}

                    {/* Language names */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{lang.nativeName}</div>
                      {showNativeName && (
                        <div className="text-xs text-gray-500">{lang.name}</div>
                      )}
                    </div>

                    {/* Check mark for current language */}
                    {lang.isCurrent && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}

                    {/* Direction indicator */}
                    {!lang.isCurrent && (
                      <div className={`text-xs text-gray-400 ${isRTL ? 'ml-auto' : 'mr-auto'}`}>
                        {isRTL ? 'RTL' : 'LTR'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500 text-center">
                {isChanging ? 'Changing language...' : 'Select your preferred language'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;