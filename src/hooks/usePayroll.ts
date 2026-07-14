import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSystemLogger } from "@/hooks/useSystemLogger";
import type { Database } from "@/integrations/supabase/types";

type PayrollRow = Database['public']['Tables']['payroll']['Row'];
type PayrollUpdate = Database['public']['Tables']['payroll']['Update'];
type PayrollStatus = 'draft' | 'approved' | 'paid';

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

const normalizePayrollRecord = (payroll: PayrollRow): PayrollRecord => ({
  ...payroll,
  allowances: Number(payroll.allowances) || 0,
  overtime_amount: Number(payroll.overtime_amount) || 0,
  deductions: Number(payroll.deductions) || 0,
  tax_amount: Number(payroll.tax_amount) || 0,
  bank_account: payroll.bank_account ?? undefined,
  notes: payroll.notes ?? undefined,
  journal_entry_id: payroll.journal_entry_id ?? undefined,
  created_by: payroll.created_by ?? undefined,
  status: payroll.status as PayrollStatus,
  payment_method: payroll.payment_method || 'bank_transfer',
});

// Custom hooks
export function usePayrollRecords(filters?: {
  employee_id?: string;
  status?: string;
  period_start?: string;
  period_end?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payroll-records', user?.profile?.company_id, filters],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      // First, get payroll records
      let payrollQuery = supabase
        .from('payroll')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false });

      if (filters?.employee_id) {
        payrollQuery = payrollQuery.eq('employee_id', filters.employee_id);
      }
      if (filters?.status) {
        payrollQuery = payrollQuery.eq('status', filters.status);
      }
      if (filters?.period_start) {
        payrollQuery = payrollQuery.gte('pay_period_start', filters.period_start);
      }
      if (filters?.period_end) {
        payrollQuery = payrollQuery.lte('pay_period_end', filters.period_end);
      }

      const { data: payrollData, error: payrollError } = await payrollQuery;
      if (payrollError) throw payrollError;

      if (!payrollData || payrollData.length === 0) {
        return [];
      }

      // Get unique employee IDs
      const employeeIds = [...new Set(payrollData.map(p => p.employee_id))];

      // Fetch employee details
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
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
        `)
        .in('id', employeeIds);

      if (employeesError) throw employeesError;

      // Create a map for quick employee lookup
      const employeeMap = new Map(
        (employeesData || []).map(emp => [emp.id, emp])
      );

      // Combine payroll and employee data
      return payrollData.map(payroll => {
        const employee = employeeMap.get(payroll.employee_id);

        return {
          ...normalizePayrollRecord(payroll),
          employee: employee
            ? {
                ...employee,
                first_name_ar: employee.first_name_ar ?? undefined,
                last_name_ar: employee.last_name_ar ?? undefined,
                position: employee.position ?? undefined,
                department: employee.department ?? undefined,
                allowances: Number(employee.allowances) || 0,
                bank_account: employee.bank_account ?? undefined,
                iban: employee.iban ?? undefined,
              }
            : undefined,
        };
      });
    },
    enabled: !!user?.profile?.company_id,
  });
}

export function usePayrollReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payroll-reviews', user?.profile?.company_id],
    queryFn: async () => {
      const companyId = user?.profile?.company_id;
      if (!companyId) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('payroll_reviews')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PayrollReview[];
    },
    enabled: !!user?.profile?.company_id,
  });
}

export function useEmployeePayrollHistory(employeeId: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['employee-payroll-history', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .order('pay_period_start', { ascending: false });

      if (error) throw error;
      return (data || []).map(normalizePayrollRecord);
    },
    enabled: !!companyId && !!employeeId,
  });
}

export function useCreatePayroll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useSystemLogger();

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
      
      // Log the payroll creation
      log.info('hr', 'create', `تم إنشاء راتب جديد برقم ${payrollNumber}`, {
        resource_type: 'payroll',
        resource_id: data.id,
        metadata: {
          payroll_number: payrollNumber,
          employee_id: payrollData.employee_id,
          net_amount
        }
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast.success('تم إنشاء مسودة راتب الموظف بنجاح');
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء الراتب: ${error.message}`);
    },
  });
}

