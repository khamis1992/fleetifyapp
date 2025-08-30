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
          
          // تحديث فوري للـ cache
          queryClient.setQueriesData(
            { queryKey: ['customers'] },
            (oldData: any) => {
              if (!oldData) return [payload.new];
              
              // التحقق من عدم وجود العميل مسبقاً لتجنب التكرار
              const exists = oldData.some((customer: any) => customer.id === payload.new.id);
              if (exists) {
                console.log('📋 Real-time: Customer already exists in cache, skipping update');
                return oldData;
              }
              
              // إضافة العميل الجديد في بداية القائمة
              console.log('📋 Real-time: Adding customer to cache', payload.new.id);
              return [payload.new, ...oldData];
            }
          );
          
          // عدم إظهار toast من Real-time لتجنب التكرار مع onSuccess
          console.log('📡 Real-time update processed for customer:', payload.new.id);
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
          
          // تحديث فوري للـ cache
          queryClient.setQueriesData(
            { queryKey: ['customers'] },
            (oldData: any) => {
              if (!oldData) return oldData;
              
              // تحديث العميل الموجود في القائمة
              return oldData.map((customer: any) => 
                customer.id === payload.new.id ? { ...customer, ...payload.new } : customer
              );
            }
          );
          
          // تحديث الـ cache للعميل المُحدث
          queryClient.setQueryData(
            getQueryKey(['customer'], [payload.new.id]),
            payload.new
          );
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
          queryClient.setQueriesData(
            { queryKey: ['customers'] },
            (oldData: any) => {
              if (!oldData) return oldData;
              
              // إزالة العميل من القائمة
              return oldData.filter((customer: any) => customer.id !== payload.old.id);
            }
          );
          
          // إزالة العميل من الـ cache الفردي
          queryClient.removeQueries({
            queryKey: getQueryKey(['customer'], [payload.old.id])
          });
          
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