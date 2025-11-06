import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Zap,
  Shield,
  FileText,
  Download
} from "lucide-react";
import { useAdvancedFinancialRatios, getRatioAssessment } from "@/hooks/useAdvancedFinancialRatios";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

interface RatioCardProps {
  title: string;
  titleEn: string;
  value: number;
  format: 'percentage' | 'ratio' | 'days' | 'currency';
  assessment: ReturnType<typeof getRatioAssessment>;
  description: string;
  icon: any;
  benchmark?: string;
}

function RatioCard({ title, titleEn, value, format: formatType, assessment, description, icon: Icon, benchmark }: RatioCardProps) {
  const { formatCurrency } = useCurrencyFormatter();
  
  const formatValue = () => {
    if (formatType === 'percentage') return `${value.toFixed(2)}%`;
    if (formatType === 'ratio') return value.toFixed(2);
    if (formatType === 'days') return `${Math.round(value)} يوم`;
    if (formatType === 'currency') return formatCurrency(value);
    return value.toString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${assessment.status === 'excellent' ? 'bg-green-100' : assessment.status === 'good' ? 'bg-blue-100' : assessment.status === 'fair' ? 'bg-yellow-100' : 'bg-red-100'}`}>
            <Icon className={`h-6 w-6 ${assessment.color}`} />
          </div>
          <Badge variant={assessment.status === 'excellent' || assessment.status === 'good' ? 'default' : 'secondary'} className={assessment.color}>
            {assessment.label}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {title} <span className="text-xs">({titleEn})</span>
          </h3>
          <div className="text-3xl font-bold">{formatValue()}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
          {benchmark && (
            <p className="text-xs text-blue-600 mt-2">
              📊 المعيار: {benchmark}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdvancedFinancialRatios() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const { formatCurrency } = useCurrencyFormatter();
  
  const today = new Date();
  const startDate = format(
    period === 'month' ? subMonths(today, 1) :
    period === 'quarter' ? subMonths(today, 3) :
    subMonths(today, 12),
    'yyyy-MM-dd'
  );
  const endDate = format(today, 'yyyy-MM-dd');

  const { data: ratios, isLoading } = useAdvancedFinancialRatios(startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!ratios) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">لا توجد بيانات متاحة</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for Radar Chart
  const radarData = [
    { 
      category: 'الربحية', 
      value: (ratios.profitability.netProfitMargin + ratios.profitability.returnOnEquity) / 2 
    },
    { 
      category: 'السيولة', 
      value: ratios.liquidity.currentRatio * 50 // Scale to 0-100
    },
    { 
      category: 'النشاط', 
      value: ratios.activity.assetTurnover * 50 
    },
    { 
      category: 'المديونية', 
      value: 100 - ratios.leverage.debtToAssets // Inverse (lower is better)
    }
  ];

  // Prepare data for comparison
  const comparisonData = [
    { name: 'الربحية الإجمالية', value: ratios.profitability.grossProfitMargin, benchmark: 30 },
    { name: 'الربحية التشغيلية', value: ratios.profitability.operatingProfitMargin, benchmark: 15 },
    { name: 'الربحية الصافية', value: ratios.profitability.netProfitMargin, benchmark: 10 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                التحليلات المالية المتقدمة
              </CardTitle>
              <CardDescription>
                النسب والمؤشرات المالية الرئيسية لتقييم الأداء المالي
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={period === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('month')}
              >
                شهري
              </Button>
              <Button
                variant={period === 'quarter' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('quarter')}
              >
                ربع سنوي
              </Button>
              <Button
                variant={period === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('year')}
              >
                سنوي
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">الإيرادات</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(ratios.rawData.revenue)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-medium">صافي الربح</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(ratios.rawData.netIncome)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">إجمالي الأصول</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(ratios.rawData.totalAssets)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">حقوق الملكية</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(ratios.rawData.totalEquity)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>نظرة شاملة على الأداء</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="الأداء الحالي" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 1. Profitability Ratios */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-green-600" />
          نسب الربحية (Profitability Ratios)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RatioCard
            title="هامش الربح الإجمالي"
            titleEn="Gross Profit Margin"
            value={ratios.profitability.grossProfitMargin}
            format="percentage"
            assessment={getRatioAssessment('profitability', 'grossProfitMargin', ratios.profitability.grossProfitMargin)}
            description="نسبة الربح الإجمالي إلى الإيرادات"
            icon={DollarSign}
            benchmark="20% أو أكثر"
          />
          
          <RatioCard
            title="هامش الربح التشغيلي"
            titleEn="Operating Profit Margin"
            value={ratios.profitability.operatingProfitMargin}
            format="percentage"
            assessment={getRatioAssessment('profitability', 'operatingProfitMargin', ratios.profitability.operatingProfitMargin)}
            description="نسبة الربح التشغيلي إلى الإيرادات"
            icon={Activity}
            benchmark="10% أو أكثر"
          />
          
          <RatioCard
            title="هامش الربح الصافي"
            titleEn="Net Profit Margin"
            value={ratios.profitability.netProfitMargin}
            format="percentage"
            assessment={getRatioAssessment('profitability', 'netProfitMargin', ratios.profitability.netProfitMargin)}
            description="نسبة صافي الربح إلى الإيرادات"
            icon={TrendingUp}
            benchmark="5% أو أكثر"
          />
          
          <RatioCard
            title="العائد على الأصول"
            titleEn="Return on Assets (ROA)"
            value={ratios.profitability.returnOnAssets}
            format="percentage"
            assessment={getRatioAssessment('profitability', 'returnOnAssets', ratios.profitability.returnOnAssets)}
            description="كفاءة استخدام الأصول لتوليد الأرباح"
            icon={Shield}
            benchmark="5% أو أكثر"
          />
          
          <RatioCard
            title="العائد على حقوق الملكية"
            titleEn="Return on Equity (ROE)"
            value={ratios.profitability.returnOnEquity}
            format="percentage"
            assessment={getRatioAssessment('profitability', 'returnOnEquity', ratios.profitability.returnOnEquity)}
            description="العائد على استثمار المساهمين"
            icon={TrendingUp}
            benchmark="10% أو أكثر"
          />
        </div>

        {/* Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle>مقارنة الربحية مع المعايير</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="القيمة الفعلية" />
                <Bar dataKey="benchmark" fill="#10b981" name="المعيار" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 2. Liquidity Ratios */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-blue-600" />
          نسب السيولة (Liquidity Ratios)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RatioCard
            title="نسبة التداول"
            titleEn="Current Ratio"
            value={ratios.liquidity.currentRatio}
            format="ratio"
            assessment={getRatioAssessment('liquidity', 'currentRatio', ratios.liquidity.currentRatio)}
            description="قدرة الشركة على سداد الالتزامات قصيرة الأجل"
            icon={Activity}
            benchmark="1.5 - 2.0"
          />
          
          <RatioCard
            title="نسبة السيولة السريعة"
            titleEn="Quick Ratio"
            value={ratios.liquidity.quickRatio}
            format="ratio"
            assessment={getRatioAssessment('liquidity', 'quickRatio', ratios.liquidity.quickRatio)}
            description="السيولة بدون المخزون"
            icon={Zap}
            benchmark="1.0 أو أكثر"
          />
          
          <RatioCard
            title="نسبة النقدية"
            titleEn="Cash Ratio"
            value={ratios.liquidity.cashRatio}
            format="ratio"
            assessment={getRatioAssessment('liquidity', 'quickRatio', ratios.liquidity.cashRatio)}
            description="قدرة السداد بالنقد فقط"
            icon={DollarSign}
            benchmark="0.5 - 1.0"
          />
          
          <RatioCard
            title="رأس المال العامل"
            titleEn="Working Capital"
            value={ratios.liquidity.workingCapital}
            format="currency"
            assessment={
              ratios.liquidity.workingCapital > 0
                ? { status: 'excellent', label: 'إيجابي', color: 'text-green-600' }
                : { status: 'poor', label: 'سلبي', color: 'text-red-600' }
            }
            description="الفرق بين الأصول والخصوم المتداولة"
            icon={Shield}
            benchmark="إيجابي"
          />
        </div>
      </div>

      {/* 3. Activity Ratios */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-purple-600" />
          نسب النشاط (Activity Ratios)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RatioCard
            title="معدل دوران الأصول"
            titleEn="Asset Turnover"
            value={ratios.activity.assetTurnover}
            format="ratio"
            assessment={getRatioAssessment('activity', 'assetTurnover', ratios.activity.assetTurnover)}
            description="كفاءة استخدام الأصول لتوليد الإيرادات"
            icon={Activity}
            benchmark="1.0 أو أكثر"
          />
          
          <RatioCard
            title="معدل دوران المخزون"
            titleEn="Inventory Turnover"
            value={ratios.activity.inventoryTurnover}
            format="ratio"
            assessment={getRatioAssessment('activity', 'assetTurnover', ratios.activity.inventoryTurnover)}
            description="عدد مرات بيع المخزون خلال الفترة"
            icon={TrendingUp}
            benchmark="4 - 6 مرات"
          />
          
          <RatioCard
            title="معدل دوران المدينين"
            titleEn="Receivables Turnover"
            value={ratios.activity.receivablesTurnover}
            format="ratio"
            assessment={getRatioAssessment('activity', 'assetTurnover', ratios.activity.receivablesTurnover)}
            description="كفاءة تحصيل المستحقات"
            icon={DollarSign}
            benchmark="6 - 12 مرة"
          />
          
          <RatioCard
            title="متوسط فترة التحصيل"
            titleEn="Days Sales Outstanding"
            value={ratios.activity.daysSalesOutstanding}
            format="days"
            assessment={getRatioAssessment('activity', 'daysSalesOutstanding', ratios.activity.daysSalesOutstanding)}
            description="متوسط الوقت لتحصيل المستحقات"
            icon={FileText}
            benchmark="30 - 45 يوم"
          />
        </div>
      </div>

      {/* 4. Leverage Ratios */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-orange-600" />
          نسب المديونية (Leverage Ratios)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RatioCard
            title="نسبة الدين إلى الأصول"
            titleEn="Debt to Assets"
            value={ratios.leverage.debtToAssets}
            format="percentage"
            assessment={getRatioAssessment('leverage', 'debtToAssets', ratios.leverage.debtToAssets)}
            description="نسبة الأصول الممولة بالديون"
            icon={TrendingDown}
            benchmark="أقل من 50%"
          />
          
          <RatioCard
            title="نسبة الدين إلى حقوق الملكية"
            titleEn="Debt to Equity"
            value={ratios.leverage.debtToEquity}
            format="percentage"
            assessment={getRatioAssessment('leverage', 'debtToEquity', ratios.leverage.debtToEquity)}
            description="نسبة الديون إلى حقوق المساهمين"
            icon={Shield}
            benchmark="أقل من 100%"
          />
          
          <RatioCard
            title="نسبة حقوق الملكية"
            titleEn="Equity Ratio"
            value={ratios.leverage.equityRatio}
            format="percentage"
            assessment={getRatioAssessment('leverage', 'debtToEquity', 100 - ratios.leverage.equityRatio)}
            description="نسبة الأصول الممولة بحقوق الملكية"
            icon={TrendingUp}
            benchmark="أكثر من 50%"
          />
        </div>
      </div>

      {/* Export Button */}
      <Card>
        <CardContent className="p-4 flex items-center justify-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير التحليل الكامل (PDF)
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير (Excel)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

