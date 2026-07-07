import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileText,
  Link2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import type { TrafficViolation } from '@/hooks/useTrafficViolations';
import { cn } from '@/lib/utils';

type ContractCandidate = {
  id: string;
  contract_number: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  vehicles?: { plate_number?: string | null } | null;
  customers?: { first_name?: string | null; last_name?: string | null; company_name?: string | null; phone?: string | null } | null;
};

type RankedViolation = {
  violation: TrafficViolation;
  priorityScore: number;
  priorityLabel: string;
  riskReason: string;
  duplicateCount: number;
  responsibleParty: string;
  matchedContract?: {
    id: string;
    contractNumber: string;
    customerName: string;
    confidence: number;
    reason: string;
  };
  claimMessage: string;
};

type AIAdvisorResult = {
  summary: string;
  source: 'openai' | 'local';
  ranked: RankedViolation[];
};

export const TrafficViolationsAIAdvisor: React.FC<{
  violations: TrafficViolation[];
  formatCurrency: (amount: number) => string;
  onOpenViolation: (violation: TrafficViolation) => void;
}> = ({ violations, formatCurrency, onOpenViolation }) => {
  const { companyId } = useUnifiedCompanyAccess();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['traffic-violations-ai-advisor', companyId, violations.map((v) => v.id).join('|')],
    queryFn: async (): Promise<AIAdvisorResult> => {
      const contracts = await fetchContractCandidates(companyId);
      const local = buildLocalAdvisor(violations, contracts, formatCurrency);

      try {
        const { data: aiData, error } = await supabase.functions.invoke('traffic-violations-ai-advisor', {
          body: {
            summary: {
              total: violations.length,
              unpaid: violations.filter((v) => v.payment_status !== 'paid').length,
              unlinked: violations.filter((v) => !v.contract_id || !v.customer_id).length,
              amount: violations.reduce((sum, v) => sum + Number(v.amount || 0), 0),
            },
            ranked: local.ranked.slice(0, 10).map((item) => ({
              id: item.violation.id,
              penalty_number: item.violation.penalty_number,
              amount: item.violation.amount,
              payment_status: item.violation.payment_status,
              priorityScore: item.priorityScore,
              duplicateCount: item.duplicateCount,
              responsibleParty: item.responsibleParty,
              matchedContract: item.matchedContract,
            })),
            locale: 'ar-QA',
          },
        });

        if (error) throw new Error(error.message);
        if (aiData?.summary) {
          return {
            ...local,
            summary: String(aiData.summary),
            source: aiData.source === 'openai' ? 'openai' : 'local',
          };
        }
      } catch (error) {
        console.warn('[TrafficViolationsAIAdvisor] Falling back to local analysis:', error);
      }

      return local;
    },
    enabled: !!companyId && violations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  if (violations.length === 0) return null;

  const advisor = data;
  const topItems = advisor?.ranked.slice(0, 6) || [];
  const duplicateGroups = useMemo(() => countDuplicateGroups(violations), [violations]);
  const unlinked = violations.filter((violation) => !violation.contract_id || !violation.customer_id).length;

  return (
    <section className="mx-auto max-w-[1600px] px-4 pt-5 print:hidden">
      <div className="rounded-[8px] border border-[#DDE5EF] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <Sparkles className="h-4 w-4" />
              {advisor?.source === 'openai' ? 'تحليل OpenAI' : 'تحليل ذكي داخلي'}
            </div>
            <h2 className="text-xl font-black text-[#020617]">مساعد AI للمخالفات المرورية</h2>
            <p className="mt-1 max-w-4xl text-sm font-bold leading-7 text-[#64748B]">
              {isLoading ? 'جاري تحليل المخالفات وترتيب الأولويات...' : advisor?.summary || 'تم ترتيب المخالفات حسب الأولوية والمبلغ والخطر.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching || isLoading} className="rounded-[8px] border-[#DDE5EF] font-black">
            <RefreshCw className={cn('ml-2 h-4 w-4', (isFetching || isLoading) && 'animate-spin')} />
            تحديث AI
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <AdvisorMetric label="تحتاج ربط" value={String(unlinked)} tone="red" />
          <AdvisorMetric label="مجموعات تكرار" value={String(duplicateGroups)} tone="amber" />
          <AdvisorMetric label="غير مسددة" value={String(violations.filter((v) => v.payment_status !== 'paid').length)} tone="blue" />
          <AdvisorMetric label="إجمالي المبالغ" value={formatCurrency(violations.reduce((sum, v) => sum + Number(v.amount || 0), 0))} tone="green" />
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {topItems.map((item) => (
            <div key={item.violation.id} className="rounded-[8px] border border-[#DDE5EF] bg-[#F8FAFC] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('rounded-[8px] border px-2 py-1 font-black', priorityBadge(item.priorityScore))}>
                      {item.priorityLabel}
                    </Badge>
                    {item.duplicateCount > 1 && (
                      <Badge className="rounded-[8px] border border-amber-200 bg-amber-50 text-amber-700">
                        مكرر {item.duplicateCount}
                      </Badge>
                    )}
                    <span className="font-mono text-sm font-black text-[#020617]">{item.violation.penalty_number}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#64748B]">{item.riskReason}</p>
                </div>
                <p className="text-lg font-black text-[#020617]">{formatCurrency(item.violation.amount || 0)}</p>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <InfoLine icon={ShieldAlert} label="المسؤولية" value={item.responsibleParty} />
                <InfoLine
                  icon={Link2}
                  label="العقد المطابق"
                  value={
                    item.matchedContract
                      ? `${item.matchedContract.contractNumber} - ثقة ${item.matchedContract.confidence}%`
                      : 'يحتاج مراجعة يدوية'
                  }
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" className="h-9 rounded-[8px] border-[#DDE5EF] text-xs font-black" onClick={() => onOpenViolation(item.violation)}>
                  <FileText className="ml-2 h-4 w-4" />
                  فتح المخالفة
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-[8px] border-[#DDE5EF] text-xs font-black text-[#173A63]"
                  onClick={() => {
                    navigator.clipboard.writeText(item.claimMessage);
                    toast.success('تم نسخ رسالة المطالبة');
                  }}
                >
                  <Copy className="ml-2 h-4 w-4" />
                  نسخ رسالة المطالبة
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

async function fetchContractCandidates(companyId?: string | null): Promise<ContractCandidate[]> {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_number,
      status,
      start_date,
      end_date,
      customer_id,
      vehicle_id,
      vehicles(plate_number),
      customers(first_name, last_name, company_name, phone)
    `)
    .eq('company_id', companyId)
    .order('start_date', { ascending: false })
    .limit(700);

  if (error) {
    console.warn('[TrafficViolationsAIAdvisor] contracts fetch failed:', error);
    return [];
  }

  return (data || []) as unknown as ContractCandidate[];
}

function buildLocalAdvisor(
  violations: TrafficViolation[],
  contracts: ContractCandidate[],
  formatCurrency: (amount: number) => string,
): AIAdvisorResult {
  const duplicateCounts = buildDuplicateCounts(violations);

  const ranked = violations.map((violation) => {
    const duplicateCount = duplicateCounts.get(duplicateKey(violation)) || 1;
    const matchedContract = findBestContractMatch(violation, contracts);
    const amount = Number(violation.amount || 0);
    const unpaid = violation.payment_status !== 'paid';
    const unlinked = !violation.contract_id || !violation.customer_id;
    const daysOld = violation.penalty_date ? Math.max(0, daysBetween(new Date(violation.penalty_date), new Date())) : 0;

    let priorityScore = 0;
    if (unpaid) priorityScore += 25;
    if (unlinked) priorityScore += 20;
    if (duplicateCount > 1) priorityScore += 18;
    priorityScore += Math.min(25, amount / 100);
    if (daysOld > 30 && unpaid) priorityScore += 12;
    if (matchedContract && matchedContract.confidence >= 80) priorityScore += 5;
    priorityScore = Math.min(100, Math.round(priorityScore));

    const priorityLabel = priorityScore >= 75 ? 'أولوية عالية' : priorityScore >= 45 ? 'أولوية متوسطة' : 'متابعة عادية';
    const responsibleParty = matchedContract
      ? 'العميل المرتبط بالعقد'
      : violation.contract_id
      ? 'العميل المرتبط بالعقد الحالي'
      : 'غير محسوم - يحتاج مطابقة العقد';
    const riskReason = [
      unpaid ? 'غير مسددة' : 'مسددة',
      unlinked ? 'تحتاج ربط عقد/عميل' : 'مرتبطة',
      duplicateCount > 1 ? 'يوجد احتمال تكرار' : null,
      amount >= 1000 ? 'مبلغ مرتفع' : null,
      daysOld > 30 && unpaid ? 'قديمة وغير محصلة' : null,
    ].filter(Boolean).join('، ');

    return {
      violation,
      priorityScore,
      priorityLabel,
      riskReason,
      duplicateCount,
      responsibleParty,
      matchedContract,
      claimMessage: buildClaimMessage(violation, matchedContract, formatCurrency),
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  const highPriority = ranked.filter((item) => item.priorityScore >= 75).length;
  const unlinked = violations.filter((violation) => !violation.contract_id || !violation.customer_id).length;
  const duplicateGroups = countDuplicateGroups(violations);

  return {
    source: 'local',
    summary: `يوجد ${highPriority} مخالفة عالية الأولوية، و${unlinked} مخالفة تحتاج ربط، و${duplicateGroups} مجموعة يشتبه بأنها مكررة.`,
    ranked,
  };
}

function findBestContractMatch(violation: TrafficViolation, contracts: ContractCandidate[]): RankedViolation['matchedContract'] {
  if (violation.contracts?.id && violation.contracts.contract_number) {
    return {
      id: violation.contracts.id,
      contractNumber: violation.contracts.contract_number,
      customerName: getContractCustomerName(violation.contracts as any),
      confidence: 100,
      reason: 'المخالفة مرتبطة بعقد فعليًا',
    };
  }

  const violationDate = normalizeDate(violation.penalty_date);
  const plate = normalizePlate(violation.vehicle_plate || violation.vehicles?.plate_number);

  const candidates = contracts
    .map((contract) => {
      let score = 0;
      if (violation.vehicle_id && contract.vehicle_id === violation.vehicle_id) score += 45;
      if (plate && normalizePlate(contract.vehicles?.plate_number) === plate) score += 35;
      if (violationDate && isWithin(violationDate, contract.start_date, contract.end_date)) score += 35;
      if (contract.status === 'active') score += 10;
      return { contract, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return undefined;

  return {
    id: best.contract.id,
    contractNumber: best.contract.contract_number,
    customerName: getContractCustomerName(best.contract),
    confidence: Math.min(95, best.score),
    reason: best.score >= 80 ? 'تطابق المركبة والتاريخ' : 'تطابق جزئي يحتاج مراجعة',
  };
}

function buildDuplicateCounts(violations: TrafficViolation[]) {
  const counts = new Map<string, number>();
  violations.forEach((violation) => {
    const key = duplicateKey(violation);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function countDuplicateGroups(violations: TrafficViolation[]) {
  return Array.from(buildDuplicateCounts(violations).values()).filter((count) => count > 1).length;
}

function duplicateKey(violation: TrafficViolation) {
  if (violation.penalty_number) return `number:${violation.penalty_number}`;
  return [
    'shape',
    normalizePlate(violation.vehicle_plate || violation.vehicles?.plate_number),
    violation.penalty_date || '',
    violation.violation_type || '',
    Number(violation.amount || 0).toFixed(2),
  ].join('|');
}

function buildClaimMessage(
  violation: TrafficViolation,
  match: RankedViolation['matchedContract'],
  formatCurrency: (amount: number) => string,
) {
  const customerName = violation.customers
    ? [violation.customers.first_name, violation.customers.last_name].filter(Boolean).join(' ') || violation.customers.company_name
    : match?.customerName || 'العميل الكريم';
  const contractLine = match ? `\nرقم العقد: ${match.contractNumber}` : '';
  return `مرحبًا ${customerName}

نفيدكم بوجود مخالفة مرورية مرتبطة بالمركبة:
رقم المخالفة: ${violation.penalty_number || '-'}
تاريخ المخالفة: ${violation.penalty_date || '-'}
نوع المخالفة: ${violation.violation_type || '-'}
المبلغ: ${formatCurrency(violation.amount || 0)}${contractLine}

يرجى سداد قيمة المخالفة أو التواصل معنا لتسوية المبلغ.`;
}

const AdvisorMetric: React.FC<{ label: string; value: string; tone: 'red' | 'amber' | 'blue' | 'green' }> = ({ label, value, tone }) => {
  const className = {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[tone];

  return (
    <div className={cn('rounded-[8px] border p-4', className)}>
      <p className="text-xs font-black opacity-80">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
};

const InfoLine: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-[8px] border border-[#DDE5EF] bg-white p-3">
    <div className="mb-1 flex items-center gap-2 text-xs font-black text-[#64748B]">
      <Icon className="h-4 w-4 text-[#173A63]" />
      {label}
    </div>
    <p className="text-sm font-bold text-[#020617]">{value}</p>
  </div>
);

function priorityBadge(score: number) {
  if (score >= 75) return 'border-red-200 bg-red-50 text-red-700';
  if (score >= 45) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function getContractCustomerName(contract: any) {
  const customer = contract.customers;
  if (!customer) return 'عميل غير محدد';
  return [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.company_name || 'عميل غير محدد';
}

function normalizePlate(value?: string | null) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function normalizeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function isWithin(date: Date, start?: string | null, end?: string | null) {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);
  if (!startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
}

function daysBetween(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

export default TrafficViolationsAIAdvisor;
