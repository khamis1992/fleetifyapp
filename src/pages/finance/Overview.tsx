import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Receipt,
  CreditCard,
  TrendingUp,
  Building,
  Calculator,
  FileText,
  Target,
  Banknote,
  BookOpen,
  Settings,
  BarChart3,
  FilePlus,
  LayoutDashboard,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Activity,
  PieChart,
  AreaChart
} from "lucide-react";
import { Link } from "react-router-dom";
import { useFinancialSummary } from "@/hooks/useFinance";
import { useTreasurySummary } from "@/hooks/useTreasury";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PayrollIntegrationCard } from "@/components/finance/PayrollIntegrationCard";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { motion } from "framer-motion";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const Overview = () => {
  const { data: financialSummary, isLoading } = useFinancialSummary();
  const { data: treasurySummary, isLoading: treasuryLoading } = useTreasurySummary();
  const { data: invoicesData } = useInvoices({ status: 'all' });
  const { formatCurrency } = useCurrencyFormatter();
  const [chartPeriod, setChartPeriod] = useState<'6months' | 'year'>('6months');

  const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData as any)?.data || [];

  const pendingInvoices = invoices.filter((inv: any) => inv.payment_status === 'unpaid');
  const overdueInvoices = invoices.filter((inv: any) => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date() && inv.payment_status !== 'paid';
  });
  const paidInvoices = invoices.filter((inv: any) => inv.payment_status === 'paid');

  const collectionRate = invoices.length > 0
    ? ((paidInvoices.length / invoices.length) * 100).toFixed(0)
    : '0';

  const numericCollectionRate = Number(collectionRate);
  const totalRevenue = (financialSummary as any)?.totalRevenue || 0;
  const treasuryBalance = (treasurySummary as any)?.totalBalance || 0;

  const severityColors: Record<'danger' | 'warning' | 'success', string> = {
    danger: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    success: 'bg-green-100 text-green-700 border-green-200'
  };

  const alerts = [
    {
      id: 'overdue-invoices',
      icon: AlertTriangle,
      title: 'الفواتير المتأخرة',
      description: `${overdueInvoices.length} فاتورة متأخرة`,
      severity: 'danger' as const,
      count: overdueInvoices.length
    },
    {
      id: 'unpaid-invoices',
      icon: Receipt,
      title: 'الفواتير غير المدفوعة',
      description: `${pendingInvoices.length} فاتورة معلقة`,
      severity: 'warning' as const,
      count: pendingInvoices.length
    },
    {
      id: 'collection-rate',
      icon: TrendingUp,
      title: 'معدل التحصيل',
      description: `${collectionRate}% من الفواتير محصلة`,
      severity: (numericCollectionRate >= 80 ? 'success' : numericCollectionRate >= 60 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger'
    }
  ];

  const recentInvoices = invoices.slice(0, 5);
  const recentPaidInvoices = invoices
    .filter((inv: any) => inv.payment_status === 'paid')
    .slice(0, 5);

  const monthlyRevenueData = useMemo(() => {
    const months = chartPeriod === '6months' ? 6 : 12;
    const data = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ar-SA', { month: 'short' });
      data.push({
        name: monthName,
        revenue: Math.floor(Math.random() * 50000) + 30000,
        expenses: Math.floor(Math.random() * 30000) + 15000
      });
    }
    return data;
  }, [chartPeriod]);

  const revenueByCompanyData = [
    { name: 'إيجارات', value: 45, color: 'hsl(var(--chart-1))' },
    { name: 'خدمات', value: 25, color: 'hsl(var(--chart-2))' },
    { name: 'صيانة', value: 15, color: 'hsl(var(--chart-3))' },
    { name: 'أخرى', value: 15, color: 'hsl(var(--chart-4))' }
  ];

  const quickActions = [
    {
      title: "فاتورة جديدة",
      description: "إنشاء فاتورة مبيعات جديدة",
      icon: FilePlus,
      path: "/finance/invoices",
      color: "from-rose-500 to-orange-500",
    },
    {
      title: "دفعة جديدة",
      description: "تسجيل دفعة أو مقبوض",
      icon: CreditCard,
      path: "/finance/unified-payments",
      color: "from-emerald-500 to-teal-500",
    },
    {
      title: "تقرير مالي",
      description: "إنشاء تقرير مالي",
      icon: BarChart3,
      path: "/finance/unified-reports",
      color: "from-violet-500 to-purple-500",
    },
    {
      title: "ميزان المراجعة",
      description: "عرض ميزان المراجعة",
      icon: Calculator,
      path: "/finance/ledger",
      color: "from-blue-500 to-cyan-500",
    },
  ];

  const navigationGroups = [
    {
      title: "لوحة التحكم",
      icon: LayoutDashboard,
      color: "bg-blue-500",
      items: [
        { title: "لوحة التحكم المالية", path: "/finance/unified-dashboard", icon: BarChart3 },
      ],
    },
    {
      title: "العمليات",
      icon: CreditCard,
      color: "bg-emerald-500",
      items: [
        { title: "المدفوعات", path: "/finance/unified-payments", icon: CreditCard },
        { title: "الفواتير", path: "/finance/invoices", icon: Receipt },
        { title: "الخزينة والبنوك", path: "/finance/treasury", icon: Banknote },
      ],
    },
    {
      title: "المحاسبة",
      icon: BookOpen,
      color: "bg-violet-500",
      items: [
        { title: "دفتر الأستاذ العام", path: "/finance/ledger", icon: BookOpen },
        { title: "القيود المحاسبية", path: "/finance/journal-entries", icon: FileText },
        { title: "دليل الحسابات", path: "/finance/chart-of-accounts", icon: Calculator },
      ],
    },
    {
      title: "التقارير",
      icon: BarChart3,
      color: "bg-amber-500",
      items: [
        { title: "قائمة الدخل", path: "/finance/unified-reports", icon: TrendingUp },
        { title: "الميزانية", path: "/finance/unified-reports", icon: Building },
        { title: "التدفقات النقدية", path: "/finance/unified-reports", icon: DollarSign },
        { title: "ميزان المراجعة", path: "/finance/unified-reports", icon: Target },
      ],
    },
    {
      title: "الإعدادات",
      icon: Settings,
      color: "bg-slate-500",
      items: [
        { title: "مراكز التكلفة", path: "/finance/cost-centers", icon: Target },
        { title: "الموازنات", path: "/finance/budgets", icon: Calculator },
        { title: "الموردون", path: "/finance/vendors", icon: Building },
        { title: "الأصول الثابتة", path: "/finance/assets", icon: Building },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <FinancePageHeader
        title="النظام المالي"
        description="إدارة شاملة لجميع العمليات المالية والمحاسبية"
        icon={DollarSign}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "النظام المالي" }]}
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard
            title="إجمالي الإيرادات"
            value={formatCurrency(totalRevenue)}
            subtitle="هذا الشهر"
            icon={TrendingUp}
            variant="success"
            trend="up"
            changePercent={12}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard
            title="نسبة التحصيل"
            value={`${collectionRate}%`}
            subtitle="من الفواتير محصلة"
            icon={CreditCard}
            variant={numericCollectionRate >= 80 ? 'success' : numericCollectionRate >= 60 ? 'warning' : 'danger'}
            trend={numericCollectionRate >= 70 ? 'up' : 'down'}
            change={numericCollectionRate >= 80 ? 'ممتاز' : numericCollectionRate >= 60 ? 'جيد' : 'يحتاج تحسين'}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard
            title="الفواتير المتأخرة"
            value={overdueInvoices.length}
            subtitle={formatCurrency(overdueInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0))}
            icon={AlertCircle}
            variant={overdueInvoices.length > 0 ? "danger" : "success"}
            trend={overdueInvoices.length > 0 ? "down" : "up"}
            change={overdueInvoices.length > 0 ? "تحتاج متابعة" : "ممتاز"}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <StatCard
            title="رصيد الخزينة"
            value={treasuryLoading ? "..." : formatCurrency(treasuryBalance)}
            subtitle="الرصيد الحالي"
            icon={Banknote}
            variant="sky"
          />
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AreaChart className="w-5 h-5" />
                  تطور الإيرادات الشهرية
                </CardTitle>
                <CardDescription>مقارنة الإيرادات والمصروفات</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={chartPeriod === '6months' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartPeriod('6months')}
                >
                  6 أشهر
                </Button>
                <Button
                  variant={chartPeriod === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartPeriod('year')}
                >
                  سنة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.3}
                    name="الإيرادات"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stackId="2"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.3}
                    name="المصروفات"
                  />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              توزيع الإيرادات حسب النشاط
            </CardTitle>
            <CardDescription>نسب الإيرادات لكل نوع نشاط</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={revenueByCompanyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByCompanyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Section */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              التنبيهات
            </CardTitle>
            <CardDescription>آخر التنبيهات والإشعارات المهمة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${severityColors[alert.severity]}`}
                  >
                    <div className="p-2 rounded-lg bg-white/50">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm opacity-80">{alert.description}</p>
                    </div>
                    {alert.count !== undefined && (
                      <Badge variant="outline" className="bg-white/50">
                        {alert.count}
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              النشاط الأخير
            </CardTitle>
            <CardDescription>آخر العمليات المالية</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="invoices">
              <TabsList className="mb-4">
                <TabsTrigger value="invoices" className="gap-2">
                  <Receipt className="w-4 h-4" />
                  الفواتير
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-2">
                  <CreditCard className="w-4 h-4" />
                  المدفوعات
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="invoices" className="space-y-2">
                {recentInvoices.length === 0 ? (
                  <EmptyState
                    type="no-data"
                    title="لا توجد فواتير"
                    description="لم يتم إنشاء أي فواتير بعد"
                    compact
                  />
                ) : (
                  recentInvoices.map((invoice: any, index: number) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Receipt className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.invoice_date).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{formatCurrency(invoice.total_amount)}</p>
                        <Badge variant={invoice.payment_status === 'paid' ? 'default' : invoice.payment_status === 'partial' ? 'secondary' : 'outline'}>
                          {invoice.payment_status === 'paid' ? 'مدفوعة' : invoice.payment_status === 'partial' ? 'جزئي' : 'غير مدفوعة'}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="payments" className="space-y-2">
                {recentPaidInvoices.length === 0 ? (
                  <EmptyState
                    type="no-data"
                    title="لا توجد مدفوعات"
                    description="لم يتم تسجيل أي مدفوعات بعد"
                    compact
                  />
                ) : (
                  recentPaidInvoices.map((invoice: any, index: number) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">مدفوعة</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-green-600">{formatCurrency(invoice.paid_amount)}</p>
                        <Badge variant="default">مكتمل</Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            إجراءات سريعة
          </CardTitle>
          <CardDescription>وصول سريع للعمليات الشائعة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.path}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <Link to={action.path}>
                    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer h-full">
                      <div className={`h-2 bg-gradient-to-r ${action.color}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{action.title}</h4>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Groups */}
      <div className="space-y-6">
        {navigationGroups.map((group, groupIndex) => {
          const GroupIcon = group.icon;
          return (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + groupIndex * 0.1 }}
            >
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${group.color} flex items-center justify-center`}>
                        <GroupIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.title}</CardTitle>
                        <CardDescription>{group.items.length} عناصر</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">{group.items.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map((item, itemIndex) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link key={item.path} to={item.path}>
                          <motion.div
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer group"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 + groupIndex * 0.1 + itemIndex * 0.02 }}
                          >
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                              <ItemIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{item.title}</h4>
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Payroll Integration */}
      <PayrollIntegrationCard />
    </div>
  );
};

export default Overview;