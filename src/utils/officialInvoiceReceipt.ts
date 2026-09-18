import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { PaymentReceiptProps } from "@/components/payments/PaymentReceipt";
import { extractCustomerName, extractVehicleNumber } from "@/utils/invoiceHelpers";

interface OfficialInvoiceReceiptInput {
  source?: string | null;
  payment_status?: string | null;
  total_amount?: number | string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  description?: string | null;
  payment_method?: string | null;
  invoice_number?: string | null;
  [key: string]: unknown;
}

export function numberToArabicWords(amount: number): string {
  const arabicOnes = [
    "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
    "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر",
    "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"
  ];

  const arabicTens = [
    "", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"
  ];

  const arabicHundreds = [
    "", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة",
    "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"
  ];

  if (amount === 0) return "صفر ريال قطري فقط";

  const intAmount = Math.floor(amount);
  const decimal = Math.round((amount - intAmount) * 100);

  const convertLessThanThousand = (num: number): string => {
    if (num === 0) return "";

    if (num < 20) {
      return arabicOnes[num];
    }

    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      return unit === 0 ? arabicTens[ten] : `${arabicOnes[unit]} و ${arabicTens[ten]}`;
    }

    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return remainder === 0
      ? arabicHundreds[hundred]
      : `${arabicHundreds[hundred]} و ${convertLessThanThousand(remainder)}`;
  };

  let result = "";

  if (intAmount < 1000) {
    result = convertLessThanThousand(intAmount);
  } else {
    const thousands = Math.floor(intAmount / 1000);
    const remainder = intAmount % 1000;

    if (thousands === 1) {
      result = "ألف";
    } else if (thousands === 2) {
      result = "ألفان";
    } else if (thousands > 2 && thousands < 11) {
      result = `${arabicOnes[thousands]} آلاف`;
    } else {
      result = `${convertLessThanThousand(thousands)} ألف`;
    }

    if (remainder > 0) {
      result += ` و ${convertLessThanThousand(remainder)}`;
    }
  }

  result += " ريال قطري";

  if (decimal > 0) {
    result += ` و ${decimal} درهم`;
  }

  return `${result} فقط لا غير`;
}

function normalizePaymentMethod(method: unknown): PaymentReceiptProps["paymentMethod"] {
  return method === "check" || method === "bank_transfer" || method === "other" || method === "cash"
    ? method
    : "cash";
}

export function buildOfficialInvoiceReceiptProps(
  invoice: OfficialInvoiceReceiptInput,
  customerName?: string
): PaymentReceiptProps {
  const isContractualSchedule = invoice.source === "payment_schedule";
  const isPaid = invoice.payment_status === "paid";
  const totalAmount = Number(invoice.total_amount) || Number(invoice.amount) || 0;
  const paidAmount = Number(invoice.paid_amount) || 0;
  const remainingAmount = totalAmount - paidAmount;
  const displayAmount = isPaid ? paidAmount : remainingAmount > 0 ? remainingAmount : totalAmount;
  const invoiceDate = invoice.invoice_date || invoice.due_date || new Date().toISOString();
  const formattedDate = format(new Date(invoiceDate), "dd/MM/yyyy");
  const description = invoice.description || (isContractualSchedule
    ? `استحقاق أجرة تعاقدي عن ${format(new Date(invoiceDate), "MMMM yyyy", { locale: ar })}`
    : `فاتورة إيجار شهري - ${format(new Date(invoiceDate), "MMMM yyyy", { locale: ar })}`);

  return {
    receiptNumber: invoice.invoice_number || "غير محدد",
    date: formattedDate,
    customerName: customerName || extractCustomerName(invoice),
    amountInWords: numberToArabicWords(displayAmount),
    amount: displayAmount,
    description,
    paymentMethod: normalizePaymentMethod(invoice.payment_method),
    documentTitle: isPaid
      ? { ar: "سند قبض", en: "PAYMENT VOUCHER" }
      : isContractualSchedule
        ? { ar: "كشف استحقاق تعاقدي", en: "CONTRACTUAL DUE STATEMENT" }
        : { ar: "فاتورة مستحقة", en: "DUE INVOICE" },
    hidePaymentMethod: !isPaid,
    totalAmount,
    paidAmount,
    remainingAmount,
    showPaymentDetails: remainingAmount > 0 || paidAmount > 0,
    vehicleNumber: extractVehicleNumber(invoice),
  };
}
