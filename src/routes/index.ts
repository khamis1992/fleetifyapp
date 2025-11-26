/**
 * Route Registry System
 * Centralized route definitions to reduce App.tsx complexity and improve maintainability
 */

import { lazy } from 'react';
import type { RouteConfig, RouteGroup, LazyRouteComponent } from './types';

// === Lazy loaded components with proper typing ===

// Critical pages - loaded immediately
import Index from '@/pages/Index';
import PremiumLanding from '@/pages/PremiumLanding';
import Auth from '@/pages/Auth';
import ResetPassword from '@/pages/ResetPassword';
import DemoTrial from '@/pages/DemoTrial';
import NotFound from '@/pages/NotFound';

// Demo pages - lazy loaded
const HeroDemo = lazy(() => import('@/pages/HeroDemo'));
const NativeMobileDemo = lazy(() => import('@/pages/NativeMobileDemo'));

// Core application pages - lazy loaded
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DashboardV2 = lazy(() => import('@/pages/dashboards/DashboardV2'));
const Finance = lazy(() => import('@/pages/Finance'));
const Customers = lazy(() => import('@/pages/Customers'));
const CustomerDetailsPage = lazy(() => import('@/components/customers/CustomerDetailsPage'));
const CustomerCRM = lazy(() => import('@/pages/customers/CustomerCRM'));
const Contracts = lazy(() => import('@/pages/Contracts'));
const ContractDetailsPage = lazy(() => import('@/components/contracts/ContractDetailsPage'));
const Fleet = lazy(() => import('@/pages/Fleet'));
const VehicleDetailsPage = lazy(() => import('@/components/fleet/VehicleDetailsPage'));
const Reports = lazy(() => import('@/pages/Reports'));
const ReportsHub = lazy(() => import('@/pages/reports/ReportsHub'));
const ReportView = lazy(() => import('@/pages/ReportView'));
const Search = lazy(() => import('@/pages/Search'));
const Import = lazy(() => import('@/pages/Import'));

// Financial management pages
const InvoiceScannerPage = lazy(() => import('@/pages/InvoiceScannerPage'));
const FinancialTracking = lazy(() => import('@/pages/FinancialTracking'));
const SyncPaymentsToLedger = lazy(() => import('@/pages/SyncPaymentsToLedger'));
const PaymentRegistration = lazy(() => import('@/pages/PaymentRegistration'));
const QuickPayment = lazy(() => import('@/pages/payments/QuickPayment'));

// Super Admin pages
const SuperAdmin = lazy(() => import('@/pages/SuperAdmin'));
const SuperAdminDashboard = lazy(() => import('@/pages/super-admin/Dashboard'));
const SuperAdminCompanies = lazy(() => import('@/pages/super-admin/Companies'));
const CreateCompany = lazy(() => import('@/pages/super-admin/CreateCompany'));
const SuperAdminUsers = lazy(() => import('@/pages/super-admin/Users'));
const SuperAdminSettings = lazy(() => import('@/pages/super-admin/Settings'));
const SuperAdminSupport = lazy(() => import('@/pages/super-admin/Support'));
const SuperAdminPayments = lazy(() => import('@/pages/super-admin/Payments'));
const SuperAdminReports = lazy(() => import('@/pages/super-admin/Reports'));
const LandingManagement = lazy(() => import('@/pages/super-admin/LandingManagement'));

// Settings and Profile pages
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const AdvancedSettings = lazy(() => import('@/pages/AdvancedSettings'));
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'));
const PermissionsManagement = lazy(() => import('@/pages/PermissionsManagement'));
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage'));
const ElectronicSignatureSettings = lazy(() => import('@/pages/settings/ElectronicSignatureSettings'));

// Property Management pages
const Properties = lazy(() => import('@/pages/Properties'));
const AddProperty = lazy(() => import('@/pages/AddProperty'));
const PropertyDetails = lazy(() => import('@/pages/PropertyDetails'));
const PropertyOwners = lazy(() => import('@/pages/PropertyOwners'));
const PropertiesMap = lazy(() => import('@/pages/PropertiesMap'));
const PropertyMaintenance = lazy(() => import('@/pages/properties/PropertyMaintenance'));
const PropertyContracts = lazy(() => import('@/pages/properties/PropertyContracts'));

