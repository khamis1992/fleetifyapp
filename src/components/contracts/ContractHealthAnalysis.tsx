import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  CreditCard,
  FileWarning,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';

type ContractPaymentRow = {
  id: string;
  payment_number: string | null;
  payment_date: string | null;
  amount: number | null;
  payment_status: string | null;
  invoice_id: string | null;
  contract_id?: string | null;
  reference_number?: string | null;
  invoice_allocations?: Array<{
    target_id: string;
    amount: number;
  }>;
  contract_allocations?: Array<{
    target_id: string;
    amount: number;
  }>;
  has_active_allocations?: boolean;
};

type HealthSeverity = 'critical' | 'warning' | 'info' | 'good';

type HealthIssue = {
  title: string;
  detail: string;
  severity: HealthSeverity;
  count?: number;
  items?: string[];
  fixable?: boolean;
};

type InvoiceIssueItem = {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number;
  reason: 'before_start' | 'after_end';
  target_month_has_invoice: boolean;
  has_linked_payments: boolean;
  has_journal_entry: boolean;
  linked_payment_ids: string[];
  linked_payment_numbers: string[];
};

type PaymentIssueItem = {
  id: string;
  payment_number: string;
  payment_date: string | null;
  amount: number;
  payment_status: string | null;
  invoice_id: string | null;
  is_immutable: boolean;
  reason: 'before_start' | 'after_end';
};

type MissingScheduleIssueItem = {
  id: string;
  installment_number: number | null;
  due_date: string | null;
  amount: number;
};

type InvoicePaymentCorrection = {
  id: string;
  invoice_number: string;
  paid_amount: number;
  balance_due: number;
  payment_status: string;
  status: string;
};

type ScheduleInvoiceMismatchItem = {
  schedule_id: string;
  invoice_id: string | null;
  installment_number: number | null;
  due_date: string | null;
  schedule_amount: number;
  invoice_number: string;
  invoice_date: string | null;
  invoice_due_date: string | null;
  invoice_amount: number;
  difference: number;
  reason: 'amount_mismatch' | 'wrong_link' | 'missing_invoice' | 'duplicate_link' | 'date_mismatch';
};

type ContractHealthResult = {
  score: number;
  summary: string;
  recommendation: string;
  source: 'longcat' | 'local';
  issues: HealthIssue[];
  metrics: {
    expectedInvoices: number;
    activeInvoices: number;
    missingInvoices: number;
    paymentsBeforeStart: number;
    paymentsAfterEnd: number;
    invoicesOutsideContract: number;
    totalPaid: number;
    contractAmount: number;
    overpaidAmount: number;
    scheduleTotal: number;
    invoicesTotal: number;
    scheduleInvoiceDifference: number;
    contractPeriodLabel: string;
    outsideInvoices: InvoiceIssueItem[];
    paymentsBeforeStartItems: PaymentIssueItem[];
    paymentsAfterEndItems: PaymentIssueItem[];
    missingScheduleItems: string[];
    missingScheduleIssueItems: MissingScheduleIssueItem[];
    invoicePaymentCorrections: InvoicePaymentCorrection[];
    scheduleInvoiceMismatchItems: ScheduleInvoiceMismatchItem[];
    invoiceDateKeys: string[];
  };
};

type PaymentScheduleLike = {
  id: string;
  installment_number?: number | null;
  due_date?: string | null;
  amount?: number | null;
  status?: string | null;
  paid_date?: string | null;
  paid_amount?: number | null;
  invoice_id?: string | null;
};

type InvoiceDateLike = {
  invoice_date?: string | null;
  due_date?: string | null;
};

type ContractHealthInvoice = Invoice & {
  contract_id?: string | null;
};

type SupabaseRpcClient = {
  rpc: <T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: T | null; error: unknown }>;
};

type DeleteOutOfPeriodInvoiceResponse = {
  deleted?: boolean;
  reason?: string;
} | null;

type ContractRepairTool =
  | 'repair_linked_invoice_contracts'
  | 'cancel_duplicate_schedules'
  | 'repair_outside_invoices'
  | 'create_missing_invoices'
  | 'repair_out_of_period_payments'
  | 'reconcile_invoice_amounts'
  | 'reconcile_schedule_invoices'
  | 'recalculate_invoice_balances'
  | 'final_balance_audit';

type ContractRepairAgentPlan = {
  source: 'longcat' | 'local';
  summary: string;
  actions: Array<{
    tool: ContractRepairTool;
    priority: number;
    reason: string;
  }>;
  requiresReview: string[];
};

const CONTRACT_REPAIR_AGENT_TOOLS: ContractRepairTool[] = [
  'repair_linked_invoice_contracts',
  'cancel_duplicate_schedules',
  'repair_outside_invoices',
  'create_missing_invoices',
  'repair_out_of_period_payments',
  'reconcile_invoice_amounts',
  'reconcile_schedule_invoices',
  'recalculate_invoice_balances',
  'final_balance_audit',
];

