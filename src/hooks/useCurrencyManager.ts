/**
 * Currency Management Hook
 * FIN-003: Multi-Currency and Compliance System
 *
 * React hook for managing currency operations, conversions,
 * and compliance within FleetifyApp components.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { exchangeRateService } from '@/services/exchangeRateService';
import { complianceEngine } from '@/services/complianceEngine';
import { EnhancedCurrencyUtils } from '@/utils/enhancedCurrencyUtils';
import type {
  ExchangeRate,
  CurrencyConfiguration,
  CurrencyConversionResult,
  CurrencyExposureReport,
  ComplianceValidation
} from '@/types/finance.types';

interface UseCurrencyManagerOptions {
  companyId?: string;
  baseCurrency?: string;
  autoUpdateRates?: boolean;
}

export const useCurrencyManager = (options: UseCurrencyManagerOptions = {}) => {
  const {
    companyId,
    baseCurrency = 'QAR',
    autoUpdateRates = false
  } = options;

  const queryClient = useQueryClient();
  const [selectedCurrency, setSelectedCurrency] = useState<string>(baseCurrency);

  // Query keys
  const QUERY_KEYS = {
    exchangeRates: ['exchange_rates', companyId],
    currencyConfig: ['currency_config', companyId],
    currencyExposure: ['currency_exposure', companyId],
    supportedCurrencies: ['supported_currencies', companyId],
    recentConversions: ['recent_conversions', companyId]
  };

  // Get exchange rates
  const {
    data: exchangeRates,
    isLoading: ratesLoading,
    error: ratesError,
    refetch: refetchRates
  } = useQuery({
    queryKey: QUERY_KEYS.exchangeRates,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .eq('is_active', true)
        .order('effective_date', { ascending: false });

      if (error) throw error;
      return data as ExchangeRate[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: autoUpdateRates ? 30 * 60 * 1000 : false // 30 minutes if auto-update
  });

  // Get currency configuration
  const {
    data: currencyConfig,
    isLoading: configLoading,
    error: configError
  } = useQuery({
    queryKey: QUERY_KEYS.currencyConfig,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_configurations')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore not found errors

      return data as CurrencyConfiguration;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Get currency exposure
  const {
    data: currencyExposure,
    isLoading: exposureLoading,
    error: exposureError,
    refetch: refetchExposure
  } = useQuery({
    queryKey: QUERY_KEYS.currencyExposure,
    queryFn: async () => {
      if (!companyId) return [];
      return await exchangeRateService.calculateCurrencyExposure(companyId);
    },
    enabled: !!companyId,
    staleTime: 15 * 60 * 1000 // 15 minutes
  });

  // Get supported currencies
  const {
    data: supportedCurrencies,
    isLoading: currenciesLoading
  } = useQuery({
    queryKey: QUERY_KEYS.supportedCurrencies,
    queryFn: async () => {
      if (!companyId) return EnhancedCurrencyUtils.getSupportedCurrencies();
      return await exchangeRateService.getSupportedCurrencies(companyId);
    },
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000 // 1 hour
  });

  // Convert currency mutation
  const convertCurrencyMutation = useMutation({
    mutationFn: async (params: {
      amount: number;
      fromCurrency: string;
      toCurrency: string;
      date?: string;
    }) => {
      return await exchangeRateService.convertCurrency({
        amount: params.amount,
        from_currency: params.fromCurrency,
        to_currency: params.toCurrency,
        date: params.date,
        company_id: companyId
      });
    },
    onSuccess: (result) => {
      // Cache successful conversion
      queryClient.setQueryData(
        ['conversion', result.original_currency, result.target_currency],
        result
      );
    }
  });

  // Update exchange rates mutation
  const updateRatesMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID required');
      return await exchangeRateService.updateExchangeRates(companyId);
    },
    onSuccess: () => {
      // Refetch rates after update
      refetchRates();
    }
  });

  // Run compliance validation mutation
  const validateComplianceMutation = useMutation({
    mutationFn: async (params: {
      entityType: string;
      entityId: string;
      amount: number;
      currency: string;
    }) => {
      return await complianceEngine.runComplianceValidation({
        entityType: params.entityType,
        entityId: params.entityId,
        companyId: companyId!,
        ruleCategories: ['aml', 'tax']
      });
    }
  });

  // Utility functions
  const convertCurrency = useCallback(async (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    options?: { date?: string }
  ): Promise<CurrencyConversionResult> => {
    return convertCurrencyMutation.mutateAsync({
      amount,
      fromCurrency,
      toCurrency,
      date: options?.date
    });
  }, [convertCurrencyMutation]);

  const formatCurrency = useCallback((
    amount: number,
    currency?: string,
    options?: { locale?: string; showCode?: boolean }
  ): string => {
    return EnhancedCurrencyUtils.formatCurrency(
      amount,
      currency || selectedCurrency,
      options
    );
  }, [selectedCurrency]);

  const checkReportingRequirement = useCallback((
    amount: number,
    currency?: string,
    jurisdiction?: string
  ): boolean => {
    return EnhancedCurrencyUtils.requiresReporting(amount, currency || selectedCurrency, jurisdiction);
  }, [selectedCurrency]);

  const calculateGainLoss = useCallback((
    originalAmount: number,
    originalRate: number,
    currentRate: number,
    currency?: string
  ) => {
    return EnhancedCurrencyUtils.calculateGainLoss(
      originalAmount,
      originalRate,
      currentRate,
      currency || selectedCurrency
    );
  }, [selectedCurrency]);

  const validateCompliance = useCallback(async (
    entityType: string,
    entityId: string,
    amount: number,
    currency?: string
  ) => {
    return validateComplianceMutation.mutateAsync({
      entityType,
      entityId,
      amount,
      currency: currency || selectedCurrency
    });
  }, [validateComplianceMutation, selectedCurrency]);

  const getExchangeRate = useCallback(async (
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> => {
    return await exchangeRateService.getCurrentRate(fromCurrency, toCurrency, companyId);
  }, [companyId]);

  // Computed values
  const isLoading = ratesLoading || configLoading || exposureLoading || currenciesLoading;
  const error = ratesError || configError || exposureError;

  const currentRates = exchangeRates?.reduce((acc, rate) => {
    const key = `${rate.from_currency}-${rate.to_currency}`;
    acc[key] = rate.rate;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalExposure = currencyExposure?.reduce(
    (sum, exposure) => sum + Math.abs(exposure.total_exposure),
    0
  ) || 0;

  const highRiskCurrencies = currencyExposure?.filter(
    exposure => exposure.risk_level === 'high' || exposure.risk_level === 'critical'
  ) || [];

  // Effects
  useEffect(() => {
    if (currencyConfig?.base_currency) {
      setSelectedCurrency(currencyConfig.base_currency);
    }
  }, [currencyConfig]);

  // Auto-update rates effect
  useEffect(() => {
    if (autoUpdateRates && companyId) {
      const interval = setInterval(() => {
        updateRatesMutation.mutate();
      }, 60 * 60 * 1000); // Update every hour

      return () => clearInterval(interval);
    }
  }, [autoUpdateRates, companyId, updateRatesMutation]);

  return {
    // State
    selectedCurrency,
    setSelectedCurrency,

    // Data
    exchangeRates,
    currencyConfig,
    currencyExposure,
    supportedCurrencies,
    currentRates,

    // Computed values
    isLoading,
    error,
    totalExposure,
    highRiskCurrencies,

    // Mutations
    convertCurrencyMutation,
    updateRatesMutation,
    validateComplianceMutation,

    // Utility functions
    convertCurrency,
    formatCurrency,
    checkReportingRequirement,
    calculateGainLoss,
    validateCompliance,
    getExchangeRate,

    // Actions
    refetchRates,
    refetchExposure,
    updateRates: () => updateRatesMutation.mutate()
  };
};

// Hook for currency compliance tracking
export const useCurrencyCompliance = (companyId: string) => {
  const {
    data: complianceSummary,
    isLoading: complianceLoading,
    refetch: refetchCompliance
  } = useQuery({
    queryKey: ['compliance_summary', companyId],
    queryFn: async () => {
      return await complianceEngine.getDashboardSummary(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const {
    data: upcomingDeadlines,
    isLoading: deadlinesLoading
  } = useQuery({
    queryKey: ['compliance_deadlines', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_upcoming_compliance_deadlines',
        { p_company_id: companyId, p_days_ahead: 30 }
      );
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  return {
    complianceSummary,
    upcomingDeadlines,
    isLoading: complianceLoading || deadlinesLoading,
    refetchCompliance
  };
};

// Hook for real-time rate updates
export const useRealTimeRates = (currencies: string[], companyId?: string) => {
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currencies.length) return;

    const updateRates = async () => {
      const newRates: Record<string, number> = {};

      for (let i = 0; i < currencies.length; i++) {
        for (let j = 0; j < currencies.length; j++) {
          if (i !== j) {
            const key = `${currencies[i]}-${currencies[j]}`;
            try {
              const rate = await exchangeRateService.getCurrentRate(
                currencies[i],
                currencies[j],
                companyId
              );
              newRates[key] = rate;
            } catch (error) {
              console.error(`Failed to get rate for ${key}:`, error);
            }
          }
        }
      }

      setRates(prev => ({ ...prev, ...newRates }));
    };

    // Initial update
    updateRates();

    // Set up real-time subscription
    const subscription = supabase
      .channel('exchange_rates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'exchange_rates',
        filter: companyId ? `company_id=eq.${companyId}` : undefined
      }, () => {
        updateRates();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currencies, companyId]);

  return rates;
};

// Hook for currency risk monitoring
export const useCurrencyRiskMonitor = (companyId: string) => {
  const {
    data: exposureReports,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['currency_risk', companyId],
    queryFn: async () => {
      return await exchangeRateService.calculateCurrencyExposure(companyId);
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  });

  const {
    data: riskIndicators,
    isLoading: riskLoading
  } = useQuery({
    queryKey: ['risk_indicators', companyId],
    queryFn: async () => {
      if (!exposureReports) return null;
      return await EnhancedCurrencyUtils.getCurrencyRiskIndicators(exposureReports);
    },
    enabled: !!exposureReports,
    staleTime: 15 * 60 * 1000 // 15 minutes
  });

  return {
    exposureReports,
    riskIndicators,
    isLoading: isLoading || riskLoading,
    error,
    refetch
  };
};