import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: string;
  color: string;
  created_at: string;
}

export const useRecentActivities = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['recent-activities', user?.profile?.company_id],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const activities: RecentActivity[] = [];
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 7); // Get activities from last 7 days

      // Get recent contracts
      const { data: recentContracts } = await supabase
        .from('contracts')
        .select(`
          id, 
          contract_number, 
          created_at,
          customers(first_name, last_name, first_name_ar, last_name_ar)
        `)
        .eq('company_id', user.profile.company_id)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      recentContracts?.forEach(contract => {
        const customer = contract.customers as any;
        const customerName = customer?.first_name_ar && customer?.last_name_ar 
          ? `${customer.first_name_ar} ${customer.last_name_ar}`
          : `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'عميل غير محدد';

        activities.push({
          id: `contract-${contract.id}`,
          type: 'عقد جديد',
          description: `تم إنشاء عقد جديد للعميل ${customerName} - رقم العقد: ${contract.contract_number}`,
          time: getRelativeTime(contract.created_at),
          icon: 'FileText',
          color: 'text-green-600',
          created_at: contract.created_at
        });
      });

      // Get recent customers
      const { data: recentCustomers } = await supabase
        .from('customers')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, created_at')
        .eq('company_id', user.profile.company_id)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      recentCustomers?.forEach(customer => {
        const customerName = customer.first_name_ar && customer.last_name_ar 
          ? `${customer.first_name_ar} ${customer.last_name_ar}`
          : `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'عميل غير محدد';

        activities.push({
          id: `customer-${customer.id}`,
          type: 'عميل جديد',
          description: `تم تسجيل عميل جديد: ${customerName}`,
          time: getRelativeTime(customer.created_at),
          icon: 'Users',
          color: 'text-blue-600',
          created_at: customer.created_at
        });
      });

      // Get recent maintenance requests
      const { data: recentMaintenance } = await supabase
        .from('vehicle_maintenance')
        .select(`
          id, 
          created_at, 
          status,
          vehicles(plate_number)
        `)
        .eq('company_id', user.profile.company_id)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      recentMaintenance?.forEach(maintenance => {
        const vehicle = maintenance.vehicles as any;
        activities.push({
          id: `maintenance-${maintenance.id}`,
          type: 'طلب صيانة',
          description: `تم طلب صيانة للمركبة ذات اللوحة ${vehicle?.plate_number || 'غير محددة'}`,
          time: getRelativeTime(maintenance.created_at),
          icon: 'AlertTriangle',
          color: 'text-amber-600',
          created_at: maintenance.created_at
        });
      });

      // Sort all activities by created_at and return top 5
      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `منذ ${diffInMinutes} دقيقة`;
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `منذ ${hours} ساعة`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `منذ ${days} يوم`;
  }
}