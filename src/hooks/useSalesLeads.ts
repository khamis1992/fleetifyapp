import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SalesLead {
  id: string;
  company_id: string;
  lead_name: string;
  lead_name_ar?: string;
  email?: string;
  phone?: string;
  source?: string;
  status: string;
  assigned_to?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesLeadFilters {
  status?: string;
  source?: string;
  assigned_to?: string;
  is_active?: boolean;
  search?: string;
}

export const useSalesLeads = (filters?: SalesLeadFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-leads', user?.profile?.company_id, filters],
    queryFn: async (): Promise<SalesLead[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('sales_leads')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.source) {
        query = query.eq('source', filters.source);
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`lead_name.ilike.%${filters.search}%,lead_name_ar.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales leads:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useSalesLead = (leadId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-lead', leadId],
    queryFn: async (): Promise<SalesLead | null> => {
      if (!user?.profile?.company_id || !leadId) {
        return null;
      }

      const { data, error } = await supabase
        .from('sales_leads')
        .select('*')
        .eq('id', leadId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching sales lead:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.profile?.company_id && !!leadId,
  });
};

export const useCreateSalesLead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leadData: Omit<SalesLead, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('sales_leads')
        .insert({
          ...leadData,
          company_id: user.profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sales lead:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      toast({
        title: 'تم إضافة العميل المحتمل',
        description: 'تم إضافة العميل المحتمل بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating sales lead:', error);
      toast({
        title: 'خطأ في إضافة العميل المحتمل',
        description: 'حدث خطأ أثناء إضافة العميل المحتمل.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSalesLead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesLead> }) => {
      const { data: result, error } = await supabase
        .from('sales_leads')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating sales lead:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-lead'] });
      toast({
        title: 'تم تحديث العميل المحتمل',
        description: 'تم تحديث بيانات العميل المحتمل بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating sales lead:', error);
      toast({
        title: 'خطأ في تحديث العميل المحتمل',
        description: 'حدث خطأ أثناء تحديث بيانات العميل المحتمل.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSalesLead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leadId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('sales_leads')
        .update({ is_active: false })
        .eq('id', leadId);

      if (error) {
        console.error('Error deleting sales lead:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      toast({
        title: 'تم حذف العميل المحتمل',
        description: 'تم حذف العميل المحتمل بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error deleting sales lead:', error);
      toast({
        title: 'خطأ في حذف العميل المحتمل',
        description: 'حدث خطأ أثناء حذف العميل المحتمل.',
        variant: 'destructive',
      });
    },
  });
};
