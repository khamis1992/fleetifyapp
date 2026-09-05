import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchContractInvoiceEvidence, fetchContractInvoiceEvidenceResult } from '../contractInvoiceEvidence';

type Row = { id: string; [key: string]: unknown };
const state = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, cap: 2, failAfter: '', nullTable: '',
  calls: [] as Array<{ table: string; filters: Array<[string, string, unknown]> }> }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const filters: Array<[string, string, unknown]> = [];
  let sort = 'id';
  const chain = {
    select: () => chain,
    eq: (key: string, value: unknown) => { filters.push(['eq', key, value]); return chain; },
    gt: (key: string, value: unknown) => { filters.push(['gt', key, value]); return chain; },
    gte: (key: string, value: unknown) => { filters.push(['gte', key, value]); return chain; },
    in: (key: string, value: unknown) => { filters.push(['in', key, value]); return chain; },
    not: (key: string, _op: string, value: unknown) => { filters.push(['not', key, value]); return chain; },
    or: (value: string) => { filters.push(['or', '', value]); return chain; },
    order: (key: string) => { sort = key; return chain; }, limit: () => chain,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      state.calls.push({ table, filters });
      if (state.nullTable === table) return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      if (state.failAfter && filters.some(([op, key, value]) => op === 'gt' && key === 'id' && value === state.failAfter)) {
        return Promise.resolve({ data: null, error: new Error('later page failed') }).then(resolve, reject);
      }
      const rows = (state.tables[table] || []).filter((row) => filters.every(([op, key, value]) => {
        if (op === 'eq') return row[key] === value;
        if (op === 'gt') return String(row[key]) > String(value);
        if (op === 'gte') return row[key] != null && String(row[key]) >= String(value);
        if (op === 'in') return (value as unknown[]).includes(row[key]);
        if (op === 'not') return row[key] != null;
        if (op === 'or') {
          const expression = String(value);
          const contract = /contract_id.eq.([^,]+)/.exec(expression)?.[1];
          const ids = /id.in.\(([^)]+)\)/.exec(expression)?.[1].split(',') || [];
          return row.contract_id === contract || ids.includes(row.id);
        }
        return true;
      })).sort((a, b) => String(a[sort] ?? '').localeCompare(String(b[sort] ?? ''))).slice(0, state.cap);
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    },
  };
  return chain;
} } }));

const scope = { companyId: 'co', contractId: 'contract', customerId: 'customer', startDate: '2026-01-01' };
const invoice = (id: string, extra: Record<string, unknown> = {}): Row => ({ id, company_id: 'co', contract_id: 'contract', customer_id: 'customer', due_date: '2026-01-01', invoice_number: id, ...extra });
const link = (id: string, invoiceId: string): Row => ({ id, company_id: 'co', contract_id: 'contract', invoice_id: invoiceId });
beforeEach(() => { state.tables = { invoices: [], contract_payment_schedules: [] }; state.calls = []; state.cap = 2; state.failAfter = ''; state.nullTable = ''; });

