/**
 * صفحة النسب المالية - تصميم جديد متوافق مع الداشبورد
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/StatCard";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Percent,
  ArrowLeft,
  RefreshCw,
  Wallet,
  DollarSign,
  Building2,
  BarChart3,
  Target,
  Gauge,
  Scale,
  PiggyBank,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { AdvancedFinancialRatios } from "@/components/finance/AdvancedFinancialRatios";
import { useFinancialAnalysis } from "@/hooks/useFinancialAnalysis";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";

// Ratio Categories
const RATIO_CATEGORIES = [
  {
    id: "liquidity",
    name: "نسب السيولة",
    description: "قياس قدرة الشركة على الوفاء بالتزاماتها قصيرة الأجل",
    icon: Wallet,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "profitability",
    name: "نسب الربحية",
    description: "قياس كفاءة الشركة في تحقيق الأرباح",
    icon: TrendingUp,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    id: "leverage",
    name: "نسب المديونية",
    description: "قياس مدى اعتماد الشركة على التمويل بالديون",
    icon: Building2,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "efficiency",
    name: "نسب الكفاءة",
    description: "قياس كفاءة استخدام الموارد والأصول",
    icon: Activity,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
];

export default function FinancialRatios() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: analysisData, isLoading, refetch } = useFinancialAnalysis();

  // Calculate key ratios for summary
  const keyRatios = useMemo(() => {
    if (!analysisData?.ratios) return null;

    const findRatio = (name: string) => analysisData.ratios.find(r => r.name === name);
    
    const currentRatio = findRatio("نسبة التداول");
    const quickRatio = findRatio("النسبة السريعة");
    const profitMargin = findRatio("هامش الربح الصافي");
    const roa = findRatio("العائد على الأصول");
    const roe = findRatio("العائد على حقوق الملكية");
    const debtRatio = findRatio("نسبة الدين إلى الأصول");

    return {
      currentRatio: currentRatio?.value || 0,
      quickRatio: quickRatio?.value || 0,
      profitMargin: profitMargin?.value || 0,
      roa: roa?.value || 0,
      roe: roe?.value || 0,
      debtRatio: debtRatio?.value || 0,
    };
  }, [analysisData]);

  // Get status based on ratio value
  const getRatioStatus = (value: number, type: string): 'good' | 'warning' | 'danger' => {
    switch (type) {
      case 'currentRatio':
        if (value >= 2) return 'good';
        if (value >= 1) return 'warning';
        return 'danger';
      case 'quickRatio':
        if (value >= 1) return 'good';
        if (value >= 0.5) return 'warning';
        return 'danger';
      case 'profitMargin':
        if (value >= 15) return 'good';
        if (value >= 5) return 'warning';
        return 'danger';
      case 'debtRatio':
        if (value <= 40) return 'good';
        if (value <= 60) return 'warning';
        return 'danger';
      default:
        return 'good';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-rose-500" />
          <p className="text-neutral-500">جاري تحميل النسب المالية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">النسب المالية</h1>
        <p className="text-sm text-slate-500 mt-1">تحليل شامل للنسب والمؤشرات المالية الرئيسية</p>
      </div>

      {/* Hero Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg">
              <Percent className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">لوحة النسب المالية</h2>
              <p className="text-slate-500 text-sm">
                مراجعة شاملة للأداء المالي
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => refetch()}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button
              onClick={() => navigate('/finance/reports-analysis')}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>

        {/* Quick Ratios Summary */}
        {keyRatios && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">نسبة التداول</p>
              <p className="text-2xl font-bold mt-1">{keyRatios.currentRatio.toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getRatioStatus(keyRatios.currentRatio, 'currentRatio') === 'good' ? 'bg-green-300' :
                  getRatioStatus(keyRatios.currentRatio, 'currentRatio') === 'warning' ? 'bg-amber-300' :
                  'bg-red-300'
                )} />
                <span className="text-xs text-white/60">
                  {getRatioStatus(keyRatios.currentRatio, 'currentRatio') === 'good' ? 'ممتاز' :
                   getRatioStatus(keyRatios.currentRatio, 'currentRatio') === 'warning' ? 'مقبول' : 'ضعيف'}
                </span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">هامش الربح</p>
              <p className="text-2xl font-bold mt-1">{keyRatios.profitMargin.toFixed(1)}%</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getRatioStatus(keyRatios.profitMargin, 'profitMargin') === 'good' ? 'bg-green-300' :
                  getRatioStatus(keyRatios.profitMargin, 'profitMargin') === 'warning' ? 'bg-amber-300' :
                  'bg-red-300'
                )} />
                <span className="text-xs text-white/60">
                  {getRatioStatus(keyRatios.profitMargin, 'profitMargin') === 'good' ? 'ممتاز' :
                   getRatioStatus(keyRatios.profitMargin, 'profitMargin') === 'warning' ? 'مقبول' : 'ضعيف'}
                </span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">العائد على الأصول</p>
              <p className="text-2xl font-bold mt-1">{keyRatios.roa.toFixed(1)}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">نسبة الدين</p>
              <p className="text-2xl font-bold mt-1">{keyRatios.debtRatio.toFixed(1)}%</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getRatioStatus(keyRatios.debtRatio, 'debtRatio') === 'good' ? 'bg-green-300' :
                  getRatioStatus(keyRatios.debtRatio, 'debtRatio') === 'warning' ? 'bg-amber-300' :
                  'bg-red-300'
                )} />
                <span className="text-xs text-white/60">
                  {getRatioStatus(keyRatios.debtRatio, 'debtRatio') === 'good' ? 'آمن' :
                   getRatioStatus(keyRatios.debtRatio, 'debtRatio') === 'warning' ? 'متوسط' : 'مرتفع'}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Key Ratios Cards */}
      {keyRatios && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="نسبة التداول"
            value={keyRatios.currentRatio.toFixed(2)}
            subtitle="Current Ratio"
            icon={Scale}
            variant="sky"
          />
          <StatCard
            title="النسبة السريعة"
            value={keyRatios.quickRatio.toFixed(2)}
            subtitle="Quick Ratio"
            icon={Gauge}
            variant="violet"
          />
          <StatCard
            title="هامش الربح الصافي"
            value={`${keyRatios.profitMargin.toFixed(1)}%`}
            subtitle="Net Profit Margin"
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="نسبة الدين للأصول"
            value={`${keyRatios.debtRatio.toFixed(1)}%`}
            subtitle="Debt to Assets"
            icon={Building2}
            variant="amber"
          />
        </div>
      )}

      {/* Ratio Categories */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {RATIO_CATEGORIES.map((category, index) => (
          <Card
            key={category.id}
            className={cn(
              "transition-all hover:shadow-lg border-2 cursor-pointer",
              category.borderColor,
              category.bgColor
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  category.bgColor
                )}>
                  <category.icon className="w-6 h-6 text-neutral-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">{category.name}</p>
                </div>
              </div>
              <p className="text-sm text-neutral-600">{category.description}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Detailed Ratios Component */}
      <motion.div
        className="bg-white rounded-xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">التحليلات المالية المتقدمة</h3>
              <p className="text-sm text-neutral-500">جميع النسب والمؤشرات المالية بالتفصيل</p>
            </div>
          </div>
        </div>
        <AdvancedFinancialRatios />
      </motion.div>
    </div>
  );
}
