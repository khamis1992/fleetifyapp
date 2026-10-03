import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { buildMonthlyFinancials, fleetReportPeriod, type FleetLedgerLine, type FleetReportDataset, type FleetVehicle } from '../fleetReportModel';
import { readFleetPages, readFleetReport } from '../readFleetReport';
import { buildFleetReportCsv, buildFleetReportHtml, fleetExportSections, fleetCsvCell } from '../fleetReportExports';

const company = 'company-a';
const period = { start: '2026-09-01', end: '2026-09-30' };
const vehicle = (id = 'v1', overrides: Partial<FleetVehicle> = {}): FleetVehicle => ({ id, company_id: company, plate_number: '7060', make: 'Bestune', model: 'B70', year: 2023, status: 'stolen', is_active: false, notes: null, vin_number: null, purchase_cost: 55_000, book_value: 0, accumulated_depreciation: 55_000, daily_rate: null, monthly_rate: null, ...overrides });
const line = (id: string, type: string, debit: number, credit: number, overrides: Partial<FleetLedgerLine> = {}): FleetLedgerLine => ({ id, journal_entry_id: `entry-${id}`, debit_amount: debit, credit_amount: credit, entry: { company_id: company, status: 'posted', entry_date: '2026-09-05', entry_number: id }, account: { company_id: company, account_type: type, account_code: id, account_name: type }, ...overrides });
const dataset = (): FleetReportDataset => ({ companyId: company, period, readAt: '2026-09-30T20:00:00Z', vehicles: [vehicle()], maintenance: [], insurance: [], documents: [], ledgerLines: [], monthly: buildMonthlyFinancials([], company, period), registration: [], vehicleFinancials: [{ vehicle_id: 'v1', revenue: null, expenses: null, profit: null }] });

describe('posted company performance and recorded values', () => {
  it('uses net posted debits/credits and no synthetic revenue, forecasts or random activity', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Synthetic value'); });
    try {
      const rows = buildMonthlyFinancials([line('r', 'revenue', 100, 900), line('e', 'expenses', 250, 50)], company, period);
      expect(rows).toEqual([{ month: '2026-09', revenue: 800, expenses: 200, result: 600, line_count: 2 }]);
      expect(buildMonthlyFinancials([], company, period)).toEqual([{ month: '2026-09', revenue: 0, expenses: 0, result: 0, line_count: 0 }]);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });
  it('rejects foreign company, draft or out-of-period financial lines rather than silently mixing them', () => {
    const original = line('r', 'revenue', 0, 10);
    expect(() => buildMonthlyFinancials([{ ...original, account: { ...original.account, company_id: 'company-b' } }], company, period)).toThrow('الشركة');
    expect(() => buildMonthlyFinancials([{ ...original, entry: { ...original.entry, status: 'draft' } }], company, period)).toThrow('غير مرحل');
    expect(() => buildMonthlyFinancials([{ ...original, entry: { ...original.entry, entry_date: '2026-10-01' } }], company, period)).toThrow('الفترة');
  });
  it('changes financial boundaries with the selected period and handles year transitions', () => {
    expect(fleetReportPeriod({ period: 'week', compareWithPrevious: false }, '2026-01-03')).toEqual({ start: '2025-12-28', end: '2026-01-03' });
    expect(fleetReportPeriod({ period: 'quarter', compareWithPrevious: false }, '2026-09-30')).toEqual({ start: '2026-07-01', end: '2026-09-30' });
    expect(fleetReportPeriod({ period: 'year', compareWithPrevious: false }, '2026-09-30')).toEqual({ start: '2026-01-01', end: '2026-09-30' });
  });
});

