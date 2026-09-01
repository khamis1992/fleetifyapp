import { describe, expect, it } from 'vitest';
import {
  generateLegalComplaint,
  generateLegalComplaintHTML,
  type LegalDocumentData,
} from '../legal-document-generator';
import { buildLegalMemoClaimsText } from '../legal-memo-requests';

const lawsuitData: LegalDocumentData = {
  customer: {
    customer_name: 'عميل تجريبي',
    customer_code: 'CUS-1',
    id_number: '12345678901',
    phone: '50000000',
    email: 'customer@example.test',
    days_overdue: 1124,
    late_penalty: 134_880,
    overdue_amount: 50_500,
    violations_amount: 9_900,
    violations_count: 10,
    total_debt: 205_280,
  },
  companyInfo: {
    name_ar: 'شركة العراف لتأجير السيارات',
    name_en: 'Al-Araf Car Rental',
    address: 'الدوحة قطر',
    cr_number: '146832',
  },
  vehicleInfo: {
    plate: '123456',
  },
  contractInfo: {
    contract_number: 'LTO-TEST',
    start_date: '01/01/2024',
    monthly_rent: 2_500,
  },
  contractualCompensation: {
    amount: 134_880,
    clauseNumber: 'اختباري',
    clauseText: 'تعويض اتفاقي موثق لأغراض الاختبار',
    method: 'fixed',
    rate: 134_880,
    units: 1,
  },
  damages: 10_000,
};

describe('legal complaint claim total', () => {
  it.each([
    ['text', generateLegalComplaint],
    ['html', generateLegalComplaintHTML],
  ] as const)('includes traffic fines in the %s memo total', (_format, generate) => {
    const memo = generate(lawsuitData);

    expect(memo).toContain('205,280');
    expect(memo).toContain('المخالفات المرورية');
    expect(memo).not.toContain('عدم إدخال قيمة المخالفات المرورية ضمن المطالبة المالية');
  });

  it.each([
    ['text', generateLegalComplaint],
    ['html', generateLegalComplaintHTML],
  ] as const)('uses only QAR 6,300 of violations in a traffic-only %s memo', (_format, generate) => {
    const memo = generate({
      ...lawsuitData,
      claimScope: 'traffic_violations_only',
      customer: {
        ...lawsuitData.customer,
        overdue_amount: 50_500,
        late_penalty: 2_000,
        violations_amount: 6_300,
        violations_count: 2,
        total_debt: 58_800,
      },
      contractualCompensation: {
        amount: 2_000,
        clauseNumber: '13.3',
        clauseText: 'غرامة عقدية ثابتة',
        method: 'fixed',
        rate: 2_000,
        units: 1,
      },
      damages: 10_000,
      securityDeposit: { amount: 5_000, applyToSettlement: true },
      vehicleCustody: 'with_defendant',
    });

    expect(memo).toContain('6,300');
    expect(memo).toContain('المخالفات المرورية فقط');
    expect(memo).toContain('لا تشمل المطالبة رصيد الأجرة');
    expect(memo).not.toContain('50,500');
    expect(memo).not.toContain('غرامة عقدية ثابتة');
    expect(memo).not.toContain('تعويض احتباس');
    expect(memo).not.toContain('وديعة الضمان المستخدمة');
  });
});

