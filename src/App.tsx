import React from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyContextProvider } from "@/contexts/CompanyContext";
import { AuthChecker } from "@/components/auth/AuthChecker";

// Import all pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Contracts from "@/pages/Contracts";
import Finance from "@/pages/Finance";
import Legal from "@/pages/Legal";
import Customers from "@/pages/Customers";
import Fleet from "@/pages/Fleet";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import Support from "@/pages/Support";
import Search from "@/pages/Search";
import Import from "@/pages/Import";
import SuperAdmin from "@/pages/SuperAdmin";
import Quotations from "@/pages/Quotations";
import QuotationApproval from "@/pages/QuotationApproval";
import EditCustomer from "@/pages/EditCustomer";
import VehicleInstallments from "@/pages/VehicleInstallments";
import PaymentLinking from "@/pages/PaymentLinking";
import EnhancedFinancialPage from "@/pages/EnhancedFinancialPage";
import ResetPassword from "@/pages/ResetPassword";
import SupportTicketDetail from "@/pages/SupportTicketDetail";
import NotFound from "@/pages/NotFound";

// Finance subpages
import ChartOfAccounts from "@/pages/finance/ChartOfAccounts";
import AccountingWizard from "@/pages/finance/AccountingWizard";
import GeneralLedger from "@/pages/finance/GeneralLedger";
import AccountMappings from "@/pages/finance/AccountMappings";
import MaintenanceAccounting from "@/pages/finance/MaintenanceAccounting";
import FinancialAnalysis from "@/pages/finance/FinancialAnalysis";
import Treasury from "@/pages/finance/Treasury";
import Invoices from "@/pages/finance/Invoices";
import Payments from "@/pages/finance/Payments";
import Vendors from "@/pages/finance/Vendors";
import PurchaseOrders from "@/pages/finance/PurchaseOrders";
import FixedAssets from "@/pages/finance/FixedAssets";
import Budgets from "@/pages/finance/Budgets";
import CostCenters from "@/pages/finance/CostCenters";
import Calculator from "@/pages/finance/Calculator";
import InvoiceReports from "@/pages/finance/InvoiceReports";
import FinanceReports from "@/pages/finance/Reports";

