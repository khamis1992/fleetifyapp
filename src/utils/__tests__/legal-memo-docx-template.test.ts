import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createDocxDocumentFromHtml } from '../document-export';
import { generateLegalComplaintHTML, type LegalDocumentData } from '../legal-document-generator';

async function wordParagraphs(html: string) {
  const { document, docxModule } = await createDocxDocumentFromHtml(html);
  const buffer = await docxModule.Packer.toBuffer(document);
  const archive = await JSZip.loadAsync(buffer);
  const xml = await archive.file('word/document.xml')!.async('string');
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');
  expect(parsed.querySelector('parsererror')).toBeNull();
  return Array.from(parsed.getElementsByTagName('w:p'))
    .map(paragraph => Array.from(paragraph.getElementsByTagName('w:t')).map(run => run.textContent).join(''));
}

describe('revised memo Word export used by preparation and Taqadi', () => {
  it('preserves the memo date separately from the court number and all supplied facts', async () => {
    const data: LegalDocumentData = {
      memoDate: '08/09/2026', caseNumber: '123/2026', documentReference: 'MEMO-TEST-V2',
      customer: { customer_name: 'عميل اختبار', customer_code: 'TEST', id_number: '00000000000',
        phone: '00000000', email: 'client@example.test', nationality: 'قطري', address: 'عنوان إعلان تجريبي',
        days_overdue: 30, late_penalty: 0, overdue_amount: 4600, violations_amount: 300, violations_count: 1, total_debt: 4900 },
      companyInfo: { name_ar: 'شركة العراف لتأجير السيارات', name_en: 'Al-Araf', cr_number: '146832',
        address: 'أم صلال محمد – الشارع التجاري – مبنى 79 – الطابق الأول – مكتب 2.' },
      contractInfo: { contract_number: 'MEMO-TEST', start_date: '01/01/2024', end_date: '31/12/2026', monthly_rent: 1700 },
      vehicleInfo: { make: 'Bestune', model: 'T33', year: 2024, plate: 'TEST-123', vin: 'TESTVIN0000000001' },
      unpaidPeriodFrom: '01/06/2026', unpaidPeriodTo: '31/08/2026', grossInvoicesTotal: 5100, paidTotal: 500,
      vehicleCustody: 'with_defendant', handoverInfo: { date: '01/01/2024', documented: true }, terminationPath: 'judicial',
    };
    const paragraphs = await wordParagraphs(generateLegalComplaintHTML(data));
    expect(paragraphs).toContain('تاريخ المذكرة: 08/09/2026');
    expect(paragraphs).toContain('الدعوى رقم: 123/2026');
    expect(paragraphs).toContain('الرقم المرجعي: MEMO-TEST-V2');
    expect(paragraphs.some(text => text.includes('التاريخ: الدعوى رقم'))).toBe(false);
    const text = paragraphs.join(' ').replace(/\s+/g, ' ');
    for (const value of ['مذكرة شارحة', 'بطلب فسخ عقد إيجار مركبة وردها', 'محكمة الاستثمار والتجارة الموقرة',
      'الدائرة الابتدائية المختصة', '146832', 'مبنى 79', 'خميس هاشم الجبر', 'عميل اختبار', '00000000000', 'قطري',
      'عنوان إعلان تجريبي', '00000000', 'MEMO-TEST', '01/01/2024', '31/12/2026', '1,700', 'Bestune', 'T33', '2024',
      'TEST-123', 'TESTVIN0000000001', 'المادة (7)', 'القانون رقم (21) لسنة 2021', '01/06/2026', '31/08/2026',
      '5,100', 'سدد منه مبلغ 500', 'صافي الأجرة غير المسددة مبلغ 4,600']) expect(text).toContain(value);
  });

  it('keeps the historical date when converting the earlier two-row header', async () => {
    const paragraphs = await wordParagraphs('<div class="ref-date"><div>الرقم المرجعي: OLD</div><div>التاريخ: 01/02/2024</div></div>');
    expect(paragraphs).toContain('التاريخ: 01/02/2024');
    expect(paragraphs.some(text => text.startsWith('الدعوى رقم:'))).toBe(false);
  });
});
