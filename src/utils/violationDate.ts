import { format, isValid } from 'date-fns';

const normalizeDigits = (value: string): string => value
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

const createValidatedDate = (year: number, month: number, day: number): Date | null => {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

export function parseViolationDate(value: unknown): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null;
  if (value === null || value === undefined) return null;

  const raw = normalizeDigits(String(value).trim());
  if (!raw) return null;

  const yearFirst = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\D|$)/);
  if (yearFirst) {
    return createValidatedDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
  }

  const dayFirst = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\D|$)/);
  if (dayFirst) {
    return createValidatedDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));
  }

  const parsed = new Date(raw);
  return isValid(parsed) ? parsed : null;
}

export function normalizeViolationDate(value: unknown): string | null {
  const date = parseViolationDate(value);
  return date ? format(date, 'yyyy-MM-dd') : null;
}

export function formatViolationDate(value: unknown, fallback = 'تاريخ غير صالح'): string {
  const date = parseViolationDate(value);
  return date ? format(date, 'dd/MM/yyyy') : fallback;
}
