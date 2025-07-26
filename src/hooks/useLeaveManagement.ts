import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Types
export interface LeaveType {
  id: string;
  company_id: string;
  type_name: string;
  type_name_ar?: string;
  description?: string;
  max_days_per_year: number;
  requires_approval: boolean;
  is_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  year: number;
  leave_types?: LeaveType;
  employees?: {
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
  };
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  applied_date: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  emergency_contact?: string;
  covering_employee_id?: string;
  attachment_url?: string;
  leave_types?: LeaveType;
  employees?: {
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
    employee_number: string;
    department?: string;
  };
  covering_employee?: {
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
  };
  reviewer?: {
    first_name: string;
    last_name: string;
  };
}

export const useLeaveTypes = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["leave-types", user?.profile?.company_id],
    queryFn: async () => {
      // الحصول على company_id من المستخدم الحالي
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('المستخدم غير مسجل الدخول');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', currentUser.user.id)
        .single();
      
      if (!profile) throw new Error('لم يتم العثور على بيانات المستخدم');

      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("type_name");

      if (error) throw error;
      return data as LeaveType[];
    },
    enabled: !!user?.profile?.company_id
  });
};

export const useLeaveBalances = (employeeId?: string) => {
  return useQuery({
    queryKey: ["leave-balances", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("leave_balances")
        .select(`
          *,
          leave_types(*),
          employees(first_name, last_name, first_name_ar, last_name_ar)
        `)
        .eq("year", new Date().getFullYear());

      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
  });
};

export const useLeaveRequests = (status?: string, employeeId?: string) => {
  return useQuery({
    queryKey: ["leave-requests", status, employeeId],
    queryFn: async () => {
      let query = supabase
        .from("leave_requests")
        .select(`
          *,
          leave_types(*),
          employees(first_name, last_name, first_name_ar, last_name_ar, employee_number, department),
          covering_employee:employees!covering_employee_id(first_name, last_name, first_name_ar, last_name_ar),
          reviewer:employees!reviewed_by(first_name, last_name)
        `);

      if (status) {
        query = query.eq("status", status);
      }

      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query.order("applied_date", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });
};

export const useSubmitLeaveRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: any) => {
      const { data, error } = await supabase
        .from("leave_requests")
        .insert(request)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast({
        title: "تم تقديم طلب الإجازة",
        description: "سيتم مراجعة طلبك من قبل المدير المختص",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تقديم الطلب",
        description: "حدث خطأ أثناء تقديم طلب الإجازة",
        variant: "destructive",
      });
      console.error("Leave request submission error:", error);
    },
  });
};

export const useReviewLeaveRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      action,
      notes,
    }: {
      requestId: string;
      action: 'approved' | 'rejected';
      notes?: string;
    }) => {
      const { data: request, error: fetchError } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from("leave_requests")
        .update({
          status: action,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;

      // Update leave balance if approved
      if (action === 'approved') {
        // Get current balance
        const { data: currentBalance, error: balanceError } = await supabase
          .from("leave_balances")
          .select("used_days, remaining_days")
          .eq("employee_id", request.employee_id)
          .eq("leave_type_id", request.leave_type_id)
          .eq("year", new Date().getFullYear())
          .single();

        if (balanceError) throw balanceError;

        // Update balance
        const { error: updateError } = await supabase
          .from("leave_balances")
          .update({
            used_days: currentBalance.used_days + request.total_days,
            remaining_days: currentBalance.remaining_days - request.total_days,
          })
          .eq("employee_id", request.employee_id)
          .eq("leave_type_id", request.leave_type_id)
          .eq("year", new Date().getFullYear());

        if (updateError) throw updateError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      
      const actionText = variables.action === 'approved' ? 'تمت الموافقة' : 'تم الرفض';
      toast({
        title: `${actionText} على طلب الإجازة`,
        description: `تم ${actionText} على الطلب بنجاح`,
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في مراجعة الطلب",
        description: "حدث خطأ أثناء مراجعة طلب الإجازة",
        variant: "destructive",
      });
      console.error("Leave request review error:", error);
    },
  });
};

export const useInitializeLeaveBalances = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase.rpc('initialize_employee_leave_balances', {
        employee_id_param: employeeId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast({
        title: "تم تهيئة أرصدة الإجازات",
        description: "تم إنشاء أرصدة الإجازات للموظف بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تهيئة الأرصدة",
        description: "حدث خطأ أثناء تهيئة أرصدة الإجازات",
        variant: "destructive",
      });
      console.error("Leave balance initialization error:", error);
    },
  });
};