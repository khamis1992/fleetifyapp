/**
 * Contract Calculations Utility
 * دوال مساعدة لحساب القيم المالية للعقود
 * 
 * @description
 * يوفر هذا الملف دوال موحدة لحساب القيم المالية للعقود
 * لضمان الاتساق عبر جميع أجزاء التطبيق
 */

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const parseCalendarDate = (value?: string): CalendarDate | null => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) return null;

  return { year, month, day };
};

/**
 * Counts the invoice months used by the canonical database billing graph.
 * New contracts bill from the month after their start through their end month;
 * a contract contained in one calendar month still has one billing month.
 */
export const calculateCanonicalBillingMonths = (
  startDate?: string,
  endDate?: string,
): number => {
  const start = parseCalendarDate(startDate);
  const end = parseCalendarDate(endDate);
  if (!start || !end) return 0;

  const startOrdinal = Date.UTC(start.year, start.month - 1, start.day);
  const endOrdinal = Date.UTC(end.year, end.month - 1, end.day);
  if (endOrdinal < startOrdinal) return 0;

  const calendarMonthDifference =
    (end.year - start.year) * 12 + (end.month - start.month);
  return Math.max(1, calendarMonthDifference);
};

const formatUtcDate = (date: Date) => date.toISOString().slice(0, 10);

/** Returns the renewal end date with the same canonical billing-month count. */
export const calculateCanonicalRenewalEndDate = (
  originalStartDate?: string,
  originalEndDate?: string,
): string => {
  const billingMonths = calculateCanonicalBillingMonths(
    originalStartDate,
    originalEndDate,
  );
  const originalEnd = parseCalendarDate(originalEndDate);
  if (!originalEnd || billingMonths <= 0) return '';

  const renewalStart = new Date(Date.UTC(
    originalEnd.year,
    originalEnd.month - 1,
    originalEnd.day + 1,
  ));
  const targetMonthIndex = renewalStart.getUTCMonth() + billingMonths;
  const targetYear = renewalStart.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastTargetDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(renewalStart.getUTCDate(), lastTargetDay);

  return formatUtcDate(new Date(Date.UTC(targetYear, targetMonth, targetDay)));
};

/**
 * حساب القيمة الإجمالية للعقد
 * يحسب القيمة بناءً على: الإيجار الشهري × عدد الأشهر
 * 
 * @param contract - بيانات العقد
 * @returns القيمة الإجمالية المحسوبة
 * 
 * @example
 * const total = calculateContractTotalAmount({
 *   monthly_amount: 1000,
 *   start_date: '2024-01-01',
 *   end_date: '2024-12-31'
 * });
 * // returns 12000
 */
export const calculateContractTotalAmount = (contract: {
  monthly_amount?: number;
  start_date?: string;
  end_date?: string;
  contract_amount?: number;
}): number => {
  // إذا لم تكن التواريخ موجودة، استخدم القيمة المخزنة كـ fallback
  if (!contract.start_date || !contract.end_date) {
    return contract.contract_amount || 0;
  }

  // إذا لم يكن هناك إيجار شهري، استخدم القيمة المخزنة
  if (!contract.monthly_amount) {
    return contract.contract_amount || 0;
  }

  try {
    const totalMonths = calculateCanonicalBillingMonths(
      contract.start_date,
      contract.end_date,
    );
    if (totalMonths <= 0) {
      return contract.contract_amount || 0;
    }
    
    return (contract.monthly_amount || 0) * totalMonths;
  } catch (error) {
    // في حالة حدوث أي خطأ، استخدم القيمة المخزنة
    console.error('Error calculating contract total amount:', error);
    return contract.contract_amount || 0;
  }
};

/**
 * حساب عدد الأشهر في العقد
 * 
 * @param contract - بيانات العقد
 * @returns عدد الأشهر
 */
export const calculateContractMonths = (contract: {
  start_date?: string;
  end_date?: string;
}): number => {
  if (!contract.start_date || !contract.end_date) {
    return 0;
  }

  try {
    return calculateCanonicalBillingMonths(contract.start_date, contract.end_date);
  } catch (error) {
    console.error('Error calculating contract months:', error);
    return 0;
  }
};

/**
 * حساب المبلغ المتبقي في العقد
 * 
 * @param contract - بيانات العقد
 * @returns المبلغ المتبقي
 */
export const calculateContractBalance = (contract: {
  monthly_amount?: number;
  start_date?: string;
  end_date?: string;
  contract_amount?: number;
  total_paid?: number;
}): number => {
  const totalAmount = calculateContractTotalAmount(contract);
  const totalPaid = contract.total_paid || 0;
  
  return Math.max(0, totalAmount - totalPaid);
};
