import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateLegalComplaintHTML, buildLegalMemoFactsText, type LegalDocumentData } from '../legal-document-generator';

const fixture: LegalDocumentData = {
  memoDate: '09/09/2026', caseNumber: '123/2026',
  customer: { customer_name: 'عميل اختبار المذكرة', customer_code: 'TEST', id_number: '00000000000', phone: '00000000',
    nationality: 'قطري', address: 'عنوان إعلان تجريبي', email: 'memo@example.test', days_overdue: 100,
    late_penalty: 0, overdue_amount: 4600, violations_amount: 300, violations_count: 1, total_debt: 4900 },
  companyInfo: { name_ar: 'شركة العراف لتأجير السيارات', name_en: 'Al-Araf Car Rental', cr_number: '146832', address: 'أم صلال محمد – الشارع التجاري – مبنى 79 – الطابق الأول – مكتب 2.' },
  contractInfo: { contract_number: 'MEMO-TEST', start_date: '01/01/2024', end_date: '31/12/2026', monthly_rent: 1700 },
  vehicleInfo: { make: 'Bestune', model: 'T33', year: 2024, plate: 'TEST-123', vin: 'TESTVIN0000000001' },
  unpaidPeriodFrom: '01/06/2026', unpaidPeriodTo: '31/08/2026', grossInvoicesTotal: 5100, paidTotal: 500,
  vehicleCustody: 'with_defendant', handoverInfo: { date: '01/01/2024', documented: true }, terminationPath: 'judicial',
};

describe('supplied Arabic explanatory memorandum', () => {
  it('renders every supplied identity, contract and monetary field with the requested headings', () => {
    const html = generateLegalComplaintHTML(fixture);
    const doc = new DOMParser().parseFromString(html,'text/html');
    const text = doc.body.textContent!.replace(/\s+/g,' ');
    for (const required of ['مذكرة شارحة', 'بطلب فسخ عقد إيجار مركبة وردها والمطالبة بالأجرة والمخالفات والتعويضات',
      'محكمة الاستثمار والتجارة الموقرة', 'الدائرة الابتدائية المختصة', '123/2026', '09/09/2026', '146832',
      'الشارع التجاري', 'مبنى 79', 'الطابق الأول', 'مكتب 2', 'خميس هاشم الجبر', 'المخول بالتوقيع', 'عميل اختبار المذكرة', '00000000000', 'قطري', 'عنوان إعلان تجريبي',
      '00000000', 'بيانات العقد والمركبة', 'MEMO-TEST', '01/01/2024', '31/12/2026', '1,700', 'Bestune', 'T33', '2024',
      'TEST-123', 'TESTVIN0000000001', 'أولاً: الاختصاص القضائي', 'المادة (7)', 'القانون رقم (21) لسنة 2021',
      'ثانياً: الوقائع', '5,100', '500', '4,600', '4,900']) expect(text).toContain(required);
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('NaN');
    const facts = buildLegalMemoFactsText(fixture);
    expect(facts).toContain('من 01/06/2026 إلى 31/08/2026');
    expect(facts).toContain('سدد منه مبلغ 500');
    expect(facts).toContain('صافي الأجرة غير المسددة مبلغ 4,600');
    if (process.env.FLEETIFY_MEMO_PREVIEW === '1') {
      mkdirSync('.tmp/memo-review',{recursive:true});
      writeFileSync('.tmp/memo-review/template.html', html);
    }
  });
});
