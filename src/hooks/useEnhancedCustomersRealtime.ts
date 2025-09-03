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
  
  // Update cache with new customer at the beginning
  queryClient.setQueriesData(
    { queryKey: ['customers'] },
    (oldData: any) => {
      if (!oldData) return [newCustomer];
      
      // Check if customer already exists to avoid duplicates
      const exists = oldData.some((customer: any) => customer.id === newCustomer.id);
      if (exists) return oldData;
      
      // Add new customer to the beginning of the list
      return [newCustomer, ...oldData];
    }
  );
  
  // Update individual customer cache
  queryClient.setQueryData(['customer', newCustomer.id], newCustomer);
  
  console.log('✅ [REALTIME] Customer insert processed');
};

const handleCustomerUpdate = (updatedCustomer: any, queryClient: any) => {
  console.log('📝 [REALTIME] Handling customer update:', updatedCustomer.id);
  
  // Update customers list
  queryClient.setQueriesData(
    { queryKey: ['customers'] },
    (oldData: any) => {
      if (!oldData) return oldData;
      
      return oldData.map((customer: any) => 
        customer.id === updatedCustomer.id ? updatedCustomer : customer
      );
    }
  );
  
  // Update individual customer cache
  queryClient.setQueryData(['customer', updatedCustomer.id], updatedCustomer);
};

const handleCustomerDelete = (deletedCustomer: any, queryClient: any) => {
  console.log('🗑️ [REALTIME] Handling customer delete:', deletedCustomer.id);
  
  // Remove from customers list
  queryClient.setQueriesData(
    { queryKey: ['customers'] },
    (oldData: any) => {
      if (!oldData) return oldData;
      
      return oldData.filter((customer: any) => customer.id !== deletedCustomer.id);
    }
  );
  
  // Remove individual customer cache
  queryClient.removeQueries({ queryKey: ['customer', deletedCustomer.id] });
};