// Fleet Management pages
const Maintenance = lazy(() => import('@/pages/fleet/Maintenance'));
const TrafficViolations = lazy(() => import('@/pages/fleet/TrafficViolationsRedesigned'));
const TrafficViolationPayments = lazy(() => import('@/pages/fleet/TrafficViolationPayments'));
const FleetReports = lazy(() => import('@/pages/fleet/FleetReports'));
const DispatchPermits = lazy(() => import('@/pages/fleet/DispatchPermits'));
const FleetFinancialAnalysis = lazy(() => import('@/pages/fleet/FleetFinancialAnalysisNew'));
const ReservationSystem = lazy(() => import('@/pages/fleet/ReservationSystem'));
const VehicleInstallments = lazy(() => import('@/pages/VehicleInstallments'));

// HR Management pages
const Employees = lazy(() => import('@/pages/hr/Employees'));
const UserManagement = lazy(() => import('@/pages/hr/UserManagement'));
const Attendance = lazy(() => import('@/pages/hr/Attendance'));
const LeaveManagement = lazy(() => import('@/pages/hr/LeaveManagement'));
const LocationSettings = lazy(() => import('@/pages/hr/LocationSettings'));
const Payroll = lazy(() => import('@/pages/hr/Payroll'));
const HRReports = lazy(() => import('@/pages/hr/Reports'));
const HRSettings = lazy(() => import('@/pages/hr/Settings'));

// Inventory Management
const Inventory = lazy(() => import('@/pages/Inventory'));

// Integration Dashboard
const IntegrationDashboard = lazy(() => import('@/pages/dashboards/IntegrationDashboard'));

// Finance sub-pages
const VendorCategories = lazy(() => import('@/pages/finance/VendorCategories'));
const ARAgingReport = lazy(() => import('@/pages/finance/ARAgingReport'));
const PaymentTracking = lazy(() => import('@/pages/finance/PaymentTracking'));
const Vendors = lazy(() => import('@/pages/finance/Vendors'));
const PurchaseOrders = lazy(() => import('@/pages/finance/PurchaseOrders'));

// Sales/CRM Management pages
const SalesPipeline = lazy(() => import('@/pages/sales/SalesPipeline'));
const SalesLeads = lazy(() => import('@/pages/sales/SalesLeads'));
const SalesOpportunities = lazy(() => import('@/pages/sales/SalesOpportunities'));
const SalesQuotes = lazy(() => import('@/pages/sales/SalesQuotes'));
const SalesOrders = lazy(() => import('@/pages/sales/SalesOrders'));
const SalesAnalytics = lazy(() => import('@/pages/sales/SalesAnalytics'));

// Other pages
const Quotations = lazy(() => import('@/pages/Quotations'));
const QuotationApproval = lazy(() => import('@/pages/QuotationApproval'));
const BackupPage = lazy(() => import('@/pages/BackupPage'));
const AuditDashboard = lazy(() => import('@/pages/audit/AuditDashboard'));
const ApprovalSystem = lazy(() => import('@/pages/ApprovalSystem'));
const Support = lazy(() => import('@/pages/Support'));
const SupportTicketDetail = lazy(() => import('@/pages/SupportTicketDetail'));
const Tenants = lazy(() => import('@/pages/Tenants'));
const PerformanceDashboard = lazy(() => import('@/pages/PerformanceDashboard'));

// Legal pages
const Legal = lazy(() => import('@/pages/Legal'));
const LegalCasesTracking = lazy(() => import('@/pages/legal/LegalCasesTracking'));
const LegalCasesTrackingV2 = lazy(() => import('@/pages/legal/LegalCasesTrackingV2'));
const DefaultersList = lazy(() => import('@/pages/legal/DefaultersList'));
const LegalReports = lazy(() => import('@/pages/legal/LegalReports'));
const LateFees = lazy(() => import('@/pages/legal/LateFees'));
const WhatsAppReminders = lazy(() => import('@/pages/legal/WhatsAppReminders'));
const InvoiceDisputes = lazy(() => import('@/pages/legal/InvoiceDisputes'));

// Contract management
const DuplicateContractsManager = lazy(() => import('@/components/contracts/DuplicateContractsManager'));
const DuplicateContractsDiagnostic = lazy(() => import('@/components/contracts/DuplicateContractsDiagnostic'));

