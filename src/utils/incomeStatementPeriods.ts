/** Calendar periods use date strings, never local-midnight UTC conversions. */
export function buildIncomeStatementComparisonPeriods(asOf: string, count = 6) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isInteger(count) || count < 1 || count > 12) {
    throw new Error('A valid comparison cutoff and month count are required');
  }
  const [year, month, day] = asOf.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== asOf) throw new Error('Invalid comparison cutoff');
  const label = new Intl.DateTimeFormat('ar-QA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return Array.from({ length: count }, (_, index) => {
    const monthOffset = index - count + 1;
    const first = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
    const last = new Date(Date.UTC(year, month + monthOffset, 0));
    const monthEnd = last.toISOString().slice(0, 10);
    return {
      month: label.format(first),
      startDate: first.toISOString().slice(0, 10),
      endDate: monthEnd > asOf ? asOf : monthEnd,
    };
  });
}
