export type InvoiceDueStatus = 'future' | 'due_today' | 'overdue' | 'unscheduled';

const toLocalDateKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDateKey = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toLocalDateKey(value);
  }

  const normalized = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      parsed.getFullYear() === Number(year)
      && parsed.getMonth() === Number(month) - 1
      && parsed.getDate() === Number(day)
    ) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : toLocalDateKey(parsed);
};

/**
 * Derives the collection timing from the due date without changing payment_status.
 * This keeps "future/due/overdue" separate from "unpaid/partial/paid".
 */
export const getInvoiceDueStatus = (
  dueDate: string | Date | null | undefined,
  today: Date = new Date(),
): InvoiceDueStatus => {
  const dueDateKey = toDateKey(dueDate);
  const todayKey = toDateKey(today);

  if (!dueDateKey || !todayKey) return 'unscheduled';
  if (dueDateKey > todayKey) return 'future';
  if (dueDateKey < todayKey) return 'overdue';
  return 'due_today';
};
