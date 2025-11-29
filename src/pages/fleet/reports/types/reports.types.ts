/**
 * أنواع TypeScript لصفحة تقارير الأسطول
 * Fleet Reports Types
 */

// فترات التصفية الزمنية
export type DateFilterPeriod = 
  | 'today'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'custom';

// حالة المركبة
export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'reserved';

// نوع التقرير
export type ReportType = 
  | 'vehicle-usage'
  | 'maintenance-cost'
  | 'financial-performance'
  | 'operational-efficiency'
  | 'profitability'
  | 'forecasting'
  | 'traffic-violations';

// تنسيق التصدير
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'html';

// بيانات المؤشرات الرئيسية
export interface FleetKPI {
  id: string;
  title: string;
  value: number | string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  target?: number;
  icon: string;
  color: string;
  unit?: string;
}

// بيانات الفلتر
export interface ReportFilters {
  period: DateFilterPeriod;
  startDate?: Date;
  endDate?: Date;
  vehicleStatus?: VehicleStatus[];
  vehicleIds?: string[];
  compareWithPrevious: boolean;
}

// بيانات المركبة للتقارير
export interface VehicleReportData {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  status: VehicleStatus;
  daily_rate: number;
  monthly_rate: number;
  book_value: number;
  depreciation: number;
  utilization_rate: number;
  revenue: number;
  maintenance_cost: number;
  profit: number;
}

// بيانات الصيانة للتقارير
export interface MaintenanceReportData {
  id: string;
  vehicle_id: string;
  plate_number: string;
  maintenance_type: string;
  scheduled_date: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_cost: number;
  actual_cost?: number;
  description?: string;
}

// بيانات الرسم البياني
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

// بيانات الإيرادات الشهرية
export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  contracts: number;
  maintenance: number;
  profit: number;
}

// بيانات حالة الأسطول
export interface FleetStatusData {
  available: number;
  rented: number;
  maintenance: number;
  reserved: number;
  total: number;
}

// ملخص التحليلات
export interface FleetAnalyticsSummary {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  reservedVehicles: number;
  totalBookValue: number;
  totalDepreciation: number;
  monthlyMaintenanceCost: number;
  utilizationRate: number;
  maintenanceRate: number;
  averageRevenue: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
}

// تقرير مخصص
export interface CustomReport {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  icon: string;
  color: string;
  isAvailable: boolean;
}

// خيارات التصدير
export interface ExportOptions {
  format: ExportFormat;
  includeCharts: boolean;
  includeDetails: boolean;
  dateRange?: { start: Date; end: Date };
}

// نتيجة التصدير
export interface ExportResult {
  success: boolean;
  fileName?: string;
  error?: string;
}

