import { lazy } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Lazy-loaded route components for code splitting
 * This reduces the initial bundle size and improves performance
 */

// Fallback component for lazy loading
export const LazyLoadFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
    <span className="mr-3">جاري التحميل...</span>
  </div>
);

// ==================== Core Pages ====================
export const LazyDashboard = lazy(() => import('@/pages/Dashboard'));
export const LazyProfile = lazy(() => import('@/pages/Profile'));
export const LazySettings = lazy(() => import('@/pages/Settings'));

// ==================== Finance Pages ====================
export const LazyFinance = lazy(() => import('@/pages/Finance'));
export const LazyFinancialCalculator = lazy(() => import('@/pages/finance/Calculator'));

// ==================== Legal Pages ====================
export const LazyLegal = lazy(() => 
  import('@/pages/Legal').then(module => ({ default: module.Legal }))
);

// ==================== Fleet Pages ====================
export const LazyFleet = lazy(() => import('@/pages/Fleet'));
export const LazyMaintenance = lazy(() => import('@/pages/fleet/Maintenance'));
export const LazyTrafficViolations = lazy(() => import('@/pages/fleet/TrafficViolationsRedesigned'));
export const LazyTrafficViolationPayments = lazy(() => import('@/pages/fleet/TrafficViolationPayments'));
export const LazyFleetReports = lazy(() => import('@/pages/fleet/FleetReports'));
export const LazyDispatchPermits = lazy(() => import('@/pages/fleet/DispatchPermits'));
export const LazyFleetFinancialAnalysis = lazy(() => import('@/pages/fleet/FleetFinancialAnalysisNew'));
export const LazyVehicleInstallments = lazy(() => import('@/pages/VehicleInstallments'));

// ==================== Contract Pages ====================
export const LazyContracts = lazy(() => import('@/pages/Contracts'));
export const LazyCustomers = lazy(() => import('@/pages/Customers'));
export const LazyQuotations = lazy(() => import('@/pages/Quotations'));

// ==================== HR Pages ====================
export const LazyEmployees = lazy(() => import('@/pages/hr/Employees'));
export const LazyUserManagement = lazy(() => import('@/pages/hr/UserManagement'));
export const LazyAttendance = lazy(() => import('@/pages/hr/Attendance'));
export const LazyLeaveManagement = lazy(() => import('@/pages/hr/LeaveManagement'));
export const LazyPayroll = lazy(() => import('@/pages/hr/Payroll'));
export const LazyHRReports = lazy(() => import('@/pages/hr/Reports'));

// ==================== Property Pages ====================
export const LazyProperties = lazy(() => import('@/pages/Properties'));
export const LazyAddProperty = lazy(() => import('@/pages/AddProperty'));
export const LazyPropertyDetails = lazy(() => import('@/pages/PropertyDetails'));
export const LazyPropertyOwners = lazy(() => import('@/pages/PropertyOwners'));
export const LazyPropertiesMap = lazy(() => import('@/pages/PropertiesMap'));
export const LazyPropertyMaintenance = lazy(() => import('@/pages/properties/PropertyMaintenance'));
export const LazyPropertyContracts = lazy(() => import('@/pages/properties/PropertyContracts'));

// ==================== Reports ====================
export const LazyReports = lazy(() => import('@/pages/Reports'));
export const LazyReportView = lazy(() => import('@/pages/ReportView'));

// ==================== Admin Pages ====================
export const LazyBackupPage = lazy(() => import('@/pages/BackupPage'));
export const LazyAuditDashboard = lazy(() => import('@/pages/audit/AuditDashboard'));
export const LazyApprovalSystem = lazy(() => import('@/pages/ApprovalSystem'));

// ==================== Support ====================
export const LazySupport = lazy(() => import('@/pages/Support'));
export const LazySupportTicketDetail = lazy(() => import('@/pages/SupportTicketDetail'));

