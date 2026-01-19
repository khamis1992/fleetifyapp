/**
 * التحليل المالي - تصميم جديد
 * متوافق مع الداشبورد الرئيسي
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calculator,
  DollarSign,
  Target,
  Calendar,
  Activity,
  RefreshCw,
  ArrowLeft,
  Percent,
  LineChart,
  Wallet,
  Building2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useFinancialAnalysis, useBalanceSheet, useIncomeStatement } from "@/hooks/useFinancialAnalysis";
import { useAdvancedFinancialAnalytics } from "@/hooks/useAdvancedFinancialAnalytics";
import { CostCenterReports } from "@/components/finance/CostCenterReports";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

// ===== Stat Card Component =====
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

// ===== Analysis Card Component =====
interface AnalysisCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: number;
  icon?: React.ElementType;
  color?: string;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({
  title,
  value,
  description,
  trend = 'neutral',
  change,
  icon: Icon,
  color = 'text-rose-500',
}) => (
  <div className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-neutral-600">{title}</span>
      {Icon && <Icon className={cn("w-4 h-4", color)} />}
    </div>
    <div className="flex items-end gap-2">
      <span className="text-xl font-bold text-neutral-900">{value}</span>
      {change !== undefined && (
        <span className={cn(
          "text-xs font-medium flex items-center gap-0.5 mb-1",
          change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-500'
        )}>
          {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          {change > 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    {description && <p className="text-xs text-neutral-400 mt-1">{description}</p>}
  </div>
);

const FinancialAnalysis = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState("trends");
  
  const { data: analysisData, isLoading, error, refetch } = useFinancialAnalysis();
  const { data: balanceSheetData } = useBalanceSheet();
  const { data: incomeStatementData } = useIncomeStatement();
  const { data: advancedAnalytics, isLoading: advancedLoading } = useAdvancedFinancialAnalytics();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-rose-500" />
          <p className="text-neutral-500">جاري تحميل التحليل المالي...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">حدث خطأ في تحميل البيانات</p>
          <Button onClick={() => refetch()} className="mt-4">إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  const ratioCategories = [
    {
      category: "نسب السيولة",
      icon: Wallet,
      color: "from-blue-500 to-cyan-500",
      ratios: analysisData?.ratios.filter(r => 
        r.name === "نسبة التداول" || r.name === "النسبة السريعة"
      ) || []
    },
    {
      category: "نسب الربحية",
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
      ratios: analysisData?.ratios.filter(r => 
        r.name.includes("الربح") || r.name.includes("العائد")
      ) || []
    },
    {
      category: "نسب المديونية",
      icon: Building2,
      color: "from-orange-500 to-amber-500",
      ratios: analysisData?.ratios.filter(r => 
        r.name.includes("الدين")
      ) || []
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-blue-500 to-cyan-500';
    if (score >= 40) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'ممتاز';
    if (score >= 60) return 'جيد';
    if (score >= 40) return 'متوسط';
    if (score >= 20) return 'ضعيف';
    return 'خطير';
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
              <PieChart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">التحليل المالي</h1>
              <p className="text-white/80 text-sm mt-1">
                تحليل شامل للأداء المالي والمؤشرات والنسب
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
            <Button
              onClick={() => refetch()}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>
        </div>

        {/* Quick Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">الإيرادات</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(analysisData?.incomeStatement.revenue || 0)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">المصروفات</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(analysisData?.incomeStatement.expenses || 0)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">صافي الربح</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              (analysisData?.incomeStatement.netIncome || 0) >= 0 ? 'text-green-200' : 'text-red-200'
            )}>
              {formatCurrency(analysisData?.incomeStatement.netIncome || 0)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">هامش الربح</p>
            <p className="text-2xl font-bold mt-1">
              {analysisData?.ratios.find(r => r.name === "هامش الربح الصافي")?.value.toFixed(1) || '0'}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TabsList className="bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-sm w-full flex flex-wrap justify-start gap-1">
            <TabsTrigger 
              value="trends" 
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-4 py-2"
            >
              <TrendingUp className="w-4 h-4 ml-2" />
              الاتجاهات
            </TabsTrigger>
            <TabsTrigger 
              value="performance"
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-4 py-2"
            >
              <BarChart3 className="w-4 h-4 ml-2" />
              الأداء
            </TabsTrigger>
            <TabsTrigger 
              value="budget"
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-4 py-2"
            >
              <Target className="w-4 h-4 ml-2" />
              الميزانية
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-4 py-2"
            >
              <Sparkles className="w-4 h-4 ml-2" />
              التحليل المتقدم
            </TabsTrigger>
            <TabsTrigger 
              value="cost-centers"
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-4 py-2"
            >
              <Building2 className="w-4 h-4 ml-2" />
              مراكز التكلفة
            </TabsTrigger>
            <TabsTrigger 
              value="forecast"
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-4 py-2"
            >
              <Calendar className="w-4 h-4 ml-2" />
              التنبؤات
            </TabsTrigger>
            <TabsTrigger 
              value="ratios"
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-lg px-4 py-2"
            >
              <Percent className="w-4 h-4 ml-2" />
              النسب المالية
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">اتجاهات الأداء المالي</h3>
                  <p className="text-sm text-neutral-500">مقارنة الأداء الحالي مع الفترات السابقة</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analysisData?.trends.map((trend, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all hover:shadow-md",
                      trend.trend === 'up' ? 'border-green-200 bg-green-50/50' :
                      trend.trend === 'down' ? 'border-red-200 bg-red-50/50' :
                      'border-slate-200 bg-slate-50/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-neutral-700">{trend.name}</span>
                      {getTrendIcon(trend.trend)}
                    </div>
                    <div className="text-xl font-bold text-neutral-900 mb-1">
                      {formatCurrency(trend.current)}
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">
                      السابق: {formatCurrency(trend.previous)}
                    </div>
                    <div className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                      trend.change > 0 ? 'bg-green-100 text-green-700' :
                      trend.change < 0 ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    )}>
                      {trend.change === 0 ? 'لا تغيير' :
                       trend.change > 0 ? `+${trend.change}%` : `${trend.change}%`}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Financial Performance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">الأداء المالي</h3>
                  <p className="text-sm text-neutral-500">ملخص الأداء المالي</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-neutral-600">إجمالي الإيرادات</span>
                  <span className="font-bold text-green-600">{formatCurrency(analysisData?.incomeStatement.revenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-neutral-600">إجمالي المصروفات</span>
                  <span className="font-bold text-red-600">{formatCurrency(analysisData?.incomeStatement.expenses || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl border border-rose-200">
                  <span className="font-medium text-neutral-700">صافي الربح</span>
                  <span className={cn(
                    "text-xl font-bold",
                    (analysisData?.incomeStatement.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(analysisData?.incomeStatement.netIncome || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Indicators */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">المؤشرات الرئيسية</h3>
                  <p className="text-sm text-neutral-500">مؤشرات الأداء الرئيسية</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-neutral-600">هامش الربح الصافي</span>
                    <span className="font-bold text-coral-600">
                      {analysisData?.ratios.find(r => r.name === "هامش الربح الصافي")?.value.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, analysisData?.ratios.find(r => r.name === "هامش الربح الصافي")?.value || 0)} 
                    className="h-2"
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-neutral-600">العائد على الأصول</span>
                    <span className="font-bold text-blue-600">
                      {analysisData?.ratios.find(r => r.name === "العائد على الأصول")?.value.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, analysisData?.ratios.find(r => r.name === "العائد على الأصول")?.value || 0)} 
                    className="h-2"
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-neutral-600">العائد على حقوق الملكية</span>
                    <span className="font-bold text-green-600">
                      {analysisData?.ratios.find(r => r.name === "العائد على حقوق الملكية")?.value.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, analysisData?.ratios.find(r => r.name === "العائد على حقوق الملكية")?.value || 0)} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">مقارنة الميزانية مع الأداء الفعلي</h3>
                  <p className="text-sm text-neutral-500">مقارنة الأداء المالي الفعلي مع الميزانية المعتمدة</p>
                </div>
              </div>
              
              {analysisData?.budgetComparison ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Revenue Comparison */}
                  <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">الإيرادات</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">الميزانية المعتمدة</span>
                        <span className="font-bold">{formatCurrency(analysisData.budgetComparison.budgetedRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">الإيرادات الفعلية</span>
                        <span className="font-bold text-green-600">{formatCurrency(analysisData.budgetComparison.actualRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-green-200">
                        <span className="text-sm font-medium">الانحراف</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold",
                            analysisData.budgetComparison.revenueVariance >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatCurrency(analysisData.budgetComparison.revenueVariance)}
                          </span>
                          <Badge variant={analysisData.budgetComparison.revenueVariancePercentage >= 0 ? "default" : "destructive"}>
                            {analysisData.budgetComparison.revenueVariancePercentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(100, (analysisData.budgetComparison.actualRevenue / analysisData.budgetComparison.budgetedRevenue) * 100)} 
                        className="h-3"
                      />
                    </div>
                  </div>

                  {/* Expenses Comparison */}
                  <div className="p-5 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-red-600" />
                      <h4 className="font-semibold text-red-800">المصروفات</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">الميزانية المعتمدة</span>
                        <span className="font-bold">{formatCurrency(analysisData.budgetComparison.budgetedExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">المصروفات الفعلية</span>
                        <span className="font-bold text-red-600">{formatCurrency(analysisData.budgetComparison.actualExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-red-200">
                        <span className="text-sm font-medium">الانحراف</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold",
                            analysisData.budgetComparison.expenseVariance <= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatCurrency(analysisData.budgetComparison.expenseVariance)}
                          </span>
                          <Badge variant={analysisData.budgetComparison.expenseVariancePercentage <= 0 ? "default" : "destructive"}>
                            {analysisData.budgetComparison.expenseVariancePercentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(100, (analysisData.budgetComparison.actualExpenses / analysisData.budgetComparison.budgetedExpenses) * 100)} 
                        className="h-3"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">لا توجد ميزانية معتمدة</h3>
                  <p className="text-neutral-500 max-w-md mx-auto">
                    يجب إنشاء واعتماد ميزانية للعام الحالي لعرض المقارنات
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* Advanced Analytics Tab */}
        <TabsContent value="analytics">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {advancedLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-10 h-10 animate-spin text-rose-500" />
              </div>
            ) : (
              <>
                {/* Financial Health Score */}
                {advancedAnalytics?.financialHealthScore && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900">نقاط الصحة المالية</h3>
                        <p className="text-sm text-neutral-500">تقييم شامل للوضع المالي</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Score Display */}
                      <div className="text-center">
                        <div className={cn(
                          "w-32 h-32 rounded-full mx-auto flex items-center justify-center bg-gradient-to-br",
                          getHealthScoreColor(advancedAnalytics.financialHealthScore.score)
                        )}>
                          <span className="text-4xl font-bold text-white">
                            {advancedAnalytics.financialHealthScore.score.toFixed(0)}
                          </span>
                        </div>
                        <Badge 
                          className={cn(
                            "mt-4 text-lg px-4 py-2",
                            advancedAnalytics.financialHealthScore.score >= 80 ? 'bg-green-100 text-green-700' :
                            advancedAnalytics.financialHealthScore.score >= 60 ? 'bg-blue-100 text-blue-700' :
                            advancedAnalytics.financialHealthScore.score >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          )}
                        >
                          {getHealthScoreLabel(advancedAnalytics.financialHealthScore.score)}
                        </Badge>
                      </div>
                      
                      {/* Score Factors */}
                      <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-neutral-600">السيولة</span>
                            <span className="font-bold text-blue-600">{advancedAnalytics.financialHealthScore.factors.liquidityScore.toFixed(0)}</span>
                          </div>
                          <Progress value={advancedAnalytics.financialHealthScore.factors.liquidityScore} className="h-2" />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-neutral-600">الربحية</span>
                            <span className="font-bold text-green-600">{advancedAnalytics.financialHealthScore.factors.profitabilityScore.toFixed(0)}</span>
                          </div>
                          <Progress value={advancedAnalytics.financialHealthScore.factors.profitabilityScore} className="h-2" />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-neutral-600">الكفاءة</span>
                            <span className="font-bold text-purple-600">{advancedAnalytics.financialHealthScore.factors.efficiencyScore.toFixed(0)}</span>
                          </div>
                          <Progress value={advancedAnalytics.financialHealthScore.factors.efficiencyScore} className="h-2" />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-neutral-600">الملاءة المالية</span>
                            <span className="font-bold text-amber-600">{advancedAnalytics.financialHealthScore.factors.solvencyScore.toFixed(0)}</span>
                          </div>
                          <Progress value={advancedAnalytics.financialHealthScore.factors.solvencyScore} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Flow Analysis */}
                {advancedAnalytics?.cashFlowAnalysis && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900">تحليل التدفق النقدي</h3>
                        <p className="text-sm text-neutral-500">مصادر واستخدامات النقد</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 text-center">
                        <p className="text-sm text-neutral-600 mb-2">التدفق التشغيلي</p>
                        <p className={cn(
                          "text-xl font-bold",
                          advancedAnalytics.cashFlowAnalysis.operatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatCurrency(advancedAnalytics.cashFlowAnalysis.operatingCashFlow)}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 text-center">
                        <p className="text-sm text-neutral-600 mb-2">التدفق الاستثماري</p>
                        <p className={cn(
                          "text-xl font-bold",
                          advancedAnalytics.cashFlowAnalysis.investingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatCurrency(advancedAnalytics.cashFlowAnalysis.investingCashFlow)}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 text-center">
                        <p className="text-sm text-neutral-600 mb-2">التدفق التمويلي</p>
                        <p className={cn(
                          "text-xl font-bold",
                          advancedAnalytics.cashFlowAnalysis.financingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatCurrency(advancedAnalytics.cashFlowAnalysis.financingCashFlow)}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl border border-rose-200 text-center">
                        <p className="text-sm text-neutral-600 mb-2">صافي التدفق النقدي</p>
                        <p className={cn(
                          "text-xl font-bold",
                          advancedAnalytics.cashFlowAnalysis.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatCurrency(advancedAnalytics.cashFlowAnalysis.netCashFlow)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cost Center Performance */}
                {advancedAnalytics?.costCenterPerformance && advancedAnalytics.costCenterPerformance.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900">أداء مراكز التكلفة</h3>
                        <p className="text-sm text-neutral-500">تحليل الأداء والكفاءة</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {advancedAnalytics.costCenterPerformance.map((center, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-neutral-800">{center.centerName}</h4>
                            <Badge variant={center.variancePercentage <= 10 ? "default" : center.variancePercentage <= 20 ? "secondary" : "destructive"}>
                              {center.variancePercentage.toFixed(1)}% انحراف
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-neutral-500">الميزانية</p>
                              <p className="font-bold">{formatCurrency(center.budgetAmount)}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500">الفعلي</p>
                              <p className="font-bold">{formatCurrency(center.actualAmount)}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500">الانحراف</p>
                              <p className={cn("font-bold", center.variance <= 0 ? 'text-green-600' : 'text-red-600')}>
                                {formatCurrency(center.variance)}
                              </p>
                            </div>
                          </div>
                          
                          <Progress 
                            value={Math.min(100, (center.actualAmount / center.budgetAmount) * 100)} 
                            className="h-2"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </TabsContent>

        {/* Cost Centers Tab */}
        <TabsContent value="cost-centers">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CostCenterReports />
          </motion.div>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Forecasts */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">التنبؤات المالية</h3>
                  <p className="text-sm text-neutral-500">توقعات الأداء المالي للفترات القادمة</p>
                </div>
              </div>
              
              {analysisData?.forecast && analysisData.forecast.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analysisData.forecast.map((forecast, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-indigo-800">{forecast.period}</h4>
                        <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                          {Math.round(forecast.confidence * 100)}% ثقة
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600">الإيرادات المتوقعة</span>
                          <span className="font-bold text-green-600">{formatCurrency(forecast.revenue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-600">المصروفات المتوقعة</span>
                          <span className="font-bold text-red-600">{formatCurrency(forecast.expenses)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-indigo-200">
                          <span className="text-sm font-medium">الربح المتوقع</span>
                          <span className={cn(
                            "font-bold",
                            forecast.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatCurrency(forecast.netIncome)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                          <Activity className="w-3 h-3" />
                          مؤشر الثقة
                        </div>
                        <Progress value={forecast.confidence * 100} className="h-2" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">بيانات غير كافية للتنبؤ</h3>
                  <p className="text-neutral-500 max-w-md mx-auto">
                    يحتاج النظام إلى بيانات تاريخية أكثر لإنشاء تنبؤات مالية دقيقة
                  </p>
                </div>
              )}
            </div>

            {/* Historical Comparison */}
            {analysisData?.historicalComparison && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <LineChart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">المقارنة التاريخية</h3>
                    <p className="text-sm text-neutral-500">مقارنة الأداء مع العام السابق</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysisData.historicalComparison.map((comparison, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-5 bg-slate-50 rounded-xl"
                    >
                      <h4 className="font-semibold text-neutral-800 mb-4">{comparison.metric}</h4>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-500">العام الحالي</span>
                          <span className="font-bold">{formatCurrency(comparison.currentYear)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-500">العام السابق</span>
                          <span className="font-bold text-neutral-600">{formatCurrency(comparison.previousYear)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t">
                          <span className="text-sm font-medium">التغيير</span>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-bold",
                              comparison.change >= 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {formatCurrency(comparison.change)}
                            </span>
                            <Badge variant={comparison.changePercentage >= 0 ? "default" : "destructive"}>
                              {comparison.changePercentage >= 0 ? '+' : ''}{comparison.changePercentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Financial Ratios Tab */}
        <TabsContent value="ratios">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {ratioCategories.map((category, catIndex) => (
              <div key={catIndex} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className={cn(
                    "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                    category.color
                  )}>
                    <category.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{category.category}</h3>
                    <p className="text-sm text-neutral-500">مؤشرات الأداء المالي</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {category.ratios.map((ratio, ratioIndex) => (
                    <motion.div
                      key={ratioIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ratioIndex * 0.1 }}
                      className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <p className="text-sm font-medium text-neutral-600 mb-2">{ratio.name}</p>
                      <p className="text-2xl font-bold text-coral-600 mb-2">
                        {ratio.percentage 
                          ? `${ratio.value.toFixed(2)}%` 
                          : ratio.value.toFixed(2)
                        }
                      </p>
                      <p className="text-xs text-neutral-400">{ratio.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialAnalysis;
