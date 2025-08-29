import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';

export const useCustomersRealtime = () => {
  const queryClient = useQueryClient();
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  useEffect(() => {
    if (!companyId) return;

    console.log('🔄 Setting up real-time subscription for customers in company:', companyId);

    const channel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customers',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('✅ Real-time: Customer inserted', payload.new);
          
          // استخدام refetchQueries بدلاً من invalidateQueries لضمان التحديث الفوري
          queryClient.refetchQueries({ queryKey: ['customers'] });
          
          // إظهار رسالة للمستخدم
          const customerName = payload.new.customer_type === 'individual' 
            ? `${payload.new.first_name} ${payload.new.last_name}`
            : payload.new.company_name;
          
          toast.success(`تم إضافة العميل "${customerName}" بنجاح`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('📝 Real-time: Customer updated', payload.new);
          
          // تحديث الـ cache للعميل المُحدث
          queryClient.setQueryData(
            getQueryKey(['customer'], [payload.new.id]),
            payload.new
          );
          
          // إعادة جلب قائمة العملاء
          queryClient.refetchQueries({ queryKey: ['customers'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'customers',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('🗑️ Real-time: Customer deleted', payload.old);
          
          // إزالة العميل من الـ cache
          queryClient.removeQueries({
            queryKey: getQueryKey(['customer'], [payload.old.id])
          });
          
          // إعادة جلب قائمة العملاء
          queryClient.refetchQueries({ queryKey: ['customers'] });
          
          const customerName = payload.old.customer_type === 'individual' 
            ? `${payload.old.first_name} ${payload.old.last_name}`
            : payload.old.company_name;
          
          toast.success(`تم حذف العميل "${customerName}" بنجاح`);
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from customers real-time updates');
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient, getQueryKey]);
};