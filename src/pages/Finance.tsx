import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { SuperAdminRoute } from "@/components/common/ProtectedRoute";
import { ProtectedFinanceRoute } from "@/components/finance/ProtectedFinanceRoute";
import { resolveFinanceLocation } from "@/components/finance/workspace/financeRouteAliases";
const Overview = lazyWithRetry(() => import("./finance/Overview"), "Overview");
const BillingCenter = lazyWithRetry(
  () => import("./finance/BillingCenter"),
  "BillingCenter"
);
const CollectionsPage = lazyWithRetry(
  () =>
    import("./finance/FinanceSectionPages").then((m) => ({
      default: m.CollectionsPage,
    })),
  "CollectionsPage"
);
const MonthlyRentTracking = lazyWithRetry(
  () => import("./finance/MonthlyRentTracking"),
  "MonthlyRentTracking"
);
const Deposits = lazyWithRetry(() => import("./finance/Deposits"), "Deposits");
const ReceivePaymentWorkflow = lazyWithRetry(
  () => import("./finance/operations/ReceivePaymentWorkflow"),
  "ReceivePaymentWorkflow"
);
const ChartOfAccounts = lazyWithRetry(
  () => import("./finance/ChartOfAccounts"),
  "ChartOfAccounts"
);
const GeneralLedger = lazyWithRetry(
  () => import("./finance/GeneralLedger"),
  "GeneralLedger"
);
const Ledger = lazyWithRetry(() => import("./finance/Ledger"), "Ledger");
const Treasury = lazyWithRetry(() => import("./finance/Treasury"), "Treasury");
const ReconciliationPage = lazyWithRetry(
  () =>
    import("./finance/FinanceSectionPages").then((m) => ({
      default: m.ReconciliationPage,
    })),
  "ReconciliationPage"
);
const MonthlyObligations = lazyWithRetry(
  () => import("./finance/MonthlyObligations"),
  "MonthlyObligations"
);
const FixedAssets = lazyWithRetry(
  () => import("./finance/FixedAssets"),
  "FixedAssets"
);
const Budgets = lazyWithRetry(() => import("./finance/Budgets"), "Budgets");
const CostCenters = lazyWithRetry(
  () => import("./finance/CostCenters"),
  "CostCenters"
);
const ReportsLibrary = lazyWithRetry(
  () => import("./finance/ReportsLibrary"),
  "ReportsLibrary"
);
const FinancialStatementsPanel = lazyWithRetry(
  () => import("./finance/FinancialStatementsPanel"),
  "FinancialStatementsPanel"
);
const AnalysisPage = lazyWithRetry(
  () =>
    import("./finance/FinanceSectionPages").then((m) => ({
      default: m.AnalysisPage,
    })),
  "AnalysisPage"
);
const RatiosPage = lazyWithRetry(
  () =>
    import("./finance/FinanceSectionPages").then((m) => ({
      default: m.RatiosPage,
    })),
  "RatiosPage"
);
const CalculatorPage = lazyWithRetry(
  () =>
    import("./finance/FinanceSectionPages").then((m) => ({
      default: m.CalculatorPage,
    })),
  "CalculatorPage"
);
const FinancialConsolidation = lazyWithRetry(
  () => import("./finance/FinancialConsolidation"),
  "FinancialConsolidation"
);
const ApprovalsPage = lazyWithRetry(
  () =>
    import("./finance/FinanceSectionPages").then((m) => ({
      default: m.ApprovalsPage,
    })),
  "ApprovalsPage"
);
const IntegrityPage = lazyWithRetry(
  () =>
    import("./finance/FinanceSectionPages").then((m) => ({
      default: m.IntegrityPage,
    })),
  "IntegrityPage"
);
const ClosePage = lazyWithRetry(
  () =>
    import("./finance/FinanceSectionPages").then((m) => ({
      default: m.ClosePage,
    })),
  "ClosePage"
);
const MonthlyCloseAudit = lazyWithRetry(
  () => import("./finance/MonthlyCloseAudit"),
  "MonthlyCloseAudit"
);
const AuditTrailPage = lazyWithRetry(
  () => import("./finance/AuditTrailPage"),
  "AuditTrailPage"
);
const InvoiceJournalReport = lazyWithRetry(
  () => import("./finance/InvoiceJournalReport"),
  "InvoiceJournalReport"
);
const FinanceSettings = lazyWithRetry(
  () => import("./finance/FinanceSettings"),
  "FinanceSettings"
);
const AccountingWizard = lazyWithRetry(
  () => import("./finance/AccountingWizard"),
  "AccountingWizard"
);
const VendorCategories = lazyWithRetry(
  () => import("./finance/VendorCategories"),
  "VendorCategories"
);
const CashReceiptDemo = lazyWithRetry(
  () => import("./CashReceiptDemo"),
  "CashReceiptDemo"
);
const JournalEntriesDemo = lazyWithRetry(
  () => import("./finance/JournalEntriesDemo"),
  "JournalEntriesDemo"
);
const JournalEntriesSettings = lazyWithRetry(
  () => import("./finance/settings/JournalEntriesSettings"),
  "JournalEntriesSettings"
);
const AccountsSettings = lazyWithRetry(
  () => import("./finance/settings/AccountsSettings"),
  "AccountsSettings"
);
const CostCentersSettings = lazyWithRetry(
  () => import("./finance/settings/CostCentersSettings"),
  "CostCentersSettings"
);
const AutomaticAccountsSettings = lazyWithRetry(
  () => import("./finance/settings/AutomaticAccountsSettings"),
  "AutomaticAccountsSettings"
);
const FinancialSystemAnalysis = lazyWithRetry(
  () => import("./finance/settings/FinancialSystemAnalysis"),
  "FinancialSystemAnalysis"
);

