import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { Button } from "@/components/ui/button";
import { EnhancedJournalEntriesTab } from "@/components/finance/EnhancedJournalEntriesTab";
import { JournalEntryForm } from "@/components/finance/JournalEntryForm";
import { FinanceContextActions } from "@/components/finance/workspace/FinanceContextActions";
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";
import {
  useEnhancedJournalEntries,
  usePostJournalEntry,
  useReverseJournalEntry,
  useDeleteJournalEntry,
  useExportLedgerData,
  type LedgerFilters,
} from "@/hooks/useGeneralLedger";
export default function Ledger() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<LedgerFilters>({ status: "all" });
  const query = useEnhancedJournalEntries(filters);
  const access = useFinanceAccessGuard();
  const post = usePostJournalEntry();
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
        description="إنشاء القيود ومراجعتها وترحيلها وعكسها حسب الصلاحيات."
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
          entries={query.data || []}
          filters={filters}
          isLoading={query.isLoading}
          onFiltersChange={(next) =>
            setFilters((previous) => ({ ...previous, ...next }))
          }
          onPostEntry={
            access.can("finance.journal.post")
              ? async (id) => {
                  await post.mutateAsync(id);
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
    </section>
  );
}
