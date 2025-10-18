import { Routes, Route, Navigate } from "react-router-dom"
import { Suspense } from "react"
import { lazyWithRetry } from "@/utils/lazyWithRetry"
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
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper"
import { SuperAdminRoute } from "@/components/common/ProtectedRoute"
import { ProtectedFinanceRoute as ProtectedFinanceRouteComponent } from "@/components/finance/ProtectedFinanceRoute"

// Lazy load UnifiedFinancialDashboard (heavy component)
const UnifiedFinancialDashboard = lazyWithRetry(() => import("@/components/finance/UnifiedFinancialDashboard").then(m => ({ default: m.UnifiedFinancialDashboard })), "UnifiedFinancialDashboard");

// Lazy load all finance sub-modules with retry for better reliability
const ChartOfAccounts = lazyWithRetry(() => import("./finance/ChartOfAccounts"), "ChartOfAccounts");
const GeneralLedger = lazyWithRetry(() => import("./finance/GeneralLedger"), "GeneralLedger");
const Ledger = lazyWithRetry(() => import("./finance/Ledger"), "Ledger");
const Treasury = lazyWithRetry(() => import("./finance/Treasury"), "Treasury");
const CostCenters = lazyWithRetry(() => import("./finance/CostCenters"), "CostCenters");
const Invoices = lazyWithRetry(() => import("./finance/Invoices"), "Invoices");
const Payments = lazyWithRetry(() => import("./finance/Payments"), "Payments");
const InvoiceScannerDashboard = lazyWithRetry(() => import("@/components/invoices/InvoiceScannerDashboard").then(m => ({ default: m.InvoiceScannerDashboard })), "InvoiceScannerDashboard");
const Reports = lazyWithRetry(() => import("./finance/Reports"), "Reports");
const FixedAssets = lazyWithRetry(() => import("./finance/FixedAssets"), "FixedAssets");
const Budgets = lazyWithRetry(() => import("./finance/Budgets"), "Budgets");
const Vendors = lazyWithRetry(() => import("./finance/Vendors"), "Vendors");
const FinancialAnalysis = lazyWithRetry(() => import("./finance/FinancialAnalysis"), "FinancialAnalysis");
const AccountMappings = lazyWithRetry(() => import("./finance/AccountMappings"), "AccountMappings");
const JournalEntries = lazyWithRetry(() => import("./finance/JournalEntries"), "JournalEntries");
const NewEntry = lazyWithRetry(() => import("./finance/NewEntry"), "NewEntry");
const JournalEntriesSettings = lazyWithRetry(() => import("./finance/settings/JournalEntriesSettings"), "JournalEntriesSettings");
const AccountsSettings = lazyWithRetry(() => import("./finance/settings/AccountsSettings"), "AccountsSettings");
const CostCentersSettings = lazyWithRetry(() => import("./finance/settings/CostCentersSettings"), "CostCentersSettings");
const AutomaticAccountsSettings = lazyWithRetry(() => import("./finance/settings/AutomaticAccountsSettings"), "AutomaticAccountsSettings");
const FinancialSystemAnalysis = lazyWithRetry(() => import("./finance/settings/FinancialSystemAnalysis"), "FinancialSystemAnalysis");
const AccountingWizard = lazyWithRetry(() => import("./finance/AccountingWizard"), "AccountingWizard");
const FinancialCalculator = lazyWithRetry(() => import("./finance/Calculator"), "FinancialCalculator");
const Deposits = lazyWithRetry(() => import("./finance/Deposits"), "Deposits");

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

// استخدام النظام الجديد للحماية
const ProtectedFinanceRoute = ProtectedFinanceRouteComponent;

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
            <Suspense fallback={<PageSkeletonFallback />}>
              <UnifiedFinancialDashboard />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="chart-of-accounts" 
        element={
          <ProtectedFinanceRoute permission="finance.accounts.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <ChartOfAccounts />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="general-ledger" 
        element={
          <ProtectedFinanceRoute permission="finance.ledger.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <GeneralLedger />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="ledger" 
        element={
          <ProtectedFinanceRoute permission="finance.ledger.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <GeneralLedger />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="treasury" 
        element={
          <ProtectedFinanceRoute permission="finance.treasury.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Treasury />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="cost-centers" 
        element={
          <ProtectedFinanceRoute permission="finance.cost_centers.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <CostCenters />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="invoices" 
        element={
          <ProtectedFinanceRoute permission="finance.invoices.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Invoices />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="invoices/scan" 
        element={
          <ProtectedFinanceRoute permission="finance.invoices.create">
            <Suspense fallback={<PageSkeletonFallback />}>
              <InvoiceScannerDashboard />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="payments" 
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Payments />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="journal-entries" 
        element={
          <ProtectedFinanceRoute permission="finance.ledger.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Ledger />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="reports" 
        element={
          <ProtectedFinanceRoute permission="finance.reports.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Reports />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="assets" 
        element={
          <ProtectedFinanceRoute permission="finance.assets.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <FixedAssets />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="budgets" 
        element={
          <ProtectedFinanceRoute permission="finance.budgets.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Budgets />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="vendors" 
        element={
          <ProtectedFinanceRoute permission="finance.vendors.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Vendors />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="analysis" 
        element={
          <ProtectedFinanceRoute permission="finance.analysis.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinancialAnalysis />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="account-mappings" 
        element={
          <ProtectedFinanceRoute permission="finance.accounts.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <AccountMappings />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="accounting-wizard" 
        element={
          <ProtectedFinanceRoute permission="finance.accounts.write">
            <Suspense fallback={<PageSkeletonFallback />}>
              <AccountingWizard />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="new-entry" 
        element={
          <ProtectedFinanceRoute permission="finance.ledger.write">
            <Suspense fallback={<PageSkeletonFallback />}>
              <NewEntry />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      
      {/* الحاسبة المالية */}
      <Route 
        path="calculator" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinancialCalculator />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      
      {/* إدارة الودائع */}
      <Route 
        path="deposits" 
        element={
          <ProtectedFinanceRoute permission="finance.deposits.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Deposits />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      
      {/* Finance Settings - Super Admin Only */}
      <Route 
        path="settings/journal-entries" 
        element={
          <SuperAdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <JournalEntriesSettings />
            </Suspense>
          </SuperAdminRoute>
        } 
      />
      <Route 
        path="settings/accounts" 
        element={
          <SuperAdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <AccountsSettings />
            </Suspense>
          </SuperAdminRoute>
        } 
      />
      <Route 
        path="settings/cost-centers" 
        element={
          <SuperAdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <CostCentersSettings />
            </Suspense>
          </SuperAdminRoute>
        } 
      />
      <Route 
        path="settings/automatic-accounts" 
        element={
          <SuperAdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <AutomaticAccountsSettings />
            </Suspense>
          </SuperAdminRoute>
        } 
      />
      <Route 
        path="settings/financial-system-analysis" 
        element={
          <ProtectedFinanceRoute permission="finance.accounts.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinancialSystemAnalysis />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
    </Routes>
  )
}

export default Finance