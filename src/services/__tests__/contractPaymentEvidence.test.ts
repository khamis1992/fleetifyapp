import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/integrations/supabase/types';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { attributeContractPayments, fetchContractPaymentEvidence, fetchContractPaymentEvidenceBundle, contractPaymentEvidenceQueryOptions } from '../contractPaymentEvidence';
type Payment = Database['public']['Tables']['payments']['Row'];
type Allocation = Database['public']['Tables']['payment_allocations']['Row'];
type Row = { id: string; [key: string]: unknown };
const state = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, calls: [] as Array<{ table: string; filters: Array<[string, string, unknown]> }>, cap: 1, fail: '', finalAllocations: null as Row[] | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const filters: Array<[string, string, unknown]> = [];
  const chain = {
    select: () => chain, order: () => chain, limit: () => chain,
    eq: (key: string, value: unknown) => { filters.push(['eq', key, value]); return chain; },
    in: (key: string, value: unknown) => { filters.push(['in', key, value]); return chain; },
    gt: (key: string, value: unknown) => { filters.push(['gt', key, value]); return chain; },
    then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => {
      state.calls.push({ table, filters });
      if (state.fail && filters.some(([op, , value]) => op === 'gt' && value === state.fail)) return Promise.resolve({ data: null, error: new Error('later page failed') }).then(resolve, reject);
      const source = table === 'payment_allocations' && filters.some(([, key]) => key === 'payment_id')
        ? state.finalAllocations ?? state.tables[table] : state.tables[table];
      const rows = (source || []).filter((row) => filters.every(([op, key, value]) =>
        op === 'eq' ? row[key] === value : op === 'in' ? (value as unknown[]).includes(row[key]) : String(row[key]) > String(value)))
        .sort((a, b) => a.id.localeCompare(b.id)).slice(0, state.cap);
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    },
  };
  return chain;
} } }));
const scope = { companyId: 'co', contractId: 'contract', customerId: 'customer', invoiceIds: ['invoice'] };
const payment = (extra: Record<string, unknown> = {}) => ({ id: 'p', company_id: 'co', customer_id: 'customer', contract_id: 'contract', invoice_id: 'invoice', amount: 1000, payment_status: 'completed', transaction_type: 'receipt', ...extra }) as Payment;
const allocation = (extra: Record<string, unknown> = {}) => ({ id: 'a', company_id: 'co', payment_id: 'p', allocation_type: 'invoice', target_id: 'invoice', amount: 500, is_active: true, ...extra }) as Allocation;
const applications = (payments: Payment[], allocations: Allocation[]) => attributeContractPayments(scope, payments, allocations)[0].financial_applications;
beforeEach(() => { state.tables = { payments: [], payment_allocations: [] }; state.calls = []; state.cap = 1; state.fail = ''; state.finalAllocations = null; });

