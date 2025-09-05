import React, { useState } from 'react';
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
  AlertTriangle,
  Menu
} from 'lucide-react';
import { UnifiedReportViewer } from '@/components/reports/UnifiedReportViewer';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { useUnifiedReports } from '@/hooks/useUnifiedReports';
import { ResponsiveGrid } from '@/components/responsive/ResponsiveGrid';
import { AdaptiveCard } from '@/components/responsive/AdaptiveCard';
import { ResponsiveButton } from '@/components/ui/responsive-button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useResponsiveBreakpoint } from '@/hooks/use-mobile';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


export default function Reports() {
  const [selectedModule, setSelectedModule] = useState<string>('dashboard');
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    companyId: '',
    moduleType: ''
  });

  const { data: reportsData, isLoading } = useUnifiedReports();
  const { isMobile, isTablet } = useResponsiveBreakpoint();
  const { 
    containerPadding, 
    cardSpacing, 
    buttonSize, 
    gridColumns,
    contentDensity 
  } = useAdaptiveLayout();

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
    <div className={cn("space-y-6", containerPadding)} dir="rtl">
      {/* Header - Responsive */}
      <div className={cn(
        "flex items-center justify-between",
        isMobile && "flex-col space-y-4 items-start"
      )}>
        <div className={cn(
          "flex items-center gap-3",
          isMobile && "w-full"
        )}>
          <div className={cn(
            "bg-primary/10 rounded-lg",
            isMobile ? "p-1.5" : "p-2"
          )}>
            <BarChart3 className={cn(
              "text-primary",
              isMobile ? "h-5 w-5" : "h-6 w-6"
            )} />
          </div>
          <div>
            <h1 className={cn(
              "font-bold text-foreground",
              isMobile ? "text-xl" : "text-2xl"
            )}>مركز التقارير الموحد</h1>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-sm" : "text-base"
            )}>تقارير شاملة لجميع أقسام النظام</p>
          </div>
        </div>
        
        {/* Action Buttons - Responsive */}
        <div className={cn(
          "flex gap-2",
          isMobile && "w-full"
        )}>
          {isMobile ? (
            // Mobile: Dropdown Menu
            <div className="flex items-center gap-2 w-full">
              <ResponsiveButton 
                variant="outline"
                className="flex-1"
                size={buttonSize}
              >
                <Calendar className="h-4 w-4 ml-2" />
                جدولة تقرير
              </ResponsiveButton>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ResponsiveButton variant="outline" size={buttonSize}>
                    <Menu className="h-4 w-4" />
                  </ResponsiveButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    تصدير مجمع
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            // Desktop: Individual Buttons
            <>
              <ResponsiveButton variant="outline" size={buttonSize}>
                <Calendar className="h-4 w-4 ml-2" />
                جدولة تقرير
              </ResponsiveButton>
              <ResponsiveButton size={buttonSize}>
                <Download className="h-4 w-4 ml-2" />
                تصدير مجمع
              </ResponsiveButton>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats - Responsive */}
      <ResponsiveGrid
        columns={gridColumns.stats}
        gap={cardSpacing}
        className="w-full"
      >
        {quickStats.map((stat) => (
          <AdaptiveCard key={stat.title} density={contentDensity}>
            <CardContent className={cn(
              isMobile ? "p-4" : "p-6"
            )}>
              <div className={cn(
                "flex items-center gap-4",
                isMobile && "gap-3"
              )}>
                <div className={cn(
                  "bg-primary/10 rounded-lg",
                  isMobile ? "p-2" : "p-3"
                )}>
                  <stat.icon className={cn(
                    "text-primary",
                    isMobile ? "h-5 w-5" : "h-6 w-6"
                  )} />
                </div>
                <div className="flex-1">
                  <p className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-xs" : "text-sm"
                  )}>{stat.title}</p>
                  <p className={cn(
                    "font-bold",
                    isMobile ? "text-xl" : "text-2xl"
                  )}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
              </div>
            </CardContent>
          </AdaptiveCard>
        ))}
      </ResponsiveGrid>

      {/* Main Content - Responsive */}
      <Tabs value={selectedModule} onValueChange={setSelectedModule} className="space-y-4">
        <TabsList className={cn(
          "grid w-full",
          isMobile ? "grid-cols-3 h-auto" : "grid-cols-6"
        )}>
          {isMobile ? (
            // Mobile: Show only 3 most important tabs
            <>
              <TabsTrigger value="dashboard" className="text-xs">لوحة التحكم</TabsTrigger>
              <TabsTrigger value="finance" className="text-xs">المالية</TabsTrigger>
              <TabsTrigger value="fleet" className="text-xs">الأسطول</TabsTrigger>
            </>
          ) : (
            // Desktop: Show all tabs
            <>
              <TabsTrigger value="legal">القانونية</TabsTrigger>
              <TabsTrigger value="customers">العملاء</TabsTrigger>
              <TabsTrigger value="fleet">الأسطول</TabsTrigger>
              <TabsTrigger value="hr">الموارد البشرية</TabsTrigger>
              <TabsTrigger value="finance">المالية</TabsTrigger>
              <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
            </>
          )}
        </TabsList>
        
        {/* Mobile: Additional tabs dropdown */}
        {isMobile && (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ResponsiveButton variant="outline" size="sm">
                  <Menu className="h-4 w-4 mr-2" />
                  تقارير أخرى
                </ResponsiveButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem onClick={() => setSelectedModule('hr')}>
                  <Users className="h-4 w-4 mr-2" />
                  الموارد البشرية
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedModule('customers')}>
                  <Building className="h-4 w-4 mr-2" />
                  العملاء
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedModule('legal')}>
                  <Scale className="h-4 w-4 mr-2" />
                  القانونية
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Dashboard Tab - Responsive */}
        <TabsContent value="dashboard" className="space-y-6">
          <ResponsiveGrid
            columns={gridColumns.modules}
            gap={cardSpacing}
            className="w-full"
          >
            {reportModules.map((module) => (
              <AdaptiveCard 
                key={module.id} 
                density={contentDensity}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader className={cn(
                  isMobile && "pb-3"
                )}>
                  <div className={cn(
                    "flex items-center justify-between",
                    isMobile && "flex-col items-start space-y-2"
                  )}>
                    <div className={cn(
                      "flex items-center gap-3",
                      isMobile && "w-full"
                    )}>
                      <div className={cn(
                        `rounded-lg ${module.color}`,
                        isMobile ? "p-2" : "p-3"
                      )}>
                        <module.icon className={cn(
                          isMobile ? "h-5 w-5" : "h-6 w-6"
                        )} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className={cn(
                          isMobile ? "text-base" : "text-lg"
                        )}>{module.title}</CardTitle>
                        <CardDescription className={cn(
                          isMobile ? "text-xs" : "text-sm"
                        )}>{module.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn(
                      isMobile && "self-end"
                    )}>{module.count}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {module.reports.slice(0, 3).map((report) => (
                      <div key={report.id} className={cn(
                        "flex items-center justify-between bg-muted/50 rounded-lg",
                        isMobile ? "py-1.5 px-2" : "py-2 px-3"
                      )}>
                        <span className={cn(
                          isMobile ? "text-xs" : "text-sm"
                        )}>{report.name}</span>
                        <ResponsiveButton
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedReport(report.id);
                            setSelectedModule(module.id);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </ResponsiveButton>
                      </div>
                    ))}
                    {module.reports.length > 3 && (
                      <div className="text-center pt-2">
                        <ResponsiveButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedModule(module.id)}
                        >
                          عرض المزيد ({module.reports.length - 3})
                        </ResponsiveButton>
                      </div>
                    )}
                  </div>
                </CardContent>
              </AdaptiveCard>
            ))}
          </ResponsiveGrid>
        </TabsContent>

        {/* Module Specific Tabs - Responsive */}
        {reportModules.map((module) => (
          <TabsContent key={module.id} value={module.id} className="space-y-6">
            <div className={cn(
              "flex gap-6",
              isMobile ? "flex-col" : "flex-col lg:flex-row"
            )}>
              {/* Filters Sidebar - Responsive */}
              <div className={cn(
                isMobile ? "w-full" : "lg:w-80"
              )}>
                <ReportFilters
                  moduleType={module.id}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </div>

              {/* Reports List - Responsive */}
              <div className="flex-1">
                <AdaptiveCard density={contentDensity}>
                  <CardHeader>
                    <CardTitle className={cn(
                      isMobile ? "text-lg" : "text-xl"
                    )}>{module.title}</CardTitle>
                    <CardDescription className={cn(
                      isMobile ? "text-sm" : "text-base"
                    )}>
                      اختر التقرير المطلوب من القائمة أدناه
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveGrid
                      columns={isMobile ? 1 : 2}
                      gap={cardSpacing}
                      className="w-full"
                    >
                      {module.reports.map((report) => (
                        <AdaptiveCard 
                          key={report.id} 
                          density={contentDensity}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <CardContent className={cn(
                            isMobile ? "p-3" : "p-4"
                          )}>
                            <div className={cn(
                              "flex items-center justify-between",
                              isMobile && "flex-col space-y-3 items-start"
                            )}>
                              <div className={cn(
                                "flex items-center gap-3",
                                isMobile && "w-full"
                              )}>
                                <FileText className={cn(
                                  "text-primary",
                                  isMobile ? "h-4 w-4" : "h-5 w-5"
                                )} />
                                <span className={cn(
                                  "font-medium",
                                  isMobile ? "text-sm" : "text-base"
                                )}>{report.name}</span>
                              </div>
                              <div className={cn(
                                "flex gap-2",
                                isMobile && "w-full justify-end"
                              )}>
                                <ResponsiveButton
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedReport(report.id)}
                                >
                                  عرض
                                </ResponsiveButton>
                                <ResponsiveButton size="sm" variant="outline">
                                  <Download className="h-4 w-4" />
                                </ResponsiveButton>
                              </div>
                            </div>
                          </CardContent>
                        </AdaptiveCard>
                      ))}
                    </ResponsiveGrid>
                  </CardContent>
                </AdaptiveCard>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Report Viewer Modal/Dialog - Responsive */}
      <ResponsiveDialog
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport('')}
        title="عارض التقارير"
        fullScreenOnMobile={true}
      >
        {selectedReport && (
          <UnifiedReportViewer
            reportId={selectedReport}
            moduleType={selectedModule}
            filters={filters}
            onClose={() => setSelectedReport('')}
          />
        )}
      </ResponsiveDialog>
    </div>
  );
}