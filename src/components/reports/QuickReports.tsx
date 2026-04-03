import { DollarSign, Car, AlertCircle, Calendar, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
 * Hook to get quick reports with navigation
 */
export const useQuickReports = () => {
  const navigate = useNavigate();

  const quickReports: QuickReportDefinition[] = [
    {
      id: 'daily_revenue',
      name: 'الإيرادات اليومية',
      description: 'عرض إيرادات اليوم الحالي',
      icon: DollarSign,
      onClick: () => {
        navigate('/reports/finance/daily-revenue');
      },
    },
    {
      id: 'fleet_utilization',
      name: 'استغلال الأسطول',
      description: 'نسبة استخدام المركبات',
      icon: Car,
      onClick: () => {
        navigate('/reports/fleet/utilization');
      },
    },
    {
      id: 'outstanding_payments',
      name: 'المدفوعات المعلقة',
      description: 'المدفوعات المتأخرة والمستحقة',
      icon: AlertCircle,
      onClick: () => {
        navigate('/reports/finance/outstanding');
      },
    },
    {
      id: 'contract_expirations',
      name: 'انتهاء العقود',
      description: 'العقود المنتهية أو قريبة الانتهاء',
      icon: Calendar,
      onClick: () => {
        navigate('/reports/contracts/expirations');
      },
    },
  ];

  return { quickReports };
};

/**
 * Array of predefined quick reports
 * These are common reports that users need frequent access to
 * @deprecated Use useQuickReports hook instead for proper navigation
 */
export const quickReports: QuickReportDefinition[] = [];
