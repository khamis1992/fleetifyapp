import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyContextProvider } from "@/contexts/CompanyContext";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { CompanyBrowserLayout } from "@/components/layouts/CompanyBrowserLayout";
import { ProtectedRoute, AdminRoute, SuperAdminRoute } from "@/components/common/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SuperAdmin from "./pages/SuperAdmin";
import Dashboard from "./pages/Dashboard";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminCompanies from "./pages/super-admin/Companies";
import SuperAdminUsers from "./pages/super-admin/Users";
import SuperAdminSettings from "./pages/super-admin/Settings";
import Finance from "./pages/Finance";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AdvancedSettings from "./pages/AdvancedSettings";
import SubscriptionPage from "./pages/SubscriptionPage";
import ResetPassword from "./pages/ResetPassword";
import Search from "./pages/Search";
import Import from "./pages/Import";
import FinancialCalculator from "./pages/finance/Calculator";

import BackupPage from "./pages/BackupPage";
import AuditPage from "./pages/AuditPage";
import Fleet from "./pages/Fleet";
import NotFound from "./pages/NotFound";
import Contracts from "./pages/Contracts";
import Customers from "./pages/Customers";
import EditCustomer from "./pages/EditCustomer";
import Quotations from "./pages/Quotations";
import QuotationApproval from "./pages/QuotationApproval";
import Maintenance from "./pages/fleet/Maintenance";
import TrafficViolations from "./pages/fleet/TrafficViolations";
import TrafficViolationPayments from "./pages/fleet/TrafficViolationPayments";
import FleetReports from "./pages/fleet/FleetReports";
import DispatchPermits from "./pages/fleet/DispatchPermits";
import { VehicleConditionCheck } from "./pages/fleet/VehicleConditionCheck";
import FleetFinancialAnalysis from "./pages/fleet/FleetFinancialAnalysis";
import VehicleInstallments from "./pages/VehicleInstallments";
import Employees from "./pages/hr/Employees";
import UserManagement from "./pages/hr/UserManagement";
import Attendance from "./pages/hr/Attendance";
import LeaveManagement from "./pages/hr/LeaveManagement";
import LocationSettings from "./pages/hr/LocationSettings";
import Payroll from "./pages/hr/Payroll";
import HRReports from "./pages/hr/Reports";
import HRSettings from "./pages/hr/Settings";
import Legal from "./pages/Legal";
import ApprovalSystem from "./pages/ApprovalSystem";
import Support from "./pages/Support";
import SupportTicketDetail from "./pages/SupportTicketDetail";
import SuperAdminSupport from "./pages/super-admin/Support";
import SuperAdminPayments from "./pages/super-admin/Payments";
import SuperAdminReports from "./pages/super-admin/Reports";
import LandingManagement from "./pages/super-admin/LandingManagement";
import Reports from "./pages/Reports";
import ElectronicSignatureSettings from "./pages/settings/ElectronicSignatureSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CompanyContextProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/quotation-approval" element={<QuotationApproval />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/super-admin/*" element={<SuperAdminLayout />}>
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="companies" element={<SuperAdminCompanies />} />
              <Route path="users" element={<SuperAdminUsers />} />
              <Route path="support" element={<SuperAdminSupport />} />
              <Route path="payments" element={<SuperAdminPayments />} />
              <Route path="reports" element={<SuperAdminReports />} />
              <Route path="landing-management" element={<LandingManagement />} />
              <Route path="settings" element={<SuperAdminSettings />} />
            </Route>
            <Route path="/*" element={<DashboardLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              
              <Route path="backup" element={
                <SuperAdminRoute>
                  <BackupPage />
                </SuperAdminRoute>
              } />
              <Route path="audit" element={
                <AdminRoute>
                  <AuditPage />
                </AdminRoute>
              } />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/advanced" element={<AdvancedSettings />} />
              <Route path="settings/electronic-signature" element={
                <AdminRoute>
                  <ElectronicSignatureSettings />
                </AdminRoute>
              } />
              <Route path="fleet" element={
                <AdminRoute>
                  <Fleet />
                </AdminRoute>
              } />
              <Route path="fleet/dispatch-permits" element={
                <AdminRoute>
                  <DispatchPermits />
                </AdminRoute>
              } />
              <Route path="fleet/vehicle-condition-check" element={
                <AdminRoute>
                  <VehicleConditionCheck />
                </AdminRoute>
              } />
              <Route path="fleet/maintenance" element={
                <AdminRoute>
                  <Maintenance />
                </AdminRoute>
              } />
              <Route path="fleet/traffic-violations" element={
                <AdminRoute>
                  <TrafficViolations />
                </AdminRoute>
              } />
              <Route path="fleet/traffic-violation-payments" element={
                <AdminRoute>
                  <TrafficViolationPayments />
                </AdminRoute>
              } />
              <Route path="fleet/reports" element={
                <AdminRoute>
                  <FleetReports />
                </AdminRoute>
              } />
              <Route path="fleet/financial-analysis" element={
                <AdminRoute>
                  <FleetFinancialAnalysis />
                </AdminRoute>
              } />
              <Route path="fleet/vehicle-installments" element={
                <AdminRoute>
                  <VehicleInstallments />
                </AdminRoute>
              } />
              <Route path="contracts" element={<Contracts />} />
              <Route path="customers" element={<Customers />} />
              <Route path="edit-customer/:id" element={<EditCustomer />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="finance/*" element={<Finance />} />
              <Route path="hr/employees" element={
                <AdminRoute>
                  <Employees />
                </AdminRoute>
              } />
              <Route path="hr/user-management" element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              } />
              <Route path="hr/attendance" element={
                <AdminRoute>
                  <Attendance />
                </AdminRoute>
              } />
              <Route path="hr/leave-management" element={
                <AdminRoute>
                  <LeaveManagement />
                </AdminRoute>
              } />
              <Route path="hr/location-settings" element={
                <AdminRoute>
                  <LocationSettings />
                </AdminRoute>
              } />
              <Route path="hr/payroll" element={
                <AdminRoute>
                  <Payroll />
                </AdminRoute>
              } />
              <Route path="hr/reports" element={
                <AdminRoute>
                  <HRReports />
                </AdminRoute>
              } />
              <Route path="hr/settings" element={
                <AdminRoute>
                  <HRSettings />
                </AdminRoute>
              } />
              <Route path="reports" element={<Reports />} />
              <Route path="legal" element={
                <AdminRoute>
                  <Legal />
                </AdminRoute>
              } />
              <Route path="approvals" element={
                <AdminRoute>
                  <ApprovalSystem />
                </AdminRoute>
              } />
              <Route path="support" element={<Support />} />
              <Route path="support/ticket/:ticketId" element={<SupportTicketDetail />} />
              
              {/* البحث المتقدم */}
              <Route path="search" element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              } />
              
              {/* الاستيراد */}
              <Route path="import" element={
                <AdminRoute>
                  <Import />
                </AdminRoute>
              } />
            </Route>
            
            {/* Company Browser Layout - Super Admin browsing company data */}
            <Route path="/browse-company/*" element={
              <SuperAdminRoute>
                <CompanyBrowserLayout />
              </SuperAdminRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              
              <Route path="fleet" element={
                <AdminRoute>
                  <Fleet />
                </AdminRoute>
              } />
              <Route path="fleet/dispatch-permits" element={
                <AdminRoute>
                  <DispatchPermits />
                </AdminRoute>
              } />
              <Route path="fleet/vehicle-condition-check" element={
                <AdminRoute>
                  <VehicleConditionCheck />
                </AdminRoute>
              } />
              <Route path="fleet/maintenance" element={
                <AdminRoute>
                  <Maintenance />
                </AdminRoute>
              } />
              <Route path="fleet/traffic-violations" element={
                <AdminRoute>
                  <TrafficViolations />
                </AdminRoute>
              } />
              <Route path="fleet/traffic-violation-payments" element={
                <AdminRoute>
                  <TrafficViolationPayments />
                </AdminRoute>
              } />
              <Route path="fleet/reports" element={
                <AdminRoute>
                  <FleetReports />
                </AdminRoute>
              } />
              <Route path="fleet/financial-analysis" element={
                <AdminRoute>
                  <FleetFinancialAnalysis />
                </AdminRoute>
              } />
              <Route path="fleet/vehicle-installments" element={
                <AdminRoute>
                  <VehicleInstallments />
                </AdminRoute>
              } />
              <Route path="contracts" element={<Contracts />} />
              <Route path="customers" element={<Customers />} />
              <Route path="edit-customer/:id" element={<EditCustomer />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="settings/electronic-signature" element={
                <AdminRoute>
                  <ElectronicSignatureSettings />
                </AdminRoute>
              } />
              <Route path="finance/*" element={<Finance />} />
              <Route path="hr/employees" element={
                <AdminRoute>
                  <Employees />
                </AdminRoute>
              } />
              <Route path="hr/user-management" element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              } />
              <Route path="hr/attendance" element={
                <AdminRoute>
                  <Attendance />
                </AdminRoute>
              } />
              <Route path="hr/leave-management" element={
                <AdminRoute>
                  <LeaveManagement />
                </AdminRoute>
              } />
              <Route path="hr/location-settings" element={
                <AdminRoute>
                  <LocationSettings />
                </AdminRoute>
              } />
              <Route path="hr/payroll" element={
                <AdminRoute>
                  <Payroll />
                </AdminRoute>
              } />
              <Route path="hr/reports" element={
                <AdminRoute>
                  <HRReports />
                </AdminRoute>
              } />
              <Route path="hr/settings" element={
                <AdminRoute>
                  <HRSettings />
                </AdminRoute>
              } />
              <Route path="reports" element={<Reports />} />
              <Route path="legal" element={
                <AdminRoute>
                  <Legal />
                </AdminRoute>
              } />
              <Route path="approvals" element={
                <AdminRoute>
                  <ApprovalSystem />
                </AdminRoute>
              } />
              <Route path="support" element={<Support />} />
              <Route path="support/ticket/:ticketId" element={<SupportTicketDetail />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </CompanyContextProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
