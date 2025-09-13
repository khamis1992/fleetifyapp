import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { PropertyContract } from '../types';
import { toast } from 'sonner';

export function usePropertyContracts(propertyId?: string) {
  const companyId = useCurrentCompanyId();
  
  return useQuery({
    queryKey: ['property-contracts', companyId, propertyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from('property_contracts')
        .select(`
          *,
          properties!fk_property_contracts_property (
            id,
            property_name,
            property_name_ar
          ),
          tenants!fk_property_contracts_tenant (
            id,
            full_name,
            full_name_ar
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching property contracts:', error);
        throw error;
      }

      return data as any[];
    },
    enabled: !!companyId,
  });
}

export function usePropertyContract(id?: string) {
  return useQuery({
    queryKey: ['property-contract', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('property_contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching property contract:', error);
        throw error;
      }

      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreatePropertyContract() {
  const queryClient = useQueryClient();
  const companyId = useCurrentCompanyId();

  return useMutation({
    mutationFn: async (contractData: any) => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // Ensure company_id is included and status defaults to active
      const contractWithDefaults = {
        ...contractData,
        company_id: companyId,
        status: contractData.status || 'active',
        // Generate contract number if not provided
        contract_number: contractData.contract_number || `PROP-${Date.now()}`
      };

      const { data, error } = await supabase
        .from('property_contracts')
        .insert(contractWithDefaults)
        .select(`
          *,
          properties!fk_property_contracts_property (
            id,
            property_name,
            property_name_ar
          ),
          tenants!fk_property_contracts_tenant (
            id,
            full_name,
            full_name_ar
          )
        `)
        .single();

      if (error) {
        console.error('Error creating property contract:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-overview'] });
      
      // Show success message with accounting integration info
      if (data.journal_entry_id) {
        toast.success('تم إنشاء عقد الإيجار والقيد المحاسبي بنجاح');
      } else {
        toast.success('تم إنشاء عقد الإيجار بنجاح');
      }
    },
    onError: (error: any) => {
      console.error('Error creating property contract:', error);
      const errorMessage = error.message || 'فشل في إنشاء عقد الإيجار';
      toast.error(errorMessage);
    },
  });
}

export function useUpdatePropertyContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('property_contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating property contract:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['property-contract', data.id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('تم تحديث عقد الإيجار بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating property contract:', error);
      toast.error('فشل في تحديث عقد الإيجار');
    },
  });
}

export function useActivePropertyContracts() {
  return useQuery({
    queryKey: ['property-contracts', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_contracts')
        .select('*')
        .eq('status', 'active')
        .order('end_date', { ascending: true });

      if (error) {
        console.error('Error fetching active property contracts:', error);
        throw error;
      }

      return data as any[];
    },
    enabled: true,
  });
}

export function useExpiringPropertyContracts(days: number = 30) {
  return useQuery({
    queryKey: ['property-contracts', 'expiring', days],
    queryFn: async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const { data, error } = await supabase
        .from('property_contracts')
        .select('*')
        .eq('status', 'active')
        .lte('end_date', endDate.toISOString().split('T')[0])
        .order('end_date', { ascending: true });

      if (error) {
        console.error('Error fetching expiring property contracts:', error);
        throw error;
      }

      return data as any[];
    },
    enabled: true,
  });
}