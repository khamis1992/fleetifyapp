import { PageCustomizer } from "@/components/PageCustomizer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  FilePlus,
  LayoutDashboard,
  Clock,
  Users,
  AlertCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useFinancialSummary } from "@/hooks/useFinance";
import { useTreasurySummary } from "@/hooks/useTreasury";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PayrollIntegrationCard } from "@/components/finance/PayrollIntegrationCard";
import { StatCard } from "@/components/ui/StatCard";
import { motion } from "framer-motion";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

const Overview = () => {
  const { data: financialSummary, isLoading } = useFinancialSummary();
  const { data: treasurySummary, isLoading: treasuryLoading } = useTreasurySummary();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ status: 'pending' });
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();
  
  const pendingInvoicesCount = invoices?.length || 0;
  const pendingInvoicesTotal = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const overdueInvoices = invoices?.filter(inv => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  }) || [];
  
  // Quick action buttons
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
      title: "لوحة التحكم",
      description: "عرض لوحة التحكم المالية",
      icon: LayoutDashboard,
      path: "/finance/unified-dashboard",
      color: "from-blue-500 to-cyan-500",
    },
  ];

  // Navigation groups
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
    <PageCustomizer>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl text-primary-foreground shadow-lg">
            <DollarSign className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">النظام المالي</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            إدارة شاملة لجميع العمليات المالية والمحاسبية
          </p>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatCard
              title="إجمالي الإيرادات"
              value={formatCurrency(financialSummary?.totalRevenue || 0)}
              subtitle="هذا الشهر"
              icon={TrendingUp}
              variant="success"
              trend="up"
              changePercent={12}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <StatCard
              title="معدل التحصيل"
              value="87%"
              subtitle="نسبة التحصيل"
              icon={CreditCard}
              variant="sky"
              trend="up"
              change="+5%"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatCard
              title="الفواتير المتأخرة"
              value={overdueInvoices.length}
              subtitle={formatCurrency(overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0))}
              icon={AlertCircle}
              variant={overdueInvoices.length > 0 ? "danger" : "success"}
              trend={overdueInvoices.length > 0 ? "down" : "up"}
              change={overdueInvoices.length > 0 ? "تحتاج متابعة" : "ممتاز"}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <StatCard
              title="رصيد الخزينة"
              value={treasuryLoading ? "..." : formatCurrency(treasurySummary?.totalBalance || 0)}
              subtitle="الرصيد الحالي"
              icon={Banknote}
              variant="emerald"
            />
          </motion.div>
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
                      <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer">
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

        {/* Navigation Groups - Collapsible Sections */}
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
    </PageCustomizer>
  );
};

export default Overview;
