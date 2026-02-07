export const DELAY_FINE_PER_DAY = 120; // QAR
export const MAX_FINE_PER_MONTH = 3000; // QAR

export interface MonthlySummaryItem {
  month: string;
  rent: number;
  fines: number;
  total: number;
  count: number;
  monthKey: string;
}
