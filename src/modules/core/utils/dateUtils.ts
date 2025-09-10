import { format, parseISO, isValid } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * تنسيق التاريخ بالتقويم الميلادي
 */
export function formatDateInGregorian(
  date: string | Date | null | undefined,
  formatString: string = 'dd/MM/yyyy'
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, formatString, { locale: ar });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * تنسيق التاريخ والوقت
 */
export function formatDateTimeInGregorian(
  date: string | Date | null | undefined,
  formatString: string = 'dd/MM/yyyy HH:mm'
): string {
  return formatDateInGregorian(date, formatString);
}

/**
 * تنسيق التاريخ النسبي (منذ كم يوم)
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) return '';
    
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'اليوم';
    if (diffInDays === 1) return 'أمس';
    if (diffInDays < 30) return `منذ ${diffInDays} يوم`;
    if (diffInDays < 365) return `منذ ${Math.floor(diffInDays / 30)} شهر`;
    return `منذ ${Math.floor(diffInDays / 365)} سنة`;
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return '';
  }
}