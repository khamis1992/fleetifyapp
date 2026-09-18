/**
 * دالة موحدة لحساب المبالغ المتأخرة
 * تُستخدم في صفحة تجهيز الدعوى وصفحة المتعثرات المالية
 * 
 * @module calculateDelinquencyAmounts
 */

// ======== Types ========

export interface OverdueInvoice {
  id?: string;
  invoice_number?: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance_due?: number | null;
  /** الأجرة القانونية المستمرة ليست فاتورة ولا تُنشئ تعويض تأخير اتفاقياً بذاتها. */
  source?: 'invoice' | 'payment_schedule' | 'legal_accrual';
}

export interface TrafficViolation {
  id?: string;
  violation_number?: string;
  fine_amount?: number;
  total_amount?: number;
  status?: string;
}

export interface ContractualCompensationRule {
  /** لا يطبق أي تعويض اتفاقي ما لم يكن هذا الخيار صريحًا */
  enabled: boolean;
  /** ثابت على كامل المطالبة، أو يومي، أو شهري، أو محسوب لكل فاتورة */
  method: 'fixed' | 'daily' | 'monthly' | 'per_invoice';
  /** القيمة الثابتة أو قيمة اليوم/الشهر/الفاتورة بحسب الطريقة */
  rate: number;
  /** سقف اختياري على كامل التعويض الاتفاقي */
  cap?: number | null;
}

export interface DelinquencyCalculationResult {
  /** مجموع المبالغ المتبقية من الفواتير المتأخرة */
  overdueRent: number;
  
  /** تعويض اتفاقي موثق؛ يساوي صفرًا افتراضيًا */
  lateFees: number;

  /** عدد وحدات التعويض قبل تطبيق السقف (يوم/شهر/فاتورة أو وحدة ثابتة) */
  contractualCompensationUnits: number;
  
  /** تفاصيل غرامة كل فاتورة */
  invoiceLateFees: {
    invoiceId?: string;
    invoiceNumber?: string;
    dueDate: string;
    remainingAmount: number;
    daysOverdue: number;
    lateFee: number;
  }[];
  
  /** أضرار موثقة يمررها المستدعي صراحة؛ لا توجد قيمة افتراضية */
  damagesFee: number;
  
  /** مجموع المخالفات المرورية غير المدفوعة */
  violationsFines: number;
  
  /** عدد المخالفات */
  violationsCount: number;
  
  /** المجموع الكلي */
  total: number;
  
  /** عدد الفواتير المتأخرة */
  overdueInvoicesCount: number;
  
  /** إجمالي أيام التأخير */
  totalDaysOverdue: number;
  
  /** متوسط أيام التأخير */
  avgDaysOverdue: number;
}

// ======== Constants ========

/**
 * @deprecated لا توجد غرامة يومية افتراضية. أبقيت القيمة صفرًا لتفادي أن
 * تعيد الشاشات القديمة إنشاء مطالبة بلا سند أثناء انتقالها للمحرك الجديد.
 */
export const DAILY_LATE_FEE = 0;
export const MAX_LATE_FEE_PER_INVOICE = 0;
export const DAMAGES_FEE = 0;

const DAY_MS = 24 * 60 * 60 * 1000;

function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(value);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function qatarCalendarToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value || 0);
  return new Date(part('year'), part('month') - 1, part('day'));
}

