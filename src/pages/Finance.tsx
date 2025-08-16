import { Routes, Route, Navigate } from "react-router-dom"
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
import { UnifiedFinancialDashboard } from "@/components/finance/UnifiedFinancialDashboard"
import { usePermissionCheck } from "@/hooks/usePermissionCheck"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"
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
import AccountMappings from "./finance/AccountMappings"
import JournalEntriesSettings from "./finance/settings/JournalEntriesSettings"
import AccountsSettings from "./finance/settings/AccountsSettings"
import CostCentersSettings from "./finance/settings/CostCentersSettings"
import AutomaticAccountsSettings from "./finance/settings/AutomaticAccountsSettings"
import AccountingWizard from "./finance/AccountingWizard"
import { SuperAdminRoute } from "@/components/common/ProtectedRoute"

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
    },
    {
      title: "لوحة التحكم المتقدمة",
      titleEn: "Advanced Dashboard",
      description: "لوحة تحكم شاملة مع التحليلات المتقدمة",
      icon: TrendingUp,
      path: "/finance/dashboard",
      color: "bg-gradient-to-br from-cyan-500 to-cyan-600"
    },
    {
      title: "ربط الحسابات",
      titleEn: "Account Mappings",
      description: "ربط أنواع الحسابات الافتراضية مع دليل الحسابات",
      icon: Settings,
      path: "/finance/account-mappings",
      color: "bg-gradient-to-br from-slate-500 to-slate-600"
    },
    {
      title: "معالج النظام المحاسبي",
      titleEn: "Accounting System Wizard",
      description: "إعداد نظام محاسبي متكامل للشركات الجديدة",
      icon: Settings,
      path: "/finance/accounting-wizard",
      color: "bg-gradient-to-br from-emerald-500 to-emerald-600"
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
        <>
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
          
          {/* Quick Access to Dashboard */}
          <div className="flex justify-center">
            <Link to="/finance/dashboard">
              <Button size="lg" className="bg-gradient-primary hover:bg-gradient-primary/90">
                <TrendingUp className="h-5 w-5 mr-2" />
                الانتقال إلى لوحة التحكم المتقدمة
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* Payroll Integration Section */}
      <PayrollIntegrationCard />
    </div>
  )
}

// Protected Route Component
const ProtectedFinanceRoute = ({ children, permission }: { children: React.ReactNode, permission?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissionCheck = usePermissionCheck(permission || 'finance.view');

  useEffect(() => {
    if (!user) {
      console.log('[Finance] User not authenticated');
    } else if (!user.profile?.company_id) {
      console.log('[Finance] User missing company_id:', user);
      toast({
        title: "خطأ في البيانات",
        description: "لا توجد بيانات شركة مرتبطة بحسابك. يرجى التواصل مع المدير.",
        variant: "destructive",
      });
    } else {
      console.log('[Finance] User authenticated with company:', user.profile.company_id);
    }
  }, [user, toast]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!user.profile?.company_id) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive font-medium">خطأ في البيانات</p>
        <p className="text-muted-foreground text-center">
          لا توجد بيانات شركة مرتبطة بحسابك.<br />
          يرجى التواصل مع المدير لحل هذه المشكلة.
        </p>
      </div>
    );
  }

  if (permission && permissionCheck.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (permission && permissionCheck.data && !permissionCheck.data.hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive font-medium">غير مخول</p>
        <p className="text-muted-foreground text-center">
          {permissionCheck.data.reason || 'ليس لديك صلاحية للوصول لهذه الصفحة'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

const Finance = () => {
  return (
    <Routes>
      {/* Redirect from /finance to /finance/dashboard */}
      <Route index element={<Navigate to="/finance/dashboard" replace />} />
      <Route path="modules" element={<FinanceModules />} />
      <Route 
        path="dashboard" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <UnifiedFinancialDashboard />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="chart-of-accounts" 
        element={
          <ProtectedFinanceRoute permission="finance.accounts.view">
            <ChartOfAccounts />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="ledger" 
        element={
          <ProtectedFinanceRoute permission="finance.ledger.view">
            <Ledger />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="treasury" 
        element={
          <ProtectedFinanceRoute permission="finance.treasury.view">
            <Treasury />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="cost-centers" 
        element={
          <ProtectedFinanceRoute permission="finance.cost_centers.view">
            <CostCenters />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="invoices" 
        element={
          <ProtectedFinanceRoute permission="finance.invoices.view">
            <Invoices />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="payments" 
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <Payments />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="reports" 
        element={
          <ProtectedFinanceRoute permission="finance.reports.view">
            <Reports />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="assets" 
        element={
          <ProtectedFinanceRoute permission="finance.assets.view">
            <FixedAssets />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="budgets" 
        element={
          <ProtectedFinanceRoute permission="finance.budgets.view">
            <Budgets />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="vendors" 
        element={
          <ProtectedFinanceRoute permission="finance.vendors.view">
            <Vendors />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="analysis" 
        element={
          <ProtectedFinanceRoute permission="finance.analysis.view">
            <FinancialAnalysis />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="account-mappings" 
        element={
          <ProtectedFinanceRoute permission="finance.accounts.view">
            <AccountMappings />
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="accounting-wizard" 
        element={
          <ProtectedFinanceRoute permission="finance.accounts.write">
            <AccountingWizard />
          </ProtectedFinanceRoute>
        } 
      />
      
      {/* Finance Settings - Super Admin Only */}
      <Route 
        path="settings/journal-entries" 
        element={
          <SuperAdminRoute>
            <JournalEntriesSettings />
          </SuperAdminRoute>
        } 
      />
      <Route 
        path="settings/accounts" 
        element={
          <SuperAdminRoute>
            <AccountsSettings />
          </SuperAdminRoute>
        } 
      />
      <Route 
        path="settings/cost-centers" 
        element={
          <SuperAdminRoute>
            <CostCentersSettings />
          </SuperAdminRoute>
        } 
      />
      <Route 
        path="settings/automatic-accounts" 
        element={
          <SuperAdminRoute>
            <AutomaticAccountsSettings />
          </SuperAdminRoute>
        } 
      />
    </Routes>
  )
}

export default Finance