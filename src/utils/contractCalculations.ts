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

type BillingEvidence = {
  id?: string | null;
  invoice_id?: string | null;
  due_date?: string | null;
  invoice_month?: string | null;
  invoice_date?: string | null;
  amount?: number | null;
  total_amount?: number | null;
  status?: string | null;
  payment_status?: string | null;
  invoice_type?: string | null;
  invoice_number?: string | null;
  penalty_id?: string | null;
};

export type ContractBillingPeriodValidation = {
  valid: boolean;
  blockingMessage: string | null;
  availableBillingMonths: number;
  requiredInstallments: number;
  billingStartMonth: string | null;
  billingEndMonth: string | null;
  outsideScheduleMonths: string[];
  scheduleTotal: number;
  usesEstablishedSchedule: boolean;
};

const INACTIVE_BILLING_STATUSES = new Set([
  'cancelled',
  'canceled',
  'void',
  'voided',
  'deleted',
  'inactive',
]);

const toMonthOrdinal = (date: CalendarDate) => date.year * 12 + date.month - 1;

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const daysInCalendarMonth = (date: CalendarDate) => (
  new Date(Date.UTC(date.year, date.month, 0)).getUTCDate()
);

const formatMonthOrdinal = (ordinal: number) => {
  const year = Math.floor(ordinal / 12);
  const month = (ordinal % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
};

const getDateMonthOrdinal = (value: string | null | undefined): number | null => {
  const parsed = parseCalendarDate(value ?? undefined);
  return parsed ? toMonthOrdinal(parsed) : null;
};

// Invoices describe a service month; schedules describe an installment due date.
// A legacy invoice falls back only when invoice_month is absent, not invalid.
const getRentalInvoiceMonthOrdinal = (invoice: BillingEvidence): number | null => (
  getDateMonthOrdinal(invoice.invoice_month ?? invoice.invoice_date)
);

const isRentalBillingEvidence = (invoice: BillingEvidence): boolean => (
  !invoice.penalty_id
  && !String(invoice.invoice_number || '').trim().toUpperCase().startsWith('TV-')
);

const isActiveBillingEvidence = (evidence: BillingEvidence): boolean => {
  const status = String(evidence.status || '').trim().toLowerCase();
  const paymentStatus = String(evidence.payment_status || '').trim().toLowerCase();
  const amount = Number(evidence.amount ?? evidence.total_amount ?? 0);
  return amount > 0.01
    && !INACTIVE_BILLING_STATUSES.has(status)
    && !INACTIVE_BILLING_STATUSES.has(paymentStatus);
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

/**
 * Mirrors the database billing-window preflight used before schedule generation.
 * It does not mutate contract terms; it only explains contradictions early in UI.
 */
export const analyzeContractBillingPeriod = ({
  startDate,
  endDate,
  contractAmount,
  monthlyAmount,
  invoices = [],
  schedules = [],
}: {
  startDate?: string;
  endDate?: string;
  contractAmount?: number | null;
  monthlyAmount?: number | null;
  invoices?: BillingEvidence[];
  schedules?: BillingEvidence[];
}): ContractBillingPeriodValidation => {
  const start = parseCalendarDate(startDate);
  const end = parseCalendarDate(endDate);
  const emptyResult: ContractBillingPeriodValidation = {
    valid: false,
    blockingMessage: 'تاريخ بداية العقد أو نهايته غير صالح.',
    availableBillingMonths: 0,
    requiredInstallments: 0,
    billingStartMonth: null,
    billingEndMonth: null,
    outsideScheduleMonths: [],
    scheduleTotal: 0,
    usesEstablishedSchedule: false,
  };

  if (!start || !end) return emptyResult;

  const startDayOrdinal = Date.UTC(start.year, start.month - 1, start.day);
  const endDayOrdinal = Date.UTC(end.year, end.month - 1, end.day);
  if (endDayOrdinal < startDayOrdinal) {
    return { ...emptyResult, blockingMessage: 'تاريخ نهاية العقد يسبق تاريخ البداية.' };
  }

  const startMonthOrdinal = toMonthOrdinal(start);
  const endMonthOrdinal = toMonthOrdinal(end);
  const activeSchedules = schedules.filter(isActiveBillingEvidence);
  const activeInvoices = invoices.filter(isActiveBillingEvidence).filter(isRentalBillingEvidence);
  const scheduleMonths = activeSchedules
    .map((schedule) => ({ schedule, month: getDateMonthOrdinal(schedule.due_date) }))
    .filter((entry): entry is { schedule: BillingEvidence; month: number } => entry.month !== null);
  const scheduleTotal = roundCurrency(
    activeSchedules.reduce(
      (sum, schedule) => sum + Number(schedule.amount ?? schedule.total_amount ?? 0),
      0,
    ),
  );
  const scheduleMonthCounts = scheduleMonths.reduce((counts, entry) => {
    counts.set(entry.month, (counts.get(entry.month) || 0) + 1);
    return counts;
  }, new Map<number, number>());
  const duplicateScheduleMonths = [...scheduleMonthCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([month]) => formatMonthOrdinal(month));
  const uniqueScheduleOrdinals = [...scheduleMonthCounts.keys()].sort((a, b) => a - b);
  const firstScheduleOrdinal = uniqueScheduleOrdinals[0] ?? null;
  const lastScheduleOrdinal = uniqueScheduleOrdinals.at(-1) ?? null;
  const missingScheduleMonths: string[] = [];
  if (firstScheduleOrdinal !== null && lastScheduleOrdinal !== null) {
    for (let month = firstScheduleOrdinal; month <= lastScheduleOrdinal; month += 1) {
      if (!scheduleMonthCounts.has(month)) missingScheduleMonths.push(formatMonthOrdinal(month));
    }
  }
  const outsideScheduleMonths = uniqueScheduleOrdinals
    .filter((month) => month < startMonthOrdinal || month > endMonthOrdinal)
    .map(formatMonthOrdinal);
  const invoiceMonths = activeInvoices.map(getRentalInvoiceMonthOrdinal);
  const isServiceInvoice = (invoice: BillingEvidence) => String(invoice.invoice_type || '').trim().toLowerCase() === 'service';
  const hasLinkedRentalSchedule = (invoice: BillingEvidence) => Boolean(invoice.id) && scheduleMonths.some(
    ({ schedule, month }) => schedule.invoice_id === invoice.id
      && month === getRentalInvoiceMonthOrdinal(invoice)
      && Math.abs(Number(schedule.amount ?? schedule.total_amount ?? 0) - Number(invoice.total_amount ?? invoice.amount ?? 0)) <= 0.01,
  );
  const unclassifiedServiceInvoices = activeInvoices.filter(
    (invoice) => isServiceInvoice(invoice) && !hasLinkedRentalSchedule(invoice),
  );
  const hasStartMonthBilling = activeInvoices.some((invoice) => !isServiceInvoice(invoice)
    && getRentalInvoiceMonthOrdinal(invoice) === startMonthOrdinal)
    || scheduleMonths.some(({ month }) => month === startMonthOrdinal);

  // New contracts bill from the following month. A one-month contract remains
  // billable in its own month, matching generate_payment_schedules_for_contract.
  let billingStartOrdinal = hasStartMonthBilling
    ? startMonthOrdinal
    : startMonthOrdinal + 1;
  if (billingStartOrdinal > endMonthOrdinal) billingStartOrdinal = startMonthOrdinal;

  let availableBillingMonths = endMonthOrdinal - billingStartOrdinal + 1;
  const total = roundCurrency(Number(contractAmount || 0));
  const monthly = roundCurrency(Number(monthlyAmount || 0));
  const requiredInstallments = total > 0 && monthly > 0
    ? Math.max(1, Math.ceil(Math.max(total - 0.01, 0) / monthly))
    : Math.max(availableBillingMonths, 0);
  let billingStartMonth = formatMonthOrdinal(billingStartOrdinal);
  let billingEndMonth = formatMonthOrdinal(endMonthOrdinal);
  const blockers: string[] = [];
  if (invoiceMonths.includes(null)) {
    blockers.push('توجد فاتورة إيجار فعّالة بلا شهر فوترة صالح؛ راجع شهر الفاتورة ولا تعتمد تاريخ الاستحقاق بدلاً منه');
  }
  if (unclassifiedServiceInvoices.length > 0) {
    blockers.push('توجد فاتورة من نوع service غير مطابقة لقسط مرتبط بها؛ قد تكون إيجاراً أو خدمة أخرى وتحتاج مطابقة قبل التوليد');
  }

  // A persisted schedule is stronger evidence than a total/monthly quotient.
  // This matters for signed contracts that split one monthly installment over
  // the first and last partial calendar months (for example 900 + 900 around
  // 35 full installments of 1,800). Treating each row as a full installment
  // incorrectly invents an extra month outside the contract.
  if (activeSchedules.length > 0) {
    if (scheduleMonths.length !== activeSchedules.length) {
      blockers.push('يوجد قسط فعّال بلا تاريخ استحقاق صالح');
    }
    if (duplicateScheduleMonths.length > 0) {
      blockers.push(`يوجد أكثر من قسط فعّال للشهر نفسه في: ${duplicateScheduleMonths.join('، ')}`);
    }
    if (missingScheduleMonths.length > 0) {
      blockers.push(`جدول الدفعات غير متصل، والأشهر الناقصة هي: ${missingScheduleMonths.join('، ')}`);
    }
    if (outsideScheduleMonths.length > 0) {
      blockers.push(`يوجد جدول دفعات خارج مدة العقد في: ${outsideScheduleMonths.join('، ')}`);
    }
    if (total > 0 && Math.abs(scheduleTotal - total) > 0.01) {
      blockers.push(
        `إجمالي جدول الدفعات ${scheduleTotal.toLocaleString('ar-QA')} ر.ق لا يطابق قيمة العقد `
        + `${total.toLocaleString('ar-QA')} ر.ق`,
      );
    }

    if (monthly > 0 && firstScheduleOrdinal !== null && lastScheduleOrdinal !== null) {
      const invalidInteriorMonths = scheduleMonths
        .filter(({ month }) => month > firstScheduleOrdinal && month < lastScheduleOrdinal)
        .filter(({ schedule }) => (
          Math.abs(Number(schedule.amount ?? schedule.total_amount ?? 0) - monthly) > 0.01
        ))
        .map(({ month }) => formatMonthOrdinal(month));
      const overMonthlyMonths = scheduleMonths
        .filter(({ schedule }) => Number(schedule.amount ?? schedule.total_amount ?? 0) > monthly + 0.01)
        .map(({ month }) => formatMonthOrdinal(month));
      const firstAmount = Number(
        scheduleMonths.find(({ month }) => month === firstScheduleOrdinal)?.schedule.amount
        ?? scheduleMonths.find(({ month }) => month === firstScheduleOrdinal)?.schedule.total_amount
        ?? 0,
      );
      const lastAmount = Number(
        scheduleMonths.find(({ month }) => month === lastScheduleOrdinal)?.schedule.amount
        ?? scheduleMonths.find(({ month }) => month === lastScheduleOrdinal)?.schedule.total_amount
        ?? 0,
      );

      if (invalidInteriorMonths.length > 0) {
        blockers.push(
          `قيمة الأقساط الكاملة لا تساوي الإيجار الشهري في: ${invalidInteriorMonths.join('، ')}`,
        );
      }
      if (overMonthlyMonths.length > 0) {
        blockers.push(`قسط يتجاوز الإيجار الشهري في: ${overMonthlyMonths.join('، ')}`);
      }
      if (
        firstScheduleOrdinal === startMonthOrdinal
        && start.day > 1
        && firstAmount >= monthly - 0.01
      ) {
        blockers.push('قسط شهر البداية غير مجزأ رغم أن العقد يبدأ أثناء الشهر');
      }
      if (
        firstScheduleOrdinal === startMonthOrdinal
        && lastScheduleOrdinal === endMonthOrdinal
        && end.day < daysInCalendarMonth(end)
        && lastAmount >= monthly - 0.01
      ) {
        blockers.push('قسط شهر النهاية غير مجزأ رغم أن العقد ينتهي أثناء الشهر');
      }
    }

    if (firstScheduleOrdinal !== null && lastScheduleOrdinal !== null) {
      const boundedFirstScheduleOrdinal = Math.max(firstScheduleOrdinal, startMonthOrdinal);
      const boundedLastScheduleOrdinal = Math.min(lastScheduleOrdinal, endMonthOrdinal);
      billingStartOrdinal = boundedFirstScheduleOrdinal;
      availableBillingMonths = Math.max(
        0,
        boundedLastScheduleOrdinal - boundedFirstScheduleOrdinal + 1,
      );
      billingStartMonth = formatMonthOrdinal(boundedFirstScheduleOrdinal);
      billingEndMonth = formatMonthOrdinal(boundedLastScheduleOrdinal);
    }

    return {
      valid: blockers.length === 0,
      blockingMessage: blockers.length > 0
        ? `تم اكتشاف تاريخي البداية والنهاية، لكن توجد بيانات متعارضة: ${blockers.join('. ')}.`
        : null,
      availableBillingMonths,
      requiredInstallments: activeSchedules.length,
      billingStartMonth,
      billingEndMonth,
      outsideScheduleMonths,
      scheduleTotal,
      usesEstablishedSchedule: blockers.length === 0,
    };
  }

  if (
    startMonthOrdinal !== endMonthOrdinal
    && (start.day !== 1 || end.day !== 1)
  ) {
    blockers.push(
      'العقد يبدأ أو ينتهي أثناء الشهر ولا يوجد جدول دفعات فعّال يحدد قيمة قسطي البداية والنهاية؛ لن يخمّن النظام التجزئة',
    );
  }

  if (requiredInstallments > availableBillingMonths) {
    blockers.push(
      `قيمة العقد ${total.toLocaleString('ar-QA')} ر.ق تتطلب ${requiredInstallments} قسطاً `
      + `بقيمة ${monthly.toLocaleString('ar-QA')} ر.ق، بينما المدة من ${billingStartMonth} `
      + `إلى ${billingEndMonth} تسمح بـ${availableBillingMonths} قسطاً فقط`,
    );
  }

  return {
    valid: blockers.length === 0,
    blockingMessage: blockers.length > 0
      ? `تم اكتشاف تاريخي البداية والنهاية، لكن توجد بيانات متعارضة: ${blockers.join('. ')}.`
      : null,
    availableBillingMonths,
    requiredInstallments,
    billingStartMonth,
    billingEndMonth,
    outsideScheduleMonths,
    scheduleTotal,
    usesEstablishedSchedule: false,
  };
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
