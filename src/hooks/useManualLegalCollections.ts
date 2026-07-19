
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
  client_id?: string | null;
  amount: number; // case_value
  remaining_amount: number; // calculated
  collected_amount: number; // calculated
  status: string; // case_status
  description?: string | null;
  created_at: string;
  source: 'manual' | 'workflow';
  workflow_stage?: string | null;
  contract_id?: string | null;
  repayment_plans: RepaymentPlan[];
}

export const useManualLegalCollections = () => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();
  const queryClient = useQueryClient();

  const collectionsQuery = useQuery({
    queryKey: ['manual-legal-collections', companyFilter],
    queryFn: async () => {
      if (!companyFilter.company_id) throw new Error('Company not found');
      const companyId = companyFilter.company_id;
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Include manual debts and every actionable receivable produced by the legal workflow.
      const { data: cases, error: casesError } = await supabase
        .from('legal_cases')
        .select(`
          id,
          case_number,
          client_name,
          client_id,
          case_value,
          case_status,
          case_type,
          workflow_stage,
          outcome_amount,
          outcome_payment_status,
          payment_direction,
          contract_id,
          description,
          created_at
        `)
        .eq('company_id', companyId)
        .or('case_type.eq.manual_debt_collection,workflow_stage.eq.collection,and(workflow_stage.in.(judgment_issued,enforcement),payment_direction.eq.receive,outcome_amount.gt.0,outcome_payment_status.in.(pending,partial))')
        .not('case_status', 'in', '(cancelled,closed)')
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) return [];

      const caseIds = cases.map(c => c.id);

      // Fetch scheduled plans and confirmed legal payments together.
      const [plansResult, paymentsResult] = await Promise.all([
        supabase
          .from('legal_repayment_plans')
          .select('*')
          .eq('company_id', companyId)
          .in('case_id', caseIds),
        (supabase as any)
          .from('legal_case_payments')
          .select('case_id,amount,payment_status')
          .eq('company_id', companyId)
          .in('case_id', caseIds),
      ]);

      if (plansResult.error) throw plansResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      const plans = plansResult.data;
      const payments = paymentsResult.data ?? [];

      // 3. Combine data
      const items: ManualCollectionItem[] = cases.map(c => {
        const casePlans = plans?.filter(p => p.case_id === c.id) || [];
        const isManual = c.case_type === 'manual_debt_collection';
        const amount = isManual ? Number(c.case_value || 0) : Number(c.outcome_amount || 0);
        const collected = isManual
          ? casePlans
              .filter(p => p.status === 'paid')
              .reduce((sum, p) => sum + Number(p.amount), 0)
          : payments
              .filter((payment: any) => payment.case_id === c.id && ['completed', 'paid', 'received'].includes(String(payment.payment_status || '').toLowerCase()))
              .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
        
        return {
          id: c.id,
          case_number: c.case_number,
          customer_name: c.client_name || 'غير محدد',
          client_id: c.client_id,
          amount,
          remaining_amount: Math.max(0, amount - collected),
          collected_amount: collected,
          status: c.case_status,
          description: c.description,
          created_at: c.created_at,
          source: isManual ? 'manual' : 'workflow',
          workflow_stage: c.workflow_stage,
          contract_id: c.contract_id,
          repayment_plans: casePlans
            .filter((plan) => Boolean(plan.case_id))
            .map((plan) => ({
              id: plan.id,
              case_id: plan.case_id!,
              due_date: plan.due_date,
              amount: Number(plan.amount),
              status: plan.status as RepaymentPlan['status'],
              notes: plan.notes || undefined,
              created_at: plan.created_at || '',
            })),
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
      if (!caseNumber) throw new Error('Failed to generate legal case number');

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

  type RepaymentPlanInput = Omit<RepaymentPlan, 'id' | 'created_at'>;
  const addRepaymentPlan = useMutation({
    mutationFn: async (plans: RepaymentPlanInput | RepaymentPlanInput[]) => {
       if (!user?.id) throw new Error('المستخدم غير مصرح له');
       
       const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
       if (!profile?.company_id) throw new Error('Company not found');

       const planRows = Array.isArray(plans) ? plans : [plans];
       const caseIds = [...new Set(planRows.map((plan) => plan.case_id).filter(Boolean))];
       if (caseIds.length !== 1) throw new Error('يجب أن تنتمي الخطة إلى قضية واحدة');
       const { data: legalCase, error: caseError } = await supabase
         .from('legal_cases')
         .select('id')
         .eq('id', caseIds[0])
         .eq('company_id', profile.company_id)
         .single();
       if (caseError || !legalCase) throw caseError || new Error('القضية لا تنتمي إلى الشركة الحالية');

       // Actually let's assume we pass an array of plans to insert
       const plansToInsert = planRows.map(p => ({
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
      if (!companyFilter.company_id) throw new Error('Company not found');
      if (status === 'paid') {
        throw new Error('لا يمكن تعليم القسط كمدفوع يدويًا؛ سجّل دفعة قانونية موثقة أولًا');
      }
      const { error } = await supabase
        .from('legal_repayment_plans')
        .update({ status })
        .eq('id', id)
        .eq('company_id', companyFilter.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['manual-legal-collections'] });
       toast.success('تم تحديث حالة الدفعة');
    }
  });
  
  // Preserve the legal audit trail by cancelling rather than deleting.
  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      if (!companyFilter.company_id) throw new Error('Company not found');
      const { error } = await supabase.rpc('cancel_legal_cases_v1', {
        p_actor_id: user?.id,
        p_case_ids: [id],
        p_company_id: companyFilter.company_id,
        p_reason: 'Cancelled from manual legal collections',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-legal-collections'] });
      toast.success('تم إلغاء ذمة التحصيل مع حفظ سجلها');
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