export default function Finance() {
  const location = useLocation();
  const destination = resolveFinanceLocation(
    location.pathname,
    location.search
  );
  if (destination !== `${location.pathname}${location.search}`)
    return (
      <Navigate
        to={`${destination}${location.hash}`}
        state={location.state}
        replace
      />
    );
  return (
    <Suspense fallback={<PageSkeletonFallback />}>
      <Routes>
        <Route
          path="overview"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <Overview />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <ProtectedFinanceRoute permission="finance.invoices.view">
              <BillingCenter section="invoices" key="invoices" />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedFinanceRoute permission="finance.invoices.view">
              <BillingCenter section="payments" key="payments" />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="collections"
          element={
            <ProtectedFinanceRoute permission="finance.invoices.view">
              <CollectionsPage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="collections/rent"
          element={
            <ProtectedFinanceRoute permission="finance.invoices.view">
              <MonthlyRentTracking />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="deposits"
          element={
            <ProtectedFinanceRoute permission="finance.invoices.view">
              <Deposits />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="operations/receive-payment"
          element={
            <ProtectedFinanceRoute permission="finance.payments.create">
              <ReceivePaymentWorkflow />
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
          path="general-ledger"
          element={
            <ProtectedFinanceRoute permission="finance.accounts.view">
              <GeneralLedger />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="journal-entries"
          element={
            <ProtectedFinanceRoute permission="finance.accounts.view">
              <Ledger />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="treasury"
          element={
            <ProtectedFinanceRoute permission="finance.treasury.view">
              <Treasury section="banks" key="banks" />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="treasury/transactions"
          element={
            <ProtectedFinanceRoute permission="finance.treasury.view">
              <Treasury section="transactions" key="transactions" />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="treasury/reconciliation"
          element={
            <ProtectedFinanceRoute permission="finance.treasury.view">
              <ReconciliationPage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="obligations"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <MonthlyObligations />
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
          path="cost-centers"
          element={
            <ProtectedFinanceRoute permission="finance.budgets.view">
              <CostCenters />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <ReportsLibrary />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="reports/:reportId"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <FinancialStatementsPanel />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="analysis"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <AnalysisPage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="analysis/ratios"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <RatiosPage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="tools/calculator"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <CalculatorPage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="consolidation"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <FinancialConsolidation />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="approvals"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <ApprovalsPage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="integrity"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <IntegrityPage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="close"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <ClosePage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="close/review"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <MonthlyCloseAudit />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <AuditTrailPage />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="invoice-journal-report"
          element={
            <ProtectedFinanceRoute permission="finance.view">
              <InvoiceJournalReport />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedFinanceRoute permission="finance.settings.view">
              <FinanceSettings initialTab="system" key="system" />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="settings/account-mappings"
          element={
            <ProtectedFinanceRoute permission="finance.settings.view">
              <FinanceSettings initialTab="mappings" key="mappings" />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="settings/permissions"
          element={
            <ProtectedFinanceRoute permission="finance.settings.view">
              <FinanceSettings initialTab="permissions" key="permissions" />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="settings/setup"
          element={
            <ProtectedFinanceRoute permission="finance.settings.view">
              <FinanceSettings initialTab="wizard" key="wizard" />
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
        <Route
          path="vendor-categories"
          element={
            <ProtectedFinanceRoute permission="finance.vendors.manage">
              <VendorCategories />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="cash-receipt"
          element={
            <ProtectedFinanceRoute permission="finance.payments.view">
              <CashReceiptDemo />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="journal-entries-demo"
          element={
            <ProtectedFinanceRoute permission="finance.ledger.view">
              <JournalEntriesDemo />
            </ProtectedFinanceRoute>
          }
        />
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
        <Route
          path="settings/financial-system-analysis"
          element={
            <ProtectedFinanceRoute permission="finance.accounts.view">
              <FinancialSystemAnalysis />
            </ProtectedFinanceRoute>
          }
        />
        <Route
          path="*"
          element={
            <section dir="rtl" className="space-y-3 p-6">
              <h1 className="text-xl font-bold">الصفحة المالية غير موجودة</h1>
              <Link className="underline" to="/finance/overview">
                العودة إلى المركز المالي
              </Link>
            </section>
          }
        />
      </Routes>
    </Suspense>
  );
}
