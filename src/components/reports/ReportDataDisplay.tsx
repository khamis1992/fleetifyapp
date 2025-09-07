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
  data: {
    data: any[];
    summary: Record<string, any>;
  };
  reportId: string;
  moduleType: string;
}

export function ReportDataDisplay({ data, reportId, moduleType }: ReportDataDisplayProps) {
  if (!data || (!data.data?.length && !Object.keys(data.summary || {}).length)) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">لا توجد بيانات متاحة لهذا التقرير</p>
      </div>
    );
  }

  const { formatCurrency } = useCurrencyFormatter();

  const getColumnTranslation = (column: string, moduleType: string) => {
    const translations: Record<string, Record<string, string>> = {
      hr: {
        id: 'المعرف',
        first_name: 'الاسم الأول',
        last_name: 'اسم العائلة',
        email: 'البريد الإلكتروني',
        phone: 'رقم الهاتف',
        department: 'القسم',
        position: 'المنصب',
        account_status: 'حالة الحساب',
        basic_salary: 'الراتب الأساسي',
        allowances: 'البدلات',
        deductions: 'الخصومات',
        hire_date: 'تاريخ التوظيف',
        created_at: 'تاريخ الإنشاء'
      },
      fleet: {
        id: 'المعرف',
        plate_number: 'رقم اللوحة',
        make: 'الصانع',
        model: 'الموديل',
        year: 'السنة',
        status: 'الحالة',
        mileage: 'عدد الكيلومترات',
        daily_rate: 'الأجرة اليومية',
        created_at: 'تاريخ الإنشاء'
      },
      customers: {
        id: 'المعرف',
        name: 'الاسم',
        email: 'البريد الإلكتروني',
        phone: 'رقم الهاتف',
        civil_id: 'الرقم المدني',
        is_active: 'نشط',
        created_at: 'تاريخ الإنشاء'
      },
      legal: {
        id: 'المعرف',
        case_title: 'عنوان القضية',
        case_number: 'رقم القضية',
        case_status: 'حالة القضية',
        case_type: 'نوع القضية',
        client_name: 'اسم العميل',
        created_at: 'تاريخ الإنشاء'
      },
      finance: {
        id: 'المعرف',
        invoice_number: 'رقم الفاتورة',
        customer_name: 'اسم العميل',
        total_amount: 'المبلغ الإجمالي',
        status: 'الحالة',
        due_date: 'تاريخ الاستحقاق',
        amount: 'المبلغ',
        payment_method: 'طريقة الدفع',
        created_at: 'تاريخ الإنشاء'
      }
    };
    return translations[moduleType]?.[column] || column;
  };

  const formatCellValue = (value: any, column: string) => {
    if (value === null || value === undefined) return '-';
    
    if (column.includes('amount') || column.includes('salary') || column.includes('rate')) {
      return formatCurrency(Number(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    if (column.includes('date') || column.includes('_at')) {
      return new Date(value).toLocaleDateString('ar-KW');
    }
    
    if (typeof value === 'boolean') {
      return value ? 'نعم' : 'لا';
    }
    
    return String(value);
  };

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

  const renderDataTable = (items: any[], title: string) => {
    if (!items || items.length === 0) return null;

    const firstItem = items[0];
    const columns = Object.keys(firstItem).filter(col => col !== 'company_id');

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
                      {getColumnTranslation(column, moduleType)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 10).map((item, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    {columns.map((column) => (
                      <td key={column} className="p-2">
                        {formatCellValue(item[column], column)}
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

  const getReportTableTitle = () => {
    const titles: Record<string, Record<string, string>> = {
      hr: {
        employees_summary: 'بيانات الموظفين',
        payroll_summary: 'بيانات الرواتب'
      },
      fleet: {
        vehicles_summary: 'بيانات المركبات',
        maintenance_summary: 'بيانات الصيانة'
      },
      customers: {
        customers_summary: 'بيانات العملاء'
      },
      legal: {
        cases_summary: 'بيانات القضايا'
      },
      finance: {
        invoices_summary: 'بيانات الفواتير',
        payments_summary: 'بيانات المدفوعات'
      }
    };
    return titles[moduleType]?.[reportId] || 'بيانات التقرير';
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {data.summary && Object.keys(data.summary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ملخص الإحصائيات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.summary).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{getColumnTranslation(key, moduleType)}</p>
                  <p className="text-xl font-bold">{formatCellValue(value, key)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Data Table */}
      {data.data && data.data.length > 0 && renderDataTable(data.data, getReportTableTitle())}

      {/* Fallback for empty data */}
      {(!data.data || data.data.length === 0) && (!data.summary || Object.keys(data.summary).length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>بيانات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد بيانات متاحة لهذا التقرير</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}