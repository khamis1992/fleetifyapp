
import React, { Suspense, lazy } from "react";
import { SimpleToaster } from "@/components/ui/simple-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ErrorBoundary from "@/lib/errorBoundary";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { compatibilityManager } from "@/lib/compatibilityManager";
import { preloadCriticalRoutes, preloadRelatedRoutes } from "@/utils/routePreloading";
import { useStableNavigation } from "@/utils/navigationOptimization";
import { initializePWA } from "@/utils/pwaConfig";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyContextProvider } from "@/contexts/CompanyContext";
import { FABProvider } from "@/contexts/FABContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ResponsiveDashboardLayout } from "@/components/layouts/ResponsiveDashboardLayout";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { CompanyBrowserLayout } from "@/components/layouts/CompanyBrowserLayout";
import { ProtectedRoute, AdminRoute, SuperAdminRoute } from "@/components/common/ProtectedRoute";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { LazyLoadErrorBoundary } from "@/components/common/LazyLoadErrorBoundary";
import { RouteErrorBoundary } from "@/components/common/RouteErrorBoundary";
import { RouteWrapper, RouteKeyWrapper } from "@/components/common/RouteWrapper";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { MobileOptimizationProvider } from "@/components/performance";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { CommandPalette } from "@/components/ui/CommandPalette";

// Critical pages - loaded immediately
import Index from "./pages/Index";
import PremiumLanding from "./pages/PremiumLanding";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import DemoTrial from "./pages/DemoTrial";
import NotFound from "./pages/NotFound";

// Demo pages - lazy loaded
const HeroDemo = lazy(() => import("./pages/HeroDemo"));
const NativeMobileDemo = lazy(() => import("./pages/NativeMobileDemo"));

