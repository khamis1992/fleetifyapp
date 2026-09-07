/** Preserve the existing billing basis and charge only additional calendar months. */
export function contractExtensionAmount(original: {
  end_date: string; contract_amount: number; monthly_amount: number;
}, endDate: string): number {
  const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
  return Math.round((Number(original.contract_amount)
    + (monthIndex(endDate) - monthIndex(original.end_date)) * Number(original.monthly_amount)) * 100) / 100;
}
