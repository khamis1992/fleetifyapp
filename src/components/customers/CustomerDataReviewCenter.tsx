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
  RotateCw,
  ZoomIn,
  ZoomOut,
  PencilLine,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  useAllPendingIdProposals,
  useRespondToIdProposal,
  useBulkApproveIdProposals,
  useScanAllPendingContractDocumentsForId,
  useBackfillProposalEvidence,
  useAiReviewProposals,
  type CustomerIdProposal,
  type CustomerIdProposalWithContext,
  type ProposedFieldChange,
} from '@/hooks/useCustomerIdProposals';
import { supabase } from '@/integrations/supabase/client';

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
  dictionary: { label: 'قاموس', icon: <BookOpen className="h-3 w-3" /> },
  llm: { label: 'ذكاء اصطناعي', icon: <Brain className="h-3 w-3" /> },
  manual: { label: 'تعديل يدوي', icon: <PencilLine className="h-3 w-3" /> },
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

interface AiReview {
  verdict: 'correct' | 'incorrect' | 'uncertain';
  confidence: number;
  reasoning: string;
  model?: string;
  reviewed_at?: string;
  label?: string;
  conflict?: boolean;
  auto_approved?: boolean;
  used_vision?: boolean;
}

function getAiReview(proposal: CustomerIdProposalWithContext): AiReview | null {
  const review = (proposal.extracted_data as Record<string, unknown> | null)?.ai_review;
  if (!review || typeof review !== 'object') return null;
  const value = review as Record<string, unknown>;
  if (!['correct', 'incorrect', 'uncertain'].includes(String(value.verdict))) return null;
  return value as unknown as AiReview;
}

