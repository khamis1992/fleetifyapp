/**
 * Fleet Reports Module Index
 * تصدير جميع المكونات والـ hooks والأنواع
 */

// Main Page
export { default as FleetReportsPage } from './FleetReportsPage';

// Components
export { FleetKPICards } from './components/FleetKPICards';
export { 
  RevenueChart, 
  FleetStatusChart, 
  UtilizationChart,
  TopVehiclesChart,
  MonthlyContractsChart,
} from './components/FleetCharts';
export { ReportFilters } from './components/ReportFilters';
export { ReportGenerator } from './components/ReportGenerator';

// Hooks
export {
  useFleetAnalytics,
  useVehiclesReport,
  useMaintenanceReport,
  useMonthlyRevenue,
  useFleetStatus,
  useTopPerformingVehicles,
  useVehiclesNeedingMaintenance,
} from './hooks/useFleetReports';

// Types
export type {
  DateFilterPeriod,
  VehicleStatus,
  ReportType,
  ExportFormat,
  FleetKPI,
  ReportFilters as IReportFilters,
  VehicleReportData,
  MaintenanceReportData,
  ChartDataPoint,
  MonthlyRevenueData,
  FleetStatusData,
  FleetAnalyticsSummary,
  CustomReport,
  ExportOptions,
  ExportResult,
} from './types/reports.types';

