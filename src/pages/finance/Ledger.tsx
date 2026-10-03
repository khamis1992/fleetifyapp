import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { Button } from "@/components/ui/button";
import { EnhancedJournalEntriesTab } from "@/components/finance/EnhancedJournalEntriesTab";
import { JournalEntryForm } from "@/components/finance/JournalEntryForm";
import { FinanceContextActions } from "@/components/finance/workspace/FinanceContextActions";
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";
import { usePostJournalEntry } from "@/hooks/finance/useJournalEntries";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useEnhancedJournalEntries,
  useReverseJournalEntry,
  useDeleteJournalEntry,
  useExportLedgerData,
  type LedgerFilters,
} from "@/hooks/useGeneralLedger";
export default function Ledger() {
  const [params, setParams] = useSearchParams();
  // Deep-linkable status filter (e.g. ?status=draft from balance-sheet readiness actions).
  const statusParam = params.get("status");
  const searchParam = params.get("search");
  const [filters, setFilters] = useState<LedgerFilters>({
    status:
      statusParam && ["posted", "draft", "reversed", "cancelled"].includes(statusParam)
        ? statusParam
        : "all",
    searchTerm: searchParam?.trim() || undefined,
  });
  useEffect(() => {
    setFilters(previous => ({
      ...previous,
      status: statusParam && ["posted", "draft", "reversed", "cancelled"].includes(statusParam)
        ? statusParam : "all",
      searchTerm: searchParam?.trim() || undefined,
    }));
  }, [statusParam, searchParam]);
  const query = useEnhancedJournalEntries(filters);
  const access = useFinanceAccessGuard();
  const post = usePostJournalEntry();
  const { companyId, user } = useUnifiedCompanyAccess();
  const [postingTarget, setPostingTarget] = useState<{ entryId: string; companyId: string } | null>(null);
  const [selfReviewAcknowledged, setSelfReviewAcknowledged] = useState(false);
  const [postingError, setPostingError] = useState<string | null>(null);
  const companyEntries = (query.data || []).filter((entry) => Boolean(companyId) && entry.company_id === companyId);
  const postingEntryId = postingTarget?.companyId === companyId ? postingTarget?.entryId : undefined;
  const postingEntry = postingEntryId
    ? companyEntries.find((entry) => entry.id === postingEntryId)
    : undefined;
  const isOwnEntry = Boolean(user?.id && postingEntry?.created_by === user.id);
  useEffect(() => {
    setPostingTarget(null);
    setSelfReviewAcknowledged(false);
    setPostingError(null);
  }, [companyId, user?.id]);
  const reverse = useReverseJournalEntry();
  const remove = useDeleteJournalEntry();
  const exportData = useExportLedgerData();
  const setCreateOpen = (open: boolean) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (open) next.set("action", "new");
        else next.delete("action");
        return next;
      },
      { replace: !open }
    );
  return (
    <section dir="rtl" className="space-y-5">
      <FinancePageHeader
        title="القيود اليومية"
        description="إنشاء القيود ومراجعتها وترحيلها وعكسها حسب الصلاحيات — المصروفات والمشتريات تُسجَّل هنا كقيود (مدين مصروف / دائن ذمم الموردين 21111)؛ لا موديول موردين بعد."
        icon={FileText}
        actions={
          <>
            {access.can("finance.journal.create_draft") && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                قيد جديد
              </Button>
            )}
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw className="me-2 h-4 w-4" />
              تحديث
            </Button>
          </>
        }
      />
      <FinanceContextActions ids={["journal-demo"]} />
      {query.error ? (
        <p role="alert" className="rounded-xl border border-destructive p-6">
          تعذر تحميل القيود. أعد المحاولة قبل اعتماد النتائج أو تصديرها.
        </p>
      ) : (
        <EnhancedJournalEntriesTab
          entries={companyEntries}
          filters={filters}
          isLoading={query.isLoading}
          onFiltersChange={(next) =>
            setFilters((previous) => ({ ...previous, ...next }))
          }
          onPostEntry={
            access.can("finance.journal.post")
              ? async (id) => {
                  if (!companyId || !companyEntries.some((entry) => entry.id === id)) return;
                  setSelfReviewAcknowledged(false);
                  setPostingError(null);
                  setPostingTarget({ entryId: id, companyId });
                }
              : undefined
          }
          onReverseEntry={
            access.can("finance.journal.reverse")
              ? async (entryId, reason) => {
                  await reverse.mutateAsync({ entryId, reason });
                }
              : undefined
          }
          onDeleteEntry={
            access.can("finance.journal.cancel")
              ? async (id) => {
                  await remove.mutateAsync(id);
                }
              : undefined
          }
          onExport={async (format) => {
            await exportData.mutateAsync({ format, filters });
          }}
        />
      )}
      {params.get("action") === "new" &&
        access.can("finance.journal.create_draft") && (
          <JournalEntryForm
            open
            onOpenChange={setCreateOpen}
            onSuccess={() => query.refetch()}
          />
        )}
      {params.get("action") === "new" &&
        !access.isLoading &&
        !access.can("finance.journal.create_draft") && (
          <p role="alert">ليس لديك صلاحية إنشاء قيد.</p>
        )}
      <Dialog
        open={Boolean(postingEntry)}
        onOpenChange={(open) => { if (!open && !post.isPending) setPostingTarget(null); }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>مراجعة وترحيل القيد {postingEntry?.entry_number}</DialogTitle>
            <DialogDescription>سيراجع النظام الفترة المحاسبية والتوازن وصلاحية القيد قبل تسجيل الترحيل.</DialogDescription>
          </DialogHeader>
          {postingEntry && <p className="text-sm break-words">{postingEntry.description}</p>}
          {isOwnEntry && (
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={selfReviewAcknowledged}
                disabled={post.isPending}
                onChange={(event) => setSelfReviewAcknowledged(event.target.checked)}
              />
              <span>أقر بأنني راجعت هذا القيد الذي أنشأته ومراجعه ومبالغه، وأتحمل مسؤولية ترحيله. هذا إقرار بمراجعة داخلية للقيد.</span>
            </label>
          )}
          {postingError && <p role="alert" className="text-sm text-destructive">{postingError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={post.isPending} onClick={() => setPostingTarget(null)}>إلغاء</Button>
            <Button
              disabled={post.isPending || !user?.id || !postingEntry || !access.can("finance.journal.post") || (isOwnEntry && !selfReviewAcknowledged)}
              onClick={async () => {
                if (!user?.id || !postingEntry || postingTarget?.companyId !== companyId || !access.can("finance.journal.post")) return;
                setPostingError(null);
                try {
                  await post.mutateAsync({ entryId: postingEntry.id, selfReviewAcknowledged: isOwnEntry && selfReviewAcknowledged });
                  setPostingTarget(null);
                } catch (error) {
                  setPostingError(error instanceof Error ? error.message : "تعذر ترحيل القيد. راجع رسالة النظام قبل إعادة المحاولة.");
                }
              }}
            >{post.isPending ? "جارٍ الترحيل…" : "تأكيد ترحيل القيد"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
