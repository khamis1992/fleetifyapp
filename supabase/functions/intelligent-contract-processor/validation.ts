export interface PhoneValidation {
  isValid: boolean;
  needsFix: boolean;
  cleanPhone?: string;
}

export interface DateValidation {
  isValid: boolean;
  needsFix: boolean;
  fixedDate?: string;
  reason?: string;
}

export function validateAndFixPhone(phone: string): PhoneValidation {
  if (!phone || typeof phone !== "string") {
    return { isValid: false, needsFix: false };
  }

  const cleaned = phone.replace(/[\s\-()]/g, "");
  const prefixed = cleaned.match(/^\+?974([3-7]\d{7})$/);
  const local = cleaned.match(/^([3-7]\d{7})$/);
  const nationalNumber = prefixed?.[1] || local?.[1];
  if (!nationalNumber) return { isValid: false, needsFix: false };

  const cleanPhone = `+974${nationalNumber}`;
  return {
    isValid: true,
    needsFix: cleanPhone !== phone,
    cleanPhone,
  };
}

export function validateAndFixDate(dateStr: string): DateValidation {
  if (!dateStr) return { isValid: false, needsFix: false };

  const formatDate = (year: number, month: number, day: number) => {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (
      candidate.getUTCFullYear() !== year ||
      candidate.getUTCMonth() !== month - 1 ||
      candidate.getUTCDate() !== day
    ) return null;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const yearFirst = dateStr.match(/^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/);
  if (yearFirst) {
    const fixedDate = formatDate(
      Number(yearFirst[1]),
      Number(yearFirst[3]),
      Number(yearFirst[4]),
    );
    return fixedDate
      ? { isValid: true, needsFix: fixedDate !== dateStr, fixedDate }
      : { isValid: false, needsFix: false, reason: "التاريخ غير موجود في التقويم" };
  }

  const dayOrMonthFirst = dateStr.match(/^(\d{1,2})([-/])(\d{1,2})\2(\d{4})$/);
  if (dayOrMonthFirst) {
    const first = Number(dayOrMonthFirst[1]);
    const second = Number(dayOrMonthFirst[3]);
    const year = Number(dayOrMonthFirst[4]);
    if (first <= 12 && second <= 12) {
      return {
        isValid: false,
        needsFix: false,
        reason: "التاريخ ملتبس بين DD/MM وMM/DD",
      };
    }
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;
    const fixedDate = formatDate(year, month, day);
    return fixedDate
      ? { isValid: true, needsFix: true, fixedDate }
      : { isValid: false, needsFix: false, reason: "التاريخ غير موجود في التقويم" };
  }

  return { isValid: false, needsFix: false, reason: "صيغة التاريخ غير مدعومة" };
}

export function validateAndFixAmount(amount: unknown): {
  isValid: boolean;
  needsFix: boolean;
  fixedAmount?: number;
} {
  if (typeof amount === "number" && Number.isFinite(amount) && amount >= 0) {
    return { isValid: true, needsFix: false };
  }

  if (typeof amount === "string") {
    const cleaned = amount
      .trim()
      .replace(/(?:QAR|ر\.?\s?ق)/gi, "")
      .replace(/[\s,]/g, "");
    if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
      return { isValid: false, needsFix: false };
    }
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return { isValid: true, needsFix: true, fixedAmount: parsed };
    }
  }

  return { isValid: false, needsFix: false };
}
