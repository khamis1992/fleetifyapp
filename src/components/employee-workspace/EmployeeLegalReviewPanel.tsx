import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CircleMinus,
  ClipboardCheck,
  Eye,
  FileUp,
  Loader2,
  Pencil,
  ReceiptText,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { useCreateContractDocument } from '@/hooks/useContractDocuments';
import { supabase } from '@/integrations/supabase/client';
import {
  type LegalEmployeeReviewDecision,
  type LegalTransferEmployeeReview,
  useMyLegalTransferEmployeeReviews,
  useRespondToLegalEmployeeReview,
} from '@/hooks/useLegalTransferEmployeeReviews';
import { cn } from '@/lib/utils';

type ReviewInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number;
  paid_amount: number | null;
  balance_due: number | null;
  status: string | null;
  payment_status: string | null;
  journal_entry_id: string | null;
};

const isInvoiceEditable = (invoice: ReviewInvoice) =>
  !invoice.journal_entry_id
  && Number(invoice.paid_amount || 0) <= 0.01
  && !['cancelled', 'canceled', 'void', 'voided', 'deleted', 'paid'].includes(
    String(invoice.status || '').toLowerCase(),
  )
  && !['cancelled', 'canceled', 'void', 'voided', 'paid', 'partial'].includes(
    String(invoice.payment_status || '').toLowerCase(),
  );

const isInvoiceCancelled = (invoice: ReviewInvoice) =>
  ['cancelled', 'canceled', 'void', 'voided', 'deleted'].includes(
    String(invoice.status || '').toLowerCase(),
  );

