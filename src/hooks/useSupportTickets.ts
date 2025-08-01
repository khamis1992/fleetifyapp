import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  company_id: string;
  created_by: string;
  assigned_to?: string;
  category_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    name_ar: string;
    color: string;
  };
  created_by_profile?: {
    display_name: string;
    email: string;
  } | null;
  assigned_to_profile?: {
    display_name: string;
    email: string;
  } | null;
}

export interface CreateTicketData {
  title: string;
  description: string;
  category_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  category_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  assigned_to?: string;
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
  resolved_at?: string;
  closed_at?: string;
}

export const useSupportTickets = () => {
  const { user } = useAuth();
  const { filter, loading: companyLoading } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  console.log('🎫 [SUPPORT_TICKETS] Hook state:', {
    user: !!user,
    companyLoading,
    filter,
    filterCompanyId: filter?.company_id
  });

  const {
    data: tickets = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['support-tickets', filter],
    queryFn: async () => {
      console.log('🎫 [SUPPORT_TICKETS] Query function called with filter:', filter);
      
      // Skip query if still loading company data
      if (filter.company_id === 'loading') {
        throw new Error('Company data still loading');
      }

      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          category:support_ticket_categories(id, name, name_ar, color)
        `)
        .order('created_at', { ascending: false });

      if (filter.company_id) {
        query = query.eq('company_id', filter.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && !companyLoading && filter.company_id !== 'loading'
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: CreateTicketData) => {
      console.log('🎫 [CREATE_TICKET] Starting ticket creation with:', {
        user: !!user,
        userId: user?.id,
        companyId: filter?.company_id,
        companyLoading,
        ticketData
      });

      // Enhanced validation with better error messages
      if (!user) {
        console.error('🎫 [CREATE_TICKET] No user found');
        throw new Error('المستخدم غير مصادق عليه. يرجى تسجيل الدخول مرة أخرى.');
      }

      if (companyLoading || filter.company_id === 'loading') {
        console.error('🎫 [CREATE_TICKET] Company data still loading');
        throw new Error('جاري تحميل بيانات الشركة. يرجى المحاولة مرة أخرى.');
      }

      if (!filter.company_id || filter.company_id === 'no-access') {
        console.error('🎫 [CREATE_TICKET] No company ID found');
        throw new Error('لم يتم العثور على معرف الشركة. يرجى التأكد من الصلاحيات.');
      }

      console.log('🎫 [CREATE_TICKET] Validation passed, creating ticket...');

      const { data, error } = await (supabase
        .from('support_tickets') as any)
        .insert({
          ...ticketData,
          company_id: filter.company_id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('🎫 [CREATE_TICKET] Database error:', error);
        throw error;
      }
      
      console.log('🎫 [CREATE_TICKET] Ticket created successfully:', data?.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('تم إنشاء التذكرة بنجاح');
    },
    onError: (error) => {
      console.error('🎫 [CREATE_TICKET] Error creating ticket:', error);
      const errorMessage = error.message || 'حدث خطأ غير متوقع في إنشاء التذكرة';
      toast.error(errorMessage);
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTicketData }) => {
      const updateData = { ...updates };
      
      // تحديث التواريخ بناءً على حالة التذكرة
      if (updates.status === 'resolved' && !updateData.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }
      if (updates.status === 'closed' && !updateData.closed_at) {
        updateData.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('تم تحديث التذكرة بنجاح');
    },
    onError: (error) => {
      console.error('Error updating ticket:', error);
      toast.error('حدث خطأ في تحديث التذكرة');
    }
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('تم حذف التذكرة بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting ticket:', error);
      toast.error('حدث خطأ في حذف التذكرة');
    }
  });

  return {
    tickets,
    isLoading,
    error,
    createTicket: createTicketMutation.mutate,
    updateTicket: updateTicketMutation.mutate,
    deleteTicket: deleteTicketMutation.mutate,
    isCreating: createTicketMutation.isPending,
    isUpdating: updateTicketMutation.isPending,
    isDeleting: deleteTicketMutation.isPending
  };
};

export const useSupportTicket = (ticketId: string) => {
  const { user } = useAuth();

  const {
    data: ticket,
    isLoading,
    error
  } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          category:support_ticket_categories(id, name, name_ar, color)
        `)
        .eq('id', ticketId)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!user && !!ticketId
  });

  return {
    ticket,
    isLoading,
    error
  };
};

export const useSupportTicketCategories = () => {
  const {
    data: categories = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['support-ticket-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_ticket_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  return {
    categories,
    isLoading,
    error
  };
};