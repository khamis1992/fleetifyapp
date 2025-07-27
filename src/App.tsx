import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SuperAdmin from "./pages/SuperAdmin";
import Dashboard from "./pages/Dashboard";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminCompanies from "./pages/super-admin/Companies";
import SuperAdminUsers from "./pages/super-admin/Users";
import Finance from "./pages/Finance";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Fleet from "./pages/Fleet";
import NotFound from "./pages/NotFound";
import Contracts from "./pages/Contracts";
import Customers from "./pages/Customers";
import Quotations from "./pages/Quotations";
import Maintenance from "./pages/fleet/Maintenance";
import TrafficViolations from "./pages/fleet/TrafficViolations";
import TrafficViolationPayments from "./pages/fleet/TrafficViolationPayments";
import FleetReports from "./pages/fleet/FleetReports";
import Employees from "./pages/hr/Employees";
import UserManagement from "./pages/hr/UserManagement";
import Attendance from "./pages/hr/Attendance";
import LeaveManagement from "./pages/hr/LeaveManagement";
import LocationSettings from "./pages/hr/LocationSettings";
import Payroll from "./pages/hr/Payroll";
import HRReports from "./pages/hr/Reports";
import HRSettings from "./pages/hr/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/super-admin/*" element={<SuperAdminLayout />}>
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="companies" element={<SuperAdminCompanies />} />
              <Route path="users" element={<SuperAdminUsers />} />
              <Route path="payments" element={<div className="p-8 text-center text-muted-foreground">المدفوعات - قيد التطوير</div>} />
              <Route path="reports" element={<div className="p-8 text-center text-muted-foreground">تقارير النظام - قيد التطوير</div>} />
              <Route path="settings" element={<div className="p-8 text-center text-muted-foreground">إعدادات النظام - قيد التطوير</div>} />
            </Route>
            <Route path="/*" element={<DashboardLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="fleet" element={<Fleet />} />
              <Route path="fleet/maintenance" element={<Maintenance />} />
              <Route path="fleet/traffic-violations" element={<TrafficViolations />} />
              <Route path="fleet/traffic-violation-payments" element={<TrafficViolationPayments />} />
              <Route path="fleet/reports" element={<FleetReports />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="customers" element={<Customers />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="finance/*" element={<Finance />} />
              <Route path="hr/employees" element={<Employees />} />
              <Route path="hr/user-management" element={<UserManagement />} />
              <Route path="hr/attendance" element={<Attendance />} />
              <Route path="hr/leave-management" element={<LeaveManagement />} />
              <Route path="hr/location-settings" element={<LocationSettings />} />
              <Route path="hr/payroll" element={<Payroll />} />
              <Route path="hr/reports" element={<HRReports />} />
              <Route path="hr/settings" element={<HRSettings />} />
              <Route path="reports" element={<div className="p-8 text-center text-muted-foreground">صفحة التقارير - قيد التطوير</div>} />
              <Route path="legal" element={<div className="p-8 text-center text-muted-foreground">الشؤون القانونية - قيد التطوير</div>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
