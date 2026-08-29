import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMemoDocumentData,
  buildViolationEvidenceDocumentEntries,
  getMemoDocumentDataForGeneration,
  isMemoSnapshotCurrent,
} from '../utils/documentGenerators';
import type { LawsuitPreparationState } from '../store';

describe('buildViolationEvidenceDocumentEntries', () => {
  it('omits the traffic report when no evidence file exists', () => {
    expect(buildViolationEvidenceDocumentEntries([])).toEqual([]);
  });

  it('adds the Ministry of Interior traffic report to the uploaded documents list', () => {
    expect(buildViolationEvidenceDocumentEntries([{
      id: 'report-1',
      name: '2766.pdf',
      url: 'https://example.test/2766.pdf',
      mimeType: 'application/pdf',
    }])).toEqual([{
      name: 'تقرير مخالفات وزارة الداخلية',
      status: 'مرفق',
      url: 'https://example.test/2766.pdf',
      type: 'pdf',
    }]);
  });

  it('lists every report when the contract has multiple evidence files', () => {
    const entries = buildViolationEvidenceDocumentEntries([
      { id: 'report-1', name: 'first.pdf', url: 'https://example.test/1.pdf', mimeType: 'application/pdf' },
      { id: 'report-2', name: 'second.pdf', url: 'https://example.test/2.pdf', mimeType: 'application/pdf' },
    ]);

    expect(entries.map(entry => entry.name)).toEqual([
      'تقرير مخالفات وزارة الداخلية (1 من 2)',
      'تقرير مخالفات وزارة الداخلية (2 من 2)',
    ]);
  });
});