function AiReviewBadge({ review }: { review: AiReview }) {
  if (review.conflict) {
    return (
      <Badge className="gap-1 border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-50">
        <Brain className="h-3 w-3" />
        تعارض بين المستندات — يحتاج حسمًا
      </Badge>
    );
  }
  if (review.verdict === 'correct') {
    return (
      <Badge className="gap-1 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
        <Brain className="h-3 w-3" />
        {review.used_vision ? 'تم التدقيق بالصورة — جاهز للاعتماد' : 'تم التدقيق — مقترح جاهز للاعتماد'}
      </Badge>
    );
  }
  if (review.verdict === 'incorrect') {
    return (
      <Badge className="gap-1 border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-50">
        <Brain className="h-3 w-3" />
        الوكيل يرى المقترح غير صحيح
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-50">
      <Brain className="h-3 w-3" />
      الوكيل غير متأكد
    </Badge>
  );
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
  value,
  onValueChange,
}: {
  change: ProposedFieldChange;
  checked: boolean;
  onToggle: () => void;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const wasEdited = value.trim() !== change.proposed_value.trim();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-neutral-100 bg-[#FAFBFC] p-3 transition-colors hover:border-[#9FDCCB]">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-1"
        aria-label={`اعتماد ${FIELD_LABELS[change.field] || change.field}`}
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
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-red-50 px-2 py-1">
            <span className="block text-xs text-red-500">الحالي</span>
            <span className="text-red-800">{change.current_value || '— فارغ —'}</span>
          </div>
          <div className="rounded-md bg-green-50 px-2 py-1.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="block text-xs text-green-700">
                {wasEdited ? 'القيمة اليدوية المعتمدة' : 'من البطاقة - قابل للتعديل'}
              </span>
              {wasEdited && (
                <button
                  type="button"
                  className="text-xs font-semibold text-[#173A63] hover:underline"
                  onClick={() => onValueChange(change.proposed_value)}
                >
                  استعادة قراءة البطاقة
                </button>
              )}
            </div>
            <Input
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              className="h-9 border-green-200 bg-white font-semibold text-green-950"
              aria-label={`تعديل ${FIELD_LABELS[change.field] || change.field}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidencePreview({ proposal }: { proposal: CustomerIdProposalWithContext }) {
  const imagePath = proposal.evidence_image_path;
  const bucket = proposal.evidence_image_bucket || 'contract-documents';
  const [croppedUrl, setCroppedUrl] = React.useState<string | null>(null);
  const [manualRotation, setManualRotation] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const imageUrl = React.useMemo(() => {
    if (!imagePath) return null;
    return supabase.storage.from(bucket).getPublicUrl(imagePath).data.publicUrl;
  }, [bucket, imagePath]);

  React.useEffect(() => {
    setCroppedUrl(null);
    setManualRotation(0);
    setZoom(1);
    if (!imageUrl || !proposal.evidence_crop) return;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const crop = proposal.evidence_crop!;
        const source = document.createElement('canvas');
        source.width = Math.max(1, Math.round(crop.width));
        source.height = Math.max(1, Math.round(crop.height));
        const sourceContext = source.getContext('2d');
        if (!sourceContext) return;
        sourceContext.drawImage(
          image,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          source.width,
          source.height,
        );

        const rotation = crop.rotation || 0;
        const canvas = document.createElement('canvas');
        const swapDimensions = rotation === 90 || rotation === 270;
        canvas.width = swapDimensions ? source.height : source.width;
        canvas.height = swapDimensions ? source.width : source.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (rotation === 90) {
          ctx.translate(canvas.width, 0);
          ctx.rotate(Math.PI / 2);
        } else if (rotation === 180) {
          ctx.translate(canvas.width, canvas.height);
          ctx.rotate(Math.PI);
        } else if (rotation === 270) {
          ctx.translate(0, canvas.height);
          ctx.rotate(-Math.PI / 2);
        }
        ctx.drawImage(source, 0, 0);
        setCroppedUrl(canvas.toDataURL('image/png'));
      } catch (error) {
        console.warn('Failed to crop evidence image:', error);
      }
    };
    image.src = imageUrl;
  }, [imageUrl, proposal.evidence_crop]);

  if (!imageUrl) {
    return (
      <div className="rounded-lg border border-dashed border-[#DDE5EF] bg-[#FAFBFC] p-4 text-sm text-[#64748B]">
        لا توجد قصاصة محفوظة لهذا المقترح. أعد مسح العقد من زر المسح الجماعي لتوليد دليل بصري عند توفره.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[#64748B]">
        <span>{proposal.evidence_crop ? 'صورة الاسم من المستند' : 'صفحة الاسم من المستند'}</span>
        {proposal.evidence_label && <Badge variant="outline">{proposal.evidence_label}</Badge>}
      </div>
      <div className="mb-2 flex items-center gap-1" dir="ltr">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title="تدوير الصورة"
          onClick={() => setManualRotation((value) => (value + 90) % 360)}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title="تكبير الصورة"
          onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title="تصغير الصورة"
          onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex max-h-[32rem] min-h-56 items-center justify-center overflow-auto rounded-md border bg-white p-2">
        <img
          src={croppedUrl || imageUrl}
          alt="قصاصة الاسم من المستند"
          className="max-w-full origin-center object-contain transition-transform"
          style={{ transform: `rotate(${manualRotation}deg) scale(${zoom})` }}
        />
      </div>
      {proposal.evidence_crop && (
        <p className="mt-2 text-xs text-[#64748B]">
          تم حفظ إحداثيات موضع الاسم للمراجعة البصرية. في حال لم تظهر القصاصة بدقة، افتح المستند الأصلي من رابط العقد.
        </p>
      )}
    </div>
  );
}

function ProposalRow({
  proposal,
  onApply,
  onReject,
  isSubmitting,
}: {
  proposal: CustomerIdProposalWithContext;
  onApply: (acceptedFields: string[], manualValues: Record<string, string>) => void;
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
  const [editedValues, setEditedValues] = React.useState<Record<string, string>>(
    () => Object.fromEntries(
      proposal.proposed_changes.map((change) => [change.field, change.proposed_value]),
    ),
  );

  const highConfCount = proposal.proposed_changes.filter(
    (c) => c.confidence >= HIGH_CONFIDENCE_THRESHOLD,
  ).length;
  const hasEvidence = Boolean(proposal.evidence_image_path);
  const aiReview = getAiReview(proposal);

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
            {aiReview && <AiReviewBadge review={aiReview} />}
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
          <EvidencePreview proposal={proposal} />
          {aiReview?.reasoning && (
            <div className="rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 text-sm leading-6 text-[#3730A3]">
              <span className="font-bold">رأي الوكيل الذكي: </span>
              {aiReview.reasoning}
            </div>
          )}
          {!hasEvidence && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              يجب تجهيز صورة الاسم من المستند قبل اعتماد أي تعديل.
            </div>
          )}
          {proposal.proposed_changes.map((change) => (
            <FieldRow
              key={change.field}
              change={change}
              checked={selected.has(change.field)}
              onToggle={() => toggle(change.field)}
              value={editedValues[change.field] ?? change.proposed_value}
              onValueChange={(value) => {
                setEditedValues((current) => ({ ...current, [change.field]: value }));
                setSelected((current) => new Set(current).add(change.field));
              }}
            />
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onReject} disabled={isSubmitting} className="gap-1">
              <XCircle className="h-4 w-4" />
              رفض الكل
            </Button>
            <Button
              size="sm"
              onClick={() => onApply(Array.from(selected), editedValues)}
              disabled={
                isSubmitting
                || selected.size === 0
                || !hasEvidence
                || Array.from(selected).some((field) => !editedValues[field]?.trim())
              }
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
  const {
    data: proposals = [],
    error: proposalsError,
    isError: hasProposalsError,
    isLoading,
    refetch,
    isFetching,
  } = useAllPendingIdProposals();
  const respond = useRespondToIdProposal();
  const bulkApprove = useBulkApproveIdProposals();
  const scanAll = useScanAllPendingContractDocumentsForId();
  const backfillEvidence = useBackfillProposalEvidence();
  const aiReview = useAiReviewProposals();
  const [confirmBulkOpen, setConfirmBulkOpen] = React.useState(false);
  const [confirmAiBulkOpen, setConfirmAiBulkOpen] = React.useState(false);

  const bulkStats = React.useMemo(() => {
    let fields = 0;
    let affectedProposals = 0;
    for (const p of proposals.filter((proposal) => proposal.evidence_image_path)) {
      const high = p.proposed_changes.filter((c) => c.confidence >= HIGH_CONFIDENCE_THRESHOLD);
      if (high.length > 0) {
        fields += high.length;
        affectedProposals++;
      }
    }
    return { fields, affectedProposals };
  }, [proposals]);
  const missingEvidenceCount = proposals.filter(
    (proposal) => !proposal.evidence_image_path,
  ).length;

  const aiReadyProposals = React.useMemo(
    () => proposals.filter((proposal) =>
      proposal.evidence_image_path && getAiReview(proposal)?.verdict === 'correct'),
    [proposals],
  );

  const handleApply = (proposal: CustomerIdProposal) => (
    acceptedFields: string[],
    manualValues: Record<string, string>,
  ) => {
    respond.mutate({ proposal, acceptedFields, manualValues });
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
            {missingEvidenceCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => backfillEvidence.mutate(proposals)}
                disabled={backfillEvidence.isPending}
                className="gap-2 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              >
                <ScanLine
                  className={backfillEvidence.isPending ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'}
                />
                {backfillEvidence.isPending
                  ? 'جارٍ تجهيز الصور...'
                  : `تجهيز صور المراجعة (${missingEvidenceCount})`}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => scanAll.mutate()}
              disabled={scanAll.isPending}
              className="gap-2"
            >
              <RefreshCw className={scanAll.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {scanAll.isPending ? 'جارٍ تدقيق العقود...' : 'تحديث وتدقيق جميع العقود'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => aiReview.mutate(Math.min(proposals.length || 25, 50))}
              disabled={aiReview.isPending || proposals.length === 0}
              className="gap-2 border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] hover:bg-[#E0E7FF]"
            >
              <Brain className={aiReview.isPending ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
              {aiReview.isPending ? 'الوكيل يراجع...' : 'تدقيق الوكيل (Kimi K3)'}
            </Button>
            {aiReadyProposals.length > 0 && (
              <Button
                size="sm"
                onClick={() => setConfirmAiBulkOpen(true)}
                disabled={bulkApprove.isPending}
                className="gap-2 bg-[#3730A3] text-white hover:bg-[#312E81]"
              >
                <CheckCircle2 className="h-4 w-4" />
                اعتماد ما وافق عليه الوكيل ({aiReadyProposals.length})
              </Button>
            )}
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
      ) : hasProposalsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="font-semibold text-red-900">تعذر تحميل مهام تدقيق البيانات</p>
          <p className="mt-1 text-sm text-red-700">
            {proposalsError instanceof Error
              ? proposalsError.message
              : 'تحقق من صلاحيات المستخدم ثم أعد المحاولة.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 border-red-200 bg-white text-red-800 hover:bg-red-100"
            onClick={() => refetch()}
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
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

      {/* AI-approved bulk confirmation */}
      <AlertDialog open={confirmAiBulkOpen} onOpenChange={setConfirmAiBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>اعتماد ما وافق عليه الوكيل الذكي</AlertDialogTitle>
            <AlertDialogDescription>
              سيُطبق كل الحقول المقترحة في {aiReadyProposals.length} مقترحاً حكم عليه الوكيل
              بأنه صحيح بعد مقارنته بالدليل. تبقى بقية المقترحات معلّقة للمراجعة اليدوية.
              هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkApprove.mutate(
                  { proposals: aiReadyProposals, threshold: 0 },
                  { onSettled: () => setConfirmAiBulkOpen(false) },
                );
              }}
              className="bg-[#3730A3] hover:bg-[#312E81]"
            >
              اعتماد مقترحات الوكيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
