import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortfolioRegister, PortfolioRow } from '@/types/insolvencyPortfolio';

interface QueryCall {
  table: string;
  columns: string;
  options?: { count?: 'exact'; head?: boolean };
  equals: Array<[string, string]>;
  members: Array<[string, string[]]>;
  dates: Array<[string, string]>;
  orders: string[];
  range?: [number, number];
}
const state = vi.hoisted(() => ({
  tables: {} as Record<string, PortfolioRow[]>,
  calls: [] as QueryCall[],
  injectedSlip: null as PortfolioRow | null,
  injectedVehicleDocument: null as PortfolioRow | null,
  changedFinalCount: false,
  deniedPayrollPage: false,
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const call: QueryCall = { table, columns: '', equals: [], members: [], dates: [], orders: [] };
  state.calls.push(call);
  const valueAt = (row: PortfolioRow, key: string) => key.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as PortfolioRow)[part] : undefined, row);
  const query = {
    select: (columns: string, options?: QueryCall['options']) => { call.columns = columns; call.options = options; return query; },
    eq: (key: string, value: string) => { call.equals.push([key, value]); return query; },
    in: (key: string, values: string[]) => { call.members.push([key, [...values]]); return query; },
    lte: (key: string, value: string) => { call.dates.push([key, value]); return query; },
    order: (key: string) => { call.orders.push(key); return query; },
    range: (from: number, to: number) => { call.range = [from, to]; return query; },
    then: (resolve: (result: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      let rows = (state.tables[table] || []).filter(row => call.equals.every(([key, value]) => valueAt(row, key) === value)
        && call.members.every(([key, values]) => values.includes(String(valueAt(row, key))))
        && call.dates.every(([key, value]) => String(valueAt(row, key)) <= value));
      // Deliberately simulate a bad backend response bypassing the requested .in filter.
      // Its count is also consistent, so only explicit owner membership checks can reject it.
      if (table === 'payroll_slips' && state.injectedSlip) rows = [...rows, state.injectedSlip];
      if (table === 'vehicle_documents' && state.injectedVehicleDocument) rows = [...rows, state.injectedVehicleDocument];
      if (call.orders.includes('id')) rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const count = call.options?.count === 'exact' ? rows.length + (table === 'payroll_slips' && call.options.head && state.changedFinalCount ? 1 : 0) : null;
      const denied = table === 'payroll_slips' && state.deniedPayrollPage && (call.range?.[0] ?? 0) > 0;
      const result = denied ? { data: null, count, error: { message: 'synthetic payroll page denied' } }
        : { data: call.options?.head ? null : call.range ? rows.slice(call.range[0], call.range[1] + 1) : rows, count, error: null };
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return query;
} } }));
vi.mock('@/services/financialStatementPackage', () => ({ listFinancialStatementPackages: vi.fn(async () => []) }));

import { PORTFOLIO_REGISTERS, readInsolvencyPortfolio, readPortfolioRegister } from '@/services/insolvencyPortfolio';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const CUTOFF = '2026-09-30';
const payrollSpec = PORTFOLIO_REGISTERS.find(item => item.key === 'payroll_slips')!;
const vehicleDocumentSpec = PORTFOLIO_REGISTERS.find(item => item.key === 'vehicle_documents')!;
const employee = (id: string, companyId = COMPANY): PortfolioRow => ({ id, company_id: companyId, is_active: false });
const slip = (id: string, employeeId: string): PortfolioRow => ({ id, employee_id: employeeId, net_salary: 1234.56 });
const employeesRegister = (rows: PortfolioRow[]): PortfolioRegister => ({ key: 'employees', label: 'Synthetic employees', basis: 'current_records', rows, readAt: '2026-09-30T20:00:00Z' });
const payrollCalls = () => state.calls.filter(call => call.table === 'payroll_slips');
const vehicle = (id: string, companyId = COMPANY): PortfolioRow => ({ id, company_id: companyId, is_active: false, book_value: null });
const vehicleDocument = (id: string, vehicleId: string): PortfolioRow => ({ id, vehicle_id: vehicleId, document_type: 'registration', document_url: `${COMPANY}/vehicle-documents/${vehicleId}/${id}.pdf` });
const vehiclesRegister = (rows: PortfolioRow[]): PortfolioRegister => ({ key: 'vehicles', label: 'Synthetic vehicles', basis: 'current_records', rows, readAt: '2026-09-30T20:00:00Z' });
const vehicleDocumentCalls = () => state.calls.filter(call => call.table === 'vehicle_documents');

