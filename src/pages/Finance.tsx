import { Routes, Route, Navigate } from "react-router-dom"
import { Suspense } from "react"
import { lazyWithRetry } from "@/utils/lazyWithRetry"
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper"
import { SuperAdminRoute } from "@/components/common/ProtectedRoute"
import { ProtectedFinanceRoute as ProtectedFinanceRouteComponent } from "@/components/finance/ProtectedFinanceRoute"

// Lazy load all finance sub-modules with retry for better reliability
const FinanceHub = lazyWithRetry(() => import("./finance/FinanceHub"), "FinanceHub");
const ReceivePaymentWorkflow = lazyWithRetry(() => import("./finance/operations/ReceivePaymentWorkflow"), "ReceivePaymentWorkflow");
const Overview = lazyWithRetry(() => import("./finance/Overview"), "Overview");
const AccountantDashboard = lazyWithRetry(() => import("./finance/AccountantDashboard"), "AccountantDashboard");
const AlertsPage = lazyWithRetry(() => import("./finance/AlertsPage"), "AlertsPage");
const JournalPermissions = lazyWithRetry(() => import("./finance/JournalPermissions"), "JournalPermissions");
const FinancialRatios = lazyWithRetry(() => import("./finance/FinancialRatios"), "FinancialRatios");
const InvoiceJournalReport = lazyWithRetry(() => import("./finance/InvoiceJournalReport"), "InvoiceJournalReport");
const AuditTrailPage = lazyWithRetry(() => import("./finance/AuditTrailPage"), "AuditTrailPage");
const ChartOfAccounts = lazyWithRetry(() => import("./finance/ChartOfAccounts"), "ChartOfAccounts");
const GeneralLedger = lazyWithRetry(() => import("./finance/GeneralLedger"), "GeneralLedger");
const Ledger = lazyWithRetry(() => import("./finance/Ledger"), "Ledger");
const Treasury = lazyWithRetry(() => import("./finance/Treasury"), "Treasury");
const CostCenters = lazyWithRetry(() => import("./finance/CostCenters"), "CostCenters");
const Invoices = lazyWithRetry(() => import("./finance/Invoices"), "Invoices");
const Payments = lazyWithRetry(() => import("./finance/Payments"), "Payments");
const PaymentsDashboard = lazyWithRetry(() => import("./finance/PaymentsDashboard"), "PaymentsDashboard");
// ⭐ NEW: Unified Payments - دمج 3 صفحات في واحدة
const PaymentsUnified = lazyWithRetry(() => import("./finance/PaymentsUnified"), "PaymentsUnified");
const InvoiceScannerDashboard = lazyWithRetry(() => import("@/components/invoices/InvoiceScannerDashboard").then(m => ({ default: m.InvoiceScannerDashboard })), "InvoiceScannerDashboard");
const Reports = lazyWithRetry(() => import("./finance/Reports"), "Reports");
const FixedAssets = lazyWithRetry(() => import("./finance/FixedAssets"), "FixedAssets");
const Budgets = lazyWithRetry(() => import("./finance/Budgets"), "Budgets");
const Vendors = lazyWithRetry(() => import("./finance/Vendors"), "Vendors");
const VendorCategories = lazyWithRetry(() => import("./finance/VendorCategories"), "VendorCategories");
const FinancialAnalysis = lazyWithRetry(() => import("./finance/FinancialAnalysis"), "FinancialAnalysis");
const AccountMappings = lazyWithRetry(() => import("./finance/AccountMappings"), "AccountMappings");
const NewEntry = lazyWithRetry(() => import("./finance/NewEntry"), "NewEntry");
const JournalEntriesSettings = lazyWithRetry(() => import("./finance/settings/JournalEntriesSettings"), "JournalEntriesSettings");
const AccountsSettings = lazyWithRetry(() => import("./finance/settings/AccountsSettings"), "AccountsSettings");
const CostCentersSettings = lazyWithRetry(() => import("./finance/settings/CostCentersSettings"), "CostCentersSettings");
const AutomaticAccountsSettings = lazyWithRetry(() => import("./finance/settings/AutomaticAccountsSettings"), "AutomaticAccountsSettings");
const FinancialSystemAnalysis = lazyWithRetry(() => import("./finance/settings/FinancialSystemAnalysis"), "FinancialSystemAnalysis");
const AccountingWizard = lazyWithRetry(() => import("./finance/AccountingWizard"), "AccountingWizard");
const FinancialCalculator = lazyWithRetry(() => import("./finance/Calculator"), "FinancialCalculator");
const Deposits = lazyWithRetry(() => import("./finance/Deposits"), "Deposits");
const CashReceiptDemo = lazyWithRetry(() => import("../pages/CashReceiptDemo"), "CashReceiptDemo");
const ProfessionalInvoiceDemo = lazyWithRetry(() => import("../pages/ProfessionalInvoiceDemo"), "ProfessionalInvoiceDemo");
const JournalEntriesDemo = lazyWithRetry(() => import("../pages/finance/JournalEntriesDemo"), "JournalEntriesDemo");
const MonthlyRentTracking = lazyWithRetry(() => import("./finance/MonthlyRentTracking"), "MonthlyRentTracking");
const UnifiedReports = lazyWithRetry(() => import("./finance/UnifiedReports"), "UnifiedReports");
const UnifiedPayments = lazyWithRetry(() => import("./finance/UnifiedPayments"), "UnifiedPayments");
const FinanceSettings = lazyWithRetry(() => import("./finance/FinanceSettings"), "FinanceSettings");
const UnifiedFinance = lazyWithRetry(() => import("./finance/UnifiedFinance"), "UnifiedFinance");

