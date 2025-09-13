import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface PropertyAlert {
  id: string;
  type: 'contract_expiry' | 'payment_overdue' | 'maintenance_due' | 'document_expiry' | 'vacancy_alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  propertyId?: string;
  propertyName?: string;
  dueDate?: Date;
  amount?: number;
  daysOverdue?: number;
  metadata?: Record<string, any>;
}

export const usePropertyAlerts = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['property-alerts']),
    queryFn: async (): Promise<PropertyAlert[]> => {
      if (!companyId) {
        return [];
      }

      const alerts: PropertyAlert[] = [];
      const currentDate = new Date();
      const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      try {
        // Check for expiring contracts
        const { data: expiringContracts } = await supabase
          .from('property_contracts')
          .select(`
            id,
            end_date,
            property_id
          `)
          .eq('company_id', companyId)
          .eq('status', 'active')
          .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0]);

        if (expiringContracts) {
          // Get property details separately
          const propertyIds = expiringContracts.map(c => c.property_id).filter(Boolean);
          const { data: properties } = await supabase
            .from('properties')
            .select('id, description')
            .in('id', propertyIds);

          const propertyMap = new Map(properties?.map(p => [p.id, p]) || []);

          expiringContracts.forEach(contract => {
            const endDate = new Date(contract.end_date);
            const daysUntilExpiry = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            const property = propertyMap.get(contract.property_id);
            
            let severity: PropertyAlert['severity'] = 'low';
            if (daysUntilExpiry <= 7) severity = 'critical';
            else if (daysUntilExpiry <= 15) severity = 'high';
            else if (daysUntilExpiry <= 30) severity = 'medium';

            alerts.push({
              id: `contract-expiry-${contract.id}`,
              type: 'contract_expiry',
              title: 'عقد إيجار منتهي الصلاحية',
              description: `عقد إيجار ${property?.description || 'غير محدد'} سينتهي خلال ${daysUntilExpiry} يوم`,
              severity,
              propertyId: contract.property_id,
              propertyName: property?.description,
              dueDate: endDate,
              metadata: {
                contractId: contract.id,
                daysUntilExpiry
              }
            });
          });
        }

        // Check for overdue payments
        const { data: overduePayments } = await supabase
          .from('property_payments')
          .select(`
            id,
            amount,
            due_date,
            property_contract_id
          `)
          .eq('company_id', companyId)
          .eq('status', 'pending')
          .lt('due_date', currentDate.toISOString().split('T')[0]);

        if (overduePayments) {
          overduePayments.forEach(payment => {
            const dueDate = new Date(payment.due_date);
            const daysOverdue = Math.ceil((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            
            let severity: PropertyAlert['severity'] = 'medium';
            if (daysOverdue >= 30) severity = 'critical';
            else if (daysOverdue >= 15) severity = 'high';

            alerts.push({
              id: `payment-overdue-${payment.id}`,
              type: 'payment_overdue',
              title: 'دفعة متأخرة',
              description: `دفعة متأخرة منذ ${daysOverdue} يوم`,
              severity,
              dueDate,
              amount: payment.amount,
              daysOverdue,
              metadata: {
                paymentId: payment.id,
                contractId: payment.property_contract_id
              }
            });
          });
        }

        // Add some mock maintenance alerts for demonstration
        if (currentDate.getDate() % 7 === 0) { // Every 7th day of month
          alerts.push({
            id: `maintenance-mock-${currentDate.getTime()}`,
            type: 'maintenance_due',
            title: 'صيانة مجدولة',
            description: `صيانة دورية مجدولة للعقارات`,
            severity: 'low' as PropertyAlert['severity'],
            dueDate: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000),
            metadata: {
              maintenanceType: 'routine'
            }
          });
        }

        // Check for vacant properties (properties available for more than 60 days)
        const sixtyDaysAgo = new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000);
        const { data: vacantProperties } = await supabase
          .from('properties')
          .select('id, description, updated_at')
          .eq('company_id', companyId)
          .eq('property_status', 'available')
          .lt('updated_at', sixtyDaysAgo.toISOString());

        if (vacantProperties) {
          vacantProperties.forEach(property => {
            const vacantSince = new Date(property.updated_at);
            const daysVacant = Math.ceil((currentDate.getTime() - vacantSince.getTime()) / (1000 * 60 * 60 * 24));
            
            let severity: PropertyAlert['severity'] = 'medium';
            if (daysVacant >= 120) severity = 'high';
            else if (daysVacant >= 90) severity = 'medium';

            alerts.push({
              id: `vacancy-${property.id}`,
              type: 'vacancy_alert',
              title: 'عقار شاغر لفترة طويلة',
              description: `عقار ${property.description} شاغر منذ ${daysVacant} يوم`,
              severity,
              propertyId: property.id,
              propertyName: property.description,
              metadata: {
                daysVacant
              }
            });
          });
        }

        // Sort alerts by severity and date
        return alerts.sort((a, b) => {
          const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
          const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
          
          if (severityDiff !== 0) return severityDiff;
          
          // Sort by due date if same severity
          if (a.dueDate && b.dueDate) {
            return a.dueDate.getTime() - b.dueDate.getTime();
          }
          
          return 0;
        });

      } catch (error) {
        console.error('Error fetching property alerts:', error);
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};