import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyFilter } from '@/hooks/useCompanyScope';

export type JudgmentSettlementStatus =
  | 'pending'
  | 'linked_unposted'
  | 'partial'
  | 'settled'
  | 'closed_with_balance';

export interface JudgmentSettlement {
  id: string;
  company_id: string;
  case_number: string;
  case_title: string;
  client_id: string | null;
  client_name: string | null;
  contract_id: string | null;
  case_status: string;
  workflow_stage: string;
  case_reference: string | null;
  court_name: string | null;
  judge_name: string | null;
  outcome_type: string | null;
  outcome_date: string | null;
  outcome_amount: number;
  payment_direction: 'receive' | 'pay';
  outcome_payment_status: string | null;
  outcome_notes: string | null;
  linked_amount: number;
  settled_amount: number;
  remaining_amount: number;
  allocation_count: number;
  open_review_count: number;
  settlement_status: JudgmentSettlementStatus;
  created_at: string;
  updated_at: string;
}

export interface LegalSettlementAllocation {
  id: string;
  case_id: string;
  payment_id: string;
  allocated_amount: number;
  status: 'active' | 'reversed';
  link_source: string;
  confidence: number | null;
  link_reason: string | null;
  linked_at: string;
  reversal_reason: string | null;
  payments: {
    id: string;
    payment_number: string;
    payment_date: string;
    amount: number;
    payment_status: string;
    transaction_type: string;
    payment_method: string;
    reference_number: string | null;
    journal_entry_id: string | null;
    journal_entries: { id: string; entry_number: string; status: string } | null;
  } | null;
}

