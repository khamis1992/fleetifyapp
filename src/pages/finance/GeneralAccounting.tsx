import { type CSSProperties, Suspense, lazy, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { cn } from "@/lib/utils";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { useJournalEntries } from "@/hooks/finance/useJournalEntries";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  FileText,
  Landmark,
  ListTree,
  Plus,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const ChartOfAccounts = lazy(() => import("./ChartOfAccounts"));
const GeneralLedger = lazy(() => import("./GeneralLedger"));
const Ledger = lazy(() => import("./Ledger"));

const accountingColors = {
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

const accountingStyle = {
  "--accounting-text": accountingColors.text,
  "--accounting-surface": accountingColors.surface,
  "--accounting-inner": accountingColors.inner,
  "--accounting-muted": accountingColors.muted,
  "--accounting-border": accountingColors.border,
  "--accounting-info": accountingColors.info,
  "--accounting-alert": accountingColors.alert,
  "--accounting-focus": accountingColors.focus,
  "--accounting-success": accountingColors.success,
} as CSSProperties;

const tabConfig = [
  {
    id: "chart",
    label: "دليل الحسابات",
    eyebrow: "شجرة الحسابات",
    description: "بناء الحسابات وتصنيفها ومراقبة الأرصدة",
    icon: ListTree,
    accent: accountingColors.info,
  },
  {
    id: "ledger",
    label: "دفتر الأستاذ",
    eyebrow: "الأرصدة والحركة",
    description: "قيود، أرصدة، ميزان مراجعة وتحليل مراكز التكلفة",
    icon: BookOpen,
    accent: accountingColors.focus,
  },
  {
    id: "entries",
    label: "القيود اليومية",
    eyebrow: "الإدخال والمراجعة",
    description: "بحث وتدقيق تفاصيل القيود اليومية",
    icon: FileText,
    accent: accountingColors.alert,
  },
];

const isType = (value: string | undefined, singular: string, plural: string) =>
  value === singular || value === plural;

interface MetricCardProps {
  title: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
  accent: string;
}

const MetricCard = ({ title, value, helper, icon: Icon, accent }: MetricCardProps) => (
  <div className="accounting-metric">
    <div className="flex items-start justify-between gap-3">
      <span className="accounting-metric-icon" style={{ color: accent, backgroundColor: `${accent}14` }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-bold" style={{ color: accountingColors.muted }}>
        {helper}
      </span>
    </div>
    <div className="mt-5">
      <p className="text-sm font-bold" style={{ color: accountingColors.muted }}>
        {title}
      </p>
      <p className="mt-2 text-2xl font-black tracking-normal" style={{ color: accountingColors.text }}>
        {value}
      </p>
    </div>
  </div>
);

const GeneralAccounting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const currentTab = searchParams.get("tab") || "chart";

  const { data: accounts, refetch: refetchAccounts } = useChartOfAccounts();
  const { data: journalEntries, refetch: refetchEntries } = useJournalEntries({});

  const stats = useMemo(() => {
    const accountsList = accounts || [];
    const entriesList = journalEntries || [];

    const assetAccounts = accountsList.filter((account) => isType(account.account_type, "asset", "assets"));
    const liabilityAccounts = accountsList.filter((account) => isType(account.account_type, "liability", "liabilities"));
    const equityAccounts = accountsList.filter((account) => account.account_type === "equity");
    const revenueAccounts = accountsList.filter((account) => account.account_type === "revenue");
    const expenseAccounts = accountsList.filter((account) => isType(account.account_type, "expense", "expenses"));

    const totalRevenue = revenueAccounts.reduce((sum, account) => sum + Math.abs(account.current_balance || 0), 0);
    const totalExpenses = expenseAccounts.reduce((sum, account) => sum + Math.abs(account.current_balance || 0), 0);

    return {
      totalAccounts: accountsList.length,
      activeAccounts: accountsList.filter((account) => account.is_active !== false).length,
      totalAssets: assetAccounts.reduce((sum, account) => sum + (account.current_balance || 0), 0),
      totalLiabilities: liabilityAccounts.reduce((sum, account) => sum + (account.current_balance || 0), 0),
      totalEquity: equityAccounts.reduce((sum, account) => sum + (account.current_balance || 0), 0),
      totalEntries: entriesList.length,
      postedEntries: entriesList.filter((entry) => entry.status === "posted").length,
      draftEntries: entriesList.filter((entry) => entry.status === "draft").length,
      netIncome: totalRevenue - totalExpenses,
      debitTotal: entriesList.reduce((sum, entry) => sum + (entry.total_debit || 0), 0),
      creditTotal: entriesList.reduce((sum, entry) => sum + (entry.total_credit || 0), 0),
    };
  }, [accounts, journalEntries]);

  const activeTab = tabConfig.find((tab) => tab.id === currentTab) || tabConfig[0];
  const balanceDelta = Math.abs(stats.debitTotal - stats.creditTotal);
  const postedPercent = stats.totalEntries > 0 ? Math.round((stats.postedEntries / stats.totalEntries) * 100) : 0;

  const handleRefresh = () => {
    refetchAccounts();
    refetchEntries();
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="accounting-system min-h-screen" dir="rtl" style={accountingStyle}>
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="accounting-command"
          data-tour="accounting-header"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="accounting-command-icon">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-[#22C7A1]/10 text-[#22C7A1] hover:bg-[#22C7A1]/10">
                    مركز محاسبي موحد
                  </Badge>
                  <span className="text-xs font-bold" style={{ color: accountingColors.muted }}>
                    دليل الحسابات، الأستاذ، القيود
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-normal sm:text-3xl" style={{ color: accountingColors.text }}>
                  المحاسبة العامة
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: accountingColors.muted }}>
                  مساحة عمل واحدة لتنظيم الحسابات ومراجعة القيود ومتابعة توازن المدين والدائن بدون التنقل بين صفحات متفرقة.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => navigate("/finance/accounting?tab=entries&action=new")}
                className="gap-2 bg-[#020617] text-white hover:bg-[#020617]/90"
              >
                <Plus className="h-4 w-4" />
                قيد جديد
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث
              </Button>
              <Button
                onClick={() => navigate("/finance/overview")}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <ArrowLeft className="h-4 w-4" />
                المالية
              </Button>
            </div>
          </div>

          <div data-tour="accounting-metrics" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="الأصول"
              value={formatCurrency(stats.totalAssets)}
              helper={`${stats.activeAccounts} حساب نشط`}
              icon={TrendingUp}
              accent={accountingColors.success}
            />
            <MetricCard
              title="الالتزامات"
              value={formatCurrency(stats.totalLiabilities)}
              helper="تحت المراقبة"
              icon={TrendingDown}
              accent={accountingColors.alert}
            />
            <MetricCard
              title="القيود المرحلة"
              value={`${postedPercent}%`}
              helper={`${stats.postedEntries}/${stats.totalEntries}`}
              icon={CheckCircle2}
              accent={accountingColors.focus}
            />
            <MetricCard
              title="فرق التوازن"
              value={formatCurrency(balanceDelta)}
              helper={balanceDelta === 0 ? "متوازن" : "يحتاج مراجعة"}
              icon={Scale}
              accent={balanceDelta === 0 ? accountingColors.success : accountingColors.alert}
            />
          </div>
        </motion.section>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="accounting-workspace">
          <section data-tour="accounting-tabs" className="accounting-tabs-shell">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: accountingColors.muted }}>
                Workspace
              </p>
              <h2 className="mt-1 text-xl font-black" style={{ color: accountingColors.text }}>
                {activeTab.label}
              </h2>
              <p className="mt-1 text-sm" style={{ color: accountingColors.muted }}>
                {activeTab.description}
              </p>
            </div>

            <TabsList className="accounting-tabs-list">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="accounting-tab-trigger"
                    data-tour={`accounting-tab-${tab.id}`}
                    style={{
                      "--tab-accent": tab.accent,
                    } as CSSProperties}
                  >
                    <span className="accounting-tab-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-right">
                      <span className="block truncate text-sm font-black">{tab.label}</span>
                      <span className={cn("block truncate text-[11px] font-bold", isActive && "text-white/80")}>
                        {tab.eyebrow}
                      </span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </section>

          <section data-tour="accounting-context" className="accounting-context-strip">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${activeTab.accent}14`, color: activeTab.accent }}>
                <activeTab.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: accountingColors.text }}>
                  {activeTab.label}
                </p>
                <p className="text-xs" style={{ color: accountingColors.muted }}>
                  {activeTab.description}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs font-bold md:flex" style={{ color: accountingColors.muted }}>
              <Landmark className="h-4 w-4" />
              <span>{stats.draftEntries} مسودة قيد تحتاج متابعة</span>
            </div>
          </section>

          <TabsContent value="chart" className="mt-0">
            <motion.div data-tour="accounting-chart-panel" className="accounting-tab-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Suspense fallback={<PageSkeletonFallback />}>
                <ChartOfAccounts />
              </Suspense>
            </motion.div>
          </TabsContent>

          <TabsContent value="ledger" className="mt-0">
            <motion.div data-tour="accounting-ledger-panel" className="accounting-tab-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Suspense fallback={<PageSkeletonFallback />}>
                <GeneralLedger />
              </Suspense>
            </motion.div>
          </TabsContent>

          <TabsContent value="entries" className="mt-0">
            <motion.div data-tour="accounting-entries-panel" className="accounting-tab-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Suspense fallback={<PageSkeletonFallback />}>
                <Ledger />
              </Suspense>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        .accounting-system {
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.92), var(--accounting-inner) 320px),
            var(--accounting-inner);
          color: var(--accounting-text);
        }

        .accounting-command,
        .accounting-tabs-shell,
        .accounting-context-strip,
        .accounting-tab-panel {
          border: 1px solid var(--accounting-border);
          background: var(--accounting-surface);
          border-radius: 8px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .accounting-command {
          padding: 24px;
          overflow: hidden;
          position: relative;
        }

        .accounting-command::before {
          content: "";
          position: absolute;
          inset-inline-start: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: linear-gradient(180deg, var(--accounting-info), var(--accounting-success), var(--accounting-focus), var(--accounting-alert));
        }

        .accounting-command-icon {
          display: flex;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: color-mix(in srgb, var(--accounting-success) 14%, white);
          color: var(--accounting-success);
          border: 1px solid color-mix(in srgb, var(--accounting-success) 24%, white);
        }

        .accounting-metric {
          min-height: 132px;
          border: 1px solid var(--accounting-border);
          background: var(--accounting-inner);
          border-radius: 8px;
          padding: 16px;
        }

        .accounting-metric-icon {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid currentColor;
          border-color: color-mix(in srgb, currentColor 20%, transparent);
        }

        .accounting-workspace {
          display: grid;
          gap: 14px;
        }

        .accounting-tabs-shell {
          display: grid;
          grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
          gap: 18px;
          padding: 16px;
          align-items: center;
        }

        .accounting-tabs-list {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          height: auto !important;
          gap: 8px;
          background: var(--accounting-inner) !important;
          border: 1px solid var(--accounting-border);
          border-radius: 8px !important;
          padding: 6px !important;
        }

        .accounting-tab-trigger {
          min-height: 64px;
          justify-content: flex-start !important;
          gap: 10px !important;
          border-radius: 8px !important;
          padding: 10px 12px !important;
          color: var(--accounting-muted) !important;
          border: 1px solid transparent;
          background: transparent !important;
        }

        .accounting-tab-trigger[data-state="active"] {
          background: var(--tab-accent) !important;
          color: white !important;
          box-shadow: none !important;
          border-color: color-mix(in srgb, var(--tab-accent) 80%, black);
        }

        .accounting-tab-icon {
          display: flex;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: color-mix(in srgb, var(--tab-accent) 12%, white);
          color: var(--tab-accent);
        }

        .accounting-tab-trigger[data-state="active"] .accounting-tab-icon {
          background: rgba(255,255,255,0.18);
          color: white;
        }

        .accounting-context-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          background: color-mix(in srgb, var(--accounting-inner) 70%, white);
        }

        .accounting-tab-panel {
          overflow: hidden;
          padding: 0;
        }

        .accounting-tab-panel > div,
        .accounting-tab-panel > div > div,
        .accounting-tab-panel .min-h-screen {
          min-height: auto !important;
          background: transparent !important;
        }

        .accounting-tab-panel .p-6,
        .accounting-tab-panel .min-h-screen.p-6 {
          padding: 18px !important;
        }

        .accounting-tab-panel .bg-gradient-to-r,
        .accounting-tab-panel .bg-gradient-to-l,
        .accounting-tab-panel .bg-gradient-to-br {
          background-image: none !important;
        }

        .accounting-tab-panel .from-rose-500,
        .accounting-tab-panel .to-orange-500,
        .accounting-tab-panel .bg-rose-500 {
          background-color: var(--accounting-alert) !important;
        }

        .accounting-tab-panel .rounded-xl,
        .accounting-tab-panel .rounded-2xl,
        .accounting-tab-panel .rounded-lg,
        .accounting-tab-panel button,
        .accounting-tab-panel input,
        .accounting-tab-panel [role="combobox"] {
          border-radius: 8px !important;
        }

        .accounting-tab-panel .bg-white,
        .accounting-tab-panel .dark\\:bg-slate-900,
        .accounting-tab-panel [class*="bg-card"] {
          background-color: var(--accounting-surface) !important;
        }

        .accounting-tab-panel .bg-slate-50,
        .accounting-tab-panel .bg-slate-100,
        .accounting-tab-panel .dark\\:bg-slate-800 {
          background-color: var(--accounting-inner) !important;
        }

        .accounting-tab-panel .border,
        .accounting-tab-panel .border-slate-100,
        .accounting-tab-panel .border-slate-200 {
          border-color: var(--accounting-border) !important;
        }

        .accounting-tab-panel .shadow-lg,
        .accounting-tab-panel .shadow-md,
        .accounting-tab-panel .shadow-sm {
          box-shadow: 0 10px 26px rgba(2, 6, 23, 0.055) !important;
        }

        .accounting-tab-panel h1,
        .accounting-tab-panel h2,
        .accounting-tab-panel h3,
        .accounting-tab-panel .text-slate-900,
        .accounting-tab-panel .text-neutral-900 {
          color: var(--accounting-text) !important;
        }

        .accounting-tab-panel .text-slate-500,
        .accounting-tab-panel .text-neutral-500,
        .accounting-tab-panel .text-neutral-400 {
          color: var(--accounting-muted) !important;
        }

        .accounting-tab-panel table {
          border-collapse: separate;
          border-spacing: 0;
        }

        .accounting-tab-panel thead tr {
          background: var(--accounting-inner) !important;
        }

        .accounting-tab-panel th {
          color: var(--accounting-muted) !important;
          font-size: 12px;
          font-weight: 800;
        }

        .accounting-tab-panel td {
          color: var(--accounting-text);
        }

        .accounting-tab-panel tr:hover {
          background-color: color-mix(in srgb, var(--accounting-info) 6%, white) !important;
        }

        .accounting-tab-panel input,
        .accounting-tab-panel [role="combobox"],
        .accounting-tab-panel textarea {
          background-color: var(--accounting-inner) !important;
          border-color: var(--accounting-border) !important;
        }

        .accounting-tab-panel *:focus-visible {
          outline-color: var(--accounting-focus) !important;
          --tw-ring-color: var(--accounting-focus) !important;
        }

        @media (max-width: 900px) {
          .accounting-tabs-shell {
            grid-template-columns: 1fr;
          }

          .accounting-tabs-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .accounting-command {
            padding: 18px;
          }

          .accounting-tab-panel .p-6,
          .accounting-tab-panel .min-h-screen.p-6 {
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GeneralAccounting;
