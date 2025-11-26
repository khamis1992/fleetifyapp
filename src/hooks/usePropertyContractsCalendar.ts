import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { addDays, format } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'contract_expiry' | 'contract_renewal' | 'payment_due' | 'maintenance';
  date: Date;
  property: string;
  propertyId: string;
  contractId?: string;
  paymentId?: string;
  details: any;
  priority: 'high' | 'medium' | 'low';
}

export const usePropertyContractsCalendar = (startDate?: Date, endDate?: Date) => {
  const { companyId, filter, hasGlobalAccess, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['property-contracts-calendar', startDate?.toISOString(), endDate?.toISOString()]),
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!companyId && !hasGlobalAccess) {
        return [];
      }

      const targetCompanyId = filter.company_id || companyId;
      if (!targetCompanyId && !hasGlobalAccess) {
        return [];
      }

      return await fetchCalendarEvents(targetCompanyId, hasGlobalAccess, startDate, endDate);
    },
    enabled: !!(companyId || hasGlobalAccess),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

async function fetchCalendarEvents(
  companyId: string | undefined, 
  hasGlobalAccess: boolean = false,
  startDate?: Date,
  endDate?: Date
): Promise<CalendarEvent[]> {
  
  // Helper function to build query with company filtering
  const buildQuery = (baseQuery: any) => {
    if (companyId && !hasGlobalAccess) {
      return baseQuery.eq('company_id', companyId);
    } else if (companyId && hasGlobalAccess) {
      return baseQuery.eq('company_id', companyId);
    }
    // For super_admin without specific company filter, return all
    return baseQuery;
  };

  try {
    const events: CalendarEvent[] = [];

    // Set default date range (current month)
    const defaultStartDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const defaultEndDate = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Fetch contracts and related data - SIMPLIFIED to avoid FK errors
    const [
      contractsResult,
      paymentsResult,
      propertiesResult
    ] = await Promise.all([
      // Property contracts - simplified query without nested joins
      buildQuery(supabase.from('property_contracts').select('*'))
        .eq('is_active', true)
        .gte('end_date', format(defaultStartDate, 'yyyy-MM-dd'))
        .lte('end_date', format(defaultEndDate, 'yyyy-MM-dd'))
        .then((res: any) => res.error ? { data: [], error: res.error } : res)
        .catch(() => ({ data: [], error: { message: 'Table not found' } })),
      
      // Payments due - simplified query
      buildQuery(supabase.from('property_payments').select('*'))
        .in('status', ['pending', 'overdue'])
        .gte('due_date', format(defaultStartDate, 'yyyy-MM-dd'))
        .lte('due_date', format(defaultEndDate, 'yyyy-MM-dd'))
        .then((res: any) => res.error ? { data: [], error: res.error } : res)
        .catch(() => ({ data: [], error: { message: 'Table not found' } })),
      
      // Properties for maintenance
      buildQuery(supabase.from('properties').select('*'))
        .eq('is_active', true)
        .then((res: any) => res.error ? { data: [], error: res.error } : res)
        .catch(() => ({ data: [], error: { message: 'Table not found' } }))
    ]);
    
    // Log errors silently for debugging
    if (contractsResult.error) console.warn('[Calendar] property_contracts query issue:', contractsResult.error.message);
    if (paymentsResult.error) console.warn('[Calendar] property_payments query issue:', paymentsResult.error.message);

    // Process contracts expiry events
    if (contractsResult.data && contractsResult.data.length > 0) {
      contractsResult.data.forEach((contract: any) => {
        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          events.push({
            id: `contract_expiry_${contract.id}`,
            title: `انتهاء عقد عقاري`,
            type: 'contract_expiry',
            date: endDate,
            property: 'عقار',
            propertyId: contract.property_id,
            contractId: contract.id,
            priority: daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 30 ? 'medium' : 'low',
            details: {
              contractNumber: contract.contract_number,
              amount: contract.rental_amount,
              endDate: endDate
            }
          });

          // Add renewal opportunity event (30 days before expiry)
          const renewalDate = addDays(endDate, -30);
          if (renewalDate >= defaultStartDate && renewalDate <= defaultEndDate) {
            events.push({
              id: `contract_renewal_${contract.id}`,
              title: `فرصة تجديد عقد عقاري`,
              type: 'contract_renewal',
              date: renewalDate,
              property: 'عقار',
              propertyId: contract.property_id,
              contractId: contract.id,
              priority: 'medium',
              details: {
                contractNumber: contract.contract_number,
                currentAmount: contract.rental_amount,
                endDate: endDate
              }
            });
          }
        }
      });
    }

    // Process payment due events
    if (paymentsResult.data && paymentsResult.data.length > 0) {
      paymentsResult.data.forEach((payment: any) => {
        if (payment.due_date) {
          const dueDate = new Date(payment.due_date);
          const isOverdue = dueDate < new Date();
          
          events.push({
            id: `payment_due_${payment.id}`,
            title: `${isOverdue ? 'دفعة متأخرة' : 'استحقاق دفعة'} - عقار`,
            type: 'payment_due',
            date: dueDate,
            property: 'عقار',
            propertyId: payment.property_id || '',
            contractId: payment.property_contract_id,
            paymentId: payment.id,
            priority: isOverdue ? 'high' : 'medium',
            details: {
              amount: payment.amount,
              status: payment.status,
              dueDate: dueDate,
              isOverdue: isOverdue
            }
          });
        }
      });
    }

    // Generate maintenance events (mock for now - in real implementation, you'd have a maintenance schedule)
    if (propertiesResult.data) {
      propertiesResult.data.forEach(property => {
        // Mock quarterly maintenance for each property
        const maintenanceDate = new Date();
        maintenanceDate.setMonth(maintenanceDate.getMonth() + 1);
        
        if (maintenanceDate >= defaultStartDate && maintenanceDate <= defaultEndDate) {
          events.push({
            id: `maintenance_${property.id}`,
            title: `صيانة دورية - ${property.property_name}`,
            type: 'maintenance',
            date: maintenanceDate,
            property: property.property_name || 'عقار غير معروف',
            propertyId: property.id,
            priority: 'low',
            details: {
              type: 'صيانة دورية',
              description: 'فحص وصيانة عامة',
              propertyType: property.property_type
            }
          });
        }
      });
    }

    // Sort events by date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

// Hook for getting events for a specific date
export const usePropertyCalendarEventsForDate = (date: Date) => {
  const { data: allEvents } = usePropertyContractsCalendar();
  
  return allEvents?.filter(event => 
    event.date.toDateString() === date.toDateString()
  ) || [];
};

// Hook for getting upcoming events (next 30 days)
export const useUpcomingPropertyEvents = () => {
  const startDate = new Date();
  const endDate = addDays(new Date(), 30);
  
  return usePropertyContractsCalendar(startDate, endDate);
};