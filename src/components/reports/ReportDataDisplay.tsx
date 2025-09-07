import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ReportKPISection } from './ReportKPISection';
import { ProfessionalDataTable } from './ProfessionalDataTable';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

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
    const entries = Object.entries(metrics);
    const mainKPIs = [];

    // Create 3 main KPIs based on module type
    if (moduleType === 'invoices') {
      mainKPIs.push(
        { label: 'إجمالي الفواتير', value: metrics.totalInvoices || 0, type: 'number' as const, color: 'gray' as const },
        { label: 'الفواتير المدفوعة', value: metrics.paidInvoices || 0, type: 'number' as const, color: 'green' as const },
        { label: 'إجمالي المبلغ', value: metrics.totalAmount || 0, type: 'currency' as const, color: 'blue' as const }
      );
    } else if (moduleType === 'employees') {
      mainKPIs.push(
        { label: 'إجمالي الموظفين', value: metrics.totalEmployees || 0, type: 'number' as const, color: 'gray' as const },
        { label: 'الموظفين النشطين', value: metrics.activeEmployees || 0, type: 'number' as const, color: 'green' as const },
        { label: 'معدل الحضور', value: metrics.attendanceRate || 0, type: 'percentage' as const, color: 'blue' as const }
      );
    } else if (moduleType === 'vehicles') {
      mainKPIs.push(
        { label: 'إجمالي المركبات', value: metrics.totalVehicles || 0, type: 'number' as const, color: 'gray' as const },
        { label: 'المركبات النشطة', value: metrics.activeVehicles || 0, type: 'number' as const, color: 'green' as const },
        { label: 'كفاءة الأسطول', value: metrics.fleetEfficiency || 0, type: 'percentage' as const, color: 'blue' as const }
      );
    } else {
      // Default KPIs for other modules
      const firstThree = entries.slice(0, 3);
      firstThree.forEach(([key, value], index) => {
        const colors = ['gray', 'green', 'blue'] as const;
        mainKPIs.push({
          label: formatLabel(key),
          value,
          type: getValueType(key) as 'currency' | 'number' | 'percentage',
          color: colors[index % 3]
        });
      });
    }

    return mainKPIs;
  };

  const formatLabel = (key: string): string => {
    const labelMap: Record<string, string> = {
      totalEmployees: 'إجمالي الموظفين',
      activeEmployees: 'الموظفين النشطين',
      totalVehicles: 'إجمالي المركبات',
      activeVehicles: 'المركبات النشطة',
      totalCustomers: 'إجمالي العملاء',
      activeCustomers: 'العملاء النشطين',
      totalCases: 'إجمالي القضايا',
      activeCases: 'القضايا النشطة',
      totalInvoices: 'إجمالي الفواتير',
      totalAmount: 'إجمالي المبلغ',
      paidInvoices: 'الفواتير المدفوعة',
      totalPayments: 'إجمالي المدفوعات',
      revenue: 'الإيرادات',
      expenses: 'المصروفات',
      profit: 'الربح',
      growth: 'النمو'
    };
    return labelMap[key] || key;
  };

  const getValueType = (key: string): string => {
    const currencyKeys = ['totalAmount', 'revenue', 'expenses', 'profit'];
    const percentageKeys = ['growth', 'attendanceRate', 'fleetEfficiency'];
    
    if (currencyKeys.includes(key)) return 'currency';
    if (percentageKeys.includes(key)) return 'percentage';
    return 'number';
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

  // Check if we have any data to display
  const hasData = data && (
    data.metrics || 
    data.summary || 
    (data.employees && data.employees.length > 0) ||
    (data.vehicles && data.vehicles.length > 0) ||
    (data.customers && data.customers.length > 0) ||
    (data.cases && data.cases.length > 0) ||
    (data.invoices && data.invoices.length > 0) ||
    (data.payments && data.payments.length > 0)
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Filters Section */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">معايير التصفية</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500">
          لا توجد بيانات عرض
        </div>
      </section>

      {/* KPI Section */}
      {data.metrics && (
        <ReportKPISection 
          kpis={convertMetricsToKPIs(data.metrics)}
        />
      )}

      {/* No Data Alert */}
      {!hasData && (
        <section className="mb-6">
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center text-gray-600 font-medium">
            لا توجد سجلات متاحة للفترة المحددة
          </div>
        </section>
      )}

      {/* Data Tables */}
      {data.employees && data.employees.length > 0 && (
        <ProfessionalDataTable 
          data={data.employees} 
          title="بيانات الموظفين"
          statusColumn={getStatusColumn(moduleType)}
        />
      )}
      
      {data.vehicles && data.vehicles.length > 0 && (
        <ProfessionalDataTable 
          data={data.vehicles} 
          title="بيانات المركبات"
          statusColumn={getStatusColumn(moduleType)}
        />
      )}
      
      {data.customers && data.customers.length > 0 && (
        <ProfessionalDataTable 
          data={data.customers} 
          title="بيانات العملاء"
          statusColumn={getStatusColumn(moduleType)}
        />
      )}
      
      {data.cases && data.cases.length > 0 && (
        <ProfessionalDataTable 
          data={data.cases} 
          title="بيانات القضايا"
          statusColumn={getStatusColumn(moduleType)}
        />
      )}
      
      {data.invoices && data.invoices.length > 0 && (
        <ProfessionalDataTable 
          data={data.invoices} 
          title="بيانات الفواتير"
          statusColumn={getStatusColumn(moduleType)}
        />
      )}
      
      {data.payments && data.payments.length > 0 && (
        <ProfessionalDataTable 
          data={data.payments} 
          title="بيانات المدفوعات"
          statusColumn={getStatusColumn(moduleType)}
        />
      )}
    </div>
  );
}