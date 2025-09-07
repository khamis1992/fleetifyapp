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
        return formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return value.toLocaleString('ar-KW');
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
    <Card className="mt-6 bg-gradient-card border-0 shadow-card print:bg-white print:border print:shadow-none">
      <CardHeader className="print:pb-2">
        <CardTitle className="flex items-center gap-2 arabic-heading-sm print:text-black">
          <Hash className="w-5 h-5 text-primary" />
          {title}
          <Badge variant="secondary" className="mr-auto print:bg-gray-100 print:text-gray-800">
            {data.length} عنصر
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="print:p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border/30 print:border-b-2 print:border-gray-300">
                {showRowNumbers && (
                  <th className="text-center p-3 font-semibold text-muted-foreground print:text-gray-700">
                    #
                  </th>
                )}
                {columns.map((column) => (
                  <th key={column} className="text-right p-3 font-semibold text-foreground print:text-black">
                    {formatColumnName(column)}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {displayedData.map((item, index) => (
                <tr 
                  key={index} 
                  className={`border-b border-border/20 hover:bg-card-hover transition-colors print:hover:bg-transparent print:border-b print:border-gray-200 ${
                    index % 2 === 0 ? 'bg-muted/20 print:bg-gray-50' : 'bg-background print:bg-white'
                  }`}
                >
                  {showRowNumbers && (
                    <td className="text-center p-3 font-medium text-muted-foreground print:text-gray-600">
                      {index + 1}
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column} className="p-3 text-foreground print:text-black">
                      {column === statusColumn ? (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item[column])}
                          {getStatusBadge(item[column])}
                        </div>
                      ) : column.toLowerCase().includes('status') || column.toLowerCase().includes('حالة') ? (
                        getStatusBadge(item[column])
                      ) : (
                        formatCellValue(item[column], column)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            
            {showTotals && (
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-accent/10 print:bg-gray-100 print:border-t-2 print:border-gray-400">
                  {showRowNumbers && (
                    <td className="p-3 font-semibold text-center print:text-black">
                      <Calculator className="w-4 h-4 mx-auto text-primary" />
                    </td>
                  )}
                  {columns.map((column, colIndex) => (
                    <td key={column} className="p-3 font-semibold text-foreground print:text-black">
                      {colIndex === 0 ? (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span>الإجمالي</span>
                        </div>
                      ) : isNumericColumn(column) ? (
                        formatCellValue(calculateTotal(column), column)
                      ) : (
                        '-'
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
          
          {data.length > maxRows && (
            <div className="text-center mt-4 p-3 bg-muted/30 rounded-lg print:bg-gray-100">
              <Badge variant="outline" className="print:bg-white print:text-gray-700">
                <Hash className="w-3 h-3 ml-1" />
                عرض {maxRows} من أصل {data.length} عنصر
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}