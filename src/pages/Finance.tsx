import { Routes, Route, Navigate } from "react-router-dom"
import { Suspense } from "react"
import { lazyWithRetry } from "@/utils/lazyWithRetry"
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper"
import { SuperAdminRoute } from "@/components/common/ProtectedRoute"
import { ProtectedFinanceRoute as ProtectedFinanceRouteComponent } from "@/components/finance/ProtectedFinanceRoute"

// Lazy load all finance sub-modules with retry for better reliability
const Overview = lazyWithRetry(() => import("./finance/Overview"), "Overview");
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

// استخدام النظام الجديد للحماية
const ProtectedFinanceRoute = ProtectedFinanceRouteComponent;

const Finance = () => {
  return (
    <Routes>
      {/* Redirect from /finance to /finance/overview */}
      <Route index element={<Navigate to="/finance/overview" replace />} />
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