export interface LegalSettlementReviewItem {
  id: string;
  case_id: string | null;
  payment_id: string | null;
  issue_type: string;
  status: string;
  confidence: number | null;
  title: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface LegalPaymentCandidate {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_status: string;
  transaction_type: string;
  payment_method: string;
  reference_number: string | null;
  journal_entry_id: string | null;
  customer_id: string | null;
  contract_id: string | null;
}

const normalizeSettlement = (row: any): JudgmentSettlement => ({
  ...row,
  outcome_amount: Number(row.outcome_amount || 0),
  linked_amount: Number(row.linked_amount || 0),
  settled_amount: Number(row.settled_amount || 0),
  remaining_amount: Number(row.remaining_amount || 0),
  allocation_count: Number(row.allocation_count || 0),
  open_review_count: Number(row.open_review_count || 0),
});

export const useJudgmentSettlements = () => {
  const companyFilter = useCompanyFilter();
  const companyId = companyFilter.company_id;
  const db = supabase as any;

  return useQuery({
    queryKey: ['legal-judgment-settlements', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<JudgmentSettlement[]> => {
      const { data, error } = await db
        .from('legal_judgment_settlements_v1')
        .select('*')
        .eq('company_id', companyId)
        .order('outcome_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []).map(normalizeSettlement);
    },
    staleTime: 15_000,
  });
};

export const useLegalSettlementDetails = (caseId?: string) => {
  const companyFilter = useCompanyFilter();
  const companyId = companyFilter.company_id;
  const db = supabase as any;

  return useQuery({
    queryKey: ['legal-settlement-details', companyId, caseId],
    enabled: Boolean(companyId && caseId),
    queryFn: async (): Promise<{ allocations: LegalSettlementAllocation[]; reviews: LegalSettlementReviewItem[] }> => {
      const [allocationsResult, reviewsResult] = await Promise.all([
        db
          .from('legal_case_payment_allocations')
          .select(`
            id,case_id,payment_id,allocated_amount,status,link_source,confidence,link_reason,linked_at,reversal_reason,
            payments:payment_id(
              id,payment_number,payment_date,amount,payment_status,transaction_type,payment_method,reference_number,journal_entry_id,
              journal_entries:journal_entry_id(id,entry_number,status)
            )
          `)
          .eq('company_id', companyId)
          .eq('case_id', caseId)
          .order('linked_at', { ascending: false }),
        db
          .from('legal_settlement_review_items')
          .select('id,case_id,payment_id,issue_type,status,confidence,title,details,created_at')
          .eq('company_id', companyId)
          .eq('case_id', caseId)
          .eq('status', 'open')
          .order('created_at', { ascending: false }),
      ]);
      if (allocationsResult.error) throw allocationsResult.error;
      if (reviewsResult.error) throw reviewsResult.error;
      return {
        allocations: (allocationsResult.data || []).map((row: any) => ({ ...row, allocated_amount: Number(row.allocated_amount || 0) })),
        reviews: reviewsResult.data || [],
      };
    },
  });
};

export const useLegalPaymentCandidates = (settlement?: JudgmentSettlement | null) => {
  const companyFilter = useCompanyFilter();
  const companyId = companyFilter.company_id;
  const db = supabase as any;

  return useQuery({
    queryKey: ['legal-payment-candidates', companyId, settlement?.id],
    enabled: Boolean(companyId && settlement?.id),
    queryFn: async (): Promise<LegalPaymentCandidate[]> => {
      const { data: links, error: linksError } = await db
        .from('legal_case_payment_allocations')
        .select('payment_id')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (linksError) throw linksError;
      const linkedIds = new Set((links || []).map((link: any) => link.payment_id));

      let query = db
        .from('payments')
        .select('id,payment_number,payment_date,amount,payment_status,transaction_type,payment_method,reference_number,journal_entry_id,customer_id,contract_id')
        .eq('company_id', companyId)
        .eq('transaction_type', settlement?.payment_direction === 'pay' ? 'payment' : 'receipt')
        .not('payment_status', 'in', '(cancelled,canceled,voided,reversed)')
        .order('payment_date', { ascending: false })
        .limit(100);

      if (settlement?.contract_id) query = query.eq('contract_id', settlement.contract_id);
      else if (settlement?.client_id) query = query.eq('customer_id', settlement.client_id);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).filter((payment: any) => !linkedIds.has(payment.id)).map((payment: any) => ({ ...payment, amount: Number(payment.amount || 0) }));
    },
  });
};

export const useEligibleLegalJudgments = (direction: 'receive' | 'pay', customerId?: string, contractId?: string) => {
  const companyFilter = useCompanyFilter();
  const companyId = companyFilter.company_id;
  const db = supabase as any;
  return useQuery({
    queryKey: ['eligible-legal-judgments', companyId, direction, customerId, contractId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<JudgmentSettlement[]> => {
      let query = db.from('legal_judgment_settlements_v1').select('*')
        .eq('company_id', companyId).eq('payment_direction', direction).gt('remaining_amount', 0);
      if (contractId) query = query.eq('contract_id', contractId);
      else if (customerId) query = query.eq('client_id', customerId);
      const { data, error } = await query.order('outcome_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []).map(normalizeSettlement);
    },
  });
};

export const useLegalSettlementActions = () => {
  const companyFilter = useCompanyFilter();
  const companyId = companyFilter.company_id;
  const queryClient = useQueryClient();
  const db = supabase as any;
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['legal-judgment-settlements'] }),
      queryClient.invalidateQueries({ queryKey: ['legal-settlement-details'] }),
      queryClient.invalidateQueries({ queryKey: ['legal-payment-candidates'] }),
      queryClient.invalidateQueries({ queryKey: ['eligible-legal-judgments'] }),
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] }),
    ]);
  };

  const linkPayment = useMutation({
    mutationFn: async ({ caseId, paymentId, amount, source = 'manual', reason }: { caseId: string; paymentId: string; amount: number; source?: string; reason?: string }) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      const { data, error } = await db.rpc('link_legal_case_payment_v1', {
        p_company_id: companyId, p_case_id: caseId, p_payment_id: paymentId,
        p_allocated_amount: amount, p_link_source: source, p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => { await refresh(); toast.success('تم ربط الحركة المالية بالحكم'); },
    onError: (error: any) => toast.error(error?.message || 'تعذر ربط الحركة المالية'),
  });

  const reverseLink = useMutation({
    mutationFn: async ({ allocationId, reason }: { allocationId: string; reason: string }) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      const { data, error } = await db.rpc('reverse_legal_case_payment_link_v1', {
        p_company_id: companyId, p_allocation_id: allocationId, p_reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => { await refresh(); toast.success('تم عكس رابط الحركة وإعادة احتساب الحكم'); },
    onError: (error: any) => toast.error(error?.message || 'تعذر عكس الرابط'),
  });

  const resolveReview = useMutation({
    mutationFn: async ({ reviewId, action, reason }: { reviewId: string; action: 'dismissed' | 'resolved'; reason?: string }) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      const { data, error } = await db.rpc('resolve_legal_settlement_review_v1', {
        p_company_id: companyId, p_review_id: reviewId, p_action: action, p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
  });

  const addCaseNote = useMutation({
    mutationFn: async ({ caseId, note }: { caseId: string; note: string }) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      const cleanNote = note.trim();
      if (!cleanNote) throw new Error('اكتب الملاحظة أولاً');

      const { data: authData } = await supabase.auth.getUser();
      const { data, error } = await db
        .from('legal_case_activities')
        .insert({
          case_id: caseId,
          company_id: companyId,
          activity_type: 'case_note',
          activity_title: 'ملاحظة على القضية',
          activity_description: cleanNote,
          new_values: { note: cleanNote },
          created_by: authData.user?.id || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refresh();
      toast.success('تم إضافة الملاحظة على القضية');
    },
    onError: (error: any) => toast.error(error?.message || 'تعذر إضافة الملاحظة'),
  });

  const runMatcher = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      const { data, error } = await db.rpc('run_legal_judgment_matcher_v1', { p_company_id: companyId });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data: any) => {
      await refresh();
      toast.success(`اكتملت المطابقة: ${Number(data?.auto_linked || 0)} ربط تلقائي و${Number(data?.suggested || 0)} للمراجعة`);
    },
    onError: (error: any) => toast.error(error?.message || 'تعذر تشغيل المطابقة'),
  });

  return { linkPayment, reverseLink, resolveReview, addCaseNote, runMatcher };
};