describe('contract invoice evidence boundary', () => {
  it('preserves earlier, undated and cancelled invoices for validation', async () => {
    state.cap = 10;
    state.tables.invoices = [invoice('a', { due_date: '2025-12-01' }), invoice('b', { due_date: null }), invoice('c', { status: 'cancelled' })];
    expect((await fetchContractInvoiceEvidence(scope)).map((row) => row.id).sort()).toEqual(['a', 'b', 'c']);
  });
  it('reads beyond short pages for both schedule links and invoices', async () => {
    state.cap = 1;
    state.tables.invoices = [invoice('a'), invoice('b'), invoice('c', { contract_id: null }), invoice('d', { contract_id: null })];
    state.tables.contract_payment_schedules = [link('s1', 'c'), link('s2', 'd')];
    expect((await fetchContractInvoiceEvidence(scope)).map((row) => row.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
  it('does not duplicate a directly linked invoice also referenced by a schedule', async () => {
    state.tables.invoices = [invoice('a')]; state.tables.contract_payment_schedules = [link('s1', 'a'), link('s2', 'a')];
    expect(await fetchContractInvoiceEvidence(scope)).toHaveLength(1);
  });
  it.each(['other', undefined])('flags a schedule-linked invoice for another or unknown customer instead of failing the read (%s)', async (customerId) => {
    state.tables.invoices = [invoice('a', { customer_id: customerId, contract_id: null })];
    state.tables.contract_payment_schedules = [link('s1', 'a')];
    const result = await fetchContractInvoiceEvidenceResult(scope);
    // The persisted schedule link keeps the legacy row visible, but flagged.
    expect(result.invoices.map((row) => row.id)).toEqual(['a']);
    expect(result.integrityWarnings.join(' ')).toContain('لا يطابق عميل العقد');
  });
  it('excludes a schedule link to another contract instead of borrowing its invoice', async () => {
    state.tables.invoices = [invoice('a', { contract_id: 'other' })]; state.tables.contract_payment_schedules = [link('s1', 'a')];
    const result = await fetchContractInvoiceEvidenceResult(scope);
    expect(result.invoices).toHaveLength(0);
    expect(result.integrityWarnings.join(' ')).toContain('عقد آخر');
  });
  it.each(['missing', 'foreign-company'])('warns about an unresolved %s schedule invoice instead of failing', async (kind) => {
    state.tables.invoices = kind === 'missing' ? [] : [invoice('a', { company_id: 'other' })];
    state.tables.contract_payment_schedules = [link('s1', 'a')];
    const result = await fetchContractInvoiceEvidenceResult(scope);
    expect(result.invoices).toHaveLength(0);
    expect(result.integrityWarnings.join(' ')).toMatch(/غير متاحة|لا تخص الشركة/);
  });
  it('filters company and excludes unrelated invoices', async () => {
    state.tables.invoices = [invoice('a'), invoice('b', { company_id: 'other' }), invoice('c', { contract_id: 'other' })];
    const result = await fetchContractInvoiceEvidenceResult(scope);
    // The read query is already contract-scoped, so other-contract rows never
    // arrive; company mismatch rows are dropped without warnings.
    expect(result.invoices.map((row) => row.id)).toEqual(['a']);
    expect(state.calls.every(({ filters }) => filters.some(([op, key, value]) => op === 'eq' && key === 'company_id' && value === 'co'))).toBe(true);
  });
  it.each(['invoices', 'contract_payment_schedules'])('rejects null %s data instead of empty results', async (table) => {
    state.nullTable = table;
    await expect(fetchContractInvoiceEvidence(scope)).rejects.toThrow();
  });
  it('rejects a failed later page', async () => {
    state.cap = 1; state.tables.invoices = [invoice('a'), invoice('b')]; state.failAfter = 'a';
    await expect(fetchContractInvoiceEvidence(scope)).rejects.toThrow('later page failed');
  });
  it.each(['companyId', 'contractId', 'customerId'])('does not read without %s', async (field) => {
    await expect(fetchContractInvoiceEvidence({ ...scope, [field]: '' })).rejects.toThrow();
    expect(state.calls).toHaveLength(0);
  });
  it('batches large invoice-link filters instead of building an unbounded URL', async () => {
    state.cap = 17;
    state.tables.invoices = Array.from({ length: 205 }, (_, i) => invoice(`i${String(i).padStart(3, '0')}`, { contract_id: null }));
    state.tables.contract_payment_schedules = state.tables.invoices.map((row, i) => link(`s${String(i).padStart(3, '0')}`, row.id));
    const result = await fetchContractInvoiceEvidenceResult(scope);
    expect(result.invoices).toHaveLength(205);
    expect(result.integrityWarnings).toHaveLength(0);
    expect(state.calls.some(({ filters }) => filters.some(([op]) => op === 'or'))).toBe(false);
    expect(state.calls.every(({ filters }) => filters.every(([op, , value]) => op !== 'in' || (value as unknown[]).length <= 100))).toBe(true);
  });
});
