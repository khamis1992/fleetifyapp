import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/hooks/useCompanyScope";
import { toast } from "sonner";

export interface LegalCaseAccountMapping {
  id: string;
  company_id: string;
  case_type: string;
  legal_fees_revenue_account_id?: string;
  consultation_revenue_account_id?: string;
  legal_fees_receivable_account_id?: string;
  court_fees_expense_account_id?: string;
  legal_expenses_account_id?: string;
  expert_witness_expense_account_id?: string;
  legal_research_expense_account_id?: string;
  settlements_expense_account_id?: string;
  settlements_payable_account_id?: string;
  client_retainer_liability_account_id?: string;
  is_active: boolean;
  auto_create_journal_entries: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface LegalCaseAccountMappingFormData {
  case_type: string;
  legal_fees_revenue_account_id?: string;
  consultation_revenue_account_id?: string;
  legal_fees_receivable_account_id?: string;
  court_fees_expense_account_id?: string;
  legal_expenses_account_id?: string;
  expert_witness_expense_account_id?: string;
  legal_research_expense_account_id?: string;
  settlements_expense_account_id?: string;
  settlements_payable_account_id?: string;
  client_retainer_liability_account_id?: string;
  is_active: boolean;
  auto_create_journal_entries: boolean;
}

export interface LegalAccountType {
  type_code: string;
  type_name: string;
  type_name_ar: string;
  account_category: string;
  description: string;
}

export const useLegalAccountMappings = () => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-account-mappings', companyFilter],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      let query = supabase
        .from('legal_case_account_mappings')
        .select('*')
        .order('case_type');

      // Apply company filter
      if (companyFilter.company_id) {
        query = query.eq('company_id', companyFilter.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LegalCaseAccountMapping[];
    },
    enabled: !!user?.id,
  });
};

export const useLegalAccountTypes = () => {
  return useQuery({
    queryKey: ['legal-account-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_account_types')
        .select('*')
        .in('type_code', [
          'LEGAL_FEES_RECEIVABLE',
          'LEGAL_FEES_REVENUE',
          'COURT_FEES_EXPENSE',
          'LEGAL_EXPENSES',
          'LEGAL_SETTLEMENTS_EXPENSE',
          'LEGAL_SETTLEMENTS_PAYABLE',
          'CLIENT_RETAINER_LIABILITY',
          'LEGAL_CONSULTATION_REVENUE',
          'EXPERT_WITNESS_EXPENSE',
          'LEGAL_RESEARCH_EXPENSE'
        ])
        .order('type_name');

      if (error) throw error;
      return data as LegalAccountType[];
    },
  });
};

export const useAccountsByCategory = (category: string) => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['accounts-by-category', category, companyFilter],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      let query = supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_name_ar')
        .eq('account_type', category)
        .eq('is_active', true)
        .order('account_code');

      // Apply company filter
      if (companyFilter.company_id) {
        query = query.eq('company_id', companyFilter.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!category,
  });
};

export const useCreateLegalAccountMapping = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: LegalCaseAccountMappingFormData) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      const { data, error } = await supabase
        .from('legal_case_account_mappings')
        .insert({
          ...formData,
          company_id: profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-account-mappings'] });
      toast.success('تم إنشاء ربط الحسابات بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating legal account mapping:', error);
      toast.error('حدث خطأ أثناء إنشاء ربط الحسابات');
    },
  });
};

export const useUpdateLegalAccountMapping = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LegalCaseAccountMappingFormData> }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { data: result, error } = await supabase
        .from('legal_case_account_mappings')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-account-mappings'] });
      toast.success('تم تحديث ربط الحسابات بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating legal account mapping:', error);
      toast.error('حدث خطأ أثناء تحديث ربط الحسابات');
    },
  });
};

export const useDeleteLegalAccountMapping = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappingId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { error } = await supabase
        .from('legal_case_account_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;
      return mappingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-account-mappings'] });
      toast.success('تم حذف ربط الحسابات بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting legal account mapping:', error);
      toast.error('حدث خطأ أثناء حذف ربط الحسابات');
    },
  });
};

// Helper function to get specific account for a case type
export const useLegalAccountForCase = (caseType: string, accountType: string) => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-account-for-case', caseType, accountType, companyFilter],
    queryFn: async () => {
      if (!user?.id || !companyFilter.company_id) return null;

      const { data, error } = await supabase
        .rpc('get_legal_account_mapping', {
          company_id_param: companyFilter.company_id,
          case_type_param: caseType,
          account_type_param: accountType
        });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!companyFilter.company_id && !!caseType && !!accountType,
  });
};

// Function to create default mappings for all case types
export const useCreateDefaultLegalMappings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      const caseTypes = ['civil', 'criminal', 'commercial', 'labor', 'administrative'];
      const mappings = caseTypes.map(caseType => ({
        company_id: profile.company_id,
        case_type: caseType,
        is_active: true,
        auto_create_journal_entries: true,
        created_by: user.id,
      }));

      const { data, error } = await supabase
        .from('legal_case_account_mappings')
        .insert(mappings)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-account-mappings'] });
      toast.success('تم إنشاء الربط الافتراضي لجميع أنواع القضايا');
    },
    onError: (error: any) => {
      console.error('Error creating default legal mappings:', error);
      toast.error('حدث خطأ أثناء إنشاء الربط الافتراضي');
    },
  });
};