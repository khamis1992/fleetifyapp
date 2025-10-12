import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface SmartAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
  count?: number;
  amount?: number;
  created_at: string;
}

export const useSmartAlerts = (options?: { priority?: boolean; limit?: number }) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();
  const { priority = false, limit = 10 } = options || {};
  
  return useQuery({
    queryKey: getQueryKey(['smart-alerts', String(priority), String(limit)]),
    queryFn: async (): Promise<SmartAlert[]> => {
      if (!companyId) {
        return [];
      }
      const alerts: SmartAlert[] = [];
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      try {
        // Optimize queries by running only essential ones for maintenance page
        const queries = [];
        
        // Critical alerts only for priority mode
        if (priority) {
          // Check for pending maintenance (most relevant for maintenance page)
          queries.push(
            supabase
              .from('vehicle_maintenance')
              .select('id, maintenance_number, estimated_cost, priority')
              .eq('company_id', companyId)
              .eq('status', 'pending')
              .limit(20)
          );
          
          // Check for overdue payments
          queries.push(
            supabase
              .from('payments')
              .select('id, amount, payment_date')
              .eq('company_id', companyId)
              .eq('payment_status', 'pending')
              .lt('payment_date', today.toISOString().split('T')[0])
              .limit(10)
          );
        } else {
          // Full alerts for dashboard
          queries.push(
            // Expiring contracts
            supabase
              .from('contracts')
              .select('id, contract_number, end_date')
              .eq('company_id', companyId)
              .eq('status', 'active')
              .lte('end_date', nextWeek.toISOString().split('T')[0])
              .limit(10),
              
            // Pending maintenance
            supabase
              .from('vehicle_maintenance')
              .select('id, maintenance_number, estimated_cost')
              .eq('company_id', companyId)
              .eq('status', 'pending')
              .limit(20),
              
            // Overdue payments
            supabase
              .from('payments')
              .select('id, amount, payment_date')
              .eq('company_id', companyId)
              .eq('payment_status', 'pending')
              .lt('payment_date', today.toISOString().split('T')[0])
              .limit(10)
          );
        }

        const results = await Promise.allSettled(queries);
        
        // Process maintenance alerts
        const maintenanceResult = priority ? results[0] : results[1];
        if (maintenanceResult.status === 'fulfilled' && maintenanceResult.value.data) {
          const pendingMaintenance = maintenanceResult.value.data;
          if (pendingMaintenance.length > 0) {
            const totalCost = pendingMaintenance.reduce((sum: number, m: any) => sum + (m.estimated_cost || 0), 0);
            const urgentCount = pendingMaintenance.filter((m: any) => m.priority === 'urgent' || m.priority === 'high').length;
            
            alerts.push({
              id: 'pending-maintenance',
              type: urgentCount > 0 ? 'error' : 'warning',
              title: urgentCount > 0 ? 'صيانة عاجلة معلقة' : 'طلبات صيانة معلقة',
              message: urgentCount > 0 
                ? `${urgentCount} صيانة عاجلة من أصل ${pendingMaintenance.length} معلقة`
                : `${pendingMaintenance.length} طلب صيانة في الانتظار`,
              action: 'عرض الصيانة',
              actionUrl: '/fleet/maintenance',
              priority: urgentCount > 0 ? 'high' : 'medium',
              count: pendingMaintenance.length,
              amount: totalCost,
              created_at: new Date().toISOString()
            });
          }
        }

        // Process payment alerts  
        const paymentResult = priority ? results[1] : results[2];
        if (paymentResult.status === 'fulfilled' && paymentResult.value.data) {
          const overduePayments = paymentResult.value.data;
          if (overduePayments.length > 0) {
            const totalOverdue = overduePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            alerts.push({
              id: 'overdue-payments',
              type: 'error',
              title: 'مدفوعات متأخرة',
              message: `${overduePayments.length} دفعة متأخرة بمبلغ ${totalOverdue.toFixed(0)} د.ك`,
              action: 'عرض المدفوعات',
              actionUrl: '/finance/payments',
              priority: 'high',
              count: overduePayments.length,
              amount: totalOverdue,
              created_at: new Date().toISOString()
            });
          }
        }

        // Process contract alerts (only for non-priority mode)
        if (!priority && results[0].status === 'fulfilled' && results[0].value.data) {
          const expiringContracts = results[0].value.data;
          if (expiringContracts.length > 0) {
            alerts.push({
              id: 'expiring-contracts',
              type: 'warning',
              title: 'عقود قاربت على الانتهاء',
              message: `${expiringContracts.length} عقد سينتهي خلال الأسبوع القادم`,
              action: 'عرض العقود',
              actionUrl: '/contracts',
              priority: 'high',
              count: expiringContracts.length,
              created_at: new Date().toISOString()
            });
          }
        }

        // Sort alerts by priority and limit results
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return alerts
          .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
          .slice(0, limit);
          
      } catch (error) {
        console.error('Error fetching smart alerts:', error);
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: priority ? 30 * 1000 : 5 * 60 * 1000, // 30s for priority, 5min for regular
    gcTime: priority ? 2 * 60 * 1000 : 10 * 60 * 1000, // Shorter cache for priority
  });
};