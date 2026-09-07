import type { FilingPayload, FilingResult } from './types';

export const normalizeReceiptText = (text: string) => text
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/\s+/g, ' ').trim();

const receiptHeading = /إشعار تقديم الطلب|إيصال طلب قيد دعوى|تم\s+بنجاح|تم\s+(?:تقديم (?:الدعوى|الطلب)|إرسال (?:الدعوى|الطلب)|إيداع الدعوى|اعتماد(?: الدعوى| الطلب)?)\s+بنجاح|submitted successfully|submission receipt/i;

/** Labels alone (or draft reference numbers) never prove submission. */
export function parseTaqadiReceipt(text: string, expected?: FilingPayload, requireIdentity = false): FilingResult | null {
  const normalized = normalizeReceiptText(text);
  if (!receiptHeading.test(normalized)) return null;
  const extract = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const value = normalized.match(pattern)?.[1]?.trim();
      if (value && value.length >= 3 && /\d/.test(value)) return value;
    }
    return null;
  };
  const caseNumber = extract([
    /رقم الدعوى\s*[:：]?\s*([A-Z0-9/-]+)/i,
    /Case\s*No\.?\s*[:：]?\s*([A-Z0-9/-]+)/i,
  ]);
  const referenceNumber = extract([
    /(?:الرقم المرجعي|رقم المرجع|رقم الطلب)\s*[:：]?\s*([A-Z0-9/-]+)/i,
    /Reference\s*[:：]?\s*([A-Z0-9/-]+)/i,
  ]) || caseNumber;
  if (!referenceNumber) return null;
  // Some portal receipts omit party/contract information. If provided, it
  // must agree with the reviewed package, never a different open draft.
  const contract = normalized.match(/رقم العقد\s*[:：]\s*([A-Z0-9/-]+)/i)?.[1];
  if (expected && contract && contract !== normalizeReceiptText(expected.contract.number)) return null;
  const identity = normalized.match(/(?:رقم هوية المدعى عليه|الرقم الشخصي للمدعى عليه)\s*[:：]\s*(\d+)/)?.[1];
  if (expected?.defendant.idNumber && identity
    && identity !== normalizeReceiptText(expected.defendant.idNumber)) return null;
  // A receipt found on startup must prove which filing it belongs to. In the
  // normal submit flow the reviewed page and the single click provide that link.
  if (requireIdentity && !(expected && contract
    && contract === normalizeReceiptText(expected.contract.number))) return null;
  const fees = normalized.match(/(?:رسوم تسليم طلب رفع دعوى|قيمة الرسوم|الرسوم)\s*[:：]?\s*([0-9,.]+)/)?.[1]
    || normalized.match(/المجموع\s*:?\s*\[?ريال قطري\]?\s*([0-9,.]+)/)?.[1];
  const courtFees = fees ? Number(fees.replace(/,/g, '')) : null;
  return {
    caseNumber, referenceNumber,
    courtFees: courtFees !== null && Number.isFinite(courtFees) ? courtFees : null,
    confirmationText: normalized.slice(0, 10_000),
  };
}