describe('contract payment attribution', () => {
  it('preserves gross and counts only this contract invoice amount', () => {
    const raw = payment();
    const result = attributeContractPayments(scope, [raw], [allocation(), allocation({ id: 'b', allocation_type: 'late_fee', amount: 100 }), allocation({ id: 'c', target_id: 'other-invoice', amount: 400 })]);
    expect(result[0].amount).toBe(1000);
    expect(result[0].financial_applications).toEqual([{ invoice_id: 'invoice', amount: 500 }]);
    expect(raw).not.toHaveProperty('financial_applications');
  });
  it.each(['pending', 'processing', 'cancelled', 'canceled', 'reversed', 'failed', 'unknown'])('does not settle from %s', (status) => {
    expect(applications([payment({ payment_status: status })], [allocation()])).toEqual([]);
  });
  it.each(['completed', 'paid', 'success', 'succeeded'])('accepts canonical success state %s', (status) => {
    expect(applications([payment({ payment_status: status })], [allocation()])).toEqual([{ invoice_id: 'invoice', amount: 500 }]);
  });
  it('excludes outbound transactions', () => expect(applications([payment({ transaction_type: 'payment' })], [])).toEqual([]));
  it('uses explicit contract allocations and does not add the gross direct link', () => {
    expect(applications([payment()], [allocation({ allocation_type: 'contract', target_id: 'contract' })])).toEqual([{ invoice_id: null, amount: 500 }]);
  });
  it('supports direct legacy receipts only without active allocations', () => {
    expect(applications([payment()], [allocation({ is_active: false })])).toEqual([{ invoice_id: 'invoice', amount: 1000 }]);
    expect(applications([payment({ invoice_id: null })], [])).toEqual([{ invoice_id: null, amount: 1000 }]);
    expect(applications([payment()], [allocation({ allocation_type: 'late_fee' })])).toEqual([]);
  });
  it('ignores stale direct links when allocated elsewhere', () => {
    expect(applications([payment()], [allocation({ target_id: 'other' })])).toEqual([]);
  });
  it.each([{ company_id: 'other' }, { customer_id: 'other' }, { customer_id: null }])('skips a mismatched receipt identity with a warning', (extra) => {
    const result = attributeContractPayments(scope, [payment(extra)], []);
    expect(result).toHaveLength(0);
    expect(result.integrityWarnings?.join(' ')).toContain('لا يطابق');
  });
  it.each([null, '', -1, Infinity, NaN, 0.001, true])('rejects invalid amount %s', (amount) => {
    expect(() => applications([payment({ amount })], [])).toThrow('غير صالح');
  });
  it('keeps over-allocation fatal and downgrades duplicate evidence to a warning', () => {
    expect(() => applications([payment()], [allocation({ amount: 1001 })])).toThrow('يتجاوز');
    const duplicated = attributeContractPayments(scope, [payment()], [allocation(), allocation()]);
    expect(duplicated).toHaveLength(1);
    expect(duplicated.integrityWarnings?.join(' ')).toContain('تكرار');
  });
  it('skips identity-mismatched legacy receipts with a warning instead of failing the read', () => {
    for (const extra of [{ company_id: 'other' }, { customer_id: 'other' }, { customer_id: null }]) {
      const result = attributeContractPayments(scope, [payment(extra)], []);
      expect(result).toHaveLength(0);
      expect(result.integrityWarnings?.join(' ')).toContain('لا يطابق');
    }
  });
  it('sums one duplicated receipt once with a warning', () => {
    const result = attributeContractPayments(scope, [payment(), payment()], []);
    expect(result).toHaveLength(1);
    expect(result.integrityWarnings?.join(' ')).toContain('مكررة');
  });
});

