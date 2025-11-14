import moment from 'moment-hijri';

/**
 * Convert Gregorian date to Hijri date
 * @param date - Date object or date string
 * @param format - Output format (default: 'iYYYY/iMM/iDD')
 * @returns Formatted Hijri date string
 */
export const toHijri = (date: Date | string, format: string = 'iYYYY/iMM/iDD'): string => {
  try {
    const momentDate = moment(date);
    return momentDate.format(format);
  } catch (error) {
    console.error('Error converting to Hijri:', error);
    return '';
  }
};

/**
 * Convert Hijri date to Gregorian date
 * @param hijriDate - Hijri date string
 * @param inputFormat - Input format (default: 'iYYYY/iMM/iDD')
 * @returns Date object
 */
export const fromHijri = (hijriDate: string, inputFormat: string = 'iYYYY/iMM/iDD'): Date => {
  try {
    const momentDate = moment(hijriDate, inputFormat);
    return momentDate.toDate();
  } catch (error) {
    console.error('Error converting from Hijri:', error);
    return new Date();
  }
};

/**
 * Get current date in Hijri format
 * @param format - Output format (default: 'iYYYY/iMM/iDD')
 * @returns Formatted Hijri date string
 */
export const getCurrentHijriDate = (format: string = 'iYYYY/iMM/iDD'): string => {
  return moment().format(format);
};

/**
 * Format Hijri date with Arabic month names
 * @param date - Date object or date string
 * @returns Formatted Hijri date with Arabic month name
 */
export const toHijriWithMonthName = (date: Date | string): string => {
  try {
    const momentDate = moment(date);
    const hijriMonths = [
      'محرم',
      'صفر',
      'ربيع الأول',
      'ربيع الآخر',
      'جمادى الأولى',
      'جمادى الآخرة',
      'رجب',
      'شعبان',
      'رمضان',
      'شوال',
      'ذو القعدة',
      'ذو الحجة'
    ];
    
    const day = momentDate.format('iD');
    const month = parseInt(momentDate.format('iM')) - 1;
    const year = momentDate.format('iYYYY');
    
    return `${day} ${hijriMonths[month]} ${year}هـ`;
  } catch (error) {
    console.error('Error formatting Hijri date:', error);
    return '';
  }
};

/**
 * Get both Gregorian and Hijri dates formatted
 * @param date - Date object or date string
 * @returns Object with both Gregorian and Hijri dates
 */
export const getDualDate = (date: Date | string) => {
  const momentDate = moment(date);
  return {
    gregorian: momentDate.format('YYYY/MM/DD'),
    gregorianFormatted: momentDate.format('DD/MM/YYYY'),
    hijri: momentDate.format('iYYYY/iMM/iDD'),
    hijriFormatted: toHijriWithMonthName(date),
  };
};
