import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  FileText, 
  Download, 
  Filter, 
  Printer,
  RefreshCw,
  Mail,
  Settings,
  Eye,
  BarChart3
} from 'lucide-react';
import { useCustomerAccountStatement } from '@/hooks/useCustomerAccountStatement';
import { Customer } from '@/types/customer';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

// Professional currency formatting for accounting
const formatCurrency = (amount: number, currency: string = 'KWD') => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
};

// Professional date formatting
const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ar });
  } catch {
    return dateStr;
  }
};

interface CustomerAccountStatementProps {
  customer: Customer;
}

export const CustomerAccountStatement: React.FC<CustomerAccountStatementProps> = ({ customer }) => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: transactions = [], isLoading, refetch, error } = useCustomerAccountStatement({
    customerCode: customer.customer_code,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    enabled: !!customer.customer_code
  });

  // Professional export functionality
  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    if (transactions.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    setIsExporting(true);
    
    try {
      const customerName = customer.customer_type === 'corporate' 
        ? customer.company_name 
        : `${customer.first_name} ${customer.last_name}`;

      const fileName = `كشف_حساب_${customerName}_${customer.customer_code}_${new Date().getTime()}`;
      
      if (format === 'csv') {
        const csvContent = [
          // Header row
          'التاريخ,النوع,الوصف,رقم المرجع,مدين,دائن,الرصيد الجاري',
          // Data rows
          ...transactions.map(t => [
            formatDate(t.transaction_date),
            getTransactionTypeLabel(t.transaction_type),
            t.description.replace(/,/g, ';'), // Escape commas
            t.reference_number,
            t.debit_amount || 0,
            t.credit_amount || 0,
            t.running_balance
          ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        link.click();
        
        toast.success('تم تصدير الكشف بصيغة CSV بنجاح');
      } else {
        // For Excel/PDF, we'll implement later or integrate with a reporting service
        toast.info(`تصدير بصيغة ${format.toUpperCase()} سيتم إضافته قريباً`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  // Professional print functionality
  const handlePrint = () => {
    const customerName = customer.customer_type === 'corporate' 
      ? customer.company_name 
      : `${customer.first_name} ${customer.last_name}`;

    const printContent = `
      <html>
        <head>
          <title>كشف حساب العميل - ${customerName}</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-top: 20px; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>كشف حساب العميل</h1>
            <h2>${customerName}</h2>
            <p>كود العميل: ${customer.customer_code}</p>
            ${dateFrom || dateTo ? `<p>الفترة: ${dateFrom ? formatDate(dateFrom) : ''} - ${dateTo ? formatDate(dateTo) : ''}</p>` : ''}
            <p>تاريخ الطباعة: ${formatDate(new Date().toISOString())}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>الوصف</th>
                <th>رقم المرجع</th>
                <th>مدين</th>
                <th>دائن</th>
                <th>الرصيد الجاري</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${formatDate(t.transaction_date)}</td>
                  <td>${getTransactionTypeLabel(t.transaction_type)}</td>
                  <td>${t.description}</td>
                  <td>${t.reference_number}</td>
                  <td>${t.debit_amount > 0 ? formatCurrency(t.debit_amount) : ''}</td>
                  <td>${t.credit_amount > 0 ? formatCurrency(t.credit_amount) : ''}</td>
                  <td>${formatCurrency(Math.abs(t.running_balance))} ${t.running_balance >= 0 ? 'مدين' : 'دائن'}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4"><strong>الإجماليات</strong></td>
                <td><strong>${formatCurrency(totalDebit)}</strong></td>
                <td><strong>${formatCurrency(totalCredit)}</strong></td>
                <td><strong>${formatCurrency(Math.abs(netBalance))} ${netBalance >= 0 ? 'مدين' : 'دائن'}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div class="summary">
            <h3>ملخص الحساب</h3>
            <p>إجمالي المدين: ${formatCurrency(totalDebit)}</p>
            <p>إجمالي الدائن: ${formatCurrency(totalCredit)}</p>
            <p>الرصيد الصافي: ${formatCurrency(Math.abs(netBalance))} ${netBalance >= 0 ? 'مدين' : 'دائن'}</p>
            <p>عدد المعاملات: ${transactions.length}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      toast.success('تم إعداد الكشف للطباعة');
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    const variants = {
      'invoice': 'destructive',
      'payment': 'default',
      'journal_debit': 'secondary',
      'journal_credit': 'outline',
      'opening_balance': 'secondary'
    } as const;

    const labels = {
      'invoice': 'فاتورة',
      'payment': 'دفعة',
      'journal_debit': 'قيد مدين',
      'journal_credit': 'قيد دائن',
      'opening_balance': 'رصيد افتتاحي'
    };

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'secondary'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      'invoice': 'فاتورة',
      'payment': 'دفعة',
      'journal_debit': 'قيد مدين',
      'journal_credit': 'قيد دائن',
      'opening_balance': 'رصيد افتتاحي'
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Professional financial calculations
  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
  const netBalance = totalDebit - totalCredit;

  // Get customer name for display
  const customerName = customer.customer_type === 'corporate' 
    ? customer.company_name 
    : `${customer.first_name} ${customer.last_name}`;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            كشف حساب العميل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">جارٍ تحميل كشف الحساب...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            كشف حساب العميل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-destructive text-lg mb-4">⚠️ خطأ في تحميل البيانات</div>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-6 w-6" />
                كشف حساب العميل
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {customerName} - كود العميل: {customer.customer_code}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                فلترة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={transactions.length === 0}
              >
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={transactions.length === 0 || isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'جاري التصدير...' : 'تصدير CSV'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">من تاريخ</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">إلى تاريخ</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={() => refetch()}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  تطبيق الفلتر
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    refetch();
                  }}
                >
                  مسح
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Professional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">إجمالي المدين</div>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalDebit)}
            </div>
            <div className="text-xs text-muted-foreground">
              المبالغ المستحقة على العميل
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">إجمالي الدائن</div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalCredit)}
            </div>
            <div className="text-xs text-muted-foreground">
              المدفوعات المستلمة
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">الرصيد الصافي</div>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatCurrency(Math.abs(netBalance))}
            </div>
            <div className="text-xs text-muted-foreground">
              {netBalance >= 0 ? 'مدين للشركة' : 'دائن للعميل'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">عدد المعاملات</div>
            <div className="text-2xl font-bold text-accent-foreground">
              {transactions.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {dateFrom || dateTo ? 'في الفترة المحددة' : 'إجمالي المعاملات'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            تفاصيل المعاملات المالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                لا توجد معاملات مالية
              </h3>
              <p className="text-sm text-muted-foreground">
                {dateFrom || dateTo 
                  ? 'لا توجد معاملات في الفترة المحددة'
                  : 'لم يتم تسجيل أي معاملات مالية لهذا العميل'
                }
              </p>
              {(dateFrom || dateTo) && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    refetch();
                  }}
                >
                  عرض جميع المعاملات
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">التاريخ</TableHead>
                      <TableHead className="font-bold">النوع</TableHead>
                      <TableHead className="font-bold">الوصف</TableHead>
                      <TableHead className="font-bold">رقم المرجع</TableHead>
                      <TableHead className="font-bold text-right">مدين</TableHead>
                      <TableHead className="font-bold text-right">دائن</TableHead>
                      <TableHead className="font-bold text-right">الرصيد الجاري</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction, index) => (
                      <TableRow 
                        key={`${transaction.transaction_id}-${index}`}
                        className={`hover:bg-muted/50 ${
                          transaction.transaction_type === 'opening_balance' ? 'bg-accent/10 font-medium' : ''
                        }`}
                      >
                        <TableCell className="font-medium">
                          {formatDate(transaction.transaction_date)}
                        </TableCell>
                        <TableCell>
                          {getTransactionTypeBadge(transaction.transaction_type)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs" title={transaction.description}>
                            {transaction.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {transaction.reference_number}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.debit_amount > 0 && (
                            <span className="text-destructive font-medium">
                              {formatCurrency(transaction.debit_amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.credit_amount > 0 && (
                            <span className="text-emerald-600 font-medium">
                              {formatCurrency(transaction.credit_amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={
                            transaction.running_balance >= 0 
                              ? 'text-destructive' 
                              : 'text-emerald-600'
                          }>
                            {formatCurrency(Math.abs(transaction.running_balance))}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            {transaction.running_balance >= 0 ? 'مدين' : 'دائن'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Professional Summary Footer */}
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">إجمالي المدين</div>
                  <div className="text-lg font-bold text-destructive">
                    {formatCurrency(totalDebit)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">إجمالي الدائن</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {formatCurrency(totalCredit)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">الرصيد النهائي</div>
                  <div className={`text-lg font-bold ${
                    netBalance >= 0 ? 'text-destructive' : 'text-emerald-600'
                  }`}>
                    {formatCurrency(Math.abs(netBalance))} 
                    <span className="text-sm ml-1">
                      {netBalance >= 0 ? 'مدين' : 'دائن'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};