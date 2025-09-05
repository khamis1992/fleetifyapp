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
import { ResponsiveGrid } from "@/components/responsive/ResponsiveGrid"
import { AdaptiveCard } from "@/components/responsive/AdaptiveCard"
import { ResponsiveButton } from "@/components/ui/responsive-button"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout"
import { cn } from "@/lib/utils"
import ChartOfAccounts from "./finance/ChartOfAccounts"
import Ledger from "./finance/Ledger"
import Treasury from "./finance/Treasury"
import CostCenters from "./finance/CostCenters"
import Invoices from "./finance/Invoices"
import Payments from "./finance/Payments"
import PaymentLinking from "./PaymentLinking"
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
import FinancialCalculator from "./finance/Calculator"
import { SuperAdminRoute } from "@/components/common/ProtectedRoute"

const FinanceModules = () => {
  const { data: financialSummary, isLoading } = useFinancialSummary()
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  const { 
    containerPadding, 
    cardSpacing, 
    buttonSize, 
    gridColumns,
    contentDensity 
  } = useAdaptiveLayout()
  
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
      title: "ربط المدفوعات",
      titleEn: "Payment Linking",
      description: "ربط المدفوعات بالعملاء وإنشاء الفواتير",
      icon: CreditCard,
      path: "/finance/payment-linking",
      color: "bg-gradient-to-br from-rose-500 to-rose-600"
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
    <div className={cn("space-y-6", containerPadding)}>
      {/* Header - Responsive */}
      <div className={cn(
        "bg-gradient-primary rounded-2xl text-primary-foreground shadow-elevated",
        isMobile ? "p-4" : "p-8"
      )}>
        <div className={cn(
          "flex items-center gap-4",
          isMobile && "flex-col text-center"
        )}>
          <div className={cn(
            "bg-white/20 rounded-xl",
            isMobile ? "p-2" : "p-3"
          )}>
            <DollarSign className={cn(
              isMobile ? "h-6 w-6" : "h-8 w-8"
            )} />
          </div>
          <div>
            <h1 className={cn(
              "font-bold mb-2",
              isMobile ? "text-2xl" : "text-3xl"
            )}>النظام المالي</h1>
            <p className={cn(
              "text-primary-foreground/80",
              isMobile ? "text-sm" : "text-base"
            )}>
              إدارة شاملة لجميع العمليات المالية والمحاسبية
            </p>
          </div>
        </div>
      </div>

      {/* Modules Grid - Responsive */}
      <ResponsiveGrid
        columns={gridColumns.modules}
        gap={cardSpacing}
        className="w-full"
      >
        {modules.map((module, index) => (
          <Link key={index} to={module.path}>
            <AdaptiveCard 
              density={contentDensity}
              className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary/20"
            >
              <CardHeader className={cn(
                "pb-3",
                isMobile && "pb-2"
              )}>
                <div className={cn(
                  `rounded-xl ${module.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`,
                  isMobile ? "w-10 h-10" : "w-12 h-12"
                )}>
                  <module.icon className={cn(
                    "text-white",
                    isMobile ? "h-5 w-5" : "h-6 w-6"
                  )} />
                </div>
                <CardTitle className={cn(
                  isMobile ? "text-base" : "text-lg"
                )}>{module.title}</CardTitle>
                <CardDescription className={cn(
                  "text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveButton 
                  variant="ghost" 
                  size={isMobile ? "sm" : "sm"}
                  className="w-full justify-start p-0 h-auto font-normal"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  الدخول إلى الوحدة
                </ResponsiveButton>
              </CardContent>
            </AdaptiveCard>
          </Link>
        ))}
      </ResponsiveGrid>

      {/* Quick Stats Section - Responsive */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <ResponsiveGrid
            columns={gridColumns.stats}
            gap={cardSpacing}
            className="w-full"
          >
            <AdaptiveCard density={contentDensity}>
              <CardHeader className="pb-2">
                <CardTitle className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>إجمالي الإيرادات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "font-bold",
                  isMobile ? "text-xl" : "text-2xl"
                )}>
                  {financialSummary?.totalRevenue?.toFixed(3) || '0.000'} د.ك
                </div>
                <p className="text-xs text-muted-foreground">هذا الشهر</p>
              </CardContent>
            </AdaptiveCard>
            
            <AdaptiveCard density={contentDensity}>
              <CardHeader className="pb-2">
                <CardTitle className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>إجمالي المصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "font-bold",
                  isMobile ? "text-xl" : "text-2xl"
                )}>
                  {financialSummary?.totalExpenses?.toFixed(3) || '0.000'} د.ك
                </div>
                <p className="text-xs text-muted-foreground">هذا الشهر</p>
              </CardContent>
            </AdaptiveCard>
            
            <AdaptiveCard density={contentDensity}>
              <CardHeader className="pb-2">
                <CardTitle className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>صافي الربح</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "font-bold",
                  isMobile ? "text-xl" : "text-2xl",
                  (financialSummary?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {financialSummary?.netIncome?.toFixed(3) || '0.000'} د.ك
                </div>
                <p className="text-xs text-muted-foreground">هذا الشهر</p>
              </CardContent>
            </AdaptiveCard>
            
            <AdaptiveCard density={contentDensity}>
              <CardHeader className="pb-2">
                <CardTitle className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>المعاملات المعلقة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "font-bold",
                  isMobile ? "text-xl" : "text-2xl"
                )}>
                  {financialSummary?.pendingTransactions || 0}
                </div>
                <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
              </CardContent>
            </AdaptiveCard>
          </ResponsiveGrid>
          
          {/* Quick Access to Dashboard - Responsive */}
          <div className="flex justify-center">
            <Link to="/finance/dashboard">
              <ResponsiveButton 
                size={isMobile ? "default" : "lg"}
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                الانتقال إلى لوحة التحكم المتقدمة
              </ResponsiveButton>
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
      // User not authenticated - will redirect
    } else if (!user.profile?.company_id) {
      toast({
        title: "خطأ في البيانات",
        description: "لا توجد بيانات شركة مرتبطة بحسابك. يرجى التواصل مع المدير.",
        variant: "destructive",
      });
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
        path="payment-linking" 
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <PaymentLinking />
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
      
      {/* الحاسبة المالية */}
      <Route 
        path="calculator" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <FinancialCalculator />
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