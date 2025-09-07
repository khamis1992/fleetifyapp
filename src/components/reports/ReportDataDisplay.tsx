import React from 'react';
import { ReportKPISection } from './ReportKPISection';
import { ProfessionalDataTable } from './ProfessionalDataTable';

interface ReportDataDisplayProps {
  data: any;
  reportId: string;
  moduleType: string;
}

export function ReportDataDisplay({ data, reportId, moduleType }: ReportDataDisplayProps) {
  // Convert metrics to KPIs format for the 3-card layout
  const convertMetricsToKPIs = (metrics: Record<string, number>) => {
    const entries = Object.entries(metrics);
    const kpis = entries.slice(0, 3).map(([key, value], index) => ({
      label: formatLabel(key),
      value,
      type: getValueType(key),
      color: getCardColor(index)
    }));
    
    // Ensure we always have 3 cards
    while (kpis.length < 3) {
      kpis.push({
        label: 'لا توجد بيانات',
        value: 0,
        type: 'number' as const,
        color: 'gray' as const
      });
    }
    
    return kpis;
  };

  // Helper function to get card colors (following the template pattern)
  const getCardColor = (index: number): 'green' | 'blue' | 'gray' => {
    switch (index) {
      case 0: return 'gray';  // Total
      case 1: return 'green'; // Success/Active
      case 2: return 'blue';  // Amount/Revenue
      default: return 'gray';
    }
  };

  // Helper function to format metric labels
  const formatLabel = (key: string) => {
    const labels: Record<string, string> = {
      totalEmployees: 'إجمالي الموظفين',
      activeEmployees: 'الموظفون النشطون',
      totalVehicles: 'إجمالي المركبات',
      activeVehicles: 'المركبات النشطة',
      totalCustomers: 'إجمالي العملاء',
      activeCustomers: 'العملاء النشطون',
      totalCases: 'إجمالي القضايا',
      activeCases: 'القضايا النشطة',
      totalInvoices: 'إجمالي الفواتير',
      paidInvoices: 'الفواتير المدفوعة',
      totalPayments: 'إجمالي المدفوعات',
      totalRevenue: 'إجمالي المبلغ',
      totalAmount: 'إجمالي المبلغ'
    };
    return labels[key] || key;
  };

  // Helper function to determine value type
  const getValueType = (key: string): 'currency' | 'number' | 'percentage' => {
    if (key.includes('revenue') || key.includes('amount') || key.includes('total') && key.includes('value')) {
      return 'currency';
    }
    if (key.includes('rate') || key.includes('percentage')) {
      return 'percentage';
    }
    return 'number';
  };

  // Check if we have any data to display
  const hasData = data && (
    (data.metrics && Object.keys(data.metrics).length > 0) ||
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

      {/* KPI Cards Section */}
      {data?.metrics ? (
        <ReportKPISection kpis={convertMetricsToKPIs(data.metrics)} />
      ) : (
        <ReportKPISection kpis={[
          { label: 'إجمالي السجلات', value: 0, type: 'number', color: 'gray' },
          { label: 'السجلات النشطة', value: 0, type: 'number', color: 'green' },
          { label: 'إجمالي المبلغ', value: 0, type: 'currency', color: 'blue' }
        ]} />
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
      {data?.employees && data.employees.length > 0 && (
        <ProfessionalDataTable
          data={data.employees}
          title="بيانات الموظفين"
          maxRows={50}
          showRowNumbers={true}
          showTotals={true}
          statusColumn="employment_status"
        />
      )}

      {data?.vehicles && data.vehicles.length > 0 && (
        <ProfessionalDataTable
          data={data.vehicles}
          title="بيانات المركبات"
          maxRows={50}
          showRowNumbers={true}
          showTotals={false}
          statusColumn="status"
        />
      )}

      {data?.customers && data.customers.length > 0 && (
        <ProfessionalDataTable
          data={data.customers}
          title="بيانات العملاء"
          maxRows={50}
          showRowNumbers={true}
          showTotals={false}
          statusColumn="status"
        />
      )}

      {data?.cases && data.cases.length > 0 && (
        <ProfessionalDataTable
          data={data.cases}
          title="بيانات القضايا"
          maxRows={50}
          showRowNumbers={true}
          showTotals={false}
          statusColumn="case_status"
        />
      )}

      {data?.invoices && data.invoices.length > 0 && (
        <ProfessionalDataTable
          data={data.invoices}
          title="بيانات الفواتير"
          maxRows={50}
          showRowNumbers={true}
          showTotals={true}
          statusColumn="payment_status"
        />
      )}

      {data?.payments && data.payments.length > 0 && (
        <ProfessionalDataTable
          data={data.payments}
          title="بيانات المدفوعات"
          maxRows={50}
          showRowNumbers={true}
          showTotals={true}
          statusColumn="status"
        />
      )}
    </div>
  );
}