import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export const useCustomersRealtime = () => {
  const queryClient = useQueryClient();
  const { companyId, isSystemLevel } = useUnifiedCompanyAccess();

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
          
          // تأخير قصير لتجنب التضارب مع Optimistic Updates
          setTimeout(() => {
            switch (eventType) {
              case 'INSERT':
                console.log('✅ [REALTIME] Processing INSERT');
                handleCustomerInsert(newRecord, queryClient);
                break;
              case 'UPDATE':
                console.log('✅ [REALTIME] Processing UPDATE');
                handleCustomerUpdate(newRecord, queryClient);
                break;
              case 'DELETE':
                console.log('✅ [REALTIME] Processing DELETE');
                handleCustomerDelete(oldRecord, queryClient);
                break;
            }
          }, 100); // تأخير 100ms لتجنب التضارب
        } catch (error) {
          console.error('❌ [REALTIME] Error processing event:', error);
          // Enhanced fallback with delay
          setTimeout(() => {
            console.log('🔄 [REALTIME] Fallback: Refetching customers');
            queryClient.refetchQueries({ queryKey: ['customers'] });
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
          queryClient.refetchQueries({ queryKey: ['customers'] });
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [REALTIME] Subscription timed out - retrying');
          setTimeout(() => {
            queryClient.refetchQueries({ queryKey: ['customers'] });
          }, 3000);
        }
      });

    return () => {
      console.log('🔌 [REALTIME] Cleaning up customers subscription');
      supabase.removeChannel(channel);
    };
  }, [companyId, isSystemLevel, queryClient]);
};

// Enhanced handler functions
const handleCustomerInsert = (newCustomer: any, queryClient: any) => {
  console.log('🆕 [REALTIME] Handling customer insert:', {
    id: newCustomer.id,
    name: newCustomer.customer_type === 'individual' 
      ? `${newCustomer.first_name} ${newCustomer.last_name}`
      : newCustomer.company_name
  });
  
  // Debounce real-time updates to avoid conflicts with manual updates
  const now = Date.now();
  const lastUpdate = (queryClient as any)._lastCustomerUpdate || 0;
  
  // Skip if manual update happened recently (within 2 seconds)
  if (now - lastUpdate < 2000) {
    console.log('⏭️ [REALTIME] Skipping real-time update - recent manual update detected');
    return;
  }
  
  // Get all customer queries to update them properly
  const allCustomerQueries = queryClient.getQueriesData({ 
    queryKey: ['customers'], 
    exact: false 
  });
  
  console.log('🔄 [REALTIME] Found customer queries to update:', allCustomerQueries.length);
  
  // Update all matching customer query caches
  allCustomerQueries.forEach(([queryKey, oldData]) => {
    if (Array.isArray(oldData)) {
      const exists = oldData.some((customer: unknown) => customer.id === newCustomer.id);
      if (!exists) {
        console.log('🔄 [REALTIME] Updating cache for query:', queryKey);
        queryClient.setQueryData(queryKey, [newCustomer, ...oldData]);
      }
    }
  });
  
  // Update individual customer cache
  queryClient.setQueryData(['customer', newCustomer.id], newCustomer);
  
  console.log('✅ [REALTIME] Customer insert processed');
};

const handleCustomerUpdate = (updatedCustomer: any, queryClient: any) => {
  console.log('📝 [REALTIME] Handling customer update:', updatedCustomer.id);
  
  // Get all customer queries to update them properly
  const allCustomerQueries = queryClient.getQueriesData({ 
    queryKey: ['customers'], 
    exact: false 
  });
  
  // Update all matching customer query caches
  allCustomerQueries.forEach(([queryKey, oldData]) => {
    if (Array.isArray(oldData)) {
      queryClient.setQueryData(queryKey, 
        oldData.map((customer: unknown) => 
          customer.id === updatedCustomer.id ? updatedCustomer : customer
        )
      );
    }
  });
  
  // Update individual customer cache
  queryClient.setQueryData(['customer', updatedCustomer.id], updatedCustomer);
};

const handleCustomerDelete = (deletedCustomer: any, queryClient: any) => {
  console.log('🗑️ [REALTIME] Handling customer delete:', deletedCustomer.id);
  
  // Get all customer queries to update them properly
  const allCustomerQueries = queryClient.getQueriesData({ 
    queryKey: ['customers'], 
    exact: false 
  });
  
  // Update all matching customer query caches
  allCustomerQueries.forEach(([queryKey, oldData]) => {
    if (Array.isArray(oldData)) {
      queryClient.setQueryData(queryKey, 
        oldData.filter((customer: unknown) => customer.id !== deletedCustomer.id)
      );
    }
  });
  
  // Remove individual customer cache
  queryClient.removeQueries({ queryKey: ['customer', deletedCustomer.id] });
};