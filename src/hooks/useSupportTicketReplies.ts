import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SupportTicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  attachments: any[];
  created_at: string;
  updated_at: string;
  user_profile?: {
    display_name: string;
    email: string;
  } | null;
}

export interface CreateReplyData {
  ticket_id: string;
  message: string;
  is_internal?: boolean;
  attachments?: any[];
}

export const useSupportTicketReplies = (ticketId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = user?.profile?.company_id;

  const assertTicketAccess = async () => {
    if (!companyId || !ticketId) throw new Error('تعذر تحديد التذكرة أو الشركة');
    const { error } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('id', ticketId)
      .eq('company_id', companyId)
      .single();
    if (error) throw error;
  };

  const {
    data: replies = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['support-ticket-replies', ticketId],
    queryFn: async () => {
      await assertTicketAccess();
      const { data, error } = await supabase
        .from('support_ticket_replies')
        .select(`
          *
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && !!companyId && !!ticketId
  });

  const createReplyMutation = useMutation({
    mutationFn: async (replyData: CreateReplyData) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      if (replyData.ticket_id !== ticketId) throw new Error('معرّف التذكرة غير متطابق');
      await assertTicketAccess();

      const { data, error } = await (supabase
        .from('support_ticket_replies') as any)
        .insert({
          ...replyData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-replies', ticketId] });
      toast.success('تم إضافة الرد بنجاح');
    },
    onError: (error) => {
      console.error('Error creating reply:', error);
      toast.error('حدث خطأ في إضافة الرد');
    }
  });

  const updateReplyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      if (!user) throw new Error('User not authenticated');
      await assertTicketAccess();
      const { data, error } = await supabase
        .from('support_ticket_replies')
        .update({ message, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('ticket_id', ticketId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-replies', ticketId] });
      toast.success('تم تحديث الرد بنجاح');
    },
    onError: (error) => {
      console.error('Error updating reply:', error);
      toast.error('حدث خطأ في تحديث الرد');
    }
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');
      await assertTicketAccess();
      const { error } = await supabase
        .from('support_ticket_replies')
        .delete()
        .eq('id', id)
        .eq('ticket_id', ticketId)
        .eq('user_id', user.id)
        .select('id')
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-replies', ticketId] });
      toast.success('تم حذف الرد بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting reply:', error);
      toast.error('حدث خطأ في حذف الرد');
    }
  });

  return {
    replies,
    isLoading,
    error,
    createReply: createReplyMutation.mutate,
    updateReply: updateReplyMutation.mutate,
    deleteReply: deleteReplyMutation.mutate,
    isCreating: createReplyMutation.isPending,
    isUpdating: updateReplyMutation.isPending,
    isDeleting: deleteReplyMutation.isPending
  };
};
