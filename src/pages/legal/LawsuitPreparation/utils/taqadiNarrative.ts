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
  contractEndDate: string | null;
  contractStatus: string | null;
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
 * يحدد حيازة المركبة من حالتها:
 * - rented  → ما زالت مع المدعى عليه
 * - available / maintenance / أي حالة أخرى معروفة → عادت للشركة
 * - لا مركبة أو لا حالة → غير معروف (لا يُذكر في الصحيفة)
 */
export function getVehicleCustody(vehicleStatus: string | null | undefined): VehicleCustody {
  if (!vehicleStatus) return 'unknown';
  return vehicleStatus === 'rented' ? 'with_defendant' : 'returned';
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
  const custody = getVehicleCustody(input.vehicleStatus);
  const ended = isContractEnded(input.contractEndDate, today);
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

  // 3) الإعذار القانوني بسجل الإشعارات
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
      `وقد أعذرت المدعية المدعى عليه وأشعرته بالمديونية بعدد (${input.reminders.count}) إشعارًا${viaText}${lastDateText}، ورغم ذلك لم يقم بسداد ما في ذمته حتى تاريخه.`,
    );
  }

  // 4) حيازة المركبة وانتهاء العقد
  if (ended && custody === 'with_defendant') {
    paragraphs.push(
      `وانتهت مدة عقد الإيجار بتاريخ ${formatDate(input.contractEndDate!)}، ولا تزال المركبة محل العقد في حوزة المدعى عليه رغم انتهاء العقد ومطالبته بإعادتها.`,
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
 * تحويل المخالفات، تسليم المركبة، وفسخ العقد (للعقود القائمة فقط).
 */
export function buildTaqadiClaims(input: TaqadiNarrativeInput): string {
  const claims: string[] = [
    `إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${formatQarNumber(input.claimAmount)}) ريال قطري.`,
  ];

  if (input.violationsCount > 0) {
    claims.push('الأمر بتحويل المخالفات المرورية المسجلة على المركبة إلى الرقم الشخصي للمدعى عليه.');
  }

  if (getVehicleCustody(input.vehicleStatus) === 'with_defendant') {
    claims.push('إلزام المدعى عليه بتسليم المركبة محل العقد إلى المدعية.');
  }

  // الفسخ يُطلب للعقود القائمة؛ عند غياب الحالة نحافظ على السلوك السابق (إدراجه)
  if (input.contractStatus == null || isContractActive(input.contractStatus)) {
    claims.push('الحكم بفسخ عقد الإيجار.');
  }

  claims.push('إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.');

  return claims.map((claim, index) => `${index + 1}. ${claim}`).join('\n');
}
