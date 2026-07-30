import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  IdCard,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  ScanLine,
  BookOpen,
  Brain,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  useAllPendingIdProposals,
  useRespondToIdProposal,
  useBulkApproveIdProposals,
  type CustomerIdProposal,
  type CustomerIdProposalWithContext,
  type ProposedFieldChange,
} from '@/hooks/useCustomerIdProposals';

const FIELD_LABELS: Record<string, string> = {
  first_name: 'الاسم الأول (إنجليزي)',
  last_name: 'اسم العائلة (إنجليزي)',
  first_name_ar: 'الاسم الأول (عربي)',
  last_name_ar: 'اسم العائلة (عربي)',
  national_id: 'الرقم الشخصي',
  national_id_expiry: 'تاريخ انتهاء البطاقة',
  nationality: 'الجنسية',
  date_of_birth: 'تاريخ الميلاد',
};

const METHOD_META: Record<ProposedFieldChange['method'], { label: string; icon: React.ReactNode }> = {
  ocr: { label: 'OCR', icon: <ScanLine className="h-3 w-3" /> },
  normalized: { label: 'تطبيع', icon: <BookOpen className="h-3 w-3" /> },
  dictionary: { label: 'قاموس', icon: <BookOpen className="h-3 w-3" /> },
  llm: { label: 'ذكاء اصطناعي', icon: <Brain className="h-3 w-3" /> },
};

const HIGH_CONFIDENCE_THRESHOLD = 0.9;

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{percent}%</Badge>;
  }
  if (confidence >= 0.7) {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{percent}%</Badge>;
  }
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{percent}%</Badge>;
}

function customerDisplayName(p: CustomerIdProposalWithContext): string {
  const c = p.customers;
  if (!c) return 'عميل غير معروف';
  const ar = `${c.first_name_ar || ''} ${c.last_name_ar || ''}`.trim();
  if (ar) return ar;
  const en = `${c.first_name || ''} ${c.last_name || ''}`.trim();
  return en || 'عميل غير معروف';
}

