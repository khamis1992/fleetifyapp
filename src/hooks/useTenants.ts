import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import type { Tenant, TenantFilters, CreateTenantRequest, UpdateTenantRequest } from '@/types/tenant';

export const useTenants = (filters: TenantFilters = {}) => {
  const { filter } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['tenants', filter, filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('tenants')
        .select('*')
        .eq('is_active', true);

      if (filter.company_id) {
        query = query.eq('company_id', filter.company_id);
      }

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%,tenant_code.ilike.%${filters.search}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.tenant_type) {
        query = query.eq('tenant_type', filters.tenant_type);
      }

      if (filters.nationality) {
        query = query.eq('nationality', filters.nationality);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as Tenant[];
    },
  });
};

export const useTenant = (id: string) => {
  const { filter } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['tenant', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('*')
        .eq('id', id)
        .eq('company_id', filter.company_id)
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    enabled: !!id,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { filter } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (tenantData: CreateTenantRequest) => {
      // Generate tenant code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_tenant_code', {
          company_id_param: filter.company_id,
          tenant_type_param: tenantData.tenant_type
        });

      if (codeError) throw codeError;

      const insertData = {
        ...tenantData,
        company_id: filter.company_id,
        tenant_code: codeData,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data, error } = await (supabase as any)
        .from('tenants')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: "تم إنشاء المستأجر بنجاح",
        description: "تم إضافة المستأجر الجديد إلى النظام",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء المستأجر",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTenantRequest }) => {
      const updateData = {
        ...updates,
        updated_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await (supabase as any)
        .from('tenants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast({
        title: "تم تحديث المستأجر بنجاح",
        description: "تم حفظ التغييرات بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث المستأجر",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTenant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('tenants')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: "تم حذف المستأجر بنجاح",
        description: "تم إزالة المستأجر من النظام",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف المستأجر",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useTenantsStats = () => {
  const { filter } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['tenants-stats', filter],
    queryFn: async () => {
      const { data: tenants, error } = await (supabase as any)
        .from('tenants')
        .select('status, tenant_type, created_at')
        .eq('company_id', filter.company_id)
        .eq('is_active', true);

      if (error) throw error;

      const stats = {
        total: tenants.length,
        active: tenants.filter((t: any) => t.status === 'active').length,
        inactive: tenants.filter((t: any) => t.status === 'inactive').length,
        suspended: tenants.filter((t: any) => t.status === 'suspended').length,
        pending: tenants.filter((t: any) => t.status === 'pending').length,
        individuals: tenants.filter((t: any) => t.tenant_type === 'individual').length,
        companies: tenants.filter((t: any) => t.tenant_type === 'company').length,
        thisMonth: tenants.filter((t: any) => {
          const createdDate = new Date(t.created_at);
          const now = new Date();
          return createdDate.getMonth() === now.getMonth() && 
                 createdDate.getFullYear() === now.getFullYear();
        }).length,
      };

      return stats;
    },
  });
};