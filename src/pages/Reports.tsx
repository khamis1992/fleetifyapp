import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  Users,
  Car,
  DollarSign,
  Building,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { UnifiedReportViewer } from '@/components/reports/UnifiedReportViewer';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { useUnifiedReports } from '@/hooks/useUnifiedReports';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';

export default function Reports() {
  // Responsive hooks
  const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint();
  const layout = useAdaptiveLayout({
    mobileViewMode: 'stack',
    tabletColumns: 2,
    desktopColumns: 3,
    cardLayout: true,
    fullscreenModals: true,
    enableSwipeGestures: true,
    touchTargetSize: 'large'
  });

  // State management
  const [selectedModule, setSelectedModule] = useState<string>('dashboard');
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    companyId: '',
    moduleType: ''
  });

  const { data: reportsData, isLoading } = useUnifiedReports();

  const reportModules = [
    {
      id: 'finance',
      title: 'التقارير المالية',
      description: 'تقارير الحسابات والميزانيات والمدفوعات',
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      count: 12,
      reports: [
        { id: 'invoices_summary', name: 'ملخص الفواتير', type: 'financial' },
        { id: 'payments_summary', name: 'ملخص المدفوعات', type: 'financial' },
        { id: 'income_statement', name: 'قائمة الدخل', type: 'financial' },
        { id: 'balance_sheet', name: 'الميزانية العمومية', type: 'financial' },
        { id: 'cash_flow', name: 'التدفق النقدي', type: 'financial' },
        { id: 'trial_balance', name: 'ميزان المراجعة', type: 'financial' }
      ]
    },
    {
      id: 'hr',
      title: 'تقارير الموارد البشرية',
      description: 'تقارير الموظفين والحضور والرواتب',
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
      count: 8,
      reports: [
        { id: 'employees_summary', name: 'ملخص الموظفين', type: 'hr' },
        { id: 'payroll_summary', name: 'ملخص الرواتب', type: 'hr' },
        { id: 'attendance_summary', name: 'ملخص الحضور', type: 'hr' },
        { id: 'leave_requests', name: 'تقرير الإجازات', type: 'hr' }
      ]
    },
    {
      id: 'fleet',
      title: 'تقارير الأسطول',
      description: 'تقارير المركبات والصيانة والمخالفات',
      icon: Car,
      color: 'bg-purple-100 text-purple-600',
      count: 10,
      reports: [
        { id: 'vehicles_summary', name: 'ملخص المركبات', type: 'fleet' },
        { id: 'maintenance_summary', name: 'ملخص الصيانة', type: 'fleet' },
        { id: 'traffic_violations', name: 'تقرير المخالفات المرورية', type: 'fleet' },
        { id: 'fuel_consumption', name: 'تقرير استهلاك الوقود', type: 'fleet' }
      ]
    },
    {
      id: 'customers',
      title: 'تقارير العملاء',
      description: 'تقارير العملاء والعقود والفواتير',
      icon: Building,
      color: 'bg-orange-100 text-orange-600',
      count: 6,
      reports: [
        { id: 'customers_summary', name: 'ملخص العملاء', type: 'customers' },
        { id: 'customer_contracts', name: 'عقود العملاء', type: 'customers' },
        { id: 'customer_invoices', name: 'فواتير العملاء', type: 'customers' }
      ]
    },
    {
      id: 'legal',
      title: 'التقارير القانونية',
      description: 'تقارير القضايا والمراسلات القانونية',
      icon: Scale,
      color: 'bg-red-100 text-red-600',
      count: 4,
      reports: [
        { id: 'cases_summary', name: 'ملخص القضايا', type: 'legal' },
        { id: 'legal_correspondence', name: 'المراسلات القانونية', type: 'legal' }
      ]
    }
  ];

  const quickStats = [
    {
      title: 'إجمالي التقارير',
      value: '40',
      icon: FileText,
      change: '+5 هذا الشهر'
    },
    {
      title: 'التقارير المُصدرة اليوم',
      value: '12',
      icon: Download,
      change: '+3 منذ الأمس'
    },
    {
      title: 'التقارير المجدولة',
      value: '8',
      icon: Calendar,
      change: '2 قيد التنفيذ'
    },
    {
      title: 'متوسط وقت التنفيذ',
      value: '2.3 ثانية',
      icon: TrendingUp,
      change: '-0.5 ثانية'
    }
  ];

  return (
    <div className={cn(layout.containerPadding, layout.itemSpacing)} dir="rtl">
      {/* Enhanced Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-2xl")}>مركز التقارير الموحد</h1>
          <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "")}>تقارير شاملة لجميع أقسام النظام</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={cn("grid gap-4", layout.gridCols)}>
        {quickStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className={cn("p-4", isMobile ? "p-4" : "p-6")}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={selectedModule} onValueChange={setSelectedModule} className="space-y-4">
        {/* Enhanced Tabs Navigation */}
        {isMobile ? (
          <div className="w-full overflow-x-auto scrollbar-hide pb-2">
            <TabsList className="grid h-12 w-full min-w-max grid-cols-6 gap-1 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="dashboard" className="h-10 px-4 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap">
                لوحة التحكم
              </TabsTrigger>
              <TabsTrigger value="finance" className="h-10 px-4 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap">
                المالية
              </TabsTrigger>
              <TabsTrigger value="hr" className="h-10 px-4 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap">
                الموارد البشرية
              </TabsTrigger>
              <TabsTrigger value="fleet" className="h-10 px-4 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap">
                الأسطول
              </TabsTrigger>
              <TabsTrigger value="customers" className="h-10 px-4 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap">
                العملاء
              </TabsTrigger>
              <TabsTrigger value="legal" className="h-10 px-4 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap">
                القانونية
              </TabsTrigger>
            </TabsList>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex h-12">
              <TabsTrigger value="dashboard" className="h-10 rounded-lg">لوحة التحكم</TabsTrigger>
              <TabsTrigger value="finance" className="h-10 rounded-lg">المالية</TabsTrigger>
              <TabsTrigger value="hr" className="h-10 rounded-lg">الموارد البشرية</TabsTrigger>
              <TabsTrigger value="fleet" className="h-10 rounded-lg">الأسطول</TabsTrigger>
              <TabsTrigger value="customers" className="h-10 rounded-lg">العملاء</TabsTrigger>
              <TabsTrigger value="legal" className="h-10 rounded-lg">القانونية</TabsTrigger>
            </TabsList>
          </div>
        )}

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "lg:grid-cols-2 xl:grid-cols-3")}>
            {reportModules.map((module) => (
              <Card key={module.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className={cn(isMobile ? "p-4" : "p-6")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${module.color}`}>
                        <module.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>{module.title}</CardTitle>
                        <CardDescription className={cn(isMobile ? "text-xs" : "text-sm")}>{module.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">{module.count}</Badge>
                  </div>
                </CardHeader>
                <CardContent className={cn(isMobile ? "p-4 pt-0" : "p-6 pt-0")}>
                  <div className="space-y-2">
                    {module.reports.slice(0, 3).map((report) => (
                      <div key={report.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">{report.name}</span>
                        <Button
                          size={isMobile ? "sm" : "sm"}
                          variant="ghost"
                          onClick={() => {
                            setSelectedReport(report.id);
                            setSelectedModule(module.id);
                          }}
                          className={cn(isMobile && "h-8 w-8 p-0")}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {module.reports.length > 3 && (
                      <div className="text-center pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedModule(module.id)}
                          className={cn(isMobile ? "h-10 rounded-lg" : "")}
                        >
                          عرض المزيد ({module.reports.length - 3})
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Module Specific Tabs */}
        {reportModules.map((module) => (
          <TabsContent key={module.id} value={module.id} className="space-y-6">
            <div className={cn("flex gap-6", isMobile ? "flex-col" : "lg:flex-row")}>
              {/* Filters Sidebar */}
              <div className={isMobile ? "w-full" : "lg:w-80"}>
                <Card>
                  <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                    <ReportFilters
                      moduleType={module.id}
                      filters={filters}
                      onFiltersChange={setFilters}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Reports List */}
              <div className="flex-1">
                <Card>
                  <CardHeader className={cn(isMobile ? "p-4" : "p-6")}>
                    <CardTitle className={cn(isMobile ? "text-lg" : "text-xl")}>{module.title}</CardTitle>
                    <CardDescription>
                      اختر التقرير المطلوب من القائمة أدناه
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={cn(isMobile ? "p-4 pt-0" : "p-6 pt-0")}>
                    <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "md:grid-cols-2")}>
                      {module.reports.map((report) => (
                        <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className={cn("font-medium", isMobile ? "text-sm" : "")}>{report.name}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size={isMobile ? "sm" : "sm"}
                                  variant="outline"
                                  onClick={() => setSelectedReport(report.id)}
                                  className={cn(isMobile && "h-10 rounded-lg shadow-sm")}
                                >
                                  عرض
                                </Button>
                                <Button 
                                  size={isMobile ? "sm" : "sm"} 
                                  variant="outline"
                                  className={cn(isMobile && "h-10 w-10 p-0 rounded-lg shadow-sm")}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Report Viewer Modal/Dialog */}
      {selectedReport && (
        <UnifiedReportViewer
          reportId={selectedReport}
          moduleType={selectedModule}
          filters={filters}
          onClose={() => setSelectedReport('')}
        />
      )}
    </div>
  );
}