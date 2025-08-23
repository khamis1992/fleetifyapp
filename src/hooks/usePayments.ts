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
  onlyUnlinked?: boolean;
  payment_date_gte?: string;
  payment_date_lte?: string;
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
      if (filters?.onlyUnlinked) {
        query = query.is("invoice_id", null).is("contract_id", null);
      }
      if (filters?.payment_date_gte) {
        query = query.gte("payment_date", filters.payment_date_gte);
      }
      if (filters?.payment_date_lte) {
        query = query.lte("payment_date", filters.payment_date_lte);
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

interface BulkDeleteOptions {
  deleteAll?: boolean;
  onlyUnlinked?: boolean;
  startDate?: string;
  endDate?: string;
  paymentType?: string;
  paymentMethod?: string;
}

export const useBulkDeletePayments = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (options: BulkDeleteOptions = {}) => {
      if (!user?.profile?.company_id) {
        throw new Error("Company ID is required");
      }
      
      console.log("🔧 [BULK_DELETE] بدء عملية الحذف مع الخيارات:", options);
      console.log("🔧 [BULK_DELETE] company_id من user.profile:", user.profile.company_id);
      console.log("🔧 [BULK_DELETE] معلومات المستخدم:", {
        userId: user.id,
        email: user.email,
        companyId: user.profile.company_id
      });
      
      // Build query to get payments to delete
      let query = supabase
        .from("payments")
        .select("*")
        .eq("company_id", user.profile.company_id);
      
      console.log("🔧 [BULK_DELETE] استعلام أساسي مبني للشركة:", user.profile.company_id);
      
      // Handle deleteAll - ignore all filters when true
      if (options.deleteAll) {
        console.log("🔥 [BULK_DELETE] وضع حذف الكل مفعل - تجاهل جميع الفلاتر");
      } else {
        // Apply filters only if deleteAll is not true
        if (options.onlyUnlinked) {
          query = query.is("invoice_id", null).is("contract_id", null);
          console.log("🔍 تطبيق فلتر: المدفوعات غير المربوطة فقط");
        }
        
        if (options.startDate) {
          query = query.gte("payment_date", options.startDate);
          console.log(`🔍 تطبيق فلتر: من تاريخ ${options.startDate}`);
        }
        
        if (options.endDate) {
          query = query.lte("payment_date", options.endDate);
          console.log(`🔍 تطبيق فلتر: إلى تاريخ ${options.endDate}`);
        }
        
        if (options.paymentType && options.paymentType !== 'all') {
          query = query.eq("payment_type", options.paymentType);
          console.log(`🔍 تطبيق فلتر: نوع الدفع ${options.paymentType}`);
        }
        
        if (options.paymentMethod && options.paymentMethod !== 'all') {
          query = query.eq("payment_method", options.paymentMethod);
          console.log(`🔍 تطبيق فلتر: طريقة الدفع ${options.paymentMethod}`);
        }
      }
      
      // Log filtering status
      const hasFilters = !options.deleteAll && (options.onlyUnlinked || options.startDate || options.endDate || 
                        (options.paymentType && options.paymentType !== 'all') || 
                        (options.paymentMethod && options.paymentMethod !== 'all'));
      
      if (options.deleteAll) {
        console.log("🔥 [BULK_DELETE] سيتم حذف جميع المدفوعات للشركة (بدون استثناء)");
      } else if (!hasFilters) {
        console.log("⚠️ لا توجد فلاتر مطبقة - سيتم حذف جميع المدفوعات للشركة");
      } else {
        console.log("✅ فلاتر مطبقة - سيتم حذف المدفوعات المطابقة فقط");
      }
      
      const { data: paymentsToDelete, error: fetchError } = await query;
      
      console.log("🔧 [BULK_DELETE] نتيجة الاستعلام:", {
        paymentsFound: paymentsToDelete?.length || 0,
        error: fetchError,
        firstPayment: paymentsToDelete?.[0] ? {
          id: paymentsToDelete[0].id,
          company_id: paymentsToDelete[0].company_id,
          payment_number: paymentsToDelete[0].payment_number
        } : null
      });
      
      if (fetchError) {
        console.error("❌ [BULK_DELETE] خطأ في الاستعلام:", fetchError);
        throw fetchError;
      }
      
      if (!paymentsToDelete || paymentsToDelete.length === 0) {
        console.log("⚠️ [BULK_DELETE] لم يتم العثور على مدفوعات للحذف");
        console.log("🔍 [BULK_DELETE] تحقق من company_id:", user.profile.company_id);
        
        // Let's also check if there are ANY payments in the database for debugging
        const { data: allPayments, error: checkError } = await supabase
          .from("payments")
          .select("company_id, count")
          .eq("company_id", user.profile.company_id);
        
        console.log("🔍 [BULK_DELETE] فحص إجمالي المدفوعات للشركة:", {
          totalPayments: allPayments?.length || 0,
          checkError
        });
        
        return { deletedCount: 0, processedInvoices: 0 };
      }
      
      let processedInvoices = 0;
      const invoicesToUpdate = new Map();
      
      // Process linked invoices first
      for (const payment of paymentsToDelete) {
        if (payment.invoice_id) {
          if (!invoicesToUpdate.has(payment.invoice_id)) {
            const { data: invoice, error: invoiceError } = await supabase
              .from("invoices")
              .select("total_amount, paid_amount")
              .eq("id", payment.invoice_id)
              .single();
              
            if (!invoiceError && invoice) {
              invoicesToUpdate.set(payment.invoice_id, {
                ...invoice,
                paymentsToReverse: []
              });
            }
          }
          
          if (invoicesToUpdate.has(payment.invoice_id)) {
            invoicesToUpdate.get(payment.invoice_id).paymentsToReverse.push(payment.amount);
          }
        }
      }
      
      // Update invoices
      for (const [invoiceId, invoiceData] of invoicesToUpdate) {
        const totalToReverse = invoiceData.paymentsToReverse.reduce((sum: number, amount: number) => sum + amount, 0);
        const newPaidAmount = Math.max(0, (invoiceData.paid_amount || 0) - totalToReverse);
        const newBalanceDue = (invoiceData.total_amount || 0) - newPaidAmount;
        
        let newPaymentStatus: 'unpaid' | 'partial' | 'paid';
        if (newPaidAmount >= (invoiceData.total_amount || 0)) {
          newPaymentStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newPaymentStatus = 'partial';
        } else {
          newPaymentStatus = 'unpaid';
        }
        
        await supabase
          .from("invoices")
          .update({
            paid_amount: newPaidAmount,
            balance_due: Math.max(0, newBalanceDue),
            payment_status: newPaymentStatus
          })
          .eq("id", invoiceId);
          
        processedInvoices++;
      }
      
      // Delete payments in batches
      const batchSize = 100;
      let deletedCount = 0;
      const totalToDelete = paymentsToDelete.length;
      
      console.log(`🗑️ بدء حذف ${totalToDelete} مدفوع على ${Math.ceil(totalToDelete / batchSize)} دفعة`);
      
      for (let i = 0; i < paymentsToDelete.length; i += batchSize) {
        const batch = paymentsToDelete.slice(i, i + batchSize);
        const ids = batch.map(p => p.id);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(totalToDelete / batchSize);
        
        console.log(`🔄 معالجة الدفعة ${batchNumber}/${totalBatches} (${batch.length} مدفوع)`);
        
        const { error: deleteError, count } = await supabase
          .from("payments")
          .delete({ count: 'exact' })
          .in("id", ids)
          .eq("company_id", user.profile.company_id);
        
        if (deleteError) {
          console.error(`❌ خطأ في حذف الدفعة ${batchNumber}:`, deleteError);
          throw deleteError;
        }
        
        const actualDeleted = count || batch.length;
        deletedCount += actualDeleted;
        console.log(`✅ تم حذف ${actualDeleted} مدفوع من الدفعة ${batchNumber}`);
      }
      
      console.log(`🎉 تم الانتهاء من حذف ${deletedCount} مدفوع من أصل ${totalToDelete}`);
      
      return { deletedCount, processedInvoices };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "تم حذف المدفوعات بنجاح",
        description: `تم حذف ${result.deletedCount} دفع وتحديث ${result.processedInvoices} فاتورة`,
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف المدفوعات",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};