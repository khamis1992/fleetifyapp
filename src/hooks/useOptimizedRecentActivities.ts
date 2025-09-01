import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface OptimizedActivity {
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

export const useOptimizedRecentActivities = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['optimized-recent-activities']),
    queryFn: async (): Promise<OptimizedActivity[]> => {
      if (!companyId) {
        return [];
      }

      // Use optimized query without the problematic foreign key relationship
      const { data: activities, error } = await supabase
        .from('system_logs')
        .select(`
          id,
          category,
          action,
          message,
          level,
          created_at,
          user_id
        `)
        .eq('company_id', companyId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) {
        console.error('Error fetching optimized activities:', error);
        return [];
      }

      // Transform the database results to our activity format
      return activities?.map(activity => ({
        id: activity.id,
        type: getCategoryDisplayName(activity.category),
        description: activity.message || getActivityDescription(activity),
        time: getRelativeTime(activity.created_at),
        icon: getCategoryIcon(activity.category),
        color: getCategoryColor(activity.category, activity.level),
        priority: getPriorityFromLevel(activity.level),
        created_at: activity.created_at,
        status: activity.action
      })) || [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Remove unused function

function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    'contracts': 'عقد',
    'customers': 'عميل',
    'fleet': 'مركبة',
    'hr': 'موظف',
    'finance': 'مالية',
    'system': 'نظام'
  };
  return categoryMap[category] || category;
}

function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'contracts': 'FileText',
    'customers': 'Users',
    'fleet': 'Car',
    'hr': 'UserPlus',
    'finance': 'DollarSign',
    'system': 'Settings'
  };
  return iconMap[category] || 'Activity';
}

function getCategoryColor(category: string, level: string): string {
  if (level === 'error') return 'text-red-600 bg-red-100';
  if (level === 'warning') return 'text-orange-600 bg-orange-100';
  
  const colorMap: Record<string, string> = {
    'contracts': 'text-green-600 bg-green-100',
    'customers': 'text-blue-600 bg-blue-100',
    'fleet': 'text-purple-600 bg-purple-100',
    'hr': 'text-indigo-600 bg-indigo-100',
    'finance': 'text-emerald-600 bg-emerald-100',
    'system': 'text-gray-600 bg-gray-100'
  };
  return colorMap[category] || 'text-gray-600 bg-gray-100';
}

function getPriorityFromLevel(level: string): 'high' | 'medium' | 'low' {
  if (level === 'error') return 'high';
  if (level === 'warning') return 'medium';
  return 'low';
}

function getActivityDescription(activity: any): string {
  if (activity.message) return activity.message;
  
  const actionMap: Record<string, string> = {
    'create': 'تم إنشاء',
    'update': 'تم تحديث',
    'delete': 'تم حذف'
  };
  
  const action = actionMap[activity.action] || activity.action;
  const resourceType = getCategoryDisplayName(activity.category);
  
  return `${action} ${resourceType}`;
}

function getTableDisplayName(tableName: string): string {
  const tableMap: Record<string, string> = {
    'contracts': 'عقد جديد',
    'customers': 'عميل جديد',
    'vehicles': 'مركبة جديدة',
    'employees': 'موظف جديد',
    'payments': 'دفعة مالية',
    'vehicle_maintenance': 'صيانة'
  };
  return tableMap[tableName] || tableName;
}

function getTableIcon(tableName: string): string {
  const iconMap: Record<string, string> = {
    'contracts': 'FileText',
    'customers': 'Users',
    'vehicles': 'Car',
    'employees': 'UserPlus',
    'payments': 'DollarSign',
    'vehicle_maintenance': 'Wrench'
  };
  return iconMap[tableName] || 'Activity';
}

function getTableColor(tableName: string): string {
  const colorMap: Record<string, string> = {
    'contracts': 'text-green-600 bg-green-100',
    'customers': 'text-blue-600 bg-blue-100',
    'vehicles': 'text-purple-600 bg-purple-100',
    'employees': 'text-indigo-600 bg-indigo-100',
    'payments': 'text-emerald-600 bg-emerald-100',
    'vehicle_maintenance': 'text-orange-600 bg-orange-100'
  };
  return colorMap[tableName] || 'text-gray-600 bg-gray-100';
}

function generateDescription(item: any): string {
  // Generate description based on table and data
  switch (item.table_name) {
    case 'contracts':
      return `تم إنشاء عقد #${item.contract_number || item.record_id}`;
    case 'customers':
      return `تم تسجيل العميل ${item.first_name || 'جديد'}`;
    case 'vehicles':
      return `تم إضافة المركبة ${item.plate_number || 'جديدة'}`;
    case 'employees':
      return `تم إضافة الموظف ${item.first_name || 'جديد'}`;
    case 'payments':
      return `تم ${item.payment_type === 'receipt' ? 'استلام' : 'دفع'} مبلغ ${item.amount || 0}`;
    case 'vehicle_maintenance':
      return `طلب صيانة للمركبة ${item.plate_number || ''}`;
    default:
      return `نشاط جديد في ${getTableDisplayName(item.table_name)}`;
  }
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