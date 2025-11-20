/**
 * Internationalization Usage Example
 *
 * Comprehensive example demonstrating how to use FleetifyApp's
 * internationalization system in React components.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

import React from 'react';
import {
  I18nProvider,
  LanguageSwitcher,
  MirroredIcon,
  useFleetifyTranslation,
  useLanguageSwitcher,
  useRTLLayout,
  useLocaleBusinessLogic
} from '../components/i18n';
import {
  ChevronLeft,
  ChevronRight,
  ArrowBack,
  ArrowForward,
  Car,
  Settings,
  Globe,
  Calendar
} from 'lucide-react';

// Example 1: Basic App Setup with I18n Provider
export const AppWithI18n: React.FC = () => {
  return (
    <I18nProvider
      language="en" // or get from user preference
      enableRTL={true}
      enableIconMirroring={true}
      enableMixedContent={true}
      onLanguageChange={(language) => {
        console.log('Language changed to:', language);
        // Save to localStorage, send to analytics, etc.
      }}
    >
      <App />
    </I18nProvider>
  );
};

// Example 2: Main App Component
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-6">
        <DashboardContent />
      </main>
    </div>
  );
};

// Example 3: Header with Language Switcher
const Header: React.FC = () => {
  const { t, currentLocale, formatLocalDate } = useFleetifyTranslation();
  const { getRTLClassName } = useRTLLayout();

  return (
    <header className={getRTLClassName('bg-white shadow-sm border-b border-gray-200')}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Car className="w-8 h-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">
            {t('app.name')}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Date formatting example */}
          <span className="text-sm text-gray-600">
            {formatLocalDate(new Date())}
          </span>

          {/* Language switcher */}
          <LanguageSwitcher
            variant="dropdown"
            showFlag={true}
            showNativeName={true}
          />

          {/* Example of mirrored icon */}
          <MirroredIcon
            icon={ChevronLeft}
            name="chevron-left"
            className="w-5 h-5 text-gray-600"
          />
        </div>
      </div>
    </header>
  );
};

