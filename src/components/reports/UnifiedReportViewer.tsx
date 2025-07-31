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
import { Download, Printer, X } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';

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
        income_statement: 'قائمة الدخل',
        balance_sheet: 'الميزانية العمومية',
        cash_flow: 'تقرير التدفق النقدي',
        trial_balance: 'ميزان المراجعة',
        payables: 'تقرير المدفوعات المستحقة',
        receivables: 'تقرير المبالغ المستحقة'
      },
      hr: {
        attendance: 'تقرير الحضور',
        payroll: 'تقرير الرواتب',
        employees: 'تقرير الموظفين',
        leave_requests: 'تقرير الإجازات'
      },
      fleet: {
        vehicles: 'تقرير المركبات',
        maintenance: 'تقرير الصيانة',
        traffic_violations: 'تقرير المخالفات المرورية',
        fuel_consumption: 'تقرير استهلاك الوقود'
      },
      customers: {
        customers_list: 'قائمة العملاء',
        customer_contracts: 'عقود العملاء',
        customer_invoices: 'فواتير العملاء'
      },
      legal: {
        legal_cases: 'تقرير القضايا',
        legal_correspondence: 'المراسلات القانونية'
      }
    };

    return reportTitles[module]?.[id] || 'تقرير';
  };

  const renderReportContent = () => {
    // This would be dynamically rendered based on reportId and moduleType
    // For now, showing a placeholder structure
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

              {/* Loading state */}
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <LoadingSpinner />
                  <p className="text-muted-foreground">جاري تحميل بيانات التقرير...</p>
                </div>
              </div>

              {/* Placeholder for actual report data */}
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  محتوى التقرير سيظهر هنا بناءً على نوع التقرير المحدد
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  النوع: {moduleType} | المعرف: {reportId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <LoadingSpinner />
                ) : (
                  <Download className="h-4 w-4 ml-2" />
                )}
                تصدير HTML
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {renderReportContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}