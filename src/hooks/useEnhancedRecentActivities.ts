import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EnhancedActivity {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  amount?: number;
  status?: string;
}

export const useEnhancedRecentActivities = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['enhanced-recent-activities', user?.profile?.company_id],
    queryFn: async (): Promise<EnhancedActivity[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const companyId = user.profile.company_id;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activities: EnhancedActivity[] = [];

      // Fetch contracts created/updated in last 30 days
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id, contract_number, status, contract_amount, created_at, updated_at,
          customers!inner(first_name, last_name, first_name_ar, last_name_ar)
        `)
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      contracts?.forEach(contract => {
        const customer = Array.isArray(contract.customers) ? contract.customers[0] : contract.customers;
        const customerName = customer?.first_name_ar || customer?.first_name || 'عميل';
        activities.push({
          id: `contract-${contract.id}`,
          type: 'عقد جديد',
          description: `تم إنشاء عقد #${contract.contract_number} للعميل ${customerName}`,
          time: getRelativeTime(contract.created_at),
          icon: 'FileText',
          color: 'text-green-600 bg-green-100',
          priority: 'high',
          created_at: contract.created_at,
          amount: contract.contract_amount,
          status: contract.status
        });
      });

      // Fetch customers created in last 30 days
      const { data: customers } = await supabase
        .from('customers')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, created_at')
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      customers?.forEach(customer => {
        const name = customer.first_name_ar || customer.first_name || 'عميل جديد';
        activities.push({
          id: `customer-${customer.id}`,
          type: 'عميل جديد',
          description: `تم تسجيل العميل ${name}`,
          time: getRelativeTime(customer.created_at),
          icon: 'Users',
          color: 'text-blue-600 bg-blue-100',
          priority: 'medium',
          created_at: customer.created_at
        });
      });

      // Fetch vehicles added in last 30 days
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, created_at')
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      vehicles?.forEach(vehicle => {
        activities.push({
          id: `vehicle-${vehicle.id}`,
          type: 'مركبة جديدة',
          description: `تم إضافة المركبة ${vehicle.plate_number} (${vehicle.make} ${vehicle.model})`,
          time: getRelativeTime(vehicle.created_at),
          icon: 'Car',
          color: 'text-purple-600 bg-purple-100',
          priority: 'medium',
          created_at: vehicle.created_at
        });
      });

      // Fetch maintenance requests in last 30 days
      const { data: maintenance } = await supabase
        .from('vehicle_maintenance')
        .select(`
          id, maintenance_number, status, estimated_cost, created_at,
          vehicles!inner(plate_number)
        `)
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      maintenance?.forEach(maint => {
        const priority = maint.status === 'in_progress' ? 'high' : 'medium';
        const color = maint.status === 'completed' ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100';
        
        const vehicle = Array.isArray(maint.vehicles) ? maint.vehicles[0] : maint.vehicles;
        activities.push({
          id: `maintenance-${maint.id}`,
          type: 'صيانة',
          description: `${getMaintenanceStatusText(maint.status)} ${maint.maintenance_number} للمركبة ${vehicle?.plate_number}`,
          time: getRelativeTime(maint.created_at),
          icon: 'Wrench',
          color,
          priority,
          created_at: maint.created_at,
          amount: maint.estimated_cost,
          status: maint.status
        });
      });

      // Fetch payments in last 30 days
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id, payment_number, amount, payment_type, status, created_at,
          customers!inner(first_name, last_name, first_name_ar, last_name_ar)
        `)
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      payments?.forEach(payment => {
        const customer = Array.isArray(payment.customers) ? payment.customers[0] : payment.customers;
        const customerName = customer?.first_name_ar || customer?.first_name || 'عميل';
        const typeText = payment.payment_type === 'receipt' ? 'استلام دفعة' : 'دفع مستحق';
        
        activities.push({
          id: `payment-${payment.id}`,
          type: 'دفعة مالية',
          description: `${typeText} #${payment.payment_number} من ${customerName}`,
          time: getRelativeTime(payment.created_at),
          icon: 'DollarSign',
          color: 'text-emerald-600 bg-emerald-100',
          priority: 'high',
          created_at: payment.created_at,
          amount: payment.amount,
          status: payment.status
        });
      });

      // Fetch employees added in last 30 days
      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, position, position_ar, created_at')
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      employees?.forEach(employee => {
        const name = employee.first_name_ar || employee.first_name || 'موظف جديد';
        const position = employee.position_ar || employee.position || '';
        
        activities.push({
          id: `employee-${employee.id}`,
          type: 'موظف جديد',
          description: `تم إضافة الموظف ${name} ${position ? `- ${position}` : ''}`,
          time: getRelativeTime(employee.created_at),
          icon: 'UserPlus',
          color: 'text-indigo-600 bg-indigo-100',
          priority: 'medium',
          created_at: employee.created_at
        });
      });

      // Sort all activities by created_at and return top 15
      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

function getMaintenanceStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'طلب صيانة',
    'in_progress': 'جاري صيانة',
    'completed': 'اكتملت صيانة',
    'cancelled': 'ألغيت صيانة'
  };
  return statusMap[status] || 'صيانة';
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'الآن';
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `منذ ${diffInDays} يوم`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `منذ ${diffInMonths} شهر`;
}