beforeEach(() => {
  state.tables = { companies: [{ id: COMPANY, name: 'Synthetic company', currency: 'QAR' }] };
  state.calls = [];
  state.injectedSlip = null;
  state.injectedVehicleDocument = null;
  state.changedFinalCount = false;
  state.deniedPayrollPage = false;
});

describe('company-isolated vehicle documents without a vehicles foreign key', () => {
  it('uses scoped company vehicles in the complete portfolio and includes only their documents', async () => {
    state.tables.vehicles = [vehicle('own-vehicle-a'), vehicle('foreign-vehicle', OTHER), vehicle('own-vehicle-b')];
    state.tables.vehicle_documents = [vehicleDocument('document-a', 'own-vehicle-a'), vehicleDocument('foreign-document', 'foreign-vehicle'), vehicleDocument('document-b', 'own-vehicle-b')];
    const result = await readInsolvencyPortfolio(COMPANY, CUTOFF);
    expect(result.registers.find(item => item.key === 'vehicles')?.rows.map(row => row.id)).toEqual(['own-vehicle-a', 'own-vehicle-b']);
    expect(result.registers.find(item => item.key === 'vehicle_documents')?.rows.map(row => row.id)).toEqual(['document-a', 'document-b']);
    expect(result.documents.filter(doc => doc.source === 'vehicle_documents').map(doc => doc.ownerId)).toEqual(['own-vehicle-a', 'own-vehicle-b']);
    expect(state.calls.filter(call => call.table === 'vehicles').every(call => call.equals.some(([key, value]) => key === 'company_id' && value === COMPANY))).toBe(true);
    expect(vehicleDocumentCalls()).toHaveLength(2);
    for (const call of vehicleDocumentCalls()) {
      expect(call.columns).toBe('*');
      expect(call.members).toEqual([['vehicle_id', ['own-vehicle-a', 'own-vehicle-b']]]);
      expect(call.equals).toEqual([]);
    }
    expect(vehicleDocumentCalls()[0].orders).toEqual(['id']);
    expect(vehicleDocumentCalls()[1].options).toEqual({ count: 'exact', head: true });
  });

  it('does not issue any vehicle document query when the company has no scoped vehicles', async () => {
    state.tables.vehicles = [vehicle('foreign-vehicle', OTHER)];
    state.tables.vehicle_documents = [vehicleDocument('foreign-document', 'foreign-vehicle')];
    const result = await readInsolvencyPortfolio(COMPANY, CUTOFF);
    expect(result.registers.find(item => item.key === 'vehicles')?.rows).toEqual([]);
    expect(result.registers.find(item => item.key === 'vehicle_documents')?.rows).toEqual([]);
    expect(result.documents.filter(doc => doc.source === 'vehicle_documents')).toEqual([]);
    expect(vehicleDocumentCalls()).toEqual([]);
  });

  it('rejects a document leaked for a different vehicle even when the backend counts agree', async () => {
    state.tables.vehicle_documents = [vehicleDocument('valid-document', 'own-vehicle')];
    state.injectedVehicleDocument = vehicleDocument('leaked-document', 'foreign-vehicle');
    await expect(readPortfolioRegister(vehicleDocumentSpec, COMPANY, CUTOFF, vehiclesRegister([vehicle('own-vehicle')]))).rejects.toThrow('خارج مركبات الشركة');
    expect(vehicleDocumentCalls()).toHaveLength(2);
    expect(vehicleDocumentCalls().every(call => call.members[0][1].join() === 'own-vehicle')).toBe(true);
  });

  it('reads more than 100 vehicles in separate owner chunks and retrieves all document pages', async () => {
    const vehicles = Array.from({ length: 251 }, (_, index) => vehicle(`vehicle-${String(index).padStart(3, '0')}`));
    state.tables.vehicle_documents = [
      ...vehicles.map((row, index) => vehicleDocument(`base-${index}`, String(row.id))),
      ...Array.from({ length: 500 }, (_, index) => vehicleDocument(`extra-${index}`, String(vehicles[0].id))),
      vehicleDocument('foreign-document', 'foreign-vehicle'),
    ];
    const result = await readPortfolioRegister(vehicleDocumentSpec, COMPANY, CUTOFF, vehiclesRegister(vehicles));
    expect(result.rows).toHaveLength(751);
    expect(new Set(result.rows.map(row => row.id)).size).toBe(751);
    expect(result.rows.some(row => row.vehicle_id === 'foreign-vehicle')).toBe(false);
    const heads = vehicleDocumentCalls().filter(call => call.options?.head);
    expect(heads.map(call => call.members[0][1].length)).toEqual([100, 100, 51]);
    expect(heads.flatMap(call => call.members[0][1])).toEqual(vehicles.map(row => row.id));
    const firstChunk = vehicleDocumentCalls().filter(call => call.members[0][1][0] === vehicles[0].id);
    expect(firstChunk.filter(call => !call.options?.head).map(call => call.range)).toEqual([[0, 499], [500, 999]]);
    expect(firstChunk.map(call => call.options)).toEqual([{ count: 'exact' }, undefined, { count: 'exact', head: true }]);
    expect(vehicleDocumentCalls().every(call => call.members.length === 1 && call.members[0][0] === 'vehicle_id' && call.members[0][1].length > 0 && call.members[0][1].length <= 100)).toBe(true);
  });
});

