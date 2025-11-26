import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { addDays } from 'date-fns';

export interface PropertyAlert {
  id: string;
  type: 'contract_expiry' | 'payment_overdue' | 'maintenance_due' | 'vacant_property' | 'contract_renewal' | 'document_expiry';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  property: string;
  propertyId: string;
  contractId?: string;
  paymentId?: string;
  daysRemaining?: number;
  amount?: number;
  dueDate: Date;
  acknowledged: boolean;
  createdAt: Date;
  metadata?: any;
}

export const usePropertyAlerts = () => {
  const { companyId, filter, hasGlobalAccess, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['property-alerts']),
    queryFn: async (): Promise<PropertyAlert[]> => {
      if (!companyId && !hasGlobalAccess) {
        return [];
      }

      const targetCompanyId = filter.company_id ?? companyId ?? undefined;
      if (!targetCompanyId && !hasGlobalAccess) {
        return [];
      }

      return await fetchPropertyAlerts(targetCompanyId, hasGlobalAccess);
    },
    enabled: !!(companyId || hasGlobalAccess),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

async function fetchPropertyAlerts(
  companyId: string | undefined, 
  hasGlobalAccess: boolean = false
): Promise<PropertyAlert[]> {
  
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
    const alerts: PropertyAlert[] = [];
    const currentDate = new Date();
    const next30Days = addDays(currentDate, 30);
    const next90Days = addDays(currentDate, 90);

    // Fetch data for alerts
    const [
      contractsResult,
      propertyPaymentsResult,
      propertiesResult,
      documentsResult
    ] = await Promise.all([
      // Property contracts - use simpler query without nested relations that may not exist
      buildQuery(supabase.from('property_contracts').select('*'))
        .eq('is_active', true)
        .lte('end_date', next90Days.toISOString())
        .then((res: any) => res.error ? { data: null, error: res.error } : res)
        .catch(() => ({ data: null, error: { message: 'Table not found' } })),
      
      // Property payments - use correct table for property-related payments
      buildQuery(supabase.from('property_payments').select('*'))
        .in('status', ['pending', 'overdue'])
        .lte('payment_date', currentDate.toISOString())
        .then((res: any) => res.error ? { data: null, error: res.error } : res)
        .catch(() => ({ data: null, error: { message: 'Table not found' } })),
      
      // Properties
      buildQuery(supabase.from('properties').select('*'))
        .eq('is_active', true)
        .then((res: any) => res.error ? { data: null, error: res.error } : res)
        .catch(() => ({ data: null, error: { message: 'Table not found' } })),
      
      // Document expiry alerts (from existing system)
      buildQuery(supabase.from('document_expiry_alerts').select('*'))
        .eq('is_acknowledged', false)
        .then((res: any) => res.error ? { data: null, error: res.error } : res)
        .catch(() => ({ data: null, error: { message: 'Table not found' } }))
    ]);
    
    // Log errors for debugging (only in development)
    if (contractsResult.error) console.warn('[PropertyAlerts] property_contracts query failed:', contractsResult.error.message);
    if (propertyPaymentsResult.error) console.warn('[PropertyAlerts] property_payments query failed:', propertyPaymentsResult.error.message);
    if (propertiesResult.error) console.warn('[PropertyAlerts] properties query failed:', propertiesResult.error.message);
    
    // Rename for consistent variable usage below
    const paymentsResult = propertyPaymentsResult;

    // Contract Expiry Alerts
    if (contractsResult.data && contractsResult.data.length > 0) {
      contractsResult.data.forEach((contract: any) => {
        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= 90) {
            alerts.push({
              id: `contract_expiry_${contract.id}`,
              type: 'contract_expiry',
              priority: daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 30 ? 'medium' : 'low',
              title: `انتهاء عقد عقاري`,
              description: `عقد الإيجار رقم ${contract.contract_number || contract.id} ينتهي ${daysUntilExpiry <= 0 ? 'منتهي' : `خلال ${daysUntilExpiry} يوم`}`,
              property: 'عقار',
              propertyId: contract.property_id,
              contractId: contract.id,
              daysRemaining: daysUntilExpiry,
              amount: contract.rental_amount,
              dueDate: endDate,
              acknowledged: false,
              createdAt: currentDate,
              metadata: {
                contractNumber: contract.contract_number
              }
            });
          }
        }
      });
    }

    // Payment Overdue Alerts (from property_payments table)
    if (paymentsResult.data && paymentsResult.data.length > 0) {
      paymentsResult.data.forEach((payment: any) => {
        const paymentDate = payment.payment_date || payment.due_date;
        if (paymentDate) {
          const dueDate = new Date(paymentDate);
          const daysOverdue = Math.ceil((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysOverdue > 0) {
            alerts.push({
              id: `payment_overdue_${payment.id}`,
              type: 'payment_overdue',
              priority: daysOverdue >= 30 ? 'high' : daysOverdue >= 7 ? 'medium' : 'low',
              title: `دفعة متأخرة - عقار`,
              description: `دفعة بقيمة ${payment.amount} ر.ق متأخرة منذ ${daysOverdue} يوم`,
              property: 'عقار',
              propertyId: payment.property_id || '',
              contractId: payment.property_contract_id,
              paymentId: payment.id,
              daysRemaining: -daysOverdue,
              amount: payment.amount,
              dueDate: dueDate,
              acknowledged: false,
              createdAt: currentDate,
              metadata: {
                status: payment.status
              }
            });
          }
        }
      });
    }

    // Vacant Property Alerts
    if (propertiesResult.data) {
      for (const property of propertiesResult.data) {
        if (property.property_status === 'available') {
          // Check how long it's been vacant (mock calculation - in real system, track this)
          const vacantDays = 45; // Mock value
          
          if (vacantDays >= 30) {
            alerts.push({
              id: `vacant_property_${property.id}`,
              type: 'vacant_property',
              priority: vacantDays >= 90 ? 'high' : vacantDays >= 60 ? 'medium' : 'low',
              title: `عقار شاغر لفترة طويلة`,
              description: `${property.property_name} شاغر منذ ${vacantDays} يوم`,
              property: property.property_name || 'عقار غير معروف',
              propertyId: property.id,
              daysRemaining: vacantDays,
              dueDate: addDays(currentDate, -vacantDays),
              acknowledged: false,
              createdAt: currentDate,
              metadata: {
                propertyType: property.property_type,
                rentalPrice: property.rental_price
              }
            });
          }
        }
      }
    }

    // Contract Renewal Opportunities
    if (contractsResult.data && contractsResult.data.length > 0) {
      contractsResult.data.forEach((contract: any) => {
        if (contract.end_date && (contract.status === 'active' || contract.is_active)) {
          const endDate = new Date(contract.end_date);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Suggest renewal 60-30 days before expiry
          if (daysUntilExpiry >= 30 && daysUntilExpiry <= 60) {
            alerts.push({
              id: `contract_renewal_${contract.id}`,
              type: 'contract_renewal',
              priority: 'medium',
              title: `فرصة تجديد عقد عقاري`,
              description: `عقد عقاري مؤهل للتجديد`,
              property: 'عقار',
              propertyId: contract.property_id,
              contractId: contract.id,
              daysRemaining: daysUntilExpiry,
              amount: contract.rental_amount,
              dueDate: endDate,
              acknowledged: false,
              createdAt: currentDate,
              metadata: {
                contractNumber: contract.contract_number,
                currentAmount: contract.rental_amount
              }
            });
          }
        }
      });
    }

    // Maintenance Due Alerts (mock - in real system, have maintenance schedules)
    if (propertiesResult.data) {
      propertiesResult.data.forEach((property: any) => {
        // Mock quarterly maintenance check
        const lastMaintenanceDate = addDays(currentDate, -90); // Mock last maintenance
        const nextMaintenanceDate = addDays(lastMaintenanceDate, 90);
        
        if (nextMaintenanceDate <= next30Days) {
          alerts.push({
            id: `maintenance_due_${property.id}`,
            type: 'maintenance_due',
            priority: 'low',
            title: `صيانة دورية مستحقة`,
            description: `${property.property_name} يحتاج صيانة دورية`,
            property: property.property_name || 'عقار غير معروف',
            propertyId: property.id,
            dueDate: nextMaintenanceDate,
            acknowledged: false,
            createdAt: currentDate,
            metadata: {
              maintenanceType: 'دورية',
              propertyType: property.property_type
            }
          });
        }
      });
    }

    // Document Expiry Alerts (integrate with existing system)
    if (documentsResult.data) {
      documentsResult.data.forEach((docAlert: any) => {
        alerts.push({
          id: `document_expiry_${docAlert.id}`,
          type: 'document_expiry',
          priority: docAlert.alert_type === 'expired' ? 'high' : 'medium',
          title: `انتهاء صلاحية وثيقة`,
          description: docAlert.description || 'وثيقة تحتاج تجديد',
          property: docAlert.property_name || 'عقار غير معروف',
          propertyId: docAlert.property_id || '',
          contractId: docAlert.contract_id,
          daysRemaining: docAlert.days_until_expiry,
          dueDate: new Date(docAlert.expiry_date),
          acknowledged: docAlert.acknowledged,
          createdAt: new Date(docAlert.created_at),
          metadata: {
            documentType: docAlert.document_type,
            customerName: docAlert.customer_name
          }
        });
      });
    }

    // Sort alerts by priority and date
    return alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

  } catch (error) {
    console.error('Error fetching property alerts:', error);
    return [];
  }
}

// Hook for specific alert types
export const usePropertyAlertsByType = (alertType: PropertyAlert['type']) => {
  const { data: allAlerts } = usePropertyAlerts();
  
  return allAlerts?.filter(alert => alert.type === alertType) || [];
};

// Hook for alerts by priority
export const usePropertyAlertsByPriority = (priority: PropertyAlert['priority']) => {
  const { data: allAlerts } = usePropertyAlerts();
  
  return allAlerts?.filter(alert => alert.priority === priority) || [];
};

// Hook for unacknowledged alerts count
export const useUnacknowledgedAlertsCount = () => {
  const { data: allAlerts } = usePropertyAlerts();
  
  return allAlerts?.filter(alert => !alert.acknowledged).length || 0;
};