describe('explanatory memo structure (approved template)', () => {
  it('uses the exact same canonical request text exposed to Taqadi', () => {
    const data: LegalDocumentData = {
      ...lawsuitData,
      unpaidPeriodTo: '01/08/2026',
      vehicleCustody: 'with_defendant',
      vehicleInfo: {
        plate: '7069',
        make: 'Bestune',
        model: 'BGE30',
        vin: 'LFBGE3064PJK31242',
      },
    };
    const memo = generateLegalComplaintHTML(data);
    const requestsHtml = memo
      .split('<!-- Section: Requests -->')[1]
      .split('<!-- الختام -->')[0];
    const normalizeText = (value: string) => value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s+([،.])/g, '$1')
      .trim();
    const renderedRequests = normalizeText(requestsHtml);

    for (const claim of buildLegalMemoClaimsText(data).split('\n')) {
      expect(renderedRequests).toContain(normalizeText(claim));
    }
  });

  it('addresses the Investment and Trade Court without exposing an internal case number', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      caseNumber: 'CASE-26-0034',
    });

    expect(memo).toContain('محكمة الاستثمار والتجارة');
    expect(memo).toContain('الدائرة الابتدائية المختصة بعقود إيجار السيارات وخدمات الليموزين');
    expect(memo).toContain('>طلب فسخ عقد إيجار مركبة</span>');
    expect(memo).not.toContain('طلب فسخ عقد إيجار مركبة قضائياً لإخلال المدعى عليه بالتزاماته');
    expect(memo).not.toContain('في الدعوى رقم');
    expect(memo).not.toContain('CASE-26-0034');
    expect(memo).toContain('ويمثلها');
  });

  it('renders the financial table with period/document column and net claim', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      grossInvoicesTotal: 60_500,
      paidTotal: 10_000,
      unpaidPeriodFrom: '01/05/2026',
      unpaidPeriodTo: '01/07/2026',
    });

    expect(memo).toContain('الفترة أو المستند');
    expect(memo).toContain('يخصم: المبالغ المسددة');
    expect(memo).toContain('(10,000)');
    expect(memo).toContain('صافي المطالبة حتى تاريخ إعداد الكشف');
    expect(memo).toContain('من 01/05/2026 إلى 01/07/2026');
    expect(memo).not.toContain('تعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع');
  });

  it('never injects arbitrary compensation when no documented damages exist', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      damages: undefined,
    });

    expect(memo).not.toContain('حرمان من الانتفاع بالمركبة وفق أجر المثل وقدره');
    expect(memo).not.toContain('غرامة تأخير قدرها (120)');
  });

  it('branches vehicle custody claims on the recorded vehicle status', () => {
    const withDefendant = generateLegalComplaintHTML({
      ...lawsuitData,
      vehicleCustody: 'with_defendant',
    });
    expect(withDefendant).not.toContain('ولا تزال المركبة محل العقد في حيازة المدعى عليه وفق البيانات القانونية المؤيدة في ملف القضية');
    expect(withDefendant).toContain('إلزام المدعى عليه برد المركبة');
    expect(withDefendant).toContain('أجر المثل');

    const returned = generateLegalComplaintHTML({
      ...lawsuitData,
      vehicleCustody: 'returned',
      returnDocumented: true,
    });
    expect(returned).toContain('المدعية استردت المركبة محل العقد');
    expect(returned).not.toContain('تسليم المدعية المركبة');
  });

  it('passes defendant and vehicle identifiers into the parties card', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      customer: { ...lawsuitData.customer, nationality: 'مصري', address: 'الدوحة - المنطقة 41' },
      vehicleInfo: { ...lawsuitData.vehicleInfo, vin: 'JTNBV56K013025489', color: 'أبيض' },
    });

    expect(memo).toContain('مصري');
    expect(memo).toContain('الدوحة - المنطقة 41');
    expect(memo).toContain('JTNBV56K013025489');
    expect(memo).toContain('رقم الهيكل (VIN)');
  });

  it('keeps party labels and values adjacent in the memo layout', () => {
    const memo = generateLegalComplaintHTML(lawsuitData);

    expect(memo).toContain('grid-template-columns: minmax(105px, 125px) minmax(0, 1fr)');
    expect(memo).toContain('.info-row > span:last-child');
    expect(memo).not.toMatch(/\.info-row\s*\{[^}]*justify-content:\s*space-between/);
  });

  it('claims violations financially without requesting administrative transfer', () => {
    const memo = generateLegalComplaintHTML(lawsuitData);

    expect(memo).toContain('دون تعليق طلبات الدعوى على إجراء التحويل الإداري');
    expect(memo).not.toContain('طلب أصلي: إصدار أمر بتحويل جميع المخالفات المرورية');
  });

  it('does not invent a notice and adds the expedited-enforcement request', () => {
    const memo = generateLegalComplaintHTML(lawsuitData);

    expect(memo).not.toContain('اعتبار إعلان صحيفة الدعوى');
    expect(memo).not.toContain('وتطلب المدعية احتياطياً اعتبار إعلان صحيفة الدعوى');
    expect(memo).not.toContain('ندب خبير حسابي وفني');
    expect(memo).toContain('شمول الحكم بالنفاذ المعجل');
    expect(memo).toContain('من قانون التنفيذ القضائي رقم <strong>(4)</strong> لسنة 2024');
    expect(memo).toContain('التوقيع: __________________');
    expect(memo).toContain('التاريخ:');
  });

  it('includes the revised jurisdiction and evidence sections', () => {
    const memo = generateLegalComplaintHTML(lawsuitData);

    expect(memo).toContain('أولاً: الاختصاص القضائي');
    expect(memo).toContain('المادة (7) من قانون رقم (21) لسنة 2021');
    expect(memo).toContain('خامساً: الإثبات والرد على الدفوع');
    expect(memo).toContain('سادساً: الطلبات');
  });

  it('repeats the footer on every printed page without consuming a final page', () => {
    const memo = generateLegalComplaintHTML(lawsuitData);

    expect(memo).toContain('margin: 15mm 20mm 25mm 20mm');
    expect(memo).toContain('@bottom-center');
    expect(memo).toMatch(/@media print[\s\S]*?\.footer\s*\{[\s\S]*?display:\s*none/);
    expect(memo).toContain('ذيل طباعة مستقل حتى يتكرر في كل صفحة ولا ينشئ صفحة ختامية');
  });

  it('falls back to judicial rescission when documented termination lacks proof of delivery', () => {
    const incomplete = generateLegalComplaintHTML({
      ...lawsuitData,
      terminationPath: 'documented',
      terminationInfo: { type: 'documented_cancellation', date: '01/06/2026', status: 'confirmed' },
      formalNotices: [
        { noticeType: 'termination_notice', sentOn: '2026-05-20', deliveredOn: null, confirmed: false, graceDays: 7, methodLabel: 'البريد المسجل' },
      ],
    });

    expect(incomplete).toContain('الحكم بفسخ عقد إيجار المركبة رقم');
    expect(incomplete).not.toContain('إثبات انتهاء عقد الإيجار رقم');

    const complete = generateLegalComplaintHTML({
      ...lawsuitData,
      terminationPath: 'documented',
      terminationInfo: { type: 'documented_cancellation', date: '01/06/2026', status: 'confirmed' },
      terminationClause: { number: '12', text: 'ينفسخ العقد عند عدم السداد بعد الإنذار.' },
      formalNotices: [
        { noticeType: 'termination_notice', sentOn: '2026-05-20', deliveredOn: '2026-05-25', confirmed: true, proofDocumentId: 'notice-proof-1', graceDays: 7, methodLabel: 'البريد المسجل' },
      ],
    });

    expect(complete).toContain('ثبوت انفساخ عقد الإيجار رقم');
    expect(complete).toContain('أعملت المدعية الشرط الفاسخ');
    expect(complete).toContain('وثبت وصوله إليه بتاريخ <strong>25/05/2026</strong>');
  });

  it('applies the security deposit deduction once and shows the net claim', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      securityDeposit: { amount: 5_000, applyToSettlement: true },
    });
    const total = 205_280;
    const net = total - 5_000;

    expect(memo).toContain('يخصم: وديعة الضمان المستخدمة في التسوية');
    expect(memo).toContain('(5,000)');
    expect(memo).toContain(`صافي المطالبة حتى تاريخ إعداد الكشف</td>\n            <td class="amount" style="font-size: 15px; color: white;">${net.toLocaleString('en-US')}`);
    expect(memo).not.toContain(`>${total.toLocaleString('en-US')}</td>`);
  });

  it('lists verified damage cost items with their amounts', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      damageCostItems: [
        { description: 'مصاريف سحب المركبة', amount: 700 },
        { description: 'فحص فني وتخزين', amount: 300 },
      ],
    });

    expect(memo).toContain('مصاريف سحب المركبة');
    expect(memo).toContain('فحص فني وتخزين');
  });

  it('separates payment-delay, financing and operational damage requests', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      damages: 7_000,
      vehicleCustody: 'with_defendant',
      damageCostItems: [
        { type: 'monetary_delay_damage', description: 'رسوم تحصيل مثبتة', amount: 500 },
        { type: 'financing_burden_damage', description: 'أعباء تمويل مثبتة', amount: 2_500 },
        { type: 'operational_loss', description: 'صافي فوات التشغيل', amount: 4_000 },
      ],
    });

    expect(memo).toContain('المواد 256 و263 و268');
    expect(memo).toContain('الأعباء التمويلية المرتبطة سببياً بالتأخر');
    expect(memo).toContain('فوات الانتفاع وصافي الكسب خلال مدة إصلاح المركبة المعقولة بعد استردادها');
    expect(memo).toContain('دون تكرار أصل الدين أو الجمع بينه وبين تعويض اتفاقي عن الضرر ذاته');
    expect(memo).toContain('دون ازدواج مع تعويض الاحتباس');
  });

  it('shows a documented monthly contractual-compensation formula', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      customer: { ...lawsuitData.customer, late_penalty: 3_600 },
      contractualCompensation: {
        amount: 3_600,
        clauseNumber: '4',
        clauseText: 'تعويض اتفاقي موثق',
        method: 'monthly',
        rate: 1_200,
        units: 3,
      },
    });

    expect(memo).toContain('1,200 ريال × 3 شهر استحقاق غير مسدد');
    expect(memo).toContain('بواقع <strong>(1,200 ريال)</strong> عن كل شهر استحقاق غير مسدد');
  });

  it('renders clause 13.3 and its fixed QAR 2,000 penalty in the memo', () => {
    const clauseText = 'في حال مخالفة الطرف الثاني لأي من بنود هذا العقد يحق للطرف الأول إنهاء العقد دون الحاجة إلى إنذار أو إخطار من قبل الطرف الأول، كما يترتب على الطرف الثاني غرامة 2000 ريال في حال إلغاء العقد بسبب مخالفته لأحد البنود.';
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      customer: {
        ...lawsuitData.customer,
        overdue_amount: 24_150,
        violations_amount: 500,
        violations_count: 1,
      },
      contractualCompensation: {
        amount: 2_000,
        clauseNumber: '13.3',
        clauseText,
        method: 'fixed',
        rate: 2_000,
        units: 1,
      },
      damages: undefined,
    });

    expect(memo).toContain('صافي المطالبة حتى تاريخ إعداد الكشف</td>\n            <td class="amount" style="font-size: 15px; color: white;">26,650');
    expect(memo).toContain('الغرامة العقدية بوصفها تعويضاً اتفاقياً');
    expect(memo).toContain('البند رقم (13.3)');
    expect(memo).toContain(clauseText);
    expect(memo).toContain('مبلغ ثابت قدره 2,000 ريال قطري');
  });

  it('quantifies retention compensation when a documented daily rate exists', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      vehicleCustody: 'with_defendant',
      retentionRate: { daily: 150, sourceLabel: 'قائمة الأسعار المعتمدة للشركة', sourceRef: 'قائمة 2026' },
      retentionClaim: { days: 10, amount: 1500, from: '2026-08-01', to: '2026-08-10' },
    });

    expect(memo).toContain('10 يوم × 150 ريال');
    expect(memo).toContain('بتعويض احتباس');
  });

  it('renders the stronger evidence-gated financial requests with dynamic contract values', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      customer: {
        ...lawsuitData.customer,
        overdue_amount: 36_000,
      },
      contractInfo: {
        ...lawsuitData.contractInfo,
        monthly_rent: 1_500,
      },
      unpaidPeriodTo: '01/08/2026',
      vehicleCustody: 'with_defendant',
      retentionRate: {
        daily: 75,
        sourceLabel: 'قائمة أسعار موثقة',
        sourceRef: 'مرجع 2026',
      },
      retentionClaim: {
        days: 30,
        amount: 2_250,
        from: '2026-08-02',
        to: '2026-08-31',
      },
      damages: 9_000,
      damageCostItems: [
        { type: 'non_standard_repairs', description: 'إصلاحات مثبتة', amount: 3_000 },
        { type: 'operational_loss', description: 'فوات انتفاع خلال الإصلاح', amount: 4_000 },
        { type: 'monetary_delay_damage', description: 'ضرر تأخير مثبت', amount: 2_000 },
      ],
    });

    expect(memo).toContain('قيمة صافي الأجرة المستحقة حتى <strong>01/08/2026</strong>');
    expect(memo).toContain('بواقع <strong>(1,500 ريال قطري)</strong> شهرياً');
    expect(memo).toContain('أو نسبتها عن جزء الشهر وفق العقد');
    expect(memo).toContain('ولا يعتد بالرد إلا بما يثبت انتقال الحيازة فعلياً');
    expect(memo).toContain('من اليوم التالي للتاريخ الذي يصير فيه الفسخ منتجاً لآثاره');
    expect(memo).toContain('قيمة إصلاح الأضرار غير الناتجة عن الاستعمال المألوف');
    expect(memo).toContain('فوات الانتفاع وصافي الكسب خلال مدة إصلاح المركبة المعقولة بعد استردادها');
    expect(memo).toContain('وفق المواد <strong>(256)</strong> و<strong>(263)</strong> و(268) من القانون المدني');
    expect(memo).toContain('القيمة السوقية للمركبة وقت وجوب ردها');
    expect(memo).toMatch(/\.request-item::before\s*\{\s*display:\s*none/);
    expect(memo).not.toContain('content: counter(request)');
  });

  it('omits unsupported consequential requests when their evidence-gated amounts are absent', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      customer: {
        ...lawsuitData.customer,
        violations_amount: 0,
        violations_count: 0,
        late_penalty: 0,
      },
      contractualCompensation: undefined,
      damages: undefined,
      damageCostItems: undefined,
      vehicleCustody: 'returned',
      returnDocumented: true,
    });

    expect(memo).toContain('قيمة صافي الأجرة المستحقة');
    expect(memo).not.toContain('قيمة إصلاح الأضرار غير الناتجة عن الاستعمال المألوف');
    expect(memo).not.toContain('فوات الانتفاع وصافي الكسب خلال مدة إصلاح المركبة المعقولة');
    expect(memo).not.toContain('تعويضاً عادلاً عن الضرر الفعلي المباشر الناجم عن التأخر');
    expect(memo).not.toContain('القيمة السوقية للمركبة وقت وجوب ردها');
  });

  it('escapes untrusted party and evidence text before rendering HTML', () => {
    const memo = generateLegalComplaintHTML({
      ...lawsuitData,
      customer: { ...lawsuitData.customer, customer_name: '<img src=x onerror=alert(1)>' },
      additionalNotes: '<script>alert(1)</script>',
    });

    expect(memo).not.toContain('<script>alert(1)</script>');
    expect(memo).not.toContain('<img src=x onerror=alert(1)>');
    expect(memo).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
