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

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'good' | 'warning' | 'danger';
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  trend = 'neutral',
  status = 'good',
  delay = 0,
}) => (
  <motion.div
    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {status && (
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          status === 'good' ? 'bg-green-100' :
          status === 'warning' ? 'bg-amber-100' :
          'bg-red-100'
        )}>
          {status === 'good' && <CheckCircle className="w-4 h-4 text-green-600" />}
          {status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
          {status === 'danger' && <AlertTriangle className="w-4 h-4 text-red-600" />}
        </div>
      )}
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

// Ratio Categories
const RATIO_CATEGORIES = [
  {
    id: "liquidity",
    name: "نسب السيولة",
    description: "قياس قدرة الشركة على الوفاء بالتزاماتها قصيرة الأجل",
    icon: Wallet,
    gradient: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "profitability",
    name: "نسب الربحية",
    description: "قياس كفاءة الشركة في تحقيق الأرباح",
    icon: TrendingUp,
    gradient: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    id: "leverage",
    name: "نسب المديونية",
    description: "قياس مدى اعتماد الشركة على التمويل بالديون",
    icon: Building2,
    gradient: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "efficiency",
    name: "نسب الكفاءة",
    description: "قياس كفاءة استخدام الموارد والأصول",
    icon: Activity,
    gradient: "from-purple-500 to-indigo-500",
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
          <RefreshCw className="w-10 h-10 animate-spin text-coral-500" />
          <p className="text-neutral-500">جاري تحميل النسب المالية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Hero Header */}
      <motion.div
        className="bg-gradient-to-r from-coral-500 to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Percent className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">النسب المالية</h1>
              <p className="text-white/80 text-sm mt-1">
                تحليل شامل للنسب والمؤشرات المالية الرئيسية
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
            iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
            status={getRatioStatus(keyRatios.currentRatio, 'currentRatio')}
            delay={0.1}
          />
          <StatCard
            title="النسبة السريعة"
            value={keyRatios.quickRatio.toFixed(2)}
            subtitle="Quick Ratio"
            icon={Gauge}
            iconBg="bg-gradient-to-br from-purple-500 to-indigo-500"
            status={getRatioStatus(keyRatios.quickRatio, 'quickRatio')}
            delay={0.15}
          />
          <StatCard
            title="هامش الربح الصافي"
            value={`${keyRatios.profitMargin.toFixed(1)}%`}
            subtitle="Net Profit Margin"
            icon={TrendingUp}
            iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
            status={getRatioStatus(keyRatios.profitMargin, 'profitMargin')}
            delay={0.2}
          />
          <StatCard
            title="نسبة الدين للأصول"
            value={`${keyRatios.debtRatio.toFixed(1)}%`}
            subtitle="Debt to Assets"
            icon={Building2}
            iconBg="bg-gradient-to-br from-amber-500 to-orange-500"
            status={getRatioStatus(keyRatios.debtRatio, 'debtRatio')}
            delay={0.25}
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
                  "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                  category.gradient
                )}>
                  <category.icon className="w-6 h-6 text-white" />
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
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center">
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
