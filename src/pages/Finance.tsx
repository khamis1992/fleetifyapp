import { Routes, Route } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  Building, 
  Calculator,
  FileText,
  PieChart,
  Target,
  Banknote,
  BookOpen,
  Settings
} from "lucide-react"
import { Link } from "react-router-dom"
import { useFinancialSummary } from "@/hooks/useFinance"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PayrollIntegrationCard } from "@/components/finance/PayrollIntegrationCard"
import ChartOfAccounts from "./finance/ChartOfAccounts"
import Ledger from "./finance/Ledger"
import Treasury from "./finance/Treasury"
import CostCenters from "./finance/CostCenters"
import Invoices from "./finance/Invoices"
import Payments from "./finance/Payments"
import Reports from "./finance/Reports"
import FixedAssets from "./finance/FixedAssets"
import Budgets from "./finance/Budgets"
import Vendors from "./finance/Vendors"
import FinancialAnalysis from "./finance/FinancialAnalysis"

const FinanceModules = () => {
  const { data: financialSummary, isLoading } = useFinancialSummary()
  
  const modules = [
    {
      title: "دليل الحسابات",
      titleEn: "Chart of Accounts",
      description: "إدارة شجرة الحسابات المحاسبية",
      icon: Calculator,
      path: "/finance/chart-of-accounts",
      color: "bg-gradient-to-br from-blue-500 to-blue-600"
    },
    {
      title: "دفتر الأستاذ العام",
      titleEn: "General Ledger",
      description: "عرض وإدارة القيود المحاسبية",
      icon: BookOpen,
      path: "/finance/ledger",
      color: "bg-gradient-to-br from-emerald-500 to-emerald-600"
    },
    {
      title: "الخزينة والبنوك",
      titleEn: "Treasury & Banks",
      description: "إدارة الحسابات المصرفية والمعاملات النقدية",
      icon: Banknote,
      path: "/finance/treasury",
      color: "bg-gradient-to-br from-violet-500 to-violet-600"
    },
    {
      title: "مراكز التكلفة",
      titleEn: "Cost Centers",
      description: "إدارة وتتبع مراكز التكلفة والموازنات",
      icon: Target,
      path: "/finance/cost-centers",
      color: "bg-gradient-to-br from-amber-500 to-amber-600"
    },
    {
      title: "الفواتير",
      titleEn: "Invoices", 
      description: "إدارة فواتير المبيعات والمشتريات",
      icon: Receipt,
      path: "/finance/invoices",
      color: "bg-gradient-to-br from-green-500 to-green-600"
    },
    {
      title: "المدفوعات",
      titleEn: "Payments",
      description: "تسجيل وتتبع المدفوعات والمقبوضات",
      icon: CreditCard,
      path: "/finance/payments",
      color: "bg-gradient-to-br from-purple-500 to-purple-600"
    },
    {
      title: "التقارير المالية",
      titleEn: "Financial Reports",
      description: "الميزانية العمومية وقائمة الدخل",
      icon: FileText,
      path: "/finance/reports",
      color: "bg-gradient-to-br from-orange-500 to-orange-600"
    },
    {
      title: "الأصول الثابتة",
      titleEn: "Fixed Assets",
      description: "إدارة الأصول والإهلاك",
      icon: Building,
      path: "/finance/assets",
      color: "bg-gradient-to-br from-red-500 to-red-600"
    },
    {
      title: "الموازنات",
      titleEn: "Budgets",
      description: "إعداد ومتابعة الموازنات التخطيطية",
      icon: Target,
      path: "/finance/budgets",
      color: "bg-gradient-to-br from-teal-500 to-teal-600"
    },
    {
      title: "الموردين",
      titleEn: "Vendors",
      description: "إدارة بيانات الموردين والحسابات",
      icon: Building,
      path: "/finance/vendors",
      color: "bg-gradient-to-br from-indigo-500 to-indigo-600"
    },
    {
      title: "التحليل المالي",
      titleEn: "Financial Analysis",
      description: "تحليل الأداء المالي والمؤشرات",
      icon: PieChart,
      path: "/finance/analysis",
      color: "bg-gradient-to-br from-pink-500 to-pink-600"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-primary p-8 rounded-2xl text-primary-foreground shadow-elevated">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <DollarSign className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">النظام المالي</h1>
            <p className="text-primary-foreground/80">
              إدارة شاملة لجميع العمليات المالية والمحاسبية
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modules.map((module, index) => (
          <Link key={index} to={module.path}>
            <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary/20">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-xl ${module.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="ghost" size="sm" className="w-full justify-start p-0 h-auto font-normal">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  الدخول إلى الوحدة
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats Section */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialSummary?.totalRevenue?.toFixed(3) || '0.000'} د.ك
              </div>
              <p className="text-xs text-muted-foreground">هذا الشهر</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialSummary?.totalExpenses?.toFixed(3) || '0.000'} د.ك
              </div>
              <p className="text-xs text-muted-foreground">هذا الشهر</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">صافي الربح</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (financialSummary?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {financialSummary?.netIncome?.toFixed(3) || '0.000'} د.ك
              </div>
              <p className="text-xs text-muted-foreground">هذا الشهر</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">المعاملات المعلقة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialSummary?.pendingTransactions || 0}
              </div>
              <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payroll Integration Section */}
      <PayrollIntegrationCard />
    </div>
  )
}

const Finance = () => {
  return (
    <Routes>
      <Route index element={<FinanceModules />} />
      <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
      <Route path="ledger" element={<Ledger />} />
      <Route path="treasury" element={<Treasury />} />
      <Route path="cost-centers" element={<CostCenters />} />
      <Route path="invoices" element={<Invoices />} />
      <Route path="payments" element={<Payments />} />
      <Route path="reports" element={<Reports />} />
      <Route path="assets" element={<FixedAssets />} />
      <Route path="budgets" element={<Budgets />} />
      <Route path="vendors" element={<Vendors />} />
      <Route path="analysis" element={<FinancialAnalysis />} />
    </Routes>
  )
}

export default Finance