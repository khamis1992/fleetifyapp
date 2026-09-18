import { useState } from "react";
import "./BalanceSheetReport.css";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FinancialReportLanguage, useFinancialReportLocale } from './FinancialReportLanguage';
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import {
  useBalanceSheetActions,
  useProfessionalBalanceSheet,
  useSavedBalanceSheets,
} from "@/hooks/finance/useProfessionalBalanceSheet";
import { financeToday } from "@/services/financialReporting";
import {
  balanceSheetErrorMessage,
  validateBalanceSheetDates,
} from "@/services/professionalBalanceSheet";
import {
  formatBalanceSheetMoney,
  getBalanceSheetCheckMessage,
  getBalanceSheetRows,
} from "@/utils/balanceSheetPresentation";
import {
  exportBalanceSheetExcel,
  exportBalanceSheetPDF,
  printBalanceSheet,
} from "@/utils/balanceSheetExport";
import type {
  BalanceSheetLocale,
  BalanceSheetReviewConfirmations,
  SavedBalanceSheet,
} from "@/types/balanceSheet";

const emptyConfirmations: BalanceSheetReviewConfirmations = {
  assets: false,
  liabilities: false,
  equity: false,
  reconciliation: false,
  completeness: false,
};

export function BalanceSheetReport() {
  const { companyId, user, isInitializing, isAuthenticating } =
    useUnifiedCompanyAccess();
  const currentLanguage = useFinancialReportLocale();
  if (isInitializing || isAuthenticating) return <LoadingSpinner />;
  if (!companyId || !user?.id)
    return (
      <p role="alert">
        {currentLanguage === "ar"
          ? "يلزم تسجيل الدخول واختيار الشركة."
          : "Sign in and select a company."}
      </p>
    );
  return (
    <BalanceSheetWorkspace
      key={`${companyId}:${user.id}`}
      companyId={companyId}
      actorId={user.id}
      locale={currentLanguage === "ar" ? "ar" : "en"}
    />
  );
}

function BalanceSheetWorkspace({
  companyId,
  actorId,
  locale,
}: {
  companyId: string;
  actorId: string;
  locale: BalanceSheetLocale;
}) {
  const ar = locale === "ar";
  const tr = (arabic: string, english: string) => (ar ? arabic : english);
  const [params, setParams] = useSearchParams();
  const [asOf, setAsOf] = useState(params.get("asOf") || financeToday());
  const [comparison, setComparison] = useState(params.get("compare") || "");
  const [selected, setSelected] = useState<SavedBalanceSheet | null>(null);
  const [notes, setNotes] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [confirmations, setConfirmations] =
    useState<BalanceSheetReviewConfirmations>({ ...emptyConfirmations });
  const [exporting, setExporting] = useState(false);
  const live = useProfessionalBalanceSheet(asOf, comparison || null);
  const history = useSavedBalanceSheets();
  const actions = useBalanceSheetActions();
  const savedVersions =
    history.data?.filter((row) => row.company_id === companyId) || [];
  const snapshot = selected
    ? savedVersions.find((row) => row.id === selected.id) || selected
    : null;
  const candidate = snapshot?.payload || live.data;
  const scopeMatches =
    candidate?.company.id === companyId &&
    candidate.asOfDate === asOf &&
    candidate.comparisonDate === (comparison || null);
  const report = scopeMatches ? candidate : undefined;
  const versionUnavailable = Boolean(
    selected &&
      history.data &&
      !savedVersions.some((row) => row.id === selected.id)
  );
  let datesValid = true;
  try {
    validateBalanceSheetDates(asOf, comparison || null);
  } catch {
    datesValid = false;
  }
  const busy =
    exporting ||
    actions.save.isPending ||
    actions.approve.isPending ||
    actions.voidReport.isPending;
  const readFailed = Boolean(
    live.error || (snapshot && history.error) || versionUnavailable
  );
  const readBusy = live.isFetching || Boolean(snapshot && history.isFetching);
  const canExport = Boolean(
    report &&
      datesValid &&
      !readFailed &&
      !readBusy &&
      !busy &&
      snapshot?.status !== "voided"
  );
  const blocking =
    report?.checks.filter(
      (check) => check.severity === "error" && check.count > 0
    ) || [];
  const stale = Boolean(
    snapshot &&
      live.data &&
      snapshot.source_fingerprint !== live.data.fingerprint
  );
  const canApprove = Boolean(
    snapshot?.status === "draft" &&
      live.data?.permissions.canApprove &&
      snapshot.created_by !== actorId &&
      !stale &&
      blocking.length === 0 &&
      report &&
      report.current.postedEntries > 0 &&
      !readFailed &&
      !readBusy
  );
  const approvalReady =
    canApprove &&
    reviewNotes.trim().length >= 20 &&
    Object.values(confirmations).every(Boolean);
  const rows = report ? getBalanceSheetRows(report, locale) : [];
  const money = (value: number) =>
    formatBalanceSheetMoney(value, report?.company.currency || "", locale);
  const status =
    snapshot?.status === "approved"
      ? tr("معتمد داخليًا", "Internally approved")
      : snapshot?.status === "voided"
      ? tr("نسخة ملغاة", "Voided version")
      : tr("مسودة غير معتمدة", "Unapproved draft");

  const changeDates = (nextAsOf: string, nextComparison: string) => {
    setAsOf(nextAsOf);
    setComparison(nextComparison);
    setSelected(null);
    setNotes("");
    setReviewNotes("");
    setConfirmations({ ...emptyConfirmations });
    setVoidReason("");
    const next = new URLSearchParams(params);
    if (nextAsOf) next.set("asOf", nextAsOf);
    else next.delete("asOf");
    if (nextComparison) next.set("compare", nextComparison);
    else next.delete("compare");
    setParams(next, { replace: true });
  };
  const chooseSaved = (saved: SavedBalanceSheet) => {
    changeDates(saved.as_of_date, saved.comparison_date || "");
    setSelected(saved);
  };
  const handleExport = async (type: "pdf" | "excel" | "print") => {
    if (!canExport || !report) return;
    setExporting(true);
    try {
      // Issuing a saved version needs a fresh server status: another reviewer may
      // have voided it since this screen loaded, including in a different session.
      let issuingSnapshot = snapshot;
      if (snapshot) {
        const refreshed = await history.refetch();
        if (refreshed.error) throw refreshed.error;
        const latest = refreshed.data?.find(
          (row) => row.id === snapshot.id && row.company_id === companyId
        );
        if (!latest) throw new Error("BALANCE_SHEET_VERSION_UNAVAILABLE");
        setSelected(latest);
        if (latest.status === "voided") {
          toast.error(
            tr(
              "أُلغيت هذه النسخة؛ لا يمكن إصدارها.",
              "This version was voided and cannot be issued."
            )
          );
          return;
        }
        issuingSnapshot = latest;
      }
      const options = {
        report: issuingSnapshot?.payload || report,
        snapshot: issuingSnapshot,
        locale,
      };
      if (type === "pdf") await exportBalanceSheetPDF(options);
      if (type === "excel") await exportBalanceSheetExcel(options);
      if (type === "print") await printBalanceSheet(options);
    } catch {
      toast.error(
        tr(
          "تعذر إخراج الملف. أعد المحاولة.",
          "The file could not be generated. Try again."
        )
      );
    } finally {
      setExporting(false);
    }
  };
  const save = async () => {
    if (
      !report ||
      snapshot ||
      busy ||
      !canExport ||
      !live.data?.permissions.canSave
    )
      return;
    try {
      setSelected(
        await actions.save.mutateAsync({
          asOf,
          comparison: comparison || null,
          notes,
        })
      );
      toast.success(
        tr(
          "حُفظت نسخة ثابتة للمراجعة.",
          "A fixed version was saved for review."
        )
      );
    } catch (error) {
      toast.error(balanceSheetErrorMessage(error, locale));
    }
  };
  const approve = async () => {
    if (!snapshot || !approvalReady || busy) return;
    try {
      setSelected(
        await actions.approve.mutateAsync({
          id: snapshot.id,
          notes: reviewNotes,
          confirmations,
        })
      );
      toast.success(
        tr(
          "سُجل الاعتماد الداخلي باسم المراجع.",
          "Internal approval was recorded under the reviewer’s identity."
        )
      );
    } catch (error) {
      toast.error(balanceSheetErrorMessage(error, locale));
    }
  };
  const voidSaved = async () => {
    if (!snapshot || voidReason.trim().length < 20 || busy) return;
    try {
      setSelected(
        await actions.voidReport.mutateAsync({
          id: snapshot.id,
          reason: voidReason,
        })
      );
      setVoidReason("");
      toast.success(
        tr(
          "أُلغيت النسخة مع الاحتفاظ بسجلها.",
          "The version was voided and retained in the history."
        )
      );
    } catch (error) {
      toast.error(balanceSheetErrorMessage(error, locale));
    }
  };

  return (
    <div
      className="balance-sheet-workspace space-y-6"
      dir={ar ? "rtl" : "ltr"}
      data-testid="balance-sheet-report"
    >
      <FinancialReportLanguage />
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>
                {tr("قائمة المركز المالي", "Statement of financial position")}
              </CardTitle>
              <CardDescription>
                {tr(
                  "الأصول والالتزامات وحقوق الملكية في تاريخ محدد، مع المقارنة والمراجعة والاعتماد.",
                  "Assets, liabilities and equity at a specified date, with comparison and recorded review."
                )}
              </CardDescription>
            </div>
            <Badge
              variant={
                snapshot?.status === "approved" ? "default" : "secondary"
              }
            >
              {status}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/finance/reports/financial-statements?asOf=${asOf}`}>
                {tr("حزمة القوائم المالية والإيضاحات", "Financial statements and notes")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport}
              onClick={() => void handleExport("pdf")}
            >
              <Download className="me-2 h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport}
              onClick={() => void handleExport("excel")}
            >
              <FileSpreadsheet className="me-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport}
              onClick={() => void handleExport("print")}
            >
              <Printer className="me-2 h-4 w-4" />
              {tr("طباعة", "Print")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !datesValid || readBusy}
              onClick={() => {
                void live.refetch();
                void history.refetch();
              }}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              {tr("تحديث", "Refresh")}
            </Button>
            {snapshot && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeDates(asOf, comparison)}
              >
                {tr("العودة للأرصدة الحالية", "Return to current ledger")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bs-as-of">
                {tr("كما في تاريخ", "As of date")}
              </Label>
              <Input
                id="bs-as-of"
                type="date"
                value={asOf}
                max={financeToday()}
                onChange={(event) =>
                  changeDates(event.target.value, comparison)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bs-comparison">
                {tr("تاريخ المقارنة الاختياري", "Comparison date (optional)")}
              </Label>
              <Input
                id="bs-comparison"
                type="date"
                value={comparison}
                max={asOf}
                onChange={(event) => changeDates(asOf, event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const year = Number(financeToday().slice(0, 4)) - 1;
                changeDates(`${year}-12-31`, `${year - 1}-12-31`);
              }}
            >
              {tr("نهاية السنة السابقة", "Previous year end")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const end = new Date(
                  `${financeToday().slice(0, 7)}-01T12:00:00Z`
                );
                end.setUTCDate(0);
                const cutoff = end.toISOString().slice(0, 10);
                changeDates(cutoff, `${Number(cutoff.slice(0, 4)) - 1}-12-31`);
              }}
            >
              {tr("نهاية الشهر السابق", "Previous month end")}
            </Button>
            {comparison && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeDates(asOf, "")}
              >
                {tr("إلغاء المقارنة", "Remove comparison")}
              </Button>
            )}
          </div>
          {!datesValid && (
            <p role="alert" className="text-sm text-destructive">
              {tr(
                "حدد تاريخًا صحيحًا حتى اليوم، ومقارنة بتاريخ أسبق.",
                "Choose a valid date up to today, with an earlier comparison date."
              )}
            </p>
          )}
          {readFailed && (
            <p role="alert" className="text-sm text-destructive">
              {versionUnavailable
                ? tr(
                    "تعذر التحقق من حالة هذه النسخة في سجل النسخ الحالي. حدّث السجل قبل إصدارها.",
                    "This version is not available in the current history. Refresh its status before issuing it."
                  )
                : balanceSheetErrorMessage(live.error || history.error, locale)}
            </p>
          )}
          {readBusy && (
            <div className="flex items-center gap-2 text-sm" role="status">
              <LoadingSpinner />
              {tr(
                "جارٍ التحقق من جميع الأرصدة…",
                "Verifying all ledger balances…"
              )}
            </div>
          )}
          {stale && (
            <p
              role="alert"
              className="text-sm text-amber-700 dark:text-amber-400"
            >
              {tr(
                "تغيرت بيانات المصدر بعد حفظ هذه النسخة. تُعرض أرصدتها كما حُفظت؛ احفظ نسخة جديدة لاعتماد الأرصدة المحدثة.",
                "Source data changed after this version was saved. Its saved balances are shown; save a new version to approve updated balances."
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {report && datesValid && !readFailed && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {ar
                  ? report.company.nameAr || report.company.name
                  : report.company.name}
              </CardTitle>
              <CardDescription>
                {tr("السجل التجاري", "Commercial register")}:{" "}
                {report.company.commercialRegister ||
                  tr("غير مسجل", "Not recorded")}{" "}
                · {report.company.currency} · {tr("كما في", "As of")}{" "}
                <bdi>{report.asOfDate}</bdi>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  [tr("إجمالي الأصول", "Total assets"), report.current.assets],
                  [
                    tr("إجمالي الالتزامات", "Total liabilities"),
                    report.current.liabilities,
                  ],
                  [
                    tr("إجمالي حقوق الملكية", "Total equity"),
                    report.current.equity,
                  ],
                ].map(([label, amount]) => (
                  <div key={label} className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums">
                      <bdi>{money(Number(amount))}</bdi>
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {Math.abs(report.current.imbalance) < 0.01 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span>
                  {tr("فرق المعادلة", "Accounting equation difference")}:{" "}
                  <bdi>{money(report.current.imbalance)}</bdi>
                </span>
                <span className="text-muted-foreground">
                  {tr(
                    "التوازن الحسابي لا يعني اكتمال الأرصدة أو اعتمادها.",
                    "Arithmetic balance does not establish completeness or approval."
                  )}
                </span>
              </div>
              {report.current.postedEntries === 0 && (
                <p role="alert" className="text-sm text-amber-700">
                  {tr(
                    "لا توجد قيود مرحلة حتى هذا التاريخ. لا يجوز اعتماد قائمة فارغة.",
                    "No posted entries exist by this date. An empty statement cannot be approved."
                  )}
                </p>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">
                        {tr("البند", "Item")}
                      </TableHead>
                      <TableHead className="text-start">
                        {tr("الحساب", "Account")}
                      </TableHead>
                      <TableHead className="text-end">
                        <bdi>{report.asOfDate}</bdi>
                      </TableHead>
                      {report.comparisonDate && (
                        <TableHead className="text-end">
                          <bdi>{report.comparisonDate}</bdi>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.key}
                        className={
                          row.kind === "section"
                            ? "bg-muted/70 font-semibold"
                            : row.kind === "total" || row.kind === "subtotal"
                            ? "bg-muted/30 font-semibold"
                            : ""
                        }
                      >
                        <TableCell className="min-w-40">{row.label}</TableCell>
                        <TableCell>
                          <bdi>{row.code || ""}</bdi>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-end tabular-nums">
                          <bdi>
                            {row.amount == null ? "" : money(row.amount)}
                          </bdi>
                        </TableCell>
                        {report.comparisonDate && (
                          <TableCell className="whitespace-nowrap text-end tabular-nums">
                            <bdi>
                              {row.comparisonAmount == null
                                ? ""
                                : money(row.comparisonAmount)}
                            </bdi>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                {tr(
                  "النتيجة غير المقفلة هي صافي أرصدة الإيرادات والمصروفات المتبقية حتى تاريخ القائمة، وقد تشمل سنوات سابقة. قيود الإقفال والعكس المرحلة مشمولة بحسب تاريخها.",
                  "Unclosed results are the remaining cumulative revenue and expense balances, which may include prior years. Posted closing and reversal entries are included by their accounting dates."
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {tr(
                  "فحوص الجاهزية والملاحظات",
                  "Readiness checks and findings"
                )}
              </CardTitle>
              <CardDescription>
                {tr(
                  "عالج الملاحظات المانعة، وراجع المستندات المؤيدة قبل الاعتماد.",
                  "Resolve blocking findings and review supporting records before approval."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!report.checks.some((check) => check.count > 0) ? (
                <p className="text-sm">
                  {tr(
                    "لم تكشف الفحوص الآلية عن مخالفات. تظل المراجعة المحاسبية مطلوبة.",
                    "Automated checks found no issues. Accounting review is still required."
                  )}
                </p>
              ) : (
                <ul className="space-y-3">
                  {report.checks
                    .filter((check) => check.count > 0)
                    .map((check, index) => (
                      <li
                        key={`${check.code}:${check.asOfDate}:${index}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        <AlertCircle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            check.severity === "error"
                              ? "text-destructive"
                              : "text-amber-600"
                          }`}
                        />
                        <span>
                          <strong>
                            {check.severity === "error"
                              ? tr("مانع للاعتماد", "Blocks approval")
                              : tr("يتطلب مراجعة", "Review required")}
                          </strong>{" "}
                          — {getBalanceSheetCheckMessage(check, locale)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-4 pt-2 text-sm">
                <Link className="underline" to="/finance/chart-of-accounts">
                  {tr("تصنيف الحسابات", "Account classification")}
                </Link>
                <Link className="underline" to="/finance/journal-entries">
                  {tr("مراجعة القيود", "Review ledger")}
                </Link>
                <Link className="underline" to="/finance/assets">
                  {tr("الأصول والإهلاك", "Assets and depreciation")}
                </Link>
              </div>
            </CardContent>
          </Card>
          {!snapshot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {tr("حفظ نسخة للمراجعة", "Save a version for review")}
                </CardTitle>
                <CardDescription>
                  {tr(
                    "تُحسب النسخة وتحفظ من قاعدة البيانات مع مرجع ثابت. الحفظ لا يعني الاعتماد.",
                    "The database generates and stores a fixed version. Saving does not approve it."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="bs-notes">
                  {tr("إيضاحات المُعدّ", "Preparer notes")}
                </Label>
                <Textarea
                  id="bs-notes"
                  value={notes}
                  maxLength={5000}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <Button
                  disabled={!canExport || !live.data?.permissions.canSave}
                  onClick={() => void save()}
                >
                  <Save className="me-2 h-4 w-4" />
                  {tr("حفظ نسخة للمراجعة", "Save for review")}
                </Button>
              </CardContent>
            </Card>
          )}
          {snapshot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {tr("سجل النسخة والاعتماد", "Version and approval record")}
                </CardTitle>
                <CardDescription className="break-all">
                  {tr("المرجع", "Reference")}: {snapshot.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">
                      {tr("أعدّها", "Prepared by")}
                    </dt>
                    <dd>
                      {snapshot.created_by_name} ·{" "}
                      <bdi>{snapshot.created_at.slice(0, 10)}</bdi>
                    </dd>
                  </div>
                  {snapshot.approved_at && (
                    <div>
                      <dt className="text-muted-foreground">
                        {tr("اعتمدها داخليًا", "Internally approved by")}
                      </dt>
                      <dd>
                        {snapshot.approved_by_name} ·{" "}
                        <bdi>{snapshot.approved_at.slice(0, 10)}</bdi>
                      </dd>
                    </div>
                  )}
                </dl>
                {snapshot.notes && (
                  <p className="whitespace-pre-wrap text-sm">
                    {snapshot.notes}
                  </p>
                )}
                {snapshot.review_notes && (
                  <p className="whitespace-pre-wrap text-sm">
                    {snapshot.review_notes}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {tr(
                    "الاعتماد الداخلي يسجل مراجعة المستخدم المخول، ولا يمثل تقرير تدقيق خارجي أو توقيع مدقق مستقل.",
                    "Internal approval records an authorized user’s review. It is not an external audit opinion or independent auditor signature."
                  )}
                </p>
                {snapshot.status === "draft" && (
                  <>
                    {snapshot.created_by === actorId && (
                      <p className="text-sm">
                        {tr(
                          "يجب أن يراجع النسخة ويعتمدها مستخدم مخول آخر غير مُعدّها.",
                          "A different authorized user must review and approve this version."
                        )}
                      </p>
                    )}
                    {canApprove && (
                      <>
                        <fieldset className="space-y-3 rounded-lg border p-4">
                          <legend className="px-2 text-sm font-medium">
                            {tr("إقرارات المراجع", "Reviewer confirmations")}
                          </legend>
                          {(
                            [
                              [
                                "assets",
                                tr(
                                  "راجعت الأصول وتكلفتها وإهلاكها والمستندات المؤيدة.",
                                  "I reviewed assets, costs, depreciation and supporting records."
                                ),
                              ],
                              [
                                "liabilities",
                                tr(
                                  "راجعت الالتزامات والدفعات المقدمة وأكملت تصنيفها.",
                                  "I reviewed liabilities, advances and classification."
                                ),
                              ],
                              [
                                "equity",
                                tr(
                                  "راجعت رأس المال والأرباح المحتجزة والنتيجة غير المقفلة.",
                                  "I reviewed capital, retained earnings and unclosed results."
                                ),
                              ],
                              [
                                "reconciliation",
                                tr(
                                  "طابقت الأرصدة مع البنوك والصندوق والذمم والمستندات.",
                                  "I reconciled balances to banks, cash, subledgers and documents."
                                ),
                              ],
                              [
                                "completeness",
                                tr(
                                  "راجعت اكتمال القيود والمسودات والتصحيحات اللاحقة والملاحظات.",
                                  "I reviewed completeness, drafts, subsequent corrections and findings."
                                ),
                              ],
                            ] as const
                          ).map(([key, label]) => (
                            <div key={key} className="flex items-start gap-2">
                              <Checkbox
                                id={`bs-review-${key}`}
                                checked={confirmations[key]}
                                onCheckedChange={(value) =>
                                  setConfirmations((current) => ({
                                    ...current,
                                    [key]: value === true,
                                  }))
                                }
                              />
                              <Label
                                className="text-sm leading-relaxed"
                                htmlFor={`bs-review-${key}`}
                              >
                                {label}
                              </Label>
                            </div>
                          ))}
                        </fieldset>
                        <Label htmlFor="bs-review-notes">
                          {tr(
                            "نتيجة المراجعة ومعالجة الملاحظات",
                            "Review conclusion and resolution of findings"
                          )}
                        </Label>
                        <Textarea
                          id="bs-review-notes"
                          value={reviewNotes}
                          maxLength={5000}
                          onChange={(event) =>
                            setReviewNotes(event.target.value)
                          }
                          placeholder={tr(
                            "نتيجة المراجعة والمستندات المرجعية، 20 حرفًا على الأقل.",
                            "Review and supporting references, at least 20 characters."
                          )}
                        />
                      </>
                    )}
                    <Button
                      disabled={!approvalReady || busy}
                      onClick={() => void approve()}
                    >
                      <ShieldCheck className="me-2 h-4 w-4" />
                      {tr("تسجيل الاعتماد الداخلي", "Record internal approval")}
                    </Button>
                  </>
                )}
                {snapshot.status !== "voided" &&
                  (snapshot.created_by === actorId ||
                    live.data?.permissions.canApprove) && (
                    <details className="rounded-lg border p-3">
                      <summary className="cursor-pointer text-sm">
                        {tr(
                          "إلغاء النسخة مع حفظ سجلها",
                          "Void this version and retain its history"
                        )}
                      </summary>
                      <div className="mt-3 space-y-3">
                        <Label htmlFor="bs-void-reason">
                          {tr(
                            "سبب الإلغاء 20 حرفًا على الأقل",
                            "Reason for voiding, at least 20 characters"
                          )}
                        </Label>
                        <Textarea
                          id="bs-void-reason"
                          value={voidReason}
                          maxLength={5000}
                          onChange={(event) =>
                            setVoidReason(event.target.value)
                          }
                        />
                        <Button
                          variant="destructive"
                          disabled={busy || voidReason.trim().length < 20}
                          onClick={() => void voidSaved()}
                        >
                          {tr("إلغاء هذه النسخة", "Void this version")}
                        </Button>
                      </div>
                    </details>
                  )}
                {snapshot.status === "voided" && (
                  <p className="text-sm text-destructive">
                    {snapshot.void_reason ||
                      tr(
                        "أُلغيت النسخة ولا يمكن إصدارها.",
                        "This version was voided and cannot be issued."
                      )}
                  </p>
                )}
                <p
                  className="break-all font-mono text-xs text-muted-foreground"
                  dir="ltr"
                >
                  SHA-256 {snapshot.source_fingerprint}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {tr("النسخ المحفوظة", "Saved versions")}
          </CardTitle>
          <CardDescription>
            {tr(
              "آخر 50 نسخة؛ يحتفظ النظام بالنسخ الملغاة وسجل مراجعتها.",
              "Latest 50 versions; voided versions and their review history are retained."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.error ? (
            <p role="alert" className="text-sm text-destructive">
              {balanceSheetErrorMessage(history.error, locale)}
            </p>
          ) : history.isLoading ? (
            <LoadingSpinner />
          ) : !savedVersions.length ? (
            <p className="text-sm text-muted-foreground">
              {tr("لم تُحفظ نسخ بعد.", "No versions have been saved yet.")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">
                      {tr("تاريخ القائمة", "Statement date")}
                    </TableHead>
                    <TableHead className="text-start">
                      {tr("المُعدّ", "Preparer")}
                    </TableHead>
                    <TableHead className="text-start">
                      {tr("الحالة", "Status")}
                    </TableHead>
                    <TableHead>
                      <span className="sr-only">{tr("عرض", "View")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedVersions.map((saved) => (
                    <TableRow key={saved.id}>
                      <TableCell>
                        <bdi>{saved.as_of_date}</bdi>
                      </TableCell>
                      <TableCell>{saved.created_by_name}</TableCell>
                      <TableCell>
                        {saved.status === "approved"
                          ? tr("معتمد داخليًا", "Internally approved")
                          : saved.status === "voided"
                          ? tr("ملغى", "Voided")
                          : tr("مسودة", "Draft")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => chooseSaved(saved)}
                        >
                          {tr("عرض النسخة", "View version")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
