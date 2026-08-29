import { formatArabicInvoiceMonthLabel } from "../_shared/invoice-label.ts";

export type NoticeInvoice = {
  id: string;
  invoice_number: string | null;
  due_date: string;
  balance_due: number | null;
  total_amount: number | null;
};

export function normalizeWhatsAppPhone(value: string | null | undefined): string {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `974${digits}`;
  if (!/^[1-9][0-9]{7,14}$/.test(digits)) return "";
  return digits;
}

export function getInvoiceBalance(invoice: NoticeInvoice): number {
  const value = invoice.balance_due == null
    ? Number(invoice.total_amount || 0)
    : Number(invoice.balance_due);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getCycleKey(oldestDueDate: string): string {
  return `${oldestDueDate.slice(0, 7)}-01`;
}

export function buildFormalPaymentNotice(input: {
  customerName: string;
  contractNumber: string;
  invoices: NoticeInvoice[];
  amountDue: number;
  gracePeriodDays: number;
  noticeDate: string;
}): string {
  const invoiceLines = input.invoices
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 12)
    .map((invoice) =>
      `• ${formatArabicInvoiceMonthLabel(invoice.due_date)}: ${getInvoiceBalance(invoice).toFixed(2)} ر.ق — استحقاق ${invoice.due_date}`
    );
  const omitted = Math.max(0, input.invoices.length - invoiceLines.length);

  return [
    "إنذار رسمي بالوفاء ومطالبة بالسداد",
    "",
    `السيد/السيدة: ${input.customerName}`,
    `رقم عقد الإيجار: ${input.contractNumber}`,
    `تاريخ الإنذار: ${input.noticeDate}`,
    "",
    "تحية طيبة،",
    "",
    "نفيدكم بوجود مبالغ مستحقة وغير مسددة ناشئة عن عقد الإيجار المبين أعلاه:",
    ...invoiceLines,
    ...(omitted > 0 ? [`• إضافة إلى ${omitted} فاتورة مستحقة أخرى مدرجة في كشف الحساب.`] : []),
    "",
    `إجمالي الرصيد المستحق حتى تاريخ هذا الإنذار: ${input.amountDue.toFixed(2)} ريال قطري.`,
    "",
    `نُعذركم بوجوب سداد كامل المبلغ أو التواصل لتسوية الحساب خلال ${input.gracePeriodDays} أيام من تاريخ استلام هذا الإنذار. وفي حال انقضاء المهلة دون وفاء، تحتفظ شركة العراف لتأجير السيارات بحقها في اتخاذ الإجراءات القانونية والمطالبة بما يثبت نظاماً، دون تنازل عن أي حق آخر.`,
    "",
    "يرجى الرد على هذه الرسالة بكلمة «استلمت» تأكيداً للاستلام، وإرسال ما يثبت السداد عند التنفيذ.",
    "",
    "شركة العراف لتأجير السيارات",
    "قسم الشؤون القانونية والتحصيل",
  ].join("\n");
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
