import type { LegalDocumentData, VehicleCustody } from './legal-document-generator';
import { isTrafficViolationsOnlyScope } from '@/types/legalClaimScope';

export interface LegalMemoRequestSections {
  procedural: string[];
  financial: string[];
  closing: string[];
}

const REQUEST_ORDINALS = [
  'أولاً', 'ثانياً', 'ثالثاً', 'رابعاً', 'خامساً',
  'سادساً', 'سابعاً', 'ثامناً', 'تاسعاً', 'عاشراً',
  'حادي عشر', 'ثاني عشر', 'ثالث عشر', 'رابع عشر', 'خامس عشر',
];

const formatQar = (value: number): string => value.toLocaleString('en-US');

const toEnglishDigits = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
};

/**
 * المصدر القانوني الوحيد لبنود الطلبات في المذكرة وبيانات نظام تقاضي.
 * لا يضيف أي تعويض غير مربوط ببند عقد أو مستند إثبات في LegalDocumentData.
 */
export function buildLegalMemoRequestSections(
  data: LegalDocumentData,
): LegalMemoRequestSections {
  const { customer, contractInfo } = data;
  const overdueRent = Math.max(0, Number(customer.overdue_amount || 0));
  const violationsAmount = Math.max(0, Number(customer.violations_amount || 0));
  const latePenalty = data.contractualCompensation
    ? Math.max(0, Number(data.contractualCompensation.amount || 0))
    : 0;
  const documentedDamages = Math.max(0, Number(data.damages || 0));
  const monetaryDelayDamage = (data.damageCostItems || [])
    .filter((item) => item.type === 'monetary_delay_damage')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const financingBurdenDamage = (data.damageCostItems || [])
    .filter((item) => item.type === 'financing_burden_damage')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const operationalLoss = (data.damageCostItems || [])
    .filter((item) => item.type === 'operational_loss')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paymentDelayDamage = monetaryDelayDamage + financingBurdenDamage;
  const materialDamage = Math.max(
    0,
    documentedDamages - paymentDelayDamage - operationalLoss,
  );

  const terminationNoticeDelivered = (data.formalNotices || []).some(
    (notice) => notice.noticeType === 'termination_notice'
      && notice.confirmed
      && Boolean(notice.deliveredOn)
      && Boolean(notice.proofDocumentId),
  );
  const naturalExpiryComplete = data.terminationPath === 'natural_expiry'
    && data.terminationInfo?.type === 'contract_expired'
    && data.terminationInfo.status === 'confirmed'
    && Boolean(data.terminationInfo.date);
  const documentedTerminationComplete = data.terminationPath === 'documented'
    && data.terminationInfo?.status === 'confirmed'
    && Boolean(data.terminationInfo.date)
    && Boolean(data.terminationClause)
    && terminationNoticeDelivered;
  const effectiveTerminationPath: 'natural_expiry' | 'documented' | 'judicial' = naturalExpiryComplete
    ? 'natural_expiry'
    : documentedTerminationComplete
      ? 'documented'
      : 'judicial';

  const procedural: string[] = [];
  const financial: string[] = [];
  const closing: string[] = [];
  let requestIndex = 0;
  const addRequest = (target: string[], claim: string): void => {
    const ordinal = REQUEST_ORDINALS[requestIndex++] || 'وأخيراً';
    target.push(`${ordinal}: ${claim}`);
  };

  addRequest(procedural, 'قبول الدعوى شكلًا.');

  if (isTrafficViolationsOnlyScope(data.claimScope)) {
    if (customer.violations_count > 0 && violationsAmount > 0) {
      addRequest(financial,
        `إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${formatQar(violationsAmount)} ريال قطري) قيمة المخالفات المرورية المرتبطة بالعقد فقط، والتي ثبت وقوعها خلال فترة حيازته للمركبة وفق الكشوف الرسمية وأحكام العقد. ولا تشمل المطالبة رصيد الأجرة أو غرامات التأخير أو أي تعويضات أخرى ضمن هذه الدعوى.`,
      );
    }
    addRequest(closing, 'إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.');
    return { procedural, financial, closing };
  }

  if (effectiveTerminationPath === 'natural_expiry') {
    addRequest(procedural,
      `ثبوت انتهاء عقد الإيجار رقم (${contractInfo.contract_number}) بانقضاء مدته بتاريخ ${toEnglishDigits(data.terminationInfo?.date)}، مع ما يترتب على ذلك من آثار.`,
    );
  } else if (effectiveTerminationPath === 'documented') {
    addRequest(procedural,
      `ثبوت انفساخ عقد الإيجار رقم (${contractInfo.contract_number}) اعتباراً من تاريخ ${toEnglishDigits(data.terminationInfo?.date)} لإعمال الشرط الفاسخ الصريح الوارد في البند رقم (${data.terminationClause?.number})، وعلى سبيل الاحتياط الحكم بفسخه قضائياً.`,
    );
  } else {
    addRequest(procedural,
      `الحكم بفسخ عقد إيجار المركبة رقم (${contractInfo.contract_number}) لإخلال المدعى عليه إخلالًا جوهريًا ومستمرًا بالتزامه بسداد الأجرة والالتزامات الناشئة عن العقد.`,
    );
  }

  if (overdueRent > 0) {
    const rentThrough = data.unpaidPeriodTo
      ? toEnglishDigits(data.unpaidPeriodTo)
      : 'تاريخ كشف المطالبة المرفق';
    const ongoingRent = effectiveTerminationPath === 'judicial'
      ? `، وما يستجد من أجرة تعاقدية بواقع (${formatQar(Number(contractInfo.monthly_rent || 0))} ريال قطري) شهرياً، أو نسبتها عن جزء الشهر وفق العقد، حتى التاريخ الذي يصير فيه الفسخ منتجاً لآثاره`
      : '';
    addRequest(financial,
      `إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${formatQar(overdueRent)} ريال قطري) قيمة صافي الأجرة المستحقة حتى ${rentThrough}${ongoingRent}، بعد خصم أي مبالغ مسددة.`,
    );
  }

  const custody: VehicleCustody = data.vehicleCustody ?? 'unknown';
  if (custody === 'with_defendant') {
    addRequest(financial,
      'إلزام المدعى عليه برد المركبة المبينة بياناتها في صدر المذكرة، تسليماً فعلياً كاملاً وصالحاً للحيازة والانتفاع، مع جميع المفاتيح والوثائق والملحقات، ولا يعتد بالرد إلا بما يثبت انتقال الحيازة فعلياً، ومن ذلك محضر تسليم أو مستند رسمي معتبر.',
    );

    const operativeTerminationDate = effectiveTerminationPath !== 'judicial'
      ? toEnglishDigits(data.terminationInfo?.date)
      : '';
    const retentionStart = operativeTerminationDate
      ? `من اليوم التالي لتاريخ ${operativeTerminationDate}`
      : 'من اليوم التالي للتاريخ الذي يصير فيه الفسخ منتجاً لآثاره';
    const quantifiedRetention = data.retentionClaim && data.retentionClaim.amount > 0
      ? `، على أن يشمل مبلغ (${formatQar(data.retentionClaim.amount)} ريال قطري) الثابت حتى تاريخ إعداد المطالبة عن مدة (${data.retentionClaim.days}) يوماً`
      : '';
    const retentionSource = data.retentionRate
      ? ` استناداً إلى ${data.retentionRate.sourceLabel} (${data.retentionRate.sourceRef})`
      : '';
    addRequest(financial,
      `إلزام المدعى عليه، ${retentionStart} وحتى تاريخ التسليم الفعلي، بتعويض احتباس يحدد وفق القيمة الإيجارية السوقية للمركبة${quantifiedRetention}${retentionSource}، مع تعويض ما يثبت من أضرار إضافية، ودون الجمع بين الأجرة والتعويض عن الفترة ذاتها.`,
    );
  }

  if (materialDamage > 0) {
    addRequest(financial,
      `إلزام المدعى عليه بمبلغ (${formatQar(materialDamage)} ريال قطري)، أو بما يثبت بالمستندات وما تقدره الخبرة عند الاقتضاء، قيمة إصلاح الأضرار غير الناتجة عن الاستعمال المألوف، والنقص في القيمة السوقية، والملحقات والمفاتيح المفقودة، ومصاريف الفحص والسحب والاسترداد والحجز والتأمين والتحمل التأميني، بعد الخصومات الواجبة.`,
    );
  }

  if (operationalLoss > 0) {
    addRequest(financial,
      `إلزام المدعى عليه بمبلغ (${formatQar(operationalLoss)} ريال قطري)، أو بما تقدره المحكمة، تعويضاً عن فوات الانتفاع وصافي الكسب خلال مدة إصلاح المركبة المعقولة بعد استردادها، وفق المستندات وما تقدره الخبرة عند الاقتضاء، ودون ازدواج مع تعويض الاحتباس.`,
    );
  }

  if (paymentDelayDamage > 0) {
    addRequest(financial,
      `إلزام المدعى عليه بمبلغ (${formatQar(paymentDelayDamage)} ريال قطري)، أو بما تقدره المحكمة، تعويضاً عادلاً عن الضرر الفعلي المباشر الناجم عن التأخر في سداد الدين النقدي بعد إعذاره قانوناً، وفق المواد (256) و(263) و(268) من القانون المدني، وبما يشمل الأعباء التمويلية المرتبطة سببياً بالتأخر، دون تكرار أصل الدين أو الجمع بينه وبين تعويض اتفاقي عن الضرر ذاته.`,
    );
  }

  if (latePenalty > 0) {
    const monthlyFormula = data.contractualCompensation?.method === 'monthly'
      ? `، بواقع (${formatQar(Number(data.contractualCompensation.rate || 0))} ريال) عن كل شهر استحقاق غير مسدد وعددها (${Number(data.contractualCompensation.units || 0)}) شهراً`
      : '';
    addRequest(financial,
      `إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${formatQar(latePenalty)} ريال قطري) قيمة التعويض الاتفاقي (الغرامة العقدية) الوارد في البند رقم (${data.contractualCompensation?.clauseNumber})${monthlyFormula}، في الحدود التي تجيزها أحكام القانون ومع خضوعه لرقابة المحكمة، ودون جمعه مع تعويض آخر عن الضرر ذاته.`,
    );
  }

  if (customer.violations_count > 0) {
    addRequest(financial,
      `إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${formatQar(violationsAmount)} ريال قطري) قيمة المخالفات والرسوم والمصاريف التي ثبت وقوعها خلال فترة حيازته للمركبة، وفق الكشوف الرسمية وأحكام العقد، دون تعليق طلبات الدعوى على إجراء التحويل الإداري.`,
    );
  }

  if (custody === 'with_defendant' || custody === 'lost') {
    addRequest(financial,
      'في حال تعذر الرد العيني، إلزام المدعى عليه، على سبيل البديل، بالقيمة السوقية للمركبة وقت وجوب ردها، مع التعويضات الأخرى التي لا تتداخل مع قيمة المركبة، وفق المستندات وما تقدره الخبرة عند الاقتضاء.',
    );
  }

  addRequest(
    closing,
    'شمول الحكم بالنفاذ المعجل، وبغير كفالة إن رأت المحكمة توافر شروط المادة (9) من قانون التنفيذ القضائي رقم (4) لسنة 2024، وعلى الأخص ما يترتب على تأخير التنفيذ من ضرر جسيم بمصلحة المدعية.',
  );
  addRequest(closing, 'إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.');

  return {
    procedural,
    financial,
    closing,
  };
}

export function buildLegalMemoClaimsText(data: LegalDocumentData): string {
  const sections = buildLegalMemoRequestSections(data);
  return [
    ...sections.procedural,
    ...(sections.financial.length > 0 ? ['وفي الطلبات المالية والعينية التابعة:'] : []),
    ...sections.financial,
    ...sections.closing,
  ].join('\n');
}
