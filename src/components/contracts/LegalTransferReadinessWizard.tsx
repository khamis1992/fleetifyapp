import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Banknote,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileText,
  Gavel,
  Loader2,
  Pencil,
  ReceiptText,
  Scale,
  ShieldCheck,
  TrafficCone,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  type ContractForLegal,
  useConvertToLegal,
  useExistingLegalCase,
} from '@/hooks/useConvertToLegal';
import { useCreateContractDocument } from '@/hooks/useContractDocuments';
import {
  SignedContractScannerDialog,
  type SignedContractScanFiles,
} from './SignedContractScannerDialog';

type LegalTransferInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_status: string;
  status: string;
  journal_entry_id: string | null;
  can_edit_amount: boolean;
};

type LegalTransferPayment = {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_status: string;
  payment_method: string;
  reference_number: string | null;
  invoice_id: string | null;
  journal_entry_id: string | null;
};

type LegalTransferViolation = {
  id: string;
  violation_number: string;
  violation_date: string;
  violation_type: string;
  description: string | null;
  fine_amount: number;
  total_amount: number;
  liability_amount: number;
  status: string;
  responsibility_party: string;
};

type LegalTransferReadiness = {
  invoices: LegalTransferInvoice[];
  payments: LegalTransferPayment[];
  violations: LegalTransferViolation[];
  signed_contract_ready: boolean;
  violation_proof_ready: boolean;
  latest_review?: Record<string, unknown>;
};

type CaseType = 'payment_collection' | 'contract_breach' | 'vehicle_damage' | 'other';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type VehicleDisposition = 'keep_with_customer' | 'returned';

interface LegalTransferReadinessWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractForLegal | null;
  onSuccess?: () => void;
}

const steps = [
  { title: 'المبالغ والدفعات', icon: Banknote },
  { title: 'نسخة العقد', icon: FileText },
  { title: 'المخالفات', icon: TrafficCone },
  { title: 'إثبات المرور', icon: ReceiptText },
  { title: 'المراجعة والتحويل', icon: Gavel },
];

const callRpc = async <T,>(
  functionName: string,
  args: Record<string, unknown>,
): Promise<T> => {
  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    parameters: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>)(
    functionName,
    args,
  );

  if (error) throw new Error(error.message || 'تعذر تنفيذ العملية');
  return data as T;
};

const statusLabel = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'completed' || normalized === 'paid') return 'مكتمل';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'ملغي';
  if (normalized === 'partial') return 'جزئي';
  if (normalized === 'overdue') return 'متأخر';
  if (normalized === 'pending') return 'معلق';
  if (normalized === 'unpaid') return 'غير مدفوع';
  return status || 'غير محدد';
};

