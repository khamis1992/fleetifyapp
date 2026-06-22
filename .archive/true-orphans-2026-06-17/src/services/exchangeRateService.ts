/**
 * Exchange Rate Service
 * FIN-003: Multi-Currency and Compliance System
 *
 * Provides real-time exchange rate management, currency conversion,
 * and exposure tracking for FleetifyApp financial operations.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ExchangeRate,
  CurrencyConversionRequest,
  CurrencyConversionResult,
  CurrencyExposureReport,
  HedgingRecommendation
} from '@/types/finance.types';

// Configuration for exchange rate providers
const EXCHANGE_RATE_PROVIDERS = {
  fixer_io: {
    baseUrl: 'https://api.fixer.io/latest',
    apiKey: import.meta.env.VITE_FIXER_API_KEY,
    supportedCurrencies: ['EUR', 'USD', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'JPY', 'SEK', 'NZD'],
    baseCurrency: 'EUR'
  },
  exchangerate_api: {
    baseUrl: 'https://v6.exchangerate-api.com/v6/latest',
    apiKey: import.meta.env.VITE_EXCHANGERATE_API_KEY,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD'],
    baseCurrency: 'USD'
  }
};

export class ExchangeRateService {
  private static instance: ExchangeRateService;
  private cache: Map<string, { rate: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  /**
   * Get current exchange rate between two currencies
   */
  public async getCurrentRate(
    fromCurrency: string,
    toCurrency: string,
    companyId?: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const cacheKey = `${fromCurrency}-${toCurrency}-${companyId || 'global'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.rate;
    }

    try {
      // Try database first
      const dbRate = await this.getRateFromDatabase(fromCurrency, toCurrency, companyId);
      if (dbRate !== null) {
        this.cache.set(cacheKey, { rate: dbRate, timestamp: Date.now() });
        return dbRate;
      }

      // If not in database, fetch from API
      const apiRate = await this.fetchRateFromAPI(fromCurrency, toCurrency);
      if (apiRate !== null) {
        // Store in database and cache
        await this.saveRateToDatabase(fromCurrency, toCurrency, apiRate, companyId);
        this.cache.set(cacheKey, { rate: apiRate, timestamp: Date.now() });
        return apiRate;
      }

      throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      throw error;
    }
  }

  /**
   * Convert amount from one currency to another
   */
  public async convertCurrency(
    request: CurrencyConversionRequest
  ): Promise<CurrencyConversionResult> {
    const { amount, from_currency, to_currency, date, company_id } = request;

    if (from_currency === to_currency) {
      return {
        original_amount: amount,
        original_currency: from_currency,
        converted_amount: amount,
        target_currency: to_currency,
        exchange_rate: 1,
        conversion_date: date || new Date().toISOString(),
        rate_source: 'direct'
      };
    }

    try {
      let rate: number;
      let source: string;

      if (date) {
        // Get historical rate for specific date
        rate = await this.getHistoricalRate(from_currency, to_currency, date, company_id);
        source = 'historical';
      } else {
        // Get current rate
        rate = await this.getCurrentRate(from_currency, to_currency, company_id);
        source = 'current';
      }

      const convertedAmount = Math.round(amount * rate * 100) / 100; // Round to 2 decimal places

      return {
        original_amount: amount,
        original_currency: from_currency,
        converted_amount: convertedAmount,
        target_currency: to_currency,
        exchange_rate: rate,
        conversion_date: date || new Date().toISOString(),
        rate_source: source
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  }

  /**
   * Get historical exchange rate for a specific date
   */
  public async getHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: string,
    companyId?: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('convert_currency', {
        p_amount: 1,
        p_from_currency: fromCurrency,
        p_to_currency: toCurrency,
        p_company_id: companyId,
        p_date: date
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error getting historical rate:', error);
      throw error;
    }
  }

  /**
   * Update exchange rates from API providers
   */
  public async updateExchangeRates(companyId?: string): Promise<void> {
    const baseCurrencies = ['USD', 'EUR'];
    const targetCurrencies = ['QAR', 'SAR', 'KWD', 'AED', 'BHD', 'OMR'];

    for (const base of baseCurrencies) {
      for (const target of targetCurrencies) {
        try {
          const rate = await this.fetchRateFromAPI(base, target);
          if (rate !== null) {
            await this.saveRateToDatabase(base, target, rate, companyId);
          }
        } catch (error) {
          console.error(`Failed to update rate ${base} to ${target}:`, error);
        }
      }
    }
  }

  /**
   * Calculate currency exposure for a company
   */
  public async calculateCurrencyExposure(companyId: string): Promise<CurrencyExposureReport[]> {
    try {
      const { data, error } = await supabase.rpc('calculate_currency_exposure', {
        p_company_id: companyId
      });

      if (error) throw error;

      const exposureReports: CurrencyExposureReport[] = (data || []).map((row: any) => ({
        currency: row.currency,
        total_exposure: row.total_exposure,
        receivables: row.receivables,
        payables: row.payables,
        investments: row.investments,
        loans: row.loans,
        hedged_amount: row.hedged_amount,
        net_exposure: row.net_exposure,
        risk_level: this.calculateRiskLevel(row.net_exposure, row.total_exposure),
        hedging_recommendations: this.generateHedgingRecommendations(row)
      }));

      return exposureReports;
    } catch (error) {
      console.error('Error calculating currency exposure:', error);
      throw error;
    }
  }

  /**
   * Get supported currencies for a company
   */
  public async getSupportedCurrencies(companyId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('currency_configurations')
        .select('supported_currencies')
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data?.supported_currencies || ['QAR', 'KWD', 'SAR', 'AED', 'USD', 'EUR'];
    } catch (error) {
      console.error('Error getting supported currencies:', error);
      return ['QAR', 'KWD', 'SAR', 'AED', 'USD', 'EUR'];
    }
  }

  /**
   * Get exchange rate history for analysis
   */
  public async getExchangeRateHistory(
    fromCurrency: string,
    toCurrency: string,
    startDate: string,
    endDate: string,
    companyId?: string
  ): Promise<ExchangeRate[]> {
    try {
      let query = supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .gte('effective_date', startDate)
        .lte('effective_date', endDate)
        .eq('is_active', true)
        .order('effective_date', { ascending: true });

      if (companyId) {
        query = query.eq('company_id', companyId);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting exchange rate history:', error);
      throw error;
    }
  }

  // Private methods

  private async getRateFromDatabase(
    fromCurrency: string,
    toCurrency: string,
    companyId?: string
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('get_current_exchange_rate', {
        p_from_currency: fromCurrency,
        p_to_currency: toCurrency,
        p_company_id: companyId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting rate from database:', error);
      return null;
    }
  }

  private async fetchRateFromAPI(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    // Try Fixer.io first
    try {
      if (EXCHANGE_RATE_PROVIDERS.fixer_io.apiKey) {
        const rate = await this.fetchFromFixer(fromCurrency, toCurrency);
        if (rate !== null) return rate;
      }
    } catch (error) {
      console.error('Fixer.io API failed:', error);
    }

    // Try ExchangeRate-API as fallback
    try {
      if (EXCHANGE_RATE_PROVIDERS.exchangerate_api.apiKey) {
        const rate = await this.fetchFromExchangeRateAPI(fromCurrency, toCurrency);
        if (rate !== null) return rate;
      }
    } catch (error) {
      console.error('ExchangeRate-API failed:', error);
    }

    return null;
  }

  private async fetchFromFixer(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    const config = EXCHANGE_RATE_PROVIDERS.fixer_io;
    const url = `${config.baseUrl}?access_key=${config.apiKey}&base=${fromCurrency}&symbols=${toCurrency}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.info || 'API request failed');
      }

      return data.rates[toCurrency] || null;
    } catch (error) {
      console.error('Fixer.io API error:', error);
      return null;
    }
  }

  private async fetchFromExchangeRateAPI(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    const config = EXCHANGE_RATE_PROVIDERS.exchangerate_api;
    const url = `${config.baseUrl}/${fromCurrency}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.result === 'error') {
        throw new Error(data['error-type'] || 'API request failed');
      }

      return data.conversion_rates[toCurrency] || null;
    } catch (error) {
      console.error('ExchangeRate-API error:', error);
      return null;
    }
  }

  private async saveRateToDatabase(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    companyId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .upsert({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: rate,
          source: 'fixer_io',
          effective_date: new Date().toISOString().split('T')[0],
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          is_active: true,
          company_id: companyId
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving rate to database:', error);
      throw error;
    }
  }

  private calculateRiskLevel(netExposure: number, totalExposure: number): 'low' | 'medium' | 'high' | 'critical' {
    const exposureRatio = Math.abs(netExposure) / totalExposure;

    if (exposureRatio > 0.8) return 'critical';
    if (exposureRatio > 0.6) return 'high';
    if (exposureRatio > 0.3) return 'medium';
    return 'low';
  }

  private generateHedgingRecommendations(exposure: any): HedgingRecommendation[] {
    const recommendations: HedgingRecommendation[] = [];
    const { currency, net_exposure } = exposure;

    if (Math.abs(net_exposure) > 10000) { // Threshold for recommending hedging
      // Forward contract recommendation
      recommendations.push({
        strategy: 'forward_contract',
        amount: Math.abs(net_exposure),
        maturity_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months
        estimated_cost: Math.abs(net_exposure) * 0.002, // 0.2% estimated cost
        risk_reduction: 0.95,
        description: `3-month forward contract to hedge ${currency} exposure`
      });

      // Natural hedging recommendation
      if (net_exposure > 0) {
        recommendations.push({
          strategy: 'natural_hedging',
          amount: net_exposure * 0.5,
          maturity_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 months
          estimated_cost: 0,
          risk_reduction: 0.7,
          description: `Natural hedging through matching ${currency} payables`
        });
      }
    }

    return recommendations;
  }
}

// Export singleton instance
export const exchangeRateService = ExchangeRateService.getInstance();