function referenceCalendarDate(value?: Date): Date {
  if (!value) return qatarCalendarToday();
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function calendarDayNumber(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY_MS;
}

// ======== Main Function ========

/**
 * حساب المبالغ المتأخرة بشكل موحد
 * 
 * @param invoices - قائمة الفواتير (سيتم فلترة المتأخرة منها)
 * @param violations - قائمة المخالفات المرورية (سيتم فلترة غير المدفوعة)
 * @param options - خيارات الحساب
 * @returns نتيجة الحساب التفصيلية
 */
export function calculateDelinquencyAmounts(
  invoices: OverdueInvoice[],
  violations: TrafficViolation[] = [],
  options: {
    /** @deprecated استخدم documentedDamagesAmount */
    includeDamagesFee?: boolean;
    /** مجموع الأضرار التي ثبتت مستندياً خارج الفواتير */
    documentedDamagesAmount?: number;
    /** التعويض الاتفاقي لا يعمل إلا بقاعدة موثقة يمررها المستدعي */
    contractualCompensation?: ContractualCompensationRule | null;
    /** تاريخ المقارنة (افتراضي: اليوم) */
    referenceDate?: Date;
  } = {}
): DelinquencyCalculationResult {
  const {
    documentedDamagesAmount = 0,
    contractualCompensation = null,
    referenceDate,
  } = options;
  const today = referenceCalendarDate(referenceDate);

  // ======== 1. حساب الفواتير المتأخرة ========
  
  const invoiceLateFees: DelinquencyCalculationResult['invoiceLateFees'] = [];
  let overdueRent = 0;
  let totalDaysOverdue = 0;
  let chargeableDaysOverdue = 0;
  let chargeableInvoiceCount = 0;
  let lateFees = 0;
  const chargeableMonths = new Set<string>();
  const monthlyChargeInvoiceIndexes: number[] = [];

  for (const invoice of invoices) {
    const dueDate = parseCalendarDate(invoice.due_date);
    
    // تخطي الفواتير غير المتأخرة (المستقبلية)
    // الاستحقاق يحل في يوم due_date نفسه؛ المستقبل فقط هو المستبعد.
    if (dueDate > today) continue;
    
    // حساب المبلغ المتبقي
    const calculatedRemaining = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
    const remainingAmount = Math.max(0, Number(invoice.balance_due ?? calculatedRemaining));
    
    // تخطي الفواتير المسددة بالكامل
    if (remainingAmount <= 0) continue;
    
    // حساب أيام التأخير
    const daysOverdue = Math.max(0, calendarDayNumber(today) - calendarDayNumber(dueDate));
    
    let invoiceLateFee = 0;
    const allowsContractualCompensation = invoice.source !== 'legal_accrual';
    if (allowsContractualCompensation) {
      chargeableDaysOverdue += daysOverdue;
      chargeableInvoiceCount += 1;
    }
    if (contractualCompensation?.enabled && allowsContractualCompensation) {
      if (contractualCompensation.method === 'daily') {
        invoiceLateFee = daysOverdue * contractualCompensation.rate;
      } else if (contractualCompensation.method === 'per_invoice') {
        invoiceLateFee = contractualCompensation.rate;
      } else if (contractualCompensation.method === 'monthly') {
        const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
        if (!chargeableMonths.has(monthKey)) {
          chargeableMonths.add(monthKey);
          monthlyChargeInvoiceIndexes.push(invoiceLateFees.length);
        }
      }
    }
    
    overdueRent += remainingAmount;
    totalDaysOverdue += daysOverdue;
    lateFees += invoiceLateFee;
    
    invoiceLateFees.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      dueDate: invoice.due_date,
      remainingAmount,
      daysOverdue,
      lateFee: invoiceLateFee,
    });
  }

  // ======== 2. حساب المخالفات المرورية ========
  
  // فلترة المخالفات غير المدفوعة
  const unpaidViolations = violations.filter(v => v.status !== 'paid');
  const violationsCount = unpaidViolations.length;
  const violationsFines = unpaidViolations.reduce(
    (sum, v) => sum + (Number(v.total_amount) || Number(v.fine_amount) || 0),
    0
  );

  if (contractualCompensation?.enabled && contractualCompensation.method === 'fixed') {
    lateFees = contractualCompensation.rate;
  }
  if (contractualCompensation?.enabled && contractualCompensation.method === 'monthly') {
    lateFees = chargeableMonths.size * contractualCompensation.rate;
    monthlyChargeInvoiceIndexes.forEach((index) => {
      if (invoiceLateFees[index]) invoiceLateFees[index].lateFee = contractualCompensation.rate;
    });
  }
  if (contractualCompensation?.enabled && contractualCompensation.cap != null) {
    const uncappedLateFees = lateFees;
    lateFees = Math.min(uncappedLateFees, Math.max(0, contractualCompensation.cap));
    if (uncappedLateFees > 0 && lateFees < uncappedLateFees) {
      const ratio = lateFees / uncappedLateFees;
      let allocated = 0;
      invoiceLateFees.forEach((item, index) => {
        const adjusted = index === invoiceLateFees.length - 1
          ? Math.max(0, lateFees - allocated)
          : Math.round(item.lateFee * ratio * 100) / 100;
        item.lateFee = adjusted;
        allocated += adjusted;
      });
    }
  }

  // ======== 3. الأضرار الموثقة ========
  const damagesFee = Math.max(0, Number(documentedDamagesAmount) || 0);

  // ======== 4. المجموع الكلي ========
  
  const total = overdueRent + lateFees + damagesFee + violationsFines;
  const overdueInvoicesCount = invoiceLateFees.length;
  const avgDaysOverdue = overdueInvoicesCount > 0 
    ? Math.round(totalDaysOverdue / overdueInvoicesCount) 
    : 0;
  const contractualCompensationUnits = !contractualCompensation?.enabled || lateFees <= 0
    ? 0
    : contractualCompensation.method === 'daily'
      ? chargeableDaysOverdue
      : contractualCompensation.method === 'monthly'
        ? chargeableMonths.size
        : contractualCompensation.method === 'per_invoice'
          ? chargeableInvoiceCount
          : 1;

  return {
    overdueRent,
    lateFees,
    contractualCompensationUnits,
    invoiceLateFees,
    damagesFee,
    violationsFines,
    violationsCount,
    total,
    overdueInvoicesCount,
    totalDaysOverdue,
    avgDaysOverdue,
  };
}

/**
 * حساب غرامة التأخير لفاتورة واحدة
 */
export function calculateInvoiceLateFee(
  dueDate: string,
  referenceDate?: Date,
  rule?: ContractualCompensationRule | null,
): number {
  const due = parseCalendarDate(dueDate);
  const ref = referenceCalendarDate(referenceDate);
  
  if (due >= ref || !rule?.enabled) return 0;
  
  const daysOverdue = Math.max(0, calendarDayNumber(ref) - calendarDayNumber(due));
  const value = rule.method === 'daily'
    ? daysOverdue * rule.rate
    : rule.method === 'per_invoice' || rule.method === 'monthly'
      ? rule.rate
      : 0;
  return rule.cap == null ? value : Math.min(value, Math.max(0, rule.cap));
}

/**
 * حساب أيام التأخير لفاتورة
 */
export function calculateDaysOverdue(dueDate: string, referenceDate?: Date): number {
  const due = parseCalendarDate(dueDate);
  const ref = referenceCalendarDate(referenceDate);
  
  if (due >= ref) return 0;
  
  return Math.max(0, calendarDayNumber(ref) - calendarDayNumber(due));
}

