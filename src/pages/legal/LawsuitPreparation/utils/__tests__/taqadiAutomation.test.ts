import { describe, expect, it } from 'vitest';
import { buildTaqadiFilingPayload } from '../taqadiAutomation';
import type { LawsuitPreparationState } from '../../store';

const readyDocument = (id: string, name: string, htmlContent: string | null = null) => ({
  id,
  name,
  description: name,
  type: 'mandatory' as const,
  category: 'generated' as const,
  status: 'ready' as const,
  url: htmlContent ? `blob:${id}` : `https://example.com/${id}.pdf`,
  htmlContent,
  error: null,
  generatedAt: '2026-07-28T00:00:00.000Z',
});

function createState(withViolations = false): LawsuitPreparationState {
  return {
    companyId: 'company-1',
    contractId: 'contract-1',
    contract: {
      id: 'contract-1',
      contract_number: 'C-100',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      monthly_amount: 1500,
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      license_plate: '12345',
    },
    customer: null,
    vehicle: {
      make: 'Bestune',
      model: 'T77',
      year: 2023,
      plate_number: '12345',
      color: null,
      vin: null,
    },
    overdueInvoices: [],
    trafficViolations: withViolations
      ? [{
          id: 'violation-1',
          violation_number: 'V-1',
          violation_date: '2026-06-01',
          violation_type: 'speed',
          location: null,
          fine_amount: 500,
          total_amount: 500,
          status: 'pending',
        }]
      : [],
    violationEvidenceDocuments: withViolations
      ? [{
          id: 'proof-1',
          name: 'تقرير وزارة الداخلية',
          url: 'https://example.com/moi.pdf',
          mimeType: 'application/pdf',
        }]
      : [],
    companyDocuments: [],
    calculations: {
      overdueRent: 3000,
      lateFees: 0,
      damagesFee: 0,
      violationsFines: withViolations ? 500 : 0,
      violationsCount: withViolations ? 1 : 0,
      total: withViolations ? 3500 : 3000,
      invoiceLateFees: [],
      overdueInvoicesCount: 2,
      totalDaysOverdue: 60,
      avgDaysOverdue: 30,
      amountInWords: 'ثلاثة آلاف ريال قطري',
    },
    taqadiData: {
      caseTitle: 'مطالبة مالية',
      facts: 'وقائع الدعوى',
      claims: 'طلبات الدعوى',
      amount: 3000,
      amountInWords: 'ثلاثة آلاف ريال قطري',
      defendant: {
        fullName: 'عميل تجريبي',
        firstName: 'عميل',
        middleName: null,
        lastName: 'تجريبي',
        idNumber: '123456789',
        idType: 'بطاقة شخصية',
        nationality: 'تونسي',
        phone: '55555555',
        email: 'customer@example.com',
        address: 'عنوان العميل المسجل',
      },
      contract: {
        contractNumber: 'C-100',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        monthlyAmount: 1500,
      },
      vehicle: {
        make: 'Bestune',
        model: 'T77',
        year: 2023,
        plateNumber: '12345',
        color: null,
        vin: null,
        fullDescription: 'Bestune T77 2023',
      },
    },
    documents: {
      memo: readyDocument('memo', 'المذكرة', '<html>memo</html>'),
      claims: readyDocument('claims', 'كشف المطالبات', '<html>claims</html>'),
      docsList: readyDocument('docsList', 'كشف المستندات', '<html>list</html>'),
      violations: readyDocument('violations', 'كشف المخالفات', '<html>violations</html>'),
      violationsEvidence: readyDocument('violationsEvidence', 'تقرير وزارة الداخلية'),
      criminalComplaint: readyDocument('criminalComplaint', 'بلاغ'),
      violationsTransfer: readyDocument('violationsTransfer', 'طلب تحويل'),
      contract: readyDocument('contract', 'العقد'),
      commercialRegister: readyDocument('commercialRegister', 'السجل التجاري'),
      ibanCertificate: readyDocument('ibanCertificate', 'شهادة IBAN'),
      representativeId: readyDocument('representativeId', 'هوية المفوض'),
    },
    ui: {
      isLoading: false,
      isGeneratingAll: false,
      isRegistering: false,
      isDownloadingZip: false,
      isDownloadingInvoices: false,
      isSendingToLawsuitData: false,
      isTaqadiAutomating: false,
      isMarkingCaseOpened: false,
      showTaqadiData: false,
      taqadiServerRunning: false,
      taqadiAutomationStatus: '',
      copiedField: null,
      progress: { total: 3, ready: 3, percentage: 100 },
      includeCriminalComplaint: false,
      includeViolationsTransfer: false,
    },
  };
}

describe('buildTaqadiFilingPayload', () => {
  it('creates the fixed court classification and party order', () => {
    const payload = buildTaqadiFilingPayload(createState(), 'https://app.test/prepare');

    expect(payload.classification).toEqual({
      litigationDegree: 'ابتدائي',
      caseType: 'عقود الخدمات التجارية',
      caseSubtype: 'عقود إيجار السيارات وخدمات الليموزين',
      applicability: 'لا ينطبق',
    });
    expect(payload.plaintiff.partyOrder).toBe(1);
    expect(payload.representative.partyOrder).toBe(2);
    expect(payload.defendant.email).toBe('khamis-1992@hotmail.com');
    expect(payload.defendant.address).toBe('الدوحة قطر');
    expect(payload.finalApproval).toBe(true);
  });

  it('includes both violation documents when violations exist', () => {
    const payload = buildTaqadiFilingPayload(
      createState(true),
      'https://app.test/prepare',
    );

    expect(payload.documents.some((document) => document.key === 'violations')).toBe(true);
    expect(payload.documents.some((document) => document.key === 'violationsEvidence')).toBe(true);
  });

  it('rejects an incomplete filing package', () => {
    const state = createState();
    state.documents.contract.status = 'missing';
    state.documents.contract.url = null;

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))
      .toThrow('مستندات الدعوى غير مكتملة');
  });
});
