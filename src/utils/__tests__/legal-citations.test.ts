import { describe, expect, it } from 'vitest';
import { buildVerifiedExpeditedEnforcementRequest, getLegalCitationAudit, omitUnverifiedArticleReferences } from '../legal-citations';
import { generateLegalComplaint, generateLegalComplaintHTML, type LegalDocumentData } from '../legal-document-generator';
import { buildLegalMemoClaimsText } from '../legal-memo-requests';
import { fixedCompensationRegister } from './fixtures/fixedCompensation';
import { generateCriminalComplaintHtml, generateViolationsTransferHtml } from '../official-letters/violations-transfer';
import type { CriminalComplaintData, ViolationsTransferData } from '../official-letters/types';

const data = (): LegalDocumentData => ({
  memoDate: '02/11/2026',
  customer: { customer_name: 'عميل اختبار', customer_code: 'TEST', id_number: '00000000000',
    phone: '', email: '', days_overdue: 0, late_penalty: 0, overdue_amount: 1700,
    violations_amount: 300, violations_count: 1, total_debt: 2000 },
  companyInfo: { name_ar: 'شركة العراف لتأجير السيارات ذ.م.م', name_en: '', address: '', cr_number: '146832' },
  contractInfo: { contract_number: 'TEST', start_date: '31/12/2025', end_date: '31/12/2026', monthly_rent: 1700 },
  vehicleInfo: { plate: 'TEST' }, vehicleCustody: 'with_defendant',
});

describe('verified legal citations', () => {
  it.each([false, true])('uses exactly the internally audited articles, with register=%s', withRegister => {
    const input = data();
    if (withRegister) input.claimRegister = fixedCompensationRegister(1700, 300);
    const html = generateLegalComplaintHTML(input);
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
    const cited = [...text.matchAll(/المادة \((\d+)\)/g)].map(match => match[1]);
    const audit = getLegalCitationAudit(input);
    expect(new Set(cited)).toEqual(new Set(audit.map(item => item.article)));
    for (const item of audit) {
      expect(item.supportingText.length).toBeGreaterThan(15);
      expect(item.source).toMatch(/^https:\/\/(www\.almeezan\.qa|encyclop\.sjc\.gov\.qa)\//);
      expect(html).toContain(item.supportingText);
      expect(text).toContain(`المادة (${item.article}) من ${item.law}`);
    }
    expect(html).not.toMatch(/الماد(?:ة|تان|تين|واد).*\((?:369|370|211|204|97|266|267)\)/);
    expect(html).not.toContain('سند التشريعي الخاص بالمسؤولية والإخبار عن السائق: [يُستكمل]');
    expect(html).toContain('على الالتزام العقدي بتحملها في حدود ما يثبت من شروط العقد والكشف الرسمي');
    expect(html).toContain('المادة (67) من قانون المرور');
  });

  it('keeps rent and return statutes out of traffic-only claims', () => {
    const input = { ...data(), claimScope: 'traffic_violations_only' as const };
    expect(getLegalCitationAudit(input).map(item => item.article)).toEqual(['7', '171', '67', '333', '7', '9']);
    const text = generateLegalComplaint(input);
    expect(text).not.toMatch(/المادة \((582|607|616)\)/);
    expect(text).toContain('شمول الحكم بالنفاذ المعجل');
  });

  it('does not add traffic reporting law to a claim without violations', () => {
    const input = data();
    input.customer.violations_count = 0;
    input.customer.violations_amount = 0;
    expect(getLegalCitationAudit(input).some(item => item.article === '67')).toBe(false);
    expect(generateLegalComplaint(input)).not.toContain('المادة (67)');
  });

  it('distinguishes commercial enforcement with bond from conditional relief without bond', () => {
    const request = buildVerifiedExpeditedEnforcementRequest();
    expect(request).toContain('المادة (7) من قانون التنفيذ القضائي رقم (4) لسنة 2024');
    expect(request).toContain('مع تقديم الكفالة التي يحددها القاضي');
    expect(request).toContain('المادة (9) من قانون التنفيذ القضائي رقم (4) لسنة 2024');
    expect(request).toContain('إذا قدرت المحكمة تحقق إحدى حالاته');
    expect(request).toContain('متى ثبت ذلك بالأدلة المقدمة');
    expect(request).not.toMatch(/(?:أقر المدعى عليه|لم يجحد المدعى عليه|ثبت الضرر الجسيم)/);
  });

  it.each([
    'المادتان 369 و370', 'المواد (369 و370)', 'المواد (369) و(370)',
    'المادة ٢١١', 'المادة (۲۰۴)', 'المادة رقم 97', 'المواد 372 إلى 374',
    'المواد 369، و370', 'المادة (607)',
  ])('does not trust a manually entered attribution: %s', reference => {
    expect(omitUnverifiedArticleReferences(`${reference} من القانون`)).toBe('[يُستكمل] من القانون');
  });

  it('removes old legal attributions from saved register prose in HTML, text and filing requests', () => {
    const input = data();
    input.claimRegister = fixedCompensationRegister(1700, 300);
    const row = input.claimRegister.rows[0];
    row.basis = 'خصم الوفاء وفق المادتين (369) و(370) من القانون المدني';
    row.custom = true;
    row.description = 'المادة (211) تسند الطلب بتاريخ 31/12/2025 ومبلغ 1,700';
    for (const text of [generateLegalComplaintHTML(input), generateLegalComplaint(input), buildLegalMemoClaimsText(input)]) {
      expect(text).not.toContain('369');
      expect(text).not.toContain('370');
      expect(text).not.toContain('211');
      expect(text).toContain('[يُستكمل]');
      expect(text).toContain('31/12/2025');
      expect(text).toContain('1,700');
    }
  });

  it('preserves the supplied company name and years, and leaves an absent memo date incomplete', () => {
    const input = data();
    input.memoDate = undefined;
    const html = generateLegalComplaintHTML(input);
    expect(html).toContain(input.companyInfo.name_ar);
    expect(html).toContain('31/12/2025');
    expect(html).toContain('31/12/2026');
    expect(html).toContain('تاريخ المذكرة:</strong> [يُستكمل]');
  });

  it('does not invent statutes or quotations in the supporting traffic and criminal documents', () => {
    const traffic = generateViolationsTransferHtml({ violations: [], totalFines: 0 } as unknown as ViolationsTransferData);
    const criminal = generateCriminalComplaintHtml({} as CriminalComplaintData);
    expect(traffic).not.toContain('المادة (3)');
    expect(traffic).not.toContain('مستعمل المركبة يكون مسؤولاً');
    expect(criminal).not.toMatch(/المادة \((321|324|333)\)/);
    expect(traffic).toContain('المادة (67) من قانون المرور');
    expect(traffic).toContain('المادة (171) من القانون المدني');
    expect(traffic).not.toContain('السند التشريعي: [يُستكمل]');
    expect(criminal).toContain('[يُستكمل]');
  });
});