// Fleet subpages
import Maintenance from "@/pages/fleet/Maintenance";
import DispatchPermits from "@/pages/fleet/DispatchPermits";
import FleetReports from "@/pages/fleet/FleetReports";
import FleetFinancialAnalysis from "@/pages/fleet/FleetFinancialAnalysis";
import TrafficViolationPayments from "@/pages/fleet/TrafficViolationPayments";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <CompanyContextProvider>
            <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <AuthChecker>
                  <Dashboard />
                </AuthChecker>
              } />
              
              <Route path="/contracts" element={
                <AuthChecker>
                  <Contracts />
                </AuthChecker>
              } />
              
              <Route path="/finance" element={
                <AuthChecker>
                  <Finance />
                </AuthChecker>
              } />
              
              <Route path="/finance/chart-of-accounts" element={
                <AuthChecker>
                  <ChartOfAccounts />
                </AuthChecker>
              } />
              
              <Route path="/finance/accounting-wizard" element={
                <AuthChecker>
                  <AccountingWizard />
                </AuthChecker>
              } />
              
              <Route path="/finance/ledger" element={
                <AuthChecker>
                  <GeneralLedger />
                </AuthChecker>
              } />
              
              <Route path="/finance/account-mappings" element={
                <AuthChecker>
                  <AccountMappings />
                </AuthChecker>
              } />
              
              <Route path="/finance/maintenance-accounting" element={
                <AuthChecker>
                  <MaintenanceAccounting />
                </AuthChecker>
              } />
              
              <Route path="/finance/analysis" element={
                <AuthChecker>
                  <FinancialAnalysis />
                </AuthChecker>
              } />
              
              <Route path="/finance/treasury" element={
                <AuthChecker>
                  <Treasury />
                </AuthChecker>
              } />
              
              <Route path="/finance/invoices" element={
                <AuthChecker>
                  <Invoices />
                </AuthChecker>
              } />
              
              <Route path="/finance/payments" element={
                <AuthChecker>
                  <Payments />
                </AuthChecker>
              } />
              
              <Route path="/finance/vendors" element={
                <AuthChecker>
                  <Vendors />
                </AuthChecker>
              } />
              
              <Route path="/finance/purchase-orders" element={
                <AuthChecker>
                  <PurchaseOrders />
                </AuthChecker>
              } />
              
              <Route path="/finance/fixed-assets" element={
                <AuthChecker>
                  <FixedAssets />
                </AuthChecker>
              } />
              
              <Route path="/finance/budgets" element={
                <AuthChecker>
                  <Budgets />
                </AuthChecker>
              } />
              
              <Route path="/finance/cost-centers" element={
                <AuthChecker>
                  <CostCenters />
                </AuthChecker>
              } />
              
              <Route path="/finance/calculator" element={
                <AuthChecker>
                  <Calculator />
                </AuthChecker>
              } />
              
              <Route path="/finance/invoice-reports" element={
                <AuthChecker>
                  <InvoiceReports />
                </AuthChecker>
              } />
              
              <Route path="/finance/reports" element={
                <AuthChecker>
                  <FinanceReports />
                </AuthChecker>
              } />
              
              <Route path="/legal" element={
                <AuthChecker>
                  <Legal />
                </AuthChecker>
              } />
              
              <Route path="/customers" element={
                <AuthChecker>
                  <Customers />
                </AuthChecker>
              } />
              
              <Route path="/customers/edit/:id" element={
                <AuthChecker>
                  <EditCustomer />
                </AuthChecker>
              } />
              
              <Route path="/fleet" element={
                <AuthChecker>
                  <Fleet />
                </AuthChecker>
              } />
              
              <Route path="/fleet/maintenance" element={
                <AuthChecker>
                  <Maintenance />
                </AuthChecker>
              } />
              
              <Route path="/fleet/dispatch-permits" element={
                <AuthChecker>
                  <DispatchPermits />
                </AuthChecker>
              } />
              
              <Route path="/fleet/reports" element={
                <AuthChecker>
                  <FleetReports />
                </AuthChecker>
              } />
              
              <Route path="/fleet/financial-analysis" element={
                <AuthChecker>
                  <FleetFinancialAnalysis />
                </AuthChecker>
              } />
              
              <Route path="/fleet/traffic-violation-payments" element={
                <AuthChecker>
                  <TrafficViolationPayments />
                </AuthChecker>
              } />
              
              <Route path="/reports" element={
                <AuthChecker>
                  <Reports />
                </AuthChecker>
              } />
              
              <Route path="/quotations" element={
                <AuthChecker>
                  <Quotations />
                </AuthChecker>
              } />
              
              <Route path="/quotations/approval" element={
                <AuthChecker>
                  <QuotationApproval />
                </AuthChecker>
              } />
              
              <Route path="/vehicle-installments" element={
                <AuthChecker>
                  <VehicleInstallments />
                </AuthChecker>
              } />
              
              <Route path="/payment-linking" element={
                <AuthChecker>
                  <PaymentLinking />
                </AuthChecker>
              } />
              
              <Route path="/enhanced-financial" element={
                <AuthChecker>
                  <EnhancedFinancialPage />
                </AuthChecker>
              } />
              
              <Route path="/settings" element={
                <AuthChecker>
                  <Settings />
                </AuthChecker>
              } />
              
              <Route path="/profile" element={
                <AuthChecker>
                  <Profile />
                </AuthChecker>
              } />
              
              <Route path="/support" element={
                <AuthChecker>
                  <Support />
                </AuthChecker>
              } />
              
              <Route path="/support/ticket/:id" element={
                <AuthChecker>
                  <SupportTicketDetail />
                </AuthChecker>
              } />
              
              <Route path="/search" element={
                <AuthChecker>
                  <Search />
                </AuthChecker>
              } />
              
              <Route path="/import" element={
                <AuthChecker>
                  <Import />
                </AuthChecker>
              } />
              
              {/* 404 fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CompanyContextProvider>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;