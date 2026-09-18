export type MissingContractPdfMessageInput = {
  contractNumber: string;
  reason: "missing" | "identity_mismatch";
  uploadUrl: string;
};

export function normalizeStaffWhatsAppPhone(value: string | null | undefined): string | null {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `974${digits}`;
  return /^974\d{8}$/.test(digits) ? digits : null;
}

export function buildMissingContractPdfMessage(
  input: MissingContractPdfMessageInput,
): string {
  const reason = input.reason === "identity_mismatch"
    ? "النسخة الموجودة لا تطابق اسم أو هوية مستأجر هذا العقد"
    : "لا توجد نسخة عقد موقعة بصيغة PDF لهذا العقد";
  return `📄 طلب نسخة عقد PDF

${reason}.

📋 رقم العقد: ${input.contractNumber}

يرجى رفع النسخة الصحيحة بصيغة PDF من الرابط الآمن المؤقت:
${input.uploadUrl}

لن يكتمل التحويل القانوني قبل رفع نسخة تخص العميل نفسه واجتياز مطابقة الهوية.

صلاحية الرابط 10 أيام ويُستخدم مرة واحدة فقط.

شركة العراف لتأجير السيارات`;
}
