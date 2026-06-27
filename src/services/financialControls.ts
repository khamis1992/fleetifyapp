import { supabase } from '@/integrations/supabase/client';

export const assertFinancialPeriodOpen = async (
  companyId: string,
  transactionDate?: string | null
) => {
  if (!companyId || !transactionDate) return;

  const { data, error } = await supabase
    .from('accounting_periods')
    .select('id, period_name, status')
    .eq('company_id', companyId)
    .lte('start_date', transactionDate)
    .gte('end_date', transactionDate)
    .in('status', ['closed', 'locked'])
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    throw new Error(`Financial period "${data.period_name}" is ${data.status}. Transactions dated ${transactionDate} are locked.`);
  }
};
