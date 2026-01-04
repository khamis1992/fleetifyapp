import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PersonalReminder {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  description?: string;
  reminder_time?: string;
  is_completed: boolean;
  completed_at?: string;
  related_entity?: {
    type?: string;
    id?: string;
    label?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  reminder_time?: string;
  priority?: PersonalReminder['priority'];
  related_entity?: PersonalReminder['related_entity'];
}

export interface UpdateReminderInput extends Partial<CreateReminderInput> {
  id: string;
  is_completed?: boolean;
}

// Fetch all reminders
export function usePersonalReminders(includeCompleted = false) {
  const { user } = useAuth();
  const userId = user?.profile?.id;
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['personal-reminders', userId, includeCompleted],
    queryFn: async () => {
      if (!userId || !companyId) return [];

      let query = supabase
        .from('personal_reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .order('reminder_time', { ascending: true, nullsFirst: false });

      if (!includeCompleted) {
        query = query.eq('is_completed', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PersonalReminder[];
    },
    enabled: !!userId && !!companyId,
  });
}

// Fetch today's reminders
export function useTodayReminders() {
  const { user } = useAuth();
  const userId = user?.profile?.id;
  const companyId = user?.profile?.company_id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return useQuery({
    queryKey: ['today-reminders', userId],
    queryFn: async () => {
      if (!userId || !companyId) return [];

      const { data, error } = await supabase
        .from('personal_reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_completed', false)
        .gte('reminder_time', today.toISOString())
        .lt('reminder_time', tomorrow.toISOString())
        .order('reminder_time', { ascending: true });

      if (error) throw error;
      return data as PersonalReminder[];
    },
    enabled: !!userId && !!companyId,
  });
}

// Fetch upcoming reminders
export function useUpcomingReminders(limit = 5) {
  const { user } = useAuth();
  const userId = user?.profile?.id;
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['upcoming-reminders', userId, limit],
    queryFn: async () => {
      if (!userId || !companyId) return [];

      const { data, error } = await supabase
        .from('personal_reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_completed', false)
        .gte('reminder_time', new Date().toISOString())
        .order('reminder_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as PersonalReminder[];
    },
    enabled: !!userId && !!companyId,
  });
}

// Create reminder
export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      const userId = user?.profile?.id;
      const companyId = user?.profile?.company_id;

      if (!userId || !companyId) {
        throw new Error('لم يتم تحديد المستخدم أو الشركة');
      }

      const { data, error } = await supabase
        .from('personal_reminders')
        .insert({
          ...input,
          user_id: userId,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PersonalReminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['today-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      toast.success('تم إضافة التذكير بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء إضافة التذكير');
    },
  });
}

// Update reminder
export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateReminderInput) => {
      const { id, ...data } = input;

      const updateData: any = { ...data };
      if (data.is_completed !== undefined) {
        updateData.completed_at = data.is_completed ? new Date().toISOString() : null;
      }

      const { data: reminder, error } = await supabase
        .from('personal_reminders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return reminder as PersonalReminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['today-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      toast.success('تم تحديث التذكير بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث التذكير');
    },
  });
}

// Toggle reminder completion
export function useToggleReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { data, error } = await supabase
        .from('personal_reminders')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PersonalReminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['today-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث التذكير');
    },
  });
}

// Delete reminder
export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personal_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['today-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      toast.success('تم حذف التذكير بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء حذف التذكير');
    },
  });
}

