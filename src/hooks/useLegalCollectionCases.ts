import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { toast } from "sonner";

export interface LegalCollectionCase {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id?: string;
  claim_amount: number;
  collected_amount: number;
  status: 'open' | 'closed' | 'on_hold';
  case_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customers: {
    first_name: string;
    last_name: string;
    company_name?: string;
    customer_type: string;
    phone?: string;
    customer_code?: string;
  };
}

export const useLegalCollectionCases = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['legal-collection-cases', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('legal_collection_cases')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            company_name,
            customer_type,
            phone,
            customer_code
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as LegalCollectionCase[];
    },
    enabled: !!companyId
  });
};

export const useDeleteLegalCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('legal_collection_cases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف الحالة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['legal-collection-cases'] });
    },
    onError: () => {
      toast.error('حدث خطأ أثناء الحذف');
    }
  });
};

export const useCloseLegalCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('legal_collection_cases')
        .update({ status: 'closed' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إغلاق الحالة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['legal-collection-cases'] });
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إغلاق الحالة');
    }
  });
};