function FieldRow({
  change,
  checked,
  onToggle,
}: {
  change: ProposedFieldChange;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-100 bg-[#FAFBFC] p-3 transition-colors hover:border-[#9FDCCB]">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-1" />
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
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-red-50 px-2 py-1">
            <span className="block text-xs text-red-500">الحالي</span>
            <span className="text-red-800">{change.current_value || '— فارغ —'}</span>
          </div>
          <div className="rounded-md bg-green-50 px-2 py-1">
            <span className="block text-xs text-green-600">من البطاقة</span>
            <span className="font-semibold text-green-900">{change.proposed_value}</span>
          </div>
        </div>
      </div>
    </label>
  );
}

function ProposalRow({
  proposal,
  onApply,
  onReject,
  isSubmitting,
}: {
  proposal: CustomerIdProposalWithContext;
  onApply: (acceptedFields: string[]) => void;
  onReject: () => void;
  isSubmitting: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(
    () =>
      new Set(
        proposal.proposed_changes
          .filter((c) => c.confidence >= HIGH_CONFIDENCE_THRESHOLD)
          .map((c) => c.field),
      ),
  );

  const highConfCount = proposal.proposed_changes.filter(
    (c) => c.confidence >= HIGH_CONFIDENCE_THRESHOLD,
  ).length;

  const toggle = (field: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-[#DDE5EF] bg-white shadow-sm">
      {/* Summary row */}
      <div
        className="flex cursor-pointer flex-wrap items-center gap-3 p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E9FBF6] text-[#0D876A]">
          <IdCard className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#142033]">{customerDisplayName(proposal)}</span>
            {proposal.overall_confidence != null && (
              <ConfidenceBadge confidence={proposal.overall_confidence} />
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            {proposal.contracts?.contract_number && (
              <Link
                to={`/contracts/${proposal.contracts.contract_number}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[#173A63] hover:underline"
              >
                عقد {proposal.contracts.contract_number}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            <span>
              {proposal.proposed_changes.length} حقل مقترح
              {proposal.page_number ? ` — بطاقة بالصفحة ${proposal.page_number}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {highConfCount > 0 && (
            <Badge className="gap-1 bg-[#0D876A] text-white hover:bg-[#0D876A]">
              <Zap className="h-3 w-3" />
              {highConfCount} عالي الثقة
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          )}
        </div>
      </div>

      {/* Expanded field diff */}
      {expanded && (
        <div className="space-y-3 border-t border-neutral-100 p-4">
          {proposal.proposed_changes.map((change) => (
            <FieldRow
              key={change.field}
              change={change}
              checked={selected.has(change.field)}
              onToggle={() => toggle(change.field)}
            />
          ))}
          <div className="flex justify-end gap-2 pt-1">
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
      )}
    </div>
  );
}

export function CustomerDataReviewCenter() {
  const { data: proposals = [], isLoading, refetch, isFetching } = useAllPendingIdProposals();
  const respond = useRespondToIdProposal();
  const bulkApprove = useBulkApproveIdProposals();
  const [confirmBulkOpen, setConfirmBulkOpen] = React.useState(false);

  const bulkStats = React.useMemo(() => {
    let fields = 0;
    let affectedProposals = 0;
    for (const p of proposals) {
      const high = p.proposed_changes.filter((c) => c.confidence >= HIGH_CONFIDENCE_THRESHOLD);
      if (high.length > 0) {
        fields += high.length;
        affectedProposals++;
      }
    }
    return { fields, affectedProposals };
  }, [proposals]);

  const handleApply = (proposal: CustomerIdProposal) => (acceptedFields: string[]) => {
    respond.mutate({ proposal, acceptedFields });
  };

  const handleReject = (proposal: CustomerIdProposal) => () => {
    respond.mutate({ proposal, acceptedFields: null });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E9FBF6] text-[#0D876A]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#142033]">مراجعة بيانات العملاء</h2>
              <p className="text-sm text-neutral-500">
                مقترحات مستخرجة من البطاقات الشخصية المرفقة بالعقود — {proposals.length} مقترح معلّق
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              تحديث
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmBulkOpen(true)}
              disabled={bulkStats.fields === 0 || bulkApprove.isPending}
              className="gap-2 bg-[#0D876A] hover:bg-[#0D876A]/90"
            >
              <Zap className="h-4 w-4" />
              اعتماد عالية الثقة ({bulkStats.fields} حقل)
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-[#173A63]" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#C8D4E2] bg-[#FAFBFC] py-16 text-center">
          <IdCard className="mx-auto mb-3 h-10 w-10 text-[#7A8698]" />
          <p className="font-semibold text-[#142033]">لا توجد مقترحات معلّقة</p>
          <p className="mt-1 text-sm text-neutral-500">
            عند مسح بطاقات جديدة من العقود ستظهر المقترحات هنا
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <ProposalRow
              key={proposal.id}
              proposal={proposal}
              onApply={handleApply(proposal)}
              onReject={handleReject(proposal)}
              isSubmitting={respond.isPending || bulkApprove.isPending}
            />
          ))}
        </div>
      )}

      {/* Bulk approve confirmation */}
      <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>اعتماد جماعي للحقول عالية الثقة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم تطبيق {bulkStats.fields} حقل (بثقة 90% فأعلى) من {bulkStats.affectedProposals}{' '}
              مقترح على بيانات العملاء مباشرة. الحقول الأقل ثقة ستبقى معلّقة للمراجعة اليدوية.
              هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkApprove.mutate(
                  { proposals, threshold: HIGH_CONFIDENCE_THRESHOLD },
                  { onSettled: () => setConfirmBulkOpen(false) },
                );
              }}
              className="bg-[#0D876A] hover:bg-[#0D876A]/90"
            >
              اعتماد الكل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
