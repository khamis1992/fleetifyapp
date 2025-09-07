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
import { Download, Printer, X, AlertCircle } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { useModuleReportData } from '@/hooks/useModuleReportData';
import { ReportDataDisplay } from './ReportDataDisplay';

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
        <Card>
          <CardHeader>
            <CardTitle>{getReportTitle(reportId, moduleType)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</span>
                <span>الوقت: {new Date().toLocaleTimeString('ar-SA')}</span>
              </div>
              
              {/* Report filters summary */}
              {(filters.startDate || filters.endDate) && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">فترة التقرير:</h4>
                  <div className="flex gap-4 text-sm">
                    {filters.startDate && <span>من: {filters.startDate}</span>}
                    {filters.endDate && <span>إلى: {filters.endDate}</span>}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Data */}
        <ReportDataDisplay 
          data={reportData} 
          reportId={reportId} 
          moduleType={moduleType} 
        />
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{getReportTitle(reportId, moduleType)}</DialogTitle>
              <DialogDescription>
                عرض وتصدير التقرير مع إمكانية التخصيص
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {renderReportContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}