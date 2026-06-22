import { normalizeArabicDigits } from './numberFormatter';
import { formatDateForDocument } from './dateFormatter';

/**
 * أسماء الشهور بالعربية
 */
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * تحويل التاريخ إلى اسم الشهر بالعربية
 */
export const getArabicMonthName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'شهر غير صحيح';
  }
  
  return ARABIC_MONTHS[dateObj.getMonth()];
};

/**
 * تنسيق وصف بند الفاتورة للدفعة الشهرية
 * التنسيق: "دفعة شهرية عن شهر [الشهر] وتاريخ السداد [التاريخ] - عقد رقم [الرقم]"
 */
export const formatMonthlyPaymentDescription = (
  dueDate: Date | string,
  contractNumber: string
): string => {
  const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  
  if (isNaN(dateObj.getTime())) {
    return `دفعة شهرية - عقد رقم ${normalizeArabicDigits(contractNumber)}`;
  }
  
  const monthName = getArabicMonthName(dateObj);
  const formattedDate = formatDateForDocument(dateObj);
  const normalizedContractNumber = normalizeArabicDigits(contractNumber);
  
  return `دفعة شهرية عن شهر ${monthName} وتاريخ السداد ${formattedDate} - عقد رقم ${normalizedContractNumber}`;
};

/**
 * تنسيق وصف بند الفاتورة للدفعة الربع سنوية
 */
export const formatQuarterlyPaymentDescription = (
  dueDate: Date | string,
  contractNumber: string
): string => {
  const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  
  if (isNaN(dateObj.getTime())) {
    return `دفعة ربع سنوية - عقد رقم ${normalizeArabicDigits(contractNumber)}`;
  }
  
  const quarter = Math.floor(dateObj.getMonth() / 3) + 1;
  const year = dateObj.getFullYear();
  const formattedDate = formatDateForDocument(dateObj);
  const normalizedContractNumber = normalizeArabicDigits(contractNumber);
  
  return `دفعة ربع سنوية للربع ${quarter} من عام ${year} وتاريخ السداد ${formattedDate} - عقد رقم ${normalizedContractNumber}`;
};

/**
 * تنسيق وصف بند الفاتورة للدفعة السنوية
 */
export const formatYearlyPaymentDescription = (
  dueDate: Date | string,
  contractNumber: string
): string => {
  const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  
  if (isNaN(dateObj.getTime())) {
    return `دفعة سنوية - عقد رقم ${normalizeArabicDigits(contractNumber)}`;
  }
  
  const year = dateObj.getFullYear();
  const formattedDate = formatDateForDocument(dateObj);
  const normalizedContractNumber = normalizeArabicDigits(contractNumber);
  
  return `دفعة سنوية لعام ${year} وتاريخ السداد ${formattedDate} - عقد رقم ${normalizedContractNumber}`;
};

/**
 * تنسيق وصف بند الفاتورة بناءً على نوع الدفعة
 */
export const formatPaymentDescription = (
  paymentType: 'monthly' | 'quarterly' | 'yearly',
  dueDate: Date | string,
  contractNumber: string
): string => {
  switch (paymentType) {
    case 'monthly':
      return formatMonthlyPaymentDescription(dueDate, contractNumber);
    case 'quarterly':
      return formatQuarterlyPaymentDescription(dueDate, contractNumber);
    case 'yearly':
      return formatYearlyPaymentDescription(dueDate, contractNumber);
    default:
      return `دفعة - عقد رقم ${normalizeArabicDigits(contractNumber)}`;
  }
};