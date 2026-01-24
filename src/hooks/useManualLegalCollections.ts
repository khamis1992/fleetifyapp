
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/hooks/useCompanyScope";
import { toast } from "sonner";

export interface RepaymentPlan {
  id: string;
  case_id: string;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface ManualCollectionItem {
  id: string; // case_id
  case_number: string;
  customer_name: string;
  client_id?: string;
  amount: number; // case_value
  remaining_amount: number; // calculated
  collected_amount: number; // calculated
  status: string; // case_status
  description?: string;
  created_at: string;
  repayment_plans: RepaymentPlan[];
}

export const useManualLegalCollections = () => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();
  const queryClient = useQueryClient();

  const collectionsQuery = useQuery({
    queryKey: ['manual-legal-collections', companyFilter],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // 1. Fetch cases of type 'manual_debt_collection'
      const { data: cases, error: casesError } = await supabase
        .from('legal_cases')
        .select(`
          id,
          case_number,
          client_name,
          client_id,
          case_value,
          case_status,
          description,
          created_at
        `)
        .eq('company_id', companyFilter.company_id)
        .eq('case_type', 'manual_debt_collection')
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) return [];

      const caseIds = cases.map(c => c.id);

      // 2. Fetch repayment plans for these cases
      const { data: plans, error: plansError } = await supabase
        .from('legal_repayment_plans')
        .select('*')
        .in('case_id', caseIds);

      if (plansError) throw plansError;

      // 3. Combine data
      const items: ManualCollectionItem[] = cases.map(c => {
        const casePlans = plans?.filter(p => p.case_id === c.id) || [];
        const collected = casePlans
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        
        return {
          id: c.id,
          case_number: c.case_number,
          customer_name: c.client_name || 'غير محدد',
          client_id: c.client_id,
          amount: Number(c.case_value),
          remaining_amount: Number(c.case_value) - collected,
          collected_amount: collected,
          status: c.case_status,
          description: c.description,
          created_at: c.created_at,
          repayment_plans: casePlans as RepaymentPlan[]
        };
      });

      return items;
    },
    enabled: !!user?.id && !!companyFilter.company_id,
  });

  const createCollection = useMutation({
    mutationFn: async (data: {
      customer_name: string;
      amount: number;
      description?: string;
      client_id?: string;
    }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Generate case number
      const { data: caseNumber } = await supabase
        .rpc('generate_legal_case_number', { company_id_param: profile.company_id });

      const { data: newCase, error } = await supabase
        .from('legal_cases')
        .insert({
          company_id: profile.company_id,
          case_number: caseNumber,
          case_title: `تحصيل ذمة - ${data.customer_name}`,
          case_type: 'manual_debt_collection',
          case_status: 'active',
          priority: 'high',
          client_name: data.customer_name,
          client_id: data.client_id,
          case_value: data.amount,
          description: data.description,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return newCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-legal-collections'] });
      toast.success('تم إضافة ذمة التحصيل بنجاح');
    },
    onError: (error) => {
      console.error(error);
      toast.error('حدث خطأ أثناء الإضافة');
    }
  });

  const addRepaymentPlan = useMutation({
    mutationFn: async (plans: Omit<RepaymentPlan, 'id' | 'created_at' | 'case_id'>[] & { case_id: string }) => {
       if (!user?.id) throw new Error('المستخدم غير مصرح له');
       
       const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
       if (!profile?.company_id) throw new Error('Company not found');

       const { case_id, ...plansData } = plans as any; // Handle array vs object properly if needed, but here we expect single call usually or array insert
       
       // Actually let's assume we pass an array of plans to insert
       const plansToInsert = (Array.isArray(plans) ? plans : [plans]).map(p => ({
         case_id: p.case_id, // Ensure case_id is passed in each object or map it
         due_date: p.due_date,
         amount: p.amount,
         status: 'pending',
         notes: p.notes,
         company_id: profile.company_id
       }));

       const { error } = await supabase
         .from('legal_repayment_plans')
         .insert(plansToInsert);

       if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-legal-collections'] });
      toast.success('تم إضافة خطة السداد');
    },
    onError: (error) => {
      console.error(error);
      toast.error('حدث خطأ في إضافة الخطة');
    }
  });

  const updateRepaymentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('legal_repayment_plans')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['manual-legal-collections'] });
       toast.success('تم تحديث حالة الدفعة');
    }
  });
  
  // Delete collection
  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('legal_cases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-legal-collections'] });
      toast.success('تم حذف الذمة بنجاح');
    },
    onError: (error) => {
      console.error(error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  });

  return {
    collections: collectionsQuery.data || [],
    isLoading: collectionsQuery.isLoading,
    createCollection,
    addRepaymentPlan,
    updateRepaymentStatus,
    deleteCollection
  };
};
