import type { QueryClient } from '@tanstack/react-query';

const financialReaders = new Set([
  'financial-workspace',
  'customer-collection-summary',
  'financial-overview',
  'financialSummary',
  'financialAnalysis',
  'accountBalances',
  'accountMovements',
  'trialBalance',
  'costCenterAnalysis',
  'financial-integrity-report',
  'treasury-summary',
  'balanceSheet',
  'incomeStatement',
  'advanced-financial-analytics',
  'advanced-financial-ratios',
  'enhancedJournalEntries',
  'journalEntryLines',
  'banks',
  'bank-transactions',
]);

/** Business mutations in any department can affect financial read models. */
export function subscribeToFinancialChanges(client: QueryClient) {
  return client.getMutationCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'success') {
      void client.invalidateQueries({
        predicate: (query) => financialReaders.has(String(query.queryKey[0])),
      });
    }
  });
}
