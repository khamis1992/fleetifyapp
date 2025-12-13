/**
 * Hook لإدارة المتابعات المجدولة
 * Scheduled Follow-ups Management Hook
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduledFollowup {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id?: string;
  legal_case_id?: string;
  followup_type: 'call' | 'visit' | 'email' | 'whatsapp' | 'meeting';
  scheduled_date: string;
  scheduled_time?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'rescheduled' | 'missed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  description?: string;
  notes?: string;
  outcome?: 'answered' | 'no_answer' | 'busy' | 'rescheduled' | 'successful' | 'unsuccessful';
  outcome_notes?: string;
  completed_at?: string;
  assigned_to?: string;
  created_by?: string;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  source: string;
  source_reference?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: {
    id: string;
    customer_code: string;
    first_name?: string;
    last_name?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    phone?: string;
  };
  legal_case?: {
    id: string;
    case_number: string;
    case_title?: string;
  };
}

export interface CreateFollowupData {
  customer_id: string;
  contract_id?: string;
  legal_case_id?: string;
  followup_type: 'call' | 'visit' | 'email' | 'whatsapp' | 'meeting';
  scheduled_date: string;
  scheduled_time?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  description?: string;
  assigned_to?: string;
  source?: string;
  source_reference?: string;
}

export interface UpdateFollowupData {
  id: string;
  status?: 'pending' | 'completed' | 'cancelled' | 'rescheduled' | 'missed';
  outcome?: 'answered' | 'no_answer' | 'busy' | 'rescheduled' | 'successful' | 'unsuccessful';
  outcome_notes?: string;
  notes?: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

/**
 * جلب المتابعات المجدولة
 */
export const useScheduledFollowups = (options?: {
  status?: string;
  date?: string;
  customerId?: string;
  limit?: number;
}) => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['scheduled-followups', companyId, options],
    queryFn: async (): Promise<ScheduledFollowup[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('scheduled_followups')
        .select(`
          *,
          customer:customers!customer_id (
            id, customer_code, first_name, last_name, first_name_ar, last_name_ar, phone
          ),
          legal_case:legal_cases!legal_case_id (
            id, case_number, case_title
          )
        `)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.date) {
        query = query.eq('scheduled_date', options.date);
      }

      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching scheduled followups:', error);
        throw error;
      }

      return (data || []) as ScheduledFollowup[];
    },
    enabled: !!companyId,
  });
};

/**
 * جلب متابعات اليوم
 */
export const useTodayFollowups = () => {
  const today = new Date().toISOString().split('T')[0];
  return useScheduledFollowups({ date: today, status: 'pending' });
};

/**
 * جلب المتابعات القادمة
 */
export const useUpcomingFollowups = (limit: number = 10) => {
  const companyId = useCurrentCompanyId();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['upcoming-followups', companyId, limit],
    queryFn: async (): Promise<ScheduledFollowup[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('scheduled_followups')
        .select(`
          *,
          customer:customers!customer_id (
            id, customer_code, first_name, last_name, first_name_ar, last_name_ar, phone
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .order('priority', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching upcoming followups:', error);
        throw error;
      }

      return (data || []) as ScheduledFollowup[];
    },
    enabled: !!companyId,
  });
};

/**
 * إحصائيات المتابعات
 */
export const useFollowupStats = () => {
  const companyId = useCurrentCompanyId();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['followup-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // متابعات اليوم
      const { count: todayCount } = await supabase
        .from('scheduled_followups')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .eq('scheduled_date', today);

      // المتابعات المتأخرة
      const { count: overdueCount } = await supabase
        .from('scheduled_followups')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .lt('scheduled_date', today);

      // المتابعات العاجلة
      const { count: urgentCount } = await supabase
        .from('scheduled_followups')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .eq('priority', 'urgent');

      // المكتملة هذا الأسبوع
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: completedThisWeek } = await supabase
        .from('scheduled_followups')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo.toISOString());

      return {
        today: todayCount || 0,
        overdue: overdueCount || 0,
        urgent: urgentCount || 0,
        completedThisWeek: completedThisWeek || 0,
      };
    },
    enabled: !!companyId,
  });
};

/**
 * إنشاء متابعة جديدة
 */
export const useCreateFollowup = () => {
  const { user } = useAuth();
  const companyId = useCurrentCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFollowupData) => {
      if (!user?.id || !companyId) {
        throw new Error('User not authenticated');
      }

      const { data: followup, error } = await supabase
        .from('scheduled_followups')
        .insert({
          ...data,
          company_id: companyId,
          created_by: user.id,
          status: 'pending',
          priority: data.priority || 'normal',
          source: data.source || 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return followup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-followups'] });
      queryClient.invalidateQueries({ queryKey: ['followup-stats'] });
      toast.success('✅ تم جدولة المتابعة بنجاح');
    },
    onError: (error) => {
      console.error('Error creating followup:', error);
      toast.error('حدث خطأ أثناء جدولة المتابعة');
    },
  });
};

/**
 * تحديث متابعة
 */
export const useUpdateFollowup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateFollowupData) => {
      const updateData: Record<string, unknown> = { ...data };
      delete updateData.id;

      // إذا تم الإكمال، أضف وقت الإكمال
      if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: followup, error } = await supabase
        .from('scheduled_followups')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return followup;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-followups'] });
      queryClient.invalidateQueries({ queryKey: ['followup-stats'] });
      
      if (variables.status === 'completed') {
        toast.success('✅ تم إكمال المتابعة');
      } else if (variables.status === 'cancelled') {
        toast.info('تم إلغاء المتابعة');
      } else if (variables.status === 'rescheduled') {
        toast.info('تم إعادة جدولة المتابعة');
      }
    },
    onError: (error) => {
      console.error('Error updating followup:', error);
      toast.error('حدث خطأ أثناء تحديث المتابعة');
    },
  });
};

/**
 * إكمال متابعة بسرعة
 */
export const useCompleteFollowup = () => {
  const updateFollowup = useUpdateFollowup();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      outcome: 'answered' | 'no_answer' | 'busy' | 'successful' | 'unsuccessful';
      notes?: string;
    }) => {
      return updateFollowup.mutateAsync({
        id: params.id,
        status: 'completed',
        outcome: params.outcome,
        outcome_notes: params.notes,
      });
    },
  });
};

/**
 * إعادة جدولة متابعة
 */
export const useRescheduleFollowup = () => {
  const updateFollowup = useUpdateFollowup();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      newDate: string;
      newTime?: string;
      notes?: string;
    }) => {
      return updateFollowup.mutateAsync({
        id: params.id,
        status: 'rescheduled',
        scheduled_date: params.newDate,
        scheduled_time: params.newTime,
        notes: params.notes,
      });
    },
  });
};

