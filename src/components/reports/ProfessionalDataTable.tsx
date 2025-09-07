import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  XCircle, 
  Hash,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface ProfessionalDataTableProps {
  data: any[];
  title: string;
  maxRows?: number;
  showRowNumbers?: boolean;
  showTotals?: boolean;
  statusColumn?: string;
}

export function ProfessionalDataTable({ 
  data, 
  title, 
  maxRows = 10, 
  showRowNumbers = true,
  showTotals = true,
  statusColumn 
}: ProfessionalDataTableProps) {
  const { formatCurrency } = useCurrencyFormatter();

  if (!data || data.length === 0) return null;

  const firstItem = data[0];
  const columns = Object.keys(firstItem);
  const displayedData = data.slice(0, maxRows);

  const getStatusIcon = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    
    if (lowerStatus.includes('نشط') || lowerStatus.includes('مكتمل') || lowerStatus.includes('مدفوع')) {
      return <CheckCircle className="w-4 h-4 text-success" />;
    } else if (lowerStatus.includes('معلق') || lowerStatus.includes('قيد') || lowerStatus.includes('مؤجل')) {
      return <Clock className="w-4 h-4 text-warning" />;
    } else if (lowerStatus.includes('ملغي') || lowerStatus.includes('مرفوض') || lowerStatus.includes('متوقف')) {
      return <XCircle className="w-4 h-4 text-destructive" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    
    if (lowerStatus.includes('نشط') || lowerStatus.includes('مكتمل') || lowerStatus.includes('مدفوع')) {
      return <Badge variant="default" className="bg-success/10 text-success border-success/20 print:bg-green-100 print:text-green-800">{status}</Badge>;
    } else if (lowerStatus.includes('معلق') || lowerStatus.includes('قيد') || lowerStatus.includes('مؤجل')) {
      return <Badge variant="default" className="bg-warning/10 text-warning border-warning/20 print:bg-yellow-100 print:text-yellow-800">{status}</Badge>;
    } else if (lowerStatus.includes('ملغي') || lowerStatus.includes('مرفوض') || lowerStatus.includes('متوقف')) {
      return <Badge variant="destructive" className="print:bg-red-100 print:text-red-800">{status}</Badge>;
    } else {
      return <Badge variant="secondary" className="print:bg-gray-100 print:text-gray-800">{status}</Badge>;
    }
  };

  const calculateTotal = (column: string) => {
    return data.reduce((sum, item) => {
      const value = item[column];
      return typeof value === 'number' ? sum + value : sum;
    }, 0);
  };

  const isNumericColumn = (column: string) => {
    return data.some(item => typeof item[column] === 'number');
  };

  const isCurrencyColumn = (column: string) => {
    return column.includes('amount') || column.includes('total') || column.includes('price') || 
           column.includes('cost') || column.includes('salary') || column.includes('paid');
  };

  const formatCellValue = (value: any, column: string) => {
    if (typeof value === 'number') {
      if (isCurrencyColumn(column)) {
        return `${value.toLocaleString('ar-SA')} ر.ق`;
      }
      return value.toLocaleString('ar-SA');
    }
    return String(value || '');
  };

  const formatColumnName = (column: string) => {
    const columnTranslations: Record<string, string> = {
      'id': 'المعرف',
      'name': 'الاسم',
      'status': 'الحالة',
      'amount': 'المبلغ',
      'total': 'الإجمالي',
      'date': 'التاريخ',
      'created_at': 'تاريخ الإنشاء',
      'updated_at': 'تاريخ التحديث',
      'employee_name': 'اسم الموظف',
      'vehicle_number': 'رقم المركبة',
      'customer_name': 'اسم العميل',
      'contract_number': 'رقم العقد',
      'invoice_number': 'رقم الفاتورة',
      'payment_amount': 'مبلغ الدفع',
      'salary': 'الراتب',
      'position': 'المنصب',
      'department': 'القسم'
    };
    
    return columnTranslations[column] || column;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 no-break">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {showRowNumbers && (
                <th className="text-right p-3 text-sm font-medium text-gray-600">
                  #
                </th>
              )}
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  className="text-right p-3 text-sm font-medium text-gray-600"
                >
                  {formatColumnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedData.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={`border-b border-gray-100 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                {showRowNumbers && (
                  <td className="p-3 text-sm text-gray-600">
                    {rowIndex + 1}
                  </td>
                )}
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="p-3 text-sm text-gray-800">
                    {statusColumn === column ? 
                      String(row[column] || '') : 
                      formatCellValue(row[column], column)
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          
          {/* Totals Row */}
          {showTotals && (
            <tfoot className="border-t-2 border-gray-300">
              <tr className="bg-gray-100">
                {showRowNumbers && (
                  <td className="p-3 text-sm font-semibold text-gray-800">
                    المجموع
                  </td>
                )}
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="p-3 text-sm font-semibold text-gray-800">
                    {colIndex === 0 && !showRowNumbers ? 'المجموع' : 
                     isNumericColumn(column) ? formatCellValue(calculateTotal(column), column) : 
                     isCurrencyColumn(column) ? formatCellValue(calculateTotal(column), column) : 
                     '-'}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      
      {/* Summary if data is truncated */}
      {data.length > maxRows && (
        <div className="m-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-sm text-gray-600">
            يتم عرض {maxRows} من أصل {data.length} سجل. 
            العدد المخفي: {data.length - maxRows} سجل إضافي.
          </p>
        </div>
      )}
    </div>
  );
}