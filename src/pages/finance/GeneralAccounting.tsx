/**
 * صفحة المحاسبة العامة الموحدة - تصميم جديد
 * تجمع: دليل الحسابات + دفتر الأستاذ + القيود اليومية
 * متوافق مع الداشبورد الرئيسي
 */
import { useState, useMemo, Suspense, lazy } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import {
  BookOpen,
  FileText,
  ListTree,
  Calculator,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Wallet,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  Building2,
  PieChart,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { useJournalEntries } from "@/hooks/finance/useJournalEntries";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

// Lazy load the tab content components
const ChartOfAccounts = lazy(() => import("./ChartOfAccounts"));
const GeneralLedger = lazy(() => import("./GeneralLedger"));
const Ledger = lazy(() => import("./Ledger"));

// Tab configuration
const TABS = [
  {
    id: "chart",
    label: "دليل الحسابات",
    icon: ListTree,
    description: "شجرة الحسابات وإدارتها",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "ledger",
    label: "دفتر الأستاذ",
    icon: BookOpen,
    description: "سجل الحركات المالية",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "entries",
    label: "القيود اليومية",
    icon: FileText,
    description: "إدارة القيود المحاسبية",
    gradient: "from-purple-500 to-indigo-500",
  },
];

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  trend = 'neutral',
  change,
  delay = 0,
}) => (
  <motion.div
    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-slate-100"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change && (
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg",
          trend === 'up' ? 'bg-green-100 text-green-600' :
          trend === 'down' ? 'bg-red-100 text-red-600' :
          'bg-slate-100 text-slate-600'
        )}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

const GeneralAccounting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const currentTab = searchParams.get("tab") || "chart";

  // Fetch data for stats
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { data: journalEntries, isLoading: entriesLoading } = useJournalEntries({});

  // Calculate statistics
  const stats = useMemo(() => {
    const accountsList = accounts || [];
    const entriesList = journalEntries || [];

    // Account stats
    const totalAccounts = accountsList.length;
    const activeAccounts = accountsList.filter(a => a.is_active).length;
    const headerAccounts = accountsList.filter(a => a.is_header).length;
    
    // Calculate total balances by type
    const assetAccounts = accountsList.filter(a => a.account_type === 'asset');
    const liabilityAccounts = accountsList.filter(a => a.account_type === 'liability');
    const equityAccounts = accountsList.filter(a => a.account_type === 'equity');
    const revenueAccounts = accountsList.filter(a => a.account_type === 'revenue');
    const expenseAccounts = accountsList.filter(a => a.account_type === 'expense');

    const totalAssets = assetAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + Math.abs(a.current_balance || 0), 0);

    // Journal entries stats
    const totalEntries = entriesList.length;
    const postedEntries = entriesList.filter(e => e.status === 'posted').length;
    const draftEntries = entriesList.filter(e => e.status === 'draft').length;
    const totalDebit = entriesList.reduce((sum, e) => sum + (e.total_debit || 0), 0);
    const totalCredit = entriesList.reduce((sum, e) => sum + (e.total_credit || 0), 0);

    return {
      totalAccounts,
      activeAccounts,
      headerAccounts,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      totalEntries,
      postedEntries,
      draftEntries,
      totalDebit,
      totalCredit,
      netIncome: totalRevenue - totalExpenses,
    };
  }, [accounts, journalEntries]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const activeTabConfig = TABS.find((t) => t.id === currentTab) || TABS[0];

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Hero Header */}
      <motion.div
        className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">المحاسبة العامة</h1>
              <p className="text-white/80 text-sm mt-1">
                إدارة دليل الحسابات والقيود المحاسبية ودفتر الأستاذ
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/finance/hub')}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>

        {/* Quick Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">إجمالي الأصول</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAssets)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">إجمالي الالتزامات</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalLiabilities)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">حقوق الملكية</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalEquity)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">صافي الدخل</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              stats.netIncome >= 0 ? 'text-green-200' : 'text-red-200'
            )}>
              {formatCurrency(stats.netIncome)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الحسابات"
          value={stats.totalAccounts}
          subtitle={`${stats.activeAccounts} حساب نشط`}
          icon={ListTree}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
          delay={0.1}
        />
        <StatCard
          title="القيود المسجلة"
          value={stats.totalEntries}
          subtitle={`${stats.postedEntries} قيد مرحّل`}
          icon={FileText}
          iconBg="bg-gradient-to-br from-purple-500 to-indigo-500"
          trend={stats.postedEntries > 0 ? 'up' : 'neutral'}
          change={stats.draftEntries > 0 ? `${stats.draftEntries} مسودة` : undefined}
          delay={0.2}
        />
        <StatCard
          title="إجمالي المدين"
          value={formatCurrency(stats.totalDebit)}
          icon={TrendingUp}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
          delay={0.3}
        />
        <StatCard
          title="إجمالي الدائن"
          value={formatCurrency(stats.totalCredit)}
          icon={TrendingDown}
          iconBg="bg-gradient-to-br from-red-500 to-rose-500"
          delay={0.4}
        />
      </div>

      {/* Tab Navigation Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {TABS.map((tab, index) => (
          <Card
            key={tab.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg border-2",
              currentTab === tab.id 
                ? "border-rose-500 bg-rose-50/50 shadow-md" 
                : "border-transparent hover:border-slate-200"
            )}
            onClick={() => handleTabChange(tab.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                  tab.gradient
                )}>
                  <tab.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-neutral-900">{tab.label}</p>
                    {currentTab === tab.id && (
                      <Badge className="bg-rose-500 text-white">نشط</Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{tab.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs Content */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-sm">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2 transition-all"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* دليل الحسابات */}
        <TabsContent value="chart">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <ChartOfAccounts />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* دفتر الأستاذ */}
        <TabsContent value="ledger">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <GeneralLedger />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* القيود اليومية */}
        <TabsContent value="entries">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <Ledger />
            </Suspense>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneralAccounting;
