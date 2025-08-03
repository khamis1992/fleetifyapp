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
  return dateObj.toLocaleDateString('ar-SA', {
    calendar: 'gregory', // التقويم الميلادي
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * تنسيق التاريخ بالأرقام الإنجليزية للطباعة والمستندات
 */
export const formatDateForDocument = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  // تنسيق التاريخ بالأرقام الإنجليزية
  return dateObj.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
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
  return dateObj.toLocaleDateString('ar-SA', {
    calendar: 'gregory',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};