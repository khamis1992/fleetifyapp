import { useFinancialAnalysis } from './useFinancialAnalysis';

/** Shared accounting basis for all ratio views; no account-code assumptions. */
export function useAdvancedFinancialRatios(startDate?: string, endDate?: string) {
  return useFinancialAnalysis({ dateFrom: startDate, dateTo: endDate });
}
