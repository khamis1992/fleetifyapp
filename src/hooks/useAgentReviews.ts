/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export type AgentType =
  | 'journal_entry'
  | 'legal_case'
  | 'daily_closeout'
  | 'collection_message'
  | 'customer_autofill'
  | 'payment_match'
  | 'correction_verify'
  | 'formal_notice';

export interface AgentReview {
  id: string;
  company_id: string;
  agent_type: AgentType;
  entity_type: string;
  entity_id: string | null;
  verdict: string;
  confidence: number | null;
  summary: string | null;
  details: Record<string, any>;
  model: string | null;
  created_at: string;
}

const AGENT_FUNCTION: Record<AgentType, string> = {
  journal_entry: 'journal-entry-ai-reviewer',
  legal_case: 'legal-case-ai-reviewer',
  daily_closeout: 'daily-closeout-ai-reviewer',
  collection_message: 'collection-message-agent',
  customer_autofill: 'customer-id-autofill-agent',
  payment_match: 'payment-match-agent',
  correction_verify: 'correction-verifier-agent',
  formal_notice: 'legal-notice-agent',
};

export function useLatestAgentReview(agentType: AgentType, entityId?: string | null) {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['ai-agent-review', agentType, entityId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('ai_agent_reviews')
        .select('*')
        .eq('company_id', companyId)
        .eq('agent_type', agentType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as AgentReview | null;
    },
    enabled: Boolean(companyId && entityId),
    staleTime: 30_000,
  });
}

export function useRunAgentReview(agentType: AgentType) {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const scopedCompanyId = typeof body.companyId === 'string' && body.companyId
        ? body.companyId
        : companyId;
      if (!scopedCompanyId) throw new Error('تعذر تحديد الشركة لتشغيل الوكيل');
      const { data, error } = await supabase.functions.invoke(AGENT_FUNCTION[agentType], {
        body: { ...body, companyId: scopedCompanyId },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'فشل تشغيل الوكيل');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-review'] });
    },
    onError: (error: Error) => {
      toast.error('تعذر تشغيل الوكيل', { description: error.message });
    },
  });
}
