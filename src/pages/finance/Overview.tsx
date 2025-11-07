import { PageCustomizer } from "@/components/PageCustomizer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { useFinancialSummary } from "@/hooks/useFinance";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PayrollIntegrationCard } from "@/components/finance/PayrollIntegrationCard";

const Overview = () => {
  const { data: financialSummary, isLoading } = useFinancialSummary();
  
  // الوحدات المالية المبسطة - 12 وحدة فقط
  const modules = [
    {
      title: "لوحة التحكم المالية",
      description: "نظرة شاملة للوضع المالي مع جميع المؤشرات الرئيسية",
      icon: BarChart3,
      path: "/finance/unified-dashboard",
      gradient: "from-blue-500 to-blue-600",
      stats: `${financialSummary?.totalRevenue || 0} ريال`
    },
    {
      title: "التقارير المالية",
      description: "الميزانية وقائمة الدخل والتحليلات المتقدمة",
      icon: FileText,
      path: "/finance/unified-reports",
      gradient: "from-green-500 to-green-600",
      stats: "5 تقارير رئيسية"
    },
    {
      title: "دليل الحسابات",
      description: "إدارة شجرة الحسابات المحاسبية",
      icon: Calculator,
      path: "/finance/chart-of-accounts",
      gradient: "from-indigo-500 to-indigo-600"
    },
    {
      title: "دفتر الأستاذ العام",
      description: "عرض وإدارة القيود المحاسبية",
      icon: BookOpen,
      path: "/finance/ledger",
      gradient: "from-emerald-500 to-emerald-600"
    },
    {
      title: "المدفوعات",
      description: "إدارة شاملة للمدفوعات والمقبوضات",
      icon: CreditCard,
      path: "/finance/unified-payments",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      title: "الفواتير",
      description: "إدارة فواتير المبيعات والمشتريات",
      icon: Receipt,
      path: "/finance/invoices",
      gradient: "from-orange-500 to-orange-600"
    },
    {
      title: "الخزينة والبنوك",
      description: "إدارة الحسابات المصرفية والمعاملات النقدية",
      icon: Banknote,
      path: "/finance/treasury",
      gradient: "from-violet-500 to-violet-600"
    },
    {
      title: "مراكز التكلفة",
      description: "إدارة وتتبع مراكز التكلفة والموازنات",
      icon: Target,
      path: "/finance/cost-centers",
      gradient: "from-amber-500 to-amber-600"
    },
    {
      title: "الأصول الثابتة",
      description: "إدارة الأصول والإهلاك",
      icon: Building,
      path: "/finance/assets",
      gradient: "from-red-500 to-red-600"
    },
    {
      title: "الموازنات",
      description: "إعداد ومتابعة الموازنات التخطيطية",
      icon: Target,
      path: "/finance/budgets",
      gradient: "from-teal-500 to-teal-600"
    },
    {
      title: "الموردين",
      description: "إدارة بيانات الموردين والحسابات",
      icon: Building,
      path: "/finance/vendors",
      gradient: "from-cyan-500 to-cyan-600"
    },
    {
      title: "الإعدادات المالية",
      description: "إعدادات وأدوات النظام المالي",
      icon: Settings,
      path: "/finance/settings",
      gradient: "from-slate-500 to-slate-600"
    }
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

        {/* Financial Summary */}
        {financialSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  إجمالي الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {financialSummary.totalRevenue?.toLocaleString()} ريال
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                  إجمالي المصروفات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {financialSummary.totalExpenses?.toLocaleString()} ريال
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  صافي الربح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {(financialSummary.totalRevenue - financialSummary.totalExpenses).toLocaleString()} ريال
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Card 
                key={index}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className={`h-2 bg-gradient-to-r ${module.gradient}`} />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${module.gradient} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    {module.stats && (
                      <div className="text-sm font-medium text-muted-foreground">
                        {module.stats}
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl mt-4">{module.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={module.path}>
                    <Button 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      variant="outline"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      الدخول إلى الوحدة
                    </Button>
                  </Link>
                </CardContent>
              </Card>
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
