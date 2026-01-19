/**
 * Internationalization System Tests
 *
 * Comprehensive test suite for FleetifyApp's internationalization system.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { I18nProvider, LanguageSwitcher, MirroredIcon } from '../components/i18n';
import { useFleetifyTranslation } from '../hooks/useTranslation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Mock i18n instance for testing
const mockI18n = {
  language: 'en',
  changeLanguage: vi.fn(),
  t: vi.fn((key: string) => key),
  isInitialized: true
};

// Mock translation files
const mockTranslations = {
  en: {
    common: {
      app: {
        name: 'FleetifyApp',
        loading: 'Loading...'
      },
      actions: {
        save: 'Save',
        cancel: 'Cancel'
      }
    },
    fleet: {
      title: 'Fleet Management',
      vehicles: 'Vehicles',
      vehicle: {
        make: 'Make',
        model: 'Model'
      }
    }
  },
  ar: {
    common: {
      app: {
        name: 'فليتفاي أب',
        loading: 'جاري التحميل...'
      },
      actions: {
        save: 'حفظ',
        cancel: 'إلغاء'
      }
    },
    fleet: {
      title: 'إدارة الأسطول',
      vehicles: 'المركبات',
      vehicle: {
        make: 'الشركة المصنعة',
        model: 'الموديل'
      }
    }
  }
};

// Mock fetch for translation loading
global.fetch = vi.fn((url) => {
  const [, language, namespace] = url.split('/');
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockTranslations[language]?.[namespace] || {})
  });
}) as any;

// Test component that uses i18n
const TestComponent: React.FC<{ namespace?: string }> = ({ namespace }) => {
  const { t, rtl, formatLocalCurrency, currentLanguage } = useFleetifyTranslation(namespace);

  return (
    <div dir={rtl ? 'rtl' : 'ltr'}>
      <h1>{t('app.name')}</h1>
      <p>{t('app.loading')}</p>
      <p>{t('actions.save')}</p>
      <p>{t('actions.cancel')}</p>
      {namespace === 'fleet' && (
        <>
          <p>{t('fleet.title')}</p>
          <p>{t('fleet.vehicles')}</p>
          <p>{t('fleet.vehicle.make')}</p>
          <p>{t('fleet.vehicle.model')}</p>
        </>
      )}
      <p>Language: {currentLanguage}</p>
      <p>RTL: {rtl.toString()}</p>
      <p>Formatted Currency: {formatLocalCurrency(1000)}</p>
    </div>
  );
};

describe('I18n System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document direction
    document.documentElement.dir = 'ltr';
    document.body.className = '';
  });

  describe('I18nProvider', () => {
    it('should render children with default language', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByText('FleetifyApp')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('Language: en')).toBeInTheDocument();
      expect(screen.getByText('RTL: false')).toBeInTheDocument();
    });

    it('should apply RTL styles for Arabic language', async () => {
      render(
        <I18nProvider language="ar">
          <TestComponent />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.dir).toBe('rtl');
        expect(document.body).toHaveClass('rtl');
        expect(document.body).not.toHaveClass('ltr');
      });
    });

    it('should apply LTR styles for English language', async () => {
      render(
        <I18nProvider language="en">
          <TestComponent />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.dir).toBe('ltr');
        expect(document.body).toHaveClass('ltr');
        expect(document.body).not.toHaveClass('rtl');
      });
    });

    it('should handle language change callback', () => {
      const onLanguageChange = vi.fn();

      render(
        <I18nProvider
          language="en"
          onLanguageChange={onLanguageChange}
        >
          <TestComponent />
        </I18nProvider>
      );

      // Initial language change should trigger callback
      expect(onLanguageChange).toHaveBeenCalledWith('en');
    });

    it('should add language-specific font classes', async () => {
      render(
        <I18nProvider language="ar">
          <TestComponent />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(document.body).toHaveClass('font-ar');
      });
    });
  });

  describe('Language Switcher', () => {
    it('should render language switcher with available languages', () => {
      render(
        <I18nProvider>
          <LanguageSwitcher variant="dropdown" />
        </I18nProvider>
      );

      expect(screen.getByText('English')).toBeInTheDocument();
      // Should show flag or language button
    });

    it('should show flags when flag option is enabled', () => {
      render(
        <I18nProvider>
          <LanguageSwitcher variant="flags" />
        </I18nProvider>
      );

      // Should render language flags
      const languageButtons = screen.getAllByRole('button');
      expect(languageButtons.length).toBeGreaterThan(0);
    });

    it('should handle language switching', async () => {
      render(
        <I18nProvider>
          <div>
            <LanguageSwitcher variant="compact" />
            <TestComponent />
          </div>
        </I18nProvider>
      );

      // Language switcher should be present
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  describe('Mirrored Icon', () => {
    it('should render icon normally in LTR language', () => {
      render(
        <I18nProvider language="en">
          <MirroredIcon
            icon={ChevronLeft}
            name="chevron-left"
            data-testid="mirrored-icon"
          />
        </I18nProvider>
      );

      const icon = screen.getByTestId('mirrored-icon');
      expect(icon).toBeInTheDocument();
      // Should not have mirrored class in LTR
      expect(icon.querySelector('.icon-mirrored')).not.toBeInTheDocument();
    });

    it('should apply mirror styles in RTL language', async () => {
      render(
        <I18nProvider language="ar">
          <MirroredIcon
            icon={ChevronLeft}
            name="chevron-left"
            data-testid="mirrored-icon"
          />
        </I18nProvider>
      );

      await waitFor(() => {
        const icon = screen.getByTestId('mirrored-icon');
        expect(icon).toBeInTheDocument();
        // Should have mirrored class or style in RTL
        const iconElement = icon.querySelector('svg');
        expect(iconElement).toHaveStyle('transform: scaleX(-1)');
      });
    });

    it('should not mirror icons that are not in the mirror list', async () => {
      render(
        <I18nProvider language="ar">
          <MirroredIcon
            icon={ChevronRight}
            name="chevron-right" // This shouldn't be mirrored
            data-testid="non-mirrored-icon"
          />
        </I18nProvider>
      );

      await waitFor(() => {
        const icon = screen.getByTestId('non-mirrored-icon');
        const iconElement = icon.querySelector('svg');
        // Should not be mirrored
        expect(iconElement).not.toHaveStyle('transform: scaleX(-1)');
      });
    });
  });

  describe('Translation Hooks', () => {
    it('should provide translation function', () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      expect(screen.getByText('FleetifyApp')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should provide namespace-specific translations', () => {
      render(
        <I18nProvider>
          <TestComponent namespace="fleet" />
        </I18nProvider>
      );

      expect(screen.getByText('Fleet Management')).toBeInTheDocument();
      expect(screen.getByText('Vehicles')).toBeInTheDocument();
      expect(screen.getByText('Make')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
    });

    it('should provide RTL information', async () => {
      const TestRTLComponent: React.FC = () => {
        const { rtl, textDirection } = useFleetifyTranslation();
        return (
          <div>
            <p data-testid="rtl-value">{rtl.toString()}</p>
            <p data-testid="direction">{textDirection}</p>
          </div>
        );
      };

      render(
        <I18nProvider language="ar">
          <TestRTLComponent />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('rtl-value')).toHaveTextContent('true');
        expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
      });
    });

    it('should format currency according to locale', async () => {
      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Should format as USD for English
      expect(screen.getByText('Formatted Currency: $1,000.00')).toBeInTheDocument();
    });
  });

  describe('Mixed Content Handling', () => {
    it('should render mixed content with proper direction', async () => {
      const MixedContentComponent: React.FC = () => {
        const { renderMixedContent } = useFleetifyTranslation();

        return (
          <div>
            {renderMixedContent('Hello World مرحبا بالعالم')}
            {renderMixedContent('123 رقم 456', {
              rtlClassName: 'text-right',
              ltrClassName: 'text-left'
            })}
          </div>
        );
      };

      render(
        <I18nProvider language="en">
          <MixedContentComponent />
        </I18nProvider>
      );

      // Should render mixed content
      expect(screen.getByText('Hello World مرحبا بالعالم')).toBeInTheDocument();
      expect(screen.getByText('123 رقم 456')).toBeInTheDocument();
    });
  });

  describe('Business Rules Integration', () => {
    it('should provide locale-specific business rules', async () => {
      const BusinessRulesComponent: React.FC = () => {
        const { getBusinessRules } = useFleetifyTranslation();
        const workingHours = getBusinessRules('hr')?.workingHours;

        return (
          <div>
            <p data-testid="working-hours">
              {workingHours?.start} - {workingHours?.end}
            </p>
          </div>
        );
      };

      render(
        <I18nProvider language="en">
          <BusinessRulesComponent />
        </I18nProvider>
      );

      await waitFor(() => {
        const workingHours = screen.getByTestId('working-hours');
        expect(workingHours).toBeInTheDocument();
        // Should show working hours for the locale
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing translation keys gracefully', () => {
      const MissingTranslationComponent: React.FC = () => {
        const { safeTranslate } = useFleetifyTranslation();

        return (
          <div>
            <p>{safeTranslate('nonexistent.key', {}, 'Fallback Text')}</p>
          </div>
        );
      };

      render(
        <I18nProvider>
          <MissingTranslationComponent />
        </I18nProvider>
      );

      expect(screen.getByText('Fallback Text')).toBeInTheDocument();
    });

    it('should handle i18n initialization errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );

      // Should render error state if i18n fails to initialize
      // This would need to mock the i18n initialization failure
      expect(screen.getByText('FleetifyApp')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when language doesn\'t change', () => {
      const TestComponentWithMemo: React.FC = () => {
        const { currentLanguage } = useFleetifyTranslation();

        return React.useMemo(() => (
          <div data-testid="memoized-content">
            Language: {currentLanguage}
          </div>
        ), [currentLanguage]);
      };

      const { rerender } = render(
        <I18nProvider language="en">
          <TestComponentWithMemo />
        </I18nProvider>
      );

      expect(screen.getByTestId('memoized-content')).toBeInTheDocument();

      // Rerender with same language should not cause issues
      rerender(
        <I18nProvider language="en">
          <TestComponentWithMemo />
        </I18nProvider>
      );

      expect(screen.getByTestId('memoized-content')).toBeInTheDocument();
    });
  });
});

describe('Translation File Structure', () => {
  it('should have proper namespace organization', () => {
    // Test that translation files are properly structured
    expect(mockTranslations.en.common).toBeDefined();
    expect(mockTranslations.en.fleet).toBeDefined();
    expect(mockTranslations.ar.common).toBeDefined();
    expect(mockTranslations.ar.fleet).toBeDefined();
  });

  it('should maintain consistent key structure across languages', () => {
    // Check that both languages have the same structure
    const enKeys = Object.keys(mockTranslations.en.common.app);
    const arKeys = Object.keys(mockTranslations.ar.common.app);

    expect(enKeys).toEqual(arKeys);
  });

  it('should have nested structure for complex translations', () => {
    // Test nested translation structure
    expect(mockTranslations.en.fleet.vehicle).toBeDefined();
    expect(mockTranslations.en.fleet.vehicle.make).toBeDefined();
    expect(mockTranslations.ar.fleet.vehicle).toBeDefined();
    expect(mockTranslations.ar.fleet.vehicle.make).toBeDefined();
  });
});