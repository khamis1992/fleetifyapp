/**
 * useContractCalculations Hook
 *
 * React hook for comprehensive contract financial calculations
 * including monthly payments, revenue projections, fees, profitability analysis,
 * and contract validation with caching and error handling.
 */

import { useState, useCallback, useMemo } from 'react';
import { Contract, FinancialTerms } from '@/types/contract';
import {
  calculateMonthlyPayment,
  calculateTotalRevenue,
  calculateLateFees,
  calculateEarlyTerminationFee,
  calculateProRatedRevenue,
  calculateContractProfitability,
  calculateDiscountAmount,
  generateContractSummary,
  validateContractFinancials,
  MonthlyPaymentResult,
  TotalRevenueResult,
  LateFeesResult,
  EarlyTerminationResult,
  ProRatedRevenueResult,
  OperationalCosts,
  ProfitabilityResult,
  DiscountResult,
  ContractSummary,
} from '@/lib/contract-calculations';

interface ContractCalculationState {
  monthlyPayment?: MonthlyPaymentResult;
  totalRevenue?: TotalRevenueResult;
  lateFees?: LateFeesResult;
  earlyTerminationFee?: EarlyTerminationResult;
  proRatedRevenue?: ProRatedRevenueResult;
  profitability?: ProfitabilityResult;
  discount?: DiscountResult;
  summary?: ContractSummary;
  validation: {
    isValid: boolean;
    errors: string[];
  };
  loading: boolean;
  error?: string;
}

interface BatchCalculationResult {
  contractId: string;
  contractStatus?: string;
  monthlyPayment?: MonthlyPaymentResult;
  totalRevenue?: TotalRevenueResult;
  profitability?: ProfitabilityResult;
  error?: string;
}

export interface UseContractCalculationsOptions {
  enableCaching?: boolean;
  autoValidate?: boolean;
  batchSize?: number;
}