// ==================== Super Admin Pages ====================
export const LazySuperAdminDashboard = lazy(() => import('@/pages/super-admin/Dashboard'));
export const LazySuperAdminCompanies = lazy(() => import('@/pages/super-admin/Companies'));
export const LazyCreateCompany = lazy(() => import('@/pages/super-admin/CreateCompany'));
export const LazySuperAdminUsers = lazy(() => import('@/pages/super-admin/Users'));
export const LazySuperAdminSettings = lazy(() => import('@/pages/super-admin/Settings'));
export const LazySuperAdminSupport = lazy(() => import('@/pages/super-admin/Support'));
export const LazySuperAdminPayments = lazy(() => import('@/pages/super-admin/Payments'));
export const LazySuperAdminReports = lazy(() => import('@/pages/super-admin/Reports'));
export const LazyLandingManagement = lazy(() => import('@/pages/super-admin/LandingManagement'));

// ==================== Unified Components (Heavy) ====================

export const LazyEnhancedLegalAIInterface = lazy(() => 
  import('@/components/legal/EnhancedLegalAIInterface_v2').then(module => ({ 
    default: module.EnhancedLegalAIInterface_v2 
  }))
);

export const LazyUnifiedPaymentForm = lazy(() => 
  import('@/components/finance/UnifiedPaymentForm').then(module => ({ 
    default: module.UnifiedPaymentForm 
  }))
);

export const LazySmartPaymentAllocation = lazy(() => 
  import('@/components/finance/SmartPaymentAllocation').then(module => ({ 
    default: module.SmartPaymentAllocation 
  }))
);

/**
 * Route configuration with lazy loading
 * Each route is split into its own chunk for optimal loading
 */
export const lazyRouteConfig = {
  // Core
  dashboard: { component: LazyDashboard, preload: true },
  profile: { component: LazyProfile, preload: false },
  settings: { component: LazySettings, preload: false },
  
  // Finance (Heavy - definitely lazy load)
  finance: { component: LazyFinance, preload: false },
  financialCalculator: { component: LazyFinancialCalculator, preload: false },
  
  // Legal AI (Heavy - lazy load)
  legal: { component: LazyLegal, preload: false },
  
  // Fleet (Medium weight)
  fleet: { component: LazyFleet, preload: false },
  maintenance: { component: LazyMaintenance, preload: false },
  trafficViolations: { component: LazyTrafficViolations, preload: false },
  
  // Contracts
  contracts: { component: LazyContracts, preload: false },
  customers: { component: LazyCustomers, preload: false },
  quotations: { component: LazyQuotations, preload: false },
  
  // HR
  employees: { component: LazyEmployees, preload: false },
  userManagement: { component: LazyUserManagement, preload: false },
  
  // Properties
  properties: { component: LazyProperties, preload: false },
  
  // Reports
  reports: { component: LazyReports, preload: false },
  
  // Admin
  backup: { component: LazyBackupPage, preload: false },
  audit: { component: LazyAuditDashboard, preload: false },
  
  // Support
  support: { component: LazySupport, preload: false },
  
  // Super Admin
  superAdminDashboard: { component: LazySuperAdminDashboard, preload: false },
  superAdminCompanies: { component: LazySuperAdminCompanies, preload: false },
};

/**
 * Preload critical routes on app initialization
 * This improves perceived performance for frequently accessed routes
 */
export const preloadCriticalRoutes = () => {
  // Preload dashboard immediately after app load
  setTimeout(() => {
    import('@/pages/Dashboard');
  }, 100);
  
  // Preload finance after 2 seconds
  setTimeout(() => {
    import('@/pages/Finance');
  }, 2000);
  
  // Preload contracts after 3 seconds
  setTimeout(() => {
    import('@/pages/Contracts');
  }, 3000);
};

/**
 * Preload route on hover (for navigation links)
 */
export const preloadRouteOnHover = (routeName: keyof typeof lazyRouteConfig) => {
  const route = lazyRouteConfig[routeName];
  if (route) {
    route.component.preload?.();
  }
};
