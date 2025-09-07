import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  DollarSign, 
  Car, 
  Building, 
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Activity,
  BarChart3
} from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ReportKPISection } from './ReportKPISection';
import { ProfessionalDataTable } from './ProfessionalDataTable';
import { ReportExecutiveSummary } from './ReportExecutiveSummary';

interface ReportDataDisplayProps {
  data: any;
  reportId: string;
  moduleType: string;
}

export function ReportDataDisplay({ data, reportId, moduleType }: ReportDataDisplayProps) {
  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">لا توجد بيانات متاحة لهذا التقرير</p>
      </div>
    );
  }

  const { formatCurrency } = useCurrencyFormatter();

  const convertMetricsToKPIs = (metrics: Record<string, number>) => {
    const getIcon = (key: string) => {
      if (key.includes('employee') || key.includes('staff')) return Users;
      if (key.includes('amount') || key.includes('total') || key.includes('paid')) return DollarSign;
      if (key.includes('vehicle') || key.includes('car')) return Car;
      if (key.includes('customer') || key.includes('client')) return Building;
      if (key.includes('case') || key.includes('legal')) return Scale;
      return Activity;
    };

    const formatLabel = (key: string) => {
      const labels: Record<string, string> = {
        totalEmployees: 'إجمالي الموظفين',
        activeEmployees: 'الموظفين النشطين',
        totalPayroll: 'إجمالي الرواتب',
        averageSalary: 'متوسط الراتب',
        totalVehicles: 'إجمالي المركبات',
        activeVehicles: 'المركبات النشطة',
        maintenanceCount: 'عدد الصيانات',
        totalMaintenanceCost: 'تكلفة الصيانة الإجمالية',
        totalCustomers: 'إجمالي العملاء',
        activeCustomers: 'العملاء النشطين',
        averageContractValue: 'متوسط قيمة العقد',
        totalCases: 'إجمالي القضايا',
        activeCases: 'القضايا النشطة',
        resolvedCases: 'القضايا المحلولة',
        totalInvoices: 'إجمالي الفواتير',
        totalAmount: 'المبلغ الإجمالي',
        paidAmount: 'المبلغ المدفوع',
        pendingAmount: 'المبلغ المعلق',
        totalPayments: 'إجمالي المدفوعات'
      };
      return labels[key] || key;
    };

    const getValueType = (key: string): 'currency' | 'number' | 'percentage' => {
      if (key.includes('amount') || key.includes('salary') || key.includes('cost') || key.includes('paid') || (key.includes('total') && key.includes('payment'))) {
        return 'currency';
      }
      return 'number';
    };

    return Object.entries(metrics).map(([key, value]) => ({
      label: formatLabel(key),
      value,
      type: getValueType(key),
      icon: getIcon(key)
    }));
  };

  const getStatusColumn = (moduleType: string) => {
    const statusColumns: Record<string, string> = {
      'employees': 'status',
      'vehicles': 'status',
      'customers': 'status',
      'cases': 'status',
      'invoices': 'status',
      'payments': 'status'
    };
    return statusColumns[moduleType];
  };

  return (
    <div className="space-y-8">
      {/* Executive Summary */}
      <ReportExecutiveSummary 
        data={data} 
        moduleType={moduleType} 
        reportId={reportId} 
      />

      {/* KPI Section */}
      {data.metrics && (
        <ReportKPISection 
          kpis={convertMetricsToKPIs(data.metrics)} 
          title="مؤشرات الأداء الرئيسية"
        />
      )}
      
      {/* Summary Stats */}
      {data.summary && (
        <Card className="bg-gradient-card border-0 shadow-card print:bg-white print:border print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle className="flex items-center gap-2 arabic-heading-sm print:text-black">
              <BarChart3 className="w-5 h-5 text-primary" />
              ملخص الإحصائيات التفصيلية
            </CardTitle>
          </CardHeader>
          <CardContent className="print:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.summary).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-accent/10 rounded-lg border border-border/20 print:bg-gray-50 print:border-gray-200">
                  <p className="text-sm text-muted-foreground font-medium print:text-gray-600">{key}</p>
                  <p className="text-2xl font-bold text-foreground arabic-heading-sm print:text-black">{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Data Tables */}
      {data.employees && (
        <ProfessionalDataTable 
          data={data.employees} 
          title="بيانات الموظفين" 
          statusColumn={getStatusColumn('employees')}
        />
      )}
      {data.vehicles && (
        <ProfessionalDataTable 
          data={data.vehicles} 
          title="بيانات المركبات" 
          statusColumn={getStatusColumn('vehicles')}
        />
      )}
      {data.customers && (
        <ProfessionalDataTable 
          data={data.customers} 
          title="بيانات العملاء" 
          statusColumn={getStatusColumn('customers')}
        />
      )}
      {data.cases && (
        <ProfessionalDataTable 
          data={data.cases} 
          title="بيانات القضايا" 
          statusColumn={getStatusColumn('cases')}
        />
      )}
      {data.invoices && (
        <ProfessionalDataTable 
          data={data.invoices} 
          title="بيانات الفواتير" 
          statusColumn={getStatusColumn('invoices')}
        />
      )}
      {data.payments && (
        <ProfessionalDataTable 
          data={data.payments} 
          title="بيانات المدفوعات" 
          statusColumn={getStatusColumn('payments')}
        />
      )}

      {/* Raw Data Fallback */}
      {!data.metrics && !data.summary && !data.employees && !data.vehicles && !data.customers && !data.cases && !data.invoices && !data.payments && (
        <Card className="bg-gradient-card border-0 shadow-card print:bg-white print:border print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle className="arabic-heading-sm print:text-black">بيانات التقرير</CardTitle>
          </CardHeader>
          <CardContent className="print:p-4">
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono print:bg-gray-100 print:text-gray-800">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}