// Fix pages
const FixVehicleData = lazy(() => import('@/pages/FixVehicleData'));

// Help & Documentation pages
const HelpHub = lazy(() => import('@/pages/help/HelpHub'));

// Performance monitoring
const PerformanceMonitor = lazy(() => import('@/components/performance').then(m => ({ default: m.PerformanceMonitor })));

// === Route Configuration ===

const routeConfigs: RouteConfig[] = [
  // === Public Routes ===
  {
    path: '/',
    component: Index,
    lazy: false,
    exact: true,
    title: 'Home',
    description: 'Landing page',
    group: 'public',
    priority: 1,
  },
  {
    path: '/premium',
    component: PremiumLanding,
    lazy: false,
    exact: true,
    title: 'Premium',
    description: 'Premium features landing',
    group: 'public',
    priority: 2,
  },
  {
    path: '/auth',
    component: Auth,
    lazy: false,
    exact: true,
    title: 'Authentication',
    description: 'Login and registration',
    group: 'public',
    priority: 3,
  },
  {
    path: '/reset-password',
    component: ResetPassword,
    lazy: false,
    exact: true,
    title: 'Reset Password',
    description: 'Password reset',
    group: 'public',
    priority: 4,
  },
  {
    path: '/demo-trial',
    component: DemoTrial,
    lazy: false,
    exact: true,
    title: 'Demo Trial',
    description: 'Demo and trial signup',
    group: 'public',
    priority: 5,
  },

  // === Demo Routes ===
  {
    path: '/hero-demo',
    component: HeroDemo,
    lazy: true,
    exact: true,
    title: 'Hero Demo',
    description: 'Hero section demo',
    group: 'demo',
    priority: 6,
  },
  {
    path: '/mobile-demo',
    component: NativeMobileDemo,
    lazy: true,
    exact: true,
    title: 'Mobile Demo',
    description: 'Mobile app demo',
    group: 'demo',
    priority: 7,
  },

  // === Main Application Routes ===
  {
    path: '/dashboard',
    component: Dashboard,
    lazy: true,
    exact: true,
    title: 'Dashboard',
    description: 'Main dashboard',
    group: 'dashboard',
    priority: 10,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/dashboard-v2',
    component: DashboardV2,
    lazy: true,
    exact: true,
    title: 'Dashboard V2',
    description: 'New professional dashboard design',
    group: 'dashboard',
    priority: 11,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance',
    component: Finance,
    lazy: true,
    exact: true,
    title: 'Finance',
    description: 'Financial management',
    group: 'finance',
    priority: 11,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/customers',
    component: Customers,
    lazy: true,
    exact: true,
    title: 'Customers',
    description: 'Customer management',
    group: 'customers',
    priority: 12,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/customers/:customerId',
    component: CustomerDetailsPage,
    lazy: true,
    exact: true,
    title: 'Customer Details',
    description: 'Customer details page',
    group: 'customers',
    priority: 13,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/customers/crm',
    component: CustomerCRM,
    lazy: true,
    exact: true,
    title: 'Customer CRM',
    description: 'Customer relationship management',
    group: 'customers',
    priority: 14,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/contracts',
    component: Contracts,
    lazy: true,
    exact: true,
    title: 'Contracts',
    description: 'Contract management',
    group: 'contracts',
    priority: 15,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/contracts/:contractNumber',
    component: ContractDetailsPage,
    lazy: true,
    exact: true,
    title: 'Contract Details',
    description: 'Contract details page',
    group: 'contracts',
    priority: 16,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/fleet',
    component: Fleet,
    lazy: true,
    exact: true,
    title: 'Fleet',
    description: 'Fleet management',
    group: 'fleet',
    priority: 17,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/fleet/vehicles/:vehicleId',
    component: VehicleDetailsPage,
    lazy: true,
    exact: true,
    title: 'Vehicle Details',
    description: 'Vehicle details page',
    group: 'fleet',
    priority: 18,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/reports',
    component: Reports,
    lazy: true,
    exact: true,
    title: 'Reports',
    description: 'Reports and analytics',
    group: 'reports',
    priority: 19,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/reports/hub',
    component: ReportsHub,
    lazy: true,
    exact: true,
    title: 'Reports Hub',
    description: 'Reports hub',
    group: 'reports',
    priority: 20,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/reports/:id',
    component: ReportView,
    lazy: true,
    exact: true,
    title: 'Report View',
    description: 'Report view',
    group: 'reports',
    priority: 21,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/search',
    component: Search,
    lazy: true,
    exact: true,
    title: 'Search',
    description: 'Global search',
    group: 'utilities',
    priority: 22,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/import',
    component: Import,
    lazy: true,
    exact: true,
    title: 'Import',
    description: 'Data import',
    group: 'utilities',
    priority: 23,
    protected: true,
    layout: 'dashboard',
  },

  // === Financial Management Routes ===
  {
    path: '/finance/invoice-scanner',
    component: InvoiceScannerPage,
    lazy: true,
    exact: true,
    title: 'Invoice Scanner',
    description: 'Invoice OCR scanner',
    group: 'finance',
    priority: 24,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance/tracking',
    component: FinancialTracking,
    lazy: true,
    exact: true,
    title: 'Financial Tracking',
    description: 'Financial tracking',
    group: 'finance',
    priority: 25,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance/sync-payments',
    component: SyncPaymentsToLedger,
    lazy: true,
    exact: true,
    title: 'Sync Payments',
    description: 'Sync payments to ledger',
    group: 'finance',
    priority: 26,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance/payments/register',
    component: PaymentRegistration,
    lazy: true,
    exact: true,
    title: 'Payment Registration',
    description: 'Register payments',
    group: 'finance',
    priority: 27,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance/payments/quick',
    component: QuickPayment,
    lazy: true,
    exact: true,
    title: 'Quick Payment',
    description: 'Quick payment processing',
    group: 'finance',
    priority: 28,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance/vendors/categories',
    component: VendorCategories,
    lazy: true,
    exact: true,
    title: 'Vendor Categories',
    description: 'Vendor categories',
    group: 'finance',
    priority: 29,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance/reports/ar-aging',
    component: ARAgingReport,
    lazy: true,
    exact: true,
    title: 'AR Aging Report',
    description: 'Accounts receivable aging',
    group: 'finance',
    priority: 30,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance/payments/tracking',
    component: PaymentTracking,
    lazy: true,
    exact: true,
    title: 'Payment Tracking',
    description: 'Payment tracking',
    group: 'finance',
    priority: 31,
    protected: true,
    layout: 'dashboard',
  },

  // === Super Admin Routes ===
  {
    path: '/admin',
    component: SuperAdmin,
    lazy: true,
    exact: true,
    title: 'Super Admin',
    description: 'Super admin dashboard',
    group: 'admin',
    priority: 40,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/dashboard',
    component: SuperAdminDashboard,
    lazy: true,
    exact: true,
    title: 'Admin Dashboard',
    description: 'Admin dashboard',
    group: 'admin',
    priority: 41,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/companies',
    component: SuperAdminCompanies,
    lazy: true,
    exact: true,
    title: 'Companies',
    description: 'Company management',
    group: 'admin',
    priority: 42,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/companies/create',
    component: CreateCompany,
    lazy: true,
    exact: true,
    title: 'Create Company',
    description: 'Create new company',
    group: 'admin',
    priority: 43,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/users',
    component: SuperAdminUsers,
    lazy: true,
    exact: true,
    title: 'Users',
    description: 'User management',
    group: 'admin',
    priority: 44,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/settings',
    component: SuperAdminSettings,
    lazy: true,
    exact: true,
    title: 'Admin Settings',
    description: 'Admin settings',
    group: 'admin',
    priority: 45,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/support',
    component: SuperAdminSupport,
    lazy: true,
    exact: true,
    title: 'Support',
    description: 'Customer support',
    group: 'admin',
    priority: 46,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/payments',
    component: SuperAdminPayments,
    lazy: true,
    exact: true,
    title: 'Payment Admin',
    description: 'Payment administration',
    group: 'admin',
    priority: 47,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/reports',
    component: SuperAdminReports,
    lazy: true,
    exact: true,
    title: 'Admin Reports',
    description: 'Administrative reports',
    group: 'admin',
    priority: 48,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },
  {
    path: '/admin/landing',
    component: LandingManagement,
    lazy: true,
    exact: true,
    title: 'Landing Management',
    description: 'Landing page management',
    group: 'admin',
    priority: 49,
    protected: true,
    layout: 'admin',
    requiredRole: 'super_admin',
  },

  // === Settings and Profile Routes ===
  {
    path: '/profile',
    component: Profile,
    lazy: true,
    exact: true,
    title: 'Profile',
    description: 'User profile',
    group: 'settings',
    priority: 50,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/settings',
    component: Settings,
    lazy: true,
    exact: true,
    title: 'Settings',
    description: 'Application settings',
    group: 'settings',
    priority: 51,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/settings/advanced',
    component: AdvancedSettings,
    lazy: true,
    exact: true,
    title: 'Advanced Settings',
    description: 'Advanced settings',
    group: 'settings',
    priority: 52,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/settings/audit-logs',
    component: AuditLogsPage,
    lazy: true,
    exact: true,
    title: 'Audit Logs',
    description: 'Audit logs',
    group: 'settings',
    priority: 53,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/settings/permissions',
    component: PermissionsManagement,
    lazy: true,
    exact: true,
    title: 'Permissions',
    description: 'Permission management',
    group: 'settings',
    priority: 54,
    protected: true,
    layout: 'dashboard',
    requiredRole: 'admin',
  },
  {
    path: '/settings/subscription',
    component: SubscriptionPage,
    lazy: true,
    exact: true,
    title: 'Subscription',
    description: 'Subscription management',
    group: 'settings',
    priority: 55,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/settings/e-signature',
    component: ElectronicSignatureSettings,
    lazy: true,
    exact: true,
    title: 'E-Signature Settings',
    description: 'Electronic signature settings',
    group: 'settings',
    priority: 56,
    protected: true,
    layout: 'dashboard',
  },

  // === Property Management Routes ===
  {
    path: '/properties',
    component: Properties,
    lazy: true,
    exact: true,
    title: 'Properties',
    description: 'Property management',
    group: 'properties',
    priority: 60,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/properties/add',
    component: AddProperty,
    lazy: true,
    exact: true,
    title: 'Add Property',
    description: 'Add new property',
    group: 'properties',
    priority: 61,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/properties/:id',
    component: PropertyDetails,
    lazy: true,
    exact: true,
    title: 'Property Details',
    description: 'Property details',
    group: 'properties',
    priority: 62,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/properties/owners',
    component: PropertyOwners,
    lazy: true,
    exact: true,
    title: 'Property Owners',
    description: 'Property owners',
    group: 'properties',
    priority: 63,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/properties/map',
    component: PropertiesMap,
    lazy: true,
    exact: true,
    title: 'Properties Map',
    description: 'Properties on map',
    group: 'properties',
    priority: 64,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/properties/maintenance',
    component: PropertyMaintenance,
    lazy: true,
    exact: true,
    title: 'Property Maintenance',
    description: 'Property maintenance',
    group: 'properties',
    priority: 65,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/properties/contracts',
    component: PropertyContracts,
    lazy: true,
    exact: true,
    title: 'Property Contracts',
    description: 'Property contracts',
    group: 'properties',
    priority: 66,
    protected: true,
    layout: 'dashboard',
  },

  // === Fleet Management Sub-routes ===
  {
    path: '/fleet/maintenance',
    component: Maintenance,
    lazy: true,
    exact: true,
    title: 'Maintenance',
    description: 'Vehicle maintenance',
    group: 'fleet',
    priority: 70,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/fleet/violations',
    component: TrafficViolations,
    lazy: true,
    exact: true,
    title: 'Traffic Violations',
    description: 'Traffic violations',
    group: 'fleet',
    priority: 71,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/fleet/violations/payments',
    component: TrafficViolationPayments,
    lazy: true,
    exact: true,
    title: 'Violation Payments',
    description: 'Traffic violation payments',
    group: 'fleet',
    priority: 72,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/fleet/reports',
    component: FleetReports,
    lazy: true,
    exact: true,
    title: 'Fleet Reports',
    description: 'Fleet reports',
    group: 'fleet',
    priority: 73,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/fleet/dispatch-permits',
    component: DispatchPermits,
    lazy: true,
    exact: true,
    title: 'Dispatch Permits',
    description: 'Vehicle dispatch permits',
    group: 'fleet',
    priority: 74,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/fleet/financial-analysis',
    component: FleetFinancialAnalysis,
    lazy: true,
    exact: true,
    title: 'Fleet Financial Analysis',
    description: 'Fleet financial analysis',
    group: 'fleet',
    priority: 75,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/fleet/reservations',
    component: ReservationSystem,
    lazy: true,
    exact: true,
    title: 'Reservations',
    description: 'Vehicle reservations',
    group: 'fleet',
    priority: 76,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/vehicle-installments',
    component: VehicleInstallments,
    lazy: true,
    exact: true,
    title: 'Vehicle Installments',
    description: 'Vehicle installments',
    group: 'fleet',
    priority: 77,
    protected: true,
    layout: 'dashboard',
  },

  // === HR Management Routes ===
  {
    path: '/hr/employees',
    component: Employees,
    lazy: true,
    exact: true,
    title: 'Employees',
    description: 'Employee management',
    group: 'hr',
    priority: 80,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/hr/users',
    component: UserManagement,
    lazy: true,
    exact: true,
    title: 'User Management',
    description: 'User management',
    group: 'hr',
    priority: 81,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/hr/attendance',
    component: Attendance,
    lazy: true,
    exact: true,
    title: 'Attendance',
    description: 'Employee attendance',
    group: 'hr',
    priority: 82,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/hr/leave',
    component: LeaveManagement,
    lazy: true,
    exact: true,
    title: 'Leave Management',
    description: 'Leave management',
    group: 'hr',
    priority: 83,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/hr/locations',
    component: LocationSettings,
    lazy: true,
    exact: true,
    title: 'Location Settings',
    description: 'Location settings',
    group: 'hr',
    priority: 84,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/hr/payroll',
    component: Payroll,
    lazy: true,
    exact: true,
    title: 'Payroll',
    description: 'Payroll management',
    group: 'hr',
    priority: 85,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/hr/reports',
    component: HRReports,
    lazy: true,
    exact: true,
    title: 'HR Reports',
    description: 'HR reports',
    group: 'hr',
    priority: 86,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/hr/settings',
    component: HRSettings,
    lazy: true,
    exact: true,
    title: 'HR Settings',
    description: 'HR settings',
    group: 'hr',
    priority: 87,
    protected: true,
    layout: 'dashboard',
  },

  // === Finance Sub-routes ===
  {
    path: '/finance/vendors',
    component: Vendors,
    lazy: true,
    exact: true,
    title: 'Vendors',
    description: 'Vendor management',
    group: 'finance',
    priority: 88,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/finance/purchase-orders',
    component: PurchaseOrders,
    lazy: true,
    exact: true,
    title: 'Purchase Orders',
    description: 'Purchase order management',
    group: 'finance',
    priority: 89,
    protected: true,
    layout: 'dashboard',
  },

  // === Inventory Management ===
  {
    path: '/inventory',
    component: Inventory,
    lazy: true,
    exact: true,
    title: 'Inventory',
    description: 'Inventory management',
    group: 'inventory',
    priority: 90,
    protected: true,
    layout: 'dashboard',
  },

  // === Integration Dashboard ===
  {
    path: '/dashboards/integration',
    component: IntegrationDashboard,
    lazy: true,
    exact: true,
    title: 'Integration Dashboard',
    description: 'Integration monitoring',
    group: 'dashboards',
    priority: 91,
    protected: true,
    layout: 'dashboard',
  },

  // === Sales/CRM Routes ===
  {
    path: '/sales/pipeline',
    component: SalesPipeline,
    lazy: true,
    exact: true,
    title: 'Sales Pipeline',
    description: 'Sales pipeline management',
    group: 'sales',
    priority: 100,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/sales/leads',
    component: SalesLeads,
    lazy: true,
    exact: true,
    title: 'Sales Leads',
    description: 'Sales leads management',
    group: 'sales',
    priority: 101,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/sales/opportunities',
    component: SalesOpportunities,
    lazy: true,
    exact: true,
    title: 'Sales Opportunities',
    description: 'Sales opportunities',
    group: 'sales',
    priority: 102,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/sales/quotes',
    component: SalesQuotes,
    lazy: true,
    exact: true,
    title: 'Sales Quotes',
    description: 'Sales quotes',
    group: 'sales',
    priority: 103,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/sales/orders',
    component: SalesOrders,
    lazy: true,
    exact: true,
    title: 'Sales Orders',
    description: 'Sales orders',
    group: 'sales',
    priority: 104,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/sales/analytics',
    component: SalesAnalytics,
    lazy: true,
    exact: true,
    title: 'Sales Analytics',
    description: 'Sales analytics',
    group: 'sales',
    priority: 105,
    protected: true,
    layout: 'dashboard',
  },

  // === Quotations ===
  {
    path: '/quotations',
    component: Quotations,
    lazy: true,
    exact: true,
    title: 'Quotations',
    description: 'Quotation management',
    group: 'sales',
    priority: 106,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/quotations/approval',
    component: QuotationApproval,
    lazy: true,
    exact: true,
    title: 'Quotation Approval',
    description: 'Quotation approval',
    group: 'sales',
    priority: 107,
    protected: true,
    layout: 'dashboard',
  },

  // === Other Utility Routes ===
  {
    path: '/backup',
    component: BackupPage,
    lazy: true,
    exact: true,
    title: 'Backup',
    description: 'Data backup',
    group: 'utilities',
    priority: 110,
    protected: true,
    layout: 'dashboard',
    requiredRole: 'admin',
  },
  {
    path: '/audit',
    component: AuditDashboard,
    lazy: true,
    exact: true,
    title: 'Audit Dashboard',
    description: 'Audit dashboard',
    group: 'utilities',
    priority: 111,
    protected: true,
    layout: 'dashboard',
    requiredRole: 'admin',
  },
  {
    path: '/approvals',
    component: ApprovalSystem,
    lazy: true,
    exact: true,
    title: 'Approvals',
    description: 'Approval system',
    group: 'utilities',
    priority: 112,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/support',
    component: Support,
    lazy: true,
    exact: true,
    title: 'Support',
    description: 'Customer support',
    group: 'utilities',
    priority: 113,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/support/tickets/:id',
    component: SupportTicketDetail,
    lazy: true,
    exact: true,
    title: 'Support Ticket',
    description: 'Support ticket details',
    group: 'utilities',
    priority: 114,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/tenants',
    component: Tenants,
    lazy: true,
    exact: true,
    title: 'Tenants',
    description: 'Tenant management',
    group: 'utilities',
    priority: 115,
    protected: true,
    layout: 'dashboard',
    requiredRole: 'admin',
  },
  {
    path: '/performance',
    component: PerformanceDashboard,
    lazy: true,
    exact: true,
    title: 'Performance',
    description: 'Performance dashboard',
    group: 'utilities',
    priority: 116,
    protected: true,
    layout: 'dashboard',
  },

  // === Legal Routes ===
  {
    path: '/legal',
    component: Legal,
    lazy: true,
    exact: true,
    title: 'Legal',
    description: 'Legal management',
    group: 'legal',
    priority: 120,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/legal/advisor',
    component: Legal,
    lazy: true,
    exact: true,
    title: 'Legal Advisor',
    description: 'AI-powered legal advisor',
    group: 'legal',
    priority: 119,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/legal/cases',
    component: LegalCasesTracking,
    lazy: true,
    exact: true,
    title: 'Legal Cases',
    description: 'Legal cases tracking',
    group: 'legal',
    priority: 121,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/legal/cases-v2',
    component: LegalCasesTrackingV2,
    lazy: true,
    exact: true,
    title: 'Legal Cases V2',
    description: 'Legal cases tracking v2',
    group: 'legal',
    priority: 122,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/legal/defaulters',
    component: DefaultersList,
    lazy: true,
    exact: true,
    title: 'Defaulters',
    description: 'Defaulters list',
    group: 'legal',
    priority: 123,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/legal/reports',
    component: LegalReports,
    lazy: true,
    exact: true,
    title: 'Legal Reports',
    description: 'Legal reports',
    group: 'legal',
    priority: 124,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/legal/late-fees',
    component: LateFees,
    lazy: true,
    exact: true,
    title: 'Late Fees',
    description: 'Late fees management',
    group: 'legal',
    priority: 125,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/legal/whatsapp-reminders',
    component: WhatsAppReminders,
    lazy: true,
    exact: true,
    title: 'WhatsApp Reminders',
    description: 'WhatsApp reminders',
    group: 'legal',
    priority: 126,
    protected: true,
    layout: 'dashboard',
  },
  {
    path: '/legal/disputes',
    component: InvoiceDisputes,
    lazy: true,
    exact: true,
    title: 'Invoice Disputes',
    description: 'Invoice disputes',
    group: 'legal',
    priority: 127,
    protected: true,
    layout: 'dashboard',
  },

  // === Contract Management ===
  {
    path: '/contracts/duplicates',
    component: DuplicateContractsManager,
    lazy: true,
    exact: true,
    title: 'Duplicate Contracts',
    description: 'Duplicate contracts management',
    group: 'contracts',
    priority: 130,
    protected: true,
    layout: 'dashboard',
    requiredRole: 'admin',
  },
  {
    path: '/contracts/diagnostics',
    component: DuplicateContractsDiagnostic,
    lazy: true,
    exact: true,
    title: 'Contract Diagnostics',
    description: 'Contract diagnostics',
    group: 'contracts',
    priority: 131,
    protected: true,
    layout: 'dashboard',
    requiredRole: 'admin',
  },

  // === Fix and Diagnostic Routes ===
  {
    path: '/fix/vehicle-data',
    component: FixVehicleData,
    lazy: true,
    exact: true,
    title: 'Fix Vehicle Data',
    description: 'Vehicle data fix utility',
    group: 'utilities',
    priority: 140,
    protected: true,
    layout: 'dashboard',
    requiredRole: 'admin',
  },

  // === Help & Documentation Routes ===
  {
    path: '/help',
    component: HelpHub,
    lazy: true,
    exact: true,
    title: 'Help Hub',
    description: 'Help center',
    group: 'help',
    priority: 150,
    protected: true,
    layout: 'dashboard',
  },

  // === Performance Monitoring ===
  {
    path: '/performance/monitor',
    component: PerformanceMonitor,
    lazy: true,
    exact: true,
    title: 'Performance Monitor',
    description: 'Performance monitoring',
    group: 'utilities',
    priority: 160,
    protected: true,
    layout: 'dashboard',
    requiredRole: 'admin',
  },

  // === 404 Not Found ===
  {
    path: '*',
    component: NotFound,
    lazy: false,
    exact: false,
    title: 'Not Found',
    description: '404 page',
    group: 'public',
    priority: 999,
  },
];