describe('complete contract payment source', () => {
  it('shares one evidence read across header and ledger observers even when invoice IDs are reordered', async () => {
    state.tables.payments = [payment()]; state.tables.payment_allocations = [allocation()];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const header = new QueryObserver(client, {
      ...contractPaymentEvidenceQueryOptions({ ...scope, invoiceIds: ['invoice', 'other', 'invoice'] }),
      select: (bundle) => bundle.payments,
    });
    const ledger = new QueryObserver(client, contractPaymentEvidenceQueryOptions({ ...scope, invoiceIds: ['other', 'invoice'] }));
    const offHeader = header.subscribe(() => {});
    const offLedger = ledger.subscribe(() => {});
    try {
      await vi.waitFor(() => expect(ledger.getCurrentResult().isSuccess).toBe(true));
      expect(client.getQueryCache().getAll()).toHaveLength(1);
      expect(header.getCurrentResult().data).toBe(ledger.getCurrentResult().data?.payments);
      expect(ledger.getCurrentResult().data?.allocations).toEqual([allocation()]);
      const reads = state.calls.length;
      state.tables.payment_allocations = [allocation({ amount: 300 })];
      await client.invalidateQueries({ queryKey: ['contract-payments', scope.contractId] });
      expect(state.calls.length).toBe(reads * 2);
      expect(header.getCurrentResult().data?.[0].financial_applications).toEqual([{ invoice_id: 'invoice', amount: 300 }]);
      expect(ledger.getCurrentResult().data?.allocations[0].amount).toBe(300);
      state.fail = 'p';
      await client.invalidateQueries({ queryKey: ['contract-payments', scope.contractId] });
      expect(header.getCurrentResult().isError).toBe(true);
      expect(ledger.getCurrentResult().isError).toBe(true);
    } finally { offHeader(); offLedger(); client.clear(); }
  });
  it('isolates cache identity by company, customer, contract and invoice scope', () => {
    const key = contractPaymentEvidenceQueryOptions(scope).queryKey;
    for (const different of [{ companyId: 'other' }, { customerId: 'other' }, { contractId: 'other' }, { invoiceIds: [] }]) {
      expect(contractPaymentEvidenceQueryOptions({ ...scope, ...different }).queryKey).not.toEqual(key);
    }
  });
  it('discovers allocation-only receipts, including an earlier advance, without duplicating direct receipts', async () => {
    state.tables.payments = [payment({ id: 'p1' }), payment({ id: 'p2', contract_id: null, invoice_id: null, payment_date: '2020-01-01' })];
    state.tables.payment_allocations = [allocation({ id: 'a1', payment_id: 'p1' }), allocation({ id: 'a2', payment_id: 'p2' })];
    const result = await fetchContractPaymentEvidence(scope);
    expect(result.map((row) => row.id).sort()).toEqual(['p1', 'p2']);
    expect(result.map((row) => row.financial_applications)).toEqual([[{ invoice_id: 'invoice', amount: 500 }], [{ invoice_id: 'invoice', amount: 500 }]]);
    expect(state.calls.every(({ filters }) => filters.some(([op, key, value]) => op === 'eq' && key === 'company_id' && value === 'co'))).toBe(true);
  });
  it('reads all allocation types before deciding legacy fallback', async () => {
    state.tables.payments = [payment()]; state.tables.payment_allocations = [allocation({ allocation_type: 'late_fee' })];
    expect((await fetchContractPaymentEvidence(scope))[0].financial_applications).toEqual([]);
  });
  it('discovers an explicit contract allocation with no legacy receipt links', async () => {
    state.tables.payments = [payment({ contract_id: null, invoice_id: null })];
    state.tables.payment_allocations = [allocation({ allocation_type: 'contract', target_id: 'contract' })];
    expect((await fetchContractPaymentEvidence(scope))[0].financial_applications).toEqual([{ invoice_id: null, amount: 500 }]);
  });
  it('adds cleared checks to the completed receipt set', () => {
    expect(applications([payment({ payment_status: 'cleared' })], [allocation()])).toEqual([{ invoice_id: 'invoice', amount: 500 }]);
  });
  it('rejects a later-page failure and warns about an active missing receipt', async () => {
    state.tables.payments = [payment()]; state.fail = 'p';
    await expect(fetchContractPaymentEvidence(scope)).rejects.toThrow('later page failed');
    state.fail = ''; state.tables.payments = []; state.tables.payment_allocations = [allocation()];
    const bundle = await fetchContractPaymentEvidenceBundle(scope);
    expect(bundle.payments).toHaveLength(0);
    expect(bundle.integrityWarnings?.join(' ')).toContain('بلا إيصال');
  });
  it('batches large invoice ID filters', async () => {
    await fetchContractPaymentEvidence({ ...scope, invoiceIds: Array.from({ length: 205 }, (_, i) => `i${i}`) });
    expect(state.calls.every(({ filters }) => filters.every(([op, , value]) => op !== 'in' || (value as unknown[]).length <= 100))).toBe(true);
  });
  it.each([
    [], [allocation({ is_active: false })], [allocation({ amount: 300 })], [allocation({ target_id: 'other' })],
  ].map((rows) => ({ rows })))('rejects allocation evidence that changed between discovery and final read: %j', async ({ rows }) => {
    state.tables.payments = [payment()]; state.tables.payment_allocations = [allocation()];
    state.finalAllocations = rows;
    await expect(fetchContractPaymentEvidence(scope)).rejects.toThrow('تغيرت تخصيصات');
  });
  it.each(['companyId', 'contractId', 'customerId'] as const)('requires %s even for pure attribution', (field) => {
    expect(() => attributeContractPayments({ ...scope, [field]: '' }, [], [])).toThrow('الشركة والعقد والعميل');
  });
});
