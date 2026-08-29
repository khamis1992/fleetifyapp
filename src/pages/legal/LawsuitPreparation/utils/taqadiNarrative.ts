/**
 * Taqadi Narrative Builder — باني الوقائع والطلبات (حتمي، بلا LLM)
 *
 * يبني الفروع المتغيرة من صحيفة الدعوى انطلاقًا من بيانات النظام فقط:
 * - المدفوعات الجزئية على الفواتير المتأخرة
 * - المخالفات المرورية
 * - سجل إشعارات السداد (الإعذار القانوني) من جدول reminder_history
 * - حيازة المركبة (مع المدعى عليه / مستلمة) من حالة المركبة
 * - انتهاء مدة العقد
 *
 * النصوص الأساسية المعتمدة قانونيًا تبقى في LawsuitService.generateFactsText؛
 * هذا الموديول يضيف الفقرات التكميلية ويرتّب الطلبات بنفس الصياغات المعتمدة.
 */

export type VehicleCustody = 'with_defendant' | 'returned' | 'unknown';

export interface ReminderSummary {
  count: number;
  lastSentDate: string | null;
  sendMethods: string[];
}

export interface TaqadiNarrativeInput {
  claimAmount: number;
  violationsCount: number;
  violationsFines: number;
  /** إجمالي ما سدده العميل على الفواتير المتأخرة (مدفوعات جزئية) */
  paidTotal: number;
  reminders: ReminderSummary;
  /** حالة المركبة من جدول vehicles (available / rented / maintenance ...) */
  vehicleStatus: string | null;
  /** الحيازة المؤكدة في الملف القانوني؛ لا تُستنتج من vehicleStatus */
  vehicleCustody?: VehicleCustody;
  contractEndDate: string | null;
  contractStatus: string | null;
  legalPath?: 'natural_expiry' | 'documented_termination' | 'judicial_rescission';
  terminationDate?: string | null;
  formalNoticeCount?: number;
  retentionCompensation?: number;
  documentedDamages?: number;
  monetaryDelayDamage?: number;
  contractualCompensation?: number;
  /** قابل للحقن في الاختبارات */
  today?: Date;
}

// حالات العقد التي ما زالت قائمة ويصح معها طلب الفسخ
const ACTIVE_CONTRACT_STATUSES = new Set(['active', 'under_legal_procedure']);

const SEND_METHOD_LABELS: Record<string, string> = {
  whatsapp: 'واتساب',
  sms: 'الرسائل النصية',
  email: 'البريد الإلكتروني',
};

const formatQarNumber = (amount: number) => amount.toLocaleString('en-US');

const formatDate = (isoDate: string): string => {
  const parsed = new Date(isoDate);
  return Number.isNaN(parsed.getTime())
    ? isoDate
    : parsed.toLocaleDateString('en-GB');
};

/**
 * رقم البطاقة الشخصية القطرية مكوّن من 11 رقماً سواء كان حاملها قطرياً
 * أو مقيماً؛ لا يجوز وصفه بأنه «رخصة مقيم».
 */
export function inferTaqadiIdType(
  nationalId: string | null | undefined,
  nationality: string | null | undefined,
): string {
  const digits = nationalId?.replace(/\D/g, '') || '';
  const normalizedNationality = nationality?.trim().toLowerCase() || '';
  if (digits.length === 11 || ['qatar', 'قطر', 'قطري'].includes(normalizedNationality)) {
    return 'بطاقة شخصية قطرية';
  }
  return nationalId?.trim() ? 'هوية أو جواز سفر' : 'غير محدد';
}

/**
 * يحدد حيازة المركبة من حالتها:
 * - rented  → ما زالت مع المدعى عليه
 * - available / maintenance / أي حالة أخرى معروفة → عادت للشركة
 * - لا مركبة أو لا حالة → غير معروف (لا يُذكر في الصحيفة)
 */
export function getVehicleCustody(_vehicleStatus: string | null | undefined): VehicleCustody {
  return 'unknown';
}

export function isContractActive(contractStatus: string | null | undefined): boolean {
  return Boolean(contractStatus && ACTIVE_CONTRACT_STATUSES.has(contractStatus));
}

export function isContractEnded(
  contractEndDate: string | null | undefined,
  today: Date = new Date(),
): boolean {
  if (!contractEndDate) return false;
  const end = new Date(contractEndDate);
  return !Number.isNaN(end.getTime()) && end < today;
}

/**
 * يبني الفقرات التكميلية للوقائع (تُلحق بالنص الأساسي المعتمد).
 * الترتيب: السداد الجزئي → المخالفات → الإعذار → حيازة المركبة/انتهاء العقد.
 */
