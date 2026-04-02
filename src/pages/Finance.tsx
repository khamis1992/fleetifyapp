import { Routes, Route, Navigate } from "react-router-dom"
import { Suspense } from "react"
import { lazyWithRetry } from "@/utils/lazyWithRetry"
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper"
import { SuperAdminRoute } from "@/components/common/ProtectedRoute"
import { ProtectedFinanceRoute as ProtectedFinanceRouteComponent } from "@/components/finance/ProtectedFinanceRoute"

// Lazy load all finance sub-modules with retry for better reliability
// CORE PAGES (kept as real routes)
const ReceivePaymentWorkflow = lazyWithRetry(() => import("./finance/operations/ReceivePaymentWorkflow"), "ReceivePaymentWorkflow");
const Overview = lazyWithRetry(() => import("./finance/Overview"), "Overview");
const AlertsPage = lazyWithRetry(() => import("./finance/AlertsPage"), "AlertsPage");
const JournalPermissions = lazyWithRetry(() => import("./finance/JournalPermissions"), "JournalPermissions");
const InvoiceJournalReport = lazyWithRetry(() => import("./finance/InvoiceJournalReport"), "InvoiceJournalReport");
const AuditTrailPage = lazyWithRetry(() => import("./finance/AuditTrailPage"), "AuditTrailPage");
const ChartOfAccounts = lazyWithRetry(() => import("./finance/ChartOfAccounts"), "ChartOfAccounts");
const GeneralLedger = lazyWithRetry(() => import("./finance/GeneralLedger"), "GeneralLedger");
const Treasury = lazyWithRetry(() => import("./finance/Treasury"), "Treasury");
const CostCenters = lazyWithRetry(() => import("./finance/CostCenters"), "CostCenters");
const BillingCenter = lazyWithRetry(() => import("./finance/BillingCenter"), "BillingCenter");
const Reports = lazyWithRetry(() => import("./finance/Reports"), "Reports");
const FixedAssets = lazyWithRetry(() => import("./finance/FixedAssets"), "FixedAssets");
const Budgets = lazyWithRetry(() => import("./finance/Budgets"), "Budgets");
const Vendors = lazyWithRetry(() => import("./finance/Vendors"), "Vendors");
const VendorCategories = lazyWithRetry(() => import("./finance/VendorCategories"), "VendorCategories");
const AccountMappings = lazyWithRetry(() => import("./finance/AccountMappings"), "AccountMappings");
const NewEntry = lazyWithRetry(() => import("./finance/NewEntry"), "NewEntry");
const AccountingWizard = lazyWithRetry(() => import("./finance/AccountingWizard"), "AccountingWizard");
const Deposits = lazyWithRetry(() => import("./finance/Deposits"), "Deposits");
const FinanceSettings = lazyWithRetry(() => import("./finance/FinanceSettings"), "FinanceSettings");
const JournalEntriesSettings = lazyWithRetry(() => import("./finance/settings/JournalEntriesSettings"), "JournalEntriesSettings");
const AccountsSettings = lazyWithRetry(() => import("./finance/settings/AccountsSettings"), "AccountsSettings");
const CostCentersSettings = lazyWithRetry(() => import("./finance/settings/CostCentersSettings"), "CostCentersSettings");
const AutomaticAccountsSettings = lazyWithRetry(() => import("./finance/settings/AutomaticAccountsSettings"), "AutomaticAccountsSettings");
const FinancialSystemAnalysis = lazyWithRetry(() => import("./finance/settings/FinancialSystemAnalysis"), "FinancialSystemAnalysis");

// استخدام النظام الجديد للحماية
const ProtectedFinanceRoute = ProtectedFinanceRouteComponent;

const Finance = () => {
  return (
    <Routes>
      {/* Redirect from /finance to Finance Overview */}
      <Route index element={<Navigate to="/finance/overview" replace />} />
      
      {/* ═══════════════════════════════════════════════════════════════════════
         PHASE A: REDIRECTS - All duplicate/dead routes redirect to canonical pages
         ═══════════════════════════════════════════════════════════════════════ */}
      
      {/* Duplicate unified pages → canonical pages */}
      <Route path="unified" element={<Navigate to="/finance/overview" replace />} />
      <Route path="unified-payments" element={<Navigate to="/finance/billing" replace />} />
      <Route path="unified-reports" element={<Navigate to="/finance/reports" replace />} />
      
      {/* Old routes → canonical pages */}
      <Route path="hub" element={<Navigate to="/finance/overview" replace />} />
      <Route path="payments" element={<Navigate to="/finance/billing" replace />} />
      <Route path="payments-dashboard" element={<Navigate to="/finance/billing" replace />} />
      <Route path="invoices" element={<Navigate to="/finance/billing" replace />} />
      
      {/* Accounting redirects → general-ledger */}
      <Route path="ledger" element={<Navigate to="/finance/general-ledger" replace />} />
      <Route path="journal-entries" element={<Navigate to="/finance/general-ledger" replace />} />
      
      {/* Analysis/reports redirects */}
      <Route path="analysis" element={<Navigate to="/finance/reports" replace />} />
      <Route path="financial-ratios" element={<Navigate to="/finance/reports" replace />} />
      
      {/* Demo/dead pages */}
      <Route path="calculator" element={<Navigate to="/finance/overview" replace />} />
      <Route path="cash-receipt" element={<Navigate to="/finance/billing" replace />} />
      <Route path="professional-invoice" element={<Navigate to="/finance/billing" replace />} />
      <Route path="journal-entries-demo" element={<Navigate to="/finance/general-ledger" replace />} />
      <Route path="monthly-rent-tracking" element={<Navigate to="/finance/billing" replace />} />
      
      {/* Merged pages */}
      <Route path="reports-analysis" element={<Navigate to="/finance/reports" replace />} />
      <Route path="budgets-centers" element={<Navigate to="/finance/budgets" replace />} />
      <Route path="audit-settings" element={<Navigate to="/finance/settings" replace />} />
      <Route path="accounting" element={<Navigate to="/finance/general-ledger" replace />} />
      <Route path="accountant-dashboard" element={<Navigate to="/finance/overview" replace />} />
      
      {/* ═══════════════════════════════════════════════════════════════════════
         CORE PAGES - Real rendered routes
         ═══════════════════════════════════════════════════════════════════════ */}
      
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
      
      {/* Billing Center - unified invoices and payments */}
      <Route 
        path="billing" 
        element={
          <ProtectedFinanceRoute permission="finance.invoices.view">
            <Suspense fallback={<PageSkeletonFallback />}>
              <BillingCenter />
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