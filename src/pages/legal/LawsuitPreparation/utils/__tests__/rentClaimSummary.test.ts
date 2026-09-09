import { describe, expect, it } from 'vitest';
import { assertRentClaimConsistent, summarizeRentClaim } from '../rentClaimSummary';
import type { LawsuitPreparationState } from '../../store/types';

describe('rent claim service coverage and settlement', () => {
  it('prevents export while a payment and the calculated rent disagree', () => {
    const state = {
      overdueInvoices: [{ id: 'one', due_date: '2026-08-01', total_amount: 1700, paid_amount: 500 }],
      calculations: { overdueRent: 1700 },
    } as unknown as LawsuitPreparationState;
    expect(() => assertRentClaimConsistent(state)).toThrow('لا تتطابق الأجرة');
    state.calculations!.overdueRent = 1200;
    expect(() => assertRentClaimConsistent(state)).not.toThrow();
    state.financialClaimError = 'تحتاج الأقساط إلى مطابقة';
    expect(() => assertRentClaimConsistent(state)).toThrow('تحتاج الأقساط إلى مطابقة');
  });
  it('covers a prepaid month through its last day and preserves partial payments', () => {
    expect(summarizeRentClaim([
      { id: 'one', invoice_number: '1', due_date: '2024-02-01', total_amount: 1700, paid_amount: 500.25 },
    ])).toEqual({ grossRent: 1700, countedPayments: 500.25, netRent: 1199.75,
      periodFrom: '2024-02-01', periodTo: '2024-02-29' });
  });
  it('uses partial contractual boundaries without prorating the recorded amount again', () => {
    const result = summarizeRentClaim([
      { id: 'one', invoice_number: '1', due_date: '2026-08-01', total_amount: 600, paid_amount: 0 },
    ], { start_date: '2026-08-10', end_date: '2026-08-20' });
    expect(result).toMatchObject({ periodFrom: '2026-08-10', periodTo: '2026-08-20', netRent: 600 });
  });
  it('uses the documented extension endpoint and excludes fully settled rows', () => {
    const result = summarizeRentClaim([
      { id: 'paid', invoice_number: '1', due_date: '2026-01-01', total_amount: 1700, paid_amount: 1700 },
      { id: 'extension', invoice_number: null, due_date: '2026-08-01', total_amount: 1100, paid_amount: 0,
        source: 'legal_accrual', service_period_start: '2026-08-01', service_period_end: '2026-08-20' },
    ], { end_date: '2026-07-31' });
    expect(result).toMatchObject({ grossRent: 1100, countedPayments: 0, netRent: 1100,
      periodFrom: '2026-08-01', periodTo: '2026-08-20' });
  });
  it('rejects invalid settlement numbers rather than inventing debt', () => {
    expect(() => summarizeRentClaim([
      { id: 'bad', invoice_number: null, due_date: '2026-01-01', total_amount: 100, paid_amount: 101 },
    ])).toThrow('مطابقة');
  });
});


describe('documentary monetary detail consistency', () => {
  const createState = () => {
    const amounts = { overdueRent: 0, lateFees: 0, damagesFee: 80, violationsFines: 0,
      retentionCompensation: 0, securityDepositDeduction: 20, total: 60 };
    return {
      overdueInvoices: [], calculations: amounts,
      financialClaimSource: { authoritativeAmounts: { ...amounts } },
      damageCosts: [{ verified: true, evidence_document_id: 'proof', amount: 100,
        depreciation_deduction: 20, insurance_recovery: 0 }],
      litigationProfile: { apply_security_deposit: true, security_deposit_amount: 20 },
    } as unknown as LawsuitPreparationState;
  };
  const withCompensation = () => {
    const state = createState();
    Object.assign(state.calculations!, { lateFees: 100, total: 160 });
    Object.assign(state.financialClaimSource.authoritativeAmounts!, state.calculations);
    state.financialClaimSource.authoritativeCompensationUnits = 4;
    Object.assign(state.litigationProfile!, { contractual_compensation_enabled: true,
      contractual_compensation_method: 'monthly', contractual_compensation_rate: 30, contractual_compensation_cap: 100,
      contractual_compensation_clause_number: '7', contractual_compensation_clause_text: 'بند موثق', contractual_compensation_document_id: 'clause-proof' });
    return state;
  };
  it('accepts documented compensation after applying the contractual cap', () => {
    expect(() => assertRentClaimConsistent(withCompensation())).not.toThrow();
  });
  for (const change of ['rate', 'cap', 'document'] as const) it('rejects a changed compensation '+change+' before export', () => {
    const state = withCompensation();
    if (change === 'rate') state.litigationProfile!.contractual_compensation_rate = 10;
    if (change === 'cap') state.litigationProfile!.contractual_compensation_cap = 50;
    if (change === 'document') state.litigationProfile!.contractual_compensation_document_id = null;
    expect(() => assertRentClaimConsistent(state)).toThrow('تفاصيل التعويض الاتفاقي');
  });
  it('rejects a changed retention rate even when the saved monetary total remains unchanged', () => {
    const state = createState();
    Object.assign(state.calculations!, { retentionCompensation: 100, total: 160 });
    Object.assign(state.financialClaimSource.authoritativeAmounts!, state.calculations);
    state.financialClaimSource.authoritativeRetention = { days: 5, amount: 100, from: '2026-08-01', to: '2026-08-05' };
    Object.assign(state.litigationProfile!, { retention_daily_rate: 20, retention_rate_source: 'market_quotes',
      retention_rate_source_ref: 'عروض موثقة', retention_rate_source_document_id: 'price-proof' });
    expect(() => assertRentClaimConsistent(state)).not.toThrow();
    state.litigationProfile!.retention_daily_rate = 30;
    expect(() => assertRentClaimConsistent(state)).toThrow('تفاصيل الاحتباس');
  });
  it('accepts evidence amounts that reconcile to the server calculation', () => {
    expect(() => assertRentClaimConsistent(createState())).not.toThrow();
  });
  it('rejects stale damage evidence even when all calculated components match', () => {
    const state = createState();
    state.damageCosts[0].insurance_recovery = 10;
    expect(() => assertRentClaimConsistent(state)).toThrow('تفاصيل الأضرار');
  });
  it('rejects a changed deposit setting before exporting contradictory details', () => {
    const state = createState();
    state.litigationProfile!.apply_security_deposit = false;
    expect(() => assertRentClaimConsistent(state)).toThrow('وديعة الضمان');
  });
  it('does not apply rent-scope damages or deposits to a traffic-only memorandum', () => {
    const state = createState();
    state.legalCase = { claim_scope: 'traffic_violations_only' } as LawsuitPreparationState['legalCase'];
    Object.assign(state.calculations!, { damagesFee: 0, securityDepositDeduction: 0, total: 0 });
    Object.assign(state.financialClaimSource!.authoritativeAmounts!, state.calculations);
    expect(() => assertRentClaimConsistent(state)).not.toThrow();
  });
});


it('keeps explicit invoice service coverage even when it extends beyond the original contractual term', () => {
  const summary = summarizeRentClaim([{ id:'documented', invoice_number:'INV', due_date:'2026-08-01',
    total_amount:600,paid_amount:100,source:'invoice',
    service_period_start:'2026-08-01',service_period_end:'2026-08-12' }],
    { start_date:'2026-01-01',end_date:'2026-07-31' });
  expect(summary).toMatchObject({periodFrom:'2026-08-01',periodTo:'2026-08-12',grossRent:600,countedPayments:100,netRent:500});
});
