import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Download, Printer, X, AlertCircle, FileText, Filter } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { useModuleReportData } from '@/hooks/useModuleReportData';
import { ReportDataDisplay } from './ReportDataDisplay';
import { ProfessionalReportHeader } from './ProfessionalReportHeader';
import { ProfessionalReportFooter } from './ProfessionalReportFooter';

interface UnifiedReportViewerProps {
  reportId: string;
  moduleType: string;
  filters: {
    startDate: string;
    endDate: string;
    companyId: string;
    moduleType: string;
  };
  onClose: () => void;
}

export function UnifiedReportViewer({
  reportId,
  moduleType,
  filters,
  onClose
}: UnifiedReportViewerProps) {
  const { exportToHTML, isExporting } = useReportExport();
  const { 
    data: reportData, 
    isLoading: isLoadingData, 
    error: dataError 
  } = useModuleReportData(reportId, moduleType, filters);

  const handleExport = async () => {
    try {
      await exportToHTML({
        reportId,
        moduleType,
        filters,
        title: getReportTitle(reportId, moduleType)
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = (id: string, module: string) => {
    const reportTitles: Record<string, Record<string, string>> = {
      finance: {
        invoices_summary: 'ملخص الفواتير',
        payments_summary: 'ملخص المدفوعات',
        income_statement: 'قائمة الدخل',
        balance_sheet: 'الميزانية العمومية',
        cash_flow: 'تقرير التدفق النقدي',
        trial_balance: 'ميزان المراجعة'
      },
      hr: {
        employees_summary: 'ملخص الموظفين',
        payroll_summary: 'ملخص الرواتب',
        attendance_summary: 'ملخص الحضور',
        leave_requests: 'تقرير الإجازات'
      },
      fleet: {
        vehicles_summary: 'ملخص المركبات',
        maintenance_summary: 'ملخص الصيانة',
        traffic_violations: 'تقرير المخالفات المرورية',
        fuel_consumption: 'تقرير استهلاك الوقود'
      },
      customers: {
        customers_summary: 'ملخص العملاء',
        customer_contracts: 'عقود العملاء',
        customer_invoices: 'فواتير العملاء'
      },
      legal: {
        cases_summary: 'ملخص القضايا',
        legal_correspondence: 'المراسلات القانونية'
      }
    };

    return reportTitles[module]?.[id] || 'تقرير';
  };

  const renderReportContent = () => {
    if (isLoadingData) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <LoadingSpinner />
            <p className="text-muted-foreground">جاري تحميل بيانات التقرير...</p>
          </div>
        </div>
      );
    }

    if (dataError) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <p className="text-destructive font-medium">حدث خطأ في تحميل البيانات</p>
              <p className="text-sm text-muted-foreground mt-1">
                {dataError instanceof Error ? dataError.message : 'خطأ غير معروف'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Professional Report Header */}
        <ProfessionalReportHeader 
          reportTitle={getReportTitle(reportId, moduleType)}
          reportId={reportId}
          moduleType={moduleType}
          generatedAt={new Date()}
        />

        {/* Filters Summary */}
        {(filters.startDate || filters.endDate || filters.companyId) && (
          <Card className="bg-accent/5 border-accent/20 print:bg-gray-50 print:border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground print:text-black">المرشحات المطبقة:</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {filters.startDate && (
                  <div className="flex justify-between p-2 bg-background rounded border border-border/30 print:bg-white print:border-gray-300">
                    <span className="text-muted-foreground print:text-gray-600">من تاريخ:</span>
                    <span className="font-medium text-foreground print:text-black">{filters.startDate}</span>
                  </div>
                )}
                {filters.endDate && (
                  <div className="flex justify-between p-2 bg-background rounded border border-border/30 print:bg-white print:border-gray-300">
                    <span className="text-muted-foreground print:text-gray-600">إلى تاريخ:</span>
                    <span className="font-medium text-foreground print:text-black">{filters.endDate}</span>
                  </div>
                )}
                {filters.companyId && (
                  <div className="flex justify-between p-2 bg-background rounded border border-border/30 print:bg-white print:border-gray-300">
                    <span className="text-muted-foreground print:text-gray-600">الشركة:</span>
                    <span className="font-medium text-foreground print:text-black">{filters.companyId}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Data */}
        <ReportDataDisplay 
          data={reportData} 
          reportId={reportId} 
          moduleType={moduleType} 
        />

        {/* Professional Report Footer */}
        <ProfessionalReportFooter />
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col print:max-w-none print:max-h-none print:overflow-visible" dir="rtl">
        <DialogHeader className="flex-shrink-0 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 arabic-heading-md">
                <FileText className="w-6 h-6 text-primary" />
                عارض التقارير الاحترافي
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                {getReportTitle(reportId, moduleType)} - رقم التقرير: {reportId}
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting || !reportData}
                className="gap-2 transition-smooth hover:shadow-card"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'جاري التصدير...' : 'تصدير HTML'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!reportData}
                className="gap-2 transition-smooth hover:shadow-card"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                إغلاق
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto print:overflow-visible">
          {renderReportContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}