// Cancellation goes through the canonical journal-reversal path on the server,
// so unpaid invoices with posted journals can still be cancelled here.
const isInvoiceCancellable = (invoice: ReviewInvoice) =>
  !isInvoiceCancelled(invoice)
  && !['paid', 'partial'].includes(String(invoice.payment_status || '').toLowerCase());

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
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: reviews = [], isLoading } = useMyLegalTransferEmployeeReviews(profileId);
  const respond = useRespondToLegalEmployeeReview();
  const createDocument = useCreateContractDocument();
  const contractFileInputRef = React.useRef<HTMLInputElement>(null);
  const [selected, setSelected] = React.useState<LegalTransferEmployeeReview | null>(null);
  const [form, setForm] = React.useState<ReviewForm | null>(null);
  const [isViewingContract, setIsViewingContract] = React.useState(false);
  const [editingInvoice, setEditingInvoice] = React.useState<ReviewInvoice | null>(null);
  const [editedInvoiceAmount, setEditedInvoiceAmount] = React.useState('');
  const [cancellingInvoice, setCancellingInvoice] = React.useState<ReviewInvoice | null>(null);
  const [invoiceActionReason, setInvoiceActionReason] = React.useState('');
  const [isInvoiceActionPending, setIsInvoiceActionPending] = React.useState(false);

  const { data: contractDocuments = [] } = useQuery({
    queryKey: ['legal-review-contract-documents', selected?.contract_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_documents')
        .select('id, document_name, document_type, file_path, mime_type, created_at')
        .eq('contract_id', selected!.contract_id)
        .in('document_type', ['signed_contract', 'signed_contract_image'])
        .not('file_path', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(selected?.contract_id),
  });
  const contractCopy = contractDocuments[0];

  const { data: contractInvoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['legal-review-contract-invoices', selected?.contract_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, due_date, total_amount, paid_amount, balance_due, status, payment_status, journal_entry_id')
        .eq('contract_id', selected!.contract_id)
        .eq('company_id', selected!.company_id)
        .order('invoice_date', { ascending: true });
      if (error) throw error;
      return (data || []) as ReviewInvoice[];
    },
    enabled: Boolean(selected?.contract_id && selected?.company_id),
  });
  const activeInvoices = contractInvoices.filter((invoice) =>
    !['cancelled', 'canceled', 'void', 'voided', 'deleted'].includes(
      String(invoice.status || '').toLowerCase(),
    ),
  );
  const liveInvoiceBalance = activeInvoices.reduce(
    (sum, invoice) => sum + Math.max(Number(invoice.balance_due || 0), 0),
    0,
  );

  const openReview = (review: LegalTransferEmployeeReview) => {
    setSelected(review);
    setForm(formFromReview(review));
  };

  const viewContractCopy = async () => {
    if (!contractCopy?.file_path) return;
    setIsViewingContract(true);
    try {
      const { data, error } = await supabase.storage
        .from('contract-documents')
        .createSignedUrl(contractCopy.file_path, 3600);
      if (error || !data?.signedUrl) throw error || new Error('تعذر إنشاء رابط المعاينة');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فتح نسخة العقد');
    } finally {
      setIsViewingContract(false);
    }
  };

  const uploadContractCopy = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected || files.length === 0) return;
    try {
      for (const file of files) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        await createDocument.mutateAsync({
          contract_id: selected.contract_id,
          document_type: isPdf ? 'signed_contract' : 'signed_contract_image',
          document_name: isPdf ? 'نسخة العقد الموقعة' : `صورة العقد الموقعة - ${file.name}`,
          file,
          notes: 'رفعت أثناء تدقيق الموظف قبل التحويل القانوني',
          is_required: true,
          suppressSuccessToast: true,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ['legal-review-contract-documents', selected.contract_id],
      });
      toast.success('تم حفظ نسخة العقد ضمن مستندات العقد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع نسخة العقد');
    }
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

  const saveInvoiceCorrection = async () => {
    if (!selected || !editingInvoice) return;
    const amount = Number(editedInvoiceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('أدخل مبلغًا صحيحًا أكبر من صفر');
      return;
    }
    if (!invoiceActionReason.trim()) {
      toast.error('اكتب سبب التصحيح');
      return;
    }
    setIsInvoiceActionPending(true);
    try {
      const { error } = await (supabase.rpc as any)('legal_transfer_update_invoice_amount_v1', {
        p_company_id: selected.company_id,
        p_contract_id: selected.contract_id,
        p_invoice_id: editingInvoice.id,
        p_new_total: amount,
        p_reason: invoiceActionReason.trim(),
      });
      if (error) throw error;
      setEditingInvoice(null);
      setInvoiceActionReason('');
      await refetchInvoices();
      toast.success('تم تصحيح مبلغ الفاتورة وتسجيل العملية في سجل التدقيق');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تصحيح مبلغ الفاتورة');
    } finally {
      setIsInvoiceActionPending(false);
    }
  };

  const cancelInvoice = async () => {
    if (!selected || !cancellingInvoice) return;
    if (!invoiceActionReason.trim()) {
      toast.error('اكتب سبب إلغاء الفاتورة');
      return;
    }
    setIsInvoiceActionPending(true);
    try {
      const { error } = await (supabase.rpc as any)('legal_transfer_cancel_invoice_v1', {
        p_company_id: selected.company_id,
        p_contract_id: selected.contract_id,
        p_invoice_id: cancellingInvoice.id,
        p_reason: invoiceActionReason.trim(),
      });
      if (error) throw error;
      setCancellingInvoice(null);
      setInvoiceActionReason('');
      await refetchInvoices();
      toast.success('تم إلغاء الفاتورة غير المستحقة وتسجيل العملية في سجل التدقيق');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إلغاء الفاتورة');
    } finally {
      setIsInvoiceActionPending(false);
    }
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={viewContractCopy}
                      disabled={!contractCopy || isViewingContract}
                      className="gap-1"
                    >
                      {isViewingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      نسخة العقد
                    </Button>
                  </div>
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

                <div className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3',
                  contractCopy ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50',
                )}>
                  <div className="flex items-center gap-2 text-sm">
                    {contractCopy ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <span className={contractCopy ? 'font-bold text-emerald-900' : 'font-bold text-amber-900'}>
                      {contractCopy
                        ? `نسخة العقد محفوظة: ${contractCopy.document_name}`
                        : 'لا توجد نسخة موقعة من العقد في المستندات'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => contractFileInputRef.current?.click()}
                    disabled={createDocument.isPending}
                    className="gap-1.5 bg-white"
                  >
                    {createDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                    {contractCopy ? 'رفع نسخة أحدث' : 'رفع نسخة العقد'}
                  </Button>
                  <input
                    ref={contractFileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    className="hidden"
                    onChange={uploadContractCopy}
                  />
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#6A7688]">رصيد الفواتير الحالي</p>
                  <p className="mt-1 font-black text-[#142033]">{formatCurrency(liveInvoiceBalance)}</p>
                  {Number(selected.request_snapshot?.invoice_balance || 0) !== liveInvoiceBalance && (
                    <p className="mt-0.5 text-[10px] text-[#9A5A00]">
                      كان {formatCurrency(Number(selected.request_snapshot?.invoice_balance || 0))} عند إرسال الطلب
                    </p>
                  )}
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

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-black text-[#142033]">
                    <ReceiptText className="h-4 w-4 text-[#1D4F7A]" />
                    فواتير العقد
                  </h3>
                  <span className="text-xs text-[#6A7688]">
                    الفواتير الملغاة أو المصححة تُسجل باسمك وسببها في سجل التدقيق
                  </span>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {contractInvoices.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[#DDE5EF] p-4 text-center text-sm text-[#6A7688]">
                      لا توجد فواتير مرتبطة بهذا العقد.
                    </p>
                  ) : (
                    contractInvoices.map((invoice) => {
                      const editable = isInvoiceEditable(invoice);
                      const cancellable = isInvoiceCancellable(invoice);
                      const cancelled = isInvoiceCancelled(invoice);
                      return (
                        <div
                          key={invoice.id}
                          className={cn(
                            'grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto]',
                            cancelled ? 'border-[#E2E8F0] bg-[#F8FAFC] opacity-70' : 'border-[#DDE5EF] bg-white',
                          )}
                        >
                          <div className="min-w-0">
                            <p className={cn('truncate font-bold text-[#142033]', cancelled && 'line-through')}>
                              {invoice.invoice_number}
                            </p>
                            <p className="mt-0.5 text-xs text-[#6A7688]">
                              {invoice.invoice_date || '-'} · {cancelled ? 'ملغاة' : String(invoice.payment_status || invoice.status || '')}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="text-xs text-[#6A7688]">الإجمالي / المتبقي</p>
                            <p className="font-black text-[#142033]">
                              {formatCurrency(Number(invoice.total_amount || 0))} / {formatCurrency(Number(invoice.balance_due || 0))}
                            </p>
                          </div>
                          {editable || cancellable ? (
                            <div className="flex gap-1.5">
                              {editable && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => {
                                    setEditingInvoice(invoice);
                                    setEditedInvoiceAmount(String(invoice.total_amount || 0));
                                    setInvoiceActionReason('');
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  تصحيح
                                </Button>
                              )}
                              {cancellable && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 border-[#F2B8B5] text-[#B42318] hover:bg-[#FFF0EE]"
                                  onClick={() => {
                                    setCancellingInvoice(invoice);
                                    setInvoiceActionReason('');
                                  }}
                                >
                                  <CircleMinus className="h-3.5 w-3.5" />
                                  إلغاء
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="self-center text-xs text-[#94A3B8]">
                              {cancelled ? 'ملغاة' : 'محمية محاسبياً'}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
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

      <Dialog
        open={Boolean(editingInvoice)}
        onOpenChange={(open) => !open && !isInvoiceActionPending && setEditingInvoice(null)}
      >
        <DialogContent dir="rtl" className="max-w-md text-right">
          <DialogHeader className="text-right">
            <DialogTitle>تصحيح مبلغ الفاتورة</DialogTitle>
            <DialogDescription className="text-right leading-6">
              {editingInvoice?.invoice_number} · يُسجل النظام القيمة السابقة والجديدة واسمك في سجل التدقيق.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="review-invoice-amount">المبلغ الصحيح</Label>
              <Input
                id="review-invoice-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={editedInvoiceAmount}
                onChange={(event) => setEditedInvoiceAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-invoice-reason">سبب التصحيح</Label>
              <Textarea
                id="review-invoice-reason"
                value={invoiceActionReason}
                onChange={(event) => setInvoiceActionReason(event.target.value)}
                placeholder="اشرح سبب اختلاف مبلغ الفاتورة..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingInvoice(null)} disabled={isInvoiceActionPending}>
              إلغاء
            </Button>
            <Button onClick={saveInvoiceCorrection} disabled={isInvoiceActionPending} className="bg-[#0D876A] text-white hover:bg-[#0A6E57]">
              {isInvoiceActionPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ التصحيح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancellingInvoice)}
        onOpenChange={(open) => !open && !isInvoiceActionPending && setCancellingInvoice(null)}
      >
        <DialogContent dir="rtl" className="max-w-md text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="text-[#B42318]">إلغاء فاتورة غير مستحقة</DialogTitle>
            <DialogDescription className="text-right leading-6">
              {cancellingInvoice?.invoice_number} · بقيمة {formatCurrency(Number(cancellingInvoice?.total_amount || 0))}.
              ستُعلّم الفاتورة كملغاة ويُسجل اسمك والسبب في سجل التدقيق، ولن تُحذف نهائياً.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="review-cancel-reason">سبب الإلغاء (إلزامي)</Label>
            <Textarea
              id="review-cancel-reason"
              value={invoiceActionReason}
              onChange={(event) => setInvoiceActionReason(event.target.value)}
              placeholder="مثال: الفاتورة أُنشئت عن فترة خارج مدة العقد..."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancellingInvoice(null)} disabled={isInvoiceActionPending}>
              تراجع
            </Button>
            <Button
              onClick={cancelInvoice}
              disabled={isInvoiceActionPending || !invoiceActionReason.trim()}
              className="bg-[#B42318] text-white hover:bg-[#912018]"
            >
              {isInvoiceActionPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
