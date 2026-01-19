import { DollarSign, Car, AlertCircle, Calendar, LucideIcon } from 'lucide-react';

/**
 * Quick report definition interface
 */
export interface QuickReportDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

/**
 * Array of predefined quick reports
 * These are common reports that users need frequent access to
 */
export const quickReports: QuickReportDefinition[] = [
  {
    id: 'daily_revenue',
    name: 'الإيرادات اليومية',
    description: 'عرض إيرادات اليوم الحالي',
    icon: DollarSign,
    onClick: () => {
      console.log('Quick report: Daily Revenue');
      // TODO: Implement actual report generation
    },
  },
  {
    id: 'fleet_utilization',
    name: 'استغلال الأسطول',
    description: 'نسبة استخدام المركبات',
    icon: Car,
    onClick: () => {
      console.log('Quick report: Fleet Utilization');
      // TODO: Implement actual report generation
    },
  },
  {
    id: 'outstanding_payments',
    name: 'المدفوعات المعلقة',
    description: 'المدفوعات المتأخرة والمستحقة',
    icon: AlertCircle,
    onClick: () => {
      console.log('Quick report: Outstanding Payments');
      // TODO: Implement actual report generation
    },
  },
  {
    id: 'contract_expirations',
    name: 'انتهاء العقود',
    description: 'العقود المنتهية أو قريبة الانتهاء',
    icon: Calendar,
    onClick: () => {
      console.log('Quick report: Contract Expirations');
      // TODO: Implement actual report generation
    },
  },
];
