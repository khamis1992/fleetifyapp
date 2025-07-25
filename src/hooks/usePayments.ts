import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Payment {
  id: string;
  company_id: string;
  payment_number: string;
  payment_date: string;
  payment_type: 'receipt' | 'payment';
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'card';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled';
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  cost_center_id?: string;
  bank_id?: string;
  reference_number?: string;
  check_number?: string;
  bank_account?: string;
  notes?: string;
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const usePayments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // الحصول على company_id من profile المستخدم
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      return data as Payment[];
    },
    enabled: !!user?.id,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({
        title: "تم إنشاء الدفع بنجاح",
        description: "تم إضافة الدفع الجديد وإنشاء القيد المحاسبي.",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء الدفع",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({
        title: "تم تحديث الدفع بنجاح",
        description: "تم حفظ التغييرات بنجاح.",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث الدفع",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({
        title: "تم حذف الدفع بنجاح",
        description: "تم حذف الدفع من النظام.",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف الدفع",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};