export function useUpdatePayrollStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PayrollStatus }) => {
      const companyId = user?.profile?.company_id;
      if (!companyId) throw new Error('Company not found');
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('transition_payroll_status_v1', {
        p_company_id: companyId,
        p_payroll_id: id,
        p_target_status: status,
        p_actor_id: user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      
      const statusMessages = {
        approved: 'تم اعتماد الراتب بنجاح',
        paid: 'تم تأكيد دفع الراتب بنجاح',
      };
      
      const message = statusMessages[variables.status as keyof typeof statusMessages] || 'تم تحديث حالة الراتب بنجاح';
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث حالة الراتب: ${error.message}`);
    },
  });
}

export function useUpdatePayroll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreatePayrollData> }) => {
      const companyId = user?.profile?.company_id;
      if (!companyId) throw new Error('Company not found');

      const { data: currentPayroll, error: currentError } = await supabase
        .from('payroll')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      if (currentError) throw currentError;
      if (currentPayroll.status !== 'draft' || currentPayroll.journal_entry_id) {
        throw new Error('لا يمكن تعديل الراتب بعد اعتماده أو ربطه بقيد محاسبي');
      }

      const hasOvertimeInput = updates.overtime_hours !== undefined || updates.overtime_rate !== undefined;
      if (hasOvertimeInput && (updates.overtime_hours === undefined || updates.overtime_rate === undefined)) {
        throw new Error('يجب إرسال ساعات العمل الإضافي وسعر الساعة معًا');
      }

      const basicSalary = updates.basic_salary ?? currentPayroll.basic_salary;
      const allowances = updates.allowances ?? Number(currentPayroll.allowances || 0);
      const overtimeAmount = hasOvertimeInput
        ? (updates.overtime_hours || 0) * (updates.overtime_rate || 0)
        : Number(currentPayroll.overtime_amount || 0);
      const deductions = updates.deductions ?? Number(currentPayroll.deductions || 0);
      const taxAmount = updates.tax_amount ?? Number(currentPayroll.tax_amount || 0);
      const netAmount = basicSalary + allowances + overtimeAmount - deductions - taxAmount;
      if (netAmount < 0) throw new Error('صافي الراتب لا يمكن أن يكون سالبًا');

      const updateData: PayrollUpdate = {
        employee_id: updates.employee_id,
        pay_period_start: updates.pay_period_start,
        pay_period_end: updates.pay_period_end,
        basic_salary: updates.basic_salary,
        allowances: updates.allowances,
        overtime_amount: overtimeAmount,
        deductions: updates.deductions,
        tax_amount: updates.tax_amount,
        net_amount: netAmount,
        payment_method: updates.payment_method,
        bank_account: updates.bank_account,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('payroll')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', companyId)
        .eq('status', 'draft')
        .is('journal_entry_id', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast.success('تم تحديث الراتب بنجاح');
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث الراتب: ${error.message}`);
    },
  });
}

export function useDeletePayroll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payrollId: string) => {
      const companyId = user?.profile?.company_id;
      if (!companyId) throw new Error('Company not found');

      const { data: payroll, error: payrollError } = await supabase
        .from('payroll')
        .select('status,journal_entry_id')
        .eq('id', payrollId)
        .eq('company_id', companyId)
        .single();
      if (payrollError) throw payrollError;
      if (payroll.status !== 'draft' || payroll.journal_entry_id) {
        throw new Error('لا يمكن حذف راتب معتمد أو مدفوع أو مرتبط بقيد محاسبي');
      }

      const { error } = await supabase
        .from('payroll')
        .delete()
        .eq('id', payrollId)
        .eq('company_id', companyId)
        .eq('status', 'draft')
        .is('journal_entry_id', null)
        .select('id')
        .single();

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
      const total_amount = payrolls.reduce(
        (sum, p) => sum + p.basic_salary + Number(p.allowances || 0) + Number(p.overtime_amount || 0),
        0
      );
      const total_deductions = payrolls.reduce(
        (sum, p) => sum + Number(p.deductions || 0) + Number(p.tax_amount || 0),
        0
      );
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