// === Route Groups Configuration ===

export const routeGroups: RouteGroup[] = [
  {
    id: 'public',
    name: 'Public',
    description: 'Publicly accessible routes',
    layout: 'none',
    priority: 1,
  },
  {
    id: 'demo',
    name: 'Demo',
    description: 'Demo and trial pages',
    layout: 'none',
    priority: 2,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main application dashboard routes',
    layout: 'dashboard',
    priority: 10,
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Financial management routes',
    layout: 'dashboard',
    priority: 11,
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Customer management routes',
    layout: 'dashboard',
    priority: 12,
  },
  {
    id: 'contracts',
    name: 'Contracts',
    description: 'Contract management routes',
    layout: 'dashboard',
    priority: 13,
  },
  {
    id: 'fleet',
    name: 'Fleet',
    description: 'Fleet management routes',
    layout: 'dashboard',
    priority: 14,
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Reports and analytics routes',
    layout: 'dashboard',
    priority: 15,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Administrative routes',
    layout: 'admin',
    priority: 20,
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Settings and configuration routes',
    layout: 'dashboard',
    priority: 21,
  },
  {
    id: 'properties',
    name: 'Properties',
    description: 'Property management routes',
    layout: 'dashboard',
    priority: 22,
  },
  {
    id: 'hr',
    name: 'HR',
    description: 'Human resources routes',
    layout: 'dashboard',
    priority: 23,
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Sales and CRM routes',
    layout: 'dashboard',
    priority: 24,
  },
  {
    id: 'legal',
    name: 'Legal',
    description: 'Legal management routes',
    layout: 'dashboard',
    priority: 25,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Inventory management routes',
    layout: 'dashboard',
    priority: 26,
  },
  {
    id: 'utilities',
    name: 'Utilities',
    description: 'Utility and tool routes',
    layout: 'dashboard',
    priority: 27,
  },
  {
    id: 'help',
    name: 'Help',
    description: 'Help and documentation routes',
    layout: 'dashboard',
    priority: 28,
  },
  {
    id: 'dashboards',
    name: 'Dashboards',
    description: 'Specialized dashboard routes',
    layout: 'dashboard',
    priority: 29,
  },
];

// === Exports ===

export { routeConfigs };
export default routeConfigs;