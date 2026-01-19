import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { Customer } from '@/types/customer';

interface EnhancedDeleteResult {
  success: boolean;
  message: string;
  customer_name: string;
  deleted_counts: {
    payment_schedules: number;
    vehicle_reports: number;
    invoice_items: number;
    payments: number;
    invoices: number;
    quotations: number;
    contracts: number;
    notes: number;
    customer_accounts: number;
  };
  execution_time_ms: number;
}

export const useOptimizedDeleteCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (customer: Customer): Promise<EnhancedDeleteResult> => {
      console.log('🚀 [OPTIMIZED_DELETE] Starting fast customer deletion:', customer.id);
      
      if (!companyId) {
        throw new Error("لا يمكن تحديد الشركة");
      }

      // استخدام الدالة المحسنة للحذف الشامل
      const { data, error } = await supabase.rpc('enhanced_delete_customer_and_relations', {
        target_customer_id: customer.id,
        target_company_id: companyId
      });

      if (error) {
        console.error('❌ [OPTIMIZED_DELETE] Database error:', error);
        throw new Error(`خطأ في حذف العميل: ${error.message}`);
      }

      const result = data as any;
      if (!result?.success) {
        console.error('❌ [OPTIMIZED_DELETE] Function error:', result?.error);
        throw new Error(result?.error || 'فشل في حذف العميل');
      }

      console.log('✅ [OPTIMIZED_DELETE] Customer deleted successfully:', result);
      return result as EnhancedDeleteResult;
    },

    onMutate: async (customer: Customer) => {
      console.log('🔄 [OPTIMIZED_DELETE] Applying optimistic update for:', customer.id);
      
      // Optimistic Update - إزالة العميل من القوائم فوراً
      const previousData = queryClient.getQueriesData({ queryKey: ['customers'] });
      
      queryClient.setQueriesData(
        { queryKey: ['customers'] },
        (oldData: Customer[] | undefined) => {
          if (!oldData) return [];
          
          // إزالة العميل من القائمة فوراً
          return oldData.filter(c => c.id !== customer.id);
        }
      );

      // إزالة بيانات العميل المفردة من الكاش
      queryClient.removeQueries({ queryKey: ['customer', customer.id] });
      
      return { previousData, customer };
    },

    onSuccess: async (data, customer, context) => {
      console.log('✅ [OPTIMIZED_DELETE] Success callback, refreshing related data');
      
      // تحديث البيانات المرتبطة بدون انتظار
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['quotations'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-notes'] })
      ]).catch(error => {
        console.warn('⚠️ [OPTIMIZED_DELETE] Error refreshing related data:', error);
      });

      // عرض رسالة نجاح مفصلة
      const customerName = data.customer_name;
      const executionTime = Math.round(data.execution_time_ms);
      
      toast.success(
        `تم حذف العميل "${customerName}" وجميع البيانات المرتبطة به بنجاح في ${executionTime}ms`,
        {
          description: `تم حذف: ${data.deleted_counts.contracts} عقد، ${data.deleted_counts.invoices} فاتورة، ${data.deleted_counts.payments} دفعة`
        }
      );
    },

    onError: (error, customer, context) => {
      console.error('❌ [OPTIMIZED_DELETE] Deletion failed, reverting optimistic update');
      
      // Rollback - إرجاع البيانات في حالة فشل الحذف
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      // إعادة تحميل البيانات للتأكد من التزامن
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      toast.error(`فشل في حذف العميل: ${error.message}`);
    },

    // تحسين الأداء
    retry: false, // لا نعيد المحاولة لتجنب التعطيل
    networkMode: 'online' // تنفيذ فقط عند الاتصال
  });
};

// Hook مساعد لحذف متعدد مع optimistic updates
export const useOptimizedBulkDeleteCustomers = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (customerIds: string[]) => {
      if (!companyId) {
        throw new Error("لا يمكن تحديد الشركة");
      }

      console.log('🚀 [BULK_OPTIMIZED_DELETE] Starting bulk deletion for', customerIds.length, 'customers');
      
      // تنفيذ الحذف بالتوازي (مجموعات صغيرة)
      const batchSize = 3;
      const results = [];
      
      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(customerId => 
          supabase.rpc('enhanced_delete_customer_and_relations', {
            target_customer_id: customerId,
            target_company_id: companyId
          })
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
      }
      
      return results;
    },

    onMutate: async (customerIds: string[]) => {
      console.log('🔄 [BULK_OPTIMIZED_DELETE] Applying bulk optimistic update');
      
      const previousData = queryClient.getQueriesData({ queryKey: ['customers'] });
      
      // إزالة جميع العملاء المحددين فوراً
      queryClient.setQueriesData(
        { queryKey: ['customers'] },
        (oldData: Customer[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(c => !customerIds.includes(c.id));
        }
      );

      return { previousData };
    },

    onSuccess: async () => {
      console.log('✅ [BULK_OPTIMIZED_DELETE] Bulk deletion successful');
      
      // تحديث شامل للبيانات المرتبطة
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] })
      ]);
      
      toast.success('تم حذف العملاء المحددين بنجاح');
    },

    onError: (error, customerIds, context) => {
      console.error('❌ [BULK_OPTIMIZED_DELETE] Bulk deletion failed');
      
      // Rollback في حالة الفشل
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.error(`فشل في حذف العملاء: ${error.message}`);
    }
  });
};