export function buildFactsAdditions(input: TaqadiNarrativeInput): string[] {
  const today = input.today ?? new Date();
  const custody = input.vehicleCustody ?? 'unknown';
  const ended = input.legalPath === 'natural_expiry'
    && isContractEnded(input.terminationDate || input.contractEndDate, today);
  const paragraphs: string[] = [];

  // 1) المدفوعات الجزئية
  if (input.paidTotal > 0) {
    paragraphs.push(
      `وقد سدد المدعى عليه جزءًا من مستحقاته بلغ (${formatQarNumber(input.paidTotal)}) ريال قطري، فيما لا يزال المبلغ المطالب به قائمًا في ذمته.`,
    );
  }

  // 2) المخالفات المرورية (نفس الصياغة المعتمدة سابقًا)
  if (input.violationsCount > 0) {
    paragraphs.push(
      `بالإضافة إلى ذلك، ترتبت على المدعى عليه مخالفات مرورية بسبب استخدام السيارة المؤجرة بعدد (${input.violationsCount}) مخالفة بإجمالي مبلغ (${formatQarNumber(input.violationsFines)}) ريال قطري.`,
    );
  }

  // 3) رسائل المتابعة الآلية ليست إنذاراً رسمياً
  if (input.reminders.count > 0) {
    // نذكر فقط القنوات المعروفة حتى لا يتسرب نص إنجليزي خام إلى الصحيفة
    const methods = input.reminders.sendMethods
      .map((method) => SEND_METHOD_LABELS[method])
      .filter((label): label is string => Boolean(label))
      .filter((method, index, all) => all.indexOf(method) === index);
    const viaText = methods.length > 0 ? ` عبر ${methods.join(' و')}` : '';
    const lastDateText = input.reminders.lastSentDate
      ? `، وكان آخرها بتاريخ ${formatDate(input.reminders.lastSentDate)}`
      : '';
    paragraphs.push(
      `وقد أرسلت المدعية إلى المدعى عليه عدد (${input.reminders.count}) من رسائل المتابعة بالسداد${viaText}${lastDateText}، وذلك دون وصفها بإنذار رسمي ما لم يثبت وصول إنذار مستقل بالمستندات.`,
    );
  }
  if ((input.formalNoticeCount || 0) > 0) {
    paragraphs.push(`كما ثبت بملف القضية توجيه عدد (${input.formalNoticeCount}) من الإنذارات أو المطالبات الكتابية المؤيدة بإثبات الوصول.`);
  }

  // 4) حيازة المركبة وانتهاء العقد
  if (ended && custody === 'with_defendant') {
    paragraphs.push(
      `وانتهت مدة عقد الإيجار بتاريخ ${formatDate(input.terminationDate || input.contractEndDate!)}، ولا تزال المركبة محل العقد في حوزة المدعى عليه وفق بيانات الملف القانوني.`,
    );
  } else if (custody === 'with_defendant') {
    paragraphs.push('ولا تزال المركبة محل العقد في حوزة المدعى عليه حتى تاريخه.');
  } else if (ended && custody === 'unknown') {
    paragraphs.push(
      `وانتهت مدة عقد الإيجار بتاريخ ${formatDate(input.contractEndDate!)} دون أن يسدد المدعى عليه مستحقاته.`,
    );
  } else if (custody === 'returned') {
    paragraphs.push('وقد استلمت المدعية المركبة محل العقد من المدعى عليه.');
  }

  return paragraphs;
}

/**
 * يبني قائمة الطلبات مرقّمة، بنفس الصياغات المعتمدة ومع فروع:
 * المطالبة المالية بقيمة المخالفات، تسليم المركبة، وفسخ العقد (للعقود القائمة فقط).
 */
export function buildTaqadiClaims(input: TaqadiNarrativeInput): string {
  const claims: string[] = [
    `إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${formatQarNumber(input.claimAmount)}) ريال قطري.`,
  ];

  if (input.violationsCount > 0) {
    claims.push(
      'إلزام المدعى عليه بأداء قيمة المخالفات المرورية المسجلة على المركبة والثابتة بالمستخرج الرسمي، دون تعليق طلبات الدعوى على إجراء التحويل الإداري.',
    );
  }

  if ((input.vehicleCustody ?? 'unknown') === 'with_defendant') {
    claims.push('إلزام المدعى عليه بتسليم المركبة محل العقد إلى المدعية.');
  }

  if (input.legalPath === 'natural_expiry') {
    claims.push('ثبوت انتهاء عقد الإيجار بانقضاء مدته، مع ما يترتب على ذلك من آثار.');
  } else if (input.legalPath === 'documented_termination') {
    claims.push('ثبوت انفساخ عقد الإيجار لإعمال الشرط الفاسخ الصريح، وعلى سبيل الاحتياط الحكم بفسخه قضائياً.');
  } else {
    claims.push('الحكم بفسخ عقد الإيجار.');
  }

  if ((input.retentionCompensation || 0) > 0) {
    claims.push(`إلزام المدعى عليه بمبلغ (${formatQarNumber(input.retentionCompensation || 0)}) ريال قطري تعويضاً عن احتباس المركبة حتى تاريخ إعداد المطالبة، وبما يستجد حتى الرد الفعلي دون ازدواج مع الأجرة.`);
  }

  claims.push('إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.');

  return claims.map((claim, index) => `${index + 1}. ${claim}`).join('\n');
}
