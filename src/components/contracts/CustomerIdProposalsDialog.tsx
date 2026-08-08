import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScanLine, CheckCircle2, XCircle, Sparkles, BookOpen, Brain, AlertTriangle, PencilLine } from 'lucide-react';
import {
  useCustomerIdProposals,
  useRespondToIdProposal,
  type CustomerIdProposal,
  type ProposedFieldChange,
} from '@/hooks/useCustomerIdProposals';

interface CustomerIdProposalsDialogProps {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'الاسم الأول (إنجليزي)',
  last_name: 'اسم العائلة (إنجليزي)',
  first_name_ar: 'الاسم الأول (عربي)',
  last_name_ar: 'اسم العائلة (عربي)',
  national_id: 'الرقم الشخصي',
  national_id_expiry: 'تاريخ انتهاء البطاقة',
  nationality: 'الجنسية',
  date_of_birth: 'تاريخ الميلاد',
  monthly_amount: 'الإيجار الشهري (العقد)',
};

const METHOD_META: Record<ProposedFieldChange['method'], { label: string; icon: React.ReactNode }> = {
  ocr: { label: 'OCR', icon: <ScanLine className="h-3 w-3" /> },
  normalized: { label: 'تطبيع', icon: <BookOpen className="h-3 w-3" /> },
  dictionary: { label: 'قاموس الأسماء', icon: <BookOpen className="h-3 w-3" /> },
  llm: { label: 'ذكاء اصطناعي', icon: <Brain className="h-3 w-3" /> },
  manual: { label: 'تعديل يدوي', icon: <PencilLine className="h-3 w-3" /> },
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  if (confidence >= 0.9) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">ثقة عالية {percent}%</Badge>;
  }
  if (confidence >= 0.7) {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">ثقة متوسطة {percent}%</Badge>;
  }
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">ثقة منخفضة {percent}%</Badge>;
}

function ProposalCard({
  proposal,
  onApply,
  onReject,
  isSubmitting,
}: {
  proposal: CustomerIdProposal;
  onApply: (acceptedFields: string[]) => void;
  onReject: () => void;
  isSubmitting: boolean;
}) {
  // Pre-select high-confidence fields
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(proposal.proposed_changes.filter((c) => c.confidence >= 0.9).map((c) => c.field)),
  );

  const toggle = (field: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-[#DDE5EF] bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#0D876A]" />
          <span className="font-bold text-sm text-[#142033]">
            مقترح من بطاقة الهوية
            {proposal.page_number ? ` — الصفحة ${proposal.page_number}` : ''}
          </span>
        </div>
        {proposal.overall_confidence != null && (
          <ConfidenceBadge confidence={proposal.overall_confidence} />
        )}
      </div>

      <div className="space-y-2">
        {proposal.proposed_changes.map((change) => {
          const isLowConfidence = change.confidence < 0.9;
          return (
            <label
              key={change.field}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-100 bg-[#FAFBFC] p-3 transition-colors hover:border-[#9FDCCB]"
            >
              <Checkbox
                checked={selected.has(change.field)}
                onCheckedChange={() => toggle(change.field)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#142033]">
                    {FIELD_LABELS[change.field] || change.field}
                  </span>
                  <ConfidenceBadge confidence={change.confidence} />
                  <Badge variant="outline" className="gap-1 text-xs">
                    {METHOD_META[change.method]?.icon}
                    {METHOD_META[change.method]?.label || change.method}
                  </Badge>
                  {isLowConfidence && (
                    <span className="flex items-center gap-1 text-xs text-yellow-700">
                      <AlertTriangle className="h-3 w-3" />
                      يحتاج مراجعة
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-red-50 px-2 py-1">
                    <span className="block text-xs text-red-500">القيمة الحالية</span>
                    <span className="text-red-800">{change.current_value || '— فارغ —'}</span>
                  </div>
                  <div className="rounded-md bg-green-50 px-2 py-1">
                    <span className="block text-xs text-green-600">القيمة من البطاقة</span>
                    <span className="font-semibold text-green-900">{change.proposed_value}</span>
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onReject} disabled={isSubmitting} className="gap-1">
          <XCircle className="h-4 w-4" />
          رفض الكل
        </Button>
        <Button
          size="sm"
          onClick={() => onApply(Array.from(selected))}
          disabled={isSubmitting || selected.size === 0}
          className="gap-1 bg-[#0D876A] hover:bg-[#0D876A]/90"
        >
          <CheckCircle2 className="h-4 w-4" />
          تطبيق المحدد ({selected.size})
        </Button>
      </div>
    </div>
  );
}

export function CustomerIdProposalsDialog({
  contractId,
  open,
  onOpenChange,
}: CustomerIdProposalsDialogProps) {
  const { data: proposals = [], isLoading } = useCustomerIdProposals(contractId);
  const respond = useRespondToIdProposal();

  const handleApply = (proposal: CustomerIdProposal) => (acceptedFields: string[]) => {
    respond.mutate({ proposal, acceptedFields });
  };

  const handleReject = (proposal: CustomerIdProposal) => () => {
    respond.mutate({ proposal, acceptedFields: null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-[#0D876A]" />
            مقترحات تحديث بيانات العميل
          </DialogTitle>
          <DialogDescription>
            تم استخراج هذه البيانات من صورة البطاقة الشخصية المرفقة بالعقد.
            راجع كل حقل قبل التطبيق — لن يتم تحديث أي بيانات دون موافقتك.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pl-4">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-neutral-500">جاري التحميل...</div>
          ) : proposals.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">
              لا توجد مقترحات معلقة لهذا العقد
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onApply={handleApply(proposal)}
                  onReject={handleReject(proposal)}
                  isSubmitting={respond.isPending}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
