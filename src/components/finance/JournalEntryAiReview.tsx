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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  useLatestAgentReview,
  useRunAgentReview,
} from '@/hooks/useAgentReviews';

const VERDICT_META: Record<string, { label: string; className: string }> = {
  balanced_pass: { label: 'القيد سليم', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  warning: { label: 'تنبيه من الوكيل', className: 'border-amber-300 bg-amber-50 text-amber-800' },
  fail: { label: 'مشكلة في القيد', className: 'border-rose-300 bg-rose-50 text-rose-700' },
};

export function JournalEntryAiReviewBadge({ entryId }: { entryId: string }) {
  const { data: review } = useLatestAgentReview('journal_entry', entryId);
  if (!review) return null;
  const meta = VERDICT_META[review.verdict];
  if (!meta) return null;
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      <Brain className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

export function JournalEntryAiReviewMenuItem({ entryId, entryNumber }: {
  entryId: string;
  entryNumber: string;
}) {
  const runReview = useRunAgentReview('journal_entry');
  const { data: review } = useLatestAgentReview('journal_entry', entryId);
  const [open, setOpen] = React.useState(false);

  const startReview = async () => {
    await runReview.mutateAsync({ journalEntryId: entryId });
    setOpen(true);
  };

  const meta = review ? VERDICT_META[review.verdict] : null;
  const issues = (review?.details?.deterministic_issues || review?.details?.issues || []) as string[];

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          void startReview();
        }}
        disabled={runReview.isPending}
      >
        {runReview.isPending
          ? <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          : <Brain className="ml-2 h-4 w-4 text-[#3730A3]" />}
        مراجعة الوكيل (Kimi)
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#3730A3]" />
              مراجعة الوكيل للقيد {entryNumber}
            </DialogTitle>
            <DialogDescription className="text-right">
              فحص توازن ومنطقية آلي — لا يغيّر القيد نفسه.
            </DialogDescription>
          </DialogHeader>

          {review ? (
            <div className="space-y-3 py-2">
              {meta && (
                <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                  {meta.label}
                  {review.confidence != null ? ` · ${Math.round(review.confidence * 100)}%` : ''}
                </Badge>
              )}
              {review.summary && (
                <p className="rounded-lg bg-[#F6F8FB] p-3 text-sm leading-6 text-[#334155]">
                  {review.summary}
                </p>
              )}
              {review.details?.impact && (
                <p className="text-sm text-[#475569]">
                  <span className="font-bold">الأثر: </span>{review.details.impact}
                </p>
              )}
              {issues.length > 0 && (
                <ul className="list-inside space-y-1 text-sm text-[#B42318]">
                  {issues.slice(0, 5).map((issue, index) => (
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
