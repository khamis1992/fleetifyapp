import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAccountNameTranslation } from "./accountNamesTranslation"
import { formatNumberWithPreferences, normalizeArabicDigits, parseNumber } from "@/utils/numberFormatter"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function translateAccountName(accountName: string): string {
  return getAccountNameTranslation(accountName)
}

/**
 * تنسيق الأرقام باستخدام النظام الموحد
 */
export function formatNumber(value: number | string): string {
  return formatNumberWithPreferences(value)
}

/**
 * تحويل النص إلى رقم مع دعم الأرقام العربية
 */
export function safeParseNumber(value: string | number): number {
  return parseNumber(value)
}

/**
 * تحويل الأرقام العربية إلى إنجليزية
 */
export function normalizeDigits(input: string): string {
  return normalizeArabicDigits(input)
}

/**
 * تنسيق العملة
 * @param amount المبلغ
 * @param showDecimals إظهار الكسور العشرية (افتراضي: فقط إذا كان هناك كسور)
 */
export function formatCurrency(amount: number, showDecimals: boolean = false): string {
  // التحقق من وجود كسور عشرية
  const hasDecimals = amount % 1 !== 0;
  
  // تنسيق الرقم مع الفواصل العشرية
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: (showDecimals || hasDecimals) ? 2 : 0,
    maximumFractionDigits: 2,
  });
  
  return formatted + ' ر.ق';
}
