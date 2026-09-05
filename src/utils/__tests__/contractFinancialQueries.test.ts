import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshContractFinancialQueries } from '../contractFinancialQueries';

const scope = { contractId: 'contract-1', contractNumber: 'LTO-FIXTURE', companyId: 'company-1' };
const affected = [
  ['contract-details', scope.contractNumber, scope.companyId],
  ['contract-details', scope.contractId, scope.companyId],
  ['contract-invoices', scope.contractId, '2026-01-01'],
  ['contract-payments', scope.contractId, true, 'invoice-1'],
  ['payment-schedules', scope.contractId, null, scope.companyId],
  ['contract-audit-logs', scope.contractId, scope.companyId],
  ['canonical-rental-month-summary', scope.companyId, '2026-08'],
];
const unaffected = [
  ['contract-details', 'LTO-OTHER', scope.companyId],
  ['contract-details', scope.contractNumber, 'other-company'],
  ['contract-invoices', 'other-contract'],
  ['contract-payments', 'other-contract'],
  ['payment-schedules', 'other-contract', null, scope.companyId],
  ['contract-audit-logs', scope.contractId, 'other-company'],
  ['contract-financial-refresh', scope.contractId, scope.companyId],
  ['canonical-rental-month-summary', 'other-company', '2026-08'],
];
let client: QueryClient;
let unsubscribe: (() => void)[];
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  unsubscribe = [];
  for (const key of [...affected, ...unaffected]) client.setQueryData(key, { value: 'old' });
});
afterEach(() => { unsubscribe.forEach((fn) => fn()); client.clear(); });

describe('contract details post-payment refresh', () => {
  it('marks every affected read model stale without touching other contracts or the sync command', async () => {
    await refreshContractFinancialQueries(client, scope);
    for (const key of affected) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of unaffected) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('awaits active readers and uses their new results rather than fabricating a paid state', async () => {
    const readers = affected.map((queryKey, index) => {
      const queryFn = vi.fn(async () => ({ value: `fresh-${index}` }));
      const observer = new QueryObserver(client, { queryKey, queryFn });
      unsubscribe.push(observer.subscribe(() => {}));
      return queryFn;
    });
    await refreshContractFinancialQueries(client, scope);
    affected.forEach((key, index) => {
      expect(readers[index]).toHaveBeenCalledTimes(1);
      expect(client.getQueryData(key)).toEqual({ value: `fresh-${index}` });
    });
  });

  it('refreshes the other readers and reports a failed read without retrying a financial command', async () => {
    const readers = affected.map((queryKey, index) => {
      const queryFn = vi.fn(async () => {
        if (index === 2) throw new Error('invoice read failed');
        return { value: 'fresh' };
      });
      const observer = new QueryObserver(client, { queryKey, queryFn });
      unsubscribe.push(observer.subscribe(() => {}));
      return queryFn;
    });
    await expect(refreshContractFinancialQueries(client, scope)).rejects.toThrow('تعذر تحديث بعض بيانات');
    readers.forEach((reader) => expect(reader).toHaveBeenCalledTimes(1));
    expect(client.getQueryState(affected[2])?.status).toBe('error');
    expect(client.getQueryData(affected[0])).toEqual({ value: 'fresh' });
    for (const key of unaffected) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('does not issue a broad invalidation for incomplete scope', async () => {
    await expect(refreshContractFinancialQueries(client, { ...scope, contractId: '' })).rejects.toThrow('تعذر تحديد');
    for (const key of [...affected, ...unaffected]) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  });
});
