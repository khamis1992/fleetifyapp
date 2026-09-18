import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { z } from 'zod';

const reportSchema = z.object({
  checked_at: z.string(), company_id: z.string(), status: z.enum(['healthy', 'needs_attention']),
  summary: z.object({
    completed_payments: z.number().nonnegative(), completed_payments_without_journal: z.number().nonnegative(),
    unbalanced_journal_entries: z.number().nonnegative(), invoice_paid_amount_mismatches: z.number().nonnegative(), overpaid_invoices: z.number().nonnegative(),
  }),
  issues: z.array(z.object({ code: z.string(), count: z.number().nonnegative(), sample: z.array(z.unknown()).optional() })),
});

export type FinancialIntegrityIssue = {
  code: string;
  count: number;
  sample?: unknown[];
};

export type FinancialIntegrityReport = {
  checked_at: string;
  company_id: string;
  status: 'healthy' | 'needs_attention';
  summary: {
    completed_payments: number;
    completed_payments_without_journal: number;
    unbalanced_journal_entries: number;
    invoice_paid_amount_mismatches: number;
    overpaid_invoices: number;
  };
  issues: FinancialIntegrityIssue[];
};

const emptyReport = (companyId: string): FinancialIntegrityReport => ({
  checked_at: new Date().toISOString(),
  company_id: companyId,
  status: 'healthy',
  summary: {
    completed_payments: 0,
    completed_payments_without_journal: 0,
    unbalanced_journal_entries: 0,
    invoice_paid_amount_mismatches: 0,
    overpaid_invoices: 0,
  },
  issues: [],
});

export const useFinancialIntegrityReport = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['financial-integrity-report', companyId],
    enabled: Boolean(companyId),
    staleTime: 60_000,
    queryFn: async (): Promise<FinancialIntegrityReport> => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase.rpc('get_financial_integrity_report', {
        p_company_id: companyId,
      });

      if (error) {
        if (error.code === '42883' || /get_financial_integrity_report/i.test(error.message || '')) {
          return {
            ...emptyReport(companyId),
            status: 'needs_attention',
            issues: [
              {
                code: 'financial_controls_migration_not_applied',
                count: 1,
                sample: [error.message],
              },
            ],
          };
        }

        throw error;
      }

      const parsed = reportSchema.safeParse(data);
      if (!parsed.success || parsed.data.company_id !== companyId) throw new Error('تعذر قراءة نتيجة الفحص المالي لهذه الشركة.');
      return parsed.data;
    },
  });
};
