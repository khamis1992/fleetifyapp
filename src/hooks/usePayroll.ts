import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types
export interface PayrollRecord {
  id: string;
  employee_id: string;
  company_id: string;
  payroll_number: string;
  payroll_date: string;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  allowances: number;
  overtime_amount: number;
  deductions: number;
  tax_amount: number;
  net_amount: number;
  status: 'draft' | 'approved' | 'paid';
  payment_method: string;
  bank_account?: string;
  notes?: string;
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    employee_number: string;
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
    position?: string;
    department?: string;
    basic_salary: number;
    allowances: number;
    bank_account?: string;
    iban?: string;
  };
}

export interface PayrollReview {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  total_employees: number;
  total_amount: number;
  total_deductions: number;
  net_amount: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid';
  notes?: string;
  created_by?: string;
  approved_by?: string;
  reviewed_by?: string;
  journal_entry_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePayrollData {
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  allowances?: number;
  overtime_hours?: number;
  overtime_rate?: number;
  deductions?: number;
  tax_amount?: number;
  payment_method: string;
  bank_account?: string;
  notes?: string;
}

// Custom hooks
export function usePayrollRecords(filters?: {
  employee_id?: string;
  status?: string;
  period_start?: string;
  period_end?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payroll-records', filters],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('payroll')
        .select(`
          *,
          employee:employees!inner(
            id,
            employee_number,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            position,
            department,
            basic_salary,
            allowances,
            bank_account,
            iban
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.period_start) {
        query = query.gte('pay_period_start', filters.period_start);
      }
      if (filters?.period_end) {
        query = query.lte('pay_period_end', filters.period_end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function usePayrollReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payroll-reviews'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('payroll_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PayrollReview[];
    },
    enabled: !!user,
  });
}

export function useEmployeePayrollHistory(employeeId: string) {
  return useQuery({
    queryKey: ['employee-payroll-history', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', employeeId)
        .order('pay_period_start', { ascending: false });

      if (error) throw error;
      return data as PayrollRecord[];
    },
    enabled: !!employeeId,
  });
}

export function useCreatePayroll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payrollData: CreatePayrollData) => {
      if (!user) throw new Error('User not authenticated');

      // Get company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Generate payroll number
      const currentYear = new Date().getFullYear();
      const { data: existingPayrolls } = await supabase
        .from('payroll')
        .select('payroll_number')
        .eq('company_id', profile.company_id)
        .like('payroll_number', `PAY-${currentYear}-%`);

      const nextNumber = (existingPayrolls?.length || 0) + 1;
      const payrollNumber = `PAY-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

      // Calculate overtime amount
      const overtime_amount = (payrollData.overtime_hours || 0) * (payrollData.overtime_rate || 0);

      // Calculate net amount
      const gross_amount = payrollData.basic_salary + (payrollData.allowances || 0) + overtime_amount;
      const total_deductions = (payrollData.deductions || 0) + (payrollData.tax_amount || 0);
      const net_amount = gross_amount - total_deductions;

      const { data, error } = await supabase
        .from('payroll')
        .insert({
          employee_id: payrollData.employee_id,
          company_id: profile.company_id,
          payroll_number: payrollNumber,
          payroll_date: new Date().toISOString().split('T')[0],
          pay_period_start: payrollData.pay_period_start,
          pay_period_end: payrollData.pay_period_end,
          basic_salary: payrollData.basic_salary,
          allowances: payrollData.allowances || 0,
          overtime_amount,
          deductions: payrollData.deductions || 0,
          tax_amount: payrollData.tax_amount || 0,
          net_amount,
          status: 'draft',
          payment_method: payrollData.payment_method,
          bank_account: payrollData.bank_account,
          notes: payrollData.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast.success('تم إنشاء راتب الموظف بنجاح');
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء الراتب: ${error.message}`);
    },
  });
}

export function useUpdatePayrollStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payrollId, status }: { payrollId: string; status: string }) => {
      const { data, error } = await supabase
        .from('payroll')
        .update({ status })
        .eq('id', payrollId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast.success('تم تحديث حالة الراتب بنجاح');
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث حالة الراتب: ${error.message}`);
    },
  });
}

export function useDeletePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payrollId: string) => {
      const { error } = await supabase
        .from('payroll')
        .delete()
        .eq('id', payrollId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast.success('تم حذف الراتب بنجاح');
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حذف الراتب: ${error.message}`);
    },
  });
}

export function useCreatePayrollReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      period_start, 
      period_end, 
      notes 
    }: { 
      period_start: string; 
      period_end: string; 
      notes?: string; 
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Get payroll records for the period
      const { data: payrolls } = await supabase
        .from('payroll')
        .select('*')
        .eq('company_id', profile.company_id)
        .gte('pay_period_start', period_start)
        .lte('pay_period_end', period_end)
        .eq('status', 'approved');

      if (!payrolls || payrolls.length === 0) {
        throw new Error('لا توجد رواتب معتمدة في هذه الفترة');
      }

      const total_employees = payrolls.length;
      const total_amount = payrolls.reduce((sum, p) => sum + (p.basic_salary + p.allowances + p.overtime_amount), 0);
      const total_deductions = payrolls.reduce((sum, p) => sum + (p.deductions + p.tax_amount), 0);
      const net_amount = payrolls.reduce((sum, p) => sum + p.net_amount, 0);

      const { data, error } = await supabase
        .from('payroll_reviews')
        .insert({
          company_id: profile.company_id,
          period_start,
          period_end,
          total_employees,
          total_amount,
          total_deductions,
          net_amount,
          status: 'draft',
          notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-reviews'] });
      toast.success('تم إنشاء مراجعة الرواتب بنجاح');
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء مراجعة الرواتب: ${error.message}`);
    },
  });
}