import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, FileText, Car, Users, Scale, TrendingUp, DollarSign, 
  Clock, Play, CreditCard, Briefcase, Activity, PieChart, LineChart,
  FileSpreadsheet, Building2, AlertTriangle, CheckCircle2, FileBarChart
} from 'lucide-react';
import { useReportFavorites } from '@/hooks/useReportFavorites';
import { useRecentReports } from '@/hooks/useRecentReports';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
type ReportCategory = 'all' | 'finance' | 'fleet' | 'hr' | 'legal';

interface Report {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  category: 'finance' | 'fleet' | 'hr' | 'legal';
  icon: React.ElementType;
  color: string;
}

const reports: Report[] = [
  // Finance
  { id: 'income-statement', name: 'Income Statement', nameAr: 'قائمة الدخل', description: 'Revenue vs Expenses Summary', category: 'finance', icon: TrendingUp, color: 'emerald' },
  { id: 'balance-sheet', name: 'Balance Sheet', nameAr: 'الميزانية العمومية', description: 'Assets, Liabilities & Equity', category: 'finance', icon: FileBarChart, color: 'blue' },
  { id: 'cash-flow', name: 'Cash Flow', nameAr: 'التدفق النقدي', description: 'Cash Inflows and Outflows', category: 'finance', icon: DollarSign, color: 'green' },
  { id: 'revenue-analysis', name: 'Revenue Analysis', nameAr: 'تحليل الإيرادات', description: 'Revenue Breakdown By Category', category: 'finance', icon: LineChart, color: 'teal' },
  { id: 'expense-report', name: 'Expense Report', nameAr: 'تقرير المصروفات', description: 'Operating Expenses Summary', category: 'finance', icon: CreditCard, color: 'orange' },
  { id: 'profit-loss', name: 'Profit & Loss', nameAr: 'الأرباح والخسائر', description: 'Net Profit Breakdown', category: 'finance', icon: PieChart, color: 'purple' },
  // Fleet
  { id: 'vehicle-utilization', name: 'Vehicle Utilization', nameAr: 'استغلال المركبات', description: 'Fleet Usage Statistics', category: 'fleet', icon: Car, color: 'blue' },
  { id: 'maintenance-costs', name: 'Maintenance Costs', nameAr: 'تكاليف الصيانة', description: 'Service And Repair Costs', category: 'fleet', icon: Activity, color: 'amber' },
  { id: 'fuel-consumption', name: 'Fuel Consumption', nameAr: 'استهلاك الوقود', description: 'Fuel Usage Breakdown', category: 'fleet', icon: FileText, color: 'red' },
  { id: 'fleet-status', name: 'Fleet Status', nameAr: 'حالة الأسطول', description: 'Vehicle Availability Status', category: 'fleet', icon: Building2, color: 'cyan' },
  { id: 'driver-performance', name: 'Driver Performance', nameAr: 'أداء السائقين', description: 'Driver Metrics Report', category: 'fleet', icon: Users, color: 'indigo' },
  // HR
  { id: 'payroll-report', name: 'Payroll Report', nameAr: 'تقرير الرواتب', description: 'Salary And Wages Summary', category: 'hr', icon: DollarSign, color: 'green' },
  { id: 'attendance-summary', name: 'Attendance Summary', nameAr: 'ملخص الحضور', description: 'Employee Attendance Data', category: 'hr', icon: Clock, color: 'orange' },
  { id: 'leave-balance', name: 'Leave Balance', nameAr: 'رصيد الإجازات', description: 'Employee Leave Tracking', category: 'hr', icon: Briefcase, color: 'purple' },
  { id: 'employee-performance', name: 'Employee Performance', nameAr: 'أداء الموظفين', description: 'Staff Performance Stats', category: 'hr', icon: TrendingUp, color: 'teal' },
  // Legal
  { id: 'cases-status', name: 'Cases Status', nameAr: 'حالة القضايا', description: 'Legal Cases Overview', category: 'legal', icon: Scale, color: 'red' },
  { id: 'contract-expiry', name: 'Contract Expiry', nameAr: 'انتهاء العقود', description: 'Upcoming Renewals', category: 'legal', icon: FileText, color: 'amber' },
  { id: 'violations-report', name: 'Violations Report', nameAr: 'تقرير المخالفات', description: 'Traffic Violations List', category: 'legal', icon: AlertTriangle, color: 'orange' },
];

const colorClasses: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500', text: 'text-white' },
  blue: { bg: 'bg-blue-500', text: 'text-white' },
  green: { bg: 'bg-green-500', text: 'text-white' },
  teal: { bg: 'bg-teal-500', text: 'text-white' },
  orange: { bg: 'bg-orange-500', text: 'text-white' },
  purple: { bg: 'bg-purple-500', text: 'text-white' },
  amber: { bg: 'bg-amber-500', text: 'text-white' },
  red: { bg: 'bg-red-500', text: 'text-white' },
  cyan: { bg: 'bg-cyan-500', text: 'text-white' },
  indigo: { bg: 'bg-indigo-500', text: 'text-white' },
};

export default function ReportsHub() {
  const { t } = useFleetifyTranslation("ui");
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('all');
  const { favorites } = useReportFavorites();
  const { recentReports } = useRecentReports();

  const categories: { key: ReportCategory; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'finance', label: 'المالية' },
    { key: 'fleet', label: 'الأسطول' },
    { key: 'hr', label: 'الموارد البشرية' },
    { key: 'legal', label: 'القانونية' },
  ];

  const filteredReports = activeCategory === 'all' 
    ? reports 
    : reports.filter(r => r.category === activeCategory);

  const mostUsedReports = reports.slice(0, 3);

  const handleGenerateReport = (reportId: string) => {
    navigate(`/reports/${reportId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-teal-500 rounded-xl shadow-sm">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">مركز التقارير</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">إنشاء وإدارة التقارير المختلفة</p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? 'default' : 'outline'}
            onClick={() => setActiveCategory(cat.key)}
            className={`min-h-[44px] ${activeCategory === cat.key 
              ? 'bg-teal-500 hover:bg-teal-600 text-white' 
              : 'border-slate-200 dark:border-slate-700 hover:border-teal-500/50'}`}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Most Used Reports Section */}
      {activeCategory === 'all' && mostUsedReports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-500" />
            الأكثر استخداماً
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mostUsedReports.map(report => {
              const Icon = report.icon;
              const colors = colorClasses[report.color];
              return (
                <Card key={report.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-teal-500/50 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{report.nameAr}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{report.description}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleGenerateReport(report.id)}
                      className="w-full mt-3 min-h-[44px] bg-teal-500 hover:bg-teal-600 text-white"
                    >
                      <Play className="h-4 w-4 ml-2" />
                      توليد التقرير
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Reports Grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {activeCategory === 'all' ? 'جميع التقارير' : categories.find(c => c.key === activeCategory)?.label}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map(report => {
            const Icon = report.icon;
            const colors = colorClasses[report.color];
            const categoryBadge = categories.find(c => c.key === report.category);
            
            return (
              <Card key={report.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-teal-500/50 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{report.nameAr}</h3>
                        <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                          {categoryBadge?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{report.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleGenerateReport(report.id)}
                    className="w-full mt-3 min-h-[44px] bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    <Play className="h-4 w-4 ml-2" />
                    توليد التقرير
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <CardContent className="p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">لا توجد تقارير في هذه الفئة</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}