// استخدام النظام الجديد للحماية
const ProtectedFinanceRoute = ProtectedFinanceRouteComponent;

const Finance = () => {
  return (
    <Routes>
      {/* Redirect from /finance to Finance Hub */}
      <Route index element={<Navigate to="/finance/hub" replace />} />
      
      {/* Finance Hub - Unified Interface */}
      <Route 
        path="hub" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinanceHub />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      
      {/* Workflows */}
      <Route 
        path="operations/receive-payment" 
        element={
          <ProtectedFinanceRoute permission="finance.payments.create">
            <Suspense fallback={<PageSkeletonFallback />}>
              <ReceivePaymentWorkflow />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      
      <Route 
        path="overview" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Overview />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="unified" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <UnifiedFinance />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="accountant-dashboard" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <AccountantDashboard />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="alerts" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <AlertsPage />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="journal-permissions" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <JournalPermissions />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="financial-ratios" 
        element={
          <ProtectedFinanceRoute permission="finance.reports.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinancialRatios />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="invoice-journal-report" 
        element={
          <ProtectedFinanceRoute permission="finance.reports.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <InvoiceJournalReport />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="audit-trail" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <AuditTrailPage />
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
      {/* Redirect cash-bank to treasury */}
      <Route path="cash-bank" element={<Navigate to="/finance/treasury" replace />} />
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
      {/* ⭐ NEW: Unified Payments Page (replaces 3 old pages) */}
      <Route
        path="payments"
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <PaymentsUnified />
            </Suspense>
          </ProtectedFinanceRoute>
        }
      />
      {/* Keep old routes as backup (can be removed later) */}
      <Route
        path="payments-old"
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Payments />
            </Suspense>
          </ProtectedFinanceRoute>
        }
      />
      <Route
        path="payments-dashboard"
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <PaymentsDashboard />
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
        path="vendor-categories"
        element={
          <ProtectedFinanceRoute permission="finance.vendors.manage">
            <Suspense fallback={<PageSkeletonFallback />}>
              <VendorCategories />
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
      
      {/* نموذج سند القبض */}
      <Route 
        path="cash-receipt" 
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <CashReceiptDemo />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      
      {/* نموذج الفاتورة الاحترافية */}
      <Route 
        path="professional-invoice" 
        element={
          <ProtectedFinanceRoute permission="finance.invoices.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <ProfessionalInvoiceDemo />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      
      {/* نموذج القيود المحاسبية المُعاد تصميمها */}
      <Route 
        path="journal-entries-demo" 
        element={
          <ProtectedFinanceRoute permission="finance.ledger.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <JournalEntriesDemo />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      
      {/* متابعة الإيجارات الشهرية */}
      <Route 
        path="monthly-rent-tracking" 
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <MonthlyRentTracking />
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
      {/* Unified Finance Modules */}
      <Route 
        path="unified-reports" 
        element={
          <ProtectedFinanceRoute permission="finance.reports.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <UnifiedReports />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="unified-payments" 
        element={
          <ProtectedFinanceRoute permission="finance.payments.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <UnifiedPayments />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
      <Route 
        path="settings" 
        element={
          <ProtectedFinanceRoute permission="finance.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <FinanceSettings />
            </Suspense>
          </ProtectedFinanceRoute>
        } 
      />
    </Routes>
  )
}

export default Finance