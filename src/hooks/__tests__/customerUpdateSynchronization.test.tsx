import { act, renderHook, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useCustomerOperations } from '../business/useCustomerOperations';

const mocks = vi.hoisted(() => ({ from: vi.fn(), audit: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: 'company-1', user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useCustomerDuplicateCheck', () => ({ useCustomerDuplicateCheck: vi.fn() }));
vi.mock('@/lib/auditLogger', () => ({ auditLogger: { logCustomer: mocks.audit } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const customerId = '11111111-1111-4111-8111-111111111111';
const original = { id: customerId, company_id: 'company-1', first_name_ar: 'عميل', last_name_ar: 'اختباري', customer_type: 'individual', nationality: null, phone: '00000000' };
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.audit.mockResolvedValue(undefined);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); });
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

it('persists the entered field then updates client, contract and lawsuit readers before resolving', async () => {
  let stored: Record<string, unknown> = { ...original };
  const update = vi.fn((fields) => { stored = { ...stored, ...fields }; return query; });
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), single: vi.fn(async () => ({ data: { ...stored }, error: null })), update };
  mocks.from.mockReturnValue(query);
  const keys = [
    ['customer-details-new', customerId, 'company-1'],
    ['contract-details', 'TEST-CONTRACT', 'company-1'],
    ['lawsuit-contract-details', 'contract-1', 'company-1'],
  ];
  const stops = keys.map((key) => {
    client.setQueryData(key, { customer_id: customerId, customer: original });
    return new QueryObserver(client, { queryKey: key, queryFn: async () => ({ customer_id: customerId, customer: { ...stored } }) }).subscribe(() => {});
  });
  try {
    const { result } = renderHook(() => useCustomerOperations({ enableDuplicateCheck: false }), { wrapper });
    await act(async () => { await result.current.updateCustomer.mutateAsync({ id: customerId, nationality: 'مصري' }); });
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][0]).toMatchObject({ nationality: 'مصري', updated_by: 'user-1' });
    expect(update.mock.calls[0][0]).not.toHaveProperty('phone');
    expect(update.mock.calls[0][0]).not.toHaveProperty('first_name_ar');
    expect(query.eq).toHaveBeenCalledWith('company_id', 'company-1');
    for (const key of keys) expect(client.getQueryData(key)).toMatchObject({ customer: { nationality: 'مصري', phone: '00000000' } });
    expect(mocks.audit).toHaveBeenCalledOnce();
  } finally { stops.forEach((stop) => stop()); }
});

describe('failed customer saves', () => {
  it('leaves dependent caches unchanged when the database rejects the update', async () => {
    const key = ['customer-details-new', customerId, 'company-1'];
    client.setQueryData(key, original);
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query), update: vi.fn(() => query),
      single: vi.fn().mockResolvedValueOnce({ data: original, error: null }).mockResolvedValueOnce({ data: null, error: new Error('permission denied') }),
    };
    mocks.from.mockReturnValue(query);
    const { result } = renderHook(() => useCustomerOperations(), { wrapper });
    await act(async () => {
      await expect(result.current.updateCustomer.mutateAsync({ id: customerId, nationality: 'مصري' })).rejects.toThrow('permission denied');
    });
    expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    expect(client.getQueryData(key)).toEqual(original);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