export function LegalTransferReadinessWizard({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: LegalTransferReadinessWizardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const createDocument = useCreateContractDocument();
  const convertMutation = useConvertToLegal();
  const signedFileInputRef = React.useRef<HTMLInputElement>(null);
  const violationProofInputRef = React.useRef<HTMLInputElement>(null);

  const [step, setStep] = React.useState(0);
  const [financialReviewed, setFinancialReviewed] = React.useState(false);
  const [violationsReviewed, setViolationsReviewed] = React.useState(false);
  const [claimAmount, setClaimAmount] = React.useState('');
  const [financialNotes, setFinancialNotes] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [priority, setPriority] = React.useState<Priority>('high');
  const [caseType, setCaseType] = React.useState<CaseType>('payment_collection');
  const [vehicleDisposition, setVehicleDisposition] =
    React.useState<VehicleDisposition>('keep_with_customer');
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [editingInvoice, setEditingInvoice] = React.useState<LegalTransferInvoice | null>(null);
  const [editedInvoiceAmount, setEditedInvoiceAmount] = React.useState('');
  const [invoiceEditReason, setInvoiceEditReason] = React.useState('');
  const [isCorrectingInvoice, setIsCorrectingInvoice] = React.useState(false);

  const {
    data: existingCase,
  } = useExistingLegalCase(open ? contract?.id || '' : '');

  const readinessQuery = useQuery({
    queryKey: ['legal-transfer-readiness', contract?.company_id, contract?.id],
    queryFn: () =>
      callRpc<LegalTransferReadiness>('get_legal_transfer_readiness_v1', {
        p_company_id: contract?.company_id,
        p_contract_id: contract?.id,
      }),
    enabled: open && Boolean(contract?.id && contract?.company_id),
    staleTime: 0,
  });

  const readiness = readinessQuery.data;
  const invoices = readiness?.invoices || [];
  const payments = readiness?.payments || [];
  const violations = readiness?.violations || [];
  const hasActiveCase = Boolean(
    existingCase && ['open', 'active', 'pending', 'on_hold', 'under_review'].includes(existingCase.case_status),
  );

  const invoiceOutstanding = React.useMemo(
    () => invoices.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0),
    [invoices],
  );
  const completedPayments = React.useMemo(
    () =>
      payments
        .filter((payment) => payment.payment_status === 'completed')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments],
  );
  const violationTotal = React.useMemo(
    () =>
      violations.reduce(
        (sum, violation) =>
          sum + Number(violation.liability_amount || violation.total_amount || violation.fine_amount || 0),
        0,
      ),
    [violations],
  );

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setFinancialReviewed(false);
    setViolationsReviewed(false);
    setFinancialNotes('');
    setNotes('');
    setPriority('high');
    setCaseType('payment_collection');
    setVehicleDisposition(
      contract?.vehicle_returned || ['cancelled', 'closed'].includes(contract?.status || '')
        ? 'returned'
        : 'keep_with_customer',
    );
  }, [contract?.id, contract?.status, contract?.vehicle_returned, open]);

  React.useEffect(() => {
    if (!open || !readiness) return;
    const defaultClaim =
      invoiceOutstanding > 0
        ? invoiceOutstanding + Number(contract?.late_fine_amount || 0)
        : Number(contract?.balance_due || 0) + Number(contract?.late_fine_amount || 0);
    setClaimAmount(defaultClaim.toFixed(2));
  }, [
    contract?.balance_due,
    contract?.late_fine_amount,
    invoiceOutstanding,
    open,
    readiness,
  ]);

  const resetAndClose = (nextOpen: boolean) => {
    if (
      !nextOpen
      && (createDocument.isPending || convertMutation.isPending || isCorrectingInvoice)
    ) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const uploadContractDocument = async (
    file: File,
    documentType: 'signed_contract' | 'signed_contract_image' | 'violations_proof',
    documentName: string,
    notesText: string,
  ) => {
    if (!contract) throw new Error('تعذر تحديد العقد');
    await createDocument.mutateAsync({
      contract_id: contract.id,
      document_type: documentType,
      document_name: documentName,
      file,
      notes: notesText,
      is_required: true,
      suppressSuccessToast: true,
    });
  };

  const handleSignedFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    try {
      for (const file of files) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        await uploadContractDocument(
          file,
          isPdf ? 'signed_contract' : 'signed_contract_image',
          isPdf ? 'نسخة العقد الموقعة' : `صورة العقد الموقعة - ${file.name}`,
          'رفع أثناء تجهيز العقد للتحويل إلى الشؤون القانونية',
        );
      }
      await readinessQuery.refetch();
      toast.success('تم حفظ نسخة العقد ضمن مستندات العقد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع نسخة العقد');
    }
  };

  const handleScannedContract = async ({
    pdfFile,
    pageImages,
  }: SignedContractScanFiles) => {
    await uploadContractDocument(
      pdfFile,
      'signed_contract',
      'نسخة العقد الموقعة الممسوحة',
      `مسح بالجوال أثناء التجهيز القانوني، ${pageImages.length} صفحة`,
    );

    for (let index = pageImages.length - 1; index >= 0; index -= 1) {
      await uploadContractDocument(
        pageImages[index],
        'signed_contract_image',
        `صورة العقد الموقعة - صفحة ${index + 1}`,
        'صورة ممسوحة مع قص A4 وتصحيح المنظور',
      );
    }
    await readinessQuery.refetch();
  };

  const handleViolationProof = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    try {
      for (const file of files) {
        await uploadContractDocument(
          file,
          'violations_proof',
          `إثبات مخالفات وزارة الداخلية / مطراش - ${file.name}`,
          `إثبات مرتبط بـ ${violations.length} مخالفة أثناء التجهيز القانوني`,
        );
      }
      await readinessQuery.refetch();
      toast.success('تم حفظ إثبات المخالفات ضمن مستندات العقد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع إثبات المخالفات');
    }
  };

  const openInvoiceEditor = (invoice: LegalTransferInvoice) => {
    setEditingInvoice(invoice);
    setEditedInvoiceAmount(String(invoice.total_amount || 0));
    setInvoiceEditReason('');
  };

  const saveInvoiceCorrection = async () => {
    if (!contract || !editingInvoice || !user?.id) return;
    const amount = Number(editedInvoiceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('أدخل مبلغًا صحيحًا أكبر من صفر');
      return;
    }
    if (!invoiceEditReason.trim()) {
      toast.error('اكتب سبب تصحيح المبلغ');
      return;
    }

    setIsCorrectingInvoice(true);
    try {
      await callRpc('legal_transfer_update_invoice_amount_v1', {
        p_company_id: contract.company_id,
        p_contract_id: contract.id,
        p_invoice_id: editingInvoice.id,
        p_new_total: amount,
        p_reason: invoiceEditReason.trim(),
        p_actor_id: user.id,
      });
      setEditingInvoice(null);
      await readinessQuery.refetch();
      toast.success('تم تصحيح مبلغ الفاتورة وتسجيل العملية في سجل التدقيق');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تصحيح مبلغ الفاتورة');
    } finally {
      setIsCorrectingInvoice(false);
    }
  };

  const canContinue = () => {
    if (step === 0) return financialReviewed && Number(claimAmount) >= 0;
    if (step === 1) return Boolean(readiness?.signed_contract_ready);
    if (step === 2) return violationsReviewed;
    if (step === 3) return violations.length === 0 || Boolean(readiness?.violation_proof_ready);
    return true;
  };

  const completeTransfer = async () => {
    if (!contract || !user?.id || !readiness) return;
    if (
      !financialReviewed
      || !readiness.signed_contract_ready
      || !violationsReviewed
      || (violations.length > 0 && !readiness.violation_proof_ready)
    ) {
      toast.error('أكمل جميع مراحل الجاهزية قبل التحويل');
      return;
    }

    try {
      await callRpc('complete_legal_transfer_readiness_v1', {
        p_company_id: contract.company_id,
        p_contract_id: contract.id,
        p_payload: {
          financial_reviewed: true,
          claim_amount: Number(claimAmount),
          accounting_invoice_balance: invoiceOutstanding,
          completed_payments: completedPayments,
          financial_notes: financialNotes.trim(),
          signed_contract_ready: true,
          violations_reviewed: true,
          violation_count: violations.length,
          violation_total: violationTotal,
          violation_proof_ready:
            violations.length === 0 || Boolean(readiness.violation_proof_ready),
          vehicle_returned: vehicleDisposition === 'returned',
        },
        p_actor_id: user.id,
      });

      await convertMutation.mutateAsync({
        contractId: contract.id,
        contract,
        notes,
        priority,
        caseType,
        vehicleReturned: vehicleDisposition === 'returned',
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['legal-transfer-readiness', contract.company_id, contract.id] }),
        queryClient.invalidateQueries({ queryKey: ['employee-signed-contract-documents'] }),
      ]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إكمال التحويل القانوني');
    }
  };

  const renderFinancialStep = () => (
    <div className="space-y-4">
      <Alert className="border-[#BFD7EA] bg-[#EEF6FC]">
        <ShieldCheck className="h-4 w-4 text-[#1D4F7A]" />
        <AlertDescription className="leading-6 text-[#173A63]">
          لديك صلاحية مؤقتة ومحصورة بهذا العقد لتصحيح الفواتير غير المدفوعة. الدفعات
          المكتملة والقيود المحاسبية تبقى محمية ويجب عكسها بالمسار المحاسبي المعتمد.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#DDE5EF] bg-white p-4">
          <p className="text-xs font-bold text-[#6A7688]">رصيد الفواتير القائم</p>
          <p className="mt-1 text-lg font-black text-[#142033]">{formatCurrency(invoiceOutstanding)}</p>
        </div>
        <div className="rounded-lg border border-[#DDE5EF] bg-white p-4">
          <p className="text-xs font-bold text-[#6A7688]">الدفعات المكتملة</p>
          <p className="mt-1 text-lg font-black text-[#0D876A]">{formatCurrency(completedPayments)}</p>
        </div>
        <div className="rounded-lg border border-[#DDE5EF] bg-white p-4">
          <p className="text-xs font-bold text-[#6A7688]">غرامات التأخير</p>
          <p className="mt-1 text-lg font-black text-[#9A5A00]">
            {formatCurrency(Number(contract?.late_fine_amount || 0))}
          </p>
        </div>
      </div>

      <Card className="rounded-lg border-[#DDE5EF] shadow-none">
        <CardHeader className="border-b border-[#EEF2F6] pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4 w-4 text-[#1D4F7A]" />
            الفواتير التي تكوّن المطالبة
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 space-y-2 overflow-y-auto p-3">
          {invoices.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-[#6A7688]">
              لا توجد فواتير فعالة مرتبطة بالعقد.
            </p>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid gap-2 rounded-lg border border-[#E5EAF1] bg-[#F8FAFC] p-3 sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <p className="font-bold text-[#142033]">{invoice.invoice_number}</p>
                  <p className="mt-1 text-xs text-[#6A7688]">
                    {invoice.invoice_date} · {statusLabel(invoice.payment_status)}
                  </p>
                </div>
                <div className="text-right sm:text-left">
                  <p className="text-xs text-[#6A7688]">الإجمالي / المتبقي</p>
                  <p className="font-black text-[#142033]">
                    {formatCurrency(invoice.total_amount)} / {formatCurrency(invoice.balance_due)}
                  </p>
                </div>
                {invoice.can_edit_amount ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => openInvoiceEditor(invoice)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    تصحيح
                  </Button>
                ) : (
                  <Badge variant="outline" className="w-fit border-[#DDE5EF] text-[#6A7688]">
                    محمي محاسبيًا
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#DDE5EF] shadow-none">
        <CardHeader className="border-b border-[#EEF2F6] pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-[#0D876A]" />
            الدفعات المسجلة
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-52 space-y-2 overflow-y-auto p-3">
          {payments.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-[#6A7688]">
              لا توجد دفعات مرتبطة بالعقد.
            </p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5EAF1] p-3"
              >
                <div>
                  <p className="font-bold text-[#142033]">{payment.payment_number}</p>
                  <p className="text-xs text-[#6A7688]">
                    {payment.payment_date} · {payment.payment_method}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-black text-[#142033]">{formatCurrency(payment.amount)}</p>
                  <Badge variant="outline">{statusLabel(payment.payment_status)}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="legal-claim-amount">المبلغ الذي سيحوّل للمطالبة القانونية</Label>
          <Input
            id="legal-claim-amount"
            type="number"
            min="0"
            step="0.01"
            value={claimAmount}
            onChange={(event) => setClaimAmount(event.target.value)}
            className="h-11 font-black"
          />
          <p className="text-xs leading-5 text-[#6A7688]">
            هذا هو مبلغ المطالبة القانونية المعتمد، ويُحفظ مع سجل المراجعة.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="financial-review-notes">سبب أي فرق أو ملاحظات مالية</Label>
          <Textarea
            id="financial-review-notes"
            value={financialNotes}
            onChange={(event) => setFinancialNotes(event.target.value)}
            placeholder="مثال: استبعاد فاتورة بعد استلام المركبة..."
            className="min-h-24"
          />
        </div>
      </div>

      <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#BFEBDD] bg-[#E9FBF6] p-4">
        <Checkbox
          checked={financialReviewed}
          onCheckedChange={(checked) => setFinancialReviewed(checked === true)}
          className="mt-0.5"
        />
        <span>
          <span className="block font-black text-[#0D6B55]">راجعت جميع الفواتير والدفعات</span>
          <span className="mt-1 block text-xs font-normal leading-5 text-[#0D876A]">
            وأؤكد أن مبلغ المطالبة القانونية الظاهر أعلاه صحيح.
          </span>
        </span>
      </Label>
    </div>
  );

  const renderContractDocumentStep = () => (
    <div className="space-y-5">
      <div
        className={cn(
          'rounded-lg border p-5',
          readiness?.signed_contract_ready
            ? 'border-[#BFEBDD] bg-[#E9FBF6]'
            : 'border-[#F4C96B] bg-[#FFF8E7]',
        )}
      >
        <div className="flex items-start gap-3">
          {readiness?.signed_contract_ready ? (
            <FileCheck2 className="mt-0.5 h-6 w-6 text-[#0D876A]" />
          ) : (
            <AlertCircle className="mt-0.5 h-6 w-6 text-[#9A5A00]" />
          )}
          <div>
            <h3 className="font-black text-[#142033]">
              {readiness?.signed_contract_ready
                ? 'نسخة العقد الموقعة محفوظة'
                : 'مستند ناقص: نسخة العقد الموقعة'}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[#6A7688]">
              يجب حفظ نسخة واضحة وكاملة من العقد قبل نقله إلى الشؤون القانونية.
            </p>
          </div>
        </div>
      </div>

      <input
        ref={signedFileInputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={handleSignedFile}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          className="h-14 gap-2 bg-[#11A37F] text-white hover:bg-[#0D876A]"
          onClick={() => setScannerOpen(true)}
        >
          <Camera className="h-5 w-5" />
          تصوير العقد بالجوال
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-14 gap-2 border-[#B8C6D8]"
          onClick={() => signedFileInputRef.current?.click()}
        >
          <Upload className="h-5 w-5" />
          رفع PDF أو صور
        </Button>
      </div>
    </div>
  );

  const renderViolationsStep = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#DDE5EF] bg-white p-4">
          <p className="text-xs font-bold text-[#6A7688]">عدد المخالفات المرتبطة</p>
          <p className="mt-1 text-2xl font-black text-[#142033]">{violations.length}</p>
        </div>
        <div className="rounded-lg border border-[#DDE5EF] bg-white p-4">
          <p className="text-xs font-bold text-[#6A7688]">إجمالي مسؤولية المخالفات</p>
          <p className="mt-1 text-2xl font-black text-[#B42318]">{formatCurrency(violationTotal)}</p>
        </div>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-y-auto">
        {violations.length === 0 ? (
          <div className="rounded-lg border border-[#BFEBDD] bg-[#E9FBF6] p-6 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-[#0D876A]" />
            <p className="mt-3 font-black text-[#0D6B55]">لا توجد مخالفات مرتبطة بالعقد</p>
          </div>
        ) : (
          violations.map((violation) => (
            <div
              key={violation.id}
              className="grid gap-2 rounded-lg border border-[#E5EAF1] bg-white p-4 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-black text-[#142033]">مخالفة {violation.violation_number}</p>
                <p className="mt-1 text-xs text-[#6A7688]">
                  {violation.violation_date} · {violation.violation_type} ·{' '}
                  {violation.responsibility_party || 'المسؤولية غير محددة'}
                </p>
                {violation.description && (
                  <p className="mt-2 text-sm text-[#475569]">{violation.description}</p>
                )}
              </div>
              <p className="font-black text-[#B42318]">
                {formatCurrency(
                  Number(
                    violation.liability_amount
                    || violation.total_amount
                    || violation.fine_amount
                    || 0,
                  ),
                )}
              </p>
            </div>
          ))
        )}
      </div>

      <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#BFEBDD] bg-[#E9FBF6] p-4">
        <Checkbox
          checked={violationsReviewed}
          onCheckedChange={(checked) => setViolationsReviewed(checked === true)}
          className="mt-0.5"
        />
        <span>
          <span className="block font-black text-[#0D6B55]">راجعت المخالفات ومسؤوليتها</span>
          <span className="mt-1 block text-xs font-normal leading-5 text-[#0D876A]">
            وأؤكد أن المخالفات الظاهرة مرتبطة بالعقد قبل التحويل.
          </span>
        </span>
      </Label>
    </div>
  );

  const renderViolationProofStep = () => (
    <div className="space-y-5">
      {violations.length === 0 ? (
        <div className="rounded-lg border border-[#BFEBDD] bg-[#E9FBF6] p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#0D876A]" />
          <h3 className="mt-3 font-black text-[#0D6B55]">لا يلزم إرفاق ملف مرور</h3>
          <p className="mt-2 text-sm text-[#0D876A]">لا توجد مخالفات مرورية مرتبطة بهذا العقد.</p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'rounded-lg border p-5',
              readiness?.violation_proof_ready
                ? 'border-[#BFEBDD] bg-[#E9FBF6]'
                : 'border-[#F4C96B] bg-[#FFF8E7]',
            )}
          >
            <div className="flex items-start gap-3">
              {readiness?.violation_proof_ready ? (
                <FileCheck2 className="mt-0.5 h-6 w-6 text-[#0D876A]" />
              ) : (
                <AlertCircle className="mt-0.5 h-6 w-6 text-[#9A5A00]" />
              )}
              <div>
                <h3 className="font-black text-[#142033]">
                  {readiness?.violation_proof_ready
                    ? 'إثبات المخالفات محفوظ'
                    : 'مستند ناقص: كشف وزارة الداخلية أو مطراش'}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#6A7688]">
                  ارفع صورة من مطراش أو ملف PDF رسمي يثبت المخالفات المرورية.
                </p>
              </div>
            </div>
          </div>

          <input
            ref={violationProofInputRef}
            type="file"
            accept="application/pdf,image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleViolationProof}
          />
          <Button
            type="button"
            className="h-14 w-full gap-2 bg-[#1D4F7A] text-white hover:bg-[#173A63]"
            onClick={() => violationProofInputRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
            تصوير أو رفع إثبات المخالفات
          </Button>
        </>
      )}
    </div>
  );

  const renderFinalStep = () => (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ['المراجعة المالية', financialReviewed],
          ['نسخة العقد الموقعة', readiness?.signed_contract_ready],
          ['مراجعة المخالفات', violationsReviewed],
          [
            'إثبات المرور',
            violations.length === 0 || readiness?.violation_proof_ready,
          ],
        ].map(([label, complete]) => (
          <div
            key={String(label)}
            className={cn(
              'flex items-center gap-2 rounded-lg border p-3 text-sm font-bold',
              complete
                ? 'border-[#BFEBDD] bg-[#E9FBF6] text-[#0D6B55]'
                : 'border-[#F4C96B] bg-[#FFF8E7] text-[#9A5A00]',
            )}
          >
            {complete ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {label}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-4">
        <p className="text-xs font-bold text-[#6A7688]">قيمة المطالبة القانونية المعتمدة</p>
        <p className="mt-1 text-2xl font-black text-[#142033]">
          {formatCurrency(Number(claimAmount || 0))}
        </p>
        {violations.length > 0 && (
          <p className="mt-2 text-xs leading-5 text-[#6A7688]">
            المخالفات بقيمة {formatCurrency(violationTotal)} محفوظة مع إثباتها وتُعرض في الملف
            القانوني وفق مسؤوليتها.
          </p>
        )}
      </div>

      {contract?.vehicle_id && (
        <div className="space-y-3">
          <div>
            <Label className="font-black">حالة المركبة الفعلية عند التحويل</Label>
            <p className="mt-1 text-xs leading-5 text-[#6A7688]">
              التحويل القانوني وحده لا يعني أن المركبة عادت إلى الشركة.
            </p>
          </div>
          <RadioGroup
            value={vehicleDisposition}
            onValueChange={(value) => setVehicleDisposition(value as VehicleDisposition)}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Label className="flex cursor-pointer gap-3 rounded-lg border border-[#F4C96B] bg-[#FFF8E7] p-4">
              <RadioGroupItem value="keep_with_customer" />
              <span>
                <span className="block font-black">ما زالت لدى العميل</span>
                <span className="mt-1 block text-xs font-normal">تبقى غير متاحة للتأجير.</span>
              </span>
            </Label>
            <Label className="flex cursor-pointer gap-3 rounded-lg border border-[#BFEBDD] bg-[#E9FBF6] p-4">
              <RadioGroupItem value="returned" />
              <span>
                <span className="block font-black">تم استلام المركبة</span>
                <span className="mt-1 block text-xs font-normal">يعاد احتساب توفرها تشغيليًا.</span>
              </span>
            </Label>
          </RadioGroup>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>نوع القضية</Label>
          <Select value={caseType} onValueChange={(value) => setCaseType(value as CaseType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="payment_collection">تحصيل مستحقات</SelectItem>
              <SelectItem value="contract_breach">خرق عقد</SelectItem>
              <SelectItem value="vehicle_damage">أضرار مركبة</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>الأولوية</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">منخفضة</SelectItem>
              <SelectItem value="medium">متوسطة</SelectItem>
              <SelectItem value="high">عالية</SelectItem>
              <SelectItem value="urgent">عاجلة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="legal-transfer-notes">ملاحظات الإحالة القانونية</Label>
        <Textarea
          id="legal-transfer-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="اكتب ملخص محاولات التواصل وأي معلومات مهمة للشؤون القانونية..."
          className="min-h-24"
        />
      </div>

      <Alert className="border-[#F4C96B] bg-[#FFF8E7]">
        <AlertCircle className="h-4 w-4 text-[#9A5A00]" />
        <AlertDescription className="leading-6 text-[#7A4900]">
          بعد التأكيد ستتغير حالة العقد إلى «تحت الإجراء القانوني»، وستنشأ قضية ويظهر
          العقد في قسم «المحول قانونيًا» بصفحة المتأخرات.
        </AlertDescription>
      </Alert>
    </div>
  );

  const content = [
    renderFinancialStep,
    renderContractDocumentStep,
    renderViolationsStep,
    renderViolationProofStep,
    renderFinalStep,
  ];

  if (!contract) return null;

  const isBusy =
    createDocument.isPending
    || convertMutation.isPending
    || isCorrectingInvoice;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      <Dialog open={open} onOpenChange={resetAndClose}>
        <DialogContent
          dir="rtl"
          className="flex max-h-[95svh] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden rounded-lg p-0"
        >
          <DialogHeader className="border-b border-[#E5EAF1] px-5 py-4 text-right">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#142033]">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF5FB] text-[#1D4F7A]">
                <Scale className="h-5 w-5" />
              </span>
              تجهيز العقد للتحويل إلى الشؤون القانونية
            </DialogTitle>
            <DialogDescription className="text-right leading-6">
              العقد {contract.contract_number} · لا يتم التحويل حتى تكتمل البيانات المالية
              والمستندات والمخالفات.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b border-[#E5EAF1] bg-[#F8FAFC] px-4 py-3 sm:px-5">
            <div className="hidden grid-cols-5 gap-2 sm:grid">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const complete = index < step;
                const active = index === step;
                return (
                  <button
                    key={item.title}
                    type="button"
                    disabled={index > step}
                    onClick={() => index <= step && setStep(index)}
                    className={cn(
                      'flex min-h-14 items-center gap-2 rounded-lg border px-3 text-right text-xs font-black transition-colors',
                      active && 'border-[#1D4F7A] bg-[#1D4F7A] text-white',
                      complete && 'border-[#BFEBDD] bg-[#E9FBF6] text-[#0D6B55]',
                      !active && !complete && 'border-[#DDE5EF] bg-white text-[#6A7688]',
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/80 text-[#173A63]">
                      {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    {item.title}
                  </button>
                );
              })}
            </div>
            <div className="sm:hidden">
              <div className="mb-2 flex items-center justify-between text-xs font-black text-[#173A63]">
                <span>{steps[step].title}</span>
                <span>{step + 1} / {steps.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-5 sm:px-6">
            {readinessQuery.isLoading ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center">
                <Loader2 className="h-9 w-9 animate-spin text-[#1D4F7A]" />
                <p className="mt-3 text-sm font-bold text-[#6A7688]">جاري فحص جاهزية العقد...</p>
              </div>
            ) : readinessQuery.isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {readinessQuery.error instanceof Error
                    ? readinessQuery.error.message
                    : 'تعذر تحميل بيانات الجاهزية'}
                </AlertDescription>
              </Alert>
            ) : hasActiveCase ? (
              <Alert className="border-[#BFD7EA] bg-[#EEF6FC]">
                <ShieldCheck className="h-4 w-4 text-[#1D4F7A]" />
                <AlertDescription className="text-[#173A63]">
                  توجد قضية قانونية مفتوحة لهذا العقد برقم {existingCase?.case_number}. لا يمكن
                  إنشاء إحالة مكررة.
                </AlertDescription>
              </Alert>
            ) : (
              content[step]()
            )}
          </div>

          <Separator />
          <DialogFooter className="flex-row items-center justify-between gap-2 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => (step === 0 ? onOpenChange(false) : setStep((current) => current - 1))}
              disabled={isBusy}
              className="gap-2"
            >
              <ChevronRight className="h-4 w-4" />
              {step === 0 ? 'إلغاء' : 'السابق'}
            </Button>

            {step < steps.length - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((current) => current + 1)}
                disabled={!canContinue() || isBusy || hasActiveCase}
                className="gap-2 bg-[#1D4F7A] text-white hover:bg-[#173A63]"
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={completeTransfer}
                disabled={!canContinue() || isBusy || hasActiveCase}
                className="gap-2 bg-[#11A37F] text-white hover:bg-[#0D876A]"
              >
                {convertMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gavel className="h-4 w-4" />
                )}
                اعتماد وتحويل للقانونية
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignedContractScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onSubmit={handleScannedContract}
        isSubmitting={createDocument.isPending}
      />

      <Dialog
        open={Boolean(editingInvoice)}
        onOpenChange={(nextOpen) => !isCorrectingInvoice && !nextOpen && setEditingInvoice(null)}
      >
        <DialogContent dir="rtl" className="max-w-md text-right">
          <DialogHeader>
            <DialogTitle>تصحيح مبلغ الفاتورة</DialogTitle>
            <DialogDescription className="text-right">
              {editingInvoice?.invoice_number} · يسجل النظام القيمة السابقة والجديدة واسم الموظف.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="corrected-invoice-amount">المبلغ الصحيح</Label>
              <Input
                id="corrected-invoice-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={editedInvoiceAmount}
                onChange={(event) => setEditedInvoiceAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-correction-reason">سبب التصحيح</Label>
              <Textarea
                id="invoice-correction-reason"
                value={invoiceEditReason}
                onChange={(event) => setInvoiceEditReason(event.target.value)}
                placeholder="اشرح سبب اختلاف مبلغ الفاتورة..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingInvoice(null)}
              disabled={isCorrectingInvoice}
            >
              إلغاء
            </Button>
            <Button
              onClick={saveInvoiceCorrection}
              disabled={isCorrectingInvoice}
              className="bg-[#11A37F] text-white hover:bg-[#0D876A]"
            >
              {isCorrectingInvoice && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ التصحيح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LegalTransferReadinessWizard;
