import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  Send,
  WalletCards,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  FinancialIssueType,
  financialIssueLabels,
  useCreateContractFinancialReview,
  useResubmitContractFinancialReview,
  useVerificationFinancialReview,
} from '@/hooks/useContractFinancialReviews';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface VerificationFinancialReviewCardProps {
  verificationTaskId: string;
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  invoices: Array<{
    id: string;
    invoice_number?: string | null;
    total_amount?: number | null;
    paid_amount?: number | null;
  }>;
  disabled?: boolean;
}

export function VerificationFinancialReviewCard({
  verificationTaskId,
  contractId,
  contractNumber,
  customerId,
  customerName,
  invoices,
  disabled,
}: VerificationFinancialReviewCardProps) {
  const { data: openReview, isLoading } = useVerificationFinancialReview(verificationTaskId);
  const createReview = useCreateContractFinancialReview();
  const resubmitReview = useResubmitContractFinancialReview();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [issueType, setIssueType] = React.useState<FinancialIssueType>('balance_mismatch');
  const [invoiceId, setInvoiceId] = React.useState('none');
  const [reportedAmount, setReportedAmount] = React.useState('');
  const [details, setDetails] = React.useState('');

  const needsMoreInformation =
    openReview?.status === 'on_hold' &&
    openReview.metadata.managerResolution === 'needs_more_information';
  const isBlocked = Boolean(openReview);

  const resetForm = () => {
    setIssueType('balance_mismatch');
    setInvoiceId('none');
    setReportedAmount('');
    setDetails('');
  };

  const submit = async () => {
    if (!details.trim()) {
      toast.error('اشرح المشكلة أو أضف المعلومات المطلوبة');
      return;
    }

    try {
      if (needsMoreInformation && openReview) {
        await resubmitReview.mutateAsync({ task: openReview, details });
        toast.success('تم إرسال المعلومات الإضافية للمدير');
      } else {
        const invoice = invoices.find((item) => item.id === invoiceId);
        await createReview.mutateAsync({
          verificationTaskId,
          contractId,
          contractNumber,
          customerId,
          customerName,
          issueType,
          details,
          relatedInvoiceId: invoice?.id,
          relatedInvoiceNumber: invoice?.invoice_number || undefined,
          reportedAmount: reportedAmount ? Number(reportedAmount) : undefined,
        });
        toast.success('تم رفع المشكلة المالية إلى المدير وإيقاف الاعتماد مؤقتًا');
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إرسال المراجعة المالية');
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 flex min-h-[90px] items-center justify-center rounded-lg border bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-[#38BDF8]" />
      </div>
    );
  }

  return (
    <>
      <section
        className={`mb-6 rounded-lg border p-4 ${
          isBlocked ? 'border-[#FDE68A] bg-[#FFFBEB]' : 'border-[#DDE5EF] bg-white'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isBlocked ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#E9FBF6] text-[#0D876A]'
              }`}
            >
              {needsMoreInformation ? (
                <RotateCcw className="h-5 w-5" />
              ) : isBlocked ? (
                <Clock3 className="h-5 w-5" />
              ) : (
                <WalletCards className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-[#142033]">سلامة البيانات المالية</h3>
                {isBlocked && (
                  <Badge className="rounded-md bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]">
                    {needsMoreInformation ? 'مطلوب استكمال' : 'بانتظار المدير'}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-[#6A7688]">
                {isBlocked
                  ? `المشكلة: ${openReview?.metadata.issueLabel}`
                  : 'إذا وجدت دفعة أو فاتورة أو رصيدًا غير صحيح، ارفعها للمدير قبل اعتماد التحويل.'}
              </p>
              {openReview?.metadata.managerNotes && (
                <Alert className="mt-3 border-[#FDE68A] bg-white">
                  <AlertTriangle className="h-4 w-4 text-[#B45309]" />
                  <AlertDescription className="text-sm text-[#78350F]">
                    <strong>ملاحظة المدير:</strong> {openReview.metadata.managerNotes}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {(!isBlocked || needsMoreInformation) && !disabled && (
            <Button
              type="button"
              variant={needsMoreInformation ? 'default' : 'outline'}
              className={
                needsMoreInformation
                  ? 'h-10 gap-2 rounded-lg bg-[#11A37F] text-white hover:bg-[#0D876A]'
                  : 'h-10 gap-2 rounded-lg border-[#F8CBD0] text-[#BE123C] hover:bg-[#FFF1F2]'
              }
              onClick={() => setDialogOpen(true)}
            >
              {needsMoreInformation ? <Send className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {needsMoreInformation ? 'استكمال المعلومات' : 'إبلاغ عن مشكلة مالية'}
            </Button>
          )}
        </div>

        {isBlocked && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#92400E]">
            <Clock3 className="h-4 w-4" />
            اعتماد التدقيق والتحويل القانوني متوقف حتى يصدر قرار المدير.
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-[#11A37F]" />
              {needsMoreInformation ? 'استكمال معلومات المراجعة المالية' : 'رفع مشكلة مالية للمدير'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!needsMoreInformation && (
              <>
                <div className="space-y-2">
                  <Label>نوع المشكلة</Label>
                  <Select value={issueType} onValueChange={(value) => setIssueType(value as FinancialIssueType)}>
                    <SelectTrigger className="h-11 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(financialIssueLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الفاتورة المتأثرة إن وجدت</Label>
                  <Select value={invoiceId} onValueChange={setInvoiceId}>
                    <SelectTrigger className="h-11 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">المشكلة لا تخص فاتورة محددة</SelectItem>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number || 'فاتورة بلا رقم'} -{' '}
                          {formatCurrency(
                            Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>المبلغ الذي يحتاج مراجعة (اختياري)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={reportedAmount}
                    onChange={(event) => setReportedAmount(event.target.value)}
                    className="h-11 rounded-lg"
                    dir="ltr"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>{needsMoreInformation ? 'المعلومات المطلوبة' : 'اشرح المشكلة بدقة'}</Label>
              <Textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder={
                  needsMoreInformation
                    ? 'أضف الرد أو المستندات أو الأرقام التي طلبها المدير...'
                    : 'مثال: الدفعة رقم PAY-... مسجلة على فاتورة غير صحيحة، والمبلغ الصحيح هو...'
                }
                className="min-h-[120px] resize-none rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-[#11A37F] text-white hover:bg-[#0D876A]"
              disabled={createReview.isPending || resubmitReview.isPending || !details.trim()}
              onClick={submit}
            >
              {(createReview.isPending || resubmitReview.isPending) ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="ml-2 h-4 w-4" />
              )}
              إرسال للمدير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
