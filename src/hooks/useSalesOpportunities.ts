import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SalesOpportunity {
  id: string;
  company_id: string;
  lead_id?: string;
  opportunity_name: string;
  opportunity_name_ar?: string;
  stage: string;
  estimated_value: number;
  probability: number;
  expected_close_date?: string;
  assigned_to?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOpportunityFilters {
  stage?: string;
  assigned_to?: string;
  is_active?: boolean;
  search?: string;
}

export const useSalesOpportunities = (filters?: SalesOpportunityFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-opportunities', user?.profile?.company_id, filters],
    queryFn: async (): Promise<SalesOpportunity[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('sales_opportunities')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`opportunity_name.ilike.%${filters.search}%,opportunity_name_ar.ilike.%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales opportunities:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useSalesOpportunity = (opportunityId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-opportunity', opportunityId],
    queryFn: async (): Promise<SalesOpportunity | null> => {
      if (!user?.profile?.company_id || !opportunityId) {
        return null;
      }

      const { data, error } = await supabase
        .from('sales_opportunities')
        .select('*')
        .eq('id', opportunityId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching sales opportunity:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.profile?.company_id && !!opportunityId,
  });
};

export const useCreateSalesOpportunity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (opportunityData: Omit<SalesOpportunity, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('sales_opportunities')
        .insert({
          ...opportunityData,
          company_id: user.profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sales opportunity:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-metrics'] });
      toast({
        title: 'تم إضافة الفرصة البيعية',
        description: 'تم إضافة الفرصة البيعية بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating sales opportunity:', error);
      toast({
        title: 'خطأ في إضافة الفرصة البيعية',
        description: 'حدث خطأ أثناء إضافة الفرصة البيعية.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSalesOpportunity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesOpportunity> }) => {
      const { data: result, error } = await supabase
        .from('sales_opportunities')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating sales opportunity:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['sales-opportunity'] });
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-metrics'] });
      toast({
        title: 'تم تحديث الفرصة البيعية',
        description: 'تم تحديث بيانات الفرصة البيعية بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating sales opportunity:', error);
      toast({
        title: 'خطأ في تحديث الفرصة البيعية',
        description: 'حدث خطأ أثناء تحديث بيانات الفرصة البيعية.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSalesOpportunity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (opportunityId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('sales_opportunities')
        .update({ is_active: false })
        .eq('id', opportunityId);

      if (error) {
        console.error('Error deleting sales opportunity:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-metrics'] });
      toast({
        title: 'تم حذف الفرصة البيعية',
        description: 'تم حذف الفرصة البيعية بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error deleting sales opportunity:', error);
      toast({
        title: 'خطأ في حذف الفرصة البيعية',
        description: 'حدث خطأ أثناء حذف الفرصة البيعية.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateOpportunityStage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { data, error } = await supabase
        .from('sales_opportunities')
        .update({ stage })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating opportunity stage:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['sales-opportunity'] });
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-metrics'] });
      toast({
        title: 'تم تحديث مرحلة الفرصة',
        description: 'تم نقل الفرصة البيعية إلى المرحلة الجديدة.',
      });
    },
    onError: (error) => {
      console.error('Error updating opportunity stage:', error);
      toast({
        title: 'خطأ في تحديث المرحلة',
        description: 'حدث خطأ أثناء تحديث مرحلة الفرصة البيعية.',
        variant: 'destructive',
      });
    },
  });
};

export const useSalesPipelineMetrics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-pipeline-metrics', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('sales_pipeline_metrics')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching pipeline metrics:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.profile?.company_id,
  });
};
