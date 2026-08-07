import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Scale,
  ShieldCheck,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  type LegalEmployeeReviewDecision,
  type LegalTransferEmployeeReview,
  useMyLegalTransferEmployeeReviews,
  useRespondToLegalEmployeeReview,
} from '@/hooks/useLegalTransferEmployeeReviews';
import { cn } from '@/lib/utils';

const checklistItems = [
  ['identity_verified', 'الهوية والاسم', 'طابقت الاسم والرقم الشخصي مع البطاقة والعقد.'],
  ['financial_verified', 'الرصيد والدفعات', 'راجعت الفواتير والدفعات ووعود السداد.'],
  ['contact_verified', 'بيانات التواصل', 'تأكدت من الهاتف وآخر تواصل مع العميل.'],
  ['vehicle_verified', 'حالة المركبة', 'حددت هل المركبة لدى العميل أم مستلمة.'],
  ['documents_verified', 'المستندات', 'تأكدت من وجود العقد الموقع والمرفقات اللازمة.'],
] as const;

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: 'بانتظار التدقيق', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  in_progress: { label: 'قيد التدقيق', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  corrections_required: { label: 'تحتاج تصحيح', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  deferred: { label: 'مؤجلة', className: 'border-slate-200 bg-slate-50 text-slate-700' },
};

type ReviewForm = {
  first_name_ar: string;
  last_name_ar: string;
  nationality: string;
  national_id: string;
  national_id_expiry: string;
  phone: string;
  vehicle_returned: 'yes' | 'no';
  notes: string;
  checklist: Record<string, boolean>;
};

const emptyChecklist = () => Object.fromEntries(
  checklistItems.map(([key]) => [key, false]),
) as Record<string, boolean>;

function formFromReview(review: LegalTransferEmployeeReview): ReviewForm {
  const customer = review.customers;
  return {
    first_name_ar: customer?.first_name_ar || '',
    last_name_ar: customer?.last_name_ar || '',
    nationality: customer?.nationality || '',
    national_id: customer?.national_id || '',
    national_id_expiry: customer?.national_id_expiry || '',
    phone: customer?.phone || '',
    vehicle_returned: review.contracts?.vehicle_returned ? 'yes' : 'no',
    notes: review.employee_notes || '',
    checklist: emptyChecklist(),
  };
}

export function EmployeeLegalReviewPanel({ profileId }: { profileId?: string | null }) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: reviews = [], isLoading } = useMyLegalTransferEmployeeReviews(profileId);
  const respond = useRespondToLegalEmployeeReview();
  const [selected, setSelected] = React.useState<LegalTransferEmployeeReview | null>(null);
  const [form, setForm] = React.useState<ReviewForm | null>(null);

  const openReview = (review: LegalTransferEmployeeReview) => {
    setSelected(review);
    setForm(formFromReview(review));
  };

  const submitDecision = async (decision: LegalEmployeeReviewDecision) => {
    if (!selected || !form) return;
    const checklistComplete = checklistItems.every(([key]) => form.checklist[key]);
    if (decision === 'employee_approved' && !checklistComplete) return;
    if (decision !== 'employee_approved' && !form.notes.trim()) return;

    await respond.mutateAsync({
      companyId: selected.company_id,
      reviewId: selected.id,
      decision,
      notes: form.notes.trim(),
      checklist: form.checklist,
      customerUpdates: {
        first_name_ar: form.first_name_ar,
        last_name_ar: form.last_name_ar,
        nationality: form.nationality,
        national_id: form.national_id,
        national_id_expiry: form.national_id_expiry,
        phone: form.phone,
      },
      contractUpdates: { vehicle_returned: form.vehicle_returned === 'yes' },
    });
    setSelected(null);
    setForm(null);
  };

  if (!isLoading && reviews.length === 0) return null;

  return (
    <>
      <Card className="mb-4 overflow-hidden rounded-xl border-[#F4C96B] bg-white shadow-sm sm:mb-5">
        <div className="h-1 bg-[#D99A21]" />
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF4D6] text-[#9A5A00]">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-black text-[#142033]">طلبات تدقيق قبل التحويل القانوني</h2>
                  <Badge className="bg-[#D99A21] text-white hover:bg-[#D99A21]">
                    {reviews.length}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6A7688] sm:text-sm">
                  راجع بيانات العميل والمبالغ والمستندات ثم أرسل قرارك للفريق القانوني.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] p-4 text-sm text-[#6A7688]">
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ تحميل طلبات التدقيق...
              </div>
            ) : reviews.map((review) => {
              const customerName = [
                review.customers?.first_name_ar || review.customers?.first_name,
                review.customers?.last_name_ar || review.customers?.last_name,
              ].filter(Boolean).join(' ') || 'عميل غير محدد';
              const meta = statusMeta[review.status] || statusMeta.pending;
              return (
                <div key={review.id} className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-[#142033]">{customerName}</p>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#6A7688]">
                      عقد {review.contracts?.contract_number || '-'} · مستحق{' '}
                      {formatCurrency(Number(review.request_snapshot?.invoice_balance || review.contracts?.balance_due || 0))}
                    </p>
                  </div>
                  <Button type="button" size="sm" onClick={() => openReview(review)} className="gap-1.5 bg-[#1D4F7A] text-white hover:bg-[#173A63]">
                    <ClipboardCheck className="h-4 w-4" />
                    تدقيق وتصحيح
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected && form)} onOpenChange={(open) => !open && !respond.isPending && setSelected(null)}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-4xl overflow-y-auto text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-[#1D4F7A]" />
              تدقيق العقد {selected?.contracts?.contract_number}
            </DialogTitle>
            <DialogDescription className="text-right leading-6">
              صحح البيانات عند الحاجة، ثم أكمل قائمة التحقق وأرسل القرار للفريق القانوني.
            </DialogDescription>
          </DialogHeader>

          {selected && form && (
            <div className="space-y-5 py-2">
              {selected.request_reason && (
                <Alert className="border-[#BFD7EA] bg-[#EEF6FC]">
                  <AlertCircle className="h-4 w-4 text-[#1D4F7A]" />
                  <AlertDescription className="text-[#173A63]">
                    طلب القانونية: {selected.request_reason}
                  </AlertDescription>
                </Alert>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-[#142033]">بيانات العميل القابلة للتصحيح</h3>
                  <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/contracts/${selected.contracts?.contract_number}`)} className="gap-1">
                    <FileText className="h-4 w-4" />
                    تفاصيل العقد
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['first_name_ar', 'الاسم الأول بالعربي'],
                    ['last_name_ar', 'بقية الاسم بالعربي'],
                    ['nationality', 'الجنسية'],
                    ['national_id', 'الرقم الشخصي'],
                    ['national_id_expiry', 'انتهاء البطاقة'],
                    ['phone', 'رقم الهاتف'],
                  ].map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <Label htmlFor={`legal-review-${field}`}>{label}</Label>
                      <Input
                        id={`legal-review-${field}`}
                        type={field === 'national_id_expiry' ? 'date' : 'text'}
                        value={String(form[field as keyof Omit<ReviewForm, 'checklist'>] || '')}
                        onChange={(event) => setForm((current) => current ? { ...current, [field]: event.target.value } : current)}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#6A7688]">رصيد الفواتير عند الطلب</p>
                  <p className="mt-1 font-black text-[#142033]">{formatCurrency(Number(selected.request_snapshot?.invoice_balance || 0))}</p>
                </div>
                <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#6A7688]">رصيد العقد</p>
                  <p className="mt-1 font-black text-[#142033]">{formatCurrency(Number(selected.contracts?.balance_due || 0))}</p>
                </div>
                <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#6A7688]">المهلة</p>
                  <p className="mt-1 flex items-center gap-1 font-bold text-[#142033]">
                    <CalendarClock className="h-4 w-4 text-[#9A5A00]" />
                    {new Date(selected.due_at).toLocaleDateString('ar-QA')}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <Label className="font-black">حالة المركبة</Label>
                <RadioGroup value={form.vehicle_returned} onValueChange={(value) => setForm({ ...form, vehicle_returned: value as 'yes' | 'no' })} className="grid gap-2 sm:grid-cols-2">
                  <Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <RadioGroupItem value="no" /> ما زالت لدى العميل
                  </Label>
                  <Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <RadioGroupItem value="yes" /> تم استلام المركبة
                  </Label>
                </RadioGroup>
              </section>

              <section className="space-y-2">
                <h3 className="font-black text-[#142033]">قائمة التحقق الإلزامية</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {checklistItems.map(([key, title, description]) => (
                    <Label key={key} className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                      form.checklist[key] ? 'border-emerald-200 bg-emerald-50' : 'border-[#DDE5EF] bg-white',
                    )}>
                      <Checkbox checked={form.checklist[key]} onCheckedChange={(checked) => setForm({
                        ...form,
                        checklist: { ...form.checklist, [key]: checked === true },
                      })} className="mt-0.5" />
                      <span>
                        <span className="block font-bold text-[#142033]">{title}</span>
                        <span className="mt-0.5 block text-xs font-normal leading-5 text-[#6A7688]">{description}</span>
                      </span>
                    </Label>
                  ))}
                </div>
              </section>

              <div className="space-y-1.5">
                <Label htmlFor="legal-employee-notes">ملاحظات الموظف</Label>
                <Textarea id="legal-employee-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="اكتب نتيجة التواصل أو سبب التأجيل أو البيانات التي تحتاج متابعة..." className="min-h-24" />
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="border-rose-200 text-rose-700" disabled={respond.isPending || !form?.notes.trim()} onClick={() => submitDecision('employee_rejected')}>
                غير مناسب للتحويل
              </Button>
              <Button type="button" variant="outline" className="border-amber-200 text-amber-800" disabled={respond.isPending || !form?.notes.trim()} onClick={() => submitDecision('deferred')}>
                تأجيل
              </Button>
              <Button type="button" variant="outline" disabled={respond.isPending || !form?.notes.trim()} onClick={() => submitDecision('corrections_required')}>
                يحتاج متابعة
              </Button>
            </div>
            <Button
              type="button"
              disabled={respond.isPending || !form || !checklistItems.every(([key]) => form.checklist[key])}
              onClick={() => submitDecision('employee_approved')}
              className="gap-2 bg-[#0D876A] text-white hover:bg-[#0A6E57]"
            >
              {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              تم التصحيح وجاهز للقانونية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
