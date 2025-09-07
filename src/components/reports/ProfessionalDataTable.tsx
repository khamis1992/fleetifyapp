import React from 'react';
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
  showTotals = false,
  statusColumn 
}: ProfessionalDataTableProps) {
  const { formatCurrency } = useCurrencyFormatter();

  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);
  const displayData = data.slice(0, maxRows);

  const formatCellValue = (value: any, header: string): string => {
    if (value === null || value === undefined) return '-';
    
    if (typeof value === 'number') {
      if (isCurrencyColumn(header)) {
        return formatCurrency(value);
      }
      return value.toLocaleString('ar-SA');
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString('ar-SA');
    }
    
    return String(value);
  };

  const formatColumnName = (column: string): string => {
    const columnMap: Record<string, string> = {
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
    
    return columnMap[column] || column;
  };

  const isNumericColumn = (column: string, data: any[]): boolean => {
    return data.some(item => typeof item[column] === 'number');
  };

  const isCurrencyColumn = (column: string): boolean => {
    const currencyColumns = ['amount', 'total', 'salary', 'cost', 'price', 'paid'];
    return currencyColumns.some(curr => column.toLowerCase().includes(curr));
  };

  const getSimpleStatus = (status: string) => {
    const statusLower = status?.toLowerCase();
    
    switch (statusLower) {
      case 'active':
      case 'نشط':
      case 'paid':
      case 'مدفوع':
      case 'completed':
      case 'مكتمل':
        return <span className="text-green-700 font-medium">{status}</span>;
      case 'inactive':
      case 'غير نشط':
      case 'unpaid':
      case 'غير مدفوع':
      case 'cancelled':
      case 'ملغي':
        return <span className="text-red-700 font-medium">{status}</span>;
      case 'pending':
      case 'معلق':
      case 'in_progress':
      case 'قيد التنفيذ':
        return <span className="text-yellow-700 font-medium">{status}</span>;
      default:
        return <span className="text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 print:shadow-none print:mb-4">
      <div className="p-4 border-b border-gray-200 print:p-3">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 print:bg-gray-100">
              {showRowNumbers && (
                <th className="text-right p-3 text-sm font-semibold text-gray-700 border-b border-gray-200">
                  #
                </th>
              )}
              {headers.map((header, index) => (
                <th key={index} className="text-right p-3 text-sm font-semibold text-gray-700 border-b border-gray-200">
                  {formatColumnName(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((item, index) => (
              <tr key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} print:even:bg-gray-50`}>
                {showRowNumbers && (
                  <td className="p-3 text-sm text-gray-800">
                    {index + 1}
                  </td>
                )}
                {headers.map((header, cellIndex) => (
                  <td key={cellIndex} className="p-3 text-sm text-gray-800">
                    {statusColumn && header === statusColumn ? (
                      getSimpleStatus(item[header])
                    ) : (
                      formatCellValue(item[header], header)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {data.length > maxRows && (
        <div className="p-3 bg-gray-100 border-t border-gray-200 text-sm text-gray-600 text-center">
          عرض {maxRows} من أصل {data.length} سجل
        </div>
      )}
    </div>
  );
}