// Heavy pages - lazy loaded with retry for better reliability
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"), "Dashboard");
const Finance = lazyWithRetry(() => import("./pages/Finance"), "Finance");
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetailsPage = lazy(() => import("./components/customers/CustomerDetailsPage"));
const CustomerCRM = lazy(() => import("./pages/customers/CustomerCRM"));
const Contracts = lazy(() => import("./pages/Contracts"));
const ContractDetailsPage = lazy(() => import("./components/contracts/ContractDetailsPage"));
const Fleet = lazy(() => import("./pages/Fleet"));
const VehicleDetailsPage = lazy(() => import("./components/fleet/VehicleDetailsPage"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportsHub = lazy(() => import("./pages/reports/ReportsHub"));
const ReportView = lazy(() => import("./pages/ReportView"));
const Quotations = lazy(() => import("./pages/Quotations"));
const Search = lazy(() => import("./pages/Search"));
const Import = lazy(() => import("./pages/Import"));
const InvoiceScannerPage = lazy(() => import("./pages/InvoiceScannerPage"));
const FinancialTracking = lazy(() => import("./pages/FinancialTracking"));
const SyncPaymentsToLedger = lazy(() => import("./pages/SyncPaymentsToLedger"));
const PaymentRegistration = lazy(() => import("./pages/PaymentRegistration"));

// Super Admin pages - lazy loaded
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const SuperAdminCompanies = lazy(() => import("./pages/super-admin/Companies"));
const CreateCompany = lazy(() => import("./pages/super-admin/CreateCompany"));
const SuperAdminUsers = lazy(() => import("./pages/super-admin/Users"));
const SuperAdminSettings = lazy(() => import("./pages/super-admin/Settings"));
const SuperAdminSupport = lazy(() => import("./pages/super-admin/Support"));
const SuperAdminPayments = lazy(() => import("./pages/super-admin/Payments"));
const SuperAdminReports = lazy(() => import("./pages/super-admin/Reports"));
const LandingManagement = lazy(() => import("./pages/super-admin/LandingManagement"));

// Settings and Profile pages
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const AdvancedSettings = lazy(() => import("./pages/AdvancedSettings"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));
const PermissionsManagement = lazy(() => import("./pages/PermissionsManagement"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const ElectronicSignatureSettings = lazy(() => import("./pages/settings/ElectronicSignatureSettings"));

// Property Management pages
const Properties = lazy(() => import("./pages/Properties"));
const AddProperty = lazy(() => import("./pages/AddProperty"));
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const PropertyOwners = lazy(() => import("./pages/PropertyOwners"));
const PropertiesMap = lazy(() => import("./pages/PropertiesMap"));
const PropertyMaintenance = lazy(() => import("./pages/properties/PropertyMaintenance"));
const PropertyContracts = lazy(() => import("./pages/properties/PropertyContracts"));

// Fleet Management pages
const Maintenance = lazy(() => import("./pages/fleet/Maintenance"));
const TrafficViolations = lazy(() => import("./pages/fleet/TrafficViolationsRedesigned"));
const TrafficViolationPayments = lazy(() => import("./pages/fleet/TrafficViolationPayments"));
const FleetReports = lazy(() => import("./pages/fleet/FleetReports"));
const DispatchPermits = lazy(() => import("./pages/fleet/DispatchPermits"));
const FleetFinancialAnalysis = lazy(() => import("./pages/fleet/FleetFinancialAnalysisNew"));
const ReservationSystem = lazy(() => import("./pages/fleet/ReservationSystem"));
const VehicleInstallments = lazy(() => import("./pages/VehicleInstallments"));

// HR Management pages
const Employees = lazy(() => import("./pages/hr/Employees"));
const UserManagement = lazy(() => import("./pages/hr/UserManagement"));
const Attendance = lazy(() => import("./pages/hr/Attendance"));
const LeaveManagement = lazy(() => import("./pages/hr/LeaveManagement"));
const LocationSettings = lazy(() => import("./pages/hr/LocationSettings"));
const Payroll = lazy(() => import("./pages/hr/Payroll"));
const HRReports = lazy(() => import("./pages/hr/Reports"));
const HRSettings = lazy(() => import("./pages/hr/Settings"));

// Inventory Management - Main router with lazy loading
const Inventory = lazyWithRetry(() => import("./pages/Inventory"), "Inventory");

// Integration Dashboard
const IntegrationDashboard = lazy(() => import("./pages/dashboards/IntegrationDashboard"));

// Finance sub-pages
const VendorCategories = lazy(() => import("./pages/finance/VendorCategories"));
const ARAgingReport = lazy(() => import("./pages/finance/ARAgingReport"));
const PaymentTracking = lazy(() => import("./pages/finance/PaymentTracking"));

// Sales/CRM Management pages
const SalesPipeline = lazyWithRetry(() => import("./pages/sales/SalesPipeline"), "SalesPipeline");
const SalesLeads = lazyWithRetry(() => import("./pages/sales/SalesLeads"), "SalesLeads");
const SalesOpportunities = lazyWithRetry(() => import("./pages/sales/SalesOpportunities"), "SalesOpportunities");
const SalesQuotes = lazyWithRetry(() => import("./pages/sales/SalesQuotes"), "SalesQuotes");
const SalesOrders = lazyWithRetry(() => import("./pages/sales/SalesOrders"), "SalesOrders");
const SalesAnalytics = lazyWithRetry(() => import("./pages/sales/SalesAnalytics"), "SalesAnalytics");

// Other pages
const QuotationApproval = lazy(() => import("./pages/QuotationApproval"));
const BackupPage = lazy(() => import("./pages/BackupPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const ApprovalSystem = lazy(() => import("./pages/ApprovalSystem"));
const Support = lazy(() => import("./pages/Support"));
const SupportTicketDetail = lazy(() => import("./pages/SupportTicketDetail"));
const Tenants = lazy(() => import("./pages/Tenants"));
const PerformanceDashboard = lazy(() => import("./pages/PerformanceDashboard"));

// Legal pages
const Legal = lazy(() => import("./pages/Legal"));
const LegalCasesTracking = lazy(() => import("./pages/legal/LegalCasesTracking"));
const DefaultersList = lazy(() => import("./pages/legal/DefaultersList"));
const LegalReports = lazy(() => import("./pages/legal/LegalReports"));
const LateFees = lazy(() => import("./pages/legal/LateFees"));
const WhatsAppReminders = lazy(() => import("./pages/legal/WhatsAppReminders"));
const InvoiceDisputes = lazy(() => import("./pages/legal/InvoiceDisputes"));
const DuplicateContractsManager = lazy(() => import("./components/contracts/DuplicateContractsManager"));
const DuplicateContractsDiagnostic = lazy(() => import("./components/contracts/DuplicateContractsDiagnostic"));
const PerformanceMonitor = lazy(() => import("@/components/performance").then(m => ({ default: m.PerformanceMonitor })));

// Fix pages
const FixVehicleData = lazy(() => import("./pages/FixVehicleData"));

// Help & Documentation pages
const HelpHub = lazy(() => import("./pages/help/HelpHub"));
const UserGuide = lazy(() => import("./pages/help/UserGuide"));
const ContractsHelp = lazy(() => import("./pages/help/ContractsHelp"));
const DashboardHelp = lazy(() => import("./pages/help/DashboardHelp"));
const CustomersHelp = lazy(() => import("./pages/help/CustomersHelp"));
const FinanceHelp = lazy(() => import("./pages/help/FinanceHelp"));
const CollectionsHelp = lazy(() => import("./pages/help/CollectionsHelp"));
const FleetHelp = lazy(() => import("./pages/help/FleetHelp"));

// Create a stable QueryClient instance to persist across navigation with performance monitoring integration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // PERFORMANCE FIX: Optimized caching for better performance
      refetchOnMount: false,         // Don't refetch on mount - use cache instead
      refetchOnWindowFocus: false,   // Don't refetch when switching browser tabs
      refetchOnReconnect: true,      // Refetch when internet reconnects
      
      // Cache configuration - Balanced freshness and performance
      staleTime: 5 * 60 * 1000,    // 5 minutes cache for frequently accessed data
      gcTime: 10 * 60 * 1000,        // Keep unused data in cache for 10 minutes
      
      // Retry configuration - More resilient (Phase 7 Enhanced)
      retry: 3,                     // Retry failed queries 3 times for better reliability
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff: 1s, 2s, 4s, max 10s
      
      // Network mode - Use cache even when offline
      networkMode: 'online',        // Only fetch when online
      
      // Performance monitoring callbacks for critical queries
      onSuccess: (data: any, query: any) => {
        // Log successful query completion for performance tracking
        const queryKey = query.queryKey;
        const executionTime = Date.now() - (query.state.dataUpdatedAt || Date.now());
        
        performanceLogger.logQuery(
          Array.isArray(queryKey) ? queryKey.join('.') : String(queryKey),
          executionTime,
          {
            status: 'success',
            cacheHit: query.state.isFetching === false && query.state.dataUpdatedAt > 0,
            dataReceived: !!data
          }
        );
      },
      onError: (error: any, query: any) => {
        // Log query errors for performance analysis
        const queryKey = query.queryKey;
        const executionTime = Date.now() - (query.state.dataUpdatedAt || Date.now());
        
        performanceLogger.logQuery(
          Array.isArray(queryKey) ? queryKey.join('.') : String(queryKey),
          executionTime,
          {
            status: 'error',
            error: error
          }
        );
      },
      onSettled: (data: any, error: any, query: any) => {
        // Log query completion (success or error) for performance metrics
        const queryKey = query.queryKey;
        const executionTime = Date.now() - (query.state.dataUpdatedAt || Date.now());
        
        performanceLogger.logQuery(
          Array.isArray(queryKey) ? queryKey.join('.') : String(queryKey),
          executionTime,
          {
            status: 'settled',
            success: !error,
            hasData: !!data
          }
        );
      }
    },
    mutations: {
      retry: 2,                     // Retry mutations twice for critical operations (Phase 7 Enhanced)
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 8000), // Exponential backoff for mutations
      networkMode: 'online',        // Only mutate when online
      
      // Performance monitoring for mutations
      onMutate: (variables: any) => {
        performanceLogger.logNetwork(
          'mutation_start',
          0,
          {
            operation: 'mutation',
            variables
          }
        );
      },
      onSuccess: (data: any, variables: any, context: any) => {
        performanceLogger.logNetwork(
          'mutation_success',
          0,
          {
            operation: 'mutation',
            variables,
            success: true
          }
        );
      },
      onError: (error: any, variables: any, context: any) => {
        performanceLogger.logNetwork(
          'mutation_error',
          0,
          {
            operation: 'mutation',
            variables,
            error: error
          }
        );
      }
    }
  }
});

const App = () => {
  console.log('🚀 [APP] App.tsx loaded');
  
  useEffect(() => {
    console.log('🚀 [APP] App component mounted');
    
    // Ensure loading class is removed when app is fully mounted
    // This prevents blur from staying on screen
    const ensureLoadingRemoved = () => {
      if (document.body.classList.contains('loading')) {
        console.log('⚠️ [APP] Removing loading class from body (was still present)');
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');
      }
    };
    
    // Run immediately
    ensureLoadingRemoved();
    
    // Also run after a short delay as safety backup
    const timeoutId = setTimeout(ensureLoadingRemoved, 100);
    
    // تهيئة مراقب الأداء
    performanceMonitor.logReport();
    
    // فحص التوافق
    compatibilityManager.checkLibraryCompatibility('framer-motion', '12.23.12');
    compatibilityManager.checkLibraryCompatibility('react-hook-form', '7.61.1');
    compatibilityManager.checkLibraryCompatibility('@radix-ui/react-dialog', '1.1.15');
    compatibilityManager.logCompatibilityReport();

    // Preload critical routes on app initialization
    preloadCriticalRoutes();

    // Initialize PWA features
    initializePWA();
    
    console.log('🚀 [APP] Initialization complete');
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter future={{ 
        v7_startTransition: true,
        v7_relativeSplatPath: true 
      }}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <AuthProvider>
                <CompanyContextProvider>
                  <FinanceProvider>
                    <FABProvider>
                      <MobileOptimizationProvider>
                        <PWAInstallPrompt />
                        <CommandPalette />
                        <SimpleToaster />
                        <AppRoutes />
                      </MobileOptimizationProvider>
                    </FABProvider>
                  </FinanceProvider>
                </CompanyContextProvider>
              </AuthProvider>
            </TooltipProvider>
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </QueryClientProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
};

const AppRoutes = () => {
  const location = useLocation();
  const { visitCount } = useStableNavigation();

  console.log('🧭 [ROUTES] Current path:', location.pathname);

  // Preload related routes when location changes
  useEffect(() => {
    console.log('🧭 [ROUTES] Location changed to:', location.pathname);
    preloadRelatedRoutes(location.pathname);
  }, [location.pathname]);

  // Log navigation for debugging (only in development)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`🧭 Navigation: ${location.pathname} (visit #${visitCount})`);
    }
  }, [location.pathname, visitCount]);

  return (
    <Routes key={location.pathname}>
      <Route path="/" element={<Index />} />
      <Route path="/premium-landing" element={<PremiumLanding />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/demo-trial" element={<DemoTrial />} />
      <Route path="/hero-demo" element={
        <Suspense fallback={<PageSkeletonFallback />}>
          <HeroDemo />
        </Suspense>
      } />
      <Route path="/native-demo" element={
        <Suspense fallback={<PageSkeletonFallback />}>
          <NativeMobileDemo />
        </Suspense>
      } />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/quotation-approval" element={
        <Suspense fallback={<PageSkeletonFallback />}>
          <QuotationApproval />
        </Suspense>
      } />
      <Route path="/super-admin" element={
        <Suspense fallback={<PageSkeletonFallback />}>
          <SuperAdmin />
        </Suspense>
      } />
      <Route path="/super-admin/*" element={<SuperAdminLayout />}>
        <Route path="dashboard" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SuperAdminDashboard />
          </Suspense>
        } />
        <Route path="companies" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SuperAdminCompanies />
          </Suspense>
        } />
        <Route path="companies/create" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <CreateCompany />
          </Suspense>
        } />
        <Route path="users" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SuperAdminUsers />
          </Suspense>
        } />
        <Route path="support" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SuperAdminSupport />
          </Suspense>
        } />
        <Route path="payments" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SuperAdminPayments />
          </Suspense>
        } />
        <Route path="reports" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SuperAdminReports />
          </Suspense>
        } />
        <Route path="landing-management" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <LandingManagement />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SuperAdminSettings />
          </Suspense>
        } />
      </Route>
      <Route path="/*" element={<ResponsiveDashboardLayout />}>
        <Route path="dashboard" element={
          <RouteWrapper routeName="Dashboard" fallbackPath="/">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Dashboard />
            </Suspense>
          </RouteWrapper>
        } />
        <Route path="dashboards/integration" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <IntegrationDashboard />
          </Suspense>
        } />
        <Route path="subscription" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SubscriptionPage />
          </Suspense>
        } />
        
        <Route path="backup" element={
          <SuperAdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <BackupPage />
            </Suspense>
          </SuperAdminRoute>
        } />
        <Route path="audit" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <AuditPage />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="profile" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Profile />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Settings />
          </Suspense>
        } />
        <Route path="settings/advanced" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <AdvancedSettings />
          </Suspense>
        } />
        <Route path="audit-logs" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <AuditLogsPage />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="permissions" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <PermissionsManagement />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="settings/electronic-signature" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <ElectronicSignatureSettings />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Fleet />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet/vehicles/:vehicleId" element={
          <AdminRoute>
            <RouteWrapper routeName="Vehicle Details" fallbackPath="/fleet">
              <Suspense fallback={<PageSkeletonFallback />}>
                <VehicleDetailsPage />
              </Suspense>
            </RouteWrapper>
          </AdminRoute>
        } />
        <Route path="fleet/dispatch-permits" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <DispatchPermits />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet/maintenance" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Maintenance />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet/traffic-violations" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <TrafficViolations />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet/traffic-violation-payments" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <TrafficViolationPayments />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet/reports" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <FleetReports />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet/financial-analysis" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <FleetFinancialAnalysis />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet/vehicle-installments" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <VehicleInstallments />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="fleet/reservation-system" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <ReservationSystem />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="contracts" element={
          <RouteWrapper routeName="Contracts" fallbackPath="/dashboard">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Contracts />
            </Suspense>
          </RouteWrapper>
        } />
        <Route path="contracts/:contractNumber" element={
          <RouteWrapper routeName="Contract Details" fallbackPath="/contracts">
            <Suspense fallback={<PageSkeletonFallback />}>
              <ContractDetailsPage />
            </Suspense>
          </RouteWrapper>
        } />
        <Route path="contracts/duplicates" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <DuplicateContractsManager />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="contracts/duplicates/diagnostic" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <DuplicateContractsDiagnostic />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="customers" element={
          <RouteWrapper routeName="Customers" fallbackPath="/dashboard">
            <Suspense fallback={<PageSkeletonFallback />}>
              <Customers />
            </Suspense>
          </RouteWrapper>
        } />
        <Route path="customers/crm" element={
          <RouteWrapper routeName="Customer CRM" fallbackPath="/customers">
            <Suspense fallback={<PageSkeletonFallback />}>
              <CustomerCRM />
            </Suspense>
          </RouteWrapper>
        } />
        <Route path="customers/:customerId" element={
          <RouteWrapper routeName="Customer Details" fallbackPath="/customers">
            <Suspense fallback={<PageSkeletonFallback />}>
              <CustomerDetailsPage />
            </Suspense>
          </RouteWrapper>
        } />
        <Route path="tenants" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Tenants />
          </Suspense>
        } />
        <Route path="properties" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Properties />
          </Suspense>
        } />
        <Route path="properties/add" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <AddProperty />
          </Suspense>
        } />
        <Route path="properties/:id" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <PropertyDetails />
          </Suspense>
        } />
        <Route path="properties/contracts" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <PropertyContracts />
          </Suspense>
        } />
        <Route path="properties/map" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <PropertiesMap />
          </Suspense>
        } />
        <Route path="properties/maintenance" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <PropertyMaintenance />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="owners" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <PropertyOwners />
          </Suspense>
        } />
        <Route path="quotations" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Quotations />
          </Suspense>
        } />
        {/* Legacy route redirects for finance */}
        <Route path="chart-of-accounts" element={<Navigate to="/finance/chart-of-accounts" replace />} />
        <Route path="journal-entries" element={<Navigate to="/finance/journal-entries" replace />} />
        <Route path="payments" element={<Navigate to="/finance/payments" replace />} />
        <Route path="account-mappings" element={<Navigate to="/finance/account-mappings" replace />} />
        <Route path="ledger" element={<Navigate to="/finance/ledger" replace />} />
        <Route path="treasury" element={<Navigate to="/finance/treasury" replace />} />
        <Route path="invoices" element={<Navigate to="/finance/invoices" replace />} />
        <Route path="reports" element={<Navigate to="/finance/reports" replace />} />
        
        <Route path="finance/*" element={
          <RouteWrapper routeName="Finance" fallbackPath="/dashboard">
            <LazyLoadErrorBoundary>
              <Suspense fallback={<PageSkeletonFallback />}>
                <Finance />
              </Suspense>
            </LazyLoadErrorBoundary>
          </RouteWrapper>
        } />
        <Route path="finance/vendor-categories" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <VendorCategories />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="payment-registration" element={
          <RouteWrapper routeName="Payment Registration" fallbackPath="/dashboard">
            <Suspense fallback={<PageSkeletonFallback />}>
              <PaymentRegistration />
            </Suspense>
          </RouteWrapper>
        } />
        <Route path="inventory/*" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Inventory />
          </Suspense>
        } />
        {/* Sales/CRM Routes */}
        <Route path="sales/pipeline" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <SalesPipeline />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="sales/leads" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <SalesLeads />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="sales/opportunities" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <SalesOpportunities />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="sales/quotes" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <SalesQuotes />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="sales/orders" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <SalesOrders />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="sales/analytics" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <SalesAnalytics />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="hr/employees" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Employees />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="hr/user-management" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <UserManagement />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="hr/attendance" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Attendance />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="hr/leave-management" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <LeaveManagement />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="hr/location-settings" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <LocationSettings />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="hr/payroll" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Payroll />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="hr/reports" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <HRReports />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="hr/settings" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <HRSettings />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="reports" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Reports />
          </Suspense>
        } />
        <Route path="reports/hub" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <ReportsHub />
          </Suspense>
        } />
        <Route path="report/:moduleType/:reportId" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <ReportView />
          </Suspense>
        } />
        <Route path="approvals" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <ApprovalSystem />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="support" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Support />
          </Suspense>
        } />
        <Route path="support/ticket/:ticketId" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <SupportTicketDetail />
          </Suspense>
        } />
        
        {/* Legal System Routes */}
        <Route path="legal/advisor" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Legal />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="legal/cases" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <LegalCasesTracking />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="legal/defaulters" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <DefaultersList />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="legal/reports" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <LegalReports />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="legal/invoice-disputes" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <InvoiceDisputes />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="legal/late-fees" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <LateFees />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="legal/whatsapp-reminders" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <WhatsAppReminders />
            </Suspense>
          </AdminRoute>
        } />

        {/* Help & Documentation Routes */}
        <Route path="help" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <HelpHub />
          </Suspense>
        } />
        <Route path="help/user-guide" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <UserGuide />
          </Suspense>
        } />
        <Route path="help/contracts" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <ContractsHelp />
          </Suspense>
        } />
        <Route path="help/dashboard" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <DashboardHelp />
          </Suspense>
        } />
        <Route path="help/customers" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <CustomersHelp />
          </Suspense>
        } />
        <Route path="help/finance" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <FinanceHelp />
          </Suspense>
        } />
        <Route path="help/collections" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <CollectionsHelp />
          </Suspense>
        } />
        <Route path="help/fleet" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <FleetHelp />
          </Suspense>
        } />

        <Route path="performance" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <PerformanceMonitor />
            </Suspense>
          </AdminRoute>
        } />
        
        {/* البحث المتقدم */}
        <Route path="search" element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Search />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* الاستيراد */}
        <Route path="import" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Import />
            </Suspense>
          </AdminRoute>
        } />
        
        {/* ماسح الفواتير الذكي */}
        <Route path="invoice-scanner" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <InvoiceScannerPage />
            </Suspense>
          </AdminRoute>
        } />
        
        {/* نظام تتبع المدفوعات المالية */}
        <Route path="financial-tracking" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <FinancialTracking />
          </Suspense>
        } />
        
        {/* مزامنة المدفوعات مع دفتر الأستاذ */}
        <Route path="sync-payments-ledger" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <SyncPaymentsToLedger />
            </Suspense>
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
        <Route path="customers" element={
          <Suspense fallback={<PageSkeletonFallback />}>
            <Customers />
          </Suspense>
        } />
        <Route path="tenants" element={<Tenants />} />
        <Route path="properties" element={<Properties />} />
        <Route path="properties/add" element={<AddProperty />} />
        <Route path="properties/:id" element={<PropertyDetails />} />
        <Route path="properties/contracts" element={<PropertyContracts />} />
        <Route path="owners" element={<PropertyOwners />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="settings/electronic-signature" element={
          <AdminRoute>
            <ElectronicSignatureSettings />
          </AdminRoute>
        } />
        {/* Legacy route redirects for finance in company browser */}
        <Route path="chart-of-accounts" element={<Navigate to="/browse-company/finance/chart-of-accounts" replace />} />
        <Route path="journal-entries" element={<Navigate to="/browse-company/finance/journal-entries" replace />} />
        <Route path="payments" element={<Navigate to="/browse-company/finance/payments" replace />} />
        <Route path="account-mappings" element={<Navigate to="/browse-company/finance/account-mappings" replace />} />

        <Route path="finance/*" element={<Finance />} />
        <Route path="finance/vendor-categories" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <VendorCategories />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="finance/ar-aging" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <ARAgingReport />
            </Suspense>
          </AdminRoute>
        } />
        <Route path="finance/payment-tracking" element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <PaymentTracking />
            </Suspense>
          </AdminRoute>
        } />
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
        <Route path="report/:moduleType/:reportId" element={<ReportView />} />
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
  );
};

export default App;
