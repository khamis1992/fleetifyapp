import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  FileText, 
  Download, 
  Printer,
  Calendar,
  Filter
} from 'lucide-react';
import { ReportDataDisplay } from '@/components/reports/ReportDataDisplay';
import { useModuleReportData } from '@/hooks/useModuleReportData';
import { useReportExport } from '@/hooks/useReportExport';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function ReportView() {
  const { moduleType, reportId } = useParams<{ moduleType: string; reportId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract filters from URL parameters
  const filters = {
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    companyId: searchParams.get('companyId') || '',
    moduleType: moduleType || ''
  };

  const reportTitle = searchParams.get('title') || 'تقرير';

  const { data: reportData, isLoading, error } = useModuleReportData(
    reportId || '',
    moduleType || '',
    filters
  );

  const { exportToHTML, isExporting } = useReportExport();

  const getReportTitle = (reportId: string, moduleType: string) => {
    const reportTitles: Record<string, Record<string, string>> = {
      finance: {
        'invoices_summary': 'ملخص الفواتير',
        'payments_summary': 'ملخص المدفوعات',
        'income_statement': 'قائمة الدخل',
        'balance_sheet': 'الميزانية العمومية',
        'cash_flow': 'التدفق النقدي',
        'trial_balance': 'ميزان المراجعة'
      },
      hr: {
        'employees_summary': 'ملخص الموظفين',
        'payroll_summary': 'ملخص الرواتب',
        'attendance_summary': 'ملخص الحضور',
        'leave_requests': 'تقرير الإجازات'
      },
      fleet: {
        'vehicles_summary': 'ملخص المركبات',
        'maintenance_summary': 'ملخص الصيانة',
        'traffic_violations': 'تقرير المخالفات المرورية',
        'fuel_consumption': 'تقرير استهلاك الوقود'
      },
      customers: {
        'customers_summary': 'ملخص العملاء',
        'customer_contracts': 'عقود العملاء',
        'customer_invoices': 'فواتير العملاء'
      },
      legal: {
        'cases_summary': 'ملخص القضايا',
        'legal_correspondence': 'المراسلات القانونية'
      }
    };

    return reportTitles[moduleType]?.[reportId] || reportTitle;
  };

  const getModuleTitle = (moduleType: string) => {
    const moduleTitles: Record<string, string> = {
      finance: 'التقارير المالية',
      hr: 'تقارير الموارد البشرية',
      fleet: 'تقارير الأسطول',
      customers: 'تقارير العملاء',
      legal: 'التقارير القانونية'
    };

    return moduleTitles[moduleType] || moduleType;
  };

  const handleExport = () => {
    if (reportId && moduleType) {
      exportToHTML({
        reportId,
        moduleType,
        filters,
        title: getReportTitle(reportId, moduleType)
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate('/reports');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">جارٍ تحميل التقرير...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-destructive">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">خطأ في تحميل التقرير</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  حدث خطأ أثناء تحميل بيانات التقرير. يرجى المحاولة مرة أخرى.
                </p>
              </div>
              <Button onClick={handleBack} variant="outline">
                <ArrowRight className="h-4 w-4 mr-2" />
                العودة للتقارير
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl" dir="rtl">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleBack}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getReportTitle(reportId || '', moduleType || '')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {getModuleTitle(moduleType || '')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'جارٍ التصدير...' : 'تصدير HTML'}
          </Button>
        </div>
      </div>

      {/* Report Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {getReportTitle(reportId || '', moduleType || '')}
                </CardTitle>
                <CardDescription>
                  تم إنشاء التقرير في {format(new Date(), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">
              {getModuleTitle(moduleType || '')}
            </Badge>
          </div>
        </CardHeader>

        {/* Applied Filters */}
        {(filters.startDate || filters.endDate || filters.companyId) && (
          <CardContent className="border-t">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">الفلاتر المطبقة:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.startDate && (
                <Badge variant="outline" className="gap-2">
                  <Calendar className="h-3 w-3" />
                  من: {format(new Date(filters.startDate), 'dd/MM/yyyy', { locale: ar })}
                </Badge>
              )}
              {filters.endDate && (
                <Badge variant="outline" className="gap-2">
                  <Calendar className="h-3 w-3" />
                  إلى: {format(new Date(filters.endDate), 'dd/MM/yyyy', { locale: ar })}
                </Badge>
              )}
              {filters.companyId && (
                <Badge variant="outline">
                  معرف الشركة: {filters.companyId}
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Report Data */}
      {reportData ? (
        <ReportDataDisplay 
          data={reportData} 
          reportId={reportId || ''} 
          moduleType={moduleType || ''} 
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-muted-foreground">لا توجد بيانات</h3>
                <p className="text-sm text-muted-foreground">
                  لا توجد بيانات متاحة لهذا التقرير في الفترة المحددة.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}