import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface QuickNote {
  id: string;
  user_id: string;
  company_id: string;
  content: string;
  note_type: 'idea' | 'alert' | 'call' | 'reminder' | 'other';
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
  related_entity?: {
    type?: string;
    id?: string;
    label?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  content: string;
  note_type?: QuickNote['note_type'];
  color?: string;
  is_pinned?: boolean;
  related_entity?: QuickNote['related_entity'];
}

export interface UpdateNoteInput extends Partial<CreateNoteInput> {
  id: string;
  is_archived?: boolean;
}

export const noteTypeIcons: Record<QuickNote['note_type'], string> = {
  idea: '💡',
  alert: '⚠️',
  call: '📞',
  reminder: '⏰',
  other: '📝',
};

export const noteTypeLabels: Record<QuickNote['note_type'], string> = {
  idea: 'فكرة',
  alert: 'تنبيه',
  call: 'اتصال',
  reminder: 'تذكير',
  other: 'أخرى',
};

export const noteColors = [
  '#fef3c7', // amber-100
  '#dbeafe', // blue-100
  '#dcfce7', // green-100
  '#fce7f3', // pink-100
  '#e0e7ff', // indigo-100
  '#f3e8ff', // purple-100
  '#ffedd5', // orange-100
  '#f0fdf4', // emerald-100
];

// Fetch all notes
export function useQuickNotes(includeArchived = false) {
  const { user } = useAuth();
  const userId = user?.profile?.id;
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['quick-notes', userId, includeArchived],
    queryFn: async () => {
      if (!userId || !companyId) return [];

      let query = supabase
        .from('quick_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as QuickNote[];
    },
    enabled: !!userId && !!companyId,
  });
}

// Fetch pinned notes
export function usePinnedNotes() {
  const { user } = useAuth();
  const userId = user?.profile?.id;
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['pinned-notes', userId],
    queryFn: async () => {
      if (!userId || !companyId) return [];

      const { data, error } = await supabase
        .from('quick_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_pinned', true)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as QuickNote[];
    },
    enabled: !!userId && !!companyId,
  });
}

// Create note
export function useCreateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const userId = user?.profile?.id;
      const companyId = user?.profile?.company_id;

      if (!userId || !companyId) {
        throw new Error('لم يتم تحديد المستخدم أو الشركة');
      }

      const { data, error } = await supabase
        .from('quick_notes')
        .insert({
          ...input,
          user_id: userId,
          company_id: companyId,
          color: input.color || noteColors[Math.floor(Math.random() * noteColors.length)],
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuickNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-notes'] });
      queryClient.invalidateQueries({ queryKey: ['pinned-notes'] });
      toast.success('تم إضافة الملاحظة بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء إضافة الملاحظة');
    },
  });
}

// Update note
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateNoteInput) => {
      const { id, ...data } = input;

      const { data: note, error } = await supabase
        .from('quick_notes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return note as QuickNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-notes'] });
      queryClient.invalidateQueries({ queryKey: ['pinned-notes'] });
      toast.success('تم تحديث الملاحظة بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الملاحظة');
    },
  });
}

// Toggle pin
export function useToggleNotePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { data, error } = await supabase
        .from('quick_notes')
        .update({ is_pinned })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuickNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-notes'] });
      queryClient.invalidateQueries({ queryKey: ['pinned-notes'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الملاحظة');
    },
  });
}

// Archive note
export function useArchiveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_archived }: { id: string; is_archived: boolean }) => {
      const { data, error } = await supabase
        .from('quick_notes')
        .update({ is_archived })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuickNote;
    },
    onSuccess: (_, { is_archived }) => {
      queryClient.invalidateQueries({ queryKey: ['quick-notes'] });
      queryClient.invalidateQueries({ queryKey: ['pinned-notes'] });
      toast.success(is_archived ? 'تم أرشفة الملاحظة' : 'تم إلغاء الأرشفة');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الملاحظة');
    },
  });
}

// Delete note
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-notes'] });
      queryClient.invalidateQueries({ queryKey: ['pinned-notes'] });
      toast.success('تم حذف الملاحظة بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء حذف الملاحظة');
    },
  });
}






