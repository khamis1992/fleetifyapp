import { getNumberPreferences, convertToArabicDigits } from "./numberFormatter";

/**
 * تنسيق التاريخ بالتقويم الميلادي باللغة العربية
 */
export const formatDateInGregorian = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // التأكد من صحة التاريخ
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح';
  }

  // تنسيق التاريخ بالميلادي باللغة العربية
  let formatted = dateObj.toLocaleDateString('ar-SA', {
    calendar: 'gregory', // التقويم الميلادي
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // تطبيق تفضيلات الأرقام الموحدة
  const preferences = getNumberPreferences();
  if (preferences.useArabicDigits) {
    formatted = convertToArabicDigits(formatted);
  }

  return formatted;
};

/**
 * تنسيق التاريخ بالأرقام الإنجليزية للطباعة والمستندات
 */
export const formatDateForDocument = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  // تنسيق التاريخ بالأرقام الإنجليزية (أو العربية حسب التفضيلات)
  let formatted = dateObj.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // تطبيق تفضيلات الأرقام الموحدة
  const preferences = getNumberPreferences();
  if (preferences.useArabicDigits) {
    formatted = convertToArabicDigits(formatted);
  }

  return formatted;
};

/**
 * تنسيق التاريخ الكامل بالعربية للعقود
 */
export const formatDateForContract = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح';
  }

  // تنسيق مفصل بالعربية مع التقويم الميلادي
  let formatted = dateObj.toLocaleDateString('ar-SA', {
    calendar: 'gregory',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // تطبيق تفضيلات الأرقام الموحدة
  const preferences = getNumberPreferences();
  if (preferences.useArabicDigits) {
    formatted = convertToArabicDigits(formatted);
  }

  return formatted;
};