/**
 * Hook لجلب إحصائيات النظام الحقيقية
 * System Statistics Hook for AI Assistant
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SystemStats {
  customers: {
    total: number;
    active: number;
    individuals: number;
    companies: number;
  };
  vehicles: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    outOfService: number;
  };
  contracts: {
    total: number;
    active: number;
    expiringSoon: number;
  };
  payments: {
    totalThisMonth: number;
    receiptsCount: number;
    paymentsCount: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  invoices: {
    total: number;
    unpaid: number;
    overdueAmount: number;
  };
}

export function useSystemStats() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['system-stats', companyId],
    queryFn: async (): Promise<SystemStats> => {
      if (!companyId) throw new Error('No company ID');

      // Fetch all stats in parallel
      const [
        customersResult,
        vehiclesResult,
        contractsResult,
        paymentsResult,
        tasksResult,
        invoicesResult,
      ] = await Promise.all([
        // Customers stats
        supabase
          .from('customers')
          .select('id, customer_type, is_active', { count: 'exact' })
          .eq('company_id', companyId),
        
        // Vehicles stats
        supabase
          .from('vehicles')
          .select('id, status', { count: 'exact' })
          .eq('company_id', companyId),
        
        // Contracts stats
        supabase
          .from('contracts')
          .select('id, status, end_date', { count: 'exact' })
          .eq('company_id', companyId),
        
        // Payments this month
        supabase
          .from('payments')
          .select('id, amount, transaction_type', { count: 'exact' })
          .eq('company_id', companyId)
          .gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        
        // Tasks stats
        supabase
          .from('tasks')
          .select('id, status', { count: 'exact' })
          .eq('company_id', companyId),
        
        // Invoices stats
        supabase
          .from('invoices')
          .select('id, payment_status, total_amount, paid_amount', { count: 'exact' })
          .eq('company_id', companyId),
      ]);

      // Process customers
      const customers = customersResult.data || [];
      const activeCustomers = customers.filter(c => c.is_active);
      const individuals = customers.filter(c => c.customer_type === 'individual');
      const companies = customers.filter(c => c.customer_type === 'corporate');

      // Process vehicles
      const vehicles = vehiclesResult.data || [];
      const availableVehicles = vehicles.filter(v => v.status === 'available');
      const rentedVehicles = vehicles.filter(v => v.status === 'rented');
      const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance');
      const outOfServiceVehicles = vehicles.filter(v => v.status === 'out_of_service');

      // Process contracts
      const contracts = contractsResult.data || [];
      const activeContracts = contracts.filter(c => c.status === 'active');
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringSoon = contracts.filter(c => {
        if (!c.end_date || c.status !== 'active') return false;
        const endDate = new Date(c.end_date);
        return endDate >= today && endDate <= thirtyDaysFromNow;
      });

      // Process payments
      const payments = paymentsResult.data || [];
      const totalPaymentsThisMonth = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const receipts = payments.filter(p => p.transaction_type === 'receipt');
      const paymentOuts = payments.filter(p => p.transaction_type === 'payment');

      // Process tasks
      const tasks = tasksResult.data || [];
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      const completedTasks = tasks.filter(t => t.status === 'completed');

      // Process invoices
      const invoices = invoicesResult.data || [];
      const unpaidInvoices = invoices.filter(i => i.payment_status !== 'paid');
      const overdueAmount = unpaidInvoices.reduce((sum, i) => {
        return sum + ((i.total_amount || 0) - (i.paid_amount || 0));
      }, 0);

      return {
        customers: {
          total: customers.length,
          active: activeCustomers.length,
          individuals: individuals.length,
          companies: companies.length,
        },
        vehicles: {
          total: vehicles.length,
          available: availableVehicles.length,
          rented: rentedVehicles.length,
          maintenance: maintenanceVehicles.length,
          outOfService: outOfServiceVehicles.length,
        },
        contracts: {
          total: contracts.length,
          active: activeContracts.length,
          expiringSoon: expiringSoon.length,
        },
        payments: {
          totalThisMonth: totalPaymentsThisMonth,
          receiptsCount: receipts.length,
          paymentsCount: paymentOuts.length,
        },
        tasks: {
          total: tasks.length,
          pending: pendingTasks.length,
          inProgress: inProgressTasks.length,
          completed: completedTasks.length,
        },
        invoices: {
          total: invoices.length,
          unpaid: unpaidInvoices.length,
          overdueAmount,
        },
      };
    },
    enabled: !!companyId,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

// دالة لتوليد نص الإحصائيات للـ AI
export function generateStatsPrompt(stats: SystemStats | undefined): string {
  if (!stats) return '';

  return `
📊 إحصائيات النظام الحالية (بيانات حقيقية):

👥 العملاء:
- إجمالي العملاء: ${stats.customers.total}
- العملاء النشطين: ${stats.customers.active}
- أفراد: ${stats.customers.individuals} | شركات: ${stats.customers.companies}

🚗 المركبات:
- إجمالي المركبات: ${stats.vehicles.total}
- متاحة: ${stats.vehicles.available}
- مؤجرة: ${stats.vehicles.rented}
- في الصيانة: ${stats.vehicles.maintenance}
- خارج الخدمة: ${stats.vehicles.outOfService}

📄 العقود:
- إجمالي العقود: ${stats.contracts.total}
- العقود النشطة: ${stats.contracts.active}
- تنتهي خلال 30 يوم: ${stats.contracts.expiringSoon}

💰 المدفوعات (هذا الشهر):
- إجمالي المقبوضات: ${stats.payments.totalThisMonth.toLocaleString()} ريال
- عدد سندات القبض: ${stats.payments.receiptsCount}
- عدد سندات الصرف: ${stats.payments.paymentsCount}

✅ المهام:
- إجمالي المهام: ${stats.tasks.total}
- معلقة: ${stats.tasks.pending}
- قيد التنفيذ: ${stats.tasks.inProgress}
- مكتملة: ${stats.tasks.completed}

🧾 الفواتير:
- إجمالي الفواتير: ${stats.invoices.total}
- غير مسددة: ${stats.invoices.unpaid}
- المبلغ المستحق: ${stats.invoices.overdueAmount.toLocaleString()} ريال
`;
}