describe('buildMemoDocumentData', () => {
  const baseState = {
    contractId: 'contract-1',
    companyId: 'company-1',
    contract: {
      id: 'contract-1',
      contract_number: 'LTO2024141',
      start_date: '2024-05-02',
      end_date: '2028-05-03',
      monthly_amount: 2500,
      customer_id: null,
      vehicle_id: null,
      license_plate: null,
      status: 'active',
      customers: null,
      vehicles: null,
    },
    customer: {
      id: 'customer-1',
      first_name: 'محمد',
      first_name_ar: 'محمد',
      last_name: 'علي',
      last_name_ar: 'علي',
      customer_type: 'individual',
      company_name: null,
      company_name_ar: null,
      national_id: '28901234567',
      nationality: 'مصري',
      phone: '55512345',
      email: null,
      address: 'الدوحة - المنطقة 41',
      country: 'Qatar',
    },
    vehicle: {
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      plate_number: '1412024',
      color: 'أبيض',
      vin: 'JTNBV56K013025489',
      status: 'rented',
    },
    overdueInvoices: [
      { id: 'inv-1', invoice_number: 'INV-1', due_date: '2026-05-01', total_amount: 3000, paid_amount: 1000 },
      { id: 'inv-2', invoice_number: 'INV-2', due_date: '2026-06-01', total_amount: 3000, paid_amount: 0 },
    ],
    paymentReminders: { count: 3, lastSentDate: '2026-07-01', sendMethods: ['whatsapp', 'sms'] },
    litigationProfile: {
      rescission_strategy: 'judicial_rescission',
      termination_type: 'judicial_rescission',
      termination_date: null,
      termination_date_status: 'requires_judicial_proof',
      vehicle_custody: 'with_defendant',
    },
    formalNotices: [],
    damageCosts: [],
    trafficViolations: [],
    violationEvidenceDocuments: [],
    companyDocuments: [],
    calculations: {
      overdueRent: 5000,
      lateFees: 600,
      damagesFee: 0,
      violationsFines: 0,
      violationsCount: 0,
      retentionCompensation: 0,
      securityDepositDeduction: 0,
      total: 5600,
      invoiceLateFees: [],
      overdueInvoicesCount: 2,
      totalDaysOverdue: 116,
      avgDaysOverdue: 58,
      amountInWords: '',
    },
    taqadiData: null,
    documents: { contract: { sourceDocumentId: 'signed-contract-1' } } as LawsuitPreparationState['documents'],
    memoSnapshots: [],
    ui: {} as LawsuitPreparationState['ui'],
  } as unknown as LawsuitPreparationState;

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts overdue days from the oldest unpaid invoice, not from contract start', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T00:00:00Z'));

    const data = buildMemoDocumentData(baseState);

    // من 01/05/2026 إلى 25/08/2026 = 116 يوماً (وليس منذ بداية العقد 2024)
    expect(data.customer.days_overdue).toBe(116);
    expect(data.unpaidPeriodFrom).toBe('01/05/2026');
    expect(data.unpaidPeriodTo).toBe('01/06/2026');
    expect(data.grossInvoicesTotal).toBe(6000);
    expect(data.paidTotal).toBe(1000);
  });

  it('wires vehicle identity, custody and reminder evidence into the memo data', () => {
    const data = buildMemoDocumentData(baseState);

    expect(data.vehicleInfo.vin).toBe('JTNBV56K013025489');
    expect(data.vehicleInfo.color).toBe('أبيض');
    expect(data.vehicleCustody).toBe('with_defendant');
    expect(data.contractInfo.end_date).toBe('03/05/2028');
    expect(data.customer.nationality).toBe('مصري');
    expect(data.customer.address).toBe('الدوحة - المنطقة 41');
    expect(data.reminders?.count).toBe(3);
    // لا توجد أضرار مثبتة بمستندات — لا تُمرر أي قيمة افتراضية
    expect(data.damages).toBeUndefined();
  });

  it('treats a returned vehicle as recovered and skips period data without invoices', () => {
    const state = {
      ...baseState,
      litigationProfile: {
        ...(baseState.litigationProfile as NonNullable<LawsuitPreparationState['litigationProfile']>),
        vehicle_custody: 'returned',
        vehicle_returned_at: '2026-07-01',
        vehicle_return_document_id: 'return-doc-1',
      },
      overdueInvoices: [],
    } as unknown as LawsuitPreparationState;

    const data = buildMemoDocumentData(state);

    expect(data.vehicleCustody).toBe('returned');
    expect(data.unpaidPeriodFrom).toBeUndefined();
    expect(data.customer.days_overdue).toBe(0);
  });

  it('throws when contract or calculations are missing', () => {
    expect(() =>
      buildMemoDocumentData({ ...baseState, contract: null } as unknown as LawsuitPreparationState),
    ).toThrow('بيانات غير مكتملة');

    expect(() =>
      buildMemoDocumentData({ ...baseState, calculations: null } as unknown as LawsuitPreparationState),
    ).toThrow('بيانات غير مكتملة');
  });

  it('prefers the documented litigation profile over system status heuristics', () => {
    const state = {
      ...baseState,
      vehicle: { ...(baseState.vehicle as NonNullable<LawsuitPreparationState['vehicle']>), status: 'rented' },
      litigationProfile: {
        rescission_strategy: 'judicial_rescission',
        termination_type: null,
        termination_date: null,
        termination_date_source: null,
        termination_date_status: 'requires_judicial_proof',
        termination_supporting_document_id: null,
        delivery_handover_date: '2024-05-05',
        delivery_handover_document_id: 'doc-1',
        vehicle_custody: 'returned',
        vehicle_returned_at: '2026-07-01',
        vehicle_return_document_id: 'return-doc-1',
        security_deposit_amount: 2500,
        apply_security_deposit: true,
        retention_daily_rate: 150,
        retention_rate_source: 'company_price_list',
        retention_rate_source_ref: 'قائمة 2026',
        retention_rate_source_document_id: 'rate-doc-1',
      },
    } as unknown as LawsuitPreparationState;

    const data = buildMemoDocumentData(state);

    // التوثيق يغلب حالة النظام (rented)
    expect(data.vehicleCustody).toBe('returned');
    expect(data.vehicleReturnedAt).toBe('01/07/2026');
    expect(data.securityDeposit).toEqual({ amount: 2500, applyToSettlement: true });
    expect(data.retentionRate?.daily).toBe(150);
    expect(data.retentionRate?.sourceLabel).toContain('قائمة الأسعار المعتمدة');
  });

  it('counts only verified damage costs and maps formal notices', () => {
    const state = {
      ...baseState,
      damageCosts: [
        { cost_type: 'recovery_towing', description: 'سحب المركبة', amount: 700, verified: true, evidence_document_id: 'damage-doc-1' },
        { cost_type: 'other', description: 'بند بلا مستند', amount: 9999, verified: false },
      ],
      formalNotices: [
        { notice_type: 'payment_demand', sent_on: '2026-06-01', delivery_method: 'registered_mail', delivered_on: '2026-06-05', delivery_confirmed: true, grace_period_days: 15, proof_document_id: 'notice-doc-1' },
      ],
    } as unknown as LawsuitPreparationState;

    const data = buildMemoDocumentData(state);

    expect(data.damages).toBe(700);
    expect(data.damageCostItems).toEqual([{ type: 'recovery_towing', description: 'سحب المركبة', amount: 700 }]);
    expect(data.formalNotices).toHaveLength(1);
    expect(data.formalNotices?.[0]).toMatchObject({
      noticeType: 'payment_demand',
      confirmed: true,
      graceDays: 15,
      methodLabel: 'البريد المسجل',
    });
  });

  it('detects financial changes made after an approved memo snapshot', () => {
    const payload = {
      ...buildMemoDocumentData(baseState),
      documentReference: 'MEMO-LTO2024141-20260826-V001',
    };
    const snapshot = { payload } as LawsuitPreparationState['memoSnapshots'][number];

    expect(isMemoSnapshotCurrent(baseState, snapshot)).toBe(true);
    const changed = {
      ...baseState,
      calculations: { ...baseState.calculations, overdueRent: 5100, total: 5700 },
    } as unknown as LawsuitPreparationState;
    expect(isMemoSnapshotCurrent(changed, snapshot)).toBe(false);
  });

  it('uses an approved frozen payload only while it still matches the live evidence', () => {
    const payload = {
      ...buildMemoDocumentData(baseState),
      documentReference: 'MEMO-LTO2024141-20260826-V001',
    };
    const stateWithSnapshot = {
      ...baseState,
      memoSnapshots: [{ readiness_status: 'approved', payload }],
    } as unknown as LawsuitPreparationState;

    expect(getMemoDocumentDataForGeneration(stateWithSnapshot).documentReference)
      .toBe('MEMO-LTO2024141-20260826-V001');

    const changed = {
      ...stateWithSnapshot,
      calculations: { ...stateWithSnapshot.calculations!, overdueRent: 5100, total: 5700 },
    } as LawsuitPreparationState;
    expect(getMemoDocumentDataForGeneration(changed).documentReference)
      .toBe('DRAFT-LTO2024141');
  });
});
