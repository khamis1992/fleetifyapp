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
  Minus
} from 'lucide-react';
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

  const renderMetrics = (metrics: Record<string, number>) => {
    const getIcon = (key: string) => {
      if (key.includes('employee') || key.includes('staff')) return Users;
      if (key.includes('amount') || key.includes('total') || key.includes('paid')) return DollarSign;
      if (key.includes('vehicle') || key.includes('car')) return Car;
      if (key.includes('customer') || key.includes('client')) return Building;
      if (key.includes('case') || key.includes('legal')) return Scale;
      return TrendingUp;
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

    const formatValue = (key: string, value: number) => {
      if (key.includes('amount') || key.includes('salary') || key.includes('cost') || key.includes('paid') || (key.includes('total') && key.includes('payment'))) {
        return formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return value.toLocaleString('ar-KW');
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(metrics).map(([key, value]) => {
          const Icon = getIcon(key);
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{formatLabel(key)}</p>
                    <p className="text-lg font-semibold">{formatValue(key, value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderTable = (items: any[], title: string) => {
    if (!items || items.length === 0) return null;

    const firstItem = items[0];
    const columns = Object.keys(firstItem);

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {columns.map((column) => (
                    <th key={column} className="text-right p-2 font-medium text-muted-foreground">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 10).map((item, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    {columns.map((column) => (
                      <td key={column} className="p-2">
                          {typeof item[column] === 'number' && column.includes('amount') 
                          ? formatCurrency(item[column] as number, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : String(item[column])
                          }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length > 10 && (
              <div className="text-center mt-4">
                <Badge variant="secondary">
                  عرض 10 من أصل {items.length} عنصر
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      {data.metrics && renderMetrics(data.metrics)}
      
      {/* Summary Stats */}
      {data.summary && (
        <Card>
          <CardHeader>
            <CardTitle>ملخص الإحصائيات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.summary).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{key}</p>
                  <p className="text-xl font-bold">{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Tables */}
      {data.employees && renderTable(data.employees, 'بيانات الموظفين')}
      {data.vehicles && renderTable(data.vehicles, 'بيانات المركبات')}
      {data.customers && renderTable(data.customers, 'بيانات العملاء')}
      {data.cases && renderTable(data.cases, 'بيانات القضايا')}
      {data.invoices && renderTable(data.invoices, 'بيانات الفواتير')}
      {data.payments && renderTable(data.payments, 'بيانات المدفوعات')}

      {/* Raw Data Fallback */}
      {!data.metrics && !data.summary && !data.employees && !data.vehicles && !data.customers && !data.cases && !data.invoices && !data.payments && (
        <Card>
          <CardHeader>
            <CardTitle>بيانات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}