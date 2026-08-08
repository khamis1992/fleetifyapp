import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, GitMerge, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';

interface MergeProposal {
  id: string;
  reason: string;
  confidence: number;
  created_at: string;
  primary: { id: string; name: string; phone: string | null; national_id: string | null } | null;
  duplicate: { id: string; name: string; phone: string | null; national_id: string | null } | null;
}

export function CustomerMergeProposalsPanel() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['customer-merge-proposals', companyId],
    queryFn: async (): Promise<MergeProposal[]> => {
      const { data, error } = await (supabase.from as any)('customer_merge_proposals')
        .select('id, reason, confidence, created_at, primary_customer_id, duplicate_customer_id')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const rows = data || [];
      const customerIds = [...new Set<string>(rows.flatMap((r: any) => [r.primary_customer_id, r.duplicate_customer_id] as string[]))];
      if (customerIds.length === 0) return [];

      const { data: customers } = await supabase
        .from('customers')
        .select('id, first_name_ar, last_name_ar, first_name, last_name, company_name_ar, phone, national_id')
        .in('id', customerIds);
      const byId = new Map((customers || []).map((c) => [c.id, c]));
      const nameOf = (c: any) => c
        ? ([c.first_name_ar || c.first_name, c.last_name_ar || c.last_name].filter(Boolean).join(' ') || c.company_name_ar || 'عميل')
        : 'عميل';

      return rows.map((row: any) => ({
        id: row.id,
        reason: row.reason,
        confidence: Number(row.confidence || 0),
        created_at: row.created_at,
        primary: byId.get(row.primary_customer_id)
          ? { id: row.primary_customer_id, name: nameOf(byId.get(row.primary_customer_id)), phone: byId.get(row.primary_customer_id)?.phone, national_id: byId.get(row.primary_customer_id)?.national_id }
          : null,
        duplicate: byId.get(row.duplicate_customer_id)
          ? { id: row.duplicate_customer_id, name: nameOf(byId.get(row.duplicate_customer_id)), phone: byId.get(row.duplicate_customer_id)?.phone, national_id: byId.get(row.duplicate_customer_id)?.national_id }
          : null,
      }));
    },
    enabled: Boolean(companyId),
    staleTime: 30_000,
  });

  const respond = useMutation({
    mutationFn: async ({ proposalId, accept }: { proposalId: string; accept: boolean }) => {
      if (accept) {
        const { data, error } = await supabase.functions.invoke('customer-duplicate-detector', {
          body: { mode: 'apply', proposalId },
        });
        if (error) throw error;
        if (data?.success === false) throw new Error(data.error || 'فشل الدمج');
        return data;
      }
      const { error } = await (supabase.from as any)('customer_merge_proposals')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', proposalId);
      if (error) throw error;
      return null;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-merge-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(variables.accept ? 'تم دمج العميل المكرر في السجل الأساسي' : 'تم رفض مقترح الدمج');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || proposals.length === 0) return null;

  return (
    <section className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm" dir="rtl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <GitMerge className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-black text-[#142033]">مقترحات دمج العملاء المكررين</h3>
          <p className="text-xs text-neutral-500">
            اكتشفها وكيل كشف التكرار الليلي — الدمج ينقل كل السجلات ولا يحذف شيئاً
          </p>
        </div>
        <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">{proposals.length}</Badge>
      </div>

      <div className="space-y-2">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="grid gap-3 rounded-lg border border-[#E5EAF1] bg-[#FAFBFC] p-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-emerald-800">{proposal.primary?.name}</span>
                <span className="text-neutral-400">← يبقى</span>
                <span className="font-bold text-rose-700 line-through">{proposal.duplicate?.name}</span>
                <span className="text-neutral-400">← يُدمج</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {proposal.reason} · ثقة {Math.round(proposal.confidence * 100)}%
                {proposal.duplicate?.national_id ? ` · رقم شخصي ${proposal.duplicate.national_id}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                disabled={respond.isPending}
                onClick={() => respond.mutate({ proposalId: proposal.id, accept: false })}
              >
                <XCircle className="h-4 w-4" />
                رفض
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-violet-700 text-white hover:bg-violet-800"
                disabled={respond.isPending}
                onClick={() => respond.mutate({ proposalId: proposal.id, accept: true })}
              >
                {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                دمج
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