describe('complete paginated report', () => {
  it('fetches more than the API row cap using exact count and stable offset even when pages are short', async () => {
    const rows = Array.from({ length: 1003 }, (_, i) => ({ id: String(i) }));
    const fetch = vi.fn(async (from: number) => ({ data: rows.slice(from, from + 300), error: null, count: rows.length }));
    expect(await readFleetPages(fetch)).toEqual(rows);
    expect(fetch.mock.calls.map(c => c[0])).toEqual([0, 300, 600, 900]);
  });
  it('fails closed on a truncated page, later error, duplicate ID or changing count', async () => {
    await expect(readFleetPages(async () => ({ data: [], error: null, count: 5 }))).rejects.toThrow('غير مكتملة');
    let calls = 0;
    await expect(readFleetPages(async () => ++calls === 1 ? { data: [{ id: 'a' }], error: null, count: 2 } : { data: null, error: { message: 'later failure' }, count: 2 })).rejects.toThrow('later failure');
    await expect(readFleetPages(async () => ({ data: [{ id: 'a' }], error: null, count: 2 }))).rejects.toThrow('تكرر');
    calls = 0;
    await expect(readFleetPages(async () => ({ data: [{ id: String(++calls) }], error: null, count: calls === 1 ? 2 : 3 }))).rejects.toThrow('تغير');
  });
  it('requires a company before issuing queries', async () => {
    const from = vi.fn();
    await expect(readFleetReport({ from } as unknown as SupabaseClient<Database>, '', period)).rejects.toThrow('الشركة');
    expect(from).not.toHaveBeenCalled();
  });
  it('scopes both financial joins, retains inactive zero-valued vehicles and reads child tables by verified IDs', async () => {
    const calls: Array<{ table: string; methods: Array<[string, ...unknown[]]> }> = [];
    const rows: Record<string, unknown[]> = { vehicles: [vehicle()], vehicle_maintenance: [], journal_entry_lines: [line('r', 'revenue', 0, 10)], vehicle_insurance: [], vehicle_documents: [] };
    const client = { from(table: string) {
      const call = { table, methods: [] as Array<[string, ...unknown[]]> }; calls.push(call);
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in', 'gte', 'lte', 'order', 'range']) builder[method] = (...args: unknown[]) => { call.methods.push([method, ...args]); return builder; };
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows[table], error: null, count: rows[table].length }).then(resolve);
      return builder;
    } } as unknown as SupabaseClient<Database>;
    const result = await readFleetReport(client, company, period);
    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles[0].is_active).toBe(false);
    expect(result.vehicles[0].book_value).toBe(0);
    expect(result.vehicleFinancials[0]).toEqual({ vehicle_id: 'v1', revenue: null, expenses: null, profit: null });
    expect(calls.find(c => c.table === 'vehicles')?.methods).toContainEqual(['eq', 'company_id', company]);
    expect(calls.find(c => c.table === 'vehicles')?.methods).not.toContainEqual(['eq', 'is_active', true]);
    const financial = calls.find(c => c.table === 'journal_entry_lines')?.methods ?? [];
    expect(financial).toContainEqual(['eq', 'entry.company_id', company]);
    expect(financial).toContainEqual(['eq', 'account.company_id', company]);
    expect(financial).toContainEqual(['eq', 'entry.status', 'posted']);
    expect(financial).toContainEqual(['gte', 'entry.entry_date', period.start]);
    expect(financial).toContainEqual(['lte', 'entry.entry_date', period.end]);
    for (const table of ['vehicle_documents', 'vehicle_insurance']) expect(calls.find(c => c.table === table)?.methods).toContainEqual(['in', 'vehicle_id', ['v1']]);
  });
});

describe('exports preserve the loaded dataset and disclose missing information', () => {
  it('exports all rows, keeps a recorded zero and distinguishes a missing value from zero', () => {
    const data = dataset(); data.vehicles = Array.from({ length: 24 }, (_, i) => vehicle(`v${i}`, { plate_number: `plate${i}`, book_value: i === 0 ? null : 0 }));
    const csv = buildFleetReportCsv(data);
    const sections = fleetExportSections(data);
    const vehicles = sections.find(s => s.name === 'المركبات');
    expect(vehicles?.rows).toHaveLength(24);
    expect(vehicles?.rows[0][9]).toBeNull();
    expect(vehicles?.rows[1][9]).toBe(0);
    expect(csv).toContain('plate23');
    expect(csv).toContain('"غير متاح"');
    expect(csv).toContain('"0"');
    expect(buildFleetReportHtml(data)).toContain('plate23');
    expect(csv).toContain(data.companyId);
    expect(csv).toContain(period.start);
    expect(csv).toContain('لا تثبت الأهلية للتشغيل');
  });
  it('escapes CSV commas, quotes, multiline notes and spreadsheet formula text without changing numeric negatives', () => {
    expect(fleetCsvCell('quoted "name",\nline')).toBe('"quoted ""name"",\nline"');
    expect(fleetCsvCell('=HYPERLINK("https://bad")')).toBe('"\'=HYPERLINK(""https://bad"")"');
    expect(fleetCsvCell(-12)).toBe('"-12"');
    expect(fleetCsvCell(0)).toBe('"0"');
  });
  it('escapes untrusted HTML in the printable report', () => {
    const data = dataset(); data.vehicles[0].notes = '<script>alert(1)</script>';
    const output = buildFleetReportHtml(data);
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(output).toContain('طباعة / حفظ PDF');
  });
});
