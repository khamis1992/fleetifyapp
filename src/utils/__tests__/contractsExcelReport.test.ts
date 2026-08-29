import { describe, expect, it } from 'vitest';
import {
  buildContractsExcelReportModel,
  createContractsExcelWorkbook,
  type ContractReportContract,
  type ContractsExcelReportInput,
} from '@/utils/contractsExcelReport';

const makeContract = (
  overrides: Partial<ContractReportContract> = {},
): ContractReportContract => ({
  account_id: null,
  assigned_at: '2026-01-02',
  assigned_by_profile_id: null,
  assigned_to_profile_id: 'employee-1',
  assignment_notes: 'متابعة شهرية',
  auto_renew_enabled: true,
  balance_due: 500,
  company_id: 'company-1',
  contract_amount: 12_000,
  contract_date: '2026-01-01',
  contract_number: 'C-TEST-001',
  contract_type: 'rental',
  cost_center_id: 'cc-1',
  created_at: '2026-01-01T08:00:00Z',
  created_by: 'user-1',
  created_via: 'manual',
  creation_idempotency_key: null,
  customer_id: 'customer-1',
  days_overdue: 10,
  description: 'عقد اختبار',
  end_date: '2026-08-20',
  expired_at: null,
  id: 'contract-1',
  journal_entry_id: null,
  last_payment_check_date: null,
  last_payment_date: '2026-07-01',
  last_renewal_check: null,
  late_fine_amount: 50,
  legal_status: null,
  license_plate: null,
  make: null,
  model: null,
  monthly_amount: 1_000,
  payment_status: 'overdue',
  renewal_terms: null,
  start_date: '2026-01-01',
  status: 'active',
  sub_status: null,
  suspension_reason: null,
  terms: null,
  total_paid: 6_000,
  updated_at: '2026-08-01T08:00:00Z',
  vehicle_id: 'vehicle-1',
  vehicle_returned: false,
  vehicle_status: 'rented',
  year: null,
  customer: {
    id: 'customer-1',
    first_name: 'Ahmed',
    last_name: 'Ali',
    first_name_ar: 'أحمد',
    last_name_ar: 'علي',
    company_name: null,
    company_name_ar: null,
    customer_type: 'individual',
    phone: '50000000',
    email: 'ahmed@example.com',
    national_id: '12345678901',
  },
  vehicle: {
    id: 'vehicle-1',
    plate_number: '856589',
    make: 'Bestune',
    model: 'T77',
    year: 2023,
    status: 'rented',
  },
  cost_center: {
    id: 'cc-1',
    center_code: 'RENT',
    center_name: 'Rental',
    center_name_ar: 'التأجير',
  },
  assigned_employee: {
    id: 'employee-1',
    first_name: 'Osama',
    last_name: 'Ahmed',
    first_name_ar: 'أسامة',
    last_name_ar: 'أحمد',
    email: 'osama@example.com',
  },
  ...overrides,
});

const makeInput = (): ContractsExcelReportInput => ({
  contracts: [makeContract()],
  invoices: [{
    id: 'invoice-1',
    contract_id: 'contract-1',
    invoice_number: 'INV-001',
    invoice_month: '2026-08-01',
    invoice_date: '2026-08-01',
    due_date: '2026-08-01',
    invoice_type: 'rental',
    status: 'approved',
    payment_status: 'partially_paid',
    subtotal: 1_000,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 1_000,
    paid_amount: 500,
    balance_due: 500,
    currency: 'QAR',
    notes: null,
  }],
  payments: [{
    id: 'payment-1',
    contract_id: 'contract-1',
    invoice_id: 'invoice-1',
    payment_number: 'PAY-001',
    payment_date: '2026-08-05',
    payment_month: '2026-08-01',
    due_date: '2026-08-01',
    payment_method: 'bank_transfer',
    payment_type: 'rental',
    payment_status: 'completed',
    transaction_type: 'receipt',
    amount: 500,
    amount_paid: 500,
    remaining_amount: 0,
    days_overdue: 4,
    late_fine_amount: 0,
    reference_number: 'REF-1',
    reconciliation_status: 'reconciled',
    allocation_status: 'allocated',
    currency: 'QAR',
    notes: null,
  }],
  documents: [{
    id: 'document-1',
    contract_id: 'contract-1',
    document_type: 'signed_contract',
    document_name: 'signed.pdf',
    file_path: 'signed-agreements/company-1/signed.pdf',
    processing_status: 'completed',
    legal_evidence_state: 'active',
    legal_identity_match_status: 'matched',
    uploaded_at: '2026-01-01T08:00:00Z',
  }],
  companyName: 'شركة العراف لتأجير السيارات',
  currency: 'QAR',
  generatedAt: new Date('2026-08-28T09:00:00+03:00'),
});

describe('contractsExcelReport', () => {
  it('builds financial totals and actionable alerts from contract data', () => {
    const model = buildContractsExcelReportModel(makeInput());

    expect(model.summary).toMatchObject({
      totalContracts: 1,
      activeContracts: 1,
      totalContractValue: 12_000,
      activeMonthlyRevenue: 1_000,
      totalPaid: 6_000,
      totalBalance: 500,
      overdueContracts: 1,
    });
    expect(model.alerts.map((alert) => alert.category)).toEqual(
      expect.arrayContaining(['تعارض حالة العقد', 'تحصيل متأخر']),
    );
    expect(model.alerts.map((alert) => alert.category)).not.toContain('مستند مفقود');
    expect(model.contractRows[0]['نسبة التحصيل']).toBe(0.5);
    expect(model.contractRows[0]['حالة العقد الموقع']).toBe('موثق ومطابق');
    expect(model.invoiceRows[0]['تاريخ الاستحقاق']).toBeInstanceOf(Date);
  });

  it('creates a real RTL workbook with the five approved sheets and formulas', async () => {
    const { workbook } = await createContractsExcelWorkbook(makeInput());

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'الملخص التنفيذي',
      'جميع العقود',
      'الفواتير',
      'المدفوعات',
      'التنبيهات',
    ]);

    const contractsSheet = workbook.getWorksheet('جميع العقود');
    const summarySheet = workbook.getWorksheet('الملخص التنفيذي');
    expect(contractsSheet?.views[0]?.rightToLeft).toBe(true);
    expect(contractsSheet?.getCell('A2').value).toBe('C-TEST-001');
    expect(contractsSheet?.getCell('F2').value).toBeInstanceOf(Date);
    expect(summarySheet?.getCell('B6').value).toMatchObject({ formula: expect.any(String), result: 1 });

    const headers = contractsSheet?.getRow(1).values as unknown[];
    const signedStateColumn = headers.indexOf('حالة العقد الموقع');
    expect(contractsSheet?.getRow(2).getCell(signedStateColumn).value).toBe('موثق ومطابق');

    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(5_000);
  }, 15_000);

  it('omits optional detail sheets when the user disables them', async () => {
    const { workbook } = await createContractsExcelWorkbook({
      ...makeInput(),
      includeInvoices: false,
      includePayments: false,
      includeAlerts: false,
    });

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'الملخص التنفيذي',
      'جميع العقود',
    ]);
  });
});
