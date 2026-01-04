import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserGoal {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  description?: string;
  target_count: number;
  current_count: number;
  period_type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date?: string;
  category?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  target_count: number;
  period_type?: UserGoal['period_type'];
  start_date?: string;
  end_date?: string;
  category?: string;
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  id: string;
  current_count?: number;
  is_completed?: boolean;
}

// Get period date range
function getPeriodDateRange(periodType: UserGoal['period_type']) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate: Date;
  let endDate: Date;

  switch (periodType) {
    case 'daily':
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'weekly':
      // Get start of week (Sunday)
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'monthly':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      break;
  }

  return { startDate, endDate };
}

// Fetch all goals
export function useUserGoals(periodType?: UserGoal['period_type']) {
  const { user } = useAuth();
  const userId = user?.profile?.id;
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['user-goals', userId, periodType],
    queryFn: async () => {
      if (!userId || !companyId) return [];

      let query = supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (periodType) {
        query = query.eq('period_type', periodType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserGoal[];
    },
    enabled: !!userId && !!companyId,
  });
}

// Fetch active goals (current period)
export function useActiveGoals() {
  const { user } = useAuth();
  const userId = user?.profile?.id;
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['active-goals', userId],
    queryFn: async () => {
      if (!userId || !companyId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_completed', false)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('period_type', { ascending: true });

      if (error) throw error;
      return data as UserGoal[];
    },
    enabled: !!userId && !!companyId,
  });
}

// Create goal
export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const userId = user?.profile?.id;
      const companyId = user?.profile?.company_id;

      if (!userId || !companyId) {
        throw new Error('لم يتم تحديد المستخدم أو الشركة');
      }

      const periodType = input.period_type || 'daily';
      const { startDate, endDate } = getPeriodDateRange(periodType);

      const { data, error } = await supabase
        .from('user_goals')
        .insert({
          ...input,
          user_id: userId,
          company_id: companyId,
          start_date: input.start_date || startDate.toISOString().split('T')[0],
          end_date: input.end_date || endDate.toISOString().split('T')[0],
          current_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
      toast.success('تم إنشاء الهدف بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء إنشاء الهدف');
    },
  });
}

// Update goal
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGoalInput) => {
      const { id, ...data } = input;

      const updateData: any = { ...data };
      
      // Check if goal is completed
      if (data.current_count !== undefined && data.target_count !== undefined) {
        if (data.current_count >= data.target_count) {
          updateData.is_completed = true;
          updateData.completed_at = new Date().toISOString();
        }
      }

      const { data: goal, error } = await supabase
        .from('user_goals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return goal as UserGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
      toast.success('تم تحديث الهدف بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الهدف');
    },
  });
}

// Increment goal progress
export function useIncrementGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, increment = 1 }: { id: string; increment?: number }) => {
      // First get current goal
      const { data: goal, error: fetchError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newCount = Math.min(goal.current_count + increment, goal.target_count);
      const isCompleted = newCount >= goal.target_count;

      const { data, error } = await supabase
        .from('user_goals')
        .update({
          current_count: newCount,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UserGoal;
    },
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
      if (goal.is_completed) {
        toast.success('🎉 تهانينا! تم إكمال الهدف');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث التقدم');
    },
  });
}

// Delete goal
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
      toast.success('تم حذف الهدف بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء حذف الهدف');
    },
  });
}

// Reset daily goals (utility function)
export function useResetDailyGoals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const userId = user?.profile?.id;
      const companyId = user?.profile?.company_id;

      if (!userId || !companyId) {
        throw new Error('لم يتم تحديد المستخدم أو الشركة');
      }

      const today = new Date();
      const { startDate, endDate } = getPeriodDateRange('daily');

      // Create new daily goals from templates (copy yesterday's daily goals)
      const { data: oldGoals, error: fetchError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('period_type', 'daily')
        .eq('is_completed', false);

      if (fetchError) throw fetchError;

      // Reset current_count for today
      if (oldGoals && oldGoals.length > 0) {
        const { error: updateError } = await supabase
          .from('user_goals')
          .update({
            current_count: 0,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
          })
          .eq('user_id', userId)
          .eq('period_type', 'daily');

        if (updateError) throw updateError;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
      queryClient.invalidateQueries({ queryKey: ['active-goals'] });
    },
  });
}

