/**
 * Amount to Arabic Words Converter
 * Converts numeric amounts to Arabic text for Qatar court submissions
 */

/**
 * Convert a number to Arabic words
 */
export function convertAmountToArabic(amount: number): string {
  if (amount === 0) {
    return 'صفر ريال قطري';
  }

  // Split into riyals and dirhams
  const riyals = Math.floor(amount);
  const dirhams = Math.round((amount - riyals) * 100);

  let result = '';

  // Convert riyals
  if (riyals > 0) {
    result += convertToArabicWords(riyals);
    result += ' ' + getCurrencyUnit(riyals, 'riyal');
  }

  // Add dirhams if present
  if (dirhams > 0) {
    if (riyals > 0) {
      result += ' و';
    }
    result += ' ' + convertToArabicWords(dirhams);
    result += ' ' + getCurrencyUnit(dirhams, 'dirham');
  }

  return result.trim() + ' فقط';
}

/**
 * Convert number to Arabic words
 */
function convertToArabicWords(num: number): string {
  if (num === 0) return '';

  const arabicOnes = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const arabicTens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const arabicTeens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const arabicHundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const arabicThousands = ['', 'ألف', 'ألفان', 'آلاف', 'آلاف'];

  if (num < 10) {
    return arabicOnes[num];
  }

  if (num < 20) {
    return arabicTeens[num - 10];
  }

  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    if (ones === 0) {
      return arabicTens[tens];
    }
    return arabicOnes[ones] + ' و' + arabicTens[tens];
  }

  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    if (remainder === 0) {
      return arabicHundreds[hundreds];
    }
    return arabicHundreds[hundreds] + ' و' + convertToArabicWords(remainder);
  }

  if (num < 1000000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;

    let thousandWord = '';
    if (thousands === 1) {
      thousandWord = arabicThousands[1];
    } else if (thousands === 2) {
      thousandWord = arabicThousands[2];
    } else if (thousands <= 10) {
      thousandWord = convertToArabicWords(thousands) + ' ' + arabicThousands[3];
    } else {
      thousandWord = convertToArabicWords(thousands) + ' ' + arabicThousands[4];
    }

    if (remainder === 0) {
      return thousandWord;
    }
    return thousandWord + ' و' + convertToArabicWords(remainder);
  }

  // For millions and above, use a recursive approach
  if (num < 1000000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    const millionWord = millions === 1 ? 'مليون' : millions === 2 ? 'مليونان' : convertToArabicWords(millions) + ' ملايين';

    if (remainder === 0) {
      return millionWord;
    }
    return millionWord + ' و' + convertToArabicWords(remainder);
  }

  return num.toString();
}

/**
 * Get the correct currency unit form based on number
 */
function getCurrencyUnit(num: number, type: 'riyal' | 'dirham'): string {
  if (type === 'riyal') {
    if (num === 1) return 'ريال قطري';
    if (num === 2) return 'ريالان قطريان';
    if (num >= 3 && num <= 10) return 'ريالات قطرية';
    return 'ريالاً قطرياً';
  } else {
    // dirham
    if (num === 1) return 'درهم';
    if (num === 2) return 'درهمان';
    if (num >= 3 && num <= 10) return 'دراهم';
    return 'درهماً';
  }
}

/**
 * Format amount for display (with QAR currency)
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Validate amount is positive number
 */
export function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  if (amount > 999999999.99) {
    return { valid: false, error: 'Amount is too large (max: 999,999,999.99)' };
  }

  return { valid: true };
}

export default {
  convertAmountToArabic,
  formatAmount,
  validateAmount
};
