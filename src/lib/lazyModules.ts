/**
 * Lazy loading system for FleetifyApp modules
 * Optimizes bundle size by loading modules on demand
 */

import { lazy, ComponentType } from 'react';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2 text-muted-foreground">Loading...</span>
  </div>
);

// Higher-order component for lazy loading with error boundary
const lazyLoad = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ComponentType
) => {
  const LazyComponent = lazy(importFunc);
  const FallbackComponent = fallback || LoadingFallback;

  return (props: any) => (
    <Suspense fallback={<FallbackComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Page-level lazy loading
export const LazyPages = {
  // Finance Module
  BillingCenter: lazyLoad(() => import('../pages/finance/BillingCenter')),
  FinancialTracking: lazyLoad(() => import('../pages/FinancialTracking')),
  Payments: lazyLoad(() => import('../pages/PaymentRegistration')),
  Collections: lazyLoad(() => import('../pages/Collections')),

  // Fleet Module
  Fleet: lazyLoad(() => import('../pages/fleet/FleetPageNew')),
  Maintenance: lazyLoad(() => import('../pages/fleet/Maintenance')),
  FleetReports: lazyLoad(() => import('../pages/fleet/FleetReports')),

  // HR Module
  Employees: lazyLoad(() => import('../pages/hr/Employees')),
  Payroll: lazyLoad(() => import('../pages/hr/Payroll')),
  Attendance: lazyLoad(() => import('../pages/hr/Attendance')),
  LeaveManagement: lazyLoad(() => import('../pages/hr/LeaveManagement')),

  // Legal Module
  Legal: lazyLoad(() => import('../pages/Legal')),

  // Settings & Admin
  Settings: lazyLoad(() => import('../pages/Settings')),
  SuperAdmin: lazyLoad(() => import('../pages/SuperAdmin')),

  // Reports
  Reports: lazyLoad(() => import('../pages/Reports')),

  // Other Pages
  Customers: lazyLoad(() => import('../pages/customers/CustomersPageNew')),
  Contracts: lazyLoad(() => import('../pages/Contracts')),
  Vehicles: lazyLoad(() => import('../pages/fleet/Vehicles')),
  Properties: lazyLoad(() => import('../pages/Properties')),
  Tenants: lazyLoad(() => import('../pages/Tenants')),
};

// Component-level lazy loading
export const LazyComponents = {
  // Heavy Charts
  FinancialCharts: lazyLoad(() => import('../components/finance/FinancialCharts')),
  FleetAnalytics: lazyLoad(() => import('../components/fleet/FleetAnalytics')),
  ContractAnalytics: lazyLoad(() => import('../components/contracts/ContractAnalytics')),

  // PDF Generation
  PDFGenerator: lazyLoad(() => import('../components/exports/PDFGenerator')),
  InvoicePDF: lazyLoad(() => import('../components/finance/InvoicePDF')),

  // Excel Operations
  ExcelExporter: lazyLoad(() => import('../components/exports/ExcelExporter')),
  CSVUploader: lazyLoad(() => import('../components/csv/CSVUploader')),

  // Maps
  FleetMap: lazyLoad(() => import('../components/fleet/FleetMap')),
  VehicleTracking: lazyLoad(() => import('../components/fleet/VehicleTracking')),

  // Advanced Forms
  AdvancedContractForm: lazyLoad(() => import('../components/contracts/AdvancedContractForm')),
  ComprehensiveCustomerForm: lazyLoad(() => import('../components/customers/ComprehensiveCustomerForm')),

  // Dashboards
  ExecutiveDashboard: lazyLoad(() => import('../components/dashboard/ExecutiveDashboard')),
  RealTimeAnalytics: lazyLoad(() => import('../components/analytics/RealTimeAnalytics')),

  // AI Components
  AIAssistant: lazyLoad(() => import('../components/ai/AIAssistant')),
  SmartSuggestions: lazyLoad(() => import('../components/ai/SmartSuggestions')),

  // 3D Components
  Vehicle3DViewer: lazyLoad(() => import('../components/fleet/Vehicle3DViewer')),
  Property3DTour: lazyLoad(() => import('../components/properties/Property3DTour')),
};

// External library lazy loading
export const LazyLibraries = {
  // Load PDF libraries only when needed
  loadPDF: async () => {
    const [jspdf, jspdfAutotable] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    return { jsPDF: jspdf.default, jsPDFAutoTable: jspdfAutotable.default };
  },

  // Load Excel libraries only when needed
  loadExcel: async () => {
    const [xlsx, exceljs] = await Promise.all([
      import('xlsx'),
      import('exceljs')
    ]);
    return { xlsx: xlsx.default, ExcelJS: exceljs.default };
  },

  // Load Chart libraries only when needed
  loadCharts: async () => {
    const recharts = await import('recharts');
    return { recharts: recharts.default };
  },

  // Load Map libraries only when needed
  loadMaps: async () => {
    const [leaflet, reactLeaflet] = await Promise.all([
      import('leaflet'),
      import('react-leaflet')
    ]);
    return {
      Leaflet: leaflet.default,
      ReactLeaflet: reactLeaflet.default
    };
  },

  // Load 3D libraries only when needed
  load3D: async () => {
    const three = await import('three');
    return { THREE: three.default };
  },

  // Load Date libraries only when needed
  loadDatePicker: async () => {
    const datePicker = await import('react-datepicker');
    return { DatePicker: datePicker.default };
  },

  // Load CSV parsing only when needed
  loadCSV: async () => {
    const papaparse = await import('papaparse');
    return { PapaParse: papaparse.default };
  },
};

// Preload critical modules
export const preloadCriticalModules = () => {
  // Preload frequently used modules
  setTimeout(() => {
    import('../pages/Dashboard');
    import('../pages/customers/CustomersPageNew');
    import('../pages/Contracts');
  }, 2000);
};

export default {
  LazyPages,
  LazyComponents,
  LazyLibraries,
  preloadCriticalModules,
};