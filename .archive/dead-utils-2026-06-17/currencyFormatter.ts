export const formatCurrency = (amount: number | string, currency: string = 'KWD'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0.000 KWD';
  }

  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(numAmount);
};

export const parseCurrency = (formattedAmount: string): number => {
  // Remove currency symbol and spaces, then parse
  const cleanAmount = formattedAmount.replace(/[^\d.-]/g, '');
  return parseFloat(cleanAmount) || 0;
};