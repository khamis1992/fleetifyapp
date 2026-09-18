export const LEGAL_IDENTITY_ENGINE_VERSION = "2026-09-07.2";
export type LegalContractIdentityStatus = "matched" | "mismatch" | "unverified";

export interface LegalContractIdentityAssessment {
  status: LegalContractIdentityStatus;
  expectedName: string | null;
  extractedName: string | null;
  expectedId: string | null;
  extractedId: string | null;
  reason: string;
  reasonCode?: string;
  engineVersion?: string;
  details?: Record<string, unknown>;
}
export interface ContractTenantIdentity {
  nameArabic: string | null;
  identityNumber: string | null;
  evidence?: string;
  ambiguous?: boolean;
  candidates?: Array<{ nameArabic: string | null; identityNumber: string | null; evidence?: string }>;
}

export const normalizeIdentityDigits = (value: string) => value.normalize("NFKC")
  .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit <= "٩" ? 0x660 : 0x6f0)));

// Formatting is harmless; missing digits, letters and OCR guesses are not.
export const normalizeIdentityNumber = (value?: string | null): string | null => {
  const normalized = normalizeIdentityDigits(String(value || "")).replace(/[\s\-\u200e\u200f\u061c]/g, "");
  return /^[0-9]{11}$/.test(normalized) ? normalized : null;
};

/** Bind QIDs to identity labels; bank account and cheque numbers are not identity evidence. */
export function extractLabelledIdentityNumbers(text: string): Array<{ value: string; snippet: string }> {
  const normalized = normalizeIdentityDigits(text);
  const pattern = /(?:\bQID(?:\s*(?:No\.?|Number))?|\bID\s*(?:No\.?|Number)|رقم\s*(?:البطاق[ةه](?:\s*الشخصي[ةه])?|الهوي[ةه])|الرقم\s*الشخصي)\s*[:：.\-]?\s*([0-9](?:[ \t-]*[0-9]){10})(?![0-9])/giu;
  return Array.from(normalized.matchAll(pattern), (match) => ({ value: normalizeIdentityNumber(match[1])!, snippet: normalized.slice(Math.max(0, match.index! - 35), match.index! + match[0].length + 35) }));
}

export const normalizeArabicIdentityName = (value?: string | null) => String(value || "")
  .normalize("NFKC")
  .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
  .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
  .replace(/ؤ/g, "و").replace(/ئ/g, "ي")
  .replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim()
  // Only established compounds: never remove all spaces or reorder family names.
  .replace(/(?:^|\s)عبد\s+(الله|الرحمن|الرحيم|العزيز|الكريم|اللطيف|الحميد|الوهاب|القادر|السلام|الملك|الرزاق)(?=\s|$)/gu, " عبد$1").trim();

export const isPlausibleTenantName = (value?: string | null) => {
  const normalized = normalizeArabicIdentityName(value);
  const tokens = normalized.split(" ");
  return tokens.length >= 2 && tokens.length <= 9
    && /^[\p{Script=Arabic}\s]+$/u.test(normalized)
    && !/(?:^| )(?:الطرف|للطرف|العقد|بموجب|المستاجر|الموجر|لاحقا|بلفظ|يمكن|استرجاع|يشار|بشار|يلتزم|يتعهد|الشروط|الجنسيه|العنوان|البطاقه|الهويه|مبلغ|الضمان|السياره|تسلم|تعتبر|الاشعارات|المرسله|النحو|الوارد|اعلاه|استلامها|توقيعه|معاينه|اقرار|الماده|البند|التوقيع|التاريخ|بعد|هذا|هذه|بمجرد)(?: |$)/u.test(normalized);
};

