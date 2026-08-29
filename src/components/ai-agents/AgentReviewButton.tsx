import * as React from 'react';
import { Brain, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type AgentReview,
  type AgentType,
  useLatestAgentReview,
  useRunAgentReview,
} from '@/hooks/useAgentReviews';

const VERDICT_STYLES: Record<string, string> = {
  balanced_pass: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  ready: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  consistent: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  verified: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  delivered: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  read: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  sent: 'border-amber-300 bg-amber-50 text-amber-800',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
  needs_review: 'border-amber-300 bg-amber-50 text-amber-800',
  uncertain: 'border-amber-300 bg-amber-50 text-amber-800',
  possible: 'border-amber-300 bg-amber-50 text-amber-800',
  fail: 'border-rose-300 bg-rose-50 text-rose-700',
  not_ready: 'border-rose-300 bg-rose-50 text-rose-700',
  discrepancy: 'border-rose-300 bg-rose-50 text-rose-700',
  contradicted: 'border-rose-300 bg-rose-50 text-rose-700',
};

const VERDICT_LABELS: Record<string, string> = {
  balanced_pass: 'سليم',
  ready: 'جاهز',
  consistent: 'متسق',
  verified: 'متحقق منه',
  sent: 'أُرسل وبانتظار الوصول',
  delivered: 'تم الوصول',
  read: 'تمت القراءة',
  warning: 'تنبيه',
  needs_review: 'يحتاج مراجعة',
  uncertain: 'غير مؤكد',
  possible: 'محتمل',
  fail: 'فشل الفحص',
  not_ready: 'غير جاهز',
  discrepancy: 'يوجد فرق',
  contradicted: 'متعارض مع الدليل',
};

export function AgentReviewVerdictBadge({ agentType, entityId }: {
  agentType: AgentType;
  entityId?: string | null;
}) {
  const { data: review } = useLatestAgentReview(agentType, entityId);
  if (!review) return null;
  return (
    <Badge
      variant="outline"
      className={`gap-1 ${VERDICT_STYLES[review.verdict] || 'border-slate-300 bg-slate-50 text-slate-600'}`}
      title={review.summary || ''}
    >
      <Brain className="h-3 w-3" />
      الوكيل: {VERDICT_LABELS[review.verdict] || review.verdict}
    </Badge>
  );
}

export function AgentReviewButton({ agentType, body, entityId, label, title }: {
  agentType: AgentType;
  body: Record<string, unknown>;
  entityId?: string | null;
  label: string;
  title: string;
}) {
  const runReview = useRunAgentReview(agentType);
  const { data: review } = useLatestAgentReview(agentType, entityId);
  const [open, setOpen] = React.useState(false);

  const startReview = async () => {
    await runReview.mutateAsync(body);
    setOpen(true);
  };

  const details = (review?.details || {}) as AgentReview['details'];
  const issueList = (
    details.deterministic_missing
    || details.deterministic_flags
    || details.deterministic_issues
    || details.conflicts
    || details.ai_missing
    || details.ai_flags
    || details.issues
    || []
  ) as string[];

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={startReview}
        disabled={runReview.isPending}
        className="gap-1.5 border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] hover:bg-[#E0E7FF]"
      >
        {runReview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#3730A3]" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-right">
              مراجعة آلية بالذكاء الاصطناعي — القرار النهائي يبقى لك.
            </DialogDescription>
          </DialogHeader>

          {review ? (
            <div className="space-y-3 py-2">
              <Badge
                variant="outline"
                className={`gap-1 ${VERDICT_STYLES[review.verdict] || 'border-slate-300 bg-slate-50 text-slate-600'}`}
              >
                {VERDICT_LABELS[review.verdict] || review.verdict}
                {review.confidence != null ? ` · ${Math.round(review.confidence * 100)}%` : ''}
              </Badge>
              {review.summary && (
                <p className="rounded-lg bg-[#F6F8FB] p-3 text-sm leading-6 text-[#334155]">
                  {review.summary}
                </p>
              )}
              {issueList.length > 0 && (
                <ul className="space-y-1 text-sm text-[#8A3028]">
                  {issueList.slice(0, 6).map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