describe('company-isolated payroll slips without an employees foreign key', () => {
  it('reads employees with an explicit company filter and uses only those IDs for payroll in the complete portfolio', async () => {
    state.tables.employees = [employee('own-a'), employee('other-a', OTHER), employee('own-b')];
    state.tables.payroll_slips = [slip('slip-a', 'own-a'), slip('foreign-slip', 'other-a'), slip('slip-b', 'own-b')];
    const result = await readInsolvencyPortfolio(COMPANY, CUTOFF);
    expect(PORTFOLIO_REGISTERS).toHaveLength(45);
    expect(result.registers.find(item => item.key === 'employees')?.rows.map(row => row.id)).toEqual(['own-a', 'own-b']);
    expect(result.registers.find(item => item.key === 'payroll_slips')?.rows.map(row => row.id)).toEqual(['slip-a', 'slip-b']);
    const employeeQueries = state.calls.filter(call => call.table === 'employees');
    expect(employeeQueries.length).toBeGreaterThan(0);
    expect(employeeQueries.every(call => call.equals.some(([key, value]) => key === 'company_id' && value === COMPANY))).toBe(true);
    expect(payrollCalls()).toHaveLength(2);
    for (const call of payrollCalls()) {
      expect(call.columns).toBe('*');
      expect(call.members).toEqual([['employee_id', ['own-a', 'own-b']]]);
      expect(call.equals).toEqual([]); // payroll_slips has neither company_id nor an embeddable employees FK.
    }
    expect(payrollCalls()[0].orders).toEqual(['id']);
    expect(payrollCalls()[0].options).toEqual({ count: 'exact' });
    expect(payrollCalls()[1].options).toEqual({ count: 'exact', head: true });
  });

  it('returns an empty payroll register without issuing any global payroll query when scoped employees are empty', async () => {
    state.tables.employees = [employee('other-a', OTHER)];
    state.tables.payroll_slips = [slip('foreign-slip', 'other-a')];
    const result = await readInsolvencyPortfolio(COMPANY, CUTOFF);
    expect(result.registers.find(item => item.key === 'employees')?.rows).toEqual([]);
    expect(result.registers.find(item => item.key === 'payroll_slips')?.rows).toEqual([]);
    expect(payrollCalls()).toEqual([]);
  });

  it('reads every employee chunk of at most 100 IDs and every payroll page in each chunk', async () => {
    const employees = Array.from({ length: 251 }, (_, index) => employee(`employee-${String(index).padStart(3, '0')}`));
    state.tables.payroll_slips = [
      ...employees.map((row, index) => slip(`base-${index}`, String(row.id))),
      ...Array.from({ length: 500 }, (_, index) => slip(`extra-${index}`, String(employees[0].id))),
      slip('foreign-slip', 'foreign-employee'),
    ];
    const result = await readPortfolioRegister(payrollSpec, COMPANY, CUTOFF, employeesRegister(employees));
    expect(result.rows).toHaveLength(751);
    expect(new Set(result.rows.map(row => row.id)).size).toBe(751);
    expect(result.rows.some(row => row.employee_id === 'foreign-employee')).toBe(false);
    const heads = payrollCalls().filter(call => call.options?.head);
    expect(heads.map(call => call.members[0][1].length)).toEqual([100, 100, 51]);
    expect(heads.flatMap(call => call.members[0][1])).toEqual(employees.map(row => row.id));
    const firstChunk = payrollCalls().filter(call => call.members[0][1][0] === employees[0].id);
    expect(firstChunk.filter(call => !call.options?.head).map(call => call.range)).toEqual([[0, 499], [500, 999]]);
    expect(firstChunk.map(call => call.options)).toEqual([{ count: 'exact' }, undefined, { count: 'exact', head: true }]);
    expect(payrollCalls().every(call => call.members.length === 1 && call.members[0][0] === 'employee_id' && call.members[0][1].length > 0 && call.members[0][1].length <= 100)).toBe(true);
  });

  it('requires a verified employee register and rejects employees from another company before querying payroll', async () => {
    await expect(readPortfolioRegister(payrollSpec, COMPANY, CUTOFF)).rejects.toThrow('التحقق من موظفي الشركة');
    await expect(readPortfolioRegister(payrollSpec, COMPANY, CUTOFF, employeesRegister([employee('foreign', OTHER)]))).rejects.toThrow('نطاق الشركة');
    expect(payrollCalls()).toEqual([]);
  });

  it('rejects a returned payroll slip whose employee is outside the verified company list even if counts agree', async () => {
    state.tables.payroll_slips = [slip('valid-slip', 'own-a')];
    state.injectedSlip = slip('leaked-slip', 'foreign-employee');
    await expect(readPortfolioRegister(payrollSpec, COMPANY, CUTOFF, employeesRegister([employee('own-a')]))).rejects.toThrow('خارج موظفي الشركة');
    expect(payrollCalls()).toHaveLength(2);
    expect(payrollCalls().every(call => call.members[0][1].join() === 'own-a')).toBe(true);
  });

  it('rejects an employee outside the current chunk even when that employee belongs to a later company chunk', async () => {
    const employees = Array.from({ length: 101 }, (_, index) => employee(`employee-${index}`));
    state.injectedSlip = slip('wrong-chunk-slip', String(employees[100].id));
    await expect(readPortfolioRegister(payrollSpec, COMPANY, CUTOFF, employeesRegister(employees))).rejects.toThrow('خارج موظفي الشركة');
    expect(payrollCalls()).toHaveLength(2);
    expect(payrollCalls()[0].members[0][1]).not.toContain(employees[100].id);
  });

  it('rejects a changed final count rather than returning a successful partial payroll register', async () => {
    state.tables.payroll_slips = [slip('valid-slip', 'own-a')];
    state.changedFinalCount = true;
    await expect(readPortfolioRegister(payrollSpec, COMPANY, CUTOFF, employeesRegister([employee('own-a')]))).rejects.toThrow('تغير سجل البيانات أثناء القراءة');
    expect(payrollCalls().at(-1)?.options).toEqual({ count: 'exact', head: true });
  });

  it('rejects a denied later payroll page instead of dropping the remaining slips', async () => {
    state.tables.payroll_slips = Array.from({ length: 501 }, (_, index) => slip(`slip-${index}`, 'own-a'));
    state.deniedPayrollPage = true;
    await expect(readPortfolioRegister(payrollSpec, COMPANY, CUTOFF, employeesRegister([employee('own-a')]))).rejects.toThrow('synthetic payroll page denied');
    expect(payrollCalls().map(call => call.range)).toEqual([[0, 499], [500, 999]]);
  });
});