// Example 4: Dashboard Content with Fleet Management
const DashboardContent: React.FC = () => {
  const {
    t,
    rtl,
    renderMixedContent,
    getMirroredIcon,
    formatLocalCurrency,
    getBusinessRules,
    validateBusinessData
  } = useFleetifyTranslation();

  const { getCurrencyInfo } = useLocaleBusinessLogic();

  // Business rules example
  const workingHours = getBusinessRules('hr')?.workingHours?.regular;
  const paymentTerms = getBusinessRules('financial')?.paymentTerms;

  // Mock vehicle data
  const vehicles = [
    {
      id: '1',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      status: 'available',
      dailyRate: 50,
      currency: 'USD'
    },
    {
      id: '2',
      make: 'Honda',
      model: 'Civic',
      year: 2023,
      status: 'rented',
      dailyRate: 45,
      currency: 'USD'
    }
  ];

  // Validate contract data
  const contractData = {
    customerName: 'John Doe',
    vehicleId: '1',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    deposit: 500
  };

  const validation = validateBusinessData(contractData, 'contracts');

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('fleet.title')}
        </h2>

        <div className="flex items-center space-x-2">
          {/* RTL-aware navigation */}
          <MirroredIcon
            icon={rtl ? ArrowForward : ArrowBack}
            name={rtl ? 'arrow-forward' : 'arrow-back'}
            className="w-5 h-5 text-gray-600"
          />

          <MirroredIcon
            icon={rtl ? ArrowRight : ArrowLeft}
            name={rtl ? 'arrow-right' : 'arrow-left'}
            className="w-5 h-5 text-gray-600"
          />
        </div>
      </div>

      {/* Business Rules Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          {t('settings.general_settings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">{t('hr.workingHours')}:</span>
            <span className="text-gray-700">
              {workingHours?.start} - {workingHours?.end}
            </span>
          </div>
          <div>
            <span className="font-medium">{t('financial.paymentTerms')}:</span>
            <span className="text-gray-700">
              {paymentTerms?.join(', ')} {t('time.days')}
            </span>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className={`p-4 rounded-lg ${
          validation.valid
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <h4 className="font-semibold mb-2">
            {validation.valid ? '✅' : '❌'} Contract Validation
          </h4>
          {!validation.valid && validation.errors.length > 0 && (
            <ul className="list-disc list-inside text-sm">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Vehicle Table with RTL Support */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('fleet.vehicles')}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vehicle.make')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vehicle.model')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vehicle.year')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('vehicle.vehicle_status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('financial.daily_rate')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions.title')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {renderMixedContent(vehicle.make, { wrapperClassName: 'font-medium' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      vehicle.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {t(`status.${vehicle.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLocalCurrency(vehicle.dailyRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      {t('actions.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mixed Content Example */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('fleet.maintenance.maintenance_reminder')}
        </h3>

        <div className="space-y-3">
          {[
            { vehicle: 'Toyota Camry', service: 'Oil Change', date: '2024-01-15' },
            { vehicle: 'Honda Civic', service: 'Tire Rotation', date: '2024-01-20' }
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className={rtl ? 'text-right' : 'text-left'}>
                <div className="font-medium text-gray-900">
                  {renderMixedContent(item.vehicle)}
                </div>
                <div className="text-sm text-gray-600">
                  {t(`fleet.maintenance.maintenance_types.${item.service.replace(/\s+/g, '_').toLowerCase()}`)}
                </div>
              </div>

              <div className={rtl ? 'text-left' : 'text-right'}>
                <div className="text-sm text-gray-500">
                  {formatLocalDate(new Date(item.date))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Currency Information Display */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('financial.currency')} {getCurrencyInfo().symbol}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">{t('financial.currency_code')}:</span>
            <div className="font-medium">{getCurrencyInfo().code}</div>
          </div>
          <div>
            <span className="text-gray-600">{t('financial.decimals')}:</span>
            <div className="font-medium">{getCurrencyInfo().decimals}</div>
          </div>
          <div>
            <span className="text-gray-600">{t('financial.position')}:</span>
            <div className="font-medium">{getCurrencyInfo().position}</div>
          </div>
          <div>
            <span className="text-gray-600">{t('financial.locale')}:</span>
            <div className="font-medium">{currentLocale.locale}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example 5: Component with Advanced Features
export const AdvancedI18nExample: React.FC = () => {
  const {
    t,
    changeLanguage,
    availableLanguages,
    isChanging,
    translatePlural,
    translateRich,
    safeTranslate,
    validateContractData,
    formatLocalDateTime
  } = useFleetifyTranslation();

  const [selectedLanguage, setSelectedLanguage] = React.useState('en');

  // Rich text translation example
  const welcomeMessage = translateRich('app.welcome_message', {
    components: {
      strong: <strong />,
      link: <a href="/dashboard" className="text-blue-600 hover:text-blue-800" />
    },
    values: {
      userName: 'John Doe',
      appName: 'FleetifyApp'
    }
  });

  // Pluralization example
  const vehicleCount = 3;
  const vehicleText = translatePlural('fleet.vehicle_count', vehicleCount, {
    count: vehicleCount
  });

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Advanced I18N Features
      </h2>

      {/* Language Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Language Selection
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setSelectedLanguage(lang.code);
                changeLanguage(lang.code);
              }}
              disabled={isChanging}
              className={`
                p-4 rounded-lg border-2 transition-colors
                ${lang.isCurrent
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="text-2xl mb-2">{lang.flag}</div>
              <div className="font-medium">{lang.nativeName}</div>
              <div className="text-sm text-gray-500">{lang.name}</div>
              {lang.isCurrent && (
                <div className="mt-2 text-xs text-blue-600">✓ Active</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Translation Examples */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Translation Examples
        </h3>

        <div className="space-y-4">
          {/* Basic translation */}
          <div>
            <h4 className="font-medium text-gray-700">Basic Translation:</h4>
            <p className="text-gray-600">
              {t('app.description')}
            </p>
          </div>

          {/* Safe translation with fallback */}
          <div>
            <h4 className="font-medium text-gray-700">Safe Translation:</h4>
            <p className="text-gray-600">
              {safeTranslate('app.welcome', {}, 'Welcome to FleetifyApp')}
            </p>
          </div>

          {/* Rich text translation */}
          <div>
            <h4 className="font-medium text-gray-700">Rich Text Translation:</h4>
            <div className="text-gray-600">
              {welcomeMessage}
            </div>
          </div>

          {/* Pluralization */}
          <div>
            <h4 className="font-medium text-gray-700">Pluralization:</h4>
            <p className="text-gray-600">
              {vehicleText}
            </p>
          </div>

          {/* Date/Time formatting */}
          <div>
            <h4 className="font-medium text-gray-700">Date/Time Formatting:</h4>
            <p className="text-gray-600">
              Current time: {formatLocalDateTime(new Date())}
            </p>
          </div>
        </div>
      </div>

      {/* Business Rules Integration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Rules Integration
        </h3>

        {(() => {
          const contractData = {
            customerName: 'Test Customer',
            vehicleId: 'test-123',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            deposit: 1000,
            monthlyRate: 500
          };

          const validation = validateContractData(contractData, 'contracts');

          return (
            <div className={`p-4 rounded-lg ${
              validation.valid
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className="font-semibold mb-2">
                Contract Data Validation
              </h4>
              <p className={validation.valid ? 'text-green-800' : 'text-red-800'}>
                {validation.valid
                  ? '✅ Contract data is valid for current locale'
                  : '❌ Contract data has validation issues'}
              </p>
              {!validation.valid && validation.errors.length > 0 && (
                <ul className="mt-2 text-sm list-disc list-inside text-red-700">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// Example 6: Component using only specific hooks
export const MinimalI18nExample: React.FC = () => {
  const { changeLanguage, isChanging } = useLanguageSwitcher();
  const { rtl, getDirectionalStyles } = useRTLLayout();

  return (
    <div
      className="p-6"
      style={getDirectionalStyles({
        ltr: { padding: '24px' },
        rtl: { padding: '24px' }
      })}
    >
      <h2>Minimal I18N Example</h2>
      <p>Current direction: {rtl ? 'RTL' : 'LTR'}</p>
      <button
        onClick={() => changeLanguage('ar')}
        disabled={isChanging}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Switch to Arabic
      </button>
    </div>
  );
};

export default AppWithI18n;