export function useContractCalculations(
  contract: Contract | Contract[] | null,
  options: UseContractCalculationsOptions = {}
) {
  const {
    enableCaching = true,
    autoValidate = true,
    batchSize = 50,
  } = options;

  const [state, setState] = useState<ContractCalculationState>({
    validation: {
      isValid: true,
      errors: [],
    },
    loading: false,
  });

  // Cache for calculation results
  const cache = useMemo(() => new Map<string, any>(), []);

  // Error handler
  const handleError = useCallback((error: Error, context: string) => {
    const errorMessage = `${context}: ${error.message}`;
    setState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false,
    }));
    console.error(errorMessage, error);
  }, []);

  // Get cache key for calculations
  const getCacheKey = useCallback((contract: Contract, calculation: string, params: any = {}) => {
    const keyData = {
      id: contract.id,
      monthly_rate: contract.monthly_rate,
      start_date: contract.start_date,
      end_date: contract.end_date,
      financial_terms: contract.financial_terms,
      calculation,
      params,
    };
    return JSON.stringify(keyData);
  }, []);

  // Calculate monthly payment
  const calculateMonthlyPayment = useCallback(() => {
    if (!contract || Array.isArray(contract)) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const cacheKey = getCacheKey(contract, 'monthlyPayment');
      if (enableCaching && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        setState(prev => ({
          ...prev,
          monthlyPayment: cachedResult,
          loading: false,
        }));
        return cachedResult;
      }

      const result = calculateMonthlyPayment(contract);

      if (enableCaching) {
        cache.set(cacheKey, result);
      }

      setState(prev => ({
        ...prev,
        monthlyPayment: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Monthly payment calculation failed');
      return null;
    }
  }, [contract, enableCaching, cache, getCacheKey, handleError]);

  // Calculate total revenue
  const calculateTotalRevenue = useCallback(() => {
    if (!contract || Array.isArray(contract)) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const cacheKey = getCacheKey(contract, 'totalRevenue');
      if (enableCaching && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        setState(prev => ({
          ...prev,
          totalRevenue: cachedResult,
          loading: false,
        }));
        return cachedResult;
      }

      const result = calculateTotalRevenue(contract);

      if (enableCaching) {
        cache.set(cacheKey, result);
      }

      setState(prev => ({
        ...prev,
        totalRevenue: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Total revenue calculation failed');
      return null;
    }
  }, [contract, enableCaching, cache, getCacheKey, handleError]);

  // Calculate late fees
  const calculateLateFees = useCallback((overdueAmount: number, daysLate: number) => {
    if (!contract || Array.isArray(contract)) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const cacheKey = getCacheKey(contract, 'lateFees', { overdueAmount, daysLate });
      if (enableCaching && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        setState(prev => ({
          ...prev,
          lateFees: cachedResult,
          loading: false,
        }));
        return cachedResult;
      }

      const result = calculateLateFees(overdueAmount, daysLate, contract.financial_terms.late_fee_rate);

      if (enableCaching) {
        cache.set(cacheKey, result);
      }

      setState(prev => ({
        ...prev,
        lateFees: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Late fee calculation failed');
      return null;
    }
  }, [contract, enableCaching, cache, getCacheKey, handleError]);

  // Calculate early termination fee
  const calculateEarlyTerminationFee = useCallback((monthsCompleted: number) => {
    if (!contract || Array.isArray(contract)) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const cacheKey = getCacheKey(contract, 'earlyTermination', { monthsCompleted });
      if (enableCaching && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        setState(prev => ({
          ...prev,
          earlyTerminationFee: cachedResult,
          loading: false,
        }));
        return cachedResult;
      }

      const result = calculateEarlyTerminationFee(contract, monthsCompleted);

      if (enableCaching) {
        cache.set(cacheKey, result);
      }

      setState(prev => ({
        ...prev,
        earlyTerminationFee: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Early termination fee calculation failed');
      return null;
    }
  }, [contract, enableCaching, cache, getCacheKey, handleError]);

  // Calculate pro-rated revenue
  const calculateProRatedRevenue = useCallback((billingDays: number) => {
    if (!contract || Array.isArray(contract)) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const cacheKey = getCacheKey(contract, 'proRatedRevenue', { billingDays });
      if (enableCaching && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        setState(prev => ({
          ...prev,
          proRatedRevenue: cachedResult,
          loading: false,
        }));
        return cachedResult;
      }

      const result = calculateProRatedRevenue(contract, billingDays);

      if (enableCaching) {
        cache.set(cacheKey, result);
      }

      setState(prev => ({
        ...prev,
        proRatedRevenue: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Pro-rated revenue calculation failed');
      return null;
    }
  }, [contract, enableCaching, cache, getCacheKey, handleError]);

  // Calculate profitability
  const calculateProfitability = useCallback((operationalCosts: OperationalCosts) => {
    if (!contract || Array.isArray(contract)) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const cacheKey = getCacheKey(contract, 'profitability', operationalCosts);
      if (enableCaching && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        setState(prev => ({
          ...prev,
          profitability: cachedResult,
          loading: false,
        }));
        return cachedResult;
      }

      const result = calculateContractProfitability(contract, operationalCosts);

      if (enableCaching) {
        cache.set(cacheKey, result);
      }

      setState(prev => ({
        ...prev,
        profitability: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Profitability calculation failed');
      return null;
    }
  }, [contract, enableCaching, cache, getCacheKey, handleError]);

  // Calculate discount
  const calculateDiscount = useCallback((originalAmount: number, discountRate: number) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const cacheKey = getCacheKey(
        contract as Contract,
        'discount',
        { originalAmount, discountRate }
      );
      if (enableCaching && cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        setState(prev => ({
          ...prev,
          discount: cachedResult,
          loading: false,
        }));
        return cachedResult;
      }

      const result = calculateDiscountAmount(originalAmount, discountRate);

      if (enableCaching) {
        cache.set(cacheKey, result);
      }

      setState(prev => ({
        ...prev,
        discount: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Discount calculation failed');
      return null;
    }
  }, [contract, enableCaching, cache, getCacheKey, handleError]);

  // Validate contract
  const validateContract = useCallback(async () => {
    if (!contract || Array.isArray(contract)) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const result = validateContractFinancials(contract);

      setState(prev => ({
        ...prev,
        validation: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Contract validation failed');
      return null;
    }
  }, [contract, handleError]);

  // Generate contract summary
  const generateSummary = useCallback((operationalCosts?: OperationalCosts) => {
    if (!contract || Array.isArray(contract)) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const result = generateContractSummary(contract, operationalCosts);

      setState(prev => ({
        ...prev,
        summary: result,
        loading: false,
      }));

      return result;
    } catch (error) {
      handleError(error as Error, 'Contract summary generation failed');
      return null;
    }
  }, [contract, handleError]);

  // Batch calculations for multiple contracts
  const batchCalculate = useCallback(async (
    contracts: Contract[]
  ): Promise<BatchCalculationResult[]> => {
    if (!contracts.length) return [];

    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      const results: BatchCalculationResult[] = [];

      // Process contracts in batches to avoid overwhelming the system
      for (let i = 0; i < contracts.length; i += batchSize) {
        const batch = contracts.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (contract) => {
            try {
              const monthlyPayment = calculateMonthlyPayment(contract);
              const totalRevenue = calculateTotalRevenue(contract);
              const profitability = operationalCosts
                ? calculateContractProfitability(contract, operationalCosts)
                : undefined;

              return {
                contractId: contract.id,
                contractStatus: contract.status,
                monthlyPayment,
                totalRevenue,
                profitability,
              };
            } catch (error) {
              return {
                contractId: contract.id,
                error: (error as Error).message,
              };
            }
          })
        );

        results.push(...batchResults);

        // Small delay between batches to prevent blocking
        if (i + batchSize < contracts.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      setState(prev => ({ ...prev, loading: false }));

      return results;
    } catch (error) {
      handleError(error as Error, 'Batch calculation failed');
      return [];
    }
  }, [batchSize, handleError]);

  // Auto-validate on mount if enabled
  React.useEffect(() => {
    if (autoValidate && contract && !Array.isArray(contract)) {
      validateContract();
    }
  }, [autoValidate, contract, validateContract]);

  // Clear cache
  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      validation: {
        isValid: true,
        errors: [],
      },
      loading: false,
    });
    clearCache();
  }, [clearCache]);

  return {
    // State
    ...state,

    // Calculation methods
    calculateMonthlyPayment,
    calculateTotalRevenue,
    calculateLateFees,
    calculateEarlyTerminationFee,
    calculateProRatedRevenue,
    calculateProfitability,
    calculateDiscount,
    validateContract,
    generateSummary,
    batchCalculate,

    // Utility methods
    clearCache,
    reset,

    // Computed values
    isCalculating: state.loading,
    hasErrors: !!state.error,
    isValid: state.validation.isValid,
    validationErrors: state.validation.errors,
  };
}