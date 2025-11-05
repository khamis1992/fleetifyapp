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
import { PropertyReportViewer } from '@/components/reports/PropertyReportViewer';
import { PropertyReportFilters, type PropertyReportFilters as PropertyReportFiltersType } from '@/components/reports/PropertyReportFilters';
import { PropertyExportManager, type ExportOptions } from '@/components/reports/PropertyExportManager';
import { useReportExport } from '@/hooks/useReportExport';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { usePropertyReports } from '@/hooks/usePropertyReports';
import { useUnifiedReports } from '@/hooks/useUnifiedReports';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { getReportModulesForBusinessType } from '@/utils/businessTypeReports';
import { cn } from '@/lib/utils';
import { PageHelp } from "@/components/help";
import { ReportsPageHelpContent } from "@/components/help/content";

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
  const [selectedModule, setSelectedModule] = useState<string>('finance');
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    companyId: '',
    moduleType: ''
  });
  const [propertyFilters, setPropertyFilters] = useState<PropertyReportFiltersType>({
    dateRange: {},
    propertyType: '',
    location: '',
    status: '',
    ownerId: '',
    priceRange: {},
    reportType: ''
  });

  const { data: reportsData, isLoading } = useUnifiedReports();
  const { data: propertyReportsData } = usePropertyReports();
  const { data: currentCompany } = useCurrentCompany();
  const { exportToHTML, isExporting } = useReportExport();

  // Get business-specific report modules
  const reportModules = currentCompany?.business_type 
    ? getReportModulesForBusinessType(currentCompany.business_type)
    : getReportModulesForBusinessType('default');

  const handlePropertyExport = async (options: ExportOptions) => {
    // Implementation for property report export
    console.log('Exporting property report with options:', options);
    // This would integrate with actual export functionality
  };

  // Show loading state while fetching company data
  if (!currentCompany && !reportModules.length) {
    return (
      <div className={cn(layout.containerPadding, "flex items-center justify-center min-h-[400px]")} dir="rtl">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(layout.containerPadding, layout.itemSpacing)} dir="rtl">
      {/* Enhanced Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-2xl")}>مركز التقارير الموحد</h1>
          <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "")}>
            تقارير شاملة خاصة بـ{currentCompany?.name || 'شركتك'}
            {currentCompany?.business_type && (
              <span className="text-primary mr-2">
                ({getBusinessTypeLabel(currentCompany.business_type)})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedModule} onValueChange={setSelectedModule} className="space-y-4">
        {/* Enhanced Tabs Navigation */}
        {isMobile ? (
          <div className="w-full overflow-x-auto scrollbar-hide pb-2">
            <TabsList className={`grid h-12 w-full min-w-max grid-cols-${reportModules.length} gap-1 p-1 bg-muted/50 rounded-xl`}>
              {reportModules.map((module) => (
                <TabsTrigger 
                  key={module.id}
                  value={module.id} 
                  className="h-10 px-4 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap"
                >
                  {getModuleShortTitle(module.title)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TabsList className={`grid w-full grid-cols-${reportModules.length} lg:w-auto lg:inline-flex h-12`}>
              {reportModules.map((module) => (
                <TabsTrigger 
                  key={module.id}
                  value={module.id} 
                  className="h-10 rounded-lg"
                >
                  {getModuleShortTitle(module.title)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}

        {/* Module Specific Tabs */}
        {reportModules.map((module) => (
          <TabsContent key={module.id} value={module.id} className="space-y-6">
            <div className={cn("flex gap-6", isMobile ? "flex-col" : "lg:flex-row")}>
              {/* Filters Sidebar */}
              <div className={isMobile ? "w-full" : "lg:w-80"}>
                <Card>
                  <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                    {module.id === 'properties' ? (
                      <PropertyReportFilters
                        filters={propertyFilters}
                        onFiltersChange={setPropertyFilters}
                        onClearFilters={() => setPropertyFilters({
                          dateRange: {},
                          propertyType: '',
                          location: '',
                          status: '',
                          ownerId: '',
                          priceRange: {},
                          reportType: ''
                        })}
                      />
                    ) : (
                      <ReportFilters
                        moduleType={module.id}
                        filters={filters}
                        onFiltersChange={setFilters}
                      />
                    )}
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
                                {module.id === 'properties' ? (
                                  <PropertyExportManager
                                    reportData={propertyReportsData}
                                    reportType={report.id}
                                    onExport={handlePropertyExport}
                                  />
                                ) : (
                                  <Button 
                                    size={isMobile ? "sm" : "sm"} 
                                    variant="outline"
                                    onClick={() => exportToHTML({
                                      reportId: report.id,
                                      moduleType: module.id,
                                      filters,
                                      title: report.name
                                    })}
                                    disabled={isExporting}
                                    className={cn(isMobile && "h-10 w-10 p-0 rounded-lg shadow-sm")}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
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

      {/* Report Viewer */}
      {selectedReport && (
        selectedModule === 'properties' ? (
          <PropertyReportViewer
            reportId={selectedReport}
            filters={propertyFilters}
            onClose={() => setSelectedReport('')}
            onExport={handlePropertyExport}
          />
        ) : (
          <UnifiedReportViewer
            reportId={selectedReport}
            moduleType={selectedModule}
            filters={filters}
            onClose={() => setSelectedReport('')}
          />
        )
      )}
      <PageHelp
        title="دليل استخدام صفحة التقارير"
        description="تعرف على كيفية إنشاء وعرض وتصدير التقارير المختلفة"
      >
        <ReportsPageHelpContent />
      </PageHelp>
    </div>
  );
}

// Helper functions
function getBusinessTypeLabel(businessType: string): string {
  const labels: Record<string, string> = {
    'real_estate': 'العقارات',
    'car_rental': 'تأجير المركبات',
    'retail': 'التجارة',
    'construction': 'المقاولات',
    'manufacturing': 'التصنيع',
    'healthcare': 'الخدمات الطبية',
    'education': 'التعليم',
    'professional_services': 'الخدمات المهنية'
  };
  return labels[businessType] || businessType;
}

function getModuleShortTitle(title: string): string {
  // Return shorter versions for mobile display
  const shortTitles: Record<string, string> = {
    'التقارير المالية': 'المالية',
    'تقارير الموارد البشرية': 'الموارد البشرية',
    'تقارير الأسطول': 'الأسطول',
    'تقارير العقارات': 'العقارات',
    'تقارير العملاء': 'العملاء',
    'التقارير القانونية': 'القانونية',
    'تقارير المخزون': 'المخزون',
    'تقارير المشاريع': 'المشاريع',
    'تقارير الإنتاج': 'الإنتاج',
    'تقارير المرضى': 'المرضى',
    'التقارير الطبية': 'الطبية',
    'تقارير الطلاب': 'الطلاب',
    'التقارير الأكاديمية': 'الأكاديمية'
  };
  return shortTitles[title] || title;
}