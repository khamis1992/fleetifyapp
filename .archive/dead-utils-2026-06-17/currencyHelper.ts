/**
 * Currency Helper Utilities
 * للمساعدة في توحيد العملات عبر النظام
 */

import { getCurrencyConfig } from './currencyConfig';

/**
 * تحويل الأرقام إلى صيغة العملة المناسبة
 * @param amount المبلغ
 * @param currency العملة (افتراضي: QAR)
 * @param includeSymbol هل يتم إضافة رمز العملة
 */
export function formatCurrency(
  amount: number,
  currency: string = 'QAR',
  includeSymbol: boolean = true
): string {
  const config = getCurrencyConfig(currency);
  const formatted = amount.toFixed(config.fractionDigits);
  
  if (!includeSymbol) {
    return formatted;
  }
  
  return `${formatted} ${config.symbol}`;
}

/**
 * استبدال رمز "د.ك" بـ "QAR" في النصوص
 * @param text النص المراد تحويله
 */
export function convertKWDToQAR(text: string): string {
  return text.replace(/د\.ك/g, 'ر.ق');
}

/**
 * الحصول على رمز العملة الافتراضي للشركة
 * @param companyId معرّف الشركة (اختياري)
 */
export function getDefaultCurrencySymbol(companyId?: string): string {
  // يمكن تطوير هذه الدالة لاحقاً لجلب العملة من إعدادات الشركة
  // حالياً نرجع QAR كعملة افتراضية
  return getCurrencyConfig('QAR').symbol;
}

/**
 * تنسيق المبلغ حسب العملة الافتراضية للنظام
 */
export function formatDefaultCurrency(amount: number): string {
  return formatCurrency(amount, 'QAR', true);
}

