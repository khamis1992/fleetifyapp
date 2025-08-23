import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  company_id: string;
  payment_type: 'receipt' | 'payment';
  payment_method: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  contract_id?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled';
  late_fine_amount?: number;
  late_fine_status?: 'none' | 'paid' | 'waived' | 'pending';
  late_fine_type?: 'none' | 'separate_payment' | 'included_with_payment' | 'waived';
  late_fine_waiver_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface CreatePaymentData {
  payment_type: 'receipt' | 'payment';
  payment_method: string;
  amount: number;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  contract_id?: string;
  late_fine_amount?: number;
  late_fine_status?: 'none' | 'paid' | 'waived' | 'pending';
  late_fine_type?: 'none' | 'separate_payment' | 'included_with_payment' | 'waived';
  late_fine_waiver_reason?: string;
}

export const usePayments = (filters?: { 
  method?: string; 
  status?: string; 
  type?: string;
  customer_id?: string;
  invoice_id?: string;
}) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["payments", user?.profile?.company_id, filters],
    queryFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required");
      
      let query = supabase
        .from("payments")
        .select(`
          *,
          customers (
            first_name,
            last_name,
            company_name,
            customer_type
          ),
          vendors (
            vendor_name
          ),
          invoices (
            invoice_number,
            total_amount
          ),
          contracts (
            contract_number
          )
        `)
        .eq("company_id", user.profile.company_id)
        .order("payment_date", { ascending: false });
      
      if (filters?.method) {
        query = query.eq("payment_method", filters.method);
      }
      if (filters?.status) {
        query = query.eq("payment_status", filters.status);
      }
      if (filters?.type) {
        query = query.eq("payment_type", filters.type);
      }
      if (filters?.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }
      if (filters?.invoice_id) {
        query = query.eq("invoice_id", filters.invoice_id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user?.profile?.company_id
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (paymentData: CreatePaymentData) => {
      if (!user?.profile?.company_id || !user?.id) {
        throw new Error("User data is required");
      }
      
      // Generate payment number
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("payment_number")
        .eq("company_id", user.profile.company_id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      let newNumber = 1;
      if (existingPayments && existingPayments.length > 0) {
        const lastNumber = existingPayments[0]?.payment_number || "PAY-0000";
        const numberPart = lastNumber.split('-')[1];
        newNumber = parseInt(numberPart) + 1;
      }
      const paymentNumber = `PAY-${newNumber.toString().padStart(4, '0')}`;
      
      // Start transaction
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          ...paymentData,
          payment_number: paymentNumber,
          company_id: user.profile.company_id,
          payment_status: 'completed',
          created_by: user.id
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      // If this is a payment for an invoice, update the invoice
      if (paymentData.invoice_id) {
        // Get current invoice data
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .select("total_amount, paid_amount, balance_due")
          .eq("id", paymentData.invoice_id)
          .single();
          
        if (invoiceError) throw invoiceError;
        
        const newPaidAmount = (invoice.paid_amount || 0) + paymentData.amount;
        const newBalanceDue = (invoice.total_amount || 0) - newPaidAmount;
        
        let newPaymentStatus: 'unpaid' | 'partial' | 'paid';
        if (newPaidAmount >= (invoice.total_amount || 0)) {
          newPaymentStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newPaymentStatus = 'partial';
        } else {
          newPaymentStatus = 'unpaid';
        }
        
        // Update invoice
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            paid_amount: newPaidAmount,
            balance_due: Math.max(0, newBalanceDue),
            payment_status: newPaymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", paymentData.invoice_id);
          
        if (updateError) throw updateError;
      }
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "تم تسجيل الدفع بنجاح",
        description: "تم تحديث حالة الفاتورة",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تسجيل الدفع",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      paymentId, 
      paymentData 
    }: {
      paymentId: string;
      paymentData: Partial<CreatePaymentData> & { payment_status?: string; };
    }) => {
      if (!user?.profile?.company_id) {
        throw new Error("Company ID is required");
      }
      
      const { data, error } = await supabase
        .from("payments")
        .update({
          ...paymentData,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentId)
        .eq("company_id", user.profile.company_id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "تم تحديث الدفع بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث الدفع",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      if (!user?.profile?.company_id) {
        throw new Error("Company ID is required");
      }
      
      // Get payment data first to reverse invoice changes
      const { data: payment, error: fetchError } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .eq("company_id", user.profile.company_id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // If payment was linked to an invoice, reverse the payment
      if (payment.invoice_id) {
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .select("total_amount, paid_amount")
          .eq("id", payment.invoice_id)
          .single();
          
        if (invoiceError) throw invoiceError;
        
        const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - payment.amount);
        const newBalanceDue = (invoice.total_amount || 0) - newPaidAmount;
        
        let newPaymentStatus: 'unpaid' | 'partial' | 'paid';
        if (newPaidAmount >= (invoice.total_amount || 0)) {
          newPaymentStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newPaymentStatus = 'partial';
        } else {
          newPaymentStatus = 'unpaid';
        }
        
        // Update invoice
        await supabase
          .from("invoices")
          .update({
            paid_amount: newPaidAmount,
            balance_due: Math.max(0, newBalanceDue),
            payment_status: newPaymentStatus
          })
          .eq("id", payment.invoice_id);
      }
      
      // Delete the payment
      const { error: deleteError } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId)
        .eq("company_id", user.profile.company_id);
      
      if (deleteError) throw deleteError;
      
      return paymentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "تم حذف الدفع بنجاح",
        description: "تم تحديث حالة الفاتورة",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف الدفع",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};