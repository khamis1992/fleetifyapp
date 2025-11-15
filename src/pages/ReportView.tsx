import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Download, Printer, ArrowRight, AlertCircle } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { useModuleReportData } from '@/hooks/useModuleReportData';
import { ReportDataDisplay } from '@/components/reports/ReportDataDisplay';

export default function ReportView() {
  const { moduleType, reportId } = useParams<{ moduleType: string; reportId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const filters = {
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    companyId: searchParams.get('companyId') || '',
    moduleType: moduleType || ''
  };

  const { exportToHTML, isExporting } = useReportExport();
  const { 
    data: reportData, 
    isLoading: isLoadingData, 
    error: dataError 
  } = useModuleReportData(reportId!, moduleType!, filters);

  const handleExport = async () => {
    try {
      await exportToHTML({
        reportId: reportId!,
        moduleType: moduleType!,
        filters,
        title: getReportTitle(reportId!, moduleType!)
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
        <Card>
          <CardHeader>
            <CardTitle>{getReportTitle(reportId!, moduleType!)}</CardTitle>
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
          reportId={reportId!} 
          moduleType={moduleType!} 
        />
      </div>
    );
  };

  // Set page title
  useEffect(() => {
    if (reportId && moduleType) {
      document.title = `${getReportTitle(reportId, moduleType)} - التقارير`;
    }
    return () => {
      document.title = 'نظام إدارة الشركات';
    };
  }, [reportId, moduleType]);

  if (!reportId || !moduleType) {
    return (
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-destructive font-medium">معاملات التقرير غير صحيحة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" dir="rtl">
      {/* Header with navigation and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/reports')}
            className="shrink-0"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للتقارير
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{getReportTitle(reportId, moduleType)}</h1>
            <p className="text-muted-foreground text-sm">عرض مفصل للتقرير</p>
          </div>
        </div>
        
        <div className="flex gap-2 print:hidden">
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="print:shadow-none">
        {renderReportContent()}
      </div>
    </div>
  );
}