import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  assigned_to?: string;
}

/**
 * Hook لجلب المهام المرتبطة بالعميل
 * يستخدم في Side Panel
 */
export function useCustomerTasks(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-tasks', customerId],
    queryFn: async (): Promise<CustomerTask[]> => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('customer_id', customerId)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  });
}

