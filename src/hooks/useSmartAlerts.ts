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

export const useSmartAlerts = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['smart-alerts']),
    queryFn: async (): Promise<SmartAlert[]> => {
      if (!companyId) {
        return [];
      }
      const alerts: SmartAlert[] = [];
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Check for expiring contracts
      const { data: expiringContracts } = await supabase
        .from('contracts')
        .select('id, contract_number, end_date')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .lte('end_date', nextWeek.toISOString().split('T')[0]);

      if (expiringContracts && expiringContracts.length > 0) {
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

      // Check for pending maintenance
      const { data: pendingMaintenance } = await supabase
        .from('vehicle_maintenance')
        .select('id, maintenance_number, estimated_cost')
        .eq('company_id', companyId)
        .eq('status', 'pending');

      if (pendingMaintenance && pendingMaintenance.length > 0) {
        const totalCost = pendingMaintenance.reduce((sum, m) => sum + (m.estimated_cost || 0), 0);
        alerts.push({
          id: 'pending-maintenance',
          type: 'warning',
          title: 'طلبات صيانة معلقة',
          message: `${pendingMaintenance.length} طلب صيانة في الانتظار`,
          action: 'عرض الصيانة',
          actionUrl: '/fleet/maintenance',
          priority: 'medium',
          count: pendingMaintenance.length,
          amount: totalCost,
          created_at: new Date().toISOString()
        });
      }

      // Check for overdue payments
      const { data: overduePayments } = await supabase
        .from('payments')
        .select('id, amount, payment_date')
        .eq('company_id', companyId)
        .eq('payment_status', 'pending')
        .lt('payment_date', today.toISOString().split('T')[0]);

      if (overduePayments && overduePayments.length > 0) {
        const totalOverdue = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
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

      // Check for vehicles needing maintenance (based on mileage or time)
      const { data: vehiclesNeedingMaintenance } = await supabase
        .from('vehicles')
        .select('id, plate_number, last_maintenance_date, current_mileage')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const vehiclesForMaintenance = vehiclesNeedingMaintenance?.filter(vehicle => {
        const lastMaintenance = vehicle.last_maintenance_date ? new Date(vehicle.last_maintenance_date) : null;
        const sixMonthsAgo = new Date(today.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
        
        return !lastMaintenance || lastMaintenance < sixMonthsAgo;
      }) || [];

      if (vehiclesForMaintenance.length > 0) {
        alerts.push({
          id: 'vehicles-need-maintenance',
          type: 'info',
          title: 'مركبات تحتاج صيانة',
          message: `${vehiclesForMaintenance.length} مركبة لم تخضع لصيانة منذ فترة`,
          action: 'جدولة صيانة',
          actionUrl: '/fleet/maintenance',
          priority: 'medium',
          count: vehiclesForMaintenance.length,
          created_at: new Date().toISOString()
        });
      }

      // Check for vehicle registration expiry  
      try {
        const { data: vehiclesWithExpiringRegistration } = await supabase
          .from('vehicles')
          .select('id, plate_number, license_expiry')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .not('license_expiry', 'is', null)
          .lte('license_expiry', nextMonth.toISOString().split('T')[0]);

        if (vehiclesWithExpiringRegistration && vehiclesWithExpiringRegistration.length > 0) {
          const urgentRegistrations = vehiclesWithExpiringRegistration.filter(vehicle => 
            vehicle.license_expiry && new Date(vehicle.license_expiry) <= nextWeek
          );
          
          if (urgentRegistrations.length > 0) {
            alerts.push({
              id: 'urgent-registration-expiry',
              type: 'error',
              title: 'رخص مركبات تنتهي خلال أسبوع',
              message: `${urgentRegistrations.length} رخصة تنتهي خلال أسبوع`,
              action: 'تجديد فوري',
              actionUrl: '/fleet',
              priority: 'high',
              count: urgentRegistrations.length,
              created_at: new Date().toISOString()
            });
          } else {
            alerts.push({
              id: 'expiring-registration',
              type: 'warning',
              title: 'رخص مركبات قاربت على الانتهاء',
              message: `${vehiclesWithExpiringRegistration.length} رخصة تنتهي قريباً`,
              action: 'تجديد الرخص',
              actionUrl: '/fleet',
              priority: 'medium',
              count: vehiclesWithExpiringRegistration.length,
              created_at: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Error checking registration expiry:', error);
      }

      // Check for low cash flow
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('amount, payment_type')
        .eq('company_id', companyId)
        .eq('payment_status', 'completed')
        .gte('created_at', new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (recentPayments) {
        const income = recentPayments.filter(p => p.payment_type === 'receipt').reduce((sum, p) => sum + (p.amount || 0), 0);
        const expenses = recentPayments.filter(p => p.payment_type === 'payment').reduce((sum, p) => sum + (p.amount || 0), 0);
        const cashFlow = income - expenses;

        if (cashFlow < 0) {
          alerts.push({
            id: 'negative-cash-flow',
            type: 'error',
            title: 'تدفق نقدي سلبي',
            message: `التدفق النقدي الشهري سلبي بمبلغ ${Math.abs(cashFlow).toFixed(0)} د.ك`,
            action: 'عرض التقارير المالية',
            actionUrl: '/finance/reports',
            priority: 'high',
            amount: cashFlow,
            created_at: new Date().toISOString()
          });
        }
      }

      // Check for employees without system access
      const { data: employeesWithoutAccess } = await supabase
        .from('employees')
        .select('id, first_name, last_name, first_name_ar, last_name_ar')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('has_system_access', false);

      if (employeesWithoutAccess && employeesWithoutAccess.length > 0) {
        alerts.push({
          id: 'employees-no-access',
          type: 'info',
          title: 'موظفون بدون حسابات',
          message: `${employeesWithoutAccess.length} موظف لا يملك حساب في النظام`,
          action: 'إنشاء حسابات',
          actionUrl: '/hr/employees',
          priority: 'low',
          count: employeesWithoutAccess.length,
          created_at: new Date().toISOString()
        });
      }

      // Check for high fleet utilization
      const { count: totalVehiclesCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);

      const { count: rentedVehiclesCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'rented');

      const totalVehicleCount = totalVehiclesCount || 0;
      const rentedVehicleCount = rentedVehiclesCount || 0;
      const utilization = totalVehicleCount > 0 ? (rentedVehicleCount / totalVehicleCount) * 100 : 0;

      if (utilization > 90) {
        alerts.push({
          id: 'high-utilization',
          type: 'success',
          title: 'استغلال ممتاز للأسطول',
          message: `معدل استغلال الأسطول ${utilization.toFixed(1)}% - فكر في التوسع`,
          action: 'إضافة مركبات',
          actionUrl: '/fleet',
          priority: 'low',
          amount: utilization,
          created_at: new Date().toISOString()
        });
      } else if (utilization < 60 && totalVehicleCount > 5) {
        alerts.push({
          id: 'low-utilization',
          type: 'warning',
          title: 'انخفاض استغلال الأسطول',
          message: `معدل استغلال الأسطول ${utilization.toFixed(1)}% فقط`,
          action: 'تحليل الأداء',
          actionUrl: '/fleet/reports',
          priority: 'medium',
          amount: utilization,
          created_at: new Date().toISOString()
        });
      }

      // Sort alerts by priority and return
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return alerts.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    },
    enabled: !!companyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};