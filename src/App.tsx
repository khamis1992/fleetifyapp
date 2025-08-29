import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyContextProvider } from "@/contexts/CompanyContext";

// Immediate imports for critical routes
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

// Lazy load all heavy components to reduce main thread work
const DashboardLayout = lazy(() => import("@/components/layouts/DashboardLayout").then(m => ({ default: m.DashboardLayout })));
const SuperAdminLayout = lazy(() => import("@/components/layouts/SuperAdminLayout").then(m => ({ default: m.SuperAdminLayout })));
const CompanyBrowserLayout = lazy(() => import("@/components/layouts/CompanyBrowserLayout").then(m => ({ default: m.CompanyBrowserLayout })));
const ProtectedRoute = lazy(() => import("@/components/common/ProtectedRoute").then(m => ({ default: m.ProtectedRoute })));
const AdminRoute = lazy(() => import("@/components/common/ProtectedRoute").then(m => ({ default: m.AdminRoute })));
const SuperAdminRoute = lazy(() => import("@/components/common/ProtectedRoute").then(m => ({ default: m.SuperAdminRoute })));

// Lazy load all pages
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const SuperAdminCompanies = lazy(() => import("./pages/super-admin/Companies"));
const SuperAdminUsers = lazy(() => import("./pages/super-admin/Users"));
const SuperAdminSettings = lazy(() => import("./pages/super-admin/Settings"));
const Finance = lazy(() => import("./pages/Finance"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const AdvancedSettings = lazy(() => import("./pages/AdvancedSettings"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const BackupPage = lazy(() => import("./pages/BackupPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const Fleet = lazy(() => import("./pages/Fleet"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Customers = lazy(() => import("./pages/Customers"));
const EditCustomer = lazy(() => import("./pages/EditCustomer"));
const Quotations = lazy(() => import("./pages/Quotations"));
const QuotationApproval = lazy(() => import("./pages/QuotationApproval"));
const Maintenance = lazy(() => import("./pages/fleet/Maintenance"));
const TrafficViolations = lazy(() => import("./pages/fleet/TrafficViolations"));
const TrafficViolationPayments = lazy(() => import("./pages/fleet/TrafficViolationPayments"));
const FleetReports = lazy(() => import("./pages/fleet/FleetReports"));
const DispatchPermits = lazy(() => import("./pages/fleet/DispatchPermits"));
const VehicleConditionCheck = lazy(() => import("./pages/fleet/VehicleConditionCheck").then(m => ({ default: m.VehicleConditionCheck })));
const FleetFinancialAnalysis = lazy(() => import("./pages/fleet/FleetFinancialAnalysis"));
const VehicleInstallments = lazy(() => import("./pages/VehicleInstallments"));
const Employees = lazy(() => import("./pages/hr/Employees"));
const UserManagement = lazy(() => import("./pages/hr/UserManagement"));
const Attendance = lazy(() => import("./pages/hr/Attendance"));
const LeaveManagement = lazy(() => import("./pages/hr/LeaveManagement"));
const LocationSettings = lazy(() => import("./pages/hr/LocationSettings"));
const Payroll = lazy(() => import("./pages/hr/Payroll"));
const HRReports = lazy(() => import("./pages/hr/Reports"));
const HRSettings = lazy(() => import("./pages/hr/Settings"));
const Legal = lazy(() => import("./pages/Legal"));
const LegalAdvisor = lazy(() => import("./pages/legal/LegalAdvisor"));
const CaseManagement = lazy(() => import("./pages/legal/CaseManagement"));
const ApprovalSystem = lazy(() => import("./pages/ApprovalSystem"));
const Support = lazy(() => import("./pages/Support"));
const SupportTicketDetail = lazy(() => import("./pages/SupportTicketDetail"));
const SuperAdminSupport = lazy(() => import("./pages/super-admin/Support"));
const SuperAdminPayments = lazy(() => import("./pages/super-admin/Payments"));
const SuperAdminReports = lazy(() => import("./pages/super-admin/Reports"));
const LandingManagement = lazy(() => import("./pages/super-admin/LandingManagement"));
const Reports = lazy(() => import("./pages/Reports"));

// Create query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CompanyContextProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Critical routes - no lazy loading */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Lazy loaded routes */}
            <Route path="/quotation-approval" element={
              <Suspense fallback={<PageLoadingFallback />}>
                <QuotationApproval />
              </Suspense>
            } />
            <Route path="/super-admin" element={
              <Suspense fallback={<PageLoadingFallback />}>
                <SuperAdmin />
              </Suspense>
            } />
            <Route path="/super-admin/*" element={
              <Suspense fallback={<PageLoadingFallback />}>
                <SuperAdminLayout />
              </Suspense>
            }>
              <Route path="dashboard" element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <SuperAdminDashboard />
                </Suspense>
              } />
              {/* Other super admin routes would be wrapped similarly */}
            </Route>
            <Route path="/*" element={
              <Suspense fallback={<PageLoadingFallback />}>
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              </Suspense>
            }>
              <Route path="dashboard" element={
                <Suspense fallback={<PageLoadingFallback />}>
                  <Dashboard />
                </Suspense>
              } />
              
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
              <Route path="legal/advisor" element={
                <AdminRoute>
                  <LegalAdvisor />
                </AdminRoute>
              } />
              <Route path="legal/cases" element={
                <AdminRoute>
                  <CaseManagement />
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
              <Route path="legal/advisor" element={
                <AdminRoute>
                  <LegalAdvisor />
                </AdminRoute>
              } />
              <Route path="legal/cases" element={
                <AdminRoute>
                  <CaseManagement />
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
