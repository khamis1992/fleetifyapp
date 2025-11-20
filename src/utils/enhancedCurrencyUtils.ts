/**
 * Enhanced Currency Utilities
 * FIN-003: Multi-Currency and Compliance System
 *
 * Advanced currency formatting, conversion, and validation utilities
 * with support for multiple currencies and jurisdictions.
 */

import { exchangeRateService } from '@/services/exchangeRateService';
import type { CurrencyConversionResult, CurrencyExposureReport } from '@/types/finance.types';
import { CURRENCY_CONFIGS } from './currencyConfig';

// Enhanced currency configuration with compliance information
interface EnhancedCurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  fractionDigits: number;
  showSymbolFirst: boolean;
  jurisdiction: string[];
  requiresReporting: boolean;
  reportingThreshold: number;
  supportedForTransactions: boolean;
  centralBank: string;
}

export const ENHANCED_CURRENCY_CONFIGS: Record<string, EnhancedCurrencyConfig> = {
  KWD: {
    code: 'KWD',
    symbol: 'د.ك',
    name: 'Kuwaiti Dinar',
    locale: 'ar-KW',
    fractionDigits: 3,
    showSymbolFirst: false,
    jurisdiction: ['KW'],
    requiresReporting: true,
    reportingThreshold: 3000,
    supportedForTransactions: true,
    centralBank: 'Central Bank of Kuwait'
  },
  QAR: {
    code: 'QAR',
    symbol: 'ر.ق',
    name: 'Qatari Riyal',
    locale: 'ar-QA',
    fractionDigits: 2,
    showSymbolFirst: false,
    jurisdiction: ['QA'],
    requiresReporting: true,
    reportingThreshold: 50000,
    supportedForTransactions: true,
    centralBank: 'Qatar Central Bank'
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    name: 'Saudi Riyal',
    locale: 'ar-SA',
    fractionDigits: 2,
    showSymbolFirst: false,
    jurisdiction: ['SA'],
    requiresReporting: true,
    reportingThreshold: 100000,
    supportedForTransactions: true,
    centralBank: 'Saudi Arabian Monetary Authority'
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    locale: 'ar-AE',
    fractionDigits: 2,
    showSymbolFirst: false,
    jurisdiction: ['AE'],
    requiresReporting: true,
    reportingThreshold: 55000,
    supportedForTransactions: true,
    centralBank: 'Central Bank of UAE'
  },
  BHD: {
    code: 'BHD',
    symbol: 'د.ب',
    name: 'Bahraini Dinar',
    locale: 'ar-BH',
    fractionDigits: 3,
    showSymbolFirst: false,
    jurisdiction: ['BH'],
    requiresReporting: true,
    reportingThreshold: 2500,
    supportedForTransactions: true,
    centralBank: 'Central Bank of Bahrain'
  },
  OMR: {
    code: 'OMR',
    symbol: 'ر.ع',
    name: 'Omani Rial',
    locale: 'ar-OM',
    fractionDigits: 3,
    showSymbolFirst: false,
    jurisdiction: ['OM'],
    requiresReporting: true,
    reportingThreshold: 13000,
    supportedForTransactions: true,
    centralBank: 'Central Bank of Oman'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    fractionDigits: 2,
    showSymbolFirst: true,
    jurisdiction: ['US'],
    requiresReporting: true,
    reportingThreshold: 10000,
    supportedForTransactions: true,
    centralBank: 'Federal Reserve'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    fractionDigits: 2,
    showSymbolFirst: true,
    jurisdiction: ['EU'],
    requiresReporting: true,
    reportingThreshold: 10000,
    supportedForTransactions: true,
    centralBank: 'European Central Bank'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    fractionDigits: 2,
    showSymbolFirst: true,
    jurisdiction: ['GB'],
    requiresReporting: true,
    reportingThreshold: 8000,
    supportedForTransactions: true,
    centralBank: 'Bank of England'
  }
};

