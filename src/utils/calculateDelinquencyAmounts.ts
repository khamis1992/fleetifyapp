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
}

export interface TrafficViolation {
  id?: string;
  violation_number?: string;
  fine_amount?: number;
  total_amount?: number;
  status?: string;
}

export interface DelinquencyCalculationResult {
  /** مجموع المبالغ المتبقية من الفواتير المتأخرة */
  overdueRent: number;
  
  /** غرامة التأخير (120 ر.ق × أيام التأخير × عدد الفواتير) */
  lateFees: number;
  
  /** تفاصيل غرامة كل فاتورة */
  invoiceLateFees: {
    invoiceId?: string;
    invoiceNumber?: string;
    dueDate: string;
    remainingAmount: number;
    daysOverdue: number;
    lateFee: number;
  }[];
  
  /** رسوم الأضرار (10,000 ر.ق) - تُضاف فقط عند رفع دعوى */
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

/** غرامة التأخير اليومية بالريال القطري */
export const DAILY_LATE_FEE = 120;

/** رسوم الأضرار الثابتة بالريال القطري */
export const DAMAGES_FEE = 10000;

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
    /** هل نضيف رسوم الأضرار (فقط عند رفع دعوى) */
    includeDamagesFee?: boolean;
    /** تاريخ المقارنة (افتراضي: اليوم) */
    referenceDate?: Date;
  } = {}
): DelinquencyCalculationResult {
  const { includeDamagesFee = false, referenceDate = new Date() } = options;
  const today = referenceDate;
  today.setHours(0, 0, 0, 0);

  // ======== 1. حساب الفواتير المتأخرة ========
  
  const invoiceLateFees: DelinquencyCalculationResult['invoiceLateFees'] = [];
  let overdueRent = 0;
  let lateFees = 0;
  let totalDaysOverdue = 0;

  for (const invoice of invoices) {
    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    // تخطي الفواتير غير المتأخرة
    if (dueDate >= today) continue;
    
    // حساب المبلغ المتبقي
    const remainingAmount = Math.max(0, (invoice.total_amount || 0) - (invoice.paid_amount || 0));
    
    // تخطي الفواتير المسددة بالكامل
    if (remainingAmount <= 0) continue;
    
    // حساب أيام التأخير
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // حساب غرامة التأخير لهذه الفاتورة
    const invoiceLateFee = daysOverdue * DAILY_LATE_FEE;
    
    overdueRent += remainingAmount;
    lateFees += invoiceLateFee;
    totalDaysOverdue += daysOverdue;
    
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

  // ======== 3. رسوم الأضرار ========
  
  const damagesFee = includeDamagesFee ? DAMAGES_FEE : 0;

  // ======== 4. المجموع الكلي ========
  
  const total = overdueRent + lateFees + damagesFee + violationsFines;
  const overdueInvoicesCount = invoiceLateFees.length;
  const avgDaysOverdue = overdueInvoicesCount > 0 
    ? Math.round(totalDaysOverdue / overdueInvoicesCount) 
    : 0;

  return {
    overdueRent,
    lateFees,
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
export function calculateInvoiceLateFee(dueDate: string, referenceDate: Date = new Date()): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  
  if (due >= ref) return 0;
  
  const daysOverdue = Math.floor((ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return daysOverdue * DAILY_LATE_FEE;
}

/**
 * حساب أيام التأخير لفاتورة
 */
export function calculateDaysOverdue(dueDate: string, referenceDate: Date = new Date()): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  
  if (due >= ref) return 0;
  
  return Math.floor((ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

