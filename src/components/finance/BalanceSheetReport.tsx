import { useState } from "react";
import "./BalanceSheetReport.css";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Coins,
  Download,
  FileSpreadsheet,
  Landmark,
  Printer,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/date-field";
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
import { PagePanel } from "@/components/dashboard/workspace/PageKit";
import "@/components/dashboard/workspace/dashboard-workspace.css";
import "@/components/dashboard/workspace/page-kit.css";
import { FinancialReportLanguage, useFinancialReportLocale } from './FinancialReportLanguage';
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import {
  useBalanceSheetActions,
  useProfessionalBalanceSheet,
  useSavedBalanceSheets,
} from "@/hooks/finance/useProfessionalBalanceSheet";
import {
  useNegativeExplanations,
  useUpsertNegativeExplanation,
} from "@/hooks/finance/useFleetBridge";
import { financeToday } from "@/services/financialReporting";
import {
  balanceSheetErrorMessage,
  validateBalanceSheetDates,
} from "@/services/professionalBalanceSheet";
import {
  deriveBalanceSheetIndicators,
  formatBalanceSheetMoney,
  formatPublishedMoney,
  getBalanceSheetCheckMessage,
  getBalanceSheetRows,
  getPublishedBalanceSheetRows,
} from "@/utils/balanceSheetPresentation";
import {
  exportBalanceSheetArabicPdf,
  exportBalanceSheetExcel,
  exportBalanceSheetPDF,
  printBalanceSheet,
} from "@/utils/balanceSheetExport";
import type {
  BalanceSheetCheck,
  BalanceSheetLocale,
  BalanceSheetReviewConfirmations,
  SavedBalanceSheet,
} from "@/types/balanceSheet";
import type { NegativeBalanceExplanation } from "@/services/fleetBridge";

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
  const [comparison, setComparison] = useState(
    params.get("compare") || params.get("comparison") || ""
  );
  const [selected, setSelected] = useState<SavedBalanceSheet | null>(null);
  const [notes, setNotes] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [confirmations, setConfirmations] =
    useState<BalanceSheetReviewConfirmations>({ ...emptyConfirmations });
  const [selfAckChecked, setSelfAckChecked] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"published" | "working">("published");
  const live = useProfessionalBalanceSheet(asOf, comparison || null);
  const history = useSavedBalanceSheets();
  const actions = useBalanceSheetActions();
  const explanations = useNegativeExplanations(asOf);
  const upsertExplanation = useUpsertNegativeExplanation(asOf);
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
  // Sole-admin path: the generator may approve their own draft only with an
  // explicit documented self-review acknowledgment.
  const selfReviewEligible = Boolean(
    snapshot?.status === "draft" &&
      live.data?.permissions.canApprove &&
      snapshot.created_by === actorId &&
      !stale &&
      blocking.length === 0 &&
      report &&
      report.current.postedEntries > 0 &&
      !readFailed &&
      !readBusy
  );
  const approvalReady =
    (canApprove || selfReviewEligible) &&
    reviewNotes.trim().length >= 20 &&
    Object.values(confirmations).every(Boolean) &&
    (canApprove || selfAckChecked);
  const rows = report ? getBalanceSheetRows(report, locale) : [];
  const publishedRows = report ? getPublishedBalanceSheetRows(report, locale) : [];
  const indicators = report ? deriveBalanceSheetIndicators(report) : null;
  const money = (value: number) =>
    formatBalanceSheetMoney(value, report?.company.currency || "", locale);
  const publishedMoney = (value: number) => formatPublishedMoney(value, locale);
  // Variance is a reading aid: signed delta versus the comparison column, with the
  // percentage relative to the comparison base when that base is non-zero.
  const varianceText = (amount: number | null, comparison: number | null) => {
    if (amount == null || comparison == null) return "";
    const delta = Math.round((amount - comparison) * 100) / 100;
    const base = money(delta);
    if (comparison === 0) return base;
    const percent = Math.round((delta / Math.abs(comparison)) * 1000) / 10;
    return `${base} (${percent > 0 ? "+" : ""}${percent}%)`;
  };
  const ratioText = (value: number | null) =>
    value === null ? tr("—", "—") : `${value.toFixed(2)}×`;
  const status =
    snapshot?.status === "approved"
      ? tr("معتمد داخليًا", "Internally approved")
      : snapshot?.status === "voided"
      ? tr("نسخة ملغاة", "Voided version")
      : tr("مسودة غير معتمدة", "Unapproved draft");
  const statusTone =
    snapshot?.status === "approved"
      ? "is-ok"
      : snapshot?.status === "voided"
      ? "is-risk"
      : "is-warn";
  const hasStatement = Boolean(report && datesValid && !readFailed);

  const changeDates = (nextAsOf: string, nextComparison: string) => {
    setAsOf(nextAsOf);
    setComparison(nextComparison);
    setSelected(null);
    setNotes("");
    setReviewNotes("");
    setConfirmations({ ...emptyConfirmations });
    setSelfAckChecked(false);
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
      const exportReport = issuingSnapshot?.payload || report;
      const options = {
        report: exportReport,
        snapshot: issuingSnapshot,
        locale,
        face: viewMode,
      };
      if (type === "pdf") {
        // Text-based PDF with embedded Amiri: selectable, searchable Arabic —
        // the accounting-firm output standard. Falls back to the raster path
        // only if the font cannot be fetched (e.g. fully offline).
        try {
          await exportBalanceSheetArabicPdf(options);
        } catch {
          await exportBalanceSheetPDF(options);
        }
      }
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
          selfReviewAcknowledged: snapshot.created_by === actorId,
        })
      );
      setSelfAckChecked(false);
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
      className="balance-sheet-workspace dashboard-workspace"
      dir={ar ? "rtl" : "ltr"}
      data-testid="balance-sheet-report"
    >
      <div className="dw-container">
        <div className="bs-language">
          <FinancialReportLanguage />
        </div>

        <PagePanel
          number="01"
          title={tr("نطاق التقرير والإصدار", "Report scope and issuing")}
          subtitle={tr(
            "حدّد بداية النطاق ونهايته: تُعرض أرصدة نهاية النطاق مقابل أرصدة بدايته للمقارنة، مع المراجعة والاعتماد.",
            "Pick the start and end of the range: end-of-range balances are shown against start-of-range balances, with review and approval."
          )}
          className="wk-panel-full"
          action={<span className={`wk-badge ${statusTone}`}>{status}</span>}
        >
          <div className="wk-toolbar">
            <div className="wk-toolbar-group">
              <div className="bs-fields">
                <div className="space-y-2">
                  <Label htmlFor="bs-as-of">
                    {tr("من تاريخ (بداية النطاق)", "From date (range start)")}
                  </Label>
                  <DateField
                    value={comparison || undefined}
                    onChange={(value) => changeDates(asOf, value || "")}
                    placeholder={tr("اختر بداية النطاق", "Pick range start")}
                    maxDate={asOf ? new Date(`${asOf}T00:00:00Z`) : new Date()}
                    className="bs-date-field"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bs-comparison">
                    {tr("إلى تاريخ (نهاية النطاق)", "To date (range end)")}
                  </Label>
                  <DateField
                    value={asOf || undefined}
                    onChange={(value) => changeDates(value || financeToday(), comparison)}
                    placeholder={tr("اختر نهاية النطاق", "Pick range end")}
                    maxDate={new Date()}
                    className="bs-date-field"
                  />
                </div>
              </div>
            </div>
            <div
              className="dw-filters"
              role="group"
              aria-label={tr("تواريخ سريعة", "Quick dates")}
            >
              <button
                type="button"
                aria-pressed={viewMode === "published"}
                onClick={() => setViewMode("published")}
              >
                {tr("وجه النشر", "Published face")}
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "working"}
                onClick={() => setViewMode("working")}
              >
                {tr("ورقة العمل التفصيلية", "Detailed working paper")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const year = Number(financeToday().slice(0, 4)) - 1;
                  changeDates(`${year}-12-31`, `${year - 1}-12-31`);
                }}
              >
                {tr("السنة السابقة كاملة", "Previous full year")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const end = new Date(
                    `${financeToday().slice(0, 7)}-01T12:00:00Z`
                  );
                  end.setUTCDate(0);
                  const cutoff = end.toISOString().slice(0, 10);
                  changeDates(cutoff, `${Number(cutoff.slice(0, 4)) - 1}-12-31`);
                }}
              >
                {tr("من بداية السنة حتى نهاية الشهر السابق", "Year start to previous month end")}
              </button>
              {comparison && (
                <button type="button" onClick={() => changeDates(asOf, "")}>
                  {tr("بدون بداية (نقطة زمنية فقط)", "No range start (point in time)")}
                </button>
              )}
            </div>
          </div>
          <div className="bs-actions">
            <Link
              className="dw-button"
              to={`/finance/reports/financial-statements?asOf=${asOf}`}
            >
              {tr(
                "حزمة القوائم المالية والإيضاحات",
                "Financial statements and notes"
              )}
            </Link>
            <button
              type="button"
              className="dw-button"
              disabled={!canExport}
              onClick={() => void handleExport("pdf")}
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              className="dw-button"
              disabled={!canExport}
              onClick={() => void handleExport("excel")}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              type="button"
              className="dw-button"
              disabled={!canExport}
              onClick={() => void handleExport("print")}
            >
              <Printer className="h-4 w-4" />
              {tr("طباعة", "Print")}
            </button>
            <button
              type="button"
              className="dw-button"
              disabled={busy || !datesValid || readBusy}
              onClick={() => {
                void live.refetch();
                void history.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              {tr("تحديث", "Refresh")}
            </button>
            {snapshot && (
              <button
                type="button"
                className="dw-button"
                onClick={() => changeDates(asOf, comparison)}
              >
                {tr("العودة للأرصدة الحالية", "Return to current ledger")}
              </button>
            )}
          </div>
          <div className="bs-alerts">
            {!datesValid && (
              <p role="alert" className="is-error">
                {tr(
                  "بداية النطاق يجب أن تكون أسبق من نهايته، والنهاية حتى تاريخ اليوم.",
                  "The range start must be earlier than its end, and the end cannot be after today."
                )}
              </p>
            )}
            {readFailed && (
              <p role="alert" className="is-error">
                {versionUnavailable
                  ? tr(
                      "تعذر التحقق من حالة هذه النسخة في سجل النسخ الحالي. حدّث السجل قبل إصدارها.",
                      "This version is not available in the current history. Refresh its status before issuing it."
                    )
                  : balanceSheetErrorMessage(live.error || history.error, locale)}
              </p>
            )}
            {readBusy && (
              <div className="flex items-center gap-2" role="status">
                <LoadingSpinner />
                {tr(
                  "جارٍ التحقق من جميع الأرصدة…",
                  "Verifying all ledger balances…"
                )}
              </div>
            )}
            {stale && (
              <p role="alert" className="is-warn">
                {tr(
                  "تغيرت بيانات المصدر بعد حفظ هذه النسخة. تُعرض أرصدتها كما حُفظت؛ احفظ نسخة جديدة لاعتماد الأرصدة المحدثة.",
                  "Source data changed after this version was saved. Its saved balances are shown; save a new version to approve updated balances."
                )}
              </p>
            )}
          </div>
        </PagePanel>

        {hasStatement && report && (
          <>
            <section
              className="dw-metrics"
              aria-label={tr("إجماليات الميزانية", "Balance sheet totals")}
            >
              {(
                [
                  [tr("إجمالي الأصول", "Total assets"), report.current.assets, Landmark, true],
                  [tr("إجمالي الالتزامات", "Total liabilities"), report.current.liabilities, Wallet, false],
                  [tr("إجمالي حقوق الملكية", "Total equity"), report.current.equity, Scale, false],
                ] as const
              ).map(([label, amount, Icon, accent]) => (
                <div
                  key={label}
                  className={`dw-metric ${accent ? "dw-metric-accent" : ""}`}
                >
                  <div className="dw-metric-top">
                    <span>{label}</span>
                    <Icon size={19} />
                  </div>
                  <strong>
                    <bdi>{money(Number(amount))}</bdi>
                  </strong>
                  <div className="dw-metric-bottom">
                    <small>
                      {tr("نهاية النطاق", "End of range")} <bdi>{report.asOfDate}</bdi>
                    </small>
                  </div>
                </div>
              ))}
            </section>
            <div className="bs-equation-row">
              {Math.abs(report.current.imbalance) < 0.01 ? (
                <CheckCircle2 className="h-4 w-4" style={{ color: "#487038" }} />
              ) : (
                <AlertCircle className="h-4 w-4" style={{ color: "#b3694c" }} />
              )}
              <span>
                {tr("فرق المعادلة", "Accounting equation difference")}:{" "}
                <bdi>{money(report.current.imbalance)}</bdi>
              </span>
              <span style={{ color: "#7e8b73" }}>
                {tr(
                  "التوازن الحسابي لا يعني اكتمال الأرصدة أو اعتمادها.",
                  "Arithmetic balance does not establish completeness or approval."
                )}
              </span>
            </div>
            {report.current.postedEntries === 0 && (
              <p role="alert" className="dw-data-notice">
                {tr(
                  "لا توجد قيود مرحلة حتى هذا التاريخ. لا يجوز اعتماد قائمة فارغة.",
                  "No posted entries exist by this date. An empty statement cannot be approved."
                )}
              </p>
            )}

            <PagePanel
              number="02"
              title={tr("مؤشرات القراءة السريعة", "Quick reading indicators")}
              subtitle={tr(
                "مشتقة من أرصدة القائمة المعروضة نفسها.",
                "Derived from the displayed statement balances themselves."
              )}
              className="wk-panel-full"
            >
              <div
                className="wk-summary-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  paddingTop: "2px",
                }}
              >
                {indicators &&
                  [
                    [
                      tr("نسبة التداول", "Current ratio"),
                      ratioText(indicators.currentRatio),
                    ],
                    [
                      tr("نسبة السيولة السريعة", "Quick ratio"),
                      ratioText(indicators.quickRatio),
                    ],
                    [
                      tr("المديونية إلى حقوق الملكية", "Debt to equity"),
                      ratioText(indicators.debtToEquity),
                    ],
                    [
                      tr("رأس المال العامل", "Working capital"),
                      money(indicators.workingCapital),
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="wk-summary-tile is-info">
                      <small>{label}</small>
                      <strong>
                        <bdi>{value}</bdi>
                      </strong>
                    </div>
                  ))}
              </div>
              <p className="wk-more-note" style={{ paddingBottom: "14px" }}>
                {tr(
                  "مؤشرات مشتقة من أرصدة القائمة نفسها للقراءة السريعة، وليست بنودًا فيها. تظهر «—» عند عدم توفر أساس حساب.",
                  "Derived from the displayed statement balances for quick reading; they are not statement line items. A dash appears when no calculation base exists."
                )}
              </p>
              {indicators && indicators.classificationTotal > 0 && (
                <div
                  className="space-y-1.5"
                  style={{ padding: "0 24px 20px", marginTop: "-6px" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      {tr(
                        "اكتمال تصنيف بنود القائمة",
                        "Statement classification coverage"
                      )}
                    </span>
                    <span className="tabular-nums">
                      {indicators.classificationTotal -
                        indicators.classificationUnclassified}{" "}
                      / {indicators.classificationTotal} ·{" "}
                      {Math.round(
                        ((indicators.classificationTotal -
                          indicators.classificationUnclassified) /
                          indicators.classificationTotal) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(
                      ((indicators.classificationTotal -
                        indicators.classificationUnclassified) /
                        indicators.classificationTotal) *
                        100
                    )}
                    aria-label={tr(
                      "اكتمال تصنيف بنود القائمة",
                      "Statement classification coverage"
                    )}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.round(
                          ((indicators.classificationTotal -
                            indicators.classificationUnclassified) /
                            indicators.classificationTotal) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  {indicators.classificationUnclassified > 0 && (
                    <p className="text-sm">
                      {tr(
                        "بنود تظهر تحت «تحتاج إلى تصنيف»:",
                        "Items shown under “awaiting classification”:"
                      )}{" "}
                      <bdi>{indicators.classificationUnclassified}</bdi>{" "}
                      <Link
                        className="underline"
                        to="/finance/chart-of-accounts"
                      >
                        {tr(
                          "تصنيف البنود المتبقية",
                          "Classify the remaining items"
                        )}
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </PagePanel>

            <PagePanel
              number="03"
              title={
                ar
                  ? report.company.nameAr || report.company.name
                  : report.company.name
              }
              subtitle={`${tr("السجل التجاري", "Commercial register")}: ${
                report.company.commercialRegister ||
                tr("غير مسجل", "Not recorded")
              } · ${report.company.currency} · ${tr("كما في", "As of")} ${
                report.asOfDate
              }`}
              className="wk-panel-full"
            >
              <div className="wk-table-wrap bs-statement">
                {viewMode === "published" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">
                        {tr("البند", "Item")}
                      </TableHead>
                      <TableHead className="text-start">
                        {tr("الإيضاح", "Note")}
                      </TableHead>
                      <TableHead className="bs-num">
                        {tr("الرصيد في نهاية النطاق", "End of range")}{" "}
                        <bdi>{report.asOfDate}</bdi>
                      </TableHead>
                      {report.comparisonDate && (
                        <TableHead className="bs-num">
                          {tr("الرصيد في بداية النطاق", "Start of range")}{" "}
                          <bdi>{report.comparisonDate}</bdi>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {publishedRows.map((row) => (
                      <TableRow
                        key={row.key}
                        className={row.kind === "total" ? "bs-total bs-total-published" : "bs-published-row"}
                      >
                        <TableCell className="min-w-40">
                          {row.label}
                        </TableCell>
                        <TableCell>
                          {row.note != null ? (
                            <bdi>{tr(`إيضاح ${row.note}`, `Note ${row.note}`)}</bdi>
                          ) : (
                            ""
                          )}
                        </TableCell>
                        <TableCell className="bs-num">
                          <bdi>
                            {row.amount == null ? "" : publishedMoney(row.amount)}
                          </bdi>
                        </TableCell>
                        {report.comparisonDate && (
                          <TableCell className="bs-num">
                            <bdi>
                              {row.comparisonAmount == null
                                ? ""
                                : publishedMoney(row.comparisonAmount)}
                            </bdi>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">
                        {tr("البند", "Item")}
                      </TableHead>
                      <TableHead className="text-start">
                        {tr("الحساب", "Account")}
                      </TableHead>
                      <TableHead className="bs-num">
                        {tr("الرصيد في نهاية النطاق", "End of range")}{" "}
                        <bdi>{report.asOfDate}</bdi>
                      </TableHead>
                      {report.comparisonDate && (
                        <TableHead className="bs-num">
                          {tr("الرصيد في بداية النطاق", "Start of range")}{" "}
                          <bdi>{report.comparisonDate}</bdi>
                        </TableHead>
                      )}
                      {report.comparisonDate && (
                        <TableHead className="bs-num">
                          {tr("الانحراف", "Variance")}
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
                            ? "bs-section"
                            : row.kind === "total"
                            ? "bs-total"
                            : row.kind === "subtotal"
                            ? "bs-subtotal"
                            : row.kind === "result"
                            ? "bs-result"
                            : ""
                        }
                      >
                        <TableCell className="min-w-40">
                          {row.label}
                        </TableCell>
                        <TableCell>
                          <bdi>{row.code || ""}</bdi>
                        </TableCell>
                        <TableCell className="bs-num">
                          <bdi>
                            {row.amount == null ? "" : money(row.amount)}
                          </bdi>
                        </TableCell>
                        {report.comparisonDate && (
                          <TableCell className="bs-num">
                            <bdi>
                              {row.comparisonAmount == null
                                ? ""
                                : money(row.comparisonAmount)}
                            </bdi>
                          </TableCell>
                        )}
                        {report.comparisonDate && (
                          <TableCell className="bs-num">
                            <bdi>
                              {varianceText(row.amount, row.comparisonAmount)}
                            </bdi>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </div>
              <p className="wk-more-note">
                {viewMode === "published"
                  ? tr(
                      "وجه النشر يعرض بنودًا مجمعة بدون رموز حسابات، والأرقام السالبة بين قوسين. رمز العملة يذكر مرة واحدة: العملة " +
                        (report.company.currency || "غير محددة") +
                        ". التفاصيل الحسابية في «ورقة العمل التفصيلية».",
                      "The published face shows aggregated captions without account codes; negatives appear in parentheses. The currency is stated once: " +
                        (report.company.currency || "unspecified") +
                        ". Full account detail is in the detailed working paper."
                    )
                  : tr(
                      "النتيجة غير المقفلة هي صافي أرصدة الإيرادات والمصروفات المتبقية حتى تاريخ القائمة، وقد تشمل سنوات سابقة. قيود الإقفال والعكس المرحلة مشمولة بحسب تاريخها.",
                      "Unclosed results are the remaining cumulative revenue and expense balances, which may include prior years. Posted closing and reversal entries are included by their accounting dates."
                    )}
              </p>
            </PagePanel>

            <PagePanel
              number="04"
              title={tr("فحوص الجاهزية والملاحظات", "Readiness checks and findings")}
              subtitle={tr(
                "عالج الملاحظات المانعة، وراجع المستندات المؤيدة قبل الاعتماد.",
                "Resolve blocking findings and review supporting records before approval."
              )}
              className="wk-panel-full"
            >
              <div className="bs-checklist">
                {!report.checks.some((check) => check.count > 0) ? (
                  <p>
                    {tr(
                      "لم تكشف الفحوص الآلية عن مخالفات. تظل المراجعة المحاسبية مطلوبة.",
                      "Automated checks found no issues. Accounting review is still required."
                    )}
                  </p>
                ) : (
                  <ul>
                    {report.checks
                      .filter((check) => check.count > 0)
                      .map((check, index) => {
                        const detail = check.detail ?? [];
                        const accountEntries = detail.filter(
                          (entry) => !entry.number
                        );
                        const journalEntries = detail.filter(
                          (entry) => entry.number
                        );
                        const classifyCodes = new Set([
                          "unclassified_accounts",
                          "missing_account_subtype",
                        ]);
                        const journalActionCodes = new Set([
                          "malformed_journal_lines",
                          "insufficient_journal_lines",
                          "unbalanced_journals",
                          "journal_header_mismatch",
                          "invalid_reversal_link",
                        ]);
                        const scopeLabel =
                          check.scope === "comparison_only"
                            ? tr(
                                "(ملاحظة خاصة بعمود بداية النطاق)",
                                "(range-start column finding)"
                              )
                            : check.scope === "current_register"
                            ? tr(
                                "(فحص بيانات حالية — ليس رصيد تاريخي)",
                                "(current-register data check, not a historical balance)"
                              )
                            : "";
                        // The server stamps each check row with its scope;
                        // comparison-only rows are labeled in the UI below.
                        return (
                          <li
                            key={`${check.code}:${check.asOfDate}:${index}`}
                            className={
                              check.severity === "error" ? "is-error" : "is-warn"
                            }
                          >
                          <AlertCircle
                            className="h-4 w-4"
                            style={{
                              color:
                                check.severity === "error"
                                  ? "#b3694c"
                                  : "#9b7c36",
                            }}
                          />
                          <span>
                            <strong>
                              {check.severity === "error"
                                ? tr("مانع للاعتماد", "Blocks approval")
                                : tr("يتطلب مراجعة", "Review required")}
                            </strong>{" "}
                            — {getBalanceSheetCheckMessage(check, locale)}
                            {scopeLabel && (
                              <em className="bs-check-scope"> {scopeLabel}</em>
                            )}
                          </span>
                          <span className="bs-check-actions">
                            {classifyCodes.has(check.code) &&
                              accountEntries.slice(0, 4).map((entry) => (
                                <Link
                                  key={entry.id}
                                  className="dw-button"
                                  style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                                  to={`/finance/chart-of-accounts?focus=${entry.id}`}
                                >
                                  {tr("صنّف الحساب", "Classify account")}{" "}
                                  <bdi>{entry.code}</bdi>
                                </Link>
                              ))}
                            {classifyCodes.has(check.code) &&
                              accountEntries.length > 4 && (
                                <Link
                                  className="dw-button"
                                  style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                                  to="/finance/chart-of-accounts"
                                >
                                  {tr(
                                    `و${accountEntries.length - 4} حسابات أخرى`,
                                    `+${accountEntries.length - 4} more accounts`
                                  )}
                                </Link>
                              )}
                            {check.code === "legacy_posting_accounts" &&
                              accountEntries.slice(0, 4).map((entry) => (
                                <Link
                                  key={entry.id}
                                  className="dw-button"
                                  style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                                  to={`/finance/chart-of-accounts?focus=${entry.id}`}
                                >
                                  {tr("راجع الحساب", "Review account")}{" "}
                                  <bdi>{entry.code}</bdi>
                                </Link>
                              ))}
                            {check.code === "negative_asset_balances" && (
                              <NegativeExplanationEditor
                                check={check}
                                asOf={asOf}
                                locale={locale}
                                money={money}
                                explanations={explanations.data ?? []}
                                pending={upsertExplanation.isPending}
                                onSave={(accountId, text) =>
                                  upsertExplanation.mutateAsync({
                                    accountId,
                                    explanation: text,
                                  })
                                }
                              />
                            )}
                            {check.code === "draft_entries" && (
                              <Link
                                className="dw-button"
                                style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                                to="/finance/journal-entries?status=draft"
                              >
                                {tr(
                                  "أعرض القيود المسودة",
                                  "Show draft entries"
                                )}
                              </Link>
                            )}
                            {journalActionCodes.has(check.code) && (
                              <Link
                                className="dw-button"
                                style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                                to="/finance/journal-entries?status=posted"
                              >
                                {tr(
                                  "أعرض القيود المرحلة",
                                  "Show posted entries"
                                )}
                              </Link>
                            )}
                            {(check.code.startsWith("current_vehicles") ||
                              check.code === "no_fixed_asset_movements") && (
                              <>
                                <Link
                                  className="dw-button"
                                  style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                                  to={`/finance/fleet-bridge?asOf=${asOf}`}
                                >
                                  <Car className="h-3.5 w-3.5" />
                                  {tr("رحّل مركبة", "Bridge a vehicle")}
                                </Link>
                                <Link
                                  className="dw-button"
                                  style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                                  to="/fleet"
                                >
                                  {tr(
                                    "استكمل بيانات الأسطول",
                                    "Complete fleet data"
                                  )}
                                </Link>
                              </>
                            )}
                            {(check.code === "missing_company_identity" ||
                              check.code === "missing_company_currency") && (
                              <Link
                                className="dw-button"
                                style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                                to="/finance/settings"
                              >
                                {tr(
                                  "استكمل بيانات الشركة",
                                  "Complete company data"
                                )}
                              </Link>
                            )}
                            {journalEntries.length > 0 && (
                              <span className="bs-check-ref">
                                <bdi>
                                  {journalEntries
                                    .slice(0, 3)
                                    .map((entry) => entry.number)
                                    .join("، ")}
                                </bdi>
                                {journalEntries.length > 3 &&
                                  ` ${tr(
                                    `و${journalEntries.length.toLocaleString(
                                      "ar-QA"
                                    )} قيد إجمالاً`,
                                    `— ${journalEntries.length.toLocaleString(
                                      "en-QA"
                                    )} entries in total`
                                  )}`}
                              </span>
                            )}
                          </span>
                        </li>
                        );
                      })}
                  </ul>
                )}
                <div className="bs-status-links">
                  <Link className="underline" to="/finance/chart-of-accounts">
                    {tr("تصنيف الحسابات", "Account classification")}
                  </Link>
                  <Link className="underline" to={`/finance/fleet-bridge?asOf=${asOf}`}>
                    {tr("ترحيل الأسطول والتمويل", "Fleet & financing bridge")}
                  </Link>
                  <Link className="underline" to="/finance/journal-entries?status=draft">
                    {tr("القيود المسودة", "Draft entries")}
                  </Link>
                  <Link className="underline" to="/finance/assets">
                    {tr("الأصول والإهلاك", "Assets and depreciation")}
                  </Link>
                </div>
              </div>
            </PagePanel>

            {!snapshot && (
              <PagePanel
                number="05"
                title={tr("حفظ نسخة للمراجعة", "Save a version for review")}
                subtitle={tr(
                  "تُحسب النسخة وتحفظ من قاعدة البيانات مع مرجع ثابت. الحفظ لا يعني الاعتماد.",
                  "The database generates and stores a fixed version. Saving does not approve it."
                )}
                className="wk-panel-full"
              >
                <div className="bs-workflow">
                  <div className="space-y-2">
                    <Label htmlFor="bs-notes">
                      {tr("إيضاحات المُعدّ", "Preparer notes")}
                    </Label>
                    <Textarea
                      id="bs-notes"
                      value={notes}
                      maxLength={5000}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="dw-button dw-button-primary"
                    disabled={!canExport || !live.data?.permissions.canSave}
                    onClick={() => void save()}
                  >
                    <Save className="h-4 w-4" />
                    {tr("حفظ نسخة للمراجعة", "Save for review")}
                  </button>
                </div>
              </PagePanel>
            )}
            {snapshot && (
              <PagePanel
                number="05"
                title={tr("سجل النسخة والاعتماد", "Version and approval record")}
                subtitle={`${tr("المرجع", "Reference")}: ${snapshot.id}`}
                className="wk-panel-full"
              >
                <div className="bs-workflow">
                  <dl>
                    <div>
                      <dt>{tr("أعدّها", "Prepared by")}</dt>
                      <dd>
                        {snapshot.created_by_name} ·{" "}
                        <bdi>{snapshot.created_at.slice(0, 10)}</bdi>
                      </dd>
                    </div>
                    {snapshot.approved_at && (
                      <div>
                        <dt>
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
                  <p className="text-sm" style={{ color: "#7e8b73" }}>
                    {tr(
                      "الاعتماد الداخلي يسجل مراجعة المستخدم المخول، ولا يمثل تقرير تدقيق خارجي أو توقيع مدقق مستقل.",
                      "Internal approval records an authorized user’s review. It is not an external audit opinion or independent auditor signature."
                    )}
                  </p>
                  {snapshot.status === "draft" && (
                    <>
                      {snapshot.created_by === actorId && !selfReviewEligible && (
                        <p className="text-sm">
                          {tr(
                            "يجب أن يراجع النسخة ويعتمدها مستخدم مخول آخر غير مُعدّها.",
                            "A different authorized user must review and approve this version."
                          )}
                        </p>
                      )}
                      {selfReviewEligible && (
                        <div
                          className="bs-self-ack"
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            border: "1px solid #e3d9c4",
                            background: "#fdfaf1",
                            borderRadius: 9,
                            padding: "10px 12px",
                          }}
                        >
                          <Checkbox
                            id="bs-self-ack"
                            checked={selfAckChecked}
                            onCheckedChange={(value) =>
                              setSelfAckChecked(value === true)
                            }
                          />
                          <Label
                            className="text-sm leading-relaxed"
                            htmlFor="bs-self-ack"
                            style={{ color: "#6d5c34" }}
                          >
                            {tr(
                              "إقرار ذاتي موثق: أنا مُعدّ هذه النسخة، وأعتمدها بعد مراجعتي الشخصية، مع تسجيل سبب الاستثناء من قاعدة فصل المهام في سجل الاعتماد (يلزم أيضاً نتيجة مراجعة من ٢٠ حرفاً على الأقل).",
                              "Documented self-review: I prepared this version and approve it after my own review; the segregation-of-duties exception is recorded in the approval audit trail (a review conclusion of at least 20 characters is also required)."
                            )}
                          </Label>
                        </div>
                      )}
                      {(canApprove || selfReviewEligible) && (
                        <>
                          <fieldset>
                            <legend>
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
                              <div
                                key={key}
                                className="flex items-start gap-2"
                              >
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
                          <div className="space-y-2">
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
                          </div>
                        </>
                      )}
                      <button
                        type="button"
                        className="dw-button dw-button-primary"
                        disabled={!approvalReady || busy}
                        onClick={() => void approve()}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {tr(
                          "تسجيل الاعتماد الداخلي",
                          "Record internal approval"
                        )}
                      </button>
                    </>
                  )}
                  {snapshot.status !== "voided" &&
                    (snapshot.created_by === actorId ||
                      live.data?.permissions.canApprove) && (
                      <details className="bs-void">
                        <summary>
                          {tr(
                            "إلغاء النسخة مع حفظ سجلها",
                            "Void this version and retain its history"
                          )}
                        </summary>
                        <div className="space-y-3">
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
                          <button
                            type="button"
                            className="dw-button"
                            disabled={busy || voidReason.trim().length < 20}
                            onClick={() => void voidSaved()}
                          >
                            {tr("إلغاء هذه النسخة", "Void this version")}
                          </button>
                        </div>
                      </details>
                    )}
                  {snapshot.status === "voided" && (
                    <p className="text-sm" style={{ color: "#b3694c" }}>
                      {snapshot.void_reason ||
                        tr(
                          "أُلغيت النسخة ولا يمكن إصدارها.",
                          "This version was voided and cannot be issued."
                        )}
                    </p>
                  )}
                  <p className="bs-fingerprint" dir="ltr">
                    SHA-256 {snapshot.source_fingerprint}
                  </p>
                </div>
              </PagePanel>
            )}
          </>
        )}

        <PagePanel
          number={hasStatement ? "06" : "02"}
          title={`${tr("النسخ المحفوظة", "Saved versions")}${
            savedVersions.length
              ? ` (${savedVersions.length}${
                  savedVersions.filter((row) => row.status === "approved").length
                    ? ` — ${savedVersions.filter((row) => row.status === "approved").length} ${tr("معتمدة", "approved")}`
                    : ""
                })`
              : ""
          }`}
          subtitle={tr(
            "آخر 50 نسخة؛ يحتفظ النظام بالنسخ الملغاة وسجل مراجعتها.",
            "Latest 50 versions; voided versions and their review history are retained."
          )}
          className="wk-panel-full"
        >
          {history.error ? (
            <div className="bs-alerts">
              <p role="alert" className="is-error">
                {balanceSheetErrorMessage(history.error, locale)}
              </p>
            </div>
          ) : history.isLoading ? (
            <div className="bs-alerts">
              <LoadingSpinner />
            </div>
          ) : !savedVersions.length ? (
            <p className="wk-more-note" style={{ paddingTop: "4px" }}>
              {tr("لم تُحفظ نسخ بعد.", "No versions have been saved yet.")}
            </p>
          ) : (
            <div className="wk-table-wrap bs-statement">
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
                        <button
                          type="button"
                          className="dw-button"
                          style={{
                            minHeight: 34,
                            padding: "0 12px",
                            fontSize: 11,
                          }}
                          disabled={busy}
                          onClick={() => chooseSaved(saved)}
                        >
                          {tr("عرض النسخة", "View version")}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PagePanel>

        <footer className="dw-footer">
          <span>
            Fleetify <span>/</span> {tr("الميزانية العمومية", "Balance sheet")}
          </span>
          <span role="status">
            {report
              ? `${tr("وقت استخراج الأرصدة", "Balances extracted")} ${new Date(
                  report.generatedAt
                ).toLocaleTimeString(ar ? "ar-QA" : "en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
          </span>
        </footer>
      </div>
    </div>
  );
}

/**
 * Inline editor for documented explanations of negative asset balances.
 * Approval is blocked server-side while any credit-balance asset lacks a
 * saved explanation at the reporting date.
 */
function NegativeExplanationEditor({
  check,
  asOf,
  locale,
  money,
  explanations,
  pending,
  onSave,
}: {
  check: BalanceSheetCheck;
  asOf: string;
  locale: BalanceSheetLocale;
  money: (value: number) => string;
  explanations: NegativeBalanceExplanation[];
  pending: boolean;
  onSave: (accountId: string, explanation: string) => Promise<unknown>;
}) {
  const tr = (arabic: string, english: string) => (locale === "ar" ? arabic : english);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const entries = (check.detail ?? []).filter((entry) => !entry.number);

  const save = async (accountId: string) => {
    const text = (drafts[accountId] ?? "").trim();
    if (text.length < 10) return;
    await onSave(accountId, text);
  };

  return (
    <div className="bs-explain">
      <button
        type="button"
        className="dw-button"
        style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
        onClick={() => setOpen((value) => !value)}
      >
        {tr("تفسير الرصيد السالب", "Explain negative balance")}
      </button>
      {open && (
        <div className="bs-explain-body">
          <p className="bs-explain-note">
            {tr(
              `الاعتماد يُرفض ما دام أصلٌ ذو رصيد دائن بلا تفسير محفوظ بتاريخ التقرير (${asOf}).`,
              `Approval is blocked while any credit-balance asset lacks a saved explanation at the reporting date (${asOf}).`
            )}
          </p>
          <ul>
            {entries.map((entry) => {
              const existing = explanations.find(
                (row) => row.account_id === entry.id
              );
              const value =
                drafts[entry.id] ?? existing?.explanation ?? "";
              return (
                <li key={entry.id}>
                  <div className="bs-explain-head">
                    <strong>
                      <bdi>{entry.code}</bdi>
                    </strong>
                    {entry.balance != null && (
                      <span>
                        <bdi>{money(entry.balance)}</bdi>
                      </span>
                    )}
                    {existing ? (
                      <span className="wk-badge is-ok">
                        {tr("مفسَّر", "Explained")}
                      </span>
                    ) : (
                      <span className="wk-badge is-warn">
                        {tr("بلا تفسير", "Unexplained")}
                      </span>
                    )}
                  </div>
                  <Textarea
                    aria-label={tr(
                      `تفسير رصيد الحساب ${entry.code}`,
                      `Explanation for account ${entry.code}`
                    )}
                    value={value}
                    maxLength={2000}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [entry.id]: event.target.value,
                      }))
                    }
                    placeholder={tr(
                      "سبب الرصيد الدائن (دفعة مقدمة، إعادة تصنيف، تصحيح…) — ١٠ أحرف على الأقل.",
                      "Reason for the credit balance (advance, reclass, correction…) — at least 10 characters."
                    )}
                  />
                  <button
                    type="button"
                    className="dw-button"
                    style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                    disabled={pending || value.trim().length < 10}
                    onClick={() => void save(entry.id)}
                  >
                    {pending
                      ? tr("جارٍ الحفظ…", "Saving…")
                      : tr("حفظ التفسير", "Save explanation")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
