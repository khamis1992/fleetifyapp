import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { useCustomerCacheManager } from './useCustomerCacheManager';

export const useCustomersRealtime = () => {
  const queryClient = useQueryClient();
  const { companyId, isSystemLevel } = useUnifiedCompanyAccess();
  const { refreshCustomerCache, updateCustomerInCache, removeCustomerFromCache } = useCustomerCacheManager();

  useEffect(() => {
    if (!companyId) return;

    console.log('📡 [REALTIME] Setting up customers subscription:', {
      companyId,
      isSystemLevel,
      timestamp: new Date().toISOString()
    });

    // Create channel with unique name
    const channel = supabase
      .channel('customers-realtime-v3', {
        config: {
          broadcast: { self: true },
          presence: { key: 'customers' }
        }
      });

    // Subscription config based on user level
    const subscriptionConfig = {
      event: '*' as const,
      schema: 'public' as const,
      table: 'customers' as const,
      ...(isSystemLevel ? {} : { filter: `company_id=eq.${companyId}` })
    };

    console.log('📡 [REALTIME] Subscription config:', subscriptionConfig);

    channel
      .on('postgres_changes', subscriptionConfig, (payload) => {
        console.log('🔔 [REALTIME] Customer event received:', {
          eventType: payload.eventType,
          recordId: (payload.new as any)?.id || (payload.old as any)?.id,
          timestamp: new Date().toISOString()
        });

        try {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          switch (eventType) {
            case 'INSERT':
              console.log('✅ [REALTIME] Processing INSERT');
              handleCustomerInsert(newRecord, refreshCustomerCache);
              break;
            case 'UPDATE':
              console.log('✅ [REALTIME] Processing UPDATE');
              handleCustomerUpdate(newRecord, updateCustomerInCache);
              break;
            case 'DELETE':
              console.log('✅ [REALTIME] Processing DELETE');
              handleCustomerDelete(oldRecord, removeCustomerFromCache);
              break;
          }
        } catch (error) {
          console.error('❌ [REALTIME] Error processing event:', error);
          // Enhanced fallback with delay using cache manager
          setTimeout(() => {
            console.log('🔄 [REALTIME] Fallback: Refreshing customer cache');
            refreshCustomerCache();
          }, 2000);
        }
      })
      .subscribe((status) => {
        console.log('📡 [REALTIME] Subscription status:', {
          status,
          timestamp: new Date().toISOString(),
          companyId
        });
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Customers subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Subscription error - fallback initiated');
          refreshCustomerCache();
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [REALTIME] Subscription timed out - retrying');
          setTimeout(() => {
            refreshCustomerCache();
          }, 3000);
        }
      });

    return () => {
      console.log('🔌 [REALTIME] Cleaning up customers subscription');
      supabase.removeChannel(channel);
    };
  }, [companyId, isSystemLevel, queryClient, refreshCustomerCache, updateCustomerInCache, removeCustomerFromCache]);
};

// Enhanced handler functions using cache manager
const handleCustomerInsert = (newCustomer: any, refreshCustomerCache: any) => {
  console.log('🆕 [REALTIME] Handling customer insert:', {
    id: newCustomer.id,
    name: newCustomer.customer_type === 'individual' 
      ? `${newCustomer.first_name} ${newCustomer.last_name}`
      : newCustomer.company_name
  });
  
  // استخدام مدير الكاش المحسن للتحديث
  refreshCustomerCache(newCustomer);
  
  console.log('✅ [REALTIME] Customer insert processed using cache manager');
};

const handleCustomerUpdate = (updatedCustomer: any, updateCustomerInCache: any) => {
  console.log('📝 [REALTIME] Handling customer update:', updatedCustomer.id);
  
  // استخدام مدير الكاش المحسن للتحديث
  updateCustomerInCache(updatedCustomer);
  
  console.log('✅ [REALTIME] Customer update processed using cache manager');
};

const handleCustomerDelete = (deletedCustomer: any, removeCustomerFromCache: any) => {
  console.log('🗑️ [REALTIME] Handling customer delete:', deletedCustomer.id);
  
  // استخدام مدير الكاش المحسن للحذف
  removeCustomerFromCache(deletedCustomer.id);
  
  console.log('✅ [REALTIME] Customer delete processed using cache manager');
};