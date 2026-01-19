/**
 * Hook لجلب وإدارة سجل تفاعلات العميل في CRM
 * يدعم الملاحظات، المكالمات، الرسائل، والمتابعات
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CustomerActivity {
  id: string;
  customer_id: string;
  note_type: 'phone' | 'whatsapp' | 'email' | 'note' | 'followup' | 'message';
  title?: string;
  content: string;
  is_important: boolean;
  call_status?: 'answered' | 'no_answer' | 'busy';
  created_at: string;
  created_by?: string;
}

export interface AddActivityInput {
  note_type: 'phone' | 'whatsapp' | 'email' | 'note';
  title?: string;
  content: string;
  is_important?: boolean;
  call_status?: 'answered' | 'no_answer' | 'busy';
}

export function useCustomerCRMActivity(customerId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // جلب سجل التفاعلات
  const { 
    data: activities = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['customer-crm-activities', customerId],
    queryFn: async (): Promise<CustomerActivity[]> => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      return (data || []).map(note => ({
        id: note.id,
        customer_id: note.customer_id,
        note_type: note.note_type || 'note',
        title: note.title,
        content: note.content || '',
        is_important: note.is_important || false,
        call_status: note.call_status,
        created_at: note.created_at,
        created_by: note.created_by,
      }));
    },
    enabled: !!customerId,
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  // إضافة تفاعل جديد
  const addActivityMutation = useMutation({
    mutationFn: async (input: AddActivityInput) => {
      if (!customerId || !user?.company_id) {
        throw new Error('Missing customer or company ID');
      }

      const { data, error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          company_id: user.company_id,
          note_type: input.note_type,
          title: input.title || null,
          content: input.content,
          is_important: input.is_important || false,
          call_status: input.call_status || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // تحديث القائمة
      queryClient.invalidateQueries({ queryKey: ['customer-crm-activities', customerId] });
      // تحديث بيانات CRM الرئيسية
      queryClient.invalidateQueries({ queryKey: ['crm-customers-optimized'] });
    },
  });

  // دالة مساعدة لإضافة تفاعل
  const addActivity = async (input: AddActivityInput) => {
    return addActivityMutation.mutateAsync(input);
  };

  // إحصائيات سريعة
  const stats = {
    total: activities.length,
    calls: activities.filter(a => a.note_type === 'phone').length,
    successfulCalls: activities.filter(a => a.note_type === 'phone' && a.call_status === 'answered').length,
    missedCalls: activities.filter(a => a.note_type === 'phone' && a.call_status === 'no_answer').length,
    messages: activities.filter(a => a.note_type === 'whatsapp' || a.note_type === 'message').length,
    notes: activities.filter(a => a.note_type === 'note').length,
  };

  return {
    activities,
    isLoading,
    error,
    refetch,
    addActivity,
    isAdding: addActivityMutation.isPending,
    stats,
  };
}

