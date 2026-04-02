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
import { StatCard } from "@/components/ui/StatCard";
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
    variant: "sky" as const,
  },
  {
    id: "ledger",
    label: "دفتر الأستاذ",
    icon: BookOpen,
    description: "سجل الحركات المالية",
    variant: "success" as const,
  },
  {
    id: "entries",
    label: "القيود اليومية",
    icon: FileText,
    description: "إدارة القيود المحاسبية",
    variant: "violet" as const,
  },
];

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
        className="bg-white rounded-xl p-6 mb-6 border border-slate-200 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
              <Calculator className="w-7 h-7 text-rose-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">المحاسبة العامة</h1>
              <p className="text-neutral-500 text-sm mt-1">
                إدارة دليل الحسابات والقيود المحاسبية ودفتر الأستاذ
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/finance/hub')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>

        {/* Quick Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-neutral-500 text-sm">إجمالي الأصول</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAssets)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-neutral-500 text-sm">إجمالي الالتزامات</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalLiabilities)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-neutral-500 text-sm">حقوق الملكية</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalEquity)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-neutral-500 text-sm">صافي الدخل</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
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
          variant="sky"
        />
        <StatCard
          title="القيود المسجلة"
          value={stats.totalEntries}
          subtitle={`${stats.postedEntries} قيد مرحّل`}
          icon={FileText}
          variant="violet"
          trend={stats.postedEntries > 0 ? 'up' : 'neutral'}
          change={stats.draftEntries > 0 ? `${stats.draftEntries} مسودة` : undefined}
        />
        <StatCard
          title="إجمالي المدين"
          value={formatCurrency(stats.totalDebit)}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="إجمالي الدائن"
          value={formatCurrency(stats.totalCredit)}
          icon={TrendingDown}
          variant="danger"
        />
      </div>

      {/* Tab Navigation Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {TABS.map((tab) => (
          <Card
            key={tab.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              currentTab === tab.id 
                ? "border-rose-500 bg-rose-50/50 shadow-md" 
                : "border-transparent hover:border-slate-200"
            )}
            onClick={() => handleTabChange(tab.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  tab.variant === 'sky' && 'bg-sky-100',
                  tab.variant === 'success' && 'bg-green-100',
                  tab.variant === 'violet' && 'bg-violet-100'
                )}>
                  <tab.icon className={cn(
                    "w-6 h-6",
                    tab.variant === 'sky' && 'text-sky-600',
                    tab.variant === 'success' && 'text-green-600',
                    tab.variant === 'violet' && 'text-violet-600'
                  )} />
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
