import { describe, expect, it } from 'vitest';
import type { LegalDocumentData } from '../legal-document-generator';
import { buildLegalMemoClaimsText, buildLegalMemoRequestSections } from '../legal-memo-requests';

const baseData = (overrides: Partial<LegalDocumentData> = {}): LegalDocumentData => ({
  customer: {
    customer_name: 'عبد الرحيم شاكر احمد محمد',
    customer_code: 'CUS-0033',
    id_number: '28000000000',
    phone: '50000000',
    email: 'customer@example.test',
    days_overdue: 365,
    late_penalty: 0,
    overdue_amount: 14_040,
    violations_amount: 0,
    violations_count: 0,
    total_debt: 14_040,
  },
  companyInfo: {
    name_ar: 'شركة العراف لتأجير السيارات',
    name_en: 'Al-Araf Car Rental',
    address: 'الدوحة قطر',
    cr_number: '146832',
  },
  vehicleInfo: {
    plate: '4018',
    make: 'GAC',
    model: 'GS3',
    vin: 'LMWHR1G26R1107033',
  },
  contractInfo: {
    contract_number: 'C-ALF-0033',
    start_date: '01/08/2024',
    monthly_rent: 1_700,
  },
  unpaidPeriodTo: '01/08/2026',
  vehicleCustody: 'with_defendant',
  terminationPath: 'judicial',
  ...overrides,
});

describe('canonical legal memo requests', () => {
  it('uses one continuous sequence and never invents a notice or unsupported damages', () => {
    const claims = buildLegalMemoClaimsText(baseData());
    const lines = claims
      .split('\n')
      .filter((line) => line && line !== 'وفي الطلبات المالية والعينية التابعة:');

    expect(lines).toHaveLength(8);
    expect(lines[0]).toMatch(/^أولاً: قبول الدعوى/);
    expect(lines[1]).toMatch(/^ثانياً: الحكم بفسخ/);
    expect(lines[2]).toMatch(/^ثالثاً: إلزام المدعى عليه بأن يؤدي.*صافي الأجرة/);
    expect(lines[3]).toMatch(/^رابعاً: إلزام المدعى عليه برد المركبة/);
    expect(lines[4]).toMatch(/^خامساً: إلزام المدعى عليه.*تعويض احتباس/);
    expect(lines[5]).toMatch(/^سادساً: في حال تعذر الرد العيني/);
    expect(lines[6]).toMatch(/^سابعاً: شمول الحكم بالنفاذ المعجل/);
    expect(lines[7]).toMatch(/^ثامناً: إلزام المدعى عليه بالرسوم/);
    expect(claims).not.toContain('اعتبار إعلان صحيفة الدعوى');
    expect(claims).not.toContain('قيمة إصلاح الأضرار');
    expect(claims).not.toContain('التعويض الاتفاقي');
    expect(claims).not.toContain('قيمة المخالفات');
  });

  it('keeps every evidence-backed compensation branch in the same canonical order', () => {
    const sections = buildLegalMemoRequestSections(baseData({
      customer: {
        ...baseData().customer,
        violations_amount: 300,
        violations_count: 1,
        total_debt: 16_940,
      },
      damages: 1_800,
      damageCostItems: [
        { type: 'repair', description: 'فاتورة إصلاح', amount: 500 },
        { type: 'operational_loss', description: 'فوات انتفاع موثق', amount: 600 },
        { type: 'monetary_delay_damage', description: 'ضرر تأخير موثق', amount: 700 },
      ],
      contractualCompensation: {
        amount: 2_400,
        clauseNumber: '4',
        clauseText: 'تعويض 1200 ريال عن كل شهر استحقاق غير مسدد',
        method: 'monthly',
        rate: 1_200,
        units: 2,
      },
    }));
    const claims = [...sections.procedural, ...sections.financial, ...sections.closing].join('\n');

    const positions = [
      'قيمة إصلاح الأضرار',
      'فوات الانتفاع وصافي الكسب',
      'التأخر في سداد الدين النقدي',
      'قيمة التعويض الاتفاقي',
      'قيمة المخالفات والرسوم',
      'في حال تعذر الرد العيني',
      'شمول الحكم بالنفاذ المعجل',
    ].map((phrase) => claims.indexOf(phrase));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(claims).toContain('البند رقم (4)');
    expect(claims).toContain('بواقع (1,200 ريال) عن كل شهر');
  });

  it('includes the fixed QAR 2,000 penalty from clause 13.3 exactly once', () => {
    const claims = buildLegalMemoClaimsText(baseData({
      contractualCompensation: {
        amount: 2_000,
        clauseNumber: '13.3',
        clauseText: 'غرامة 2000 ريال عند إلغاء العقد بسبب مخالفة أحد البنود',
        method: 'fixed',
        rate: 2_000,
        units: 1,
      },
    }));

    expect(claims).toContain('مبلغ (2,000 ريال قطري)');
    expect(claims).toContain('قيمة التعويض الاتفاقي (الغرامة العقدية)');
    expect(claims).toContain('البند رقم (13.3)');
    expect(claims.match(/مبلغ \(2,000 ريال قطري\)/g)).toHaveLength(1);
    expect(claims).not.toContain('عن كل شهر');
  });
});
