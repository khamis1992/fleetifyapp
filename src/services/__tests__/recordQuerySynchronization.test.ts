import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyRecordChange, refreshRecordReaders, subscribeToRecordChanges, type RecordChange } from '../recordQuerySynchronization';

const change: RecordChange = { entity: 'customer', companyId: 'company-1', recordId: 'customer-1' };
const clients: QueryClient[] = [];
const createClient = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  return client;
};
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); });

describe('shared record read synchronization', () => {
  it('refreshes all memo evidence readers after stale facts are detected within the same contract and company', async () => {
    const client = createClient();
    for (const root of ['contract-reminder-history', 'contract-traffic-violations', 'contract-document',
      'contract-violation-evidence-documents', 'legal-claim-projection', 'lawsuit-contract-details']) {
      for (const [contract, company] of [['contract-1', 'company-1'], ['contract-2', 'company-1'], ['contract-1', 'company-2']]) {
        client.setQueryData([root, contract, company], { keep: true });
      }
    }
    await notifyRecordChange(client, { entity: 'documents', companyId: 'company-1', recordId: 'contract-1' });
    for (const root of ['contract-reminder-history', 'contract-traffic-violations', 'contract-document',
      'contract-violation-evidence-documents', 'legal-claim-projection', 'lawsuit-contract-details']) {
      expect(client.getQueryState([root, 'contract-1', 'company-1'])?.isInvalidated).toBe(true);
      expect(client.getQueryState([root, 'contract-2', 'company-1'])?.isInvalidated).toBe(false);
      expect(client.getQueryState([root, 'contract-1', 'company-2'])?.isInvalidated).toBe(false);
    }
  });

  it('invalidates actual customer, CRM, contract and lawsuit keys including legacy nested keys', async () => {
    const client = createClient();
    const keys = [
      ['customer-details-new', 'customer-1', 'company-1'],
      ['customer-details-split', 'customer-1'],
      ['customers', 'detail', 'customer-1'],
      ['customers', 'list', { companyId: 'company-1' }],
      [['customers'], 'company-1', false, '', 20],
      [['customer'], 'company-1', 'customer-1', false],
      ['crm-customers-optimized', 'company-1'],
      ['legal-delinquency-manual-candidates', 'company-1', '', 0],
      ['batch-filing-candidates', 'company-1', 0],
      ['customer-contracts-new', 'customer-1', 'company-1'],
      ['contract-details', 'TEST-CONTRACT', 'company-1'],
      [['contracts'], 'company-1', 'active'],
      ['lawsuit-contract-details', 'contract-1', 'company-1'],
    ];
    const original = { company_id: 'company-1', customer_id: 'customer-1', customer: { nationality: null }, accounts: ['keep'], data: [], count: 20 };
    keys.forEach((key) => client.setQueryData(key, original));
    await notifyRecordChange(client, change);
    keys.forEach((key) => {
      expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true);
      expect(client.getQueryData(key)).toEqual(original);
    });
  });

  it('does not refresh another company, unrelated customer or a financial command', async () => {
    const client = createClient();
    const keys = [
      ['customer-details-new', 'customer-1', 'company-2'],
      ['customer-details-new', 'customer-2', 'company-1'],
      [['customer'], 'company-1', 'customer-2'],
      [['customers'], 'company-2'],
      ['customers', 'list', { companyId: 'company-2' }],
      ['crm-customers-optimized', 'company-2'],
      ['legal-delinquency-manual-candidates', 'company-2', '', 0],
      ['batch-filing-candidates', 'company-2', 0],
      ['lawsuit-contract-details', 'contract-1', 'company-2'],
      ['contract-financial-refresh', 'contract-1', 'company-1'],
      ['financial-workspace', 'company-1'],
    ];
    keys.forEach((key) => client.setQueryData(key, { keep: true }));
    const unrelatedContract = ['contract-details', 'OTHER-CONTRACT', 'company-1'];
    client.setQueryData(unrelatedContract, { company_id: 'company-1', customer_id: 'customer-2' });
    await notifyRecordChange(client, change);
    [...keys, unrelatedContract].forEach((key) => expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(false));
  });

  it('refetches mounted pages from their own readers and preserves nested joins', async () => {
    const client = createClient();
    const keys = [
      ['customer-details-new', 'customer-1', 'company-1'],
      ['contract-details', 'TEST-CONTRACT', 'company-1'],
      ['lawsuit-contract-details', 'contract-1', 'company-1'],
    ];
    const old = { company_id: 'company-1', customer_id: 'customer-1', nationality: null };
    const values = [
      { ...old, nationality: 'مصري', customer_accounts: ['account'] },
      { ...old, customer: { nationality: 'مصري' }, vehicle: { plate_number: 'TEST' } },
      { contract: old, customer: { id: 'customer-1', nationality: 'مصري' }, vehicle: { plate_number: 'TEST' } },
    ];
    const stops = keys.map((key, index) => {
      client.setQueryData(key, old);
      return new QueryObserver(client, { queryKey: key, queryFn: async () => values[index] }).subscribe(() => {});
    });
    try {
      await notifyRecordChange(client, change);
      keys.forEach((key, index) => expect(client.getQueryData(key)).toEqual(values[index]));
    } finally { stops.forEach((stop) => stop()); }
  });

  it('cancels a read started before the save so its late response cannot restore old data', async () => {
    const client = createClient();
    const key = ['customer-details-new', 'customer-1', 'company-1'];
    client.setQueryData(key, { nationality: null });
    let finishOld: (value: { nationality: null }) => void = () => {};
    const read = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValue({ nationality: 'مصري' });
    const stop = new QueryObserver(client, { queryKey: key, queryFn: read }).subscribe(() => {});
    try {
      const oldRequest = client.refetchQueries({ queryKey: key });
      await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
      await notifyRecordChange(client, change);
      finishOld({ nationality: null });
      await oldRequest;
      expect(client.getQueryData(key)).toEqual({ nationality: 'مصري' });
      expect(read).toHaveBeenCalledTimes(2);
    } finally { stop(); }
  });

  it('refreshes saved legal and vehicle information without marking readiness complete locally', async () => {
    const client = createClient();
    const key = ['legal-case-litigation-profile', 'contract-1', 'company-1'];
    const otherKey = ['legal-case-litigation-profile', 'contract-2', 'company-1'];
    client.setQueryData(key, { legal_review_status: 'draft' });
    client.setQueryData(otherKey, { legal_review_status: 'draft' });
    await notifyRecordChange(client, { entity: 'legal', companyId: 'company-1', recordId: 'contract-1' });
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
    expect(client.getQueryData(key)).toEqual({ legal_review_status: 'draft' });
    const vehicleContract = ['lawsuit-contract-details', 'contract-1', 'company-1'];
    client.setQueryData(vehicleContract, { contract: { vehicle_id: 'vehicle-1' } });
    await notifyRecordChange(client, { entity: 'vehicle', companyId: 'company-1', recordId: 'vehicle-1' });
    expect(client.getQueryState(vehicleContract)?.isInvalidated).toBe(true);
  });

  it('does not turn a read failure into a failed write or replace the last known data', async () => {
    const client = createClient();
    const key = ['customer-details-new', 'customer-1', 'company-1'];
    client.setQueryData(key, { nationality: null });
    const stop = new QueryObserver(client, { queryKey: key, queryFn: async () => { throw new Error('offline'); } }).subscribe(() => {});
    try {
      await expect(refreshRecordReaders(client, change)).resolves.toBeUndefined();
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
      expect(client.getQueryState(key)?.status).toBe('error');
      expect(client.getQueryData(key)).toEqual({ nationality: null });
    } finally { stop(); }
  });

  it('broadcasts only identifiers and refreshes other tabs once without echoing or crossing companies', async () => {
    const first = createClient();
    const second = createClient();
    const key = ['customer-details-new', 'customer-1', 'company-1'];
    second.setQueryData(key, { nationality: null });
    const channel = () => ({ onmessage: null as ((event: MessageEvent<unknown>) => void) | null, postMessage: vi.fn(), close: vi.fn() });
    const a = channel(); const b = channel();
    a.postMessage.mockImplementation((data) => b.onmessage?.({ data } as MessageEvent));
    const stopA = subscribeToRecordChanges(first, 'company-1', () => a);
    const stopB = subscribeToRecordChanges(second, 'company-1', () => b);
    try {
      b.onmessage?.({ data: { ...change, companyId: 'company-2' } } as MessageEvent);
      b.onmessage?.({ data: { entity: 'customer' } } as MessageEvent);
      expect(second.getQueryState(key)?.isInvalidated).toBe(false);
      await notifyRecordChange(first, change);
      await vi.waitFor(() => expect(second.getQueryState(key)?.isInvalidated).toBe(true));
      expect(a.postMessage).toHaveBeenCalledExactlyOnceWith(change);
      expect(b.postMessage).not.toHaveBeenCalled();
    } finally { stopA(); stopB(); }
    expect(a.close).toHaveBeenCalledOnce();
    expect(b.onmessage).toBeNull();
  });
});
