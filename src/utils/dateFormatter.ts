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

  // فرض استخدام الأرقام الإنجليزية دائماً
  const preferences = getNumberPreferences();
  if (!preferences.useArabicDigits) {
    // تحويل أي أرقام عربية إلى إنجليزية
    formatted = formatted.replace(/[٠-٩]/g, (match) => {
      const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
      const englishDigits = '0123456789';
      return englishDigits[arabicDigits.indexOf(match)];
    });
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

  // تنسيق التاريخ بالأرقام الإنجليزية دائماً
  let formatted = dateObj.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // فرض استخدام الأرقام الإنجليزية دائماً (لا تطبيق التفضيلات هنا)
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

  // فرض استخدام الأرقام الإنجليزية دائماً
  const preferences = getNumberPreferences();
  if (!preferences.useArabicDigits) {
    // تحويل أي أرقام عربية إلى إنجليزية
    formatted = formatted.replace(/[٠-٩]/g, (match) => {
      const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
      const englishDigits = '0123456789';
      return englishDigits[arabicDigits.indexOf(match)];
    });
  }

  return formatted;
};