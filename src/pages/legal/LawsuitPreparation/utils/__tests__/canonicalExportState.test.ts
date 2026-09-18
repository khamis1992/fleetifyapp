import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCanonicalLawsuitState } from '../documentGenerators';

const mocks = vi.hoisted(() => ({ projection: vi.fn(), tables: {} as Record<string, unknown> }));
vi.mock('../legalClaimSources', async original => ({
  ...await original<typeof import('../legalClaimSources')>(), loadLegalClaimProjection: mocks.projection,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const query: any = {};
    for (const method of ['select', 'eq', 'neq', 'order', 'limit', 'single', 'maybeSingle']) query[method] = () => query;
    query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({ data: mocks.tables[table] ?? [], error: null }).then(resolve, reject);
    return query;
  },
} }));

const amounts = { overdueRent: 1000, lateFees: 0, damagesFee: 0, violationsFines: 0,
  violationsCount: 0, retentionCompensation: 0, securityDepositDeduction: 0, total: 1000 };
function projection(paid = 700) {
  return { rows: [{ id: 'invoice-1', invoice_number: 'INV-1', due_date: '2026-08-01', invoice_month: '2026-08-01',
    total_amount: 1700, paid_amount: paid, service_period_start: '2026-08-01', service_period_end: '2026-08-31' }],
    trafficViolations: [], summary: { authoritativeAmounts: amounts } };
}
describe('canonical state used by individual and bulk document exports', () => {
  beforeEach(() => {
    mocks.tables = {
      contracts: { id: 'contract-1', contract_number: 'TEST', company_id: 'company-1', monthly_amount: 1700,
        start_date: '2026-01-01', end_date: '2027-01-01', customers: { id: 'customer-1', first_name_ar: 'اختبار' }, vehicles: null },
      legal_case_litigation_profile: { vehicle_custody: 'unknown', rescission_strategy: 'judicial_rescission' },
      legal_cases: null,
    };
    mocks.projection.mockReset().mockResolvedValue(projection());
  });
  it('returns a consistent completed-receipt statement for all exports', async () => {
    const state = await loadCanonicalLawsuitState('company-1', 'contract-1');
    expect(state.calculations).toMatchObject(amounts);
    expect(state.overdueInvoices[0]).toMatchObject({ total_amount: 1700, paid_amount: 700 });
  });
  it('rejects receipt details that no longer agree with the authoritative net rent', async () => {
    mocks.projection.mockResolvedValue(projection(800));
    await expect(loadCanonicalLawsuitState('company-1', 'contract-1')).rejects.toThrow();
  });
  it('rejects a newly changed deposit before the bulk ZIP can render inconsistent facts', async () => {
    mocks.tables.legal_case_litigation_profile = { vehicle_custody: 'unknown', apply_security_deposit: true, security_deposit_amount: 100 };
    await expect(loadCanonicalLawsuitState('company-1', 'contract-1')).rejects.toThrow();
  });
  it('rejects newly changed evidenced damages when the statement still excludes them', async () => {
    mocks.tables.legal_case_damage_costs = [{ id: 'damage-1', verified: true, evidence_document_id: 'proof', amount: 200,
      depreciation_deduction: 0, insurance_recovery: 0, cost_type: 'repair', description: 'اختبار' }];
    await expect(loadCanonicalLawsuitState('company-1', 'contract-1')).rejects.toThrow();
  });
});
