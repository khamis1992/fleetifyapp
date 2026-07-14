import { type CSSProperties, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Calculator,
  Download,
  FileText,
  Landmark,
  LineChart,
  Percent,
  PieChart,
  Printer,
  RefreshCw,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { AdvancedFinancialRatios } from "@/components/finance/AdvancedFinancialRatios";
import { BalanceSheetReport } from "@/components/finance/BalanceSheetReport";
import { CashFlowStatementReport } from "@/components/finance/CashFlowStatementReport";
import { CostCenterReports } from "@/components/finance/CostCenterReports";
import { IncomeStatementReport } from "@/components/finance/IncomeStatementReport";
import { PayablesReport } from "@/components/finance/PayablesReport";
import { PayrollReportsPanel } from "@/components/finance/PayrollReportsPanel";
import { ReceivablesReport } from "@/components/finance/ReceivablesReport";
import { TrialBalanceReport } from "@/components/finance/TrialBalanceReport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useFinancialAnalysis } from "@/hooks/useFinancialAnalysis";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildOfficialReportDocumentHtml, exportOfficialHtmlToPDF } from "@/utils/officialFinancialReportExport";

const analyticsColors = {
  text: systemColorPattern.colors.text,
  surface: systemColorPattern.colors.surface,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

const analyticsStyle = {
  "--analytics-text": analyticsColors.text,
  "--analytics-surface": analyticsColors.surface,
  "--analytics-inner": analyticsColors.inner,
  "--analytics-muted": analyticsColors.muted,
  "--analytics-border": analyticsColors.border,
  "--analytics-info": analyticsColors.info,
  "--analytics-alert": analyticsColors.alert,
  "--analytics-focus": analyticsColors.focus,
  "--analytics-success": analyticsColors.success,
} as CSSProperties;

const workspaceTabs = [
  { id: "reports", label: "التقارير المالية", helper: "القوائم والتفاصيل", icon: FileText, accent: analyticsColors.info },
  { id: "analysis", label: "التحليل المالي", helper: "الأداء والاتجاهات", icon: LineChart, accent: analyticsColors.success },
  { id: "ratios", label: "النسب المالية", helper: "السيولة والربحية", icon: Percent, accent: analyticsColors.focus },
  { id: "calculator", label: "الحاسبة المالية", helper: "أدوات القرار", icon: Calculator, accent: analyticsColors.alert },
];

const reportTabs = [
  { id: "trial-balance", label: "ميزان المراجعة", helper: "توازن الحسابات", icon: Scale },
  { id: "income-statement", label: "قائمة الدخل", helper: "الإيرادات والمصروفات", icon: TrendingUp },
  { id: "balance-sheet", label: "المركز المالي", helper: "الأصول والالتزامات", icon: BarChart3 },
  { id: "cash-flow", label: "التدفقات النقدية", helper: "حركة النقد", icon: Wallet },
  { id: "payroll", label: "الرواتب", helper: "تكلفة الموظفين", icon: Users },
  { id: "cost-centers", label: "مراكز التكلفة", helper: "توزيع المصروفات", icon: Landmark },
  { id: "receivables", label: "الذمم المدينة", helper: "المبالغ المستحقة", icon: FileText },
  { id: "payables", label: "الذمم الدائنة", helper: "التزامات الموردين", icon: FileText },
];

interface MetricProps {
  title: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
  accent: string;
  tone?: "positive" | "negative" | "neutral";
}

const Metric = ({ title, value, helper, icon: Icon, accent, tone = "neutral" }: MetricProps) => (
  <div className="analytics-metric">
    <div className="flex items-start justify-between gap-3">
      <span className="analytics-icon" style={{ color: accent, backgroundColor: `${accent}14` }}>
        <Icon className="h-5 w-5" />
      </span>
      <span
        className={cn(
          "rounded-lg px-2 py-1 text-[11px] font-black",
          tone === "positive" && "text-[#22C7A1]",
          tone === "negative" && "text-[#FB6B7A]",
          tone === "neutral" && "text-[#94A3B8]",
        )}
        style={{ backgroundColor: `${accent}10` }}
      >
        {helper}
      </span>
    </div>
    <p className="mt-4 text-sm font-bold" style={{ color: analyticsColors.muted }}>
      {title}
    </p>
    <p className="mt-2 text-2xl font-black tracking-normal" style={{ color: analyticsColors.text }}>
      {value}
    </p>
  </div>
);

const parseRatio = (ratios: any[] | undefined, labels: string[]) => {
  const item = ratios?.find((ratio) =>
    labels.some((label) => String(ratio.name || "").toLowerCase().includes(label.toLowerCase())),
  );
  return Number(item?.value || 0);
};

const getTrendByMetric = (analysisData: any, keywords: string[]) => {
  return (analysisData?.trends || analysisData?.historicalComparison || []).find((item: any) =>
    keywords.some((keyword) => String(item.name || item.metric || "").toLowerCase().includes(keyword.toLowerCase())),
  );
};

const formatPercentChange = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return "لا يوجد تغير واضح";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const buildReportsAIInsights = ({
  analysisData,
  stats,
  formatCurrency,
}: {
  analysisData: any;
  stats: {
    revenue: number;
    expenses: number;
    netIncome: number;
    profitMargin: number;
    currentRatio: number;
  };
  formatCurrency: (value: number) => string;
}) => {
  const expenseRatio = stats.revenue > 0 ? (stats.expenses / stats.revenue) * 100 : 0;
  const revenueTrend = getTrendByMetric(analysisData, ["الإيراد", "revenue"]);
  const expenseTrend = getTrendByMetric(analysisData, ["المصروف", "expense"]);
  const netIncomeTrend = getTrendByMetric(analysisData, ["الربح", "income"]);
  const revenueChange = Number(revenueTrend?.change ?? revenueTrend?.changePercentage ?? 0);
  const expenseChange = Number(expenseTrend?.change ?? expenseTrend?.changePercentage ?? 0);
  const netIncomeChange = Number(netIncomeTrend?.change ?? netIncomeTrend?.changePercentage ?? 0);
  const budget = analysisData?.budgetComparison;
  const abnormalAccounts = [
    Math.abs(revenueChange) >= 25 && {
      label: "الإيرادات",
      value: formatPercentChange(revenueChange),
      reason: revenueChange > 0 ? "ارتفاع قوي مقارنة بالفترة السابقة" : "انخفاض قوي مقارنة بالفترة السابقة",
      tone: revenueChange > 0 ? "positive" : "risk",
    },
    Math.abs(expenseChange) >= 20 && {
      label: "المصروفات",
      value: formatPercentChange(expenseChange),
      reason: expenseChange > 0 ? "ارتفاع مصروفات يحتاج تفسيرًا" : "انخفاض مصروفات ملحوظ",
      tone: expenseChange > 0 ? "risk" : "positive",
    },
    budget?.expenseVariancePercentage && Math.abs(Number(budget.expenseVariancePercentage)) >= 15 && {
      label: "انحراف المصروفات عن الميزانية",
      value: formatPercentChange(Number(budget.expenseVariancePercentage)),
      reason: "المصروف الفعلي بعيد عن الميزانية المعتمدة",
      tone: Number(budget.expenseVariancePercentage) > 0 ? "risk" : "positive",
    },
    budget?.revenueVariancePercentage && Math.abs(Number(budget.revenueVariancePercentage)) >= 15 && {
      label: "انحراف الإيرادات عن الميزانية",
      value: formatPercentChange(Number(budget.revenueVariancePercentage)),
      reason: "الإيراد الفعلي بعيد عن المتوقع",
      tone: Number(budget.revenueVariancePercentage) < 0 ? "risk" : "positive",
    },
  ].filter(Boolean) as Array<{ label: string; value: string; reason: string; tone: "positive" | "risk" }>;

  const headline =
    stats.revenue <= 0
      ? "لا توجد إيرادات كافية لبناء قراءة موثوقة."
      : stats.netIncome < 0
        ? "الشركة تسجل خسارة في الفترة الحالية، والأولوية هي ضبط المصروفات والتحصيل."
        : expenseRatio > 80
          ? "الربح موجود لكن ضغط المصروفات مرتفع ويحتاج متابعة."
          : stats.profitMargin >= 15
            ? "الأداء المالي جيد، مع هامش ربح مريح نسبيًا."
            : "الأداء مقبول لكنه يحتاج تحسين الهامش ومراقبة المصروفات.";

  const explanation =
    stats.revenue <= 0
      ? "التحليل محدود لأن الإيرادات غير ظاهرة في البيانات الحالية. راجع ترحيل الفواتير والدفعات إلى القيود."
      : expenseRatio > 100
        ? `المصروفات ${formatCurrency(stats.expenses)} أعلى من الإيرادات ${formatCurrency(stats.revenue)}، وهذا يفسر الخسارة الحالية.`
        : expenseChange > 20
          ? `المصروفات ارتفعت ${formatPercentChange(expenseChange)}، لذلك يجب مراجعة بنود التشغيل والصيانة والرواتب.`
          : revenueChange < -20
            ? `الإيرادات انخفضت ${formatPercentChange(revenueChange)}، وقد يكون السبب ضعف التحصيل أو انخفاض العقود النشطة.`
            : `الإيرادات ${formatCurrency(stats.revenue)} مقابل مصروفات ${formatCurrency(stats.expenses)}، وهامش الربح ${stats.profitMargin.toFixed(1)}%.`;

  const decisions = [
    expenseRatio > 75 && "راجع مصروفات التشغيل والصيانة وحدد أعلى حساب مصروف خلال الفترة.",
    revenueChange < -10 && "تابع التحصيل والعقود النشطة لمعرفة سبب انخفاض الإيراد.",
    stats.currentRatio > 0 && stats.currentRatio < 1 && "راجع السيولة والالتزامات قصيرة الأجل قبل أي التزام جديد.",
    stats.netIncome < 0 && "أوقف المصروفات غير الضرورية مؤقتًا وراجع العقود ضعيفة الربحية.",
    abnormalAccounts.length > 0 && "افتح الحسابات ذات التغير غير الطبيعي وراجع القيود الأخيرة.",
    "راجع استخدام المركبات ذات الإيراد المنخفض أو المصروف المرتفع.",
  ].filter(Boolean) as string[];

  return {
    abnormalAccounts,
    decisions: decisions.slice(0, 5),
    explanation,
    headline,
    monthComparison: [
      { label: "الإيرادات", value: formatPercentChange(revenueChange), tone: revenueChange >= 0 ? "positive" : "risk" },
      { label: "المصروفات", value: formatPercentChange(expenseChange), tone: expenseChange <= 0 ? "positive" : "risk" },
      { label: "صافي الربح", value: formatPercentChange(netIncomeChange), tone: netIncomeChange >= 0 ? "positive" : "risk" },
    ],
    score: Math.max(0, Math.min(100, Math.round(
      (stats.netIncome >= 0 ? 30 : 5) +
      (expenseRatio <= 70 ? 25 : expenseRatio <= 90 ? 12 : 0) +
      (stats.profitMargin > 0 ? Math.min(25, stats.profitMargin) : 0) +
      (abnormalAccounts.length === 0 ? 20 : Math.max(0, 20 - abnormalAccounts.length * 6))
    ))),
  };
};

const ReportsAIInsightPanel = ({
  analysisData,
  stats,
  formatCurrency,
}: {
  analysisData: any;
  stats: {
    revenue: number;
    expenses: number;
    netIncome: number;
    profitMargin: number;
    currentRatio: number;
  };
  formatCurrency: (value: number) => string;
}) => {
  const ai = useMemo(() => buildReportsAIInsights({ analysisData, stats, formatCurrency }), [analysisData, stats, formatCurrency]);

  return (
    <section className="analytics-ai-panel">
      <div className="analytics-ai-main">
        <div className="flex items-start gap-3">
          <span className="analytics-ai-icon">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: analyticsColors.muted }}>
              AI Financial Analyst
            </p>
            <h2>{ai.headline}</h2>
            <p>{ai.explanation}</p>
          </div>
        </div>

        <div className="analytics-ai-comparison">
          {ai.monthComparison.map((item) => (
            <div key={item.label} className={`is-${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-ai-score">
        <span>درجة القراءة</span>
        <strong>{ai.score}%</strong>
      </div>

      <div className="analytics-ai-grid">
        <div>
          <h3>حسابات تحتاج انتباه</h3>
          <div className="grid gap-2">
            {ai.abnormalAccounts.length > 0 ? ai.abnormalAccounts.slice(0, 4).map((item) => (
              <div key={item.label} className={`analytics-ai-row is-${item.tone}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.reason}</p>
              </div>
            )) : (
              <div className="analytics-ai-empty">لا توجد تغيرات غير طبيعية واضحة حسب البيانات الحالية.</div>
            )}
          </div>
        </div>
        <div>
          <h3>قرارات مقترحة</h3>
          <div className="grid gap-2">
            {ai.decisions.map((decision, index) => (
              <div key={`${decision}-${index}`} className="analytics-ai-decision">
                <Target className="h-4 w-4" />
                <span>{decision}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const printCurrentView = async (title: string) => {
  const reportDate = new Date().toISOString().slice(0, 10);
  const officialHtml = buildOfficialReportDocumentHtml({
    metadata: {
      reportTitle: title,
      reportType: "finance_reports_analysis",
      currency: "QAR",
      asOfDate: reportDate,
      sourceFingerprint: `finance-analysis:${title}:${reportDate}`,
      status: "published",
    },
    bodyHtml: `
      <p>تم إنشاء هذا التقرير من صفحة التحليل والتقارير المالية.</p>
      <table>
        <tbody>
          <tr><th>اسم التقرير</th><td>${title}</td></tr>
          <tr><th>القسم</th><td>التحليل المالي</td></tr>
          <tr><th>العملة</th><td>ريال قطري QAR</td></tr>
        </tbody>
      </table>
    `,
  });

  await exportOfficialHtmlToPDF(officialHtml, `financial-analysis-${reportDate}.pdf`);
  toast.success("تم تحميل التقرير بصيغة رسمية");
};

const downloadSummary = (data: Record<string, unknown>) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `financial-summary-${new Date().toISOString().split("T")[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("تم تصدير الملخص");
};

const ReportsWorkspace = () => {
  const [activeReport, setActiveReport] = useState("trial-balance");
  const activeReportInfo = reportTabs.find((tab) => tab.id === activeReport) || reportTabs[0];

  return (
    <Tabs value={activeReport} onValueChange={setActiveReport} className="analytics-subspace">
      <section className="analytics-subtabs-shell">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: analyticsColors.muted }}>
            Reports Library
          </p>
          <h3 className="mt-1 text-lg font-black" style={{ color: analyticsColors.text }}>
            {activeReportInfo.label}
          </h3>
          <p className="mt-1 text-sm" style={{ color: analyticsColors.muted }}>
            {activeReportInfo.helper}
          </p>
        </div>

        <div className="analytics-report-grid">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveReport(tab.id)}
                className={cn("analytics-report-option", isActive && "is-active")}
              >
                <span className="analytics-report-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 text-right">
                  <span className="block truncate text-sm font-black">{tab.label}</span>
                  <span className="block truncate text-[11px] font-bold">{tab.helper}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="analytics-report-frame">
        <div className="analytics-report-actions">
          <div className="flex items-center gap-3">
            <span className="analytics-icon" style={{ color: analyticsColors.info, backgroundColor: `${analyticsColors.info}14` }}>
              <activeReportInfo.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black" style={{ color: analyticsColors.text }}>
                {activeReportInfo.label}
              </h3>
              <p className="text-xs" style={{ color: analyticsColors.muted }}>
                تقرير قابل للمراجعة والطباعة
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-[#E5EAF1] bg-white" onClick={() => printCurrentView(activeReportInfo.label)}>
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>
        </div>

        <TabsContent value="trial-balance" className="analytics-report-content">
          <TrialBalanceReport />
        </TabsContent>
        <TabsContent value="income-statement" className="analytics-report-content">
          <IncomeStatementReport />
        </TabsContent>
        <TabsContent value="balance-sheet" className="analytics-report-content">
          <BalanceSheetReport />
        </TabsContent>
        <TabsContent value="cash-flow" className="analytics-report-content">
          <CashFlowStatementReport />
        </TabsContent>
        <TabsContent value="payroll" className="analytics-report-content">
          <PayrollReportsPanel />
        </TabsContent>
        <TabsContent value="cost-centers" className="analytics-report-content">
          <CostCenterReports />
        </TabsContent>
        <TabsContent value="receivables" className="analytics-report-content">
          <ReceivablesReport companyName="اسم الشركة" />
        </TabsContent>
        <TabsContent value="payables" className="analytics-report-content">
          <PayablesReport companyName="اسم الشركة" />
        </TabsContent>
      </section>
    </Tabs>
  );
};

const AnalysisWorkspace = ({ analysisData, formatCurrency }: { analysisData: any; formatCurrency: (value: number) => string }) => {
  const revenue = Number(analysisData?.incomeStatement?.revenue || 0);
  const expenses = Number(analysisData?.incomeStatement?.expenses || 0);
  const netIncome = Number(analysisData?.incomeStatement?.netIncome || revenue - expenses || 0);
  const totalAssets = Number(analysisData?.balanceSheet?.totalAssets || 0);
  const totalLiabilities = Number(analysisData?.balanceSheet?.totalLiabilities || 0);
  const profitMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
  const expenseRatio = revenue > 0 ? (expenses / revenue) * 100 : 0;
  const leverageRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const insights = [
    {
      title: "الربحية",
      value: `${profitMargin.toFixed(1)}%`,
      helper: profitMargin >= 15 ? "قوية" : profitMargin >= 5 ? "مقبولة" : "تحتاج متابعة",
      icon: Target,
      accent: profitMargin >= 5 ? analyticsColors.success : analyticsColors.alert,
    },
    {
      title: "ضغط المصروفات",
      value: `${expenseRatio.toFixed(1)}%`,
      helper: expenseRatio <= 70 ? "تحت السيطرة" : "مرتفع",
      icon: TrendingDown,
      accent: expenseRatio <= 70 ? analyticsColors.info : analyticsColors.alert,
    },
    {
      title: "الالتزامات إلى الأصول",
      value: `${leverageRatio.toFixed(1)}%`,
      helper: leverageRatio <= 50 ? "مستقر" : "مخاطرة أعلى",
      icon: Scale,
      accent: leverageRatio <= 50 ? analyticsColors.focus : analyticsColors.alert,
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        {insights.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="analytics-insight-card"
          >
            <span className="analytics-icon" style={{ color: item.accent, backgroundColor: `${item.accent}14` }}>
              <item.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold" style={{ color: analyticsColors.muted }}>
                {item.title}
              </p>
              <p className="mt-1 text-2xl font-black" style={{ color: analyticsColors.text }}>
                {item.value}
              </p>
              <p className="mt-1 text-xs font-bold" style={{ color: item.accent }}>
                {item.helper}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="analytics-decision-board">
        <div>
          <h3 className="text-lg font-black" style={{ color: analyticsColors.text }}>
            قراءة تنفيذية سريعة
          </h3>
          <p className="mt-2 text-sm leading-7" style={{ color: analyticsColors.muted }}>
            تعرض هذه اللوحة أهم العلاقات المالية بدون إغراق المستخدم بالتفاصيل. استخدمها كبوابة أولى قبل الانتقال إلى القوائم التفصيلية أو النسب المتقدمة.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-xs font-black">
              <span style={{ color: analyticsColors.muted }}>هامش الربح</span>
              <span>{profitMargin.toFixed(1)}%</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, profitMargin))} className="h-2" />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-xs font-black">
              <span style={{ color: analyticsColors.muted }}>نسبة المصروفات للإيرادات</span>
              <span>{expenseRatio.toFixed(1)}%</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, expenseRatio))} className="h-2" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="analytics-mini-tile">
              <span>الإيرادات</span>
              <strong>{formatCurrency(revenue)}</strong>
            </div>
            <div className="analytics-mini-tile">
              <span>صافي الربح</span>
              <strong>{formatCurrency(netIncome)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RatiosWorkspace = ({ analysisData }: { analysisData: any }) => {
  const ratios = analysisData?.ratios || [];
  const currentRatio = parseRatio(ratios, ["التداول", "current"]);
  const quickRatio = parseRatio(ratios, ["السريعة", "quick"]);
  const profitMargin = parseRatio(ratios, ["هامش", "profit"]);
  const debtRatio = parseRatio(ratios, ["الدين", "debt"]);

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="نسبة التداول" value={currentRatio.toFixed(2)} helper="السيولة" icon={Wallet} accent={analyticsColors.info} />
        <Metric title="النسبة السريعة" value={quickRatio.toFixed(2)} helper="قدرة فورية" icon={Sparkles} accent={analyticsColors.focus} />
        <Metric title="هامش الربح" value={`${profitMargin.toFixed(1)}%`} helper="ربحية" icon={TrendingUp} accent={analyticsColors.success} tone="positive" />
        <Metric title="نسبة الدين" value={`${debtRatio.toFixed(1)}%`} helper="مخاطر" icon={Scale} accent={analyticsColors.alert} tone="negative" />
      </div>

      <section className="analytics-report-frame">
        <div className="analytics-report-actions">
          <div className="flex items-center gap-3">
            <span className="analytics-icon" style={{ color: analyticsColors.focus, backgroundColor: `${analyticsColors.focus}14` }}>
              <Percent className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black" style={{ color: analyticsColors.text }}>
                النسب والمؤشرات المتقدمة
              </h3>
              <p className="text-xs" style={{ color: analyticsColors.muted }}>
                قراءة تفصيلية للسيولة والربحية والمديونية والكفاءة
              </p>
            </div>
          </div>
        </div>
        <AdvancedFinancialRatios />
      </section>
    </div>
  );
};

const CalculatorWorkspace = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const { currency } = useCompanyCurrency();
  const [loan, setLoan] = useState({ principal: 0, rate: 0, years: 0 });
  const [profit, setProfit] = useState({ revenue: 0, costs: 0, expenses: 0 });
  const [roi, setRoi] = useState({ initial: 0, final: 0, years: 1 });
  const [depreciation, setDepreciation] = useState({ cost: 0, salvage: 0, years: 1, method: "straight-line" });

  const loanResult = useMemo(() => {
    if (loan.principal <= 0 || loan.rate <= 0 || loan.years <= 0) return { monthly: 0, total: 0, interest: 0 };
    const monthlyRate = loan.rate / 100 / 12;
    const payments = loan.years * 12;
    const monthly = loan.principal * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1);
    return { monthly, total: monthly * payments, interest: monthly * payments - loan.principal };
  }, [loan]);

  const profitResult = useMemo(() => {
    const gross = profit.revenue - profit.costs;
    const net = gross - profit.expenses;
    return { gross, net, margin: profit.revenue > 0 ? (net / profit.revenue) * 100 : 0 };
  }, [profit]);

  const roiResult = useMemo(() => {
    const total = roi.final - roi.initial;
    const roiPercent = roi.initial > 0 ? (total / roi.initial) * 100 : 0;
    const annual = roi.initial > 0 && roi.final > 0 && roi.years > 0 ? (Math.pow(roi.final / roi.initial, 1 / roi.years) - 1) * 100 : 0;
    return { total, roiPercent, annual };
  }, [roi]);

  const depreciationResult = useMemo(() => {
    if (depreciation.cost <= 0 || depreciation.years <= 0) return { annual: 0, monthly: 0, book: 0 };
    const annual = depreciation.method === "double-declining"
      ? depreciation.cost * (2 / depreciation.years)
      : (depreciation.cost - depreciation.salvage) / depreciation.years;
    return { annual, monthly: annual / 12, book: depreciation.cost - annual };
  }, [depreciation]);

  return (
    <div className="p-4">
      <Tabs defaultValue="loan" className="space-y-4">
        <TabsList className="analytics-calculator-tabs">
          <TabsTrigger value="loan">القروض</TabsTrigger>
          <TabsTrigger value="profit">الربحية</TabsTrigger>
          <TabsTrigger value="roi">العائد</TabsTrigger>
          <TabsTrigger value="depreciation">الإهلاك</TabsTrigger>
        </TabsList>

        <TabsContent value="loan">
          <CalculatorPanel
            title="حاسبة القروض"
            icon={Calculator}
            inputs={
              <>
                <NumberField label={`مبلغ القرض (${currency})`} value={loan.principal} onChange={(value) => setLoan((prev) => ({ ...prev, principal: value }))} />
                <NumberField label="معدل الفائدة السنوي (%)" value={loan.rate} onChange={(value) => setLoan((prev) => ({ ...prev, rate: value }))} />
                <NumberField label="مدة القرض (سنوات)" value={loan.years} onChange={(value) => setLoan((prev) => ({ ...prev, years: value }))} />
              </>
            }
            results={[
              ["القسط الشهري", formatCurrency(loanResult.monthly)],
              ["إجمالي المدفوعات", formatCurrency(loanResult.total)],
              ["إجمالي الفوائد", formatCurrency(loanResult.interest)],
            ]}
          />
        </TabsContent>

        <TabsContent value="profit">
          <CalculatorPanel
            title="حاسبة الربحية"
            icon={PieChart}
            inputs={
              <>
                <NumberField label={`الإيرادات (${currency})`} value={profit.revenue} onChange={(value) => setProfit((prev) => ({ ...prev, revenue: value }))} />
                <NumberField label={`تكلفة المبيعات (${currency})`} value={profit.costs} onChange={(value) => setProfit((prev) => ({ ...prev, costs: value }))} />
                <NumberField label={`المصروفات التشغيلية (${currency})`} value={profit.expenses} onChange={(value) => setProfit((prev) => ({ ...prev, expenses: value }))} />
              </>
            }
            results={[
              ["الربح الإجمالي", formatCurrency(profitResult.gross)],
              ["صافي الربح", formatCurrency(profitResult.net)],
              ["هامش الربح", `${profitResult.margin.toFixed(2)}%`],
            ]}
          />
        </TabsContent>

        <TabsContent value="roi">
          <CalculatorPanel
            title="حاسبة عائد الاستثمار"
            icon={Target}
            inputs={
              <>
                <NumberField label={`الاستثمار الأولي (${currency})`} value={roi.initial} onChange={(value) => setRoi((prev) => ({ ...prev, initial: value }))} />
                <NumberField label={`القيمة النهائية (${currency})`} value={roi.final} onChange={(value) => setRoi((prev) => ({ ...prev, final: value }))} />
                <NumberField label="المدة (سنوات)" value={roi.years} onChange={(value) => setRoi((prev) => ({ ...prev, years: value }))} />
              </>
            }
            results={[
              ["إجمالي العائد", formatCurrency(roiResult.total)],
              ["ROI", `${roiResult.roiPercent.toFixed(2)}%`],
              ["العائد السنوي", `${roiResult.annual.toFixed(2)}%`],
            ]}
          />
        </TabsContent>

        <TabsContent value="depreciation">
          <CalculatorPanel
            title="حاسبة الإهلاك"
            icon={TrendingDown}
            inputs={
              <>
                <NumberField label={`تكلفة الأصل (${currency})`} value={depreciation.cost} onChange={(value) => setDepreciation((prev) => ({ ...prev, cost: value }))} />
                <NumberField label={`القيمة المتبقية (${currency})`} value={depreciation.salvage} onChange={(value) => setDepreciation((prev) => ({ ...prev, salvage: value }))} />
                <NumberField label="العمر الإنتاجي (سنوات)" value={depreciation.years} onChange={(value) => setDepreciation((prev) => ({ ...prev, years: value }))} />
                <div className="space-y-2">
                  <Label>طريقة الإهلاك</Label>
                  <Select value={depreciation.method} onValueChange={(value) => setDepreciation((prev) => ({ ...prev, method: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight-line">القسط الثابت</SelectItem>
                      <SelectItem value="double-declining">القسط المتناقص المضاعف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            }
            results={[
              ["الإهلاك السنوي", formatCurrency(depreciationResult.annual)],
              ["الإهلاك الشهري", formatCurrency(depreciationResult.monthly)],
              ["القيمة الدفترية", formatCurrency(depreciationResult.book)],
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const NumberField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input
      type="number"
      value={value || ""}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      placeholder="0"
    />
  </div>
);

const CalculatorPanel = ({
  title,
  icon: Icon,
  inputs,
  results,
}: {
  title: string;
  icon: React.ElementType;
  inputs: React.ReactNode;
  results: Array<[string, string]>;
}) => (
  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
    <Card className="analytics-tool-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="analytics-icon" style={{ color: analyticsColors.alert, backgroundColor: `${analyticsColors.alert}14` }}>
            <Icon className="h-5 w-5" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{inputs}</CardContent>
    </Card>

    <Card className="analytics-tool-card">
      <CardHeader>
        <CardTitle className="text-base">النتائج</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {results.map(([label, value]) => (
          <div key={label} className="analytics-result-tile">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

const ReportsAndAnalysis = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const currentTab = searchParams.get("tab") || "reports";
  const activeTab = workspaceTabs.some((tab) => tab.id === currentTab) ? currentTab : "reports";
  const activeTabInfo = workspaceTabs.find((tab) => tab.id === activeTab) || workspaceTabs[0];
  const { data: analysisData, isLoading, refetch } = useFinancialAnalysis();

  const stats = useMemo(() => {
    const revenue = Number(analysisData?.incomeStatement?.revenue || 0);
    const expenses = Number(analysisData?.incomeStatement?.expenses || 0);
    const netIncome = Number(analysisData?.incomeStatement?.netIncome || revenue - expenses || 0);
    const ratios = analysisData?.ratios || [];
    const profitMargin = revenue > 0 ? (netIncome / revenue) * 100 : parseRatio(ratios, ["هامش", "profit"]);
    const currentRatio = parseRatio(ratios, ["التداول", "current"]);

    return {
      revenue,
      expenses,
      netIncome,
      profitMargin,
      currentRatio,
      reportCount: reportTabs.length,
    };
  }, [analysisData]);

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (stats.netIncome > 0 ? 35 : 10) +
          Math.min(30, Math.max(0, stats.profitMargin * 1.5)) +
          Math.min(20, stats.currentRatio * 10) +
          (stats.revenue > 0 ? 15 : 0),
      ),
    ),
  );

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="finance-analytics-system min-h-screen" dir="rtl" style={analyticsStyle}>
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <motion.section className="analytics-command" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <span className="analytics-command-icon">
                <BarChart3 className="h-6 w-6" />
              </span>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-[#38BDF8]/10 text-[#38BDF8] hover:bg-[#38BDF8]/10">
                    مركز التقارير والتحليل
                  </Badge>
                  <span className="text-xs font-bold" style={{ color: analyticsColors.muted }}>
                    تقارير، مؤشرات، نسب، وحسابات مالية
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-normal sm:text-3xl" style={{ color: analyticsColors.text }}>
                  التقارير والتحليل المالي
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7" style={{ color: analyticsColors.muted }}>
                  مساحة عمل موحدة لقراءة النتائج المالية، مراجعة القوائم، تحليل النسب، وتجربة أدوات الحساب السريع دون التنقل بين صفحات متفرقة.
                </p>
              </div>
            </div>

            <div className="analytics-actions">
              <Button onClick={() => refetch()} variant="outline" className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]" disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                تحديث
              </Button>
              <Button onClick={() => downloadSummary(stats)} variant="outline" className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]">
                <Download className="h-4 w-4" />
                تصدير ملخص
              </Button>
              <Button onClick={() => navigate("/finance/overview")} variant="outline" className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]">
                <ArrowLeft className="h-4 w-4" />
                المالية
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric title="الإيرادات" value={formatCurrency(stats.revenue)} helper="دخل الفترة" icon={TrendingUp} accent={analyticsColors.success} tone="positive" />
            <Metric title="المصروفات" value={formatCurrency(stats.expenses)} helper="تكلفة التشغيل" icon={TrendingDown} accent={analyticsColors.alert} tone="negative" />
            <Metric title="صافي الربح" value={formatCurrency(stats.netIncome)} helper={stats.netIncome >= 0 ? "موجب" : "سلبي"} icon={Target} accent={analyticsColors.focus} tone={stats.netIncome >= 0 ? "positive" : "negative"} />
            <Metric title="التقارير المتاحة" value={stats.reportCount} helper="نماذج مالية" icon={FileText} accent={analyticsColors.info} />
          </div>
        </motion.section>

        <ReportsAIInsightPanel analysisData={analysisData} stats={stats} formatCurrency={formatCurrency} />

        <section className="analytics-health">
          <div className="flex min-w-0 items-center gap-3">
            <span className="analytics-icon h-11 w-11" style={{ color: analyticsColors.success, backgroundColor: `${analyticsColors.success}14` }}>
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black" style={{ color: analyticsColors.text }}>
                مؤشر جاهزية التحليل
              </p>
              <p className="truncate text-xs" style={{ color: analyticsColors.muted }}>
                يعتمد على الربحية، السيولة، وتوفر بيانات الإيرادات
              </p>
            </div>
          </div>
          <div className="analytics-health-progress">
            <div className="flex items-center justify-between text-xs font-black">
              <span style={{ color: analyticsColors.muted }}>جاهزية القراءة</span>
              <span style={{ color: analyticsColors.text }}>{healthScore}%</span>
            </div>
            <Progress value={healthScore} className="mt-2 h-2" />
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="analytics-workspace">
          <section className="analytics-tabs-shell">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: analyticsColors.muted }}>
                Analysis Workspace
              </p>
              <h2 className="mt-1 text-xl font-black" style={{ color: analyticsColors.text }}>
                {activeTabInfo.label}
              </h2>
              <p className="mt-1 text-sm" style={{ color: analyticsColors.muted }}>
                {activeTabInfo.helper}
              </p>
            </div>

            <TabsList className="analytics-tabs-list">
              {workspaceTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="analytics-tab-trigger"
                    style={{ "--tab-accent": tab.accent } as CSSProperties}
                  >
                    <span className="analytics-tab-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-right">
                      <span className="block truncate text-sm font-black">{tab.label}</span>
                      <span className={cn("block truncate text-[11px] font-bold", isActive && "text-white/80")}>
                        {tab.helper}
                      </span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </section>

          <section className="analytics-content-card">
            <div className="analytics-content-heading">
              <span className="analytics-icon" style={{ color: activeTabInfo.accent, backgroundColor: `${activeTabInfo.accent}14` }}>
                <activeTabInfo.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black" style={{ color: analyticsColors.text }}>
                  {activeTabInfo.label}
                </h3>
                <p className="text-xs" style={{ color: analyticsColors.muted }}>
                  {activeTabInfo.helper}
                </p>
              </div>
            </div>

            <TabsContent value="reports" className="analytics-panel-content">
              <ReportsWorkspace />
            </TabsContent>

            <TabsContent value="analysis" className="analytics-panel-content">
              <AnalysisWorkspace analysisData={analysisData} formatCurrency={formatCurrency} />
            </TabsContent>

            <TabsContent value="ratios" className="analytics-panel-content">
              <RatiosWorkspace analysisData={analysisData} />
            </TabsContent>

            <TabsContent value="calculator" className="analytics-panel-content">
              <CalculatorWorkspace />
            </TabsContent>
          </section>
        </Tabs>
      </div>

      <style>{`
        .finance-analytics-system {
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.96), var(--analytics-inner) 340px),
            var(--analytics-inner);
          color: var(--analytics-text);
        }

        .analytics-command,
        .analytics-ai-panel,
        .analytics-health,
        .analytics-tabs-shell,
        .analytics-content-card,
        .analytics-subtabs-shell,
        .analytics-report-frame,
        .analytics-decision-board,
        .analytics-tool-card {
          border: 1px solid var(--analytics-border);
          background: var(--analytics-surface);
          border-radius: 8px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .analytics-command {
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .analytics-ai-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 140px;
          gap: 14px;
          padding: 18px;
        }

        .analytics-ai-main {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .analytics-ai-icon {
          display: flex;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--analytics-success) 24%, white);
          border-radius: 8px;
          background: color-mix(in srgb, var(--analytics-success) 12%, white);
          color: var(--analytics-success);
        }

        .analytics-ai-main h2 {
          margin-top: 4px;
          color: var(--analytics-text);
          font-size: 1.2rem;
          font-weight: 950;
          line-height: 1.5;
        }

        .analytics-ai-main p {
          margin-top: 6px;
          color: var(--analytics-muted);
          font-size: 0.9rem;
          font-weight: 750;
          line-height: 1.8;
        }

        .analytics-ai-comparison {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .analytics-ai-comparison div,
        .analytics-ai-score,
        .analytics-ai-row,
        .analytics-ai-decision,
        .analytics-ai-empty {
          border: 1px solid var(--analytics-border);
          border-radius: 8px;
          background: var(--analytics-inner);
        }

        .analytics-ai-comparison div {
          padding: 10px;
        }

        .analytics-ai-comparison span,
        .analytics-ai-score span {
          display: block;
          color: var(--analytics-muted);
          font-size: 0.72rem;
          font-weight: 900;
        }

        .analytics-ai-comparison strong,
        .analytics-ai-score strong {
          display: block;
          margin-top: 4px;
          color: var(--analytics-text);
          font-size: 1rem;
          font-weight: 950;
        }

        .analytics-ai-comparison .is-positive strong,
        .analytics-ai-row.is-positive strong {
          color: var(--analytics-success);
        }

        .analytics-ai-comparison .is-risk strong,
        .analytics-ai-row.is-risk strong {
          color: var(--analytics-alert);
        }

        .analytics-ai-score {
          display: flex;
          min-height: 130px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
        }

        .analytics-ai-score strong {
          font-size: 2rem;
          color: var(--analytics-focus);
        }

        .analytics-ai-grid {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .analytics-ai-grid h3 {
          margin-bottom: 8px;
          color: var(--analytics-text);
          font-size: 0.95rem;
          font-weight: 950;
        }

        .analytics-ai-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px 10px;
          padding: 10px;
        }

        .analytics-ai-row span,
        .analytics-ai-row strong {
          font-size: 0.82rem;
          font-weight: 950;
        }

        .analytics-ai-row span {
          color: var(--analytics-text);
        }

        .analytics-ai-row p {
          grid-column: 1 / -1;
          color: var(--analytics-muted);
          font-size: 0.75rem;
          font-weight: 750;
          line-height: 1.7;
        }

        .analytics-ai-decision {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 8px;
          align-items: start;
          padding: 10px;
          color: var(--analytics-text);
          font-size: 0.82rem;
          font-weight: 850;
          line-height: 1.7;
        }

        .analytics-ai-decision svg {
          margin-top: 3px;
          color: var(--analytics-focus);
        }

        .analytics-ai-empty {
          padding: 12px;
          color: var(--analytics-muted);
          font-size: 0.82rem;
          font-weight: 850;
        }

        .analytics-command::before {
          content: "";
          position: absolute;
          inset-inline-start: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: linear-gradient(180deg, var(--analytics-info), var(--analytics-success), var(--analytics-focus), var(--analytics-alert));
        }

        .analytics-command-icon,
        .analytics-icon,
        .analytics-tab-icon,
        .analytics-report-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 8px;
        }

        .analytics-command-icon {
          width: 48px;
          height: 48px;
          color: var(--analytics-info);
          background: color-mix(in srgb, var(--analytics-info) 12%, white);
          border: 1px solid color-mix(in srgb, var(--analytics-info) 24%, white);
        }

        .analytics-icon {
          width: 40px;
          height: 40px;
        }

        .analytics-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .analytics-metric,
        .analytics-insight-card {
          min-height: 132px;
          border: 1px solid var(--analytics-border);
          background: var(--analytics-inner);
          border-radius: 8px;
          padding: 16px;
        }

        .analytics-health {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
          align-items: center;
          gap: 16px;
          padding: 16px;
        }

        .analytics-workspace,
        .analytics-subspace {
          display: grid;
          gap: 14px;
        }

        .analytics-tabs-shell,
        .analytics-subtabs-shell {
          display: grid;
          grid-template-columns: minmax(220px, 0.75fr) minmax(0, 1.25fr);
          align-items: center;
          gap: 18px;
          padding: 16px;
        }

        .analytics-tabs-list,
        .analytics-calculator-tabs {
          display: grid !important;
          height: auto !important;
          gap: 8px;
          border: 1px solid var(--analytics-border);
          background: var(--analytics-inner) !important;
          border-radius: 8px !important;
          padding: 6px !important;
        }

        .analytics-tabs-list {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .analytics-calculator-tabs {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .analytics-tab-trigger {
          min-height: 64px;
          justify-content: flex-start !important;
          gap: 10px !important;
          border-radius: 8px !important;
          padding: 10px 12px !important;
          color: var(--analytics-muted) !important;
          border: 1px solid transparent;
          background: transparent !important;
        }

        .analytics-tab-trigger[data-state="active"] {
          background: var(--tab-accent) !important;
          color: white !important;
          box-shadow: none !important;
        }

        .analytics-tab-icon {
          width: 36px;
          height: 36px;
          background: color-mix(in srgb, var(--tab-accent) 12%, white);
          color: var(--tab-accent);
        }

        .analytics-tab-trigger[data-state="active"] .analytics-tab-icon {
          background: rgba(255,255,255,0.18);
          color: white;
        }

        .analytics-content-card,
        .analytics-report-frame {
          overflow: hidden;
        }

        .analytics-content-heading,
        .analytics-report-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid var(--analytics-border);
          background: color-mix(in srgb, var(--analytics-inner) 72%, white);
        }

        .analytics-panel-content,
        .analytics-report-content {
          margin: 0 !important;
          padding: 0;
        }

        .analytics-report-content > div {
          background: transparent !important;
        }

        .analytics-report-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .analytics-report-option {
          min-height: 62px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--analytics-border);
          border-radius: 8px;
          background: var(--analytics-inner);
          padding: 10px;
          color: var(--analytics-muted);
          transition: border-color 160ms ease, background-color 160ms ease;
        }

        .analytics-report-option.is-active {
          background: var(--analytics-text);
          color: white;
          border-color: var(--analytics-text);
        }

        .analytics-report-icon {
          width: 34px;
          height: 34px;
          background: rgba(56, 189, 248, 0.12);
          color: var(--analytics-info);
        }

        .analytics-report-option.is-active .analytics-report-icon {
          background: rgba(255,255,255,0.16);
          color: white;
        }

        .analytics-decision-board {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: 18px;
          padding: 18px;
        }

        .analytics-mini-tile,
        .analytics-result-tile {
          display: grid;
          gap: 6px;
          border: 1px solid var(--analytics-border);
          background: var(--analytics-inner);
          border-radius: 8px;
          padding: 14px;
        }

        .analytics-mini-tile span,
        .analytics-result-tile span {
          color: var(--analytics-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .analytics-mini-tile strong,
        .analytics-result-tile strong {
          color: var(--analytics-text);
          font-size: 18px;
          font-weight: 900;
        }

        .finance-analytics-system .bg-white,
        .finance-analytics-system .dark\\:bg-slate-900 {
          background-color: var(--analytics-surface) !important;
        }

        .finance-analytics-system .bg-slate-50,
        .finance-analytics-system .bg-neutral-50,
        .finance-analytics-system .bg-blue-50,
        .finance-analytics-system .bg-green-50,
        .finance-analytics-system .bg-purple-50,
        .finance-analytics-system .bg-indigo-50,
        .finance-analytics-system .bg-cyan-50,
        .finance-analytics-system .bg-orange-50,
        .finance-analytics-system .bg-amber-50,
        .finance-analytics-system .bg-yellow-50,
        .finance-analytics-system .bg-pink-50 {
          background-color: var(--analytics-inner) !important;
        }

        .finance-analytics-system .rounded-xl,
        .finance-analytics-system .rounded-lg,
        .finance-analytics-system button,
        .finance-analytics-system input,
        .finance-analytics-system [role="combobox"] {
          border-radius: 8px !important;
        }

        .finance-analytics-system .border,
        .finance-analytics-system .border-slate-100,
        .finance-analytics-system .border-slate-200,
        .finance-analytics-system .border-blue-200,
        .finance-analytics-system .border-green-200,
        .finance-analytics-system .border-purple-200,
        .finance-analytics-system .border-indigo-200,
        .finance-analytics-system .border-amber-200,
        .finance-analytics-system .border-rose-200 {
          border-color: var(--analytics-border) !important;
        }

        .finance-analytics-system .shadow-sm,
        .finance-analytics-system .shadow-md,
        .finance-analytics-system .shadow-lg,
        .finance-analytics-system .shadow-elevated,
        .finance-analytics-system .shadow-card {
          box-shadow: 0 10px 26px rgba(2, 6, 23, 0.055) !important;
        }

        .finance-analytics-system .text-neutral-900,
        .finance-analytics-system .text-slate-900,
        .finance-analytics-system .text-foreground {
          color: var(--analytics-text) !important;
        }

        .finance-analytics-system .text-neutral-500,
        .finance-analytics-system .text-neutral-400,
        .finance-analytics-system .text-slate-500,
        .finance-analytics-system .text-muted-foreground {
          color: var(--analytics-muted) !important;
        }

        .finance-analytics-system table thead tr {
          background: var(--analytics-inner) !important;
        }

        .finance-analytics-system table th {
          color: var(--analytics-muted) !important;
          font-size: 12px;
          font-weight: 900;
        }

        .finance-analytics-system table td {
          color: var(--analytics-text);
          border-color: var(--analytics-border) !important;
        }

        .finance-analytics-system table tbody tr:hover {
          background: color-mix(in srgb, var(--analytics-info) 5%, white) !important;
        }

        .finance-analytics-system input,
        .finance-analytics-system [role="combobox"] {
          min-height: 42px;
          border-color: var(--analytics-border) !important;
          background: var(--analytics-inner) !important;
          color: var(--analytics-text) !important;
          box-shadow: none !important;
        }

        .finance-analytics-system *:focus-visible {
          outline-color: var(--analytics-focus) !important;
          --tw-ring-color: var(--analytics-focus) !important;
        }

        @media (max-width: 1100px) {
          .analytics-ai-panel,
          .analytics-health,
          .analytics-tabs-shell,
          .analytics-subtabs-shell,
          .analytics-decision-board {
            grid-template-columns: 1fr;
          }

          .analytics-ai-grid {
            grid-template-columns: 1fr;
          }

          .analytics-tabs-list,
          .analytics-calculator-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .analytics-report-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .analytics-actions {
            justify-content: stretch;
          }
        }

        @media (max-width: 640px) {
          .analytics-command,
          .analytics-ai-panel {
            padding: 18px;
          }

          .analytics-ai-comparison {
            grid-template-columns: 1fr;
          }

          .analytics-tabs-list,
          .analytics-calculator-tabs,
          .analytics-report-grid {
            grid-template-columns: 1fr;
          }

          .analytics-content-heading,
          .analytics-report-actions {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportsAndAnalysis;

