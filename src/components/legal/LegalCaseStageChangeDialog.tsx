import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArrowLeft,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDotDashed,
  FileCheck2,
  Gavel,
  Hourglass,
  Landmark,
  Loader2,
  RotateCcw,
  Scale,
  ShieldAlert,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  LEGAL_WORKFLOW_STAGES,
  REOPENABLE_LEGAL_WORKFLOW_STAGES,
  type LegalWorkflowStage,
} from '@/hooks/useLegalCaseWorkflow';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const MIN_REASON_LENGTH = 10;

const ALLOWED_TRANSITIONS: Record<LegalWorkflowStage, LegalWorkflowStage[]> = {
  preparation: ['filed', 'cancelled'],
  filed: ['awaiting_acceptance', 'cancelled'],
  awaiting_acceptance: ['hearings', 'cancelled'],
  hearings: ['reserved_for_judgment', 'cancelled'],
  reserved_for_judgment: ['hearings', 'judgment_issued'],
  judgment_issued: ['appeal', 'enforcement', 'collection', 'closed'],
  appeal: ['judgment_issued', 'enforcement', 'collection', 'closed'],
  enforcement: ['collection', 'closed'],
  collection: ['closed'],
  closed: REOPENABLE_LEGAL_WORKFLOW_STAGES,
  cancelled: REOPENABLE_LEGAL_WORKFLOW_STAGES,
};

type StageVisual = {
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const STAGE_VISUALS: Record<LegalWorkflowStage, StageVisual> = {
  preparation: { description: 'استكمال المستندات وتجهيز ملف الرفع', icon: FileCheck2 },
  filed: { description: 'تم إيداع الدعوى في بوابة تقاضي', icon: Landmark },
  awaiting_acceptance: { description: 'الطلب لدى المحكمة للمراجعة والقبول', icon: Hourglass },
  hearings: { description: 'قُبلت الدعوى وبدأت مرحلة الجلسات', icon: CalendarDays },
  reserved_for_judgment: { description: 'انتهت المرافعة والدعوى محجوزة للحكم', icon: CircleDotDashed },
  judgment_issued: { description: 'صدر حكم وتم توثيق منطوقه', icon: Gavel },
  appeal: { description: 'الدعوى ضمن إجراءات الاستئناف', icon: Scale },
  enforcement: { description: 'بدأت إجراءات تنفيذ الحكم', icon: Landmark },
  collection: { description: 'متابعة تحصيل المبلغ المحكوم به', icon: WalletCards },
  closed: { description: 'اكتملت القضية وأُغلقت نهائياً', icon: Archive },
  cancelled: { description: 'إلغاء الإجراء القانوني مع توثيق السبب', icon: Ban },
};

const PROGRESS_STAGES = LEGAL_WORKFLOW_STAGES.filter((item) => item.value !== 'cancelled');

const DEFAULT_TRANSITION_REASONS: Partial<Record<LegalWorkflowStage, string>> = {
  filed: 'تم استكمال تجهيز الملف وتأكيد رفع الدعوى',
  awaiting_acceptance: 'تم تأكيد إيداع الدعوى وبدء انتظار قبول المحكمة',
  hearings: 'تم قبول الدعوى من المحكمة والانتقال إلى مرحلة الجلسات',
  reserved_for_judgment: 'تم انتهاء المرافعة وحجز الدعوى للحكم',
  judgment_issued: 'تم استلام الحكم وتحديث المرحلة القانونية للقضية',
  appeal: 'تم بدء إجراءات الاستئناف وتحديث ملف القضية',
  enforcement: 'تم بدء إجراءات تنفيذ الحكم وتحديث ملف القضية',
  collection: 'تمت إحالة الحكم إلى متابعة التحصيل المالي',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  caseId: string;
  caseNumber?: string | null;
  currentStage?: string | null;
  canOverrideUnsettled: boolean;
  canCorrectUnfiled?: boolean;
  onChanged?: () => void;
};

type WorkflowRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export function LegalCaseStageChangeDialog({
  open,
  onOpenChange,
  companyId,
  caseId,
  caseNumber,
  currentStage,
  canOverrideUnsettled,
  canCorrectUnfiled = false,
  onChanged,
}: Props) {
  const queryClient = useQueryClient();
  const stage = normalizeStage(currentStage);
  const [targetStage, setTargetStage] = useState<LegalWorkflowStage | ''>('');
  const [reason, setReason] = useState('');
  const [overrideUnsettled, setOverrideUnsettled] = useState(false);
  const normalizedReason = reason.trim();
  const availableTargets = useMemo(
    () => stage === 'filed' && canCorrectUnfiled
      ? ['preparation' as LegalWorkflowStage, ...ALLOWED_TRANSITIONS[stage]]
      : ALLOWED_TRANSITIONS[stage],
    [canCorrectUnfiled, stage],
  );
  const isReopening = stage === 'closed' || stage === 'cancelled';
  const isFilingCorrection = stage === 'filed' && targetStage === 'preparation';
  const needsManagerOverride = targetStage === 'closed' && overrideUnsettled;
  const requiresManualReason = isReopening || isFilingCorrection || targetStage === 'closed' || targetStage === 'cancelled';

  useEffect(() => {
    if (!open) return;
    setTargetStage('');
    setReason('');
    setOverrideUnsettled(false);
  }, [caseId, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!targetStage) throw new Error('اختر المرحلة الجديدة');
      if (normalizedReason.length < MIN_REASON_LENGTH) {
        throw new Error('اكتب سبب التغيير بما لا يقل عن 10 أحرف');
      }
      if (!availableTargets.includes(targetStage)) {
        throw new Error('هذا الانتقال غير مسموح من المرحلة الحالية');
      }
      if (needsManagerOverride && !canOverrideUnsettled) {
        throw new Error('التجاوز الإداري متاح للمدير فقط');
      }
      if (isFilingCorrection && !canCorrectUnfiled) {
        throw new Error('تصحيح حالة الرفع متاح للمدير فقط');
      }

      const db = supabase as unknown as WorkflowRpcClient;
      const rpc = isFilingCorrection
        ? db.rpc('correct_unfiled_legal_case_to_preparation_v1', {
            p_company_id: companyId,
            p_case_id: caseId,
            p_reason: normalizedReason,
          })
        : isReopening
        ? db.rpc('reopen_legal_case_v1', {
            p_company_id: companyId,
            p_case_id: caseId,
            p_target_stage: targetStage,
            p_reason: normalizedReason,
          })
        : targetStage === 'closed'
          ? db.rpc('close_legal_case_final_v1', {
              p_company_id: companyId,
              p_case_id: caseId,
              p_reason: normalizedReason,
              p_override_unsettled: overrideUnsettled,
            })
          : db.rpc('transition_legal_case_workflow_v1', {
              p_company_id: companyId,
              p_case_id: caseId,
              p_target_stage: targetStage,
              p_reason: normalizedReason,
            });

      const { data, error } = await rpc;
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['manual-legal-delinquency-queue', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['opened-legal-cases-count', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['legal-case-workflow', companyId, caseId] }),
        queryClient.invalidateQueries({ queryKey: ['legal-cases'] }),
        queryClient.invalidateQueries({ queryKey: ['legal-case', caseId] }),
        queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['contract-details'] }),
      ]);
      toast.success(isFilingCorrection
        ? 'أُعيدت الدعوى إلى تجهيز الملف ووُثق التصحيح'
        : 'تم تحديث مرحلة الدعوى وتوثيق السبب');
      onChanged?.();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(legalWorkflowErrorMessage(error));
    },
  });

  const selectedMeta = LEGAL_WORKFLOW_STAGES.find((item) => item.value === targetStage);
  const currentMeta = LEGAL_WORKFLOW_STAGES.find((item) => item.value === stage);
  const currentStageIndex = PROGRESS_STAGES.findIndex((item) => item.value === stage);
  const reasonIsShort = normalizedReason.length > 0 && normalizedReason.length < MIN_REASON_LENGTH;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92vh] overflow-hidden border-0 bg-[#F8FAF9] p-0 shadow-2xl sm:max-w-2xl">
        <div className="relative overflow-hidden bg-gradient-to-l from-[#0E3437] via-[#164E52] to-[#123F42] px-6 pb-6 pt-5 text-white">
          <div className="pointer-events-none absolute -left-12 -top-20 h-48 w-48 rounded-full border border-white/10 bg-white/[0.03]" />
          <div className="pointer-events-none absolute -bottom-16 right-10 h-32 w-32 rounded-full border border-[#E8C96A]/15" />
          <DialogHeader className="relative text-right">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Badge className="rounded-full border-[#E8C96A]/35 bg-[#E8C96A]/10 px-3 py-1 font-mono text-[#FFE08A] hover:bg-[#E8C96A]/10">
                {caseNumber || 'دعوى قانونية'}
              </Badge>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                <Scale className="h-5 w-5 text-[#FFE08A]" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-white">تحديث مسار الدعوى</DialogTitle>
            <DialogDescription className="mt-1 leading-6 text-white/70">
              اختر الإجراء التالي فقط؛ سيُحفظ الانتقال وسببه في سجل القضية تلقائياً.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">مسار القضية</p>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" /> انتقال موثق
              </span>
            </div>
            <div className="flex items-center" aria-label="تقدم مراحل الدعوى">
              {PROGRESS_STAGES.map((item, index) => {
                const isCurrent = item.value === stage;
                const isComplete = currentStageIndex >= 0 && index < currentStageIndex;
                return (
                  <div key={item.value} className="flex min-w-0 flex-1 items-center last:flex-none" title={item.label}>
                    <span
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white',
                        isCurrent ? 'bg-[#0F766E] shadow-[0_0_0_3px_rgba(15,118,110,0.18)]' : isComplete ? 'bg-emerald-400' : 'bg-slate-200',
                      )}
                    />
                    {index < PROGRESS_STAGES.length - 1 && (
                      <span className={cn('h-0.5 min-w-2 flex-1', isComplete ? 'bg-emerald-300' : 'bg-slate-200')} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500">الحالة الحالية</p>
                <p className="truncate text-sm font-black text-slate-900">{currentMeta?.label}</p>
              </div>
              <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500">بعد الاعتماد</p>
                <p className={cn('truncate text-sm font-black', selectedMeta ? 'text-[#0F766E]' : 'text-slate-400')}>
                  {selectedMeta?.label || 'اختر الإجراء'}
                </p>
              </div>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-black text-slate-900">ما الإجراء التالي؟</legend>
            <div className={cn('grid gap-2.5', availableTargets.length > 1 && 'sm:grid-cols-2')}>
              {availableTargets.map((target) => {
                const meta = LEGAL_WORKFLOW_STAGES.find((item) => item.value === target);
                const visual = STAGE_VISUALS[target];
                const correctionTarget = stage === 'filed' && target === 'preparation';
                const Icon = isReopening || correctionTarget ? RotateCcw : visual.icon;
                const selected = targetStage === target;
                const terminal = target === 'closed' || target === 'cancelled';
                return (
                  <button
                    key={target}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setTargetStage(target);
                      setReason(
                        isReopening || correctionTarget || target === 'closed' || target === 'cancelled'
                          ? ''
                          : DEFAULT_TRANSITION_REASONS[target] || '',
                      );
                      if (target !== 'closed') setOverrideUnsettled(false);
                    }}
                    className={cn(
                      'group flex min-h-20 items-center gap-3 rounded-2xl border bg-white p-3 text-right shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2',
                      selected
                        ? 'border-[#14B8A6] bg-[#F0FDFA] shadow-[0_8px_24px_rgba(15,118,110,0.10)]'
                        : terminal
                          ? 'border-rose-100 hover:border-rose-300 hover:bg-rose-50/50'
                          : 'border-slate-200 hover:-translate-y-0.5 hover:border-[#5EEAD4] hover:shadow-md',
                    )}
                  >
                    <span className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                      selected ? 'bg-[#0F766E] text-white' : terminal ? 'bg-rose-50 text-rose-600' : 'bg-[#EAF7F5] text-[#0F766E]',
                    )}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-slate-900">{meta?.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {correctionTarget
                          ? 'تصحيح محمي عند عدم وجود أي دليل فعلي على رفع الدعوى'
                          : visual.description}
                      </span>
                    </span>
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-[#0F766E] bg-[#0F766E] text-white' : 'border-slate-300 text-transparent',
                    )}>
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 space-y-2">
            <div className="flex items-end justify-between gap-3">
              <Label htmlFor="legal-case-stage-reason" className="font-black text-slate-900">
                {requiresManualReason ? 'سبب التغيير' : 'سبب التغيير الموثق تلقائياً'}
              </Label>
              <span className={cn('text-[11px] font-semibold', reasonIsShort ? 'text-rose-600' : 'text-slate-400')}>
                {normalizedReason.length}/{MIN_REASON_LENGTH} أحرف على الأقل
              </span>
            </div>
            <Textarea
              id="legal-case-stage-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={requiresManualReason
                ? 'اكتب سبباً تفصيلياً لا يقل عن 10 أحرف'
                : 'سيُكتب سبب الإجراء تلقائياً ويمكنك تعديله'}
              className="min-h-20 resize-none rounded-2xl border-slate-200 bg-white p-3 shadow-sm focus-visible:ring-[#14B8A6]"
              aria-invalid={reasonIsShort}
            />
            <p className="text-[11px] leading-5 text-slate-500">
              {requiresManualReason
                ? 'هذا الإجراء يحتاج سبباً يكتبه المستخدم وسيظهر في سجل نشاط القضية.'
                : 'أُنشئ السبب من الإجراء المختار؛ يمكنك تعديله قبل الاعتماد.'}
            </p>
          </div>

          {targetStage === 'closed' && (
            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
              <Checkbox
                checked={overrideUnsettled}
                onCheckedChange={(checked) => setOverrideUnsettled(checked === true)}
                disabled={!canOverrideUnsettled}
              />
              <span>
                إغلاق إداري رغم احتمال وجود مبلغ حكم غير مسدد.
                {!canOverrideUnsettled && ' هذا الخيار يتطلب صلاحية مدير.'}
              </span>
            </label>
          )}

          {(targetStage === 'closed' || targetStage === 'cancelled') && (
            <Alert className="mt-4 rounded-2xl border-rose-200 bg-rose-50">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <AlertDescription className="text-rose-900">
                هذه مرحلة نهائية وستُخرج الدعوى من قائمة العمل النشطة، دون حذف القضية أو مستنداتها.
              </AlertDescription>
            </Alert>
          )}

          {isFilingCorrection && (
            <Alert className="mt-4 rounded-2xl border-amber-200 bg-amber-50">
              <ShieldAlert className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-950">
                سيتحقق النظام مجدداً من عدم وجود رقم دعوى أو إيصال رفع أو مهمة تقاضي مكتملة أو سجل قضائي لاحق. عند وجود أي دليل سيتوقف التصحيح تلقائياً.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="border-t border-slate-200/80 bg-white px-5 py-4 sm:justify-start sm:px-6">
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!targetStage || normalizedReason.length < MIN_REASON_LENGTH || mutation.isPending}
            className="h-11 gap-2 rounded-xl bg-[#0F766E] px-5 text-white shadow-sm hover:bg-[#115E59]"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {mutation.isPending ? 'جارٍ التوثيق...' : 'اعتماد المرحلة الجديدة'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending} className="h-11 rounded-xl">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeStage(value?: string | null): LegalWorkflowStage {
  return LEGAL_WORKFLOW_STAGES.some((item) => item.value === value)
    ? value as LegalWorkflowStage
    : 'preparation';
}

function legalWorkflowErrorMessage(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : '';

  if (/Future scheduled hearings/i.test(message)) return 'لا يمكن الإغلاق قبل إنهاء أو إلغاء الجلسات المستقبلية.';
  if (/Unsettled judgment/i.test(message)) return 'يوجد حكم مالي غير مسدد؛ يلزم تجاوز مدير وسبب تفصيلي.';
  if (/Manager permission is required to correct filing status/i.test(message)) return 'تصحيح حالة الرفع متاح للمدير فقط.';
  if (/Manager permission/i.test(message)) return 'إعادة فتح القضية تتطلب صلاحية مدير.';
  if (/Court filing evidence exists/i.test(message)) return 'لا يمكن التصحيح لأن النظام وجد دليلاً فعلياً على رفع الدعوى.';
  if (/A legal outcome exists/i.test(message)) return 'لا يمكن التصحيح لوجود نتيجة قضائية مسجلة على القضية.';
  if (/Only cases marked as filed/i.test(message)) return 'يمكن استخدام هذا التصحيح فقط مع حالة «تم رفع الدعوى».';
  if (/filing-status correction/i.test(message)) return 'يمكن استخدام تصحيح الرفع فقط مع قضية مسجلة بحالة «تم رفع الدعوى».';
  if (/not ready for final closure/i.test(message)) return 'القضية لم تصل بعد إلى مرحلة تسمح بالإغلاق النهائي.';
  if (/Court acceptance must be recorded/i.test(message)) return 'يجب نقل الدعوى إلى بانتظار القبول قبل تسجيل أول جلسة.';
  if (/Invalid legal workflow transition/i.test(message)) return 'الانتقال المختار غير مسموح من المرحلة الحالية.';
  return message || 'تعذر تغيير مرحلة الدعوى.';
}
