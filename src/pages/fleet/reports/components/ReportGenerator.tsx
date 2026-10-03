import { Link } from 'react-router-dom';
import type { FleetAnalyticsSummary, MaintenanceReportData, VehicleReportData } from '../types/reports.types';
import type { VehicleInsuranceRegistrationData, InsuranceRegistrationSummary } from '../hooks/useFleetReports';

interface ReportGeneratorProps {
  analytics: FleetAnalyticsSummary | null;
  vehicles: VehicleReportData[];
  maintenance: MaintenanceReportData[];
  insuranceReport?: VehicleInsuranceRegistrationData[];
  insuranceSummary?: InsuranceRegistrationSummary | null;
  isDark: boolean;
  formatCurrency: (value: number) => string;
}

/** Retain the legacy entry point without generating forecasts from rate cards or estimates. */
export function ReportGenerator(props: ReportGeneratorProps) {
  void props;
  return <div dir="rtl"><p>التصدير الكامل للحصر والوثائق وحركات الشركة المقيدة متاح في تقرير الأسطول الموحد. إيراد وربح كل مركبة يحتاجان تخصيصًا محاسبيًا موثقًا.</p><Link to="/fleet/reports">فتح التقرير والتصدير</Link></div>;
}
export default ReportGenerator;
