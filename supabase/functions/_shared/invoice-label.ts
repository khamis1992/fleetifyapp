const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

/** Customer-facing invoice reference. Technical invoice numbers stay internal. */
export function formatArabicInvoiceMonthLabel(
  invoiceDate: string | null | undefined,
): string {
  const match = String(invoiceDate || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return "فاتورة الشهر المستحق";

  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex >= ARABIC_MONTHS.length) {
    return "فاتورة الشهر المستحق";
  }

  return `فاتورة شهر ${ARABIC_MONTHS[monthIndex]} ${match[1]}`;
}
