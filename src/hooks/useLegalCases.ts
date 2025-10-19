import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/hooks/useCompanyScope";
import { toast } from "sonner";

export interface LegalCase {
  id: string;
  company_id: string;
  case_number: string;
  case_title: string;
  case_title_ar?: string;
  case_type: string;
  case_status: string;
  priority: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  description?: string;
  case_value: number;
  court_name?: string;
  court_name_ar?: string;
  case_reference?: string;
  filing_date?: string;
  hearing_date?: string;
  statute_limitations?: string;
  primary_lawyer_id?: string;
  legal_team: any[];
  legal_fees: number;
  court_fees: number;
  other_expenses: number;
  total_costs: number;
  billing_status: string;
  tags: string[];
  notes?: string;
  is_confidential: boolean;
  police_station?: string;
  police_report_number?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalCaseFormData {
  case_title: string;
  case_title_ar?: string;
  case_type: string;
  case_status: string;
  priority: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  description?: string;
  case_value: number;
  court_name?: string;
  court_name_ar?: string;
  case_reference?: string;
  filing_date?: string;
  hearing_date?: string;
  statute_limitations?: string;
  primary_lawyer_id?: string;
  legal_team: any[];
  legal_fees: number;
  court_fees: number;
  other_expenses: number;
  billing_status: string;
  tags: string[];
  notes?: string;
  is_confidential: boolean;
  police_station?: string;
  police_report_number?: string;
}

interface UseLegalCasesFilters {
  case_status?: string;
  case_type?: string;
  priority?: string;
  client_id?: string;
  lawyer_id?: string;
  search?: string;
}

export const useLegalCases = (filters?: UseLegalCasesFilters) => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-cases', companyFilter, filters],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      let query = supabase
        .from('legal_cases')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply company filter
      if (companyFilter.company_id) {
        query = query.eq('company_id', companyFilter.company_id);
      }

      // Apply filters
      if (filters?.case_status) {
        query = query.eq('case_status', filters.case_status);
      }
      if (filters?.case_type) {
        query = query.eq('case_type', filters.case_type);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.lawyer_id) {
        query = query.eq('primary_lawyer_id', filters.lawyer_id);
      }
      if (filters?.search) {
        query = query.or(`case_title.ilike.%${filters.search}%,case_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LegalCase[];
    },
    enabled: !!user?.id,
  });
};

export const useLegalCase = (caseId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['legal-case', caseId],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { data, error } = await supabase
        .from('legal_cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (error) throw error;
      return data as LegalCase;
    },
    enabled: !!user?.id && !!caseId,
  });
};

export const useCreateLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: LegalCaseFormData) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Generate case number
      const { data: caseNumber, error: numberError } = await supabase
        .rpc('generate_legal_case_number', { company_id_param: profile.company_id });

      if (numberError) throw numberError;

      // Calculate total costs
      const total_costs = formData.legal_fees + formData.court_fees + formData.other_expenses;

      const { data, error } = await supabase
        .from('legal_cases')
        .insert({
          ...formData,
          case_number: caseNumber,
          company_id: profile.company_id,
          total_costs,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create activity log
      await supabase
        .from('legal_case_activities')
        .insert({
          case_id: data.id,
          company_id: profile.company_id,
          activity_type: 'case_created',
          activity_title: 'تم إنشاء القضية',
          activity_description: `تم إنشاء القضية ${data.case_number} - ${data.case_title}`,
          created_by: user.id,
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('تم إنشاء القضية بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error creating legal case:', error);
      toast.error('حدث خطأ أثناء إنشاء القضية');
    },
  });
};

export const useUpdateLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LegalCaseFormData> }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Calculate total costs if financial fields are updated
      const updateData: any = { ...data };
      if (data.legal_fees !== undefined || data.court_fees !== undefined || data.other_expenses !== undefined) {
        const { data: currentCase } = await supabase
          .from('legal_cases')
          .select('legal_fees, court_fees, other_expenses')
          .eq('id', id)
          .single();

        if (currentCase) {
          updateData.total_costs = 
            (data.legal_fees ?? currentCase.legal_fees) +
            (data.court_fees ?? currentCase.court_fees) +
            (data.other_expenses ?? currentCase.other_expenses);
        }
      }

      const { data: result, error } = await supabase
        .from('legal_cases')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create activity log
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.company_id) {
        await supabase
          .from('legal_case_activities')
          .insert({
            case_id: id,
            company_id: profile.company_id,
            activity_type: 'case_updated',
            activity_title: 'تم تحديث القضية',
            activity_description: `تم تحديث بيانات القضية`,
            new_values: updateData,
            created_by: user.id,
          });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-case'] });
      toast.success('تم تحديث القضية بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error updating legal case:', error);
      toast.error('حدث خطأ أثناء تحديث القضية');
    },
  });
};

export const useLegalCaseStats = () => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-case-stats', companyFilter],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      let query = supabase
        .from('legal_cases')
        .select('case_status, case_type, priority, total_costs, billing_status');

      // Apply company filter
      if (companyFilter.company_id) {
        query = query.eq('company_id', companyFilter.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const stats = {
        total: data.length,
        active: data.filter(c => c.case_status === 'active').length,
        closed: data.filter(c => c.case_status === 'closed').length,
        suspended: data.filter(c => c.case_status === 'suspended').length,
        onHold: data.filter(c => c.case_status === 'on_hold').length,
        highPriority: data.filter(c => c.priority === 'high' || c.priority === 'urgent').length,
        totalValue: data.reduce((sum, c) => sum + (c.total_costs || 0), 0),
        pendingBilling: data.filter(c => c.billing_status === 'pending').length,
        overduePayments: data.filter(c => c.billing_status === 'overdue').length,
        byType: {
          civil: data.filter(c => c.case_type === 'civil').length,
          criminal: data.filter(c => c.case_type === 'criminal').length,
          commercial: data.filter(c => c.case_type === 'commercial').length,
          labor: data.filter(c => c.case_type === 'labor').length,
          administrative: data.filter(c => c.case_type === 'administrative').length,
        },
      };

      return stats;
    },
    enabled: !!user?.id,
  });
};