/**
 * A finite, deterministic cadence prevents a daily scheduler from contacting
 * the same overdue customer every day.
 */
export function getOverdueReminderType(daysOverdue: number): string | null {
  if (!Number.isInteger(daysOverdue) || daysOverdue < 1) return null;
  if (daysOverdue === 1 || daysOverdue === 3 || daysOverdue === 7) {
    return `overdue_day_${daysOverdue}`;
  }
  if (daysOverdue > 7 && daysOverdue % 7 === 0) {
    return `overdue_week_${daysOverdue / 7}`;
  }
  return null;
}
