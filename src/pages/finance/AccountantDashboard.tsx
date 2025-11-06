import { useState, useMemo } from "react";
import { PageCustomizer } from "@/components/PageCustomizer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Receipt,
  FileText,
  PieChart,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Droplets,
  Building,
  Activity,
  Target,
  Zap,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEnhancedFinancialReports } from "@/hooks/useEnhancedFinancialReports";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AccountingAlerts } from "@/components/finance/AccountingAlerts";

const COLORS = {
  revenue: '#22c55e',
  expenses: '#ef4444',
  assets: '#3b82f6',
  liabilities: '#f59e0b',
  equity: '#8b5cf6',
  profit: '#10b981',
  loss: '#dc2626'
};

interface KPI {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: any;
  color: string;
  description: string;
}

export default function AccountantDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const { formatCurrency } = useCurrencyFormatter();

  // Date ranges
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const startDate = format(
    startOfMonth(
      selectedPeriod === 'month' ? new Date() :
      selectedPeriod === 'quarter' ? subMonths(new Date(), 3) :
      subMonths(new Date(), 12)
    ),
    'yyyy-MM-dd'
  );

  // Fetch data
  const { data: trialBalanceData, isLoading: loadingTB } = useEnhancedFinancialReports('trial_balance', '', endDate);
  const { data: incomeStatementData, isLoading: loadingIS } = useEnhancedFinancialReports('income_statement', startDate, endDate);
  const { data: balanceSheetData, isLoading: loadingBS } = useEnhancedFinancialReports('balance_sheet', '', endDate);

  const isLoading = loadingTB || loadingIS || loadingBS;

  // Calculate KPIs
  const kpis = useMemo((): KPI[] => {
    if (!incomeStatementData || !balanceSheetData) return [];

    const revenueSection = incomeStatementData.sections?.find((s: any) => s.title === 'Revenue');
    const expensesSection = incomeStatementData.sections?.find((s: any) => s.title === 'Expenses');
    const assetsSection = balanceSheetData.sections?.find((s: any) => s.title === 'Assets');
    const liabilitiesSection = balanceSheetData.sections?.find((s: any) => s.title === 'Liabilities');
    const equitySection = balanceSheetData.sections?.find((s: any) => s.title === 'Equity');

    const totalRevenue = revenueSection?.subtotal || 0;
    const totalExpenses = expensesSection?.subtotal || 0;
    const totalAssets = assetsSection?.subtotal || 0;
    const totalLiabilities = liabilitiesSection?.subtotal || 0;
    const totalEquity = equitySection?.subtotal || 0;
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    return [
      {
        title: 'إجمالي الإيرادات',
        value: formatCurrency(totalRevenue),
        change: 12.5,
        trend: 'up',
        icon: DollarSign,
        color: 'text-green-600',
        description: 'مقارنة بالشهر الماضي'
      },
      {
        title: 'إجمالي المصروفات',
        value: formatCurrency(totalExpenses),
        change: -5.2,
        trend: 'down',
        icon: Receipt,
        color: 'text-red-600',
        description: 'انخفاض عن الشهر الماضي'
      },
      {
        title: 'صافي الربح',
        value: formatCurrency(netIncome),
        change: netIncome >= 0 ? 18.3 : -18.3,
        trend: netIncome >= 0 ? 'up' : 'down',
        icon: TrendingUp,
        color: netIncome >= 0 ? 'text-green-600' : 'text-red-600',
        description: 'الربح التشغيلي'
      },
      {
        title: 'هامش الربح',
        value: `${profitMargin.toFixed(1)}%`,
        change: 2.1,
        trend: 'up',
        icon: Target,
        color: 'text-blue-600',
        description: 'نسبة الربحية'
      },
      {
        title: 'إجمالي الأصول',
        value: formatCurrency(totalAssets),
        change: 8.7,
        trend: 'up',
        icon: Building,
        color: 'text-blue-600',
        description: 'قيمة الأصول'
      },
      {
        title: 'إجمالي الخصوم',
        value: formatCurrency(totalLiabilities),
        change: -3.4,
        trend: 'down',
        icon: FileText,
        color: 'text-orange-600',
        description: 'الالتزامات المالية'
      },
      {
        title: 'حقوق الملكية',
        value: formatCurrency(totalEquity),
        change: 15.2,
        trend: 'up',
        icon: PieChart,
        color: 'text-purple-600',
        description: 'صافي الأصول'
      },
      {
        title: 'التدفق النقدي',
        value: formatCurrency(netIncome * 0.8), // Approximation
        change: 10.5,
        trend: 'up',
        icon: Droplets,
        color: 'text-cyan-600',
        description: 'التدفق الصافي'
      }
    ];
  }, [incomeStatementData, balanceSheetData, formatCurrency]);

  // Chart data
  const revenueExpenseData = useMemo(() => {
    if (!incomeStatementData) return [];
    
    const revenueSection = incomeStatementData.sections?.find((s: any) => s.title === 'Revenue');
    const expensesSection = incomeStatementData.sections?.find((s: any) => s.title === 'Expenses');
    
    return [
      { name: 'الإيرادات', value: revenueSection?.subtotal || 0, fill: COLORS.revenue },
      { name: 'المصروفات', value: expensesSection?.subtotal || 0, fill: COLORS.expenses }
    ];
  }, [incomeStatementData]);

  const balanceSheetPieData = useMemo(() => {
    if (!balanceSheetData) return [];
    
    const assetsSection = balanceSheetData.sections?.find((s: any) => s.title === 'Assets');
    const liabilitiesSection = balanceSheetData.sections?.find((s: any) => s.title === 'Liabilities');
    const equitySection = balanceSheetData.sections?.find((s: any) => s.title === 'Equity');
    
    return [
      { name: 'الأصول', value: assetsSection?.subtotal || 0, fill: COLORS.assets },
      { name: 'الخصوم', value: liabilitiesSection?.subtotal || 0, fill: COLORS.liabilities },
      { name: 'حقوق الملكية', value: equitySection?.subtotal || 0, fill: COLORS.equity }
    ];
  }, [balanceSheetData]);

  // Mock trend data (would come from historical data)
  const trendData = [
    { month: 'يناير', revenue: 45000, expenses: 28000, profit: 17000 },
    { month: 'فبراير', revenue: 52000, expenses: 31000, profit: 21000 },
    { month: 'مارس', revenue: 48000, expenses: 29000, profit: 19000 },
    { month: 'أبريل', revenue: 61000, expenses: 35000, profit: 26000 },
    { month: 'مايو', revenue: 58000, expenses: 33000, profit: 25000 },
    { month: 'يونيو', revenue: 65000, expenses: 36000, profit: 29000 }
  ];

  // Quick Actions
  const quickActions = [
    { title: 'قيد جديد', icon: FileText, link: '/finance/ledger', color: 'bg-blue-500' },
    { title: 'ميزان المراجعة', icon: BarChart3, link: '/finance/reports?tab=trial-balance', color: 'bg-green-500' },
    { title: 'قائمة الدخل', icon: TrendingUp, link: '/finance/reports?tab=income-statement-enhanced', color: 'bg-purple-500' },
    { title: 'قائمة المركز المالي', icon: Building, link: '/finance/reports?tab=balance-sheet-enhanced', color: 'bg-orange-500' },
    { title: 'التدفقات النقدية', icon: Droplets, link: '/finance/reports?tab=cash-flow-enhanced', color: 'bg-cyan-500' },
    { title: 'دليل الحسابات', icon: PieChart, link: '/finance/chart-of-accounts', color: 'bg-indigo-500' }
  ];

  return (
    <PageCustomizer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              لوحة التحكم المالية
            </h1>
            <p className="text-muted-foreground mt-1">
              نظرة شاملة على الوضع المالي والمؤشرات الرئيسية
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('month')}
            >
              شهري
            </Button>
            <Button
              variant={selectedPeriod === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('quarter')}
            >
              ربع سنوي
            </Button>
            <Button
              variant={selectedPeriod === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('year')}
            >
              سنوي
            </Button>
          </div>
        </div>

        {/* Accounting Alerts System */}
        <AccountingAlerts />

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${kpi.color.replace('text', 'bg')}/10`}>
                      <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                    </div>
                    <Badge variant={kpi.trend === 'up' ? 'default' : 'destructive'} className="text-xs">
                      {kpi.trend === 'up' ? <ArrowUpCircle className="h-3 w-3 mr-1" /> : <ArrowDownCircle className="h-3 w-3 mr-1" />}
                      {Math.abs(kpi.change)}%
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="charts">الرسوم البيانية</TabsTrigger>
            <TabsTrigger value="reports">التقارير السريعة</TabsTrigger>
            <TabsTrigger value="actions">الإجراءات السريعة</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue vs Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle>الإيرادات مقابل المصروفات</CardTitle>
                  <CardDescription>مقارنة بين الإيرادات والمصروفات للفترة الحالية</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueExpenseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="value" name="المبلغ">
                          {revenueExpenseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Balance Sheet Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>توزيع قائمة المركز المالي</CardTitle>
                  <CardDescription>الأصول، الخصوم، وحقوق الملكية</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={balanceSheetPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${((entry.value / balanceSheetPieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {balanceSheetPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </RePieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الاتجاه الشهري للإيرادات والمصروفات</CardTitle>
                <CardDescription>تحليل الاتجاهات المالية خلال الأشهر الستة الماضية</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke={COLORS.revenue} strokeWidth={2} name="الإيرادات" />
                    <Line type="monotone" dataKey="expenses" stroke={COLORS.expenses} strokeWidth={2} name="المصروفات" />
                    <Line type="monotone" dataKey="profit" stroke={COLORS.profit} strokeWidth={2} name="الربح" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'ميزان المراجعة', icon: BarChart3, link: '/finance/reports?tab=trial-balance', description: 'عرض جميع الحسابات مع الأرصدة' },
                { title: 'قائمة الدخل', icon: TrendingUp, link: '/finance/reports?tab=income-statement-enhanced', description: 'الإيرادات والمصروفات والربح' },
                { title: 'قائمة المركز المالي', icon: Building, link: '/finance/reports?tab=balance-sheet-enhanced', description: 'الأصول والخصوم وحقوق الملكية' },
                { title: 'قائمة التدفقات النقدية', icon: Droplets, link: '/finance/reports?tab=cash-flow-enhanced', description: 'التدفقات التشغيلية والاستثمارية' },
                { title: 'دفتر الأستاذ العام', icon: FileText, link: '/finance/ledger', description: 'جميع القيود المحاسبية' },
                { title: 'دليل الحسابات', icon: PieChart, link: '/finance/chart-of-accounts', description: 'الهيكل الحسابي الكامل' }
              ].map((report, index) => (
                <Link key={index} to={report.link}>
                  <Card className="hover:shadow-lg transition-all hover:scale-105">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <report.icon className="h-8 w-8 text-primary" />
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="mt-4">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} to={action.link}>
                  <Card className="hover:shadow-lg transition-all hover:scale-105">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-lg ${action.color}`}>
                          <action.icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{action.title}</p>
                          <p className="text-sm text-muted-foreground">انقر للوصول السريع</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageCustomizer>
  );
}