export class EnhancedCurrencyUtils {
  /**
   * Format currency with proper locale and symbol placement
   */
  public static formatCurrency(
    amount: number | string,
    currency: string = 'QAR',
    options?: {
      locale?: string;
      showCode?: boolean;
      compact?: boolean;
    }
  ): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) {
      return '0';
    }

    const config = ENHANCED_CURRENCY_CONFIGS[currency.toUpperCase()] || ENHANCED_CURRENCY_CONFIGS.QAR;

    const formatter = new Intl.NumberFormat(options?.locale || config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: options?.compact ? 0 : config.fractionDigits,
      maximumFractionDigits: options?.compact ? 0 : config.fractionDigits,
      currencyDisplay: options?.showCode ? 'code' : 'symbol'
    });

    return formatter.format(numAmount);
  }

  /**
   * Convert amount between currencies with real-time rates
   */
  public static async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    options?: {
      date?: string;
      companyId?: string;
      includeRate?: boolean;
    }
  ): Promise<CurrencyConversionResult | string> {
    try {
      const result = await exchangeRateService.convertCurrency({
        amount,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        date: options?.date,
        company_id: options?.companyId
      });

      if (options?.includeRate) {
        return result;
      }

      return this.formatCurrency(result.converted_amount, toCurrency);
    } catch (error) {
      console.error('Currency conversion error:', error);
      return this.formatCurrency(amount, fromCurrency);
    }
  }

  /**
   * Get currency information
   */
  public static getCurrencyInfo(currency: string): EnhancedCurrencyConfig | null {
    return ENHANCED_CURRENCY_CONFIGS[currency.toUpperCase()] || null;
  }

  /**
   * Check if currency requires reporting for transaction amount
   */
  public static requiresReporting(
    amount: number,
    currency: string,
    jurisdiction?: string
  ): boolean {
    const config = this.getCurrencyInfo(currency);
    if (!config) return false;

    // Check if amount exceeds threshold
    if (amount >= config.reportingThreshold) return true;

    // Check jurisdiction-specific rules
    if (jurisdiction && config.jurisdiction.includes(jurisdiction)) {
      return true;
    }

    return config.requiresReporting;
  }

  /**
   * Validate currency code
   */
  public static isValidCurrency(currency: string): boolean {
    return Object.keys(ENHANCED_CURRENCY_CONFIGS).includes(currency.toUpperCase());
  }

  /**
   * Get supported currencies for transactions
   */
  public static getSupportedCurrencies(): string[] {
    return Object.values(ENHANCED_CURRENCY_CONFIGS)
      .filter(config => config.supportedForTransactions)
      .map(config => config.code);
  }

  /**
   * Calculate currency gain/loss
   */
  public static calculateGainLoss(
    originalAmount: number,
    originalRate: number,
    currentRate: number,
    currency: string
  ): {
    gainLoss: number;
    gainLossPercentage: number;
    gainLossFormatted: string;
    isGain: boolean;
  } {
    const originalValue = originalAmount * originalRate;
    const currentValue = originalAmount * currentRate;
    const gainLoss = currentValue - originalValue;
    const gainLossPercentage = (gainLoss / originalValue) * 100;
    const isGain = gainLoss > 0;

    return {
      gainLoss,
      gainLossPercentage,
      gainLossFormatted: this.formatCurrency(Math.abs(gainLoss), currency),
      isGain
    };
  }

  /**
   * Format currency range
   */
  public static formatCurrencyRange(
    min: number,
    max: number,
    currency: string
  ): string {
    const minFormatted = this.formatCurrency(min, currency);
    const maxFormatted = this.formatCurrency(max, currency);

    if (min === max) {
      return minFormatted;
    }

    return `${minFormatted} - ${maxFormatted}`;
  }

  /**
   * Parse currency string to number
   */
  public static parseCurrency(formattedAmount: string, currency?: string): number {
    const config = currency ? this.getCurrencyInfo(currency) : null;
    const locale = config?.locale || 'en-US';

    try {
      // Remove currency symbol and other non-numeric characters
      const cleanAmount = formattedAmount.replace(/[^\d.,-]/g, '');

      // Replace decimal separator based on locale
      const normalizedAmount = cleanAmount.replace(/,/g, '.');

      return parseFloat(normalizedAmount) || 0;
    } catch (error) {
      console.error('Error parsing currency:', error);
      return 0;
    }
  }

  /**
   * Get exchange rate change percentage
   */
  public static async getRateChangePercentage(
    fromCurrency: string,
    toCurrency: string,
    days: number = 30
  ): Promise<number> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const [currentRate, historicalRate] = await Promise.all([
        exchangeRateService.getCurrentRate(fromCurrency, toCurrency),
        exchangeRateService.getHistoricalRate(
          fromCurrency,
          toCurrency,
          startDate.toISOString().split('T')[0]
        )
      ]);

      if (!historicalRate || historicalRate === 0) return 0;

      return ((currentRate - historicalRate) / historicalRate) * 100;
    } catch (error) {
      console.error('Error calculating rate change:', error);
      return 0;
    }
  }

  /**
   * Get currency risk indicators
   */
  public static async getCurrencyRiskIndicators(
    exposure: CurrencyExposureReport[]
  ): Promise<{
    totalRiskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    currencyVolatility: Record<string, number>;
    hedgingRecommendations: string[];
  }> {
    try {
      let totalRiskScore = 0;
      const currencyVolatility: Record<string, number> = {};
      const hedgingRecommendations: string[] = [];

      for (const exposureReport of exposure) {
        // Calculate volatility based on rate changes
        const volatility = Math.abs(await this.getRateChangePercentage(
          exposureReport.currency,
          'QAR', // Base currency for comparison
          30
        ));

        currencyVolatility[exposureReport.currency] = volatility;

        // Calculate risk score for this currency
        const currencyRiskScore = this.calculateCurrencyRiskScore(exposureReport, volatility);
        totalRiskScore += currencyRiskScore;

        // Generate hedging recommendations
        if (exposureReport.net_exposure !== 0 && Math.abs(exposureReport.net_exposure) > 10000) {
          hedgingRecommendations.push(
            `Consider hedging ${exposureReport.currency} exposure of ${this.formatCurrency(
              Math.abs(exposureReport.net_exposure),
              exposureReport.currency
            )}`
          );
        }
      }

      // Determine overall risk level
      const averageRiskScore = exposure.length > 0 ? totalRiskScore / exposure.length : 0;
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';

      if (averageRiskScore >= 80) riskLevel = 'critical';
      else if (averageRiskScore >= 60) riskLevel = 'high';
      else if (averageRiskScore >= 40) riskLevel = 'medium';
      else riskLevel = 'low';

      return {
        totalRiskScore: averageRiskScore,
        riskLevel,
        currencyVolatility,
        hedgingRecommendations
      };
    } catch (error) {
      console.error('Error calculating risk indicators:', error);
      return {
        totalRiskScore: 0,
        riskLevel: 'low',
        currencyVolatility: {},
        hedgingRecommendations: []
      };
    }
  }

  /**
   * Round currency amount according to currency specifications
   */
  public static roundCurrency(amount: number, currency: string): number {
    const config = this.getCurrencyInfo(currency);
    const precision = config?.fractionDigits || 2;

    const factor = Math.pow(10, precision);
    return Math.round(amount * factor) / factor;
  }

  /**
   * Format amount in words (for legal documents)
   */
  public static formatAmountInWords(
    amount: number,
    currency: string,
    language: 'en' | 'ar' = 'en'
  ): string {
    // This is a simplified implementation
    // In production, you'd want to use a proper number-to-words library

    const config = this.getCurrencyInfo(currency);
    const currencyName = config?.name || currency;

    if (language === 'ar') {
      // Arabic implementation would go here
      return `${amount} ${currencyName}`;
    }

    // Simple English implementation
    return `${amount.toLocaleString('en-US')} ${currencyName}`;
  }

  // Private helper methods

  private static calculateCurrencyRiskScore(
    exposure: CurrencyExposureReport,
    volatility: number
  ): number {
    let riskScore = 0;

    // Net exposure contributes to risk
    const exposureRatio = Math.abs(exposure.net_exposure) / (exposure.total_exposure || 1);
    riskScore += exposureRatio * 40;

    // Volatility contributes to risk
    riskScore += volatility * 30;

    // Risk level multiplier
    const riskMultiplier = {
      'low': 1,
      'medium': 1.5,
      'high': 2,
      'critical': 3
    };
    riskScore *= riskMultiplier[exposure.risk_level] || 1;

    // Hedged amount reduces risk
    const hedgeRatio = exposure.hedged_amount / (exposure.total_exposure || 1);
    riskScore *= (1 - hedgeRatio);

    return Math.min(100, Math.max(0, riskScore));
  }
}

// Export convenience functions
export const formatCurrency = EnhancedCurrencyUtils.formatCurrency.bind(EnhancedCurrencyUtils);
export const convertAmount = EnhancedCurrencyUtils.convertAmount.bind(EnhancedCurrencyUtils);
export const parseCurrency = EnhancedCurrencyUtils.parseCurrency.bind(EnhancedCurrencyUtils);
export const requiresReporting = EnhancedCurrencyUtils.requiresReporting.bind(EnhancedCurrencyUtils);
export const getCurrencyInfo = EnhancedCurrencyUtils.getCurrencyInfo.bind(EnhancedCurrencyUtils);