export const ContractHealthAnalysis: React.FC<{
  contract: Contract;
  formatCurrency: (amount: number) => string;
  paymentSchedules: PaymentScheduleLike[];
}> = ({ contract, formatCurrency }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-health-analysis', contract.id, contract.updated_at],
    queryFn: async () => {
      const schedulesResult = await supabase
        .from('contract_payment_schedules')
        .select('id, installment_number, due_date, amount, status, paid_date, invoice_id')
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id)
        .order('installment_number', { ascending: true });

      if (schedulesResult.error) throw schedulesResult.error;
      const currentPaymentSchedules = (schedulesResult.data || []) as PaymentScheduleLike[];

      const scheduleInvoiceIds = Array.from(new Set(
        currentPaymentSchedules
          .map((schedule) => schedule.invoice_id)
          .filter(Boolean),
      )) as string[];

      let invoicesQuery = supabase
        .from('invoices')
        .select('id, contract_id, invoice_number, invoice_date, due_date, total_amount, paid_amount, balance_due, status, payment_status, journal_entry_id, created_at, updated_at')
        .eq('company_id', contract.company_id)
        .order('due_date', { ascending: true });

      invoicesQuery = scheduleInvoiceIds.length
        ? invoicesQuery.or(`contract_id.eq.${contract.id},id.in.(${scheduleInvoiceIds.join(',')})`)
        : invoicesQuery.eq('contract_id', contract.id);

      const invoicesResult = await invoicesQuery;

      if (invoicesResult.error) throw invoicesResult.error;
      const invoices = (invoicesResult.data || []) as ContractHealthInvoice[];
      const invoiceIds = invoices.map((invoice) => invoice.id).filter(Boolean);

      let paymentsQuery = supabase
        .from('payments')
        .select('id, payment_number, payment_date, amount, payment_status, invoice_id, contract_id, reference_number')
        .eq('company_id', contract.company_id);

      paymentsQuery = invoiceIds.length
        ? paymentsQuery.or(`contract_id.eq.${contract.id},invoice_id.in.(${invoiceIds.join(',')})`)
        : paymentsQuery.eq('contract_id', contract.id);

      const paymentsResult = await paymentsQuery.order('payment_date', { ascending: true });
      if (paymentsResult.error) throw paymentsResult.error;

      const directPayments = (paymentsResult.data || []) as ContractPaymentRow[];
      const invoiceAllocationsResult = invoiceIds.length > 0
        ? await supabase
            .from('payment_allocations')
            .select('payment_id, allocation_type, target_id, amount')
            .eq('company_id', contract.company_id)
            .eq('is_active', true)
            .eq('allocation_type', 'invoice')
            .in('target_id', invoiceIds)
        : { data: [], error: null };

      if (invoiceAllocationsResult.error) throw invoiceAllocationsResult.error;

      const allocatedPaymentIds = Array.from(new Set(
        (invoiceAllocationsResult.data || []).map((allocation) => allocation.payment_id),
      ));
      const directPaymentIds = new Set(directPayments.map((payment) => payment.id));
      const missingAllocatedPaymentIds = allocatedPaymentIds.filter((id) => !directPaymentIds.has(id));
      const allocatedPaymentsResult = missingAllocatedPaymentIds.length > 0
        ? await supabase
            .from('payments')
            .select('id, payment_number, payment_date, amount, payment_status, invoice_id, contract_id, reference_number')
            .eq('company_id', contract.company_id)
            .in('id', missingAllocatedPaymentIds)
        : { data: [], error: null };

      if (allocatedPaymentsResult.error) throw allocatedPaymentsResult.error;

      const payments = [
        ...directPayments,
        ...((allocatedPaymentsResult.data || []) as ContractPaymentRow[]),
      ];
      const paymentIds = payments.map((payment) => payment.id);
      const allAllocationsResult = paymentIds.length > 0
        ? await supabase
            .from('payment_allocations')
            .select('payment_id, allocation_type, target_id, amount')
            .eq('company_id', contract.company_id)
            .eq('is_active', true)
            .in('payment_id', paymentIds)
        : { data: [], error: null };

      if (allAllocationsResult.error) throw allAllocationsResult.error;

      const allocationsByPaymentId = new Map<string, Array<{ allocation_type: string; target_id: string; amount: number }>>();
      for (const allocation of allAllocationsResult.data || []) {
        const items = allocationsByPaymentId.get(allocation.payment_id) || [];
        items.push({
          allocation_type: allocation.allocation_type,
          target_id: allocation.target_id,
          amount: Number(allocation.amount || 0),
        });
        allocationsByPaymentId.set(allocation.payment_id, items);
      }

      const canonicalPayments = payments.map((payment) => {
        const allocations = allocationsByPaymentId.get(payment.id) || [];
        return {
          ...payment,
          has_active_allocations: allocations.length > 0,
          invoice_allocations: allocations
            .filter((allocation) => allocation.allocation_type === 'invoice')
            .map((allocation) => ({ target_id: allocation.target_id, amount: allocation.amount })),
          contract_allocations: allocations
            .filter((allocation) => allocation.allocation_type === 'contract')
            .map((allocation) => ({ target_id: allocation.target_id, amount: allocation.amount })),
        };
      });

      const metrics = buildContractHealthMetrics({
        contract,
        invoices,
        payments: canonicalPayments,
        paymentSchedules: currentPaymentSchedules,
        formatCurrency,
      });

      const fallback = buildLocalContractHealth(metrics);
      return fallback;
    },
    enabled: !!contract.id && !!contract.company_id,
    staleTime: 2 * 60 * 1000,
  });

  const health = data;
  const fixableIssuesCount = health
    ? health.metrics.missingInvoices
      + health.metrics.outsideInvoices.length
      + health.metrics.paymentsBeforeStartItems.filter((payment) => !payment.is_immutable).length
      + health.metrics.paymentsAfterEndItems.filter((payment) => !payment.is_immutable).length
      + (health.metrics.scheduleInvoiceDifference > 1 ? 1 : 0)
      + health.metrics.scheduleInvoiceMismatchItems.length
      + health.metrics.invoicePaymentCorrections.length
    : 0;

  const handleAutoFix = async () => {
    if (!health || fixableIssuesCount === 0) return;

    setIsFixing(true);
    const fixedActions: string[] = [];
    const reviewItems: string[] = [];
    let fixedCount = 0;
    const now = new Date().toISOString();
    const reviewedPaymentIds = new Set<string>();

    try {
      const agentPlan = buildLocalContractRepairAgentPlan(health.metrics);
      if (agentPlan.actions.length > 0) {
        const actionLabels = agentPlan.actions
          .slice(0, 5)
          .map((action) => getRepairToolLabel(action.tool))
          .join('، ');
        fixedActions.push(
          `${agentPlan.source === 'longcat' ? 'وكيل AI' : 'خطة ذكية محلية'}: ${agentPlan.summary} (${actionLabels})`,
        );
      }
      reviewItems.push(...agentPlan.requiresReview);

      const schedulesResult = await supabase
        .from('contract_payment_schedules')
        .select('id, installment_number, due_date, amount, status, paid_date, invoice_id')
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id)
        .order('installment_number', { ascending: true });

      if (schedulesResult.error) throw schedulesResult.error;
      let currentPaymentSchedules = (schedulesResult.data || []) as PaymentScheduleLike[];

      const repairedInvoiceLinks = await repairScheduleLinkedInvoiceContracts({
        contract,
        paymentSchedules: currentPaymentSchedules,
        now,
      });
      if (repairedInvoiceLinks > 0) {
        fixedCount += repairedInvoiceLinks;
        fixedActions.push(`تصحيح ربط فواتير بالعقد: ${repairedInvoiceLinks}`);
      }

      const duplicateScheduleIds = getDuplicatePaymentScheduleIds(
        currentPaymentSchedules,
        contract.start_date,
        contract.end_date,
        Number(contract.monthly_amount || 0),
      );
      if (duplicateScheduleIds.length > 0) {
        const { error } = await supabase
          .from('contract_payment_schedules')
          .update({
            status: 'cancelled',
            invoice_id: null,
            notes: `تم إلغاء القسط لأنه مكرر ضمن إصلاح صحة العقد بتاريخ ${now}`,
            updated_at: now,
          })
          .in('id', duplicateScheduleIds)
          .eq('contract_id', contract.id)
          .eq('company_id', contract.company_id);

        if (error) throw error;
        fixedCount += duplicateScheduleIds.length;
        fixedActions.push(`إلغاء أقساط مكررة: ${duplicateScheduleIds.length}`);
      }

      let cancelledOutsideInvoices = 0;
      let preservedLinkedPayments = 0;
      for (const invoice of health.metrics.outsideInvoices) {
        for (const paymentId of invoice.linked_payment_ids) {
          if (reviewedPaymentIds.has(paymentId)) continue;
          reviewedPaymentIds.add(paymentId);
          preservedLinkedPayments += 1;
        }

        const repairResult = await repairOutOfPeriodInvoice({
          contract,
          invoice,
          now,
        });

        if (repairResult.reviewMessage) {
          reviewItems.push(repairResult.reviewMessage);
        }

        if (repairResult.changed) cancelledOutsideInvoices += 1;
      }
      if (health.metrics.outsideInvoices.length > 0) {
        fixedCount += cancelledOutsideInvoices;
        fixedActions.push(`إلغاء فواتير خارج الفترة: ${cancelledOutsideInvoices}`);
        if (preservedLinkedPayments > 0) {
          reviewItems.push(`تم الحفاظ على ${preservedLinkedPayments} دفعة مكتملة وفك ارتباطها بالفواتير الخارجة بدل إلغاء إيصالات القبض.`);
        }
      }

      if (health.metrics.missingInvoices > 0) {
        const currentInvoiceDateKeys = await getCurrentActiveInvoiceMonthKeys(contract, currentPaymentSchedules);
        const currentMissingSchedules = getMissingScheduleIssueItemsFromSchedules({
          paymentSchedules: currentPaymentSchedules,
          invoiceDateKeys: currentInvoiceDateKeys,
          startDate: contract.start_date,
          endDate: contract.end_date,
        });
        const activeScheduleCount = currentPaymentSchedules.filter((schedule) => !isCancelled(schedule.status)).length - duplicateScheduleIds.length;
        if (activeScheduleCount <= 0) {
          reviewItems.push('لا يوجد جدول دفعات حالي يمكن استخدامه لإنشاء الفواتير');
        }

        const targetScheduleMonthKeys = currentMissingSchedules
          .map((schedule) => getMonthKey(schedule.due_date))
          .filter((key) => key !== 'unknown');
        const generatedCount = currentMissingSchedules.length > 0
          ? await createMissingInvoicesFromActiveSchedules({
              contract,
              paymentSchedules: currentPaymentSchedules,
              existingInvoices: currentInvoiceDateKeys,
              maxInvoices: currentMissingSchedules.length,
              targetScheduleIds: currentMissingSchedules.map((schedule) => schedule.id),
              now,
            })
          : 0;
        const missingContractMonthKeys = getMissingContractInvoiceMonthKeys({
          contract,
          invoiceDateKeys: [
            ...currentInvoiceDateKeys,
            ...targetScheduleMonthKeys.slice(0, generatedCount),
          ],
          paymentSchedules: currentPaymentSchedules,
        });
        const generatedMonthCount = await createMissingInvoicesForContractMonths({
          contract,
          existingInvoices: currentInvoiceDateKeys,
          skipMonthKeys: targetScheduleMonthKeys,
          targetMonthKeys: missingContractMonthKeys,
          maxInvoices: missingContractMonthKeys.length,
          now,
          paymentSchedules: currentPaymentSchedules,
        });

        fixedCount += generatedCount + generatedMonthCount;
        fixedActions.push(`إنشاء فواتير: ${generatedCount + generatedMonthCount}`);

      }

      // Rebuild schedules even when the missing invoice was created by an
      // earlier run, then always reconcile against a fresh schedule snapshot.
      const { data: scheduleBackfill, error: scheduleBackfillError } = await supabase.rpc(
        'generate_payment_schedules_for_contract',
        { p_contract_id: contract.id, p_dry_run: false },
      );
      if (scheduleBackfillError) throw scheduleBackfillError;

      const schedulesCreated = Number(
        (scheduleBackfill as { schedules_created?: number } | null)?.schedules_created || 0,
      );
      if (schedulesCreated > 0) {
        fixedCount += schedulesCreated;
        fixedActions.push(`إنشاء أقساط ناقصة: ${schedulesCreated}`);
      }

      const refreshedSchedules = await supabase
        .from('contract_payment_schedules')
        .select('id, installment_number, due_date, amount, status, paid_date, invoice_id')
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id)
        .order('installment_number', { ascending: true });

      if (refreshedSchedules.error) throw refreshedSchedules.error;
      currentPaymentSchedules = (refreshedSchedules.data || []) as PaymentScheduleLike[];

      const paymentsToFix = Array.from(new Map(
        [...health.metrics.paymentsBeforeStartItems, ...health.metrics.paymentsAfterEndItems]
          .map((payment) => [payment.id, payment]),
      ).values());
      let reviewedOutOfPeriodPayments = 0;
      let correctedPaymentDates = 0;
      for (const payment of paymentsToFix) {
        if (payment.is_immutable) {
          reviewedPaymentIds.add(payment.id);
          reviewedOutOfPeriodPayments += 1;
          continue;
        }

        const nextPaymentDate = clampDateToContract(payment.payment_date, contract.start_date, contract.end_date);
        if (!nextPaymentDate || nextPaymentDate === payment.payment_date) continue;

        const { error } = await supabase
          .from('payments')
          .update({ payment_date: nextPaymentDate, updated_at: now })
          .eq('id', payment.id)
          .eq('company_id', contract.company_id);

        if (error) {
          if (!isImmutablePaymentError(error)) throw error;
          reviewItems.push(`دفعة مكتملة: ${payment.payment_number}`);
        } else {
          correctedPaymentDates += 1;
        }
      }
      if (paymentsToFix.length > 0) {
        fixedCount += correctedPaymentDates;
        if (correctedPaymentDates > 0) fixedActions.push(`تصحيح تواريخ دفعات: ${correctedPaymentDates}`);
        if (reviewedOutOfPeriodPayments > 0) {
          reviewItems.push(`توجد ${reviewedOutOfPeriodPayments} دفعة مكتملة خارج فترة العقد؛ تم الحفاظ على إيصالات القبض وتحتاج إعادة تخصيص آمنة.`);
        }
      }

      // Reconcile invoice amounts with payment schedules
      const currentInvoicesForReconciliation = await getCurrentContractInvoices(contract, currentPaymentSchedules);
      const { data: authData } = await supabase.auth.getUser();
      let reconciledAmounts = 0;
      for (const schedule of currentPaymentSchedules) {
        if (health.metrics.scheduleInvoiceDifference > 1 || health.metrics.scheduleInvoiceMismatchItems.length > 0) continue;
        if (isCancelled(schedule.status) || !schedule.invoice_id) continue;

        const matchingInvoice = currentInvoicesForReconciliation.find((inv) => inv.id === schedule.invoice_id);
        if (!matchingInvoice) continue;

        const scheduleAmount = Number(schedule.amount || 0);
        const invoiceAmount = Number(matchingInvoice.total_amount || 0);

        if (Math.abs(scheduleAmount - invoiceAmount) > 0.01) {
          const { error } = await (supabase as any).rpc('update_draft_invoice_amount_atomic', {
            p_invoice_id: matchingInvoice.id,
            p_company_id: contract.company_id,
            p_new_total: scheduleAmount,
            p_reason: `مطابقة مبلغ الفاتورة مع القسط ${schedule.installment_number || ''}`.trim(),
            p_actor_id: authData.user?.id || null,
          });

          if (error) {
            reviewItems.push(
              `تعذر مصالحة مبلغ الفاتورة ${matchingInvoice.invoice_number || matchingInvoice.id}: ${getReadableErrorMessage(error)}`
            );
          } else {
            await recalculateInvoicePaymentTotals(matchingInvoice.id, contract.company_id, now);
            reconciledAmounts += 1;
          }
        }
      }
      if (reconciledAmounts > 0) {
        fixedCount += reconciledAmounts;
        fixedActions.push(`مصالحة مبالغ الفواتير مع جدول الدفعات: ${reconciledAmounts}`);
      }

      if (health.metrics.scheduleInvoiceDifference > 1 || health.metrics.scheduleInvoiceMismatchItems.length > 0) {
        const reconciliation = await reconcileScheduleInvoicesForContract({
          contract,
          now,
        });

        fixedCount += reconciliation.fixedCount;
        fixedActions.push(...reconciliation.actions);
        reviewItems.push(...reconciliation.reviewItems);
      }

      for (const invoice of health.metrics.invoicePaymentCorrections) {
        try {
          const changed = await recalculateInvoicePaymentTotals(invoice.id, contract.company_id, now);
          if (changed) fixedCount += 1;
        } catch (error) {
          if (!isConflictError(error)) throw error;
          reviewItems.push(`رصيد فاتورة متعارض: ${invoice.invoice_number}`);
        }
      }
      if (health.metrics.invoicePaymentCorrections.length > 0) {
        fixedActions.push(`إعادة احتساب أرصدة: ${health.metrics.invoicePaymentCorrections.length}`);
      }

      const finalBalanceCorrections = await recalculateCurrentContractInvoicePaymentTotals({
        contract,
        now,
      });
      if (finalBalanceCorrections > 0) {
        fixedCount += finalBalanceCorrections;
        fixedActions.push(`مراجعة نهائية لأرصدة الفواتير: ${finalBalanceCorrections}`);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contract-health-analysis'] }),
        queryClient.invalidateQueries({ queryKey: ['contract-details'] }),
        queryClient.invalidateQueries({ queryKey: ['contract-details', contract.contract_number, contract.company_id] }),
        queryClient.invalidateQueries({ queryKey: ['contract-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['contract-invoices', contract.id] }),
        queryClient.invalidateQueries({ queryKey: ['contract-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-schedules'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['contract-health-analysis'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['contract-details'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['contract-invoices'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['contract-payments'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['payment-schedules'], type: 'active' }),
      ]);
      await refetch();

      toast({
        title: fixedCount > 0 ? 'تم تحديث صحة العقد' : 'لا توجد عناصر قابلة للإصلاح التلقائي',
        description: buildAutoFixToastDescription(fixedActions, reviewItems),
      });
    } catch (error) {
      const errorMessage = getReadableErrorMessage(error);
      console.error('[ContractHealthAnalysis] auto fix failed:', errorMessage, error);
      toast({
        title: 'تعذر الإصلاح التلقائي',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث بيانات العقد.',
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  const scoreTone = useMemo(() => {
    const score = health?.score || 0;
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  }, [health?.score]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#DDE5EF] bg-white p-5">
        <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!health) return null;

  return (
    <section className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            <Sparkles className="h-4 w-4" />
            {health.source === 'longcat' ? 'تحليل LongCat' : 'تحليل ذكي داخلي'}
          </div>
          <h2 className="text-xl font-black text-[#142033]">تحليل صحة العقد</h2>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-[#6A7688]">{health.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('rounded-xl border px-4 py-3 text-center', scoreTone)}>
            <p className="text-xs font-bold">درجة الصحة</p>
            <p className="text-2xl font-black">{health.score}%</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            تحديث
          </Button>
          <Button
            onClick={handleAutoFix}
            disabled={isFixing || fixableIssuesCount === 0}
            className="gap-2 bg-[#22C7A1] text-white hover:bg-[#1BAA8A]"
          >
            {isFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            إصلاح المشاكل تلقائيًا
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HealthMetric label="الفواتير الناقصة" value={String(health.metrics.missingInvoices)} icon={FileWarning} tone="amber" />
        <HealthMetric label="دفعات قبل البداية" value={String(health.metrics.paymentsBeforeStart)} icon={CalendarX} tone="red" />
        <HealthMetric label="إجمالي المدفوع" value={formatCurrency(health.metrics.totalPaid)} icon={CreditCard} tone="emerald" />
        <HealthMetric label="تجاوز قيمة العقد" value={formatCurrency(health.metrics.overpaidAmount)} icon={TrendingUp} tone="red" />
      </div>

      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-black text-emerald-900">القرار المقترح</p>
            <p className="mt-1 text-sm font-bold leading-6 text-emerald-800">{health.recommendation}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {health.issues.map((issue, index) => (
          <IssueCard key={`${issue.title}-${index}`} issue={issue} />
        ))}
      </div>
    </section>
  );
};

function normalizeContractRepairAgentPlan(payload: any): ContractRepairAgentPlan {
  const allowedTools = new Set(CONTRACT_REPAIR_AGENT_TOOLS);
  const actions = Array.isArray(payload?.actions)
    ? payload.actions
        .filter((action: any) => allowedTools.has(action?.tool))
        .map((action: any, index: number) => ({
          tool: action.tool as ContractRepairTool,
          priority: Number.isFinite(Number(action?.priority)) ? Number(action.priority) : index + 1,
          reason: typeof action?.reason === 'string' ? action.reason : 'اختار الوكيل هذه الأداة بناءً على حالة العقد.',
        }))
        .sort((left: ContractRepairAgentPlan['actions'][number], right: ContractRepairAgentPlan['actions'][number]) => left.priority - right.priority)
    : [];

  if (actions.length === 0) {
    return {
      source: 'local',
      summary: 'لا توجد أدوات إصلاح مطلوبة حاليًا.',
      actions: [],
      requiresReview: [],
    };
  }

  return {
    source: payload?.source === 'longcat' || payload?.source === 'openai' ? 'longcat' : 'local',
    summary: typeof payload?.summary === 'string'
      ? payload.summary
      : 'تم إعداد خطة إصلاح تلقائية بناءً على مؤشرات صحة العقد.',
    actions,
    requiresReview: Array.isArray(payload?.requiresReview)
      ? payload.requiresReview.map((item: unknown) => String(item)).slice(0, 6)
      : [],
  };
}

function buildLocalContractRepairAgentPlan(metrics: ContractHealthResult['metrics']): ContractRepairAgentPlan {
  const actions: ContractRepairAgentPlan['actions'] = [];
  const pushAction = (tool: ContractRepairTool, reason: string) => {
    if (actions.some((action) => action.tool === tool)) return;
    actions.push({ tool, priority: actions.length + 1, reason });
  };

  if (metrics.scheduleInvoiceMismatchItems.length > 0) {
    pushAction('repair_linked_invoice_contracts', 'توجد روابط أو تواريخ غير متطابقة بين الأقساط والفواتير.');
    pushAction('reconcile_schedule_invoices', 'يلزم تصحيح ربط وتواريخ الفواتير حسب جدول الدفعات.');
  }
  if (metrics.outsideInvoices.length > 0) pushAction('repair_outside_invoices', 'توجد فواتير خارج فترة العقد.');
  if (metrics.missingInvoices > 0) pushAction('create_missing_invoices', 'توجد فواتير ناقصة داخل فترة العقد.');
  if (metrics.paymentsBeforeStartItems.length > 0 || metrics.paymentsAfterEndItems.length > 0) {
    pushAction('repair_out_of_period_payments', 'توجد دفعات خارج فترة العقد.');
  }
  if (Math.abs(metrics.scheduleInvoiceDifference) > 1) {
    pushAction('reconcile_invoice_amounts', 'يوجد فرق مالي بين جدول الدفعات والفواتير.');
    pushAction('reconcile_schedule_invoices', 'يلزم مصالحة الفواتير مع الأقساط.');
  }
  if (metrics.invoicePaymentCorrections.length > 0) {
    pushAction('recalculate_invoice_balances', 'توجد أرصدة فواتير تحتاج إعادة احتساب.');
  }
  if (actions.length > 0) pushAction('final_balance_audit', 'مراجعة نهائية بعد الإصلاح.');

  return {
    source: 'local',
    summary: actions.length > 0
      ? 'تم إعداد خطة إصلاح تلقائية بناءً على مؤشرات صحة العقد.'
      : 'لا توجد أدوات إصلاح مطلوبة حاليًا.',
    actions,
    requiresReview: [],
  };
}

function getRepairToolLabel(tool: ContractRepairTool) {
  const labels: Record<ContractRepairTool, string> = {
    repair_linked_invoice_contracts: 'تصحيح روابط الفواتير',
    cancel_duplicate_schedules: 'إلغاء الأقساط المكررة',
    repair_outside_invoices: 'معالجة الفواتير خارج الفترة',
    create_missing_invoices: 'إنشاء الفواتير الناقصة',
    repair_out_of_period_payments: 'معالجة الدفعات خارج الفترة',
    reconcile_invoice_amounts: 'مصالحة مبالغ الفواتير',
    reconcile_schedule_invoices: 'مصالحة الأقساط والفواتير',
    recalculate_invoice_balances: 'إعادة احتساب الأرصدة',
    final_balance_audit: 'مراجعة نهائية',
  };

  return labels[tool];
}

function buildContractHealthMetrics({
  contract,
  invoices,
  payments,
  paymentSchedules,
  formatCurrency,
}: {
  contract: Contract;
  invoices: ContractHealthInvoice[];
  payments: ContractPaymentRow[];
  paymentSchedules: PaymentScheduleLike[];
  formatCurrency: (amount: number) => string;
}) {
  const startDate = normalizeDate(contract.start_date);
  const endDate = normalizeDate(contract.end_date);
  const activeInvoices = invoices.filter((invoice) => !isCancelled(invoice.status) && !isCancelled(invoice.payment_status));
  const activeInvoiceIds = new Set(activeInvoices.map((invoice) => invoice.id));
  const activePayments = payments.filter((payment) => {
    if (isCancelled(payment.payment_status)) return false;
    const hasActiveInvoiceAllocation = payment.invoice_allocations?.some((allocation) => activeInvoiceIds.has(allocation.target_id));
    return hasActiveInvoiceAllocation || !payment.invoice_id || activeInvoiceIds.has(payment.invoice_id);
  });
  const completedPayments = activePayments.filter((payment) => isCompletedPayment(payment.payment_status));
  const totalPaid = completedPayments.reduce((sum, payment) => {
    if (payment.has_active_allocations) {
      const invoiceAmount = (payment.invoice_allocations || [])
        .filter((allocation) => activeInvoiceIds.has(allocation.target_id))
        .reduce((allocationSum, allocation) => allocationSum + Number(allocation.amount || 0), 0);
      const contractAmount = (payment.contract_allocations || [])
        .filter((allocation) => allocation.target_id === contract.id)
        .reduce((allocationSum, allocation) => allocationSum + Number(allocation.amount || 0), 0);
      return sum + invoiceAmount + contractAmount;
    }
    return sum + Number(payment.amount || 0);
  }, 0);
  const contractAmount = Number(contract.contract_amount || 0);
  const monthlyAmount = Number(contract.monthly_amount || 0);
  const shouldExpectTimeBasedInvoices = !isCancelled(contract.status) && (monthlyAmount > 0 || contractAmount > 0);
  const expectedByMonths = startDate && endDate && shouldExpectTimeBasedInvoices ? monthSpanInclusive(startDate, endDate) : 0;
  const expectedByAmount = monthlyAmount > 0
    ? Math.ceil(contractAmount / monthlyAmount)
    : 0;
  const activeSchedules = getUniquePaymentSchedulesByMonth(paymentSchedules, startDate, endDate);
  const activeSchedulesForLinks = getActivePaymentSchedulesForPeriod(paymentSchedules, startDate, endDate);
  const expectedInvoices = Math.max(activeSchedules.length, expectedByMonths, expectedByAmount);
  const invoicesInsideContract = activeInvoices.filter((invoice) => isMonthInsideContract(invoice.invoice_date || invoice.due_date, startDate, endDate));
  const invoiceById = new Map(activeInvoices.map((invoice) => [invoice.id, invoice]));
  const invoiceByInvoiceMonth = new Map<string, Invoice>();
  for (const invoice of invoicesInsideContract) {
    const monthKey = getInvoiceMonthKey(invoice);
    if (monthKey !== 'unknown' && !invoiceByInvoiceMonth.has(monthKey)) {
      invoiceByInvoiceMonth.set(monthKey, invoice);
    }
  }
  const scheduleCountByInvoiceId = activeSchedulesForLinks.reduce((map, schedule) => {
    if (!schedule.invoice_id) return map;
    map.set(schedule.invoice_id, (map.get(schedule.invoice_id) || 0) + 1);
    return map;
  }, new Map<string, number>());
  const invoiceMonths = new Set<string>();
  for (const invoice of invoicesInsideContract) {
    const monthKey = getInvoiceMonthKey(invoice);
    if (monthKey !== 'unknown') invoiceMonths.add(monthKey);
  }
  const linkedPaymentsByInvoiceId = activePayments.reduce((map, payment) => {
    const linkedInvoiceIds = payment.invoice_allocations?.map((allocation) => allocation.target_id)
      || (payment.invoice_id ? [payment.invoice_id] : []);
    for (const invoiceId of linkedInvoiceIds) {
      const items = map.get(invoiceId) || [];
      items.push(payment);
      map.set(invoiceId, items);
    }
    return map;
  }, new Map<string, ContractPaymentRow[]>());
  const outsideInvoices = activeInvoices
    .filter((invoice) => !isMonthInsideContract(invoice.invoice_date || invoice.due_date, startDate, endDate))
    .map((invoice) => {
      const nextDueDate = clampDateToContract(invoice.invoice_date || invoice.due_date, contract.start_date, contract.end_date);
      const linkedPayments = linkedPaymentsByInvoiceId.get(invoice.id) || [];
      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number || 'بدون رقم',
        invoice_date: invoice.invoice_date || null,
        due_date: invoice.due_date || null,
        total_amount: Number(invoice.total_amount || 0),
        reason: isBefore(invoice.invoice_date || invoice.due_date, startDate) ? 'before_start' : 'after_end',
        target_month_has_invoice: nextDueDate ? invoiceMonths.has(getMonthKey(nextDueDate)) : false,
        has_linked_payments: linkedPayments.length > 0,
        has_journal_entry: Boolean(invoice.journal_entry_id),
        linked_payment_ids: linkedPayments.map((payment) => payment.id),
        linked_payment_numbers: linkedPayments.map((payment) => payment.payment_number || payment.reference_number || payment.id),
      };
    }) as InvoiceIssueItem[];
  const invoicesOutsideContract = activeInvoices.length - invoicesInsideContract.length;
  const missingScheduleIssueItems = activeSchedules
    .filter((schedule) => schedule.due_date && !invoiceMonths.has(getMonthKey(schedule.due_date)))
    .map((schedule) => ({
      id: schedule.id,
      installment_number: schedule.installment_number ?? null,
      due_date: schedule.due_date || null,
      amount: Number(schedule.amount || 0),
    }));
  const missingScheduleItems = missingScheduleIssueItems
    .map((schedule) => `قسط ${schedule.installment_number || '-'} بتاريخ ${formatDateLabel(schedule.due_date)} بقيمة ${formatCurrency(schedule.amount)}`);
  const coveredMonths = invoiceMonths.size;
  const missingInvoices = Math.max(0, Math.max(expectedInvoices - coveredMonths, missingScheduleIssueItems.length));
  const paymentsBeforeStartItems = activePayments
    .filter((payment) => isBefore(payment.payment_date, startDate))
    .map((payment) => ({
      id: payment.id,
      payment_number: payment.payment_number || payment.reference_number || 'دفعة بدون رقم',
      payment_date: payment.payment_date || null,
      amount: Number(payment.amount || 0),
      payment_status: payment.payment_status || null,
      invoice_id: payment.invoice_id || null,
      is_immutable: isCompletedPayment(payment.payment_status),
      reason: 'before_start',
    })) as PaymentIssueItem[];
  const paymentsAfterEndItems = activePayments
    .filter((payment) => isAfter(payment.payment_date, endDate))
    .map((payment) => ({
      id: payment.id,
      payment_number: payment.payment_number || payment.reference_number || 'دفعة بدون رقم',
      payment_date: payment.payment_date || null,
      amount: Number(payment.amount || 0),
      payment_status: payment.payment_status || null,
      invoice_id: payment.invoice_id || null,
      is_immutable: isCompletedPayment(payment.payment_status),
      reason: 'after_end',
    })) as PaymentIssueItem[];
  const paymentsBeforeStart = paymentsBeforeStartItems.length;
  const paymentsAfterEnd = paymentsAfterEndItems.length;
  const scheduleTotal = activeSchedules.reduce((sum, schedule) => sum + Number(schedule.amount || 0), 0);
  const invoicesTotal = invoicesInsideContract.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const scheduleInvoiceMismatchItems = activeSchedulesForLinks.reduce((items, schedule) => {
    const scheduleMonthKey = getMonthKey(schedule.due_date);
    const linkedInvoice = schedule.invoice_id ? invoiceById.get(schedule.invoice_id) : null;
    const expectedInvoice = invoiceByInvoiceMonth.get(scheduleMonthKey) || null;
    const scheduleAmount = Number(schedule.amount || 0);
    const linkedInvoiceAmount = Number(linkedInvoice?.total_amount || 0);
    const linkedInvoiceCount = schedule.invoice_id ? scheduleCountByInvoiceId.get(schedule.invoice_id) || 0 : 0;
    const wrongLink = Boolean(expectedInvoice && linkedInvoice && expectedInvoice.id !== linkedInvoice.id);
    const duplicateLink = linkedInvoiceCount > 1;
    const missingInvoice = Boolean(!linkedInvoice && !expectedInvoice);
    const amountMismatch = Boolean(linkedInvoice && Math.abs(scheduleAmount - linkedInvoiceAmount) > 1);
    if (!wrongLink && !duplicateLink && !missingInvoice && !amountMismatch) return items;

    items.push({
      schedule_id: schedule.id,
      invoice_id: linkedInvoice?.id || schedule.invoice_id || null,
      installment_number: schedule.installment_number ?? null,
      due_date: schedule.due_date || null,
      schedule_amount: scheduleAmount,
      invoice_number: linkedInvoice?.invoice_number || expectedInvoice?.invoice_number || 'بدون فاتورة',
      invoice_date: linkedInvoice?.invoice_date || expectedInvoice?.invoice_date || null,
      invoice_due_date: linkedInvoice?.due_date || expectedInvoice?.due_date || null,
      invoice_amount: Number((linkedInvoice || expectedInvoice)?.total_amount || 0),
      difference: Number((scheduleAmount - Number((linkedInvoice || expectedInvoice)?.total_amount || 0)).toFixed(2)),
      reason: wrongLink
        ? 'wrong_link'
        : duplicateLink
        ? 'duplicate_link'
        : missingInvoice
        ? 'missing_invoice'
        : 'amount_mismatch',
    });

    return items;
  }, [] as ScheduleInvoiceMismatchItem[]);
  const paymentsByInvoiceId = completedPayments.reduce((map, payment) => {
    if (payment.has_active_allocations) {
      for (const allocation of payment.invoice_allocations || []) {
        map.set(allocation.target_id, (map.get(allocation.target_id) || 0) + Number(allocation.amount || 0));
      }
      return map;
    }
    if (payment.invoice_id) {
      map.set(payment.invoice_id, (map.get(payment.invoice_id) || 0) + Number(payment.amount || 0));
    }
    return map;
  }, new Map<string, number>());
  const invoicePaymentCorrections = activeInvoices.reduce((items, invoice) => {
    const paidAmount = paymentsByInvoiceId.get(invoice.id) || 0;
    const totalAmount = Number(invoice.total_amount || 0);
    const balanceDue = Math.max(0, totalAmount - paidAmount);
    const paymentStatus = balanceDue <= 1 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    const status = getInvoiceStatusForBalance(balanceDue, invoice.due_date, invoice.status);
    const currentPaid = Number(invoice.paid_amount || 0);
    const currentBalance = Number(invoice.balance_due ?? Math.max(0, totalAmount - currentPaid));
    const currentPaymentStatus = String(invoice.payment_status || '').toLowerCase();
    const currentStatus = String(invoice.status || '').toLowerCase();
    const statusNeedsUpdate =
      (paymentStatus === 'paid' && !['paid', 'completed', 'cleared'].includes(currentPaymentStatus))
      || (paymentStatus === 'partial' && !['partial', 'partially_paid'].includes(currentPaymentStatus))
      || (paymentStatus === 'unpaid' && ['paid', 'completed', 'cleared', 'partial', 'partially_paid'].includes(currentPaymentStatus));
    const lifecycleStatusNeedsUpdate = currentStatus !== status;

    if (
      Math.abs(currentPaid - paidAmount) > 1
      || Math.abs(currentBalance - balanceDue) > 1
      || statusNeedsUpdate
      || lifecycleStatusNeedsUpdate
    ) {
      items.push({
        id: invoice.id,
        invoice_number: invoice.invoice_number || 'بدون رقم',
        paid_amount: paidAmount,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        status,
      });
    }

    return items;
  }, [] as InvoicePaymentCorrection[]);
  const contractPeriodLabel = `${formatDateLabel(contract.start_date)} إلى ${formatDateLabel(contract.end_date)}`;

  return {
    contractNumber: contract.contract_number,
    status: contract.status,
    startDate: contract.start_date,
    endDate: contract.end_date,
    expectedInvoices,
    activeInvoices: coveredMonths,
    activeInvoicesTotal: invoicesTotal,
    missingInvoices,
    paymentsBeforeStart,
    paymentsAfterEnd,
    invoicesOutsideContract,
    outsideInvoices,
    paymentsBeforeStartItems,
    paymentsAfterEndItems,
    missingScheduleItems,
    missingScheduleIssueItems,
    invoicePaymentCorrections,
    invoiceDateKeys: Array.from(invoiceMonths),
    contractPeriodLabel,
    totalPaid,
    contractAmount,
    overpaidAmount: contractAmount > 0 ? Math.max(0, totalPaid - contractAmount) : 0,
    scheduleTotal,
    invoicesTotal,
    scheduleInvoiceDifference: Math.abs(scheduleTotal - invoicesTotal),
    balanceDue: Number(contract.balance_due ?? Math.max(0, contractAmount - totalPaid)),
    daysUntilEnd: endDate ? Math.ceil((endDate.getTime() - startOfDay(new Date()).getTime()) / 86400000) : null,
    scheduleInvoiceMismatchItems,
  };
}

function buildLocalContractHealth(metrics: ReturnType<typeof buildContractHealthMetrics>): ContractHealthResult {
  const issues: HealthIssue[] = [];

  if (metrics.paymentsBeforeStart > 0) {
    const mutablePaymentCount = metrics.paymentsBeforeStartItems.filter((payment) => !payment.is_immutable).length;
    issues.push({
      title: 'توجد دفعات قبل بداية العقد',
      detail: `فترة العقد من ${metrics.contractPeriodLabel}. تم العثور على ${metrics.paymentsBeforeStart} دفعة بتاريخ أقدم من بداية العقد.`,
      severity: mutablePaymentCount > 0 ? 'critical' : 'warning',
      count: metrics.paymentsBeforeStart,
      fixable: mutablePaymentCount > 0,
      items: metrics.paymentsBeforeStartItems.map((payment) => `${payment.payment_number} - ${formatDateLabel(payment.payment_date)} - ${metricsFormatCurrency(metrics, payment.amount)}${payment.is_immutable ? ' - دفعة مكتملة محمية وتحتاج مراجعة' : ''}`),
    });
  }

  if (metrics.missingInvoices > 0) {
    issues.push({
      title: 'توجد فواتير ناقصة',
      detail: `فترة العقد من ${metrics.contractPeriodLabel}. المتوقع ${metrics.expectedInvoices} فاتورة، والموجود داخل مدة العقد ${metrics.activeInvoices} فاتورة فقط.`,
      severity: 'warning',
      count: metrics.missingInvoices,
      fixable: true,
      items: metrics.missingScheduleItems.slice(0, 8),
    });
  }

  if (metrics.overpaidAmount > 0) {
    issues.push({
      title: 'المدفوع أكبر من قيمة العقد',
      detail: `يوجد تجاوز في المدفوعات بقيمة ${metrics.overpaidAmount.toLocaleString('ar-QA')} ر.ق مقارنة بقيمة العقد.`,
      severity: 'critical',
      count: 1,
    });
  }

  if (metrics.invoicesOutsideContract > 0) {
    issues.push({
      title: 'فواتير خارج فترة العقد',
      detail: `فترة العقد من ${metrics.contractPeriodLabel}. يوجد ${metrics.invoicesOutsideContract} فاتورة بتاريخ خارج هذه الفترة وسيتم إلغاؤها مع عكس القيود أو الدفعات المرتبطة عند الحاجة.`,
      severity: 'warning',
      count: metrics.invoicesOutsideContract,
      fixable: true,
      items: metrics.outsideInvoices.map((invoice) => `${invoice.invoice_number} - تاريخ الفاتورة ${formatDateLabel(invoice.invoice_date)} - تاريخ الاستحقاق ${formatDateLabel(invoice.due_date)} - ${metricsFormatCurrency(metrics, invoice.total_amount)}${invoice.has_linked_payments || invoice.has_journal_entry ? ' - سيتم إلغاؤها مع عكس الارتباطات المالية' : ' - سيتم إلغاؤها وإخراجها من التحليل'}`),
    });
  }

  if (metrics.paymentsAfterEnd > 0) {
    const mutablePaymentCount = metrics.paymentsAfterEndItems.filter((payment) => !payment.is_immutable).length;
    issues.push({
      title: 'دفعات بعد نهاية العقد',
      detail: `فترة العقد من ${metrics.contractPeriodLabel}. يوجد ${metrics.paymentsAfterEnd} دفعة بتاريخ بعد نهاية العقد.`,
      severity: 'warning',
      count: metrics.paymentsAfterEnd,
      fixable: mutablePaymentCount > 0,
      items: metrics.paymentsAfterEndItems.map((payment) => `${payment.payment_number} - ${formatDateLabel(payment.payment_date)} - ${metricsFormatCurrency(metrics, payment.amount)}${payment.is_immutable ? ' - دفعة مكتملة محمية وتحتاج مراجعة' : ''}`),
    });
  }

  if (metrics.scheduleInvoiceDifference > 1 || metrics.scheduleInvoiceMismatchItems.length > 0) {
    issues.push({
      title: 'فرق بين جدول الدفعات والفواتير',
      detail: metrics.scheduleInvoiceDifference > 1
        ? `يوجد فرق مالي بين جدول الدفعات والفواتير بقيمة ${metrics.scheduleInvoiceDifference.toLocaleString('ar-QA')} ر.ق.`
        : `يوجد ${metrics.scheduleInvoiceMismatchItems.length} ربط غير متطابق بين جدول الدفعات والفواتير.`,
      severity: 'warning',
      count: Math.max(1, metrics.scheduleInvoiceMismatchItems.length),
    });
  }

  if (metrics.scheduleInvoiceDifference > 1 || metrics.scheduleInvoiceMismatchItems.length > 0) {
    const scheduleIssue = issues[issues.length - 1];
    if (scheduleIssue) {
      scheduleIssue.detail = metrics.scheduleInvoiceDifference > 1
        ? `يوجد فرق مالي بين جدول الدفعات والفواتير بقيمة ${metricsFormatCurrency(metrics, metrics.scheduleInvoiceDifference)}. مجموع جدول الدفعات ${metricsFormatCurrency(metrics, metrics.scheduleTotal)}، ومجموع الفواتير ${metricsFormatCurrency(metrics, metrics.invoicesTotal)}.`
        : `يوجد ربط غير متطابق بين الأقساط والفواتير رغم أن الإجمالي المالي لا يظهر فرقًا كبيرًا.`;
      scheduleIssue.fixable = true;
      scheduleIssue.items = metrics.scheduleInvoiceMismatchItems.slice(0, 8).map((item) => {
        if (item.reason === 'date_mismatch') {
          return `قسط ${item.installment_number || '-'} بتاريخ ${formatDateLabel(item.due_date)}: تاريخ استحقاق الفاتورة لا يطابق شهر القسط - الفاتورة ${item.invoice_number}`;
        }

        const reasonLabel = item.reason === 'wrong_link'
          ? 'ربط القسط بفاتورة شهر مختلف'
          : item.reason === 'duplicate_link'
          ? 'الفاتورة مرتبطة بأكثر من قسط'
          : item.reason === 'missing_invoice'
          ? 'لا توجد فاتورة مرتبطة بهذا القسط'
          : 'مبلغ القسط لا يطابق مبلغ الفاتورة';

        return `قسط ${item.installment_number || '-'} بتاريخ ${formatDateLabel(item.due_date)}: ${reasonLabel} - القسط ${metricsFormatCurrency(metrics, item.schedule_amount)} والفاتورة ${item.invoice_number} ${metricsFormatCurrency(metrics, item.invoice_amount)}`;
      });
    }
  }

  if (metrics.invoicePaymentCorrections.length > 0) {
    issues.push({
      title: 'أرصدة فواتير تحتاج إعادة احتساب',
      detail: `${metrics.invoicePaymentCorrections.length} فاتورة لا تطابق الدفعات المرتبطة بها في المدفوع أو الرصيد المتبقي.`,
      severity: 'warning',
      count: metrics.invoicePaymentCorrections.length,
      fixable: true,
      items: metrics.invoicePaymentCorrections.slice(0, 8).map((invoice) => `${invoice.invoice_number} - المدفوع الصحيح ${metricsFormatCurrency(metrics, invoice.paid_amount)} - الرصيد الصحيح ${metricsFormatCurrency(metrics, invoice.balance_due)}`),
    });
  }

  if (issues.length === 0) {
    issues.push({
      title: 'العقد متوازن ماليًا',
      detail: 'لا تظهر مشاكل واضحة في الدفعات أو الفواتير أو تواريخ العقد حسب البيانات الحالية.',
      severity: 'good',
    });
  }

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const score = Math.max(0, 100 - criticalCount * 28 - warningCount * 12);

  let recommendation = 'يمكن متابعة العقد بشكل طبيعي مع مراقبة السداد والفواتير.';
  if (criticalCount > 0) {
    recommendation = 'لا يفضل تجديد أو إغلاق العقد قبل معالجة المشاكل الحرجة في الدفعات والتواريخ.';
  } else if (metrics.daysUntilEnd !== null && metrics.daysUntilEnd <= 30 && metrics.balanceDue <= 0) {
    recommendation = 'العقد مناسب للإغلاق أو التجديد بعد التأكد من حالة المركبة والمخالفات.';
  } else if (metrics.daysUntilEnd !== null && metrics.daysUntilEnd <= 30) {
    recommendation = 'العقد قريب من الانتهاء. يفضل متابعة التحصيل أولًا ثم اتخاذ قرار التجديد.';
  }

  return {
    score,
    summary: criticalCount > 0
      ? 'يوجد خلل مهم في صحة العقد ويحتاج مراجعة قبل أي قرار مالي.'
      : warningCount > 0
      ? 'العقد قابل للمتابعة لكن توجد ملاحظات يجب معالجتها.'
      : 'العقد يبدو سليمًا من ناحية الفواتير والدفعات والتواريخ.',
    recommendation,
    source: 'local',
    issues,
    metrics: {
      expectedInvoices: metrics.expectedInvoices,
      activeInvoices: metrics.activeInvoices,
      missingInvoices: metrics.missingInvoices,
      paymentsBeforeStart: metrics.paymentsBeforeStart,
      paymentsAfterEnd: metrics.paymentsAfterEnd,
      invoicesOutsideContract: metrics.invoicesOutsideContract,
      totalPaid: metrics.totalPaid,
      contractAmount: metrics.contractAmount,
      overpaidAmount: metrics.overpaidAmount,
      scheduleTotal: metrics.scheduleTotal,
      invoicesTotal: metrics.invoicesTotal,
      scheduleInvoiceDifference: metrics.scheduleInvoiceDifference,
      contractPeriodLabel: metrics.contractPeriodLabel,
      outsideInvoices: metrics.outsideInvoices,
      paymentsBeforeStartItems: metrics.paymentsBeforeStartItems,
      paymentsAfterEndItems: metrics.paymentsAfterEndItems,
      missingScheduleItems: metrics.missingScheduleItems,
      missingScheduleIssueItems: metrics.missingScheduleIssueItems,
      invoicePaymentCorrections: metrics.invoicePaymentCorrections,
      scheduleInvoiceMismatchItems: metrics.scheduleInvoiceMismatchItems,
      invoiceDateKeys: metrics.invoiceDateKeys,
    },
  };
}

const HealthMetric: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  tone: 'emerald' | 'amber' | 'red';
}> = ({ label, value, icon: Icon, tone }) => {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <div className="rounded-lg border border-[#DDE5EF] bg-[#FCFDFE] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#6A7688]">{label}</p>
          <p className="mt-2 text-lg font-black text-[#142033]">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const IssueCard: React.FC<{ issue: HealthIssue }> = ({ issue }) => {
  const styles = {
    critical: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[issue.severity];
  const Icon = issue.severity === 'good' ? CheckCircle2 : AlertTriangle;

  return (
    <div className={cn('rounded-lg border p-4', styles)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-black">{issue.title}</p>
          <p className="mt-1 text-sm font-medium leading-6">{issue.detail}</p>
          {issue.items && issue.items.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-md bg-white/65 p-2 text-xs font-bold leading-5">
              {issue.items.slice(0, 8).map((item, index) => (
                <li key={`${issue.title}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
          {issue.fixable && issue.severity !== 'good' && (
            <p className="mt-2 text-xs font-black">يمكن إصلاح هذه المشكلة من زر الإصلاح التلقائي بالأعلى.</p>
          )}
        </div>
      </div>
    </div>
  );
};

function isCancelled(status: string | null | undefined) {
  return ['cancelled', 'canceled', 'void'].includes(String(status || '').toLowerCase());
}

function isCompletedPayment(status: string | null | undefined) {
  return ['completed', 'paid', 'cleared', 'confirmed', 'approved'].includes(String(status || '').toLowerCase());
}

function getInvoiceStatusForBalance(
  balanceDue: number,
  dueDateValue: string | null | undefined,
  currentStatus?: string | null,
) {
  if (balanceDue <= 1) return 'paid';

  const dueDate = normalizeDate(dueDateValue);
  if (dueDate && dueDate < startOfDay(new Date())) return 'overdue';

  const normalizedCurrent = String(currentStatus || '').toLowerCase();
  return normalizedCurrent === 'draft' ? 'draft' : 'sent';
}

function normalizeDate(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const dateOnly = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isBefore(dateValue: string | null | undefined, target: Date | null) {
  const date = normalizeDate(dateValue);
  return !!date && !!target && date < target;
}

function isAfter(dateValue: string | null | undefined, target: Date | null) {
  const date = normalizeDate(dateValue);
  return !!date && !!target && date > target;
}

function isMonthInsideContract(dateValue: string | null | undefined, start: Date | null, end: Date | null) {
  const date = normalizeDate(dateValue);
  if (!date || !start || !end) return false;
  const month = date.getFullYear() * 12 + date.getMonth();
  const startMonth = start.getFullYear() * 12 + start.getMonth();
  const endMonth = end.getFullYear() * 12 + end.getMonth();
  return month >= startMonth && month <= endMonth;
}

function getMonthKey(dateValue: string | null | undefined) {
  const date = normalizeDate(dateValue);
  if (!date) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getUniquePaymentSchedulesByMonth(schedules: PaymentScheduleLike[], start: Date | null, end: Date | null) {
  const byMonth = new Map<string, PaymentScheduleLike>();

  for (const schedule of schedules) {
    if (isCancelled(schedule.status) || !schedule.due_date) continue;
    if (!isMonthInsideContract(schedule.due_date, start, end)) continue;

    const key = getMonthKey(schedule.due_date);
    const current = byMonth.get(key);
    if (!current || (!current.invoice_id && schedule.invoice_id)) {
      byMonth.set(key, schedule);
    }
  }

  return Array.from(byMonth.values()).sort((a, b) => {
    const left = normalizeDate(a.due_date)?.getTime() || 0;
    const right = normalizeDate(b.due_date)?.getTime() || 0;
    return left - right;
  });
}

function getActivePaymentSchedulesForPeriod(schedules: PaymentScheduleLike[], start: Date | null, end: Date | null) {
  return schedules
    .filter((schedule) => !isCancelled(schedule.status) && !!schedule.due_date)
    .filter((schedule) => isMonthInsideContract(schedule.due_date, start, end))
    .sort((a, b) => {
      const left = normalizeDate(a.due_date)?.getTime() || 0;
      const right = normalizeDate(b.due_date)?.getTime() || 0;
      return left - right;
    });
}

function getDuplicatePaymentScheduleIds(
  schedules: PaymentScheduleLike[],
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  monthlyAmount: number,
) {
  const start = normalizeDate(startValue);
  const end = normalizeDate(endValue);
  const keepByMonth = new Map<string, PaymentScheduleLike>();
  const duplicateIds: string[] = [];

  for (const schedule of schedules) {
    if (isCancelled(schedule.status) || !schedule.due_date) continue;
    if (!isMonthInsideContract(schedule.due_date, start, end)) continue;

    const key = getMonthKey(schedule.due_date);
    const current = keepByMonth.get(key);
    if (!current) {
      keepByMonth.set(key, schedule);
      continue;
    }

    const currentMatchesMonthly = monthlyAmount > 0
      && Math.abs(Number(current.amount || 0) - monthlyAmount) <= 1;
    const scheduleMatchesMonthly = monthlyAmount > 0
      && Math.abs(Number(schedule.amount || 0) - monthlyAmount) <= 1;

    if (currentMatchesMonthly !== scheduleMatchesMonthly) {
      if (scheduleMatchesMonthly) {
        duplicateIds.push(current.id);
        keepByMonth.set(key, schedule);
      } else {
        duplicateIds.push(schedule.id);
      }
    } else if (!current.invoice_id && schedule.invoice_id) {
      duplicateIds.push(current.id);
      keepByMonth.set(key, schedule);
    } else if (
      Math.abs(Number(current.amount || 0) - Number(schedule.amount || 0)) <= 1
      && Math.abs(Number(current.paid_amount || 0) - Number(schedule.paid_amount || 0)) <= 1
    ) {
      duplicateIds.push(schedule.id);
    }
  }

  return duplicateIds;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampDateToContract(dateValue: string | null | undefined, startValue: string | null | undefined, endValue: string | null | undefined) {
  const date = normalizeDate(dateValue);
  const start = normalizeDate(startValue);
  const end = normalizeDate(endValue);

  if (!date || !start || !end) return null;
  if (date < start) return toDateInputValue(start);
  if (date > end) return toDateInputValue(end);
  return toDateInputValue(date);
}

function formatDateLabel(dateValue: string | null | undefined) {
  const date = normalizeDate(dateValue);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ar-QA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function metricsFormatCurrency(_metrics: ReturnType<typeof buildContractHealthMetrics>, amount: number) {
  return new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency: 'QAR',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

async function getCurrentActiveInvoiceMonthKeys(contract: Contract, paymentSchedules: PaymentScheduleLike[]) {
  const startDate = normalizeDate(contract.start_date);
  const endDate = normalizeDate(contract.end_date);
  const scheduleInvoiceIds = Array.from(new Set(
    paymentSchedules
      .map((schedule) => schedule.invoice_id)
      .filter(Boolean),
  )) as string[];

  let invoicesQuery = supabase
    .from('invoices')
    .select('id, invoice_date, due_date, status, payment_status')
    .eq('company_id', contract.company_id);

  invoicesQuery = scheduleInvoiceIds.length
    ? invoicesQuery.or(`contract_id.eq.${contract.id},id.in.(${scheduleInvoiceIds.join(',')})`)
    : invoicesQuery.eq('contract_id', contract.id);

  const { data, error } = await invoicesQuery;
  if (error) throw error;

  const invoiceMonthsSet = new Set<string>();
  for (const invoice of (data || [])) {
    if (isCancelled(invoice.status) || isCancelled(invoice.payment_status)) continue;
    if (!isMonthInsideContract(invoice.due_date || invoice.invoice_date, startDate, endDate)) continue;
    const monthKey = getInvoiceMonthKey(invoice);
    if (monthKey !== 'unknown') invoiceMonthsSet.add(monthKey);
  }
  return Array.from(invoiceMonthsSet);
}

async function getCurrentContractInvoices(contract: Contract, paymentSchedules: PaymentScheduleLike[]) {
  const scheduleInvoiceIds = Array.from(new Set(
    paymentSchedules
      .map((schedule) => schedule.invoice_id)
      .filter(Boolean),
  )) as string[];

  let invoicesQuery = supabase
    .from('invoices')
    .select('id, contract_id, invoice_number, invoice_date, due_date, total_amount, subtotal, paid_amount, balance_due, status, payment_status, journal_entry_id, created_at, updated_at')
    .eq('company_id', contract.company_id)
    .order('invoice_date', { ascending: true });

  invoicesQuery = scheduleInvoiceIds.length
    ? invoicesQuery.or(`contract_id.eq.${contract.id},id.in.(${scheduleInvoiceIds.join(',')})`)
    : invoicesQuery.eq('contract_id', contract.id);

  const { data, error } = await invoicesQuery;
  if (error) throw error;
  return (data || []) as ContractHealthInvoice[];
}

async function getCurrentContractPaymentSchedules(contract: Contract) {
  const { data, error } = await supabase
    .from('contract_payment_schedules')
    .select('id, installment_number, due_date, amount, status, paid_date, paid_amount, invoice_id')
    .eq('contract_id', contract.id)
    .eq('company_id', contract.company_id)
    .order('installment_number', { ascending: true });

  if (error) throw error;
  return (data || []) as PaymentScheduleLike[];
}

async function repairScheduleLinkedInvoiceContracts({
  contract,
  paymentSchedules,
  now,
}: {
  contract: Contract;
  paymentSchedules: PaymentScheduleLike[];
  now: string;
}) {
  const linkedInvoiceIds = Array.from(new Set(
    paymentSchedules
      .filter((schedule) => !isCancelled(schedule.status))
      .map((schedule) => schedule.invoice_id)
      .filter(Boolean),
  )) as string[];

  if (linkedInvoiceIds.length === 0) return 0;

  const { data, error } = await supabase
    .from('invoices')
    .select('id, contract_id, status, payment_status')
    .in('id', linkedInvoiceIds)
    .eq('company_id', contract.company_id);

  if (error) throw error;

  const invoiceIdsToRepair = (data || [])
    .filter((invoice) => !isCancelled(invoice.status) && !isCancelled(invoice.payment_status))
    .filter((invoice) => !invoice.contract_id)
    .map((invoice) => invoice.id);

  if (invoiceIdsToRepair.length === 0) return 0;

  const { data: authData } = await supabase.auth.getUser();
  let repairedCount = 0;
  for (const invoiceId of invoiceIdsToRepair) {
    const { error: updateError } = await (supabase as any).rpc(
      'attach_schedule_invoice_to_contract_atomic',
      {
        p_invoice_id: invoiceId,
        p_contract_id: contract.id,
        p_company_id: contract.company_id,
        p_reason: `ربط فاتورة القسط بالعقد من إصلاح صحة العقد بتاريخ ${now}`,
        p_actor_id: authData.user?.id || null,
      }
    );

    if (updateError) throw updateError;
    repairedCount += 1;
  }

  return repairedCount;
}

async function recalculateCurrentContractInvoicePaymentTotals({
  contract,
  now,
}: {
  contract: Contract;
  now: string;
}) {
  const schedules = await getCurrentContractPaymentSchedules(contract);
  const invoices = await getCurrentContractInvoices(contract, schedules);
  const activeInvoiceIds = Array.from(new Set(
    invoices
      .filter((invoice) => !isCancelled(invoice.status) && !isCancelled(invoice.payment_status))
      .map((invoice) => invoice.id),
  ));
  let changedCount = 0;

  for (const invoiceId of activeInvoiceIds) {
    const changed = await recalculateInvoicePaymentTotals(invoiceId, contract.company_id, now);
    if (changed) changedCount += 1;
  }

  return changedCount;
}

function getActiveContractInvoicesForPeriod(contract: Contract, invoices: Invoice[]) {
  const startDate = normalizeDate(contract.start_date);
  const endDate = normalizeDate(contract.end_date);

  return invoices.filter((invoice) => {
    if (isCancelled(invoice.status) || isCancelled(invoice.payment_status)) return false;
    return isMonthInsideContract(invoice.invoice_date || invoice.due_date, startDate, endDate);
  });
}

function getInvoiceMonthKey(invoice: InvoiceDateLike) {
  return getMonthKey(invoice.invoice_date || invoice.due_date);
}

function getInvoiceMonthKeys(invoice: InvoiceDateLike) {
  const keys = new Set<string>();
  const invoiceDateKey = getMonthKey(invoice.invoice_date);
  const dueDateKey = getMonthKey(invoice.due_date);

  if (invoiceDateKey !== 'unknown') keys.add(invoiceDateKey);
  if (dueDateKey !== 'unknown') keys.add(dueDateKey);

  return keys;
}

function invoiceMatchesMonth(invoice: InvoiceDateLike, monthKey: string) {
  return getInvoiceMonthKeys(invoice).has(monthKey);
}

async function reconcileScheduleInvoicesForContract({
  contract,
  now,
}: {
  contract: Contract;
  now: string;
}) {
  const actions: string[] = [];
  const reviewItems: string[] = [];
  let fixedCount = 0;
  const startDate = normalizeDate(contract.start_date);
  const endDate = normalizeDate(contract.end_date);
  const monthlyAmount = Number(contract.monthly_amount || 0);
  const contractAmount = Number(contract.contract_amount || 0);
  const expectedMonthCount = startDate && endDate ? monthSpanInclusive(startDate, endDate) : 0;

  let schedules = await getCurrentContractPaymentSchedules(contract);
  let activeSchedules = getUniquePaymentSchedulesByMonth(schedules, startDate, endDate);
  const scheduleTotal = activeSchedules.reduce((sum, schedule) => sum + Number(schedule.amount || 0), 0);
  const isUniformMonthlyContract = monthlyAmount > 0
    && contractAmount > 0
    && expectedMonthCount > 0
    && Math.abs(expectedMonthCount * monthlyAmount - contractAmount) <= 1;

  if (isUniformMonthlyContract && scheduleTotal > contractAmount + 1) {
    let excessAmount = scheduleTotal - contractAmount;
    let normalizedSchedules = 0;

    for (const schedule of activeSchedules) {
      if (excessAmount <= 1) break;
      const currentAmount = Number(schedule.amount || 0);
      if (currentAmount <= monthlyAmount + 1) continue;

      const reduction = Math.min(currentAmount - monthlyAmount, excessAmount);
      const nextAmount = Number((currentAmount - reduction).toFixed(2));
      const { error } = await supabase
        .from('contract_payment_schedules')
        .update({
          amount: nextAmount,
          updated_at: now,
        })
        .eq('id', schedule.id)
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id);

      if (error) throw error;
      excessAmount = Number((excessAmount - reduction).toFixed(2));
      normalizedSchedules += 1;
    }

    if (normalizedSchedules > 0) {
      fixedCount += normalizedSchedules;
      actions.push(`تصحيح مبالغ الأقساط: ${normalizedSchedules}`);
      schedules = await getCurrentContractPaymentSchedules(contract);
      activeSchedules = getUniquePaymentSchedulesByMonth(schedules, startDate, endDate);
    }

    if (excessAmount > 1) {
      reviewItems.push(`تبقى فرق في جدول الدفعات بقيمة ${excessAmount.toLocaleString('ar-QA')} ر.ق يحتاج مراجعة.`);
    }
  }

  let invoices = await getCurrentContractInvoices(contract, schedules);
  let activeInvoices = getActiveContractInvoicesForPeriod(contract, invoices);
  let invoiceByMonth = new Map<string, Invoice>();
  for (const invoice of activeInvoices) {
    const monthKey = getInvoiceMonthKey(invoice);
    if (monthKey !== 'unknown' && !invoiceByMonth.has(monthKey)) {
      invoiceByMonth.set(monthKey, invoice);
    }
  }

  if (isUniformMonthlyContract && startDate && endDate) {
    const graphRepair = await repairUniformScheduleMonthGraph({
      contract,
      schedules,
      invoices: activeInvoices,
      startDate,
      endDate,
      monthlyAmount,
      now,
    });
    if (graphRepair.fixedCount > 0) {
      fixedCount += graphRepair.fixedCount;
      actions.push(...graphRepair.actions);
      reviewItems.push(...graphRepair.reviewItems);
      schedules = await getCurrentContractPaymentSchedules(contract);
      activeSchedules = getUniquePaymentSchedulesByMonth(schedules, startDate, endDate);
    }
  }

  const invoiceById = new Map(activeInvoices.map((invoice) => [invoice.id, invoice]));
  let activeSchedulesForLinks = getActivePaymentSchedulesForPeriod(schedules, startDate, endDate);
  let relinkedSchedules = 0;
  const invoiceDateCorrections: Array<{ invoice: Invoice; dueDate: string }> = [];
  for (const schedule of activeSchedulesForLinks) {
    if (isCancelled(schedule.status) || !schedule.due_date) continue;

    const scheduleMonthKey = getMonthKey(schedule.due_date);
    let expectedInvoice = invoiceByMonth.get(scheduleMonthKey) || null;
    const linkedInvoice = schedule.invoice_id ? invoiceById.get(schedule.invoice_id) : null;
    const linkedInvoiceMonthKey = linkedInvoice ? getInvoiceMonthKey(linkedInvoice) : null;
    const linkedInvoiceDueMonthKey = linkedInvoice ? getMonthKey(linkedInvoice.due_date) : null;

    if (
      linkedInvoice
      && linkedInvoiceMonthKey === scheduleMonthKey
      && linkedInvoiceDueMonthKey !== scheduleMonthKey
    ) {
      invoiceDateCorrections.push({
        invoice: linkedInvoice,
        dueDate: schedule.due_date,
      });
    }

    if (expectedInvoice && schedule.invoice_id !== expectedInvoice.id) {
      const { error } = await supabase
        .from('contract_payment_schedules')
        .update({
          invoice_id: expectedInvoice.id,
          updated_at: now,
        })
        .eq('id', schedule.id)
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id);

      if (error) throw error;
      relinkedSchedules += 1;
      continue;
    }

    if (!expectedInvoice && linkedInvoice && linkedInvoiceMonthKey !== scheduleMonthKey) {
      const { error } = await supabase
        .from('contract_payment_schedules')
        .update({
          invoice_id: null,
          updated_at: now,
        })
        .eq('id', schedule.id)
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id);

      if (error) throw error;
      relinkedSchedules += 1;
    }
  }

  if (invoiceDateCorrections.length > 0) {
    const correctedInvoiceDates = await applyInvoiceDueDateCorrections({
      contract,
      corrections: invoiceDateCorrections,
      now,
    });

    fixedCount += correctedInvoiceDates;
    actions.push(`تصحيح تواريخ استحقاق الفواتير: ${correctedInvoiceDates}`);
    invoices = await getCurrentContractInvoices(contract, schedules);
    activeInvoices = getActiveContractInvoicesForPeriod(contract, invoices);
    invoiceByMonth = new Map<string, Invoice>();
    for (const invoice of activeInvoices) {
      const monthKey = getInvoiceMonthKey(invoice);
      if (monthKey !== 'unknown' && !invoiceByMonth.has(monthKey)) {
        invoiceByMonth.set(monthKey, invoice);
      }
    }
  }

  if (relinkedSchedules > 0) {
    fixedCount += relinkedSchedules;
    actions.push(`تصحيح ربط الأقساط بالفواتير: ${relinkedSchedules}`);
    schedules = await getCurrentContractPaymentSchedules(contract);
    activeSchedules = getUniquePaymentSchedulesByMonth(schedules, startDate, endDate);
    activeSchedulesForLinks = getActivePaymentSchedulesForPeriod(schedules, startDate, endDate);
    invoices = await getCurrentContractInvoices(contract, schedules);
    activeInvoices = getActiveContractInvoicesForPeriod(contract, invoices);
    invoiceByMonth = new Map<string, Invoice>();
    for (const invoice of activeInvoices) {
      const monthKey = getInvoiceMonthKey(invoice);
      if (monthKey !== 'unknown' && !invoiceByMonth.has(monthKey)) {
        invoiceByMonth.set(monthKey, invoice);
      }
    }
  }

  const missingScheduleIds = activeSchedulesForLinks
    .filter((schedule) => !schedule.invoice_id && schedule.due_date && !invoiceByMonth.has(getMonthKey(schedule.due_date)))
    .map((schedule) => schedule.id);

  if (missingScheduleIds.length > 0) {
    const existingInvoiceMonthKeys = activeInvoices
      .map((invoice) => getInvoiceMonthKey(invoice))
      .filter((key) => key !== 'unknown');
    const createdCount = await createMissingInvoicesFromActiveSchedules({
      contract,
      paymentSchedules: schedules,
      existingInvoices: existingInvoiceMonthKeys,
      maxInvoices: missingScheduleIds.length,
      targetScheduleIds: missingScheduleIds,
      now,
    });

    if (createdCount > 0) {
      fixedCount += createdCount;
      actions.push(`إنشاء وربط فواتير ناقصة: ${createdCount}`);
      schedules = await getCurrentContractPaymentSchedules(contract);
      activeSchedules = getUniquePaymentSchedulesByMonth(schedules, startDate, endDate);
      activeSchedulesForLinks = getActivePaymentSchedulesForPeriod(schedules, startDate, endDate);
      invoices = await getCurrentContractInvoices(contract, schedules);
    }
  }

  const latestInvoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const schedulesByInvoiceId = activeSchedulesForLinks.reduce((map, schedule) => {
    if (isCancelled(schedule.status) || !schedule.invoice_id) return map;
    const items = map.get(schedule.invoice_id) || [];
    items.push(schedule);
    map.set(schedule.invoice_id, items);
    return map;
  }, new Map<string, PaymentScheduleLike[]>());
  let reconciledAmounts = 0;
  for (const [invoiceId, linkedSchedules] of schedulesByInvoiceId) {
    const invoice = latestInvoicesById.get(invoiceId);
    if (!invoice || isCancelled(invoice.status) || isCancelled(invoice.payment_status)) continue;

    const scheduleAmount = linkedSchedules.reduce((sum, schedule) => sum + Number(schedule.amount || 0), 0);
    const invoiceAmount = Number(invoice.total_amount || 0);
    if (Math.abs(scheduleAmount - invoiceAmount) <= 1) continue;

    await updateInvoiceAmountToSchedule({
      contract,
      invoice,
      amount: scheduleAmount,
      now,
    });
    reconciledAmounts += 1;
  }

  if (reconciledAmounts > 0) {
    fixedCount += reconciledAmounts;
    actions.push(`مطابقة مبالغ الفواتير مع الأقساط: ${reconciledAmounts}`);
  }

  return { fixedCount, actions, reviewItems };
}

async function repairUniformScheduleMonthGraph({
  contract,
  schedules,
  invoices,
  startDate,
  endDate,
  monthlyAmount,
  now,
}: {
  contract: Contract;
  schedules: PaymentScheduleLike[];
  invoices: Invoice[];
  startDate: Date;
  endDate: Date;
  monthlyAmount: number;
  now: string;
}) {
  const actions: string[] = [];
  const reviewItems: string[] = [];
  let fixedCount = 0;
  const expectedMonths: Array<{ key: string; dueDate: string; installmentNumber: number }> = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= endMonth) {
    const dueDate = toDateInputValue(cursor);
    expectedMonths.push({
      key: getMonthKey(dueDate),
      dueDate,
      installmentNumber: expectedMonths.length + 1,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const invoiceByMonth = new Map<string, Invoice>();
  for (const invoice of invoices) {
    const key = getInvoiceMonthKey(invoice);
    if (key !== 'unknown' && !invoiceByMonth.has(key)) invoiceByMonth.set(key, invoice);
  }

  const activeInside = getUniquePaymentSchedulesByMonth(schedules, startDate, endDate);
  const scheduleByMonth = new Map(
    activeInside
      .filter((schedule) => !!schedule.due_date)
      .map((schedule) => [getMonthKey(schedule.due_date), schedule]),
  );
  const missingMonths = expectedMonths.filter((month) => !scheduleByMonth.has(month.key));
  const safeOutside = schedules.filter((schedule) => {
    if (isCancelled(schedule.status) || !schedule.due_date) return false;
    if (isMonthInsideContract(schedule.due_date, startDate, endDate)) return false;
    return !schedule.invoice_id
      && Math.abs(Number(schedule.paid_amount || 0)) <= 0.01
      && String(schedule.status || '').toLowerCase() !== 'paid';
  });

  const reusableOutside = safeOutside.slice(0, missingMonths.length);
  const schedulesToRenumber = [...activeInside, ...reusableOutside];
  const needsRenumbering = activeInside.some((schedule) => {
    const expected = expectedMonths.find((month) => month.key === getMonthKey(schedule.due_date));
    return expected && schedule.installment_number !== expected.installmentNumber;
  });

  if (needsRenumbering || reusableOutside.length > 0) {
    for (let index = 0; index < schedulesToRenumber.length; index += 1) {
      const { error } = await supabase
        .from('contract_payment_schedules')
        .update({ installment_number: 10000 + index, updated_at: now })
        .eq('id', schedulesToRenumber[index].id)
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id);
      if (error) throw error;
    }
  }

  for (const month of expectedMonths) {
    const existing = scheduleByMonth.get(month.key);
    if (!existing) continue;
    if (existing.installment_number === month.installmentNumber && !needsRenumbering) continue;

    const { error } = await supabase
      .from('contract_payment_schedules')
      .update({ installment_number: month.installmentNumber, updated_at: now })
      .eq('id', existing.id)
      .eq('contract_id', contract.id)
      .eq('company_id', contract.company_id);
    if (error) throw error;
    fixedCount += 1;
  }

  for (let index = 0; index < missingMonths.length; index += 1) {
    const month = missingMonths[index];
    const invoice = invoiceByMonth.get(month.key);
    if (!invoice) {
      reviewItems.push(`لا توجد فاتورة يمكن ربطها بالقسط ${month.installmentNumber}.`);
      continue;
    }

    const paidAmount = Number(invoice.paid_amount || 0);
    const balanceDue = Number(invoice.balance_due ?? (Number(invoice.total_amount || monthlyAmount) - paidAmount));
    const status = balanceDue <= 1
      ? 'paid'
      : paidAmount > 0
        ? 'partially_paid'
        : normalizeDate(month.dueDate) && normalizeDate(month.dueDate)! < new Date()
          ? 'overdue'
          : 'pending';
    const values = {
      invoice_id: invoice.id,
      amount: Number(invoice.total_amount || monthlyAmount),
      due_date: month.dueDate,
      installment_number: month.installmentNumber,
      status,
      paid_amount: paidAmount,
      paid_date: status === 'paid' ? (invoice.invoice_date || month.dueDate) : null,
      description: `Installment ${month.installmentNumber} - ${month.key}`,
      notes: `Auto-repaired contract schedule graph at ${now}`,
      updated_at: now,
    };

    const reusable = reusableOutside[index];
    if (reusable) {
      const { error } = await supabase
        .from('contract_payment_schedules')
        .update(values)
        .eq('id', reusable.id)
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('contract_payment_schedules').insert({
        ...values,
        contract_id: contract.id,
        company_id: contract.company_id,
      });
      if (error) throw error;
    }
    fixedCount += 1;
  }

  const unusedOutside = safeOutside.slice(reusableOutside.length);
  if (unusedOutside.length > 0) {
    const { error } = await supabase
      .from('contract_payment_schedules')
      .update({ status: 'cancelled', invoice_id: null, updated_at: now })
      .in('id', unusedOutside.map((schedule) => schedule.id))
      .eq('contract_id', contract.id)
      .eq('company_id', contract.company_id);
    if (error) throw error;
    fixedCount += unusedOutside.length;
  }

  if (fixedCount > 0) actions.push(`إعادة بناء تسلسل الأقساط الشهرية: ${fixedCount}`);
  return { fixedCount, actions, reviewItems };
}

async function applyInvoiceDueDateCorrections({
  contract,
  corrections,
  now,
}: {
  contract: Contract;
  corrections: Array<{ invoice: Invoice; dueDate: string }>;
  now: string;
}) {
  const uniqueCorrections = Array.from(
    corrections.reduce((map, correction) => {
      map.set(correction.invoice.id, correction);
      return map;
    }, new Map<string, { invoice: Invoice; dueDate: string }>()).values(),
  ).sort((left, right) => {
    const leftTime = normalizeDate(left.invoice.invoice_date || left.invoice.due_date)?.getTime() || 0;
    const rightTime = normalizeDate(right.invoice.invoice_date || right.invoice.due_date)?.getTime() || 0;
    return leftTime - rightTime;
  });

  try {
    for (const correction of uniqueCorrections) {
      const { error } = await supabase
        .from('invoices')
        .update({
          due_date: correction.dueDate,
          updated_at: now,
        })
        .eq('id', correction.invoice.id)
        .eq('company_id', contract.company_id);

      if (error) throw error;
    }

    return uniqueCorrections.length;
  } catch (error) {
    if (!isConflictError(error)) throw error;
  }

  for (const correction of uniqueCorrections) {
    const { error } = await supabase
      .from('invoices')
      .update({
        due_date: null,
        updated_at: now,
      })
      .eq('id', correction.invoice.id)
      .eq('company_id', contract.company_id);

    if (error) throw error;
  }

  for (const correction of uniqueCorrections) {
    const { error } = await supabase
      .from('invoices')
      .update({
        due_date: correction.dueDate,
        updated_at: now,
      })
      .eq('id', correction.invoice.id)
      .eq('company_id', contract.company_id);

    if (error) throw error;
  }

  return uniqueCorrections.length;
}

async function updateInvoiceAmountToSchedule({
  contract,
  invoice,
  amount,
  now,
}: {
  contract: Contract;
  invoice: Invoice;
  amount: number;
  now: string;
}) {
  const { error } = await supabase
    .from('invoices')
    .update({
      subtotal: amount,
      total_amount: amount,
      updated_at: now,
    })
    .eq('id', invoice.id)
    .eq('company_id', contract.company_id);

  if (error) throw error;

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('id')
    .eq('invoice_id', invoice.id)
    .order('line_number', { ascending: true });

  if (itemsError) throw itemsError;
  if (!items || items.length !== 1) {
    await recalculateInvoicePaymentTotals(invoice.id, contract.company_id, now);
    return;
  }

  const { error: itemUpdateError } = await supabase
    .from('invoice_items')
    .update({
      quantity: 1,
      unit_price: amount,
      line_total: amount,
      tax_amount: 0,
    })
    .eq('id', items[0].id);

  if (itemUpdateError) throw itemUpdateError;

  await recalculateInvoicePaymentTotals(invoice.id, contract.company_id, now);
}

function getMissingScheduleIssueItemsFromSchedules({
  paymentSchedules,
  invoiceDateKeys,
  startDate,
  endDate,
}: {
  paymentSchedules: PaymentScheduleLike[];
  invoiceDateKeys: string[];
  startDate: string | null | undefined;
  endDate: string | null | undefined;
}) {
  const invoiceMonths = new Set(invoiceDateKeys);
  const missingSchedulesByMonth = new Map<string, MissingScheduleIssueItem>();

  for (const schedule of paymentSchedules) {
    if (isCancelled(schedule.status) || !schedule.due_date) continue;
    if (!isMonthInsideContract(schedule.due_date, normalizeDate(startDate), normalizeDate(endDate))) continue;

    const invoiceDate = clampDateToContract(schedule.due_date, startDate, endDate);
    if (!invoiceDate) continue;

    const monthKey = getMonthKey(invoiceDate);
    if (invoiceMonths.has(monthKey) || missingSchedulesByMonth.has(monthKey)) continue;

    missingSchedulesByMonth.set(monthKey, {
      id: schedule.id,
      installment_number: schedule.installment_number ?? null,
      due_date: schedule.due_date || null,
      amount: Number(schedule.amount || 0),
    });
  }

  return Array.from(missingSchedulesByMonth.values()).sort((left, right) => {
    const leftTime = normalizeDate(left.due_date)?.getTime() || 0;
    const rightTime = normalizeDate(right.due_date)?.getTime() || 0;
    return leftTime - rightTime;
  });
}

function getMissingContractInvoiceMonthKeys({
  contract,
  invoiceDateKeys,
  paymentSchedules,
}: {
  contract: Contract;
  invoiceDateKeys: string[];
  paymentSchedules: PaymentScheduleLike[];
}) {
  const start = normalizeDate(contract.start_date);
  const end = normalizeDate(contract.end_date);
  if (!start || !end) return [];

  const invoiceMonths = new Set(invoiceDateKeys);
  const activeScheduleMonths = new Set(
    paymentSchedules
      .filter((schedule) => !isCancelled(schedule.status) && !!schedule.due_date)
      .filter((schedule) => isMonthInsideContract(schedule.due_date, start, end))
      .map((schedule) => getMonthKey(schedule.due_date))
      .filter((key) => key !== 'unknown'),
  );

  const missingMonths: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    const monthKey = getMonthKey(toDateInputValue(cursor));
    if (!invoiceMonths.has(monthKey) && !activeScheduleMonths.has(monthKey)) {
      missingMonths.push(monthKey);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return missingMonths;
}

function isConflictError(error: unknown) {
  const payload = error as { status?: number; code?: string; message?: string; details?: string };
  const message = `${payload?.message || ''} ${payload?.details || ''}`.toLowerCase();

  return payload?.status === 409
    || payload?.code === '23505'
    || message.includes('duplicate')
    || message.includes('already exists')
    || message.includes('unique');
}

function isImmutablePaymentError(error: unknown) {
  const payload = error as { code?: string; message?: string; details?: string };
  const message = `${payload?.message || ''} ${payload?.details || ''}`.toLowerCase();

  return payload?.code === 'P0001'
    || message.includes('completed payments are immutable')
    || message.includes('immutable');
}

function isAlreadyCancelledError(error: unknown) {
  const payload = error as { status?: number; code?: string; message?: string; details?: string };
  const message = `${payload?.message || ''} ${payload?.details || ''}`.toLowerCase();

  return message.includes('already_cancelled')
    || message.includes('already cancelled')
    || message.includes('already canceled')
    || message.includes('ملغ')
    || payload?.status === 404;
}

function getReadableErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  const payload = error as {
    code?: string;
    details?: string | null;
    hint?: string | null;
    message?: string | null;
    status?: number;
  };

  return [
    payload?.message,
    payload?.details,
    payload?.hint,
    payload?.code,
    payload?.status ? `HTTP ${payload.status}` : null,
  ].filter(Boolean).join(' - ');
}

async function recalculateInvoicePaymentTotals(invoiceId: string, companyId: string, now: string) {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any).rpc('repair_invoice_financial_state_atomic', {
    p_invoice_id: invoiceId,
    p_company_id: companyId,
    p_reason: `إعادة احتساب رصيد الفاتورة من دفتر التخصيص بتاريخ ${now}`,
    p_actor_id: authData.user?.id || null,
  });

  if (error) throw error;
  return Boolean(data?.changed);
}

async function repairOutOfPeriodInvoice({
  contract,
  invoice,
  now,
}: {
  contract: Contract;
  invoice: InvoiceIssueItem;
  now: string;
}) {
  const firstDelete = await deleteContractOutOfPeriodInvoice({
    contract,
    invoiceId: invoice.id,
  });

  if (firstDelete.deleted) {
    return { changed: true, reviewMessage: null as string | null };
  }

  if (firstDelete.error && isMissingFunctionError(firstDelete.error)) {
    return {
      changed: false,
      reviewMessage: `تعذر حذف الفاتورة ${invoice.invoice_number} لأن تحديث قاعدة البيانات الخاص بحذف الفواتير خارج الفترة لم يطبق بعد.`,
    };
  }

  if (firstDelete.error && !canFallbackToInvoiceCancellation(firstDelete.error)) {
    throw firstDelete.error;
  }

  const { error: invoiceCancelError } = await (supabase as unknown as SupabaseRpcClient).rpc('cancel_invoice_with_reversal', {
    p_invoice_id: invoice.id,
    p_company_id: contract.company_id,
    p_reason: `إلغاء فاتورة خارج فترة العقد ضمن إصلاح صحة العقد بتاريخ ${now}`,
  });

  if (invoiceCancelError && !isAlreadyCancelledError(invoiceCancelError)) {
    throw invoiceCancelError;
  }

  const secondDelete = await deleteContractOutOfPeriodInvoice({
    contract,
    invoiceId: invoice.id,
  });

  if (secondDelete.deleted) {
    return { changed: true, reviewMessage: null as string | null };
  }

  if (secondDelete.error && !isProtectedFinancialDeleteError(secondDelete.error) && !isMissingFunctionError(secondDelete.error)) {
    throw secondDelete.error;
  }

  await detachAndCancelOutOfPeriodInvoice({
    contract,
    invoiceId: invoice.id,
    now,
  });

  const reason = secondDelete.error
    ? getReadableErrorMessage(secondDelete.error)
    : secondDelete.reason || 'تعذر الحذف النهائي بعد الإلغاء';

  return {
    changed: true,
    reviewMessage: `تم إلغاء الفاتورة ${invoice.invoice_number} وفصلها عن العقد، لكن الحذف النهائي يحتاج مراجعة: ${reason}`,
  };
}

async function deleteContractOutOfPeriodInvoice({
  contract,
  invoiceId,
}: {
  contract: Contract;
  invoiceId: string;
}) {
  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc<DeleteOutOfPeriodInvoiceResponse>('delete_contract_out_of_period_invoice', {
    p_invoice_id: invoiceId,
    p_contract_id: contract.id,
    p_company_id: contract.company_id,
  });

  if (error) {
    return { deleted: false, error, reason: null as string | null };
  }

  return {
    deleted: Boolean(data?.deleted) || data?.reason === 'invoice_not_found',
    error: null,
    reason: data?.reason ? String(data.reason) : null,
  };
}

async function detachAndCancelOutOfPeriodInvoice({
  contract,
  invoiceId,
  now,
}: {
  contract: Contract;
  invoiceId: string;
  now: string;
}) {
  const { error: detachScheduleError } = await supabase
    .from('contract_payment_schedules')
    .update({ invoice_id: null, updated_at: now })
    .eq('invoice_id', invoiceId)
    .eq('contract_id', contract.id)
    .eq('company_id', contract.company_id);

  if (detachScheduleError) throw detachScheduleError;

  const { error: detachInvoiceError } = await supabase
    .from('invoices')
    .update({
      contract_id: null,
      status: 'cancelled',
      payment_status: 'cancelled',
      balance_due: 0,
      updated_at: now,
    })
    .eq('id', invoiceId)
    .eq('company_id', contract.company_id);

  if (detachInvoiceError) throw detachInvoiceError;
}

async function createMissingInvoicesForContractMonths({
  contract,
  existingInvoices,
  skipMonthKeys,
  targetMonthKeys,
  maxInvoices,
  now,
  paymentSchedules,
}: {
  contract: Contract;
  existingInvoices: string[];
  skipMonthKeys: string[];
  targetMonthKeys?: string[];
  maxInvoices: number;
  now: string;
  paymentSchedules?: PaymentScheduleLike[];
}) {
  const start = normalizeDate(contract.start_date);
  const end = normalizeDate(contract.end_date);
  const amount = Number(contract.monthly_amount || 0);
  if (!start || !end || amount <= 0 || maxInvoices <= 0) return 0;

  const existingMonths = new Set(existingInvoices);
  const skipMonths = new Set(skipMonthKeys);
  const targetMonths = new Set(targetMonthKeys || []);
  const shouldRestrictToTargetMonths = targetMonths.size > 0;

  // Also skip months that already have a payment schedule (they will be handled by createMissingInvoicesFromActiveSchedules)
  if (paymentSchedules) {
    for (const schedule of paymentSchedules) {
      if (schedule.due_date && !isCancelled(schedule.status)) {
        skipMonths.add(getMonthKey(schedule.due_date));
      }
    }
  }

  let createdCount = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end && createdCount < maxInvoices) {
    const monthKey = getMonthKey(toDateInputValue(cursor));
    if (
      !existingMonths.has(monthKey)
      && !skipMonths.has(monthKey)
      && (!shouldRestrictToTargetMonths || targetMonths.has(monthKey))
    ) {
      const invoiceDate = cursor.getFullYear() === start.getFullYear() && cursor.getMonth() === start.getMonth()
        ? toDateInputValue(start)
        : toDateInputValue(cursor);

      const insertResult = await insertInvoiceWithRetry({
        contract,
        invoiceDate,
        amount,
        now,
        maxRetries: 3,
      });

      if (insertResult.status === 'created') {
        existingMonths.add(monthKey);
        createdCount += 1;
      } else if (insertResult.status === 'linked') {
        const restored = await restoreExistingInvoiceForContractMonth({
          contract,
          invoiceId: insertResult.invoiceId,
          invoiceDate,
          amount,
          now,
        });
        existingMonths.add(monthKey);
        if (restored || insertResult.restored) createdCount += 1;
      } else if (insertResult.status === 'failed') {
        throw insertResult.error;
      }
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return createdCount;
}

type InsertInvoiceResult =
  | { status: 'created'; invoiceId: string }
  | { status: 'linked'; invoiceId: string; restored?: boolean }
  | { status: 'failed'; error: unknown };

async function insertInvoiceWithRetry({
  contract,
  invoiceDate,
  amount,
  now,
  maxRetries,
}: {
  contract: Contract;
  invoiceDate: string;
  amount: number;
  now: string;
  maxRetries: number;
}): Promise<InsertInvoiceResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const invoiceNumber = await getAvailableInvoiceNumber(contract.contract_number, invoiceDate);
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: contract.company_id,
        customer_id: (contract as any).customer_id || null,
        contract_id: contract.id,
        invoice_number: invoiceNumber,
        invoice_type: 'sales',
        invoice_date: invoiceDate,
        due_date: invoiceDate,
        subtotal: amount,
        tax_amount: 0,
        total_amount: amount,
        paid_amount: 0,
        balance_due: amount,
        status: 'overdue',
        payment_status: 'unpaid',
        currency: 'QAR',
        notes: `Generated by contract health repair at ${now}`,
      })
      .select('id')
      .single();

    if (!invoiceError) {
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          line_number: 1,
          item_description: `Monthly rental payment - ${invoiceDate.slice(0, 7)}`,
          item_description_ar: 'قسط إيجار شهري',
          quantity: 1,
          unit_price: amount,
          line_total: amount,
          tax_rate: 0,
          tax_amount: 0,
        });

      if (itemError) {
        if (isConflictError(itemError)) {
          const existingInvoice = await findExistingActiveInvoiceForMonth(contract, invoiceDate)
            || await findAnyExistingInvoiceForMonth(contract, invoiceDate);
          if (existingInvoice) return { status: 'linked', invoiceId: existingInvoice.id };
        }
        if (attempt < maxRetries - 1) continue;
        return { status: 'failed', error: itemError };
      }

      return { status: 'created', invoiceId: invoice.id };
    }

    if (isConflictError(invoiceError)) {
      const existingInvoice = await findExistingActiveInvoiceForMonth(contract, invoiceDate)
        || await findAnyExistingInvoiceForMonth(contract, invoiceDate);
      if (existingInvoice) return { status: 'linked', invoiceId: existingInvoice.id };
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50 + attempt * 50));
        continue;
      }
    }

    return { status: 'failed', error: invoiceError };
  }

  return { status: 'failed', error: new Error('Max retries exceeded') };
}

async function restoreExistingInvoiceForContractMonth({
  contract,
  invoiceId,
  invoiceDate,
  amount,
  now,
}: {
  contract: Contract;
  invoiceId: string;
  invoiceDate: string;
  amount: number;
  now: string;
}) {
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, payment_status, paid_amount, balance_due, journal_entry_id')
    .eq('id', invoiceId)
    .eq('company_id', contract.company_id)
    .maybeSingle();

  if (invoiceError) throw invoiceError;
  if (!invoice) return false;

  const invoiceIsCancelled = isCancelled(invoice.status) || isCancelled(invoice.payment_status);
  if (invoiceIsCancelled) {
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, payment_status')
      .eq('invoice_id', invoiceId)
      .eq('company_id', contract.company_id);

    if (paymentsError) throw paymentsError;

    const hasActivePayments = (payments || []).some((payment) => !isCancelled(payment.payment_status));
    if (hasActivePayments || invoice.journal_entry_id) {
      throw new Error(`لا يمكن إعادة تفعيل الفاتورة ${invoice.invoice_number || invoiceId} تلقائيًا لأنها ملغاة وعليها أثر مالي.`);
    }
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      company_id: contract.company_id,
      customer_id: (contract as any).customer_id || null,
      contract_id: contract.id,
      invoice_date: invoiceDate,
      due_date: invoiceDate,
      subtotal: amount,
      total_amount: amount,
      tax_amount: 0,
      paid_amount: invoiceIsCancelled ? 0 : Number(invoice.paid_amount || 0),
      balance_due: invoiceIsCancelled ? amount : Number(invoice.balance_due ?? amount),
      status: invoiceIsCancelled ? getInvoiceStatusForBalance(amount, invoiceDate, 'sent') : invoice.status,
      payment_status: invoiceIsCancelled ? 'unpaid' : invoice.payment_status,
      updated_at: now,
    })
    .eq('id', invoiceId)
    .eq('company_id', contract.company_id);

  if (updateError) throw updateError;
  await recalculateInvoicePaymentTotals(invoiceId, contract.company_id, now);

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('id')
    .eq('invoice_id', invoiceId)
    .order('line_number', { ascending: true });

  if (itemsError) throw itemsError;

  if (!items || items.length === 0) {
    const { error: insertItemError } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoiceId,
        line_number: 1,
        item_description: `Monthly rental payment - ${invoiceDate.slice(0, 7)}`,
        item_description_ar: 'قسط إيجار شهري',
        quantity: 1,
        unit_price: amount,
        line_total: amount,
        tax_rate: 0,
        tax_amount: 0,
      });

    if (insertItemError) throw insertItemError;
  } else if (items.length === 1) {
    const { error: updateItemError } = await supabase
      .from('invoice_items')
      .update({
        quantity: 1,
        unit_price: amount,
        line_total: amount,
        tax_amount: 0,
      })
      .eq('id', items[0].id);

    if (updateItemError) throw updateItemError;
  }

  return invoiceIsCancelled;
}

async function createMissingInvoicesFromActiveSchedules({
  contract,
  paymentSchedules,
  existingInvoices,
  maxInvoices,
  targetScheduleIds,
  now,
}: {
  contract: Contract;
  paymentSchedules: PaymentScheduleLike[];
  existingInvoices: string[];
  maxInvoices: number;
  targetScheduleIds?: string[];
  now: string;
}) {
  const existingMonths = new Set(existingInvoices);
  const targetIds = new Set(targetScheduleIds || []);
  const shouldRestrictToTargets = targetIds.size > 0;
  if (targetScheduleIds && targetScheduleIds.length === 0) return 0;
  const schedulesByMonth = new Map<string, { schedule: PaymentScheduleLike; invoiceDate: string }>();
  const linkedInvoiceIds = Array.from(new Set(paymentSchedules.map((schedule) => schedule.invoice_id).filter(Boolean))) as string[];
  const activeLinkedInvoiceMonthsById = new Map<string, Set<string>>();
  let linkedCount = 0;

  if (linkedInvoiceIds.length > 0) {
    const { data: linkedInvoices, error: linkedInvoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_date, due_date, status, payment_status')
      .in('id', linkedInvoiceIds)
      .eq('company_id', contract.company_id);

    if (linkedInvoicesError) throw linkedInvoicesError;

    for (const invoice of linkedInvoices || []) {
      if (
        !isCancelled(invoice.status)
        && !isCancelled(invoice.payment_status)
        && isMonthInsideContract(invoice.due_date || invoice.invoice_date, normalizeDate(contract.start_date), normalizeDate(contract.end_date))
      ) {
        const monthKey = getInvoiceMonthKey(invoice);
        activeLinkedInvoiceMonthsById.set(
          invoice.id,
          monthKey === 'unknown' ? new Set() : new Set([monthKey]),
        );
      }
    }
  }

  for (const schedule of paymentSchedules) {
    if (shouldRestrictToTargets && !targetIds.has(schedule.id)) continue;
    if (isCancelled(schedule.status) || !schedule.due_date) continue;

    const invoiceDate = clampDateToContract(schedule.due_date, contract.start_date, contract.end_date);
    if (!invoiceDate) continue;

    const monthKey = getMonthKey(invoiceDate);
    if (schedule.invoice_id && activeLinkedInvoiceMonthsById.get(schedule.invoice_id)?.has(monthKey)) continue;
    if (existingMonths.has(monthKey)) {
      const linked = await linkScheduleToExistingInvoiceForMonth({
        contract,
        schedule,
        invoiceDate,
        now,
      });
      if (linked) linkedCount += 1;
      continue;
    }
    if (schedulesByMonth.has(monthKey)) continue;

    schedulesByMonth.set(monthKey, { schedule, invoiceDate });
  }

  let createdCount = 0;
  const orderedSchedules = Array.from(schedulesByMonth.values()).sort((left, right) => {
    const leftTime = normalizeDate(left.invoiceDate)?.getTime() || 0;
    const rightTime = normalizeDate(right.invoiceDate)?.getTime() || 0;
    return leftTime - rightTime;
  });

  for (const { schedule, invoiceDate } of orderedSchedules.slice(0, Math.max(0, maxInvoices))) {
    const amount = Number(schedule.amount || 0);
    if (amount <= 0) continue;

    if (schedule.due_date !== invoiceDate) {
      const { error: scheduleDateError } = await supabase
        .from('contract_payment_schedules')
        .update({
          due_date: invoiceDate,
          invoice_id: null,
          updated_at: now,
        })
        .eq('id', schedule.id)
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id);

      if (scheduleDateError) throw scheduleDateError;
    }

    const existingInvoice = await findExistingActiveInvoiceForMonth(contract, invoiceDate);
    if (existingInvoice) {
      const { error: scheduleLinkError } = await supabase
        .from('contract_payment_schedules')
        .update({
          due_date: invoiceDate,
          invoice_id: existingInvoice.id,
          updated_at: now,
        })
        .eq('id', schedule.id)
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id);

      if (scheduleLinkError) throw scheduleLinkError;
      existingMonths.add(getMonthKey(invoiceDate));
      linkedCount += 1;
      continue;
    }

    const insertResult = await insertInvoiceWithRetry({
      contract,
      invoiceDate,
      amount,
      now,
      maxRetries: 3,
    });

    if (insertResult.status === 'failed') {
      if (isConflictError(insertResult.error)) {
        const conflictInvoice = await findExistingActiveInvoiceForMonth(contract, invoiceDate)
          || await findAnyExistingInvoiceForMonth(contract, invoiceDate);
        if (conflictInvoice) {
          await restoreExistingInvoiceForContractMonth({
            contract,
            invoiceId: conflictInvoice.id,
            invoiceDate,
            amount,
            now,
          });

          const { error: conflictLinkError } = await supabase
            .from('contract_payment_schedules')
            .update({
              due_date: invoiceDate,
              invoice_id: conflictInvoice.id,
              updated_at: now,
            })
            .eq('id', schedule.id)
            .eq('contract_id', contract.id)
            .eq('company_id', contract.company_id);

          if (conflictLinkError) throw conflictLinkError;
          existingMonths.add(getMonthKey(invoiceDate));
          linkedCount += 1;
          continue;
        }
      }
      throw insertResult.error;
    }

    const invoiceId = insertResult.invoiceId;
    if (insertResult.status === 'linked') {
      await restoreExistingInvoiceForContractMonth({
        contract,
        invoiceId,
        invoiceDate,
        amount,
        now,
      });

      const { error: linkSchedError } = await supabase
        .from('contract_payment_schedules')
        .update({
          due_date: invoiceDate,
          invoice_id: invoiceId,
          updated_at: now,
        })
        .eq('id', schedule.id)
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id);

      if (linkSchedError) throw linkSchedError;
      existingMonths.add(getMonthKey(invoiceDate));
      linkedCount += 1;
      continue;
    }

    const { error: scheduleError } = await supabase
      .from('contract_payment_schedules')
      .update({
        due_date: invoiceDate,
        invoice_id: invoiceId,
        updated_at: now,
      })
      .eq('id', schedule.id)
      .eq('contract_id', contract.id)
      .eq('company_id', contract.company_id);

    if (scheduleError) throw scheduleError;

    existingMonths.add(getMonthKey(invoiceDate));
    createdCount += 1;
  }

  return createdCount + linkedCount;
}

async function linkScheduleToExistingInvoiceForMonth({
  contract,
  schedule,
  invoiceDate,
  now,
}: {
  contract: Contract;
  schedule: PaymentScheduleLike;
  invoiceDate: string;
  now: string;
}) {
  if (schedule.invoice_id) return false;

  const existingInvoice = await findExistingActiveInvoiceForMonth(contract, invoiceDate);
  if (!existingInvoice) return false;

  const { error } = await supabase
    .from('contract_payment_schedules')
    .update({
      due_date: invoiceDate,
      invoice_id: existingInvoice.id,
      updated_at: now,
    })
    .eq('id', schedule.id)
    .eq('contract_id', contract.id)
    .eq('company_id', contract.company_id);

  if (error) throw error;
  return true;
}

async function findExistingActiveInvoiceForMonth(contract: Contract, invoiceDate: string) {
  const monthKey = getMonthKey(invoiceDate);
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_date, due_date, status, payment_status')
    .eq('contract_id', contract.id)
    .eq('company_id', contract.company_id)
    .order('invoice_date', { ascending: true });

  if (error) throw error;

  return (data || []).find((invoice) => {
    if (isCancelled(invoice.status) || isCancelled(invoice.payment_status)) return false;
    return getInvoiceMonthKey(invoice) === monthKey;
  }) || null;
}

async function findAnyExistingInvoiceForMonth(contract: Contract, invoiceDate: string) {
  const monthKey = getMonthKey(invoiceDate);
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_date, due_date, status, payment_status')
    .eq('contract_id', contract.id)
    .eq('company_id', contract.company_id)
    .order('invoice_date', { ascending: true });

  if (error) throw error;

  return (data || []).find((invoice) => {
    return invoiceMatchesMonth(invoice, monthKey);
  }) || null;
}

async function getAvailableInvoiceNumber(contractNumber: string, invoiceDate: string) {
  const baseNumber = `INV-${contractNumber}-${invoiceDate.slice(0, 7)}`;
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${baseNumber}%`);

  if (error) throw error;
  const existingNumbers = new Set((data || []).map((invoice) => invoice.invoice_number));
  if (!existingNumbers.has(baseNumber)) return baseNumber;

  let suffix = 2;
  while (existingNumbers.has(`${baseNumber}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseNumber}-${suffix}`;
}

function isProtectedFinancialDeleteError(error: unknown) {
  const payload = error as { code?: string; message?: string; details?: string };
  const message = `${payload?.message || ''} ${payload?.details || ''}`.toLowerCase();

  return payload?.code === 'P0001'
    && (
      message.includes('active payments')
      || message.includes('journal entry')
      || message.includes('paid amount')
      || message.includes('cannot be hard deleted')
      || message.includes('cannot be deleted')
    );
}

function isMissingFunctionError(error: unknown) {
  const payload = error as { code?: string; message?: string; details?: string };
  const message = `${payload?.message || ''} ${payload?.details || ''}`.toLowerCase();

  return payload?.code === 'PGRST202'
    || message.includes('function')
    || message.includes('schema cache')
    || message.includes('not found');
}

function canFallbackToInvoiceCancellation(error: unknown) {
  return isProtectedFinancialDeleteError(error)
    || isMissingFunctionError(error)
    || isAlreadyCancelledError(error);
}

function buildAutoFixToastDescription(fixedActions: string[], reviewItems: string[]) {
  const fixedSummary = fixedActions.length > 0
    ? fixedActions.slice(0, 3).join('، ')
    : 'لم يتم تعديل بيانات تلقائيًا';
  const reviewSummary = reviewItems.length > 0
    ? `تحتاج مراجعة: ${reviewItems.length}`
    : 'لا توجد عناصر متبقية للمراجعة';

  return `${fixedSummary}. ${reviewSummary}.`;
}

function monthSpanInclusive(start: Date, end: Date) {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  return Math.max(1, months);
}

export default ContractHealthAnalysis;
