import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PayrollFinancialData {
  id: string;
  company_id: string;
  payroll_number: string;
  payroll_date: string;
  basic_salary: number;
  allowances: number;
  overtime_amount: number;
  deductions: number;
  tax_amount: number;
  net_amount: number;
  status: string;
  journal_entry_id: string | null;
  first_name: string;
  last_name: string;
  first_name_ar: string;
  last_name_ar: string;
  employee_number: string;
  department: string;
  position: string;
  journal_entry_number: string | null;
  journal_entry_status: string | null;
  cost_center_name: string | null;
  cost_center_name_ar: string | null;
  integration_status: 'integrated' | 'error' | 'pending';
}

export interface PayrollSummary {
  totalPayrolls: number;
  totalAmount: number;
  totalNetAmount: number;
  averageNetAmount: number;
  integratedCount: number;
  pendingIntegration: number;
  errorCount: number;
  integrationRate: number;
  monthlyTrend: {
    month: string;
    amount: number;
    count: number;
  }[];
}

export const usePayrollFinancialAnalysis = (filters?: {
  status?: string;
  period_start?: string;
  period_end?: string;
  department?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payroll-financial-analysis', filters],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('payroll_financial_analysis')
        .select('*')
        .order('payroll_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.period_start) {
        query = query.gte('payroll_date', filters.period_start);
      }
      if (filters?.period_end) {
        query = query.lte('payroll_date', filters.period_end);
      }
      if (filters?.department) {
        query = query.eq('department', filters.department);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PayrollFinancialData[];
    },
    enabled: !!user,
  });
};

export const usePayrollSummary = (filters?: {
  period_start?: string;
  period_end?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payroll-summary', filters],
    queryFn: async (): Promise<PayrollSummary> => {
      if (!user) throw new Error('User not authenticated');

      // Get payroll financial data
      let query = supabase
        .from('payroll_financial_analysis')
        .select('*');

      if (filters?.period_start) {
        query = query.gte('payroll_date', filters.period_start);
      }
      if (filters?.period_end) {
        query = query.lte('payroll_date', filters.period_end);
      }

      const { data, error } = await query;
      if (error) throw error;

      const payrolls = data as PayrollFinancialData[];

      // Calculate summary statistics
      const totalPayrolls = payrolls.length;
      const totalAmount = payrolls.reduce((sum, p) => sum + (p.basic_salary + p.allowances + p.overtime_amount), 0);
      const totalNetAmount = payrolls.reduce((sum, p) => sum + p.net_amount, 0);
      const averageNetAmount = totalPayrolls > 0 ? totalNetAmount / totalPayrolls : 0;
      
      const integratedCount = payrolls.filter(p => p.integration_status === 'integrated').length;
      const pendingIntegration = payrolls.filter(p => p.integration_status === 'pending').length;
      const errorCount = payrolls.filter(p => p.integration_status === 'error').length;
      const integrationRate = totalPayrolls > 0 ? (integratedCount / totalPayrolls) * 100 : 0;

      // Calculate monthly trend
      const monthlyData = new Map<string, { amount: number; count: number }>();
      payrolls.forEach(payroll => {
        const month = new Date(payroll.payroll_date).toISOString().substr(0, 7); // YYYY-MM
        const existing = monthlyData.get(month) || { amount: 0, count: 0 };
        monthlyData.set(month, {
          amount: existing.amount + payroll.net_amount,
          count: existing.count + 1
        });
      });

      const monthlyTrend = Array.from(monthlyData.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6); // Last 6 months

      return {
        totalPayrolls,
        totalAmount,
        totalNetAmount,
        averageNetAmount,
        integratedCount,
        pendingIntegration,
        errorCount,
        integrationRate,
        monthlyTrend
      };
    },
    enabled: !!user,
  });
};

export const usePayrollIntegrationStatus = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payroll-integration-status'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('payroll_financial_analysis')
        .select(`
          integration_status,
          status,
          payroll_date
        `);

      if (error) throw error;

      const statusCounts = {
        integrated: 0,
        pending: 0,
        error: 0
      };

      const recentUnintegrated = data
        .filter(p => p.integration_status !== 'integrated')
        .sort((a, b) => new Date(b.payroll_date).getTime() - new Date(a.payroll_date).getTime())
        .slice(0, 5);

      data.forEach(payroll => {
        statusCounts[payroll.integration_status as keyof typeof statusCounts]++;
      });

      return {
        statusCounts,
        recentUnintegrated,
        totalCount: data.length
      };
    },
    enabled: !!user,
  });
};