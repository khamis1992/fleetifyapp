import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowLeft, Check, CheckCheck, FileText, Info, Loader2, RefreshCw, Scale, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useContractCancellationImpact, useUpdateContractStatus } from '@/hooks/useContractRenewal';
import { LEGAL_REVERSAL_MIN_REASON_LENGTH, revertContractLegalProcedure } from '@/services/contractLegalProcedureService';
import { ContractCancellationImpactPanel } from '../ContractCancellationImpactPanel';
import { availableStatusOptions, statusCustomerName, statusMeta, type EditableContractStatus, type StatusContract } from './model';
import './contract-status.css';

interface ContractStatusManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: StatusContract | null | undefined;
  onStatusUpdated?: (newStatus: string) => void;
}

export function ContractStatusManagement({ open, onOpenChange, contract, onStatusUpdated }: ContractStatusManagementProps) {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateContractStatus();
  const [snapshot, setSnapshot] = useState(contract);
  const [selected, setSelected] = useState<EditableContractStatus | ''>('');
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const savingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const reasonId = `${formId}-reason`;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const options = availableStatusOptions(snapshot?.status || '').map(option =>
    snapshot?.status === 'under_legal_procedure' && option.value === 'active' && snapshot.end_date && snapshot.end_date.slice(0, 10) < today
      ? { ...option, label: 'منتهي', description: 'إنهاء الإجراء القانوني مع إبقاء العقد منتهيًا لانقضاء مدته.' } : option);
  const chosen = options.find(option => option.value === selected);
  const current = statusMeta(snapshot?.status);
  const underLegal = snapshot?.status === 'under_legal_procedure';
  const pending = isSaving || updateStatus.isPending;
  const reasonRequired = selected === 'suspended' || selected === 'cancelled' || underLegal;
  const minReasonLength = underLegal ? LEGAL_REVERSAL_MIN_REASON_LENGTH : 5;
  const trimmedReason = reason.trim();
  const reasonLength = [...trimmedReason].length;
  const reasonValid = !reasonRequired || reasonLength >= minReasonLength;
  const dirty = !!selected || !!reason;
  const stale = !!snapshot && (contract?.id !== snapshot.id
    || contract.company_id !== snapshot.company_id || contract.status !== snapshot.status
    || (!!snapshot.updated_at && contract.updated_at !== snapshot.updated_at));
  const cancellationImpact = useContractCancellationImpact({
    contractId: snapshot?.id, companyId: snapshot?.company_id,
    enabled: open && selected === 'cancelled' && !stale,
  });
  const impactLoading = cancellationImpact.isLoading || cancellationImpact.isFetching;
  const impact = cancellationImpact.data;
  const impactVerified = !!impact && impact.contractId === snapshot?.id
    && !impactLoading && !cancellationImpact.error;
  const cancellationReady = selected !== 'cancelled' || impactVerified;
  const canProceed = !!chosen && reasonValid && cancellationReady && !pending && !stale
    && (!underLegal || !!snapshot?.company_id);

  useEffect(() => {
    if (!open) return;
    setSnapshot(contract);
    setSelected(''); setReason('');
    setReviewing(false); setSaveError(''); setConfirmDiscard(false);
    savingRef.current = false;
    // Preserve an open choice and reason on background refetch; stale data blocks submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id]);

  useEffect(() => {
    if (!open || !dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [open, dirty]);

  const requestClose = (nextOpen: boolean) => {
    if (nextOpen || pending || savingRef.current) return;
    if (dirty) setConfirmDiscard(true); else onOpenChange(false);
  };
  const goToReview = () => {
    if (!canProceed || savingRef.current) return;
    setReviewing(true);
    scrollRef.current?.scrollTo?.({ top: 0 });
    mainRef.current?.scrollTo?.({ top: 0 });
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!snapshot || !chosen || !canProceed || savingRef.current) return;
    if (!reviewing) { goToReview(); return; }
    savingRef.current = true;
    setIsSaving(true); setSaveError('');
    let completedStatus: string = chosen.value;
    try {
      if (underLegal && chosen.value === 'active') {
        if (!snapshot.company_id) throw new Error('تعذر تحديد الشركة المرتبطة بالعقد');
        const result = await revertContractLegalProcedure({ contractId: snapshot.id, companyId: snapshot.company_id, reason: trimmedReason });
        completedStatus = result?.contractStatus || '';
        toast.success('تم إنهاء الإجراء القانوني وتحديث حالة العقد وفق مدته');
      } else {
        await updateStatus.mutateAsync({ contractId: snapshot.id, status: chosen.value,
          reason: trimmedReason || undefined, companyId: snapshot.company_id,
          transferTrafficViolationsToCompany: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message
        : error && typeof error === 'object' && 'message' in error ? String(error.message)
          : 'تعذر تحديث حالة العقد. حاول مجددًا.';
      setSaveError(message);
      if (underLegal && chosen.value === 'active') toast.error(`تعذر إنهاء الإجراء القانوني: ${message}`);
      savingRef.current = false;
      setIsSaving(false);
      return;
    }

    // The command is confirmed. A refresh failure must not invite another write.
    void Promise.resolve().then(async () => {
      if (completedStatus) onStatusUpdated?.(completedStatus);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['contract-details'], type: 'active' }, { throwOnError: true }),
        ...[['contracts'], ['vehicles'], ['legal-cases'], ['manual-legal-delinquency-queue']]
          .map(queryKey => queryClient.invalidateQueries({ queryKey }, { throwOnError: true })),
      ]);
    }).catch(() => toast.warning('تم تغيير الحالة، لكن تعذر تحديث بعض البيانات المعروضة. أعد تحميل صفحة العقد.'));
    setIsSaving(false);
    onOpenChange(false);
  };

  if (!snapshot || !contract) return null;
  const CurrentIcon = current.icon;
  const ChosenIcon = chosen?.icon;
  const vehicle = snapshot.vehicle || snapshot.vehicles;
  const plate = vehicle?.plate_number || snapshot.license_plate;
  const impactError = cancellationImpact.error
    || (!impactLoading && !impactVerified ? new Error('لم يكتمل فحص هذا العقد. أعد المحاولة قبل الإلغاء.') : undefined);
  const readyText = stale ? 'تغيرت بيانات العقد؛ أعد فتح النافذة'
    : !chosen ? 'اختر الحالة الجديدة للمتابعة'
      : !reasonValid ? `أكمل سبب التغيير (${minReasonLength} أحرف على الأقل)`
        : !cancellationReady ? 'أكمل مراجعة المخالفات قبل المتابعة'
          : reviewing ? 'جاهز لتأكيد تغيير الحالة' : 'جاهز لمراجعة التغيير';

  return <>
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="contract-status-workspace" lang="ar" dir="rtl">
        <header className="cs-header">
          <p className="cs-eyebrow"><SlidersHorizontal size={15} aria-hidden="true" />إدارة العقود / الحالة التشغيلية</p>
          <div className="cs-title"><DialogTitle>تغيير حالة العقد</DialogTitle><span dir="ltr">{snapshot.contract_number || '—'}</span></div>
          <DialogDescription>اختر الحالة المناسبة، وراجع أثر التغيير قبل تأكيده.</DialogDescription>
          <nav className="cs-steps" aria-label="خطوات تغيير الحالة">
            <button type="button" aria-current={!reviewing ? 'step' : undefined} disabled={pending} onClick={() => setReviewing(false)}><span>{reviewing ? <Check size={14} /> : '01'}</span>الحالة والسبب</button>
            <i aria-hidden="true" />
            <button type="button" aria-current={reviewing ? 'step' : undefined} disabled={!canProceed} onClick={goToReview}><span>02</span>المراجعة والتأكيد</button>
          </nav>
        </header>

        <div className="cs-scroll" ref={scrollRef}><div className="cs-layout">
          <div className="cs-main" ref={mainRef}>
            {stale && !pending && <div className="cs-error" role="alert">تغيرت بيانات العقد أثناء فتح النافذة. احتفظنا بسبب التغيير؛ أغلق النافذة وافتح العقد مجددًا لمراجعة الحالة الحالية.</div>}
            {saveError && <div className="cs-error" role="alert"><strong>لم يكتمل تغيير الحالة</strong><p>{saveError}</p><small>بقيت اختياراتك وسبب التغيير محفوظة في هذه النافذة.</small></div>}
            <form id={formId} onSubmit={handleSubmit}>
              {reviewing && chosen ? <section className="cs-review" aria-label="مراجعة تغيير الحالة">
                <span className="cs-review-icon"><CheckCheck size={25} aria-hidden="true" /></span>
                <h3>راجع التغيير قبل تنفيذه</h3>
                <p>سيُطبّق الإجراء على العقد <b dir="ltr">{snapshot.contract_number || '—'}</b> بعد الضغط على زر التأكيد.</p>
                <div className="cs-review-transition"><div><small>الحالة الحالية</small><strong>{current.label}</strong></div><ArrowLeft size={20} aria-hidden="true" /><div data-tone={chosen.tone}><small>الحالة الجديدة</small><strong>{chosen.label}</strong></div></div>
                <div className="cs-review-reason"><span><FileText size={16} aria-hidden="true" />سبب التغيير</span><p>{trimmedReason || 'لم تُضف ملاحظة لهذا التفعيل.'}</p></div>
              </section> : <fieldset className="cs-fields" disabled={pending || stale}>
                <legend className="sr-only">بيانات تغيير الحالة</legend>
                <section className="cs-section" aria-labelledby={`${formId}-options`}>
                  <div className="cs-section-heading"><span>01</span><div><h3 id={`${formId}-options`}>إلى أي حالة تريد نقل العقد؟</h3><p>الخيارات المتاحة بحسب حالة العقد الحالية.</p></div></div>
                  <div className="cs-options" role="radiogroup" aria-labelledby={`${formId}-options`}>
                    {options.map(option => { const Icon = option.icon; return <label key={option.value} className="cs-option" data-tone={option.tone} data-selected={selected === option.value}>
                      <input type="radio" name={`${formId}-status`} value={option.value} checked={selected === option.value} aria-label={option.label}
                        onChange={() => { setSelected(option.value); setSaveError(''); }} />
                      <span className="cs-option-icon"><Icon size={20} aria-hidden="true" /></span>
                      <span className="cs-option-copy"><strong>{option.action}</strong><small>{option.description}</small></span>
                      <span className="cs-option-check" aria-hidden="true">{selected === option.value && <Check size={12} />}</span>
                    </label>; })}
                    {options.length === 0 && <p className="cs-muted">لا توجد حالات متاحة من هذه النافذة.</p>}
                  </div>
                </section>
                <section className="cs-section" aria-labelledby={`${formId}-reason-title`}>
                  <div className="cs-section-heading"><span>02</span><div><h3 id={`${formId}-reason-title`}>وثّق سبب التغيير</h3><p>يساعد فريق المتابعة على فهم الإجراء عند مراجعة العقد.</p></div><b className="cs-required">{reasonRequired ? 'مطلوب' : 'اختياري'}</b></div>
                  <label className="sr-only" htmlFor={reasonId}>سبب التغيير</label>
                  <Textarea id={reasonId} value={reason} maxLength={300} rows={3} required={reasonRequired}
                    aria-invalid={reasonRequired && reasonLength > 0 && !reasonValid} aria-describedby={`${reasonId}-hint`}
                    onChange={event => { setReason(event.target.value); setSaveError(''); }}
                    placeholder={underLegal ? 'اذكر سبب تغيير حالة العقد…' : selected === 'cancelled' ? 'اذكر سبب إلغاء العقد…' : selected === 'suspended' ? 'اذكر سبب تعليق العقد…' : 'أضف ملاحظة توضح سبب تغيير الحالة…'} />
                  <div className="cs-reason-footer"><p id={`${reasonId}-hint`}>{reasonRequired ? `اكتب سببًا واضحًا من ${minReasonLength} أحرف على الأقل.` : chosen ? 'يمكنك إضافة ملاحظة لهذا التفعيل.' : 'اختر الحالة لتحديد متطلبات السبب.'}</p><span dir="ltr">{reason.length} / 300</span></div>
                </section>
              </fieldset>}

              {(chosen || underLegal) && <section className="cs-impact" aria-label="أثر تغيير الحالة">
                <h3>{underLegal ? <Scale size={17} /> : <Info size={17} />}ما الذي سيحدث؟</h3>
                <p>{chosen?.impact || 'إزالة الإجراء من هنا متاحة قبل تقديم الدعوى فقط. إذا سُجلت القضية، راجع نتيجتها وإغلاقها من سجل القضايا.'}</p>
                {underLegal && <a className="underline underline-offset-4 font-semibold" href={`/legal/cases?view=cases&contract_id=${encodeURIComponent(snapshot.id)}`} target="_blank" rel="noopener noreferrer">فتح قضايا هذا العقد ومراجعة الإغلاق</a>}
              </section>}
              {selected === 'cancelled' && <section className="cs-cancellation" aria-label="فحص المخالفات قبل الإلغاء">
                <div className="cs-check-heading"><ShieldCheck size={18} aria-hidden="true" /><h3>المخالفات المرتبطة بالعقد</h3>{impactVerified && impact.openPenaltyCount === 0 && <span>اكتمل الفحص</span>}</div>
                {impactVerified && impact.openPenaltyCount === 0 && <p className="cs-clear-check"><span aria-hidden="true"><Check size={12} /></span>لا توجد مخالفات مرورية مفتوحة مرتبطة بالعقد.</p>}
                <ContractCancellationImpactPanel impact={impactVerified ? impact : undefined}
                  isLoading={impactLoading} error={impactError}
                  disabled={pending || reviewing || stale} />
                {impactError && !impactLoading && <Button type="button" variant="outline" className="cs-retry" disabled={pending || stale} onClick={() => { void cancellationImpact.refetch(); }}><RefreshCw size={14} />إعادة الفحص</Button>}
              </section>}
            </form>
          </div>

          <aside className="cs-summary" aria-label="ملخص تغيير الحالة">
            <h3><SlidersHorizontal size={17} aria-hidden="true" />مسار الحالة</h3>
            <div className="cs-state" data-tone={current.tone}><span>الحالة الحالية</span><strong><CurrentIcon size={21} aria-hidden="true" />{current.label}</strong></div>
            <div className="cs-transition-line" aria-hidden="true"><span /><ArrowDown size={17} /><span /></div>
            <div className="cs-state cs-state-next" data-tone={chosen?.tone || 'neutral'} data-empty={!chosen} aria-live="polite"><span>بعد التنفيذ</span><strong>{ChosenIcon && <ChosenIcon size={21} aria-hidden="true" />}{chosen?.label || 'بانتظار اختيارك'}</strong></div>
            <dl className="cs-contract-facts"><div><dt>رقم العقد</dt><dd dir="ltr">{snapshot.contract_number || '—'}</dd></div><div><dt>العميل</dt><dd>{statusCustomerName(snapshot)}</dd></div><div><dt>المركبة</dt><dd>{[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'غير محددة'}{plate && <span className="cs-plate" dir="ltr">{plate}</span>}</dd></div></dl>
            <p className="cs-summary-note"><FileText size={15} aria-hidden="true" />يُسجل تغيير الحالة وسببه في سجل تدقيق العقد.</p>
          </aside>
        </div></div>

        <footer className="cs-footer">
          <div className="cs-save-state" role="status"><span data-ready={canProceed} /><p>{pending ? 'جاري تنفيذ التغيير…' : readyText}</p></div>
          <div className="cs-footer-actions"><Button type="button" variant="outline" disabled={pending} onClick={() => reviewing ? setReviewing(false) : requestClose(false)}>{reviewing ? 'العودة للتعديل' : 'إغلاق'}</Button>
            <Button type="submit" form={formId} className="cs-primary" data-tone={reviewing ? chosen?.tone : 'green'} disabled={!canProceed}>
              {pending ? <Loader2 size={17} className="animate-spin" /> : reviewing ? <Check size={17} /> : null}
              {pending ? 'جاري تحديث الحالة…' : reviewing ? `تأكيد ${chosen?.action || 'التغيير'}` : 'مراجعة التغيير'}
              {!pending && !reviewing && <ArrowLeft size={17} />}
            </Button></div>
        </footer>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}><AlertDialogContent className="cs-discard" lang="ar" dir="rtl">
      <AlertDialogHeader><AlertDialogTitle>تجاهل الاختيار وسبب التغيير؟</AlertDialogTitle><AlertDialogDescription>لم تُغيّر حالة العقد بعد. يمكنك متابعة المراجعة أو إغلاق النافذة دون تنفيذ.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>متابعة التعديل</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirmDiscard(false); onOpenChange(false); }}>تجاهل والخروج</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>;
}
