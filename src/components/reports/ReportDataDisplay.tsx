import React from 'react';
import { SimpleReportSummary } from './SimpleReportSummary';
import { SimpleDataTable } from './SimpleDataTable';
import { NoDataMessage } from './NoDataMessage';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface ReportDataDisplayProps {
  data: any;
  reportId: string;
  moduleType: string;
}

export function ReportDataDisplay({ data, reportId, moduleType }: ReportDataDisplayProps) {
  const { formatCurrency } = useCurrencyFormatter();

  if (!data) {
    return <NoDataMessage message="لا توجد بيانات متاحة لهذا التقرير" />;
  }

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

  const generateSummaryCards = (metrics: Record<string, number>) => {
    const entries = Object.entries(metrics);
    const cards = [];

    // Take first 3 entries and format them appropriately
    for (let i = 0; i < Math.min(3, entries.length); i++) {
      const [key, value] = entries[i];
      let color: 'gray' | 'green' | 'blue' = 'gray';
      
      if (key.includes('paid') || key.includes('active') || key.includes('resolved')) {
        color = 'green';
      } else if (key.includes('amount') || key.includes('total')) {
        color = 'blue';
      }

      cards.push({
        title: formatLabel(key),
        value: value,
        color: color
      });
    }

    return cards;
  };

  // Check if there's any data to display
  const hasData = data.metrics || data.summary || data.employees || data.vehicles || 
                  data.customers || data.cases || data.invoices || data.payments;

  if (!hasData) {
    return <NoDataMessage />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - 3 cards maximum */}
      {data.metrics && (
        <SimpleReportSummary cards={generateSummaryCards(data.metrics)} />
      )}
      
      {/* Data Tables */}
      {data.employees && <SimpleDataTable data={data.employees} title="بيانات الموظفين" />}
      {data.vehicles && <SimpleDataTable data={data.vehicles} title="بيانات المركبات" />}
      {data.customers && <SimpleDataTable data={data.customers} title="بيانات العملاء" />}
      {data.cases && <SimpleDataTable data={data.cases} title="بيانات القضايا" />}
      {data.invoices && <SimpleDataTable data={data.invoices} title="بيانات الفواتير" />}
      {data.payments && <SimpleDataTable data={data.payments} title="بيانات المدفوعات" />}
    </div>
  );
}