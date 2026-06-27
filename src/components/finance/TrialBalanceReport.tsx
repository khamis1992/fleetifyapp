import { useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Download, FileSpreadsheet, FileText, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { TrialBalanceItem, useTrialBalance } from "@/hooks/useGeneralLedger";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildTrialBalanceReport } from "@/utils/standardFinancialReportRules";
import {
  exportOfficialFinancialReportToExcel,
  exportOfficialFinancialReportToPDF,
  type OfficialFinancialReportExportPayload,
} from "@/utils/officialFinancialReportExport";

export function TrialBalanceReport() {
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const { data: trialBalanceData, isLoading, error } = useTrialBalance(asOfDate);
  const { formatCurrency } = useCurrencyFormatter();

  const rows = trialBalanceData || [];
  const totalDebits = rows.reduce((sum, item) => sum + Number(item.debit_balance || 0), 0);
  const totalCredits = rows.reduce((sum, item) => sum + Number(item.credit_balance || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.01;

  const summary = useMemo(() => {
    const activeRows = rows.filter((item) => Number(item.debit_balance || 0) > 0 || Number(item.credit_balance || 0) > 0);
    const parentRows = rows.filter((item) => Number(item.account_level || 0) <= 2);
    return {
      accounts: rows.length,
      activeAccounts: activeRows.length,
      parentAccounts: parentRows.length,
    };
  }, [rows]);

  const auditReport = useMemo(
    () =>
      buildTrialBalanceReport(
        rows.map((item) => ({
          accountCode: item.account_code,
          accountName: displayName(item),
          accountType: item.account_type || "",
          debit: Number(item.debit_balance || 0),
          credit: Number(item.credit_balance || 0),
        })),
      ),
    [rows],
  );

  const buildOfficialPayload = (): OfficialFinancialReportExportPayload => ({
    metadata: {
      reportTitle: "\u0645\u064a\u0632\u0627\u0646 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
      reportType: "trial_balance",
      companyName: "Fleetify",
      asOfDate,
      currency: "QAR",
      generatedAt: new Date().toISOString(),
      status: isBalanced ? "published" : "draft",
      sourceFingerprint: auditReport.sourceFingerprint,
      reportHash: auditReport.sourceFingerprint,
    },
    columns: [
      { key: "accountCode", header: "\u0631\u0645\u0632 \u0627\u0644\u062d\u0633\u0627\u0628", width: 18 },
      { key: "accountName", header: "\u0627\u0633\u0645 \u0627\u0644\u062d\u0633\u0627\u0628", width: 42 },
      { key: "accountType", header: "\u0627\u0644\u0646\u0648\u0639", width: 16 },
      { key: "level", header: "\u0627\u0644\u0645\u0633\u062a\u0648\u0649", width: 10 },
      { key: "debit", header: "\u0645\u062f\u064a\u0646", type: "money", width: 18 },
      { key: "credit", header: "\u062f\u0627\u0626\u0646", type: "money", width: 18 },
    ],
    rows: rows.map((item) => ({
      accountCode: item.account_code,
      accountName: displayName(item),
      accountType: accountTypeLabel(item.account_type),
      level: item.account_level || "",
      debit: Number(item.debit_balance || 0),
      credit: Number(item.credit_balance || 0),
    })),
    summaryRows: [
      {
        accountCode: "",
        accountName: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
        accountType: "",
        level: "",
        debit: totalDebits,
        credit: totalCredits,
      },
      {
        accountCode: "",
        accountName: "\u0627\u0644\u0641\u0631\u0642",
        accountType: isBalanced ? "\u0645\u062a\u0648\u0627\u0632\u0646" : "\u063a\u064a\u0631 \u0645\u062a\u0648\u0627\u0632\u0646",
        level: "",
        debit: difference,
        credit: "",
      },
    ],
  });

  const handleExportExcel = async () => {
    if (!rows.length) {
      toast.error("\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631");
      return;
    }

    try {
      await exportOfficialFinancialReportToExcel(buildOfficialPayload());
      toast.success("\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0645\u064a\u0632\u0627\u0646 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0628\u0635\u064a\u063a\u0629 Excel \u0631\u0633\u0645\u064a\u0629");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("\u062a\u0639\u0630\u0631 \u062a\u0635\u062f\u064a\u0631 \u0645\u0644\u0641 Excel");
    }
  };

  const handleExportCSV = () => {
    if (!rows.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = ["رمز الحساب", "اسم الحساب", "النوع", "المستوى", "مدين", "دائن"];
    const body = rows.map((item) => [
      item.account_code,
      displayName(item),
      accountTypeLabel(item.account_type),
      item.account_level || "",
      Number(item.debit_balance || 0),
      Number(item.credit_balance || 0),
    ]);
    body.push(["", "الإجمالي", "", "", totalDebits, totalCredits]);

    const csv = [
      "ميزان المراجعة",
      `كما في,${asOfDate}`,
      "",
      headers.join(","),
      ...body.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      "",
      `الفرق,${difference}`,
      `الحالة,${isBalanced ? "متوازن" : "غير متوازن"}`,
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trial_balance_${asOfDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملف CSV");
  };

  const handleExportPDF = async () => {
    if (!rows.length) {
      toast.error("\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631");
      return;
    }

    try {
      await exportOfficialFinancialReportToPDF(buildOfficialPayload());
      toast.success("\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0645\u064a\u0632\u0627\u0646 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0628\u0635\u064a\u063a\u0629 PDF \u0631\u0633\u0645\u064a\u0629");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("\u062a\u0639\u0630\u0631 \u062a\u0635\u062f\u064a\u0631 \u0645\u0644\u0641 PDF");
    }
  };

  if (error) {
    return (
      <Card className="trial-balance-shell border-[#E5EAF1]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-[#FB6B7A]">
            <AlertCircle className="h-5 w-5" />
            <p className="font-bold">حدث خطأ في تحميل بيانات ميزان المراجعة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="trial-balance-redesign space-y-5" dir="rtl">
      <section className="trial-command">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <span className="trial-command-icon">
              <Scale className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#94A3B8]">Trial Balance</p>
              <h3 className="mt-1 text-xl font-black text-[#020617]">ميزان المراجعة</h3>
              <p className="mt-1 text-sm leading-7 text-[#94A3B8]">
                عرض أرصدة الحسابات المدينة والدائنة كما في تاريخ محدد مع حالة التوازن والفارق.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[190px] space-y-2">
              <Label htmlFor="asOfDate" className="text-xs font-black text-[#94A3B8]">
                كما في تاريخ
              </Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  id="asOfDate"
                  type="date"
                  value={asOfDate}
                  onChange={(event) => setAsOfDate(event.target.value)}
                  className="h-10 border-[#E5EAF1] bg-white pr-10"
                />
              </div>
            </div>
            <Button onClick={handleExportPDF} variant="outline" size="sm" disabled={isLoading || !rows.length} className="gap-2 border-[#E5EAF1] bg-white">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline" size="sm" disabled={isLoading || !rows.length} className="gap-2 border-[#E5EAF1] bg-white">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={isLoading || !rows.length} className="gap-2 border-[#E5EAF1] bg-white">
              <FileText className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <TrialSummary title="إجمالي المدين" value={formatCurrency(totalDebits)} tone="info" />
          <TrialSummary title="إجمالي الدائن" value={formatCurrency(totalCredits)} tone="success" />
          <TrialSummary title="الفارق" value={formatCurrency(difference)} tone={isBalanced ? "success" : "alert"} />
          <div className={cn("trial-status", isBalanced ? "is-balanced" : "is-unbalanced")}>
            {isBalanced ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{isBalanced ? "متوازن" : "غير متوازن"}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MiniStat title="الحسابات المعروضة" value={summary.accounts} />
        <MiniStat title="حسابات لها حركة" value={summary.activeAccounts} />
        <MiniStat title="حسابات رئيسية" value={summary.parentAccounts} />
      </section>

      <section className="trial-table-shell">
        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="border-[#E5EAF1] bg-[#F6F8FB]">
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">رمز الحساب</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">اسم الحساب</TableHead>
                  <TableHead className="text-center text-xs font-black text-[#94A3B8]">النوع</TableHead>
                  <TableHead className="text-center text-xs font-black text-[#94A3B8]">المستوى</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">مدين</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">دائن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item, index) => {
                  const isParent = Number(item.account_level || 0) <= 2;
                  return (
                    <TableRow key={`${item.account_id}-${index}`} className={cn("border-[#E5EAF1]/70", isParent && "bg-[#F6F8FB] font-bold")}>
                      <TableCell className="font-mono text-sm text-[#020617]">{item.account_code}</TableCell>
                      <TableCell className="min-w-[280px]">
                        <div className="font-bold text-[#020617]">{displayName(item)}</div>
                        {item.account_name_ar && item.account_name_ar !== item.account_name && (
                          <div className="text-xs text-[#94A3B8]">{item.account_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-[#E5EAF1] bg-white text-[#64748B]">
                          {accountTypeLabel(item.account_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="trial-level">{item.account_level || "-"}</span>
                      </TableCell>
                      <TableCell className="text-right font-black text-[#38BDF8]">
                        {Number(item.debit_balance || 0) > 0 ? formatCurrency(Number(item.debit_balance)) : <span className="text-[#CBD5E1]">-</span>}
                      </TableCell>
                      <TableCell className="text-right font-black text-[#22C7A1]">
                        {Number(item.credit_balance || 0) > 0 ? formatCurrency(Number(item.credit_balance)) : <span className="text-[#CBD5E1]">-</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableRow className="border-t-2 border-[#020617] bg-[#020617] text-white hover:bg-[#020617]">
                  <TableCell colSpan={4} className="text-center text-base font-black text-white">
                    الإجمالي
                  </TableCell>
                  <TableCell className="text-right text-base font-black text-white">{formatCurrency(totalDebits)}</TableCell>
                  <TableCell className="text-right text-base font-black text-white">{formatCurrency(totalCredits)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
            <FileText className="mb-4 h-14 w-14 text-[#CBD5E1]" />
            <p className="text-lg font-black text-[#020617]">لا توجد بيانات لعرضها</p>
            <p className="mt-1 text-sm text-[#94A3B8]">قم بإنشاء وترحيل قيود محاسبية لظهور ميزان المراجعة.</p>
          </div>
        )}
      </section>

      {rows.length > 0 && (
        <section className={cn("trial-balance-note", isBalanced ? "is-balanced" : "is-unbalanced")}>
          {isBalanced ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <div>
            <p className="font-black">{isBalanced ? "ميزان المراجعة متوازن" : "يوجد فرق في ميزان المراجعة"}</p>
            <p className="text-sm">
              المدين {formatCurrency(totalDebits)}، الدائن {formatCurrency(totalCredits)}
              {!isBalanced && `، الفارق ${formatCurrency(difference)}`}
            </p>
          </div>
        </section>
      )}

      <style>{`
        .trial-balance-redesign .trial-command,
        .trial-balance-redesign .trial-table-shell,
        .trial-balance-redesign .trial-balance-note {
          border: 1px solid #E5EAF1;
          background: #FFFFFF;
          border-radius: 8px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .trial-balance-redesign .trial-command {
          position: relative;
          overflow: hidden;
          padding: 18px;
        }

        .trial-balance-redesign .trial-command::before {
          content: "";
          position: absolute;
          inset-inline-start: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: linear-gradient(180deg, #38BDF8, #22C7A1, #7C83F6, #FB6B7A);
        }

        .trial-balance-redesign .trial-command-icon {
          display: flex;
          width: 46px;
          height: 46px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 8px;
          color: #38BDF8;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.24);
        }

        .trial-balance-redesign .trial-summary,
        .trial-balance-redesign .trial-mini-stat {
          border: 1px solid #E5EAF1;
          background: #F6F8FB;
          border-radius: 8px;
          padding: 14px;
        }

        .trial-balance-redesign .trial-summary span,
        .trial-balance-redesign .trial-mini-stat span {
          display: block;
          font-size: 12px;
          font-weight: 900;
          color: #94A3B8;
        }

        .trial-balance-redesign .trial-summary strong,
        .trial-balance-redesign .trial-mini-stat strong {
          display: block;
          margin-top: 8px;
          color: #020617;
          font-size: 20px;
          font-weight: 950;
        }

        .trial-balance-redesign .trial-status,
        .trial-balance-redesign .trial-balance-note {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 8px;
          padding: 14px;
          font-weight: 950;
        }

        .trial-balance-redesign .trial-status.is-balanced,
        .trial-balance-redesign .trial-balance-note.is-balanced {
          color: #22C7A1;
          background: rgba(34, 199, 161, 0.1);
          border-color: rgba(34, 199, 161, 0.22);
        }

        .trial-balance-redesign .trial-status.is-unbalanced,
        .trial-balance-redesign .trial-balance-note.is-unbalanced {
          color: #FB6B7A;
          background: rgba(251, 107, 122, 0.1);
          border-color: rgba(251, 107, 122, 0.22);
        }

        .trial-balance-redesign .trial-table-shell {
          overflow: hidden;
        }

        .trial-balance-redesign .trial-level {
          display: inline-flex;
          min-width: 32px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid #E5EAF1;
          background: #FFFFFF;
          color: #64748B;
          font-size: 12px;
          font-weight: 900;
        }

        .trial-balance-redesign input,
        .trial-balance-redesign button {
          border-radius: 8px !important;
        }

        @media (max-width: 760px) {
          .trial-balance-redesign .trial-command {
            padding: 14px;
          }
        }
      `}</style>
    </div>
  );
}

function displayName(item: TrialBalanceItem) {
  return item.account_name_ar || item.account_name || "حساب غير مسمى";
}

function accountTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    asset: "أصول",
    assets: "أصول",
    liability: "التزامات",
    liabilities: "التزامات",
    equity: "حقوق ملكية",
    revenue: "إيرادات",
    expense: "مصروفات",
    expenses: "مصروفات",
  };
  return labels[type || ""] || type || "-";
}

function TrialSummary({ title, value, tone }: { title: string; value: string; tone: "info" | "success" | "alert" }) {
  const color = tone === "info" ? "#38BDF8" : tone === "success" ? "#22C7A1" : "#FB6B7A";
  return (
    <div className="trial-summary">
      <span style={{ color }}>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="trial-mini-stat">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
