/**
 * صفحة التقارير والتحليل المالي الموحدة - تصميم جديد
 * تجمع: التقارير المالية + التحليل المالي + النسب المالية + الحاسبة
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Percent,
  Calculator,
  ArrowLeft,
  FileText,
  PieChart,
  RefreshCw,
  Download,
  Activity,
  DollarSign,
  Target,
  Sparkles,
  LineChart,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinancialAnalysis } from "@/hooks/useFinancialAnalysis";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

// Lazy load the tab content components
const Reports = lazy(() => import("./Reports"));
const FinancialAnalysis = lazy(() => import("./FinancialAnalysis"));
const FinancialRatios = lazy(() => import("./FinancialRatios"));
const FinancialCalculator = lazy(() => import("./Calculator"));

// Tab configuration
const TABS = [
  {
    id: "reports",
    label: "التقارير المالية",
    icon: FileText,
    description: "تقارير وتحليلات شاملة",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "analysis",
    label: "التحليل المالي",
    icon: TrendingUp,
    description: "تحليل الأداء والاتجاهات",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "ratios",
    label: "النسب المالية",
    icon: Percent,
    description: "تحليل النسب والمؤشرات",
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

const ReportsAndAnalysis = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const currentTab = searchParams.get("tab") || "reports";
  const [showCalculator, setShowCalculator] = useState(false);

  // Fetch financial data for stats
  const { data: analysisData, isLoading } = useFinancialAnalysis();

  // Calculate quick stats
  const stats = useMemo(() => {
    if (!analysisData) {
      return {
        revenue: 0,
        expenses: 0,
        netIncome: 0,
        profitMargin: 0,
        currentRatio: 0,
        debtRatio: 0,
      };
    }

    const profitMarginRatio = analysisData.ratios?.find(r => r.name === "هامش الربح الصافي");
    const currentRatioData = analysisData.ratios?.find(r => r.name === "نسبة التداول");
    const debtRatioData = analysisData.ratios?.find(r => r.name.includes("الدين"));

    return {
      revenue: analysisData.incomeStatement?.revenue || 0,
      expenses: analysisData.incomeStatement?.expenses || 0,
      netIncome: analysisData.incomeStatement?.netIncome || 0,
      profitMargin: profitMarginRatio?.value || 0,
      currentRatio: currentRatioData?.value || 0,
      debtRatio: debtRatioData?.value || 0,
    };
  }, [analysisData]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

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
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">التقارير والتحليل المالي</h1>
              <p className="text-white/80 text-sm mt-1">
                تقارير شاملة وتحليلات مالية متقدمة ونسب الأداء
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Calculator Modal Button */}
            <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                >
                  <Calculator className="h-4 w-4 ml-2" />
                  الحاسبة المالية
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-rose-500" />
                    الحاسبة المالية
                  </DialogTitle>
                </DialogHeader>
                <Suspense fallback={<PageSkeletonFallback />}>
                  <FinancialCalculator />
                </Suspense>
              </DialogContent>
            </Dialog>
            
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
            <p className="text-white/70 text-sm">الإيرادات</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.revenue)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">المصروفات</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.expenses)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">صافي الربح</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              stats.netIncome >= 0 ? 'text-green-200' : 'text-red-200'
            )}>
              {formatCurrency(stats.netIncome)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">هامش الربح</p>
            <p className="text-2xl font-bold mt-1">{stats.profitMargin.toFixed(1)}%</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(stats.revenue)}
          subtitle="إجمالي الدخل"
          icon={DollarSign}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
          trend={stats.revenue > 0 ? 'up' : 'neutral'}
          delay={0.1}
        />
        <StatCard
          title="إجمالي المصروفات"
          value={formatCurrency(stats.expenses)}
          subtitle="إجمالي النفقات"
          icon={TrendingDown}
          iconBg="bg-gradient-to-br from-red-500 to-rose-500"
          delay={0.2}
        />
        <StatCard
          title="صافي الربح"
          value={formatCurrency(stats.netIncome)}
          subtitle="الإيرادات - المصروفات"
          icon={Target}
          iconBg="bg-gradient-to-br from-rose-500 to-orange-500"
          trend={stats.netIncome >= 0 ? 'up' : 'down'}
          change={stats.netIncome >= 0 ? 'ربح' : 'خسارة'}
          delay={0.3}
        />
        <StatCard
          title="هامش الربح الصافي"
          value={`${stats.profitMargin.toFixed(1)}%`}
          subtitle="نسبة الربحية"
          icon={Percent}
          iconBg="bg-gradient-to-br from-purple-500 to-indigo-500"
          trend={stats.profitMargin >= 10 ? 'up' : stats.profitMargin > 0 ? 'neutral' : 'down'}
          change={stats.profitMargin >= 10 ? 'جيد' : stats.profitMargin > 0 ? 'مقبول' : 'ضعيف'}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
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
        </motion.div>

        {/* التقارير المالية */}
        <TabsContent value="reports">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <Reports />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* التحليل المالي */}
        <TabsContent value="analysis">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinancialAnalysis />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* النسب المالية */}
        <TabsContent value="ratios">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinancialRatios />
            </Suspense>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsAndAnalysis;