export function assessLegalContractIdentity(input: {
  expectedName?: string | null; extractedName?: string | null;
  expectedId?: string | null; extractedId?: string | null;
  authoritativeName?: boolean;
  incompleteScan?: boolean;
  ambiguousEvidence?: boolean;
  idConfidence?: number | null;
}): LegalContractIdentityAssessment {
  const expectedName = normalizeArabicIdentityName(input.expectedName) || null;
  const extractedName = normalizeArabicIdentityName(input.extractedName) || null;
  const expectedId = normalizeIdentityNumber(input.expectedId);
  const extractedId = normalizeIdentityNumber(input.extractedId);
  const plausibleName = isPlausibleTenantName(input.extractedName);
  const result = (status: LegalContractIdentityStatus, reasonCode: string, reason: string): LegalContractIdentityAssessment => ({
    status, expectedName, extractedName, expectedId, extractedId, reason, reasonCode,
    engineVersion: LEGAL_IDENTITY_ENGINE_VERSION,
    details: {
      reasonCode,
      raw: { expectedName: input.expectedName || null, extractedName: input.extractedName || null, expectedId: input.expectedId || null, extractedId: input.extractedId || null },
      normalized: { expectedName, extractedName, expectedId, extractedId },
      nameSource: input.authoritativeName ? "tenant_field" : "supporting_identity",
      nameRejectedAsProse: Boolean(input.extractedName && !plausibleName),
      idConfidence: input.idConfidence ?? null,
      confidenceMeaning: "ocr_recognition_not_identity_probability",
    },
  });
  if (input.incompleteScan) return result("unverified", "incomplete_scan", "لم تكتمل قراءة جميع الصفحات؛ أعد الفحص قبل اعتماد النتيجة.");
  if (input.ambiguousEvidence) return result("unverified", "ambiguous_evidence", "توجد قراءات متعددة للهوية أو للمستأجر؛ يلزم مراجعة مواضعها في الملف.");
  // A conservative review threshold, not a calibrated probability of identity.
  if (input.idConfidence != null && input.idConfidence < 0.9) return result("unverified", "low_ocr_confidence", "قراءة الرقم الشخصي غير واضحة بما يكفي للحكم؛ راجع الصورة أو أعد الفحص بنسخة أوضح.");
  if (expectedId && extractedId && expectedId !== extractedId) return result("mismatch", "identity_number_conflict", "الرقم الشخصي الكامل المقروء يختلف عن رقم العميل المسجل؛ راجع الرقمين وموضعهما في المستند.");
  if (input.authoritativeName && plausibleName && expectedName && expectedName !== extractedName) {
    return result("unverified", "tenant_name_conflict", "اسم المستأجر في متن العقد يحتاج مراجعة؛ اختلاف الاسم وحده لا يثبت أن الملف يخص شخصًا آخر، وتطابق بطاقة مرفقة لا يحسم اسم المستأجر.");
  }
  if (expectedId && extractedId && expectedId === extractedId) return result("matched", "exact_identity_number", "الرقم الشخصي الكامل مطابق لرقم العميل، ولا يوجد تعارض موثوق في اسم المستأجر. تم تجاهل عبارات شروط العقد عند قراءة الاسم.");
  // A common name alone is insufficient to identify a person for legal evidence.
  return result("unverified", "insufficient_identity_evidence", "لا يتوفر رقم شخصي كامل وواضح للمقارنة؛ تشابه الاسم أو الرقم الناقص يحتاج مراجعة بشرية.");
}

export function extractContractTenantIdentity(text: string): ContractTenantIdentity {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const label = /^(?:(?:اسم\s+)?المست[أا]جر|الطرف\s+الثاني(?:\s*\(?\s*المست[أا]جر\s*\)?)?|اسم\s+العميل)(?:\s|$|[:：-])/u;
  const candidates: ContractTenantIdentity[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (!label.test(lines[index])) continue;
    const inlineValue = lines[index].replace(label, "").replace(/^\s*[:：-]\s*/, "").trim();
    // A clause beginning "the second party ..." is not a blank name label.
    // Do not fall through to the next line of that clause looking for a person.
    if (inlineValue && !isPlausibleTenantName(inlineValue.replace(/(?:رقم\s+(?:البطاق[ةه]|الهوي[ةه])|الجنسي[ةه]|العنوان).*$/u, ""))) continue;
    const nearby = lines.slice(index, index + 4).join("\n");
    // Never associate the first party's QID or an arbitrary eleven-digit value.
    const idLabel = /(?:رقم\s+(?:البطاق[ةه]|الهوي[ةه])|الرقم\s+الشخصي|QID)\s*[:：#-]?\s*([0-9٠-٩۰-۹][0-9٠-٩۰-۹ -]{9,18}[0-9٠-٩۰-۹])/iu;
    const identityNumber = normalizeIdentityNumber(nearby.match(idLabel)?.[1]);
    for (const line of [lines[index], lines[index + 1] || ""]) {
      const nameArabic = line.replace(label, "").replace(/^\s*[:：-]\s*/, "")
        .replace(/(?:رقم\s+(?:البطاق[ةه]|الهوي[ةه])|الجنسي[ةه]|العنوان).*$/u, "").trim();
      if (isPlausibleTenantName(nameArabic)) {
        candidates.push({ nameArabic, identityNumber, evidence: nearby.slice(0, 700) });
        break;
      }
    }
  }
  const names = new Set(candidates.map((candidate) => normalizeArabicIdentityName(candidate.nameArabic)));
  const ids = new Set(candidates.map((candidate) => candidate.identityNumber).filter(Boolean));
  if (names.size > 1 || ids.size > 1) return { nameArabic: null, identityNumber: null, ambiguous: true, candidates };
  return candidates[0] || { nameArabic: null, identityNumber: null };
}
