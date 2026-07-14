import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

type ActivityType = 'phone' | 'whatsapp' | 'email' | 'note' | 'followup' | 'message';
type CallStatus = 'answered' | 'no_answer' | 'busy';

export interface CustomerActivity {
  id: string;
  customer_id: string;
  note_type: ActivityType;
  title?: string;
  content: string;
  is_important: boolean;
  call_status?: CallStatus;
  created_at: string;
  created_by?: string;
}

export interface AddActivityInput {
  note_type: 'phone' | 'whatsapp' | 'email' | 'note';
  title?: string;
  content: string;
  is_important?: boolean;
  call_status?: CallStatus;
}

const activityTitles: Record<AddActivityInput['note_type'], string> = {
  phone: 'مكالمة هاتفية',
  whatsapp: 'رسالة واتساب',
  email: 'بريد إلكتروني',
  note: 'ملاحظة',
};

function activityType(value: string): ActivityType {
  return ['phone', 'whatsapp', 'email', 'note', 'followup', 'message'].includes(value)
    ? value as ActivityType
    : 'note';
}

function callStatus(value: string | null): CallStatus | undefined {
  return value === 'answered' || value === 'no_answer' || value === 'busy' ? value : undefined;
}

export function useCustomerCRMActivity(customerId: string | null) {
  const { user, companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customer-crm-activities', companyId, customerId],
    queryFn: async (): Promise<CustomerActivity[]> => {
      if (!customerId || !companyId) return [];

      const { data, error: queryError } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (queryError) throw queryError;
      return (data || []).map(note => ({
        id: note.id,
        customer_id: note.customer_id,
        note_type: activityType(note.note_type),
        title: note.title || undefined,
        content: note.content,
        is_important: note.is_important ?? false,
        call_status: callStatus(note.call_status),
        created_at: note.created_at,
        created_by: note.created_by ?? undefined,
      }));
    },
    enabled: Boolean(companyId && customerId),
    staleTime: 60_000,
  });

  const addActivityMutation = useMutation({
    mutationFn: async (input: AddActivityInput) => {
      if (!customerId || !companyId || !user?.id) throw new Error('بيانات العميل أو الشركة غير مكتملة');
      const content = input.content.trim();
      if (!content) throw new Error('محتوى التفاعل مطلوب');

      const { data, error: insertError } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          company_id: companyId,
          note_type: input.note_type,
          title: input.title?.trim() || activityTitles[input.note_type],
          content,
          is_important: input.is_important ?? false,
          call_status: input.note_type === 'phone' ? input.call_status : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer-crm-activities', companyId, customerId] });
      void queryClient.invalidateQueries({ queryKey: ['crm-customers-optimized'] });
    },
  });

  const stats = {
    total: activities.length,
    calls: activities.filter(activity => activity.note_type === 'phone').length,
    successfulCalls: activities.filter(activity => activity.note_type === 'phone' && activity.call_status === 'answered').length,
    missedCalls: activities.filter(activity => activity.note_type === 'phone' && activity.call_status === 'no_answer').length,
    messages: activities.filter(activity => activity.note_type === 'whatsapp' || activity.note_type === 'message').length,
    notes: activities.filter(activity => activity.note_type === 'note').length,
  };

  return {
    activities,
    isLoading,
    error,
    refetch,
    addActivity: addActivityMutation.mutateAsync,
    isAdding: addActivityMutation.isPending,
    stats,
  };
}
