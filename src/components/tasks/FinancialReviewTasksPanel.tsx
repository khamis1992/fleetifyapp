import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Loader2,
  RotateCcw,
  Scale,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ContractFinancialReviewTask,
  FinancialReviewResolution,
  useFinancialReviewAccess,
  useManagerFinancialReviews,
  useResolveContractFinancialReview,
} from '@/hooks/useContractFinancialReviews';
import { toast } from 'sonner';

const decisions: Array<{
  id: FinancialReviewResolution;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: 'corrected',
    label: 'تم تصحيح المشكلة',
    description: 'أُصلحت البيانات المالية ويمكن للموظف إعادة التدقيق.',
    icon: CheckCircle2,
  },
  {
    id: 'approved_as_is',
    label: 'اعتماد البيانات كما هي',
    description: 'تم التحقق من الأرقام ولا يلزم إجراء مالي.',
    icon: FileSearch,
  },
  {
    id: 'needs_more_information',
    label: 'طلب معلومات إضافية',
    description: 'تعود المهمة للموظف ويظل التحويل القانوني متوقفًا.',
    icon: RotateCcw,
  },
  {
    id: 'legal_transfer_rejected',
    label: 'رفض التحويل القانوني',
    description: 'لا تسمح البيانات الحالية باستكمال التحويل.',
    icon: Scale,
  },
];

export function FinancialReviewTasksPanel() {
  const { canReviewFinancialIssues, isLoading: accessLoading } = useFinancialReviewAccess();
  const { data: reviews = [], isLoading } = useManagerFinancialReviews();

  if (accessLoading || isLoading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-[#38BDF8]" />
      </div>
    );
  }

  if (!canReviewFinancialIssues) {
    return (
      <Card className="rounded-lg border-[#F8CBD0] bg-[#FFF6F7]">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-[#BE123C]" />
          <div>
            <h3 className="font-bold text-[#881337]">المراجعات المالية متاحة للمدير</h3>
            <p className="mt-1 text-sm text-[#9F1239]">
              يستطيع الموظف رفع المشكلة، بينما يعتمد القرار مدير الشركة.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-[#DDE5EF] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-[#142033]">
              <WalletCards className="h-5 w-5 text-[#11A37F]" />
              المراجعات المالية للعقود
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#6A7688]">
              مشكلات رفعها الموظفون قبل اعتماد التدقيق أو تحويل العميل للشؤون القانونية.
            </p>
          </div>
          <Badge className="rounded-md bg-[#E9FBF6] text-[#0D876A] hover:bg-[#E9FBF6]">
            {reviews.length} مفتوحة
          </Badge>
        </div>
      </section>

      {reviews.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-white text-center">
          <CheckCircle2 className="h-9 w-9 text-[#22C7A1]" />
          <h3 className="mt-3 font-bold text-[#142033]">لا توجد مراجعات مالية مفتوحة</h3>
          <p className="mt-1 text-sm text-[#6A7688]">ستظهر هنا طلبات الموظفين فور رفعها.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reviews.map((review) => (
            <FinancialReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

function FinancialReviewCard({ review }: { review: ContractFinancialReviewTask }) {
  const navigate = useNavigate();
  const [selectedDecision, setSelectedDecision] = React.useState<FinancialReviewResolution | null>(null);
  const [notes, setNotes] = React.useState('');
  const resolveReview = useResolveContractFinancialReview();
  const reporterName = review.creator
    ? `${review.creator.first_name_ar || review.creator.first_name || ''} ${
        review.creator.last_name_ar || review.creator.last_name || ''
      }`.trim()
    : 'موظف';

  const submitDecision = async () => {
    if (!selectedDecision) {
      toast.error('اختر القرار المطلوب');
      return;
    }
    try {
      await resolveReview.mutateAsync({ task: review, resolution: selectedDecision, notes });
      toast.success('تم حفظ قرار المراجعة وإبلاغ الموظف');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ القرار');
    }
  };

  return (
    <Card className="rounded-lg border-[#DDE5EF] bg-white shadow-sm">
      <CardHeader className="border-b border-[#EEF2F6] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black text-[#142033]">
              العقد {review.metadata.contractNumber}
            </CardTitle>
            <p className="mt-1 text-sm text-[#6A7688]">{review.metadata.customerName}</p>
          </div>
          <Badge variant="outline" className="rounded-md border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]">
            بانتظار القرار
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Fact label="نوع المشكلة" value={review.metadata.issueLabel} />
          <Fact label="رفعها" value={reporterName} />
          {review.metadata.relatedInvoiceNumber && (
            <Fact label="الفاتورة" value={review.metadata.relatedInvoiceNumber} />
          )}
          <Fact
            label="تاريخ الطلب"
            value={format(new Date(review.created_at), 'dd MMM yyyy، HH:mm', { locale: ar })}
          />
        </div>

        <div className="rounded-lg border border-[#E5EAF1] bg-[#F8FAFC] p-3">
          <p className="text-xs font-bold text-[#6A7688]">شرح الموظف</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#334155]">
            {review.metadata.employeeDetails || review.description}
          </p>
        </div>

        <Button
          variant="outline"
          className="h-10 w-full gap-2 rounded-lg border-[#DDE5EF]"
          onClick={() => navigate(`/contracts/${review.metadata.contractNumber}`)}
        >
          <FileSearch className="h-4 w-4" />
          فتح العقد ومراجعة البيانات
        </Button>

        <div>
          <Label className="text-sm font-bold text-[#142033]">قرار المدير</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {decisions.map((decision) => {
              const Icon = decision.icon;
              const selected = selectedDecision === decision.id;
              return (
                <button
                  key={decision.id}
                  type="button"
                  onClick={() => setSelectedDecision(decision.id)}
                  className={`rounded-lg border p-3 text-right transition ${
                    selected
                      ? 'border-[#11A37F] bg-[#E9FBF6]'
                      : 'border-[#E5EAF1] bg-white hover:border-[#9FDCCB]'
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-[#0D876A]' : 'text-[#64748B]'}`} />
                    <span>
                      <span className="block text-sm font-bold text-[#142033]">{decision.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#6A7688]">{decision.description}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`financial-review-notes-${review.id}`}>نتيجة المراجعة والإجراء المتخذ</Label>
          <Textarea
            id={`financial-review-notes-${review.id}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="مثال: تمت مطابقة الدفعة بالفاتورة وتصحيح الرصيد..."
            className="min-h-[90px] resize-none rounded-lg"
          />
        </div>

        <Button
          className="h-11 w-full rounded-lg bg-[#11A37F] text-white hover:bg-[#0D876A]"
          disabled={resolveReview.isPending || !selectedDecision || !notes.trim()}
          onClick={submitDecision}
        >
          {resolveReview.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          حفظ القرار وإبلاغ الموظف
        </Button>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F6F8FB] px-3 py-2">
      <p className="text-xs font-semibold text-[#94A3B8]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#142033]">{value}</p>
    </div>
  );
}
