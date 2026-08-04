const QATAR_TIME_ZONE = "Asia/Qatar";

const getQatarYearMonth = (now: Date): { year: number; month: number } => {
  if (!Number.isFinite(now.getTime())) {
    throw new RangeError("now must be a valid date");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: QATAR_TIME_ZONE,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new RangeError("could not resolve the Qatar calendar month");
  }

  return { year, month };
};

const formatMonth = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}`;

/** Current Gregorian accounting month in Qatar, independent of host timezone. */
export function getCurrentInvoiceMonthInQatar(now: Date = new Date()): string {
  const { year, month } = getQatarYearMonth(now);
  return formatMonth(year, month);
}

/** A scheduled monthly run prepares the month after Qatar's current month. */
export function getDefaultScheduledInvoiceMonth(now: Date = new Date()): string {
  const { year, month } = getQatarYearMonth(now);
  return month === 12
    ? formatMonth(year + 1, 1)
    : formatMonth(year, month + 1);
}
