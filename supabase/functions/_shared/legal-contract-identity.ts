export type LegalContractIdentityStatus =
  | "matched"
  | "mismatch"
  | "unverified";

export interface LegalContractIdentityAssessment {
  status: LegalContractIdentityStatus;
  expectedName: string | null;
  extractedName: string | null;
  expectedId: string | null;
  extractedId: string | null;
  reason: string;
}

export interface ContractTenantIdentity {
  nameArabic: string | null;
  identityNumber: string | null;
}

const normalizeArabicName = (value?: string | null) => String(value || "")
  .normalize("NFKC")
  .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
  .replace(/[أإآٱ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/ؤ/g, "و")
  .replace(/ئ/g, "ي")
  .replace(/[،؛؟۔]/g, " ")
  .replace(/[^\u0600-\u06FF0-9 ]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const normalizeId = (value?: string | null) => String(value || "")
  .replace(/[^0-9]/g, "");

export function assessLegalContractIdentity(input: {
  expectedName?: string | null;
  extractedName?: string | null;
  expectedId?: string | null;
  extractedId?: string | null;
  authoritativeName?: boolean;
}): LegalContractIdentityAssessment {
  const expectedName = normalizeArabicName(input.expectedName) || null;
  const extractedName = normalizeArabicName(input.extractedName) || null;
  const expectedId = normalizeId(input.expectedId) || null;
  const extractedId = normalizeId(input.extractedId) || null;
  const extractedNameTokens = extractedName?.split(" ").filter(Boolean) ?? [];
  const extractedNameLooksLikeTenant = extractedNameTokens.length >= 2
    && extractedNameTokens.length <= 9
    && !/(?:^| )(?:الطرف|للطرف|العقد|بموجب|المستاجر|الموجر|لاحقا|بلفظ|يمكن|استرجاع)(?: |$)/u.test(extractedName ?? "");

  const assessNames = (): LegalContractIdentityAssessment | null => {
    if (!expectedName || !extractedName) return null;
    if (expectedName === extractedName) {
      return {
        status: "matched",
        expectedName,
        extractedName,
        expectedId,
        extractedId,
        reason: "The Arabic tenant name in the signed contract matches the defendant.",
      };
    }

    const expectedTokens = expectedName.split(" ").filter(Boolean);
    const extractedTokens = extractedName.split(" ").filter(Boolean);
    const sharedTokens = expectedTokens.filter((token) => extractedTokens.includes(token));
    const firstNameMatches = expectedTokens[0] === extractedTokens[0];
    const overlap = sharedTokens.length / Math.max(expectedTokens.length, extractedTokens.length);

    if (firstNameMatches && sharedTokens.length >= 2 && overlap >= 0.5) {
      return {
        status: "unverified",
        expectedName,
        extractedName,
        expectedId,
        extractedId,
        reason:
          "The names overlap after OCR normalization but are not an exact identity match; stronger evidence is required.",
      };
    }
    if (!firstNameMatches && expectedTokens.length >= 2 && extractedTokens.length >= 2) {
      return {
        status: "mismatch",
        expectedName,
        extractedName,
        expectedId,
        extractedId,
        reason: "The first name of the tenant in the signed contract is different from the defendant.",
      };
    }
    return null;
  };

  // A conflicting complete QID is always a hard blocker, even when OCR happens
  // to spell the customer name correctly.
  if (expectedId && extractedId && expectedId !== extractedId) {
    return {
      status: "mismatch",
      expectedName,
      extractedName,
      expectedId,
      extractedId,
      reason: "The identity number in the signed contract belongs to a different person.",
    };
  }

  // A plausible tenant name extracted from the contract's labelled tenant
  // field is authoritative. An attached ID card must never overrule a different
  // or incomplete named tenant. Obvious legal prose is treated as noisy OCR.
  if (input.authoritativeName && extractedNameLooksLikeTenant) {
    const authoritativeNameAssessment = assessNames();
    if (authoritativeNameAssessment) return authoritativeNameAssessment;
  }

  if (expectedId && extractedId) {
    if (expectedId === extractedId) {
      return {
        status: "matched",
        expectedName,
        extractedName,
        expectedId,
        extractedId,
        reason: "The identity number in the signed contract matches the defendant.",
      };
    }
  }

  if (input.authoritativeName && extractedName && !extractedNameLooksLikeTenant) {
    return {
      status: "unverified",
      expectedName,
      extractedName,
      expectedId,
      extractedId,
      reason: "The labelled tenant-name extraction contains legal prose and is not reliable identity evidence.",
    };
  }

  const nameAssessment = assessNames();
  if (nameAssessment) return nameAssessment;

  return {
    status: "unverified",
    expectedName,
    extractedName,
    expectedId,
    extractedId,
    reason: "The signed contract did not contain enough reliable identity evidence.",
  };
}

export function extractContractTenantIdentity(text: string): ContractTenantIdentity {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const tenantLabel = /^(?:(?:اسم\s+)?المست[أا]جر|الطرف\s+الثاني(?:\s*\(?\s*المست[أا]جر\s*\)?)?|اسم\s+العميل)(?:\s|$|[:：-])/u;

  const cleanName = (value: string) => value
    .replace(/^(?:(?:اسم\s+)?المست[أا]جر|الطرف\s+الثاني(?:\s*\(?\s*المست[أا]جر\s*\)?)?|اسم\s+العميل)\s*[:：-]?\s*/u, "")
    .replace(/(?:رقم\s+(?:البطاقه|البطاقة|الهويه|الهوية)|الجنسية|العنوان).*$/u, "")
    .replace(/[^\u0600-\u06FF ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const isPlausibleTenantName = (value: string) => {
    const tokens = value.split(" ").filter(Boolean);
    if (tokens.length < 2 || tokens.length > 9) return false;

    const normalized = normalizeArabicName(value);
    const isLegalBoilerplate =
      /(?:و?(?:يشار|بشار))\s+اليه/u.test(normalized)
      || /(?:لاحقا|بلفظ)\s+(?:المستاجر|الموجر)/u.test(normalized)
      || tokens.some((token) => /^(?:المست[أا]جر|المؤجر)$/.test(token));
    return !isLegalBoilerplate;
  };

  for (let index = 0; index < lines.length; index += 1) {
    if (!tenantLabel.test(lines[index])) continue;
    for (const candidate of [lines[index], lines[index + 1] || ""]) {
      const nameArabic = cleanName(candidate);
      if (isPlausibleTenantName(nameArabic)) {
        const nearby = lines.slice(index, index + 4).join(" ");
        const identityNumber = nearby.match(/\b[0-9]{11}\b/)?.[0] || null;
        return { nameArabic, identityNumber };
      }
    }
  }

  return { nameArabic: null, identityNumber: null };
}
