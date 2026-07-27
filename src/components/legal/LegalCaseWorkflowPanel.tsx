import { useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Gavel, PlayCircle, RotateCcw, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LEGAL_WORKFLOW_STAGES, LegalWorkflowStage, useLegalCaseWorkflow } from '@/hooks/useLegalCaseWorkflow';
import { formatCurrency, cn } from '@/lib/utils';

type Action = 'hearing' | 'judgment' | 'appeal' | 'enforcement' | 'close' | 'reopen' | null;

const today = () => new Date().toISOString().slice(0, 10);
const initialForm = () => ({
  hearingDate: '', hearingStatus: 'scheduled', decision: '', nextHearingDate: '',
  outcomeType: 'won', outcomeAmount: '', outcomeDate: today(), appealDeadline: '', paymentDirection: 'receive', outcomeNotes: '',
  appealStatus: 'filed', appealFiledAt: '', appealReference: '', appealCourt: '',
  enforcementNumber: '', authorityName: '', enforceableAmount: '', nextActionDate: '', notes: '',
  closeReason: '', overrideUnsettled: false, reopenStage: 'collection' as LegalWorkflowStage, reopenReason: '',
});

const actionTitles: Record<Exclude<Action, null>, string> = {
  hearing: 'تسجيل جلسة', judgment: 'تسجيل الحكم', appeal: 'تسجيل الاستئناف',
  enforcement: 'بدء التنفيذ', close: 'الإغلاق النهائي', reopen: 'إعادة فتح القضية',
};

const mojibakeMarkers = ['Ø', 'Ù', 'Ã', 'Â', 'â', 'ð', '�'];

const decodePossiblyMojibake = (value?: unknown) => {
  const text = String(value || '').trim();
  if (!text || !mojibakeMarkers.some((marker) => text.includes(marker))) return text;

  const decodeLatin1Utf8 = (input: string) => {
    try {
      const bytes = Uint8Array.from(input, (char) => char.charCodeAt(0) & 0xff);
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
    } catch {
      return input;
    }
  };

  const firstPass = decodeLatin1Utf8(text);
  const secondPass = mojibakeMarkers.some((marker) => firstPass.includes(marker))
    ? decodeLatin1Utf8(firstPass)
    : firstPass;
  const candidates = [text, firstPass, secondPass].filter(Boolean);

  return candidates.sort((a, b) => {
    const arabicDelta = (b.match(/[\u0600-\u06FF]/g) || []).length - (a.match(/[\u0600-\u06FF]/g) || []).length;
    if (arabicDelta !== 0) return arabicDelta;
    const badCount = (input: string) => mojibakeMarkers.reduce(
      (count, marker) => count + (input.match(new RegExp(marker, 'g')) || []).length,
      0,
    );
    return badCount(a) - badCount(b);
  })[0] || text;
};

interface Props { caseId: string; onChanged?: (legalCase: Record<string, any>) => void }

