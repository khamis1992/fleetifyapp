import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { AlertCircle, CheckCircle2, FileSpreadsheet, RefreshCw, Search, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  createBankStatementImportFingerprint,
  parseBankStatementRows,
  type BankStatementParseResult,
} from "@/utils/bankStatementImportParser";

type ReconciliationTransaction = {
  id: string;
  bank_id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  description: string;
  reference_number: string | null;
  reconciled: boolean | null;
};

type BankOption = {
  id: string;
  bank_name: string;
  bank_name_ar: string | null;
};

type StatementLine = {
  id: string;
  bank_id: string;
  statement_date: string;
  description: string;
  reference_number: string | null;
  amount: number;
  match_status: string;
};

type ReconciliationBatch = {
  id: string;
  status: string;
  statement_line_count: number;
  auto_matched_count: number;
  needs_review_count: number;
  started_at: string;
};

export function BankReconciliationPanel() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<BankStatementParseResult | null>(null);
  const [selectedStatementLineId, setSelectedStatementLineId] = useState("");

  const banksQuery = useQuery({
    queryKey: ["bank-reconciliation-banks", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banks")
        .select("id,bank_name,bank_name_ar")
        .eq("company_id", companyId)
        .order("bank_name", { ascending: true });

      if (error) throw error;
      return (data || []) as BankOption[];
    },
  });

  const transactionsQuery = useQuery({
    queryKey: ["bank-reconciliation-workspace", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("id,bank_id,transaction_number,transaction_date,transaction_type,amount,description,reference_number,reconciled")
        .eq("company_id", companyId)
        .eq("status", "completed")
        .or("reconciled.is.null,reconciled.eq.false")
        .order("transaction_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as ReconciliationTransaction[];
    },
  });

  const statementLinesQuery = useQuery({
    queryKey: ["bank-statement-lines-review", companyId, selectedBankId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let query = (supabase as any)
        .from("bank_statement_lines")
        .select("id,bank_id,statement_date,description,reference_number,amount,match_status")
        .eq("company_id", companyId)
        .in("match_status", ["unmatched", "needs_review"])
        .order("statement_date", { ascending: false })
        .limit(25);

      if (selectedBankId) query = query.eq("bank_id", selectedBankId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StatementLine[];
    },
  });

  const batchesQuery = useQuery({
    queryKey: ["bank-reconciliation-batches", companyId, selectedBankId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let query = (supabase as any)
        .from("bank_reconciliation_batches")
        .select("id,status,statement_line_count,auto_matched_count,needs_review_count,started_at")
        .eq("company_id", companyId)
        .order("started_at", { ascending: false })
        .limit(5);

      if (selectedBankId) query = query.eq("bank_id", selectedBankId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ReconciliationBatch[];
    },
  });

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const rows = transactionsQuery.data || [];
    if (!term) return rows;

    return rows.filter((row) =>
      row.transaction_number.toLowerCase().includes(term) ||
      row.description.toLowerCase().includes(term) ||
      row.reference_number?.toLowerCase().includes(term)
    );
  }, [searchTerm, transactionsQuery.data]);

  const selectedTotal = useMemo(() => {
    const selected = new Set(selectedIds);
    return filteredTransactions
      .filter((transaction) => selected.has(transaction.id))
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }, [filteredTransactions, selectedIds]);

  const importSummary = useMemo(() => {
    if (!importPreview) return null;
    return [
      { label: "الأسطر", value: importPreview.totals.rows, tone: "bg-[#F6F8FB] text-[#020617]" },
      { label: "صالحة", value: importPreview.totals.validRows, tone: "bg-[#E8FBF6] text-[#22C7A1]" },
      { label: "أخطاء", value: importPreview.errors.length, tone: "bg-[#FFF0F2] text-[#FB6B7A]" },
    ];
  }, [importPreview]);

  const parseStatementFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    setImportFileName(file.name);

    if (extension === "xlsx" || extension === "xls") {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      setImportPreview(parseBankStatementRows(rows));
      return;
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      toast.warning("تمت قراءة الملف مع وجود ملاحظات في بعض الصفوف");
    }

    setImportPreview(parseBankStatementRows(parsed.data));
  };

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) throw new Error("اختر معاملات للتسوية");
      const now = new Date().toISOString();
      const selectedRows = filteredTransactions.filter((transaction) => selectedIds.includes(transaction.id));

      const { error: transactionError } = await supabase
        .from("bank_transactions")
        .update({ reconciled: true, reconciled_at: now, updated_at: now })
        .in("id", selectedIds);

      if (transactionError) throw transactionError;

      const references = selectedRows
        .flatMap((row) => [row.reference_number, row.transaction_number])
        .filter((value): value is string => Boolean(value?.trim()));

      if (references.length > 0) {
        await supabase
          .from("payments")
          .update({
            reconciliation_status: "reconciled",
            reconciled_at: now,
            reconciliation_reference: `bank-reconciliation-${now}`,
            updated_at: now,
          } as any)
          .eq("company_id", companyId)
          .in("payment_number", references);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-summary"] });
      toast.success("تمت التسوية البنكية");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذرت التسوية البنكية");
    },
  });

  const importStatementMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("الشركة غير محددة");
      if (!selectedBankId) throw new Error("اختر البنك قبل حفظ الكشف");
      if (!importPreview || importPreview.lines.length === 0) throw new Error("لا توجد أسطر صالحة للحفظ");

      const fileHash = createBankStatementImportFingerprint(importPreview.lines);
      const { data: importRow, error: importError } = await (supabase as any)
        .from("bank_statement_imports")
        .insert({
          company_id: companyId,
          bank_id: selectedBankId,
          file_name: importFileName || "bank-statement.csv",
          file_hash: fileHash,
          row_count: importPreview.totals.rows,
          matched_count: 0,
          unmatched_count: importPreview.lines.length,
          status: "imported",
          notes: importPreview.errors.length ? `Imported with ${importPreview.errors.length} parser warnings` : null,
        })
        .select("id")
        .single();

      if (importError) throw importError;

      const linePayload = importPreview.lines.map((line) => ({
        import_id: importRow.id,
        company_id: companyId,
        bank_id: selectedBankId,
        statement_date: line.statementDate,
        value_date: line.valueDate,
        description: line.description,
        reference_number: line.referenceNumber,
        debit_amount: line.debitAmount,
        credit_amount: line.creditAmount,
        amount: line.amount,
        currency: line.currency,
        line_hash: line.lineFingerprint,
        raw_data: line.rawData,
        match_status: "unmatched",
      }));

      const { error: linesError } = await (supabase as any)
        .from("bank_statement_lines")
        .insert(linePayload);

      if (linesError) throw linesError;
    },
    onSuccess: () => {
      setImportFileName("");
      setImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-workspace"] });
      toast.success("تم حفظ كشف البنك للتسوية");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ كشف البنك");
    },
  });

  const matchStatementLineMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStatementLineId) throw new Error("اختر سطر كشف بنكي");
      if (selectedIds.length !== 1) throw new Error("اختر حركة بنك واحدة فقط للمطابقة");

      const { error } = await (supabase as any).rpc("mark_bank_statement_line_matched", {
        p_line_id: selectedStatementLineId,
        p_payment_id: null,
        p_bank_transaction_id: selectedIds[0],
        p_score: 100,
        p_method: "manual",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedStatementLineId("");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["bank-statement-lines-review"] });
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success("تمت مطابقة سطر الكشف مع الحركة البنكية");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذرت مطابقة سطر الكشف");
    },
  });

  const autoMatchBatchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBankId) throw new Error("اختر البنك قبل تشغيل المطابقة التلقائية");

      const { data, error } = await (supabase as any).rpc("run_auto_bank_reconciliation_batch", {
        p_bank_id: selectedBankId,
        p_limit: 200,
      });

      if (error) throw error;
      return data as {
        batch_id: string;
        statement_line_count: number;
        auto_matched_count: number;
        needs_review_count: number;
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-batches"] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement-lines-review"] });
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success(`تمت المطابقة التلقائية: ${result.auto_matched_count} مطابق، ${result.needs_review_count} للمراجعة`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تشغيل المطابقة التلقائية");
    },
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredTransactions.map((transaction) => transaction.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  };

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm" dir="rtl">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8FBF6] text-[#22C7A1]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-[#020617]">التسوية البنكية الرسمية</CardTitle>
              <p className="mt-1 text-sm font-medium text-[#94A3B8]">
                طابق الحركات البنكية المكتملة مع الدفعات، واجعلها جزءًا من فحص صحة النظام المالي.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-[#F6F8FB] px-3 py-1 text-[#94A3B8] hover:bg-[#F6F8FB]">
              {filteredTransactions.length} حركة معلقة
            </Badge>
            <Badge className="border-0 bg-[#EAF8FE] px-3 py-1 text-[#38BDF8] hover:bg-[#EAF8FE]">
              المحدد: {formatCurrency(selectedTotal)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="rounded-2xl border border-slate-200 bg-[#F6F8FB] p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#22C7A1]" />
                <h3 className="text-sm font-black text-[#020617]">استيراد كشف بنكي</h3>
              </div>
              <p className="text-xs font-medium text-[#94A3B8]">
                ارفع CSV أو Excel، راجع الأسطر الصالحة، ثم احفظها كدفعة تسوية رسمية قابلة للتدقيق.
              </p>
            </div>

            <div className="grid w-full gap-2 md:grid-cols-[minmax(180px,240px)_minmax(220px,1fr)_auto] xl:max-w-3xl">
              <select
                value={selectedBankId}
                onChange={(event) => setSelectedBankId(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-[#020617] outline-none focus:border-[#22C7A1]"
                disabled={banksQuery.isLoading}
              >
                <option value="">اختر البنك</option>
                {(banksQuery.data || []).map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_name_ar || bank.bank_name}
                  </option>
                ))}
              </select>

              <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 text-sm font-bold text-[#64748B] hover:border-[#22C7A1]">
                <span className="truncate">{importFileName || "CSV / Excel"}</span>
                <Upload className="h-4 w-4 text-[#22C7A1]" />
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void parseStatementFile(file);
                    event.target.value = "";
                  }}
                />
              </label>

              <Button
                onClick={() => importStatementMutation.mutate()}
                disabled={!importPreview?.lines.length || !selectedBankId || importStatementMutation.isPending}
                className="h-11 gap-2 rounded-xl bg-[#22C7A1] px-5 text-white hover:bg-[#1BAF8D]"
              >
                {importStatementMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                حفظ الكشف
              </Button>
            </div>
          </div>

          {importSummary && (
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {importSummary.map((item) => (
                <div key={item.label} className={`rounded-xl px-3 py-2 ${item.tone}`}>
                  <p className="text-xs font-bold opacity-70">{item.label}</p>
                  <p className="text-lg font-black">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {importPreview?.errors.length ? (
            <div className="mt-3 rounded-xl border border-[#FB6B7A]/20 bg-[#FFF0F2] p-3 text-xs font-bold text-[#FB6B7A]">
              <div className="mb-1 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>ملاحظات الاستيراد</span>
              </div>
              <ul className="max-h-20 space-y-1 overflow-auto">
                {importPreview.errors.slice(0, 5).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="بحث برقم الحركة أو المرجع..."
              className="h-11 rounded-xl bg-[#F6F8FB] pr-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={selectAllVisible} className="h-11 rounded-xl border-slate-200 bg-white">
              تحديد الظاهر
            </Button>
            <Button
              onClick={() => reconcileMutation.mutate()}
              disabled={selectedIds.length === 0 || reconcileMutation.isPending}
              className="h-11 gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAF8D]"
            >
              {reconcileMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              تسوية المحدد
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#F6F8FB] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-black text-[#020617]">دفعات التسوية الرسمية</h3>
              <p className="mt-1 text-xs font-medium text-[#94A3B8]">
                شغل المطابقة التلقائية على أسطر الكشف غير المطابقة، ثم راجع ما تبقى يدويًا.
              </p>
            </div>
            <Button
              onClick={() => autoMatchBatchMutation.mutate()}
              disabled={!selectedBankId || autoMatchBatchMutation.isPending}
              className="h-10 gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAF8D]"
            >
              {autoMatchBatchMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              تشغيل المطابقة التلقائية
            </Button>
          </div>
          <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-5">
            {batchesQuery.isLoading ? (
              <div className="rounded-xl bg-[#F6F8FB] p-3 text-sm font-bold text-[#94A3B8]">جاري تحميل الدفعات...</div>
            ) : batchesQuery.data?.length ? (
              batchesQuery.data.map((batch) => (
                <div key={batch.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge className={batch.status === "approved" ? "border-0 bg-[#E8FBF6] text-[#22C7A1]" : "border-0 bg-[#EEF2FF] text-[#7C83F6]"}>
                      {batch.status === "approved" ? "معتمدة" : "مكتملة"}
                    </Badge>
                    <span className="font-mono text-[10px] text-[#94A3B8]">{batch.started_at?.slice(0, 10)}</span>
                  </div>
                  <p className="text-lg font-black text-[#020617]">{batch.auto_matched_count}/{batch.statement_line_count}</p>
                  <p className="text-xs font-bold text-[#94A3B8]">{batch.needs_review_count} للمراجعة</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-[#F6F8FB] p-3 text-sm font-bold text-[#94A3B8]">لا توجد دفعات تسوية محفوظة.</div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F6F8FB]">
                <TableHead className="w-12 text-right" />
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">الحركة</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">التاريخ</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">النوع</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">المبلغ</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">المرجع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm font-bold text-[#94A3B8]">
                    جاري تحميل الحركات البنكية...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length ? (
                filteredTransactions.slice(0, 20).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(transaction.id)} onCheckedChange={() => toggleSelection(transaction.id)} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm font-black text-[#020617]">{transaction.transaction_number}</p>
                        <p className="mt-1 max-w-[260px] truncate text-xs text-[#94A3B8]">{transaction.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[#64748B]">{transaction.transaction_date}</TableCell>
                    <TableCell>
                      <Badge className={transaction.transaction_type === "deposit" ? "border-0 bg-[#E8FBF6] text-[#22C7A1]" : "border-0 bg-[#FFF0F2] text-[#FB6B7A]"}>
                        {transaction.transaction_type === "deposit" ? "إيداع" : "سحب"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black text-[#020617]">{formatCurrency(transaction.amount)}</TableCell>
                    <TableCell className="font-mono text-xs text-[#64748B]">{transaction.reference_number || "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm font-bold text-[#22C7A1]">
                    لا توجد حركات بنكية بانتظار التسوية.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#F6F8FB] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-black text-[#020617]">مراجعة أسطر الكشف غير المطابقة</h3>
              <p className="mt-1 text-xs font-medium text-[#94A3B8]">
                اختر سطر كشف واحد وحركة بنك واحدة، ثم نفذ المطابقة الرسمية.
              </p>
            </div>
            <Button
              onClick={() => matchStatementLineMutation.mutate()}
              disabled={!selectedStatementLineId || selectedIds.length !== 1 || matchStatementLineMutation.isPending}
              className="h-10 gap-2 rounded-xl bg-[#7C83F6] text-white hover:bg-[#6970E6]"
            >
              {matchStatementLineMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              مطابقة مع الحركة المحددة
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead className="w-12 text-right" />
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">التاريخ</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">البيان</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">المبلغ</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statementLinesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm font-bold text-[#94A3B8]">
                    جاري تحميل أسطر الكشف...
                  </TableCell>
                </TableRow>
              ) : statementLinesQuery.data?.length ? (
                statementLinesQuery.data.map((line) => (
                  <TableRow key={line.id} className={selectedStatementLineId === line.id ? "bg-[#EEF2FF]" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStatementLineId === line.id}
                        onCheckedChange={() => setSelectedStatementLineId((current) => (current === line.id ? "" : line.id))}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-bold text-[#020617]">{line.statement_date}</TableCell>
                    <TableCell>
                      <p className="max-w-[360px] truncate text-sm font-bold text-[#020617]">{line.description}</p>
                      <p className="mt-1 font-mono text-xs text-[#94A3B8]">{line.reference_number || "-"}</p>
                    </TableCell>
                    <TableCell className="font-black text-[#020617]">{formatCurrency(line.amount)}</TableCell>
                    <TableCell>
                      <Badge className="border-0 bg-[#FFF8E8] text-[#B7791F] hover:bg-[#FFF8E8]">
                        {line.match_status === "needs_review" ? "يحتاج مراجعة" : "غير مطابق"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm font-bold text-[#22C7A1]">
                    لا توجد أسطر كشف بانتظار المراجعة.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