export function LegalCaseWorkflowPanel({ caseId, onChanged }: Props) {
  const workflow = useLegalCaseWorkflow(caseId);
  const [action, setAction] = useState<Action>(null);
  const [form, setForm] = useState(initialForm);
  const legalCase = workflow.data?.legalCase;
  const stage = (legalCase?.workflow_stage || 'preparation') as LegalWorkflowStage;
  const stageIndex = LEGAL_WORKFLOW_STAGES.findIndex((item) => item.value === stage);
  const collected = Number(workflow.data?.settlement?.settled_amount || 0);
  const pendingTasks = (workflow.data?.tasks ?? []).filter((task) => !['completed', 'cancelled'].includes(task.status));

  const refreshParent = async () => {
    const refreshed = await workflow.refetch();
    if (refreshed.data?.legalCase) onChanged?.(refreshed.data.legalCase);
  };

  const execute = async (callback: () => Promise<unknown>, message: string) => {
    try {
      await callback();
      await refreshParent();
      toast.success(message);
      setAction(null);
      setForm(initialForm());
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تنفيذ الإجراء');
    }
  };

  const transition = (target: LegalWorkflowStage, message: string, reason?: string) => execute(() => workflow.transition(target, reason), message);

  const submit = () => {
    if (action === 'hearing') return execute(() => workflow.recordHearing({
      p_hearing_date: form.hearingDate ? new Date(form.hearingDate).toISOString() : null,
      p_status: form.hearingStatus, p_decision: form.decision || null,
      p_next_hearing_date: form.nextHearingDate ? new Date(form.nextHearingDate).toISOString() : null,
      p_notes: form.notes || null,
    }), 'تم تسجيل الجلسة وإنشاء مهمة المتابعة');
    if (action === 'judgment') return execute(() => workflow.recordJudgment({
      p_case_direction: legalCase?.case_direction || 'filed_by_us', p_outcome_type: form.outcomeType,
      p_outcome_amount: Number(form.outcomeAmount || 0), p_outcome_amount_type: 'compensation',
      p_payment_direction: Number(form.outcomeAmount || 0) > 0 ? form.paymentDirection : null,
      p_outcome_date: form.outcomeDate, p_appeal_deadline: form.appealDeadline || null, p_outcome_notes: form.outcomeNotes || null,
    }), 'تم تسجيل الحكم دون إنشاء حركة نقدية');
    if (action === 'appeal') return execute(() => workflow.recordAppeal({
      p_status: form.appealStatus, p_deadline: form.appealDeadline || legalCase?.appeal_deadline || null,
      p_filed_at: form.appealFiledAt ? new Date(form.appealFiledAt).toISOString() : null,
      p_reference_number: form.appealReference || null, p_court_name: form.appealCourt || null, p_notes: form.notes || null,
    }), 'تم تسجيل الاستئناف وإنشاء المتابعة');
    if (action === 'enforcement') return execute(() => workflow.startEnforcement({
      p_enforcement_number: form.enforcementNumber || null, p_authority_name: form.authorityName || null,
      p_enforceable_amount: Number(form.enforceableAmount || legalCase?.outcome_amount || 0), p_next_action_date: form.nextActionDate || null, p_notes: form.notes || null,
    }), 'تم بدء التنفيذ وإنشاء المتابعة');
    if (action === 'close') return execute(() => workflow.closeFinal(form.closeReason, form.overrideUnsettled), 'تم إغلاق القضية نهائياً');
    if (action === 'reopen') return execute(() => workflow.reopen(form.reopenStage, form.reopenReason), 'تمت إعادة فتح القضية بمسار معتمد');
  };

  if (workflow.isLoading) return <div className="h-28 animate-pulse rounded-md bg-slate-100" />;
  if (workflow.error || !legalCase) return <Alert variant="destructive"><AlertDescription>تعذر تحميل سير عمل القضية.</AlertDescription></Alert>;

  const monetaryPending = Number(legalCase.outcome_amount || 0) > 0 && !['paid', 'received'].includes(legalCase.outcome_payment_status);
  const judgmentDifference = Number(legalCase.case_value || 0) - Number(legalCase.outcome_amount || 0);

  return (
    <section className="border-y py-4 space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold flex items-center gap-2"><Scale className="w-4 h-4" />سير عمل القضية</h4>
          <p className="text-xs text-slate-500 mt-1">الحالة القانونية مستقلة عن حالة التحصيل المالي.</p>
        </div>
        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50">{LEGAL_WORKFLOW_STAGES.find((item) => item.value === stage)?.label}</Badge>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:grid-cols-10" aria-label="مراحل القضية">
        {LEGAL_WORKFLOW_STAGES.map((item, index) => (
          <div key={item.value} title={item.label} className="min-w-0 text-center">
            <div className={cn('h-2 rounded-sm', index < stageIndex ? 'bg-emerald-400' : index === stageIndex ? 'bg-indigo-600' : 'bg-slate-200')} />
            <span className={cn('mt-1 block truncate text-[10px]', index === stageIndex ? 'font-semibold text-indigo-700' : 'text-slate-500')}>{item.label}</span>
          </div>
        ))}
      </div>

      {(legalCase.outcome_type || monetaryPending) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-2"><span className="text-xs text-slate-500">قيمة المطالبة</span><strong className="block text-sm">{formatCurrency(Number(legalCase.case_value || 0))}</strong></div>
          <div className="rounded-md bg-slate-50 p-2"><span className="text-xs text-slate-500">مبلغ الحكم</span><strong className="block text-sm">{formatCurrency(Number(legalCase.outcome_amount || 0))}</strong></div>
          <div className="rounded-md bg-slate-50 p-2"><span className="text-xs text-slate-500">المسدد/المحصل</span><strong className="block text-sm text-emerald-700">{formatCurrency(collected)}</strong></div>
          <div className="rounded-md bg-slate-50 p-2"><span className="text-xs text-slate-500">مهام مفتوحة</span><strong className="block text-sm">{pendingTasks.length}</strong></div>
        </div>
      )}

      {monetaryPending && <Alert className="border-amber-200 bg-amber-50"><AlertTriangle className="w-4 h-4 text-amber-700" /><AlertDescription className="text-amber-900">الحكم المالي غير مسدد بالكامل. لا يمكن الإغلاق النهائي إلا بعد التحصيل أو بتجاوز إداري موثق.</AlertDescription></Alert>}
      {legalCase.outcome_type && Math.abs(judgmentDifference) > 0.01 && <Alert><AlertDescription>يوجد فرق قدره {formatCurrency(Math.abs(judgmentDifference))} بين قيمة المطالبة ومبلغ الحكم. راجع منطوق الحكم قبل التنفيذ.</AlertDescription></Alert>}

      <div className="flex flex-wrap gap-2">
        {stage === 'preparation' && <Button size="sm" onClick={() => transition('filed', 'تم تسجيل رفع الدعوى')}><PlayCircle className="w-4 h-4 ml-1" />تسجيل رفع الدعوى</Button>}
        {['filed', 'hearings'].includes(stage) && <Button size="sm" onClick={() => setAction('hearing')}><CalendarDays className="w-4 h-4 ml-1" />إضافة جلسة</Button>}
        {stage === 'hearings' && <Button size="sm" variant="outline" onClick={() => transition('reserved_for_judgment', 'تم حجز القضية للحكم')}>حجز للحكم</Button>}
        {['reserved_for_judgment', 'appeal', 'judgment_issued'].includes(stage) && <Button size="sm" onClick={() => setAction('judgment')}><Gavel className="w-4 h-4 ml-1" />تسجيل الحكم</Button>}
        {stage === 'judgment_issued' && <Button size="sm" variant="outline" onClick={() => setAction('appeal')}>تسجيل الاستئناف</Button>}
        {['judgment_issued', 'appeal'].includes(stage) && <Button size="sm" variant="outline" onClick={() => setAction('enforcement')}>بدء التنفيذ</Button>}
        {['judgment_issued', 'enforcement'].includes(stage) && <Button size="sm" variant="outline" onClick={() => transition('collection', 'تمت إحالة الحكم المالي إلى سجل التسوية')}>إحالة للتسوية المالية</Button>}
        {['judgment_issued', 'appeal', 'enforcement', 'collection'].includes(stage) && <Button size="sm" variant="outline" onClick={() => setAction('close')}><CheckCircle2 className="w-4 h-4 ml-1" />إغلاق نهائي</Button>}
        {['closed', 'cancelled'].includes(stage) && <Button size="sm" variant="outline" onClick={() => setAction('reopen')}><RotateCcw className="w-4 h-4 ml-1" />إعادة فتح</Button>}
      </div>

      {pendingTasks.length > 0 && <div className="space-y-1"><p className="text-xs font-medium text-slate-600">المتابعات الحالية</p>{pendingTasks.slice(0, 3).map((task) => <div key={task.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"><span>{decodePossiblyMojibake(task.title)}</span><Badge variant="outline">{task.priority === 'urgent' ? 'عاجل' : 'متابعة'}</Badge></div>)}</div>}

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{action ? actionTitles[action] : ''}</DialogTitle><DialogDescription>سيتم حفظ هذا الإجراء في سجل القضية وإنشاء المتابعة المناسبة.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            {action === 'hearing' && <>
              <Field label="موعد الجلسة"><Input type="datetime-local" value={form.hearingDate} onChange={(e) => setForm({ ...form, hearingDate: e.target.value })} /></Field>
              <Field label="حالة الجلسة"><Select value={form.hearingStatus} onValueChange={(value) => setForm({ ...form, hearingStatus: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">مجدولة</SelectItem><SelectItem value="completed">مكتملة</SelectItem><SelectItem value="adjourned">مؤجلة</SelectItem><SelectItem value="cancelled">ملغاة</SelectItem></SelectContent></Select></Field>
              <Field label="قرار أو نتيجة الجلسة"><Textarea value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} /></Field>
              <Field label="موعد الجلسة التالية"><Input type="datetime-local" value={form.nextHearingDate} onChange={(e) => setForm({ ...form, nextHearingDate: e.target.value })} /></Field>
            </>}
            {action === 'judgment' && <>
              <Field label="نتيجة الحكم"><Select value={form.outcomeType} onValueChange={(value) => setForm({ ...form, outcomeType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="won">لصالحنا</SelectItem><SelectItem value="lost">ضدنا</SelectItem><SelectItem value="settled">تسوية</SelectItem><SelectItem value="dismissed">رفض الدعوى</SelectItem><SelectItem value="withdrawn">تنازل</SelectItem><SelectItem value="pending">حكم غير نهائي</SelectItem></SelectContent></Select></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="مبلغ الحكم"><Input type="number" min="0" value={form.outcomeAmount} onChange={(e) => setForm({ ...form, outcomeAmount: e.target.value })} /></Field><Field label="تاريخ الحكم"><Input type="date" value={form.outcomeDate} onChange={(e) => setForm({ ...form, outcomeDate: e.target.value })} /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="مهلة الاستئناف"><Input type="date" value={form.appealDeadline} onChange={(e) => setForm({ ...form, appealDeadline: e.target.value })} /></Field><Field label="اتجاه المبلغ"><Select value={form.paymentDirection} onValueChange={(value) => setForm({ ...form, paymentDirection: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="receive">تحصيل لصالحنا</SelectItem><SelectItem value="pay">دفع من الشركة</SelectItem></SelectContent></Select></Field></div>
              <Field label="منطوق الحكم وملاحظاته"><Textarea value={form.outcomeNotes} onChange={(e) => setForm({ ...form, outcomeNotes: e.target.value })} /></Field>
            </>}
            {action === 'enforcement' && <>
              <Field label="رقم ملف التنفيذ"><Input value={form.enforcementNumber} onChange={(e) => setForm({ ...form, enforcementNumber: e.target.value })} /></Field>
              <Field label="جهة التنفيذ"><Input value={form.authorityName} onChange={(e) => setForm({ ...form, authorityName: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="المبلغ القابل للتنفيذ"><Input type="number" min="0" value={form.enforceableAmount} placeholder={String(legalCase.outcome_amount || 0)} onChange={(e) => setForm({ ...form, enforceableAmount: e.target.value })} /></Field><Field label="الإجراء القادم"><Input type="date" value={form.nextActionDate} onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })} /></Field></div>
            </>}
            {action === 'appeal' && <>
              <Field label="حالة الاستئناف"><Select value={form.appealStatus} onValueChange={(value) => setForm({ ...form, appealStatus: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="eligible">قيد القرار</SelectItem><SelectItem value="filed">تم الإيداع</SelectItem><SelectItem value="accepted">مقبول</SelectItem><SelectItem value="rejected">مرفوض</SelectItem><SelectItem value="withdrawn">متنازل عنه</SelectItem></SelectContent></Select></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="تاريخ الإيداع"><Input type="datetime-local" value={form.appealFiledAt} onChange={(e) => setForm({ ...form, appealFiledAt: e.target.value })} /></Field><Field label="آخر موعد"><Input type="date" value={form.appealDeadline} onChange={(e) => setForm({ ...form, appealDeadline: e.target.value })} /></Field></div>
              <Field label="رقم الاستئناف"><Input value={form.appealReference} onChange={(e) => setForm({ ...form, appealReference: e.target.value })} /></Field>
              <Field label="المحكمة"><Input value={form.appealCourt} onChange={(e) => setForm({ ...form, appealCourt: e.target.value })} /></Field>
            </>}
            {action === 'close' && <>
              <Field label="سبب الإغلاق النهائي"><Textarea value={form.closeReason} onChange={(e) => setForm({ ...form, closeReason: e.target.value })} /></Field>
              {monetaryPending && <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><Checkbox checked={form.overrideUnsettled} onCheckedChange={(checked) => setForm({ ...form, overrideUnsettled: checked === true })} /><span>إغلاق إداري رغم وجود مبلغ غير مسدد. يتطلب صلاحية مدير وسبباً مفصلاً.</span></label>}
            </>}
            {action === 'reopen' && <>
              <Field label="المرحلة التي ستعود إليها"><Select value={form.reopenStage} onValueChange={(value) => setForm({ ...form, reopenStage: value as LegalWorkflowStage })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEGAL_WORKFLOW_STAGES.filter((item) => !['closed', 'cancelled'].includes(item.value)).map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="سبب إعادة الفتح"><Textarea value={form.reopenReason} onChange={(e) => setForm({ ...form, reopenReason: e.target.value })} placeholder="اكتب سبباً تفصيلياً لا يقل عن 10 أحرف" /></Field>
            </>}
            {['hearing', 'appeal', 'enforcement'].includes(action || '') && <Field label="ملاحظات"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAction(null)}>إلغاء</Button><Button onClick={submit} disabled={workflow.isSaving}>{workflow.isSaving ? 'جارٍ الحفظ...' : 'اعتماد الإجراء'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
