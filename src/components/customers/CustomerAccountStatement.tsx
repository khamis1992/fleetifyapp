import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, FileText, Download, Filter } from 'lucide-react';
import { useCustomerAccountStatement } from '@/hooks/useCustomerAccountStatement';
import { Customer } from '@/types/customer';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Utility function to format currency
const formatCurrency = (amount: number, currency: string = 'KWD') => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
};

interface CustomerAccountStatementProps {
  customer: Customer;
}

export const CustomerAccountStatement: React.FC<CustomerAccountStatementProps> = ({ customer }) => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: transactions = [], isLoading, refetch } = useCustomerAccountStatement({
    customerCode: customer.customer_code,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    enabled: !!customer.customer_code
  });

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
  };

  const getTransactionTypeBadge = (type: string) => {
    const variants = {
      'invoice': 'destructive',
      'payment': 'default'
    } as const;

    const labels = {
      'invoice': 'فاتورة',
      'payment': 'دفعة'
    };

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'secondary'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
  const netBalance = totalDebit - totalCredit;

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
          <div className="text-center py-4">جارٍ تحميل كشف الحساب...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            كشف حساب العميل
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
              onClick={handleExport}
              disabled={transactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
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
            <div className="flex items-end">
              <Button 
                onClick={() => refetch()}
                className="w-full"
              >
                تطبيق الفلتر
              </Button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">إجمالي المدين</div>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(totalDebit)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">إجمالي الدائن</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCredit)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">الرصيد الصافي</div>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(netBalance))}
              </div>
              <div className="text-xs text-muted-foreground">
                {netBalance >= 0 ? 'مدين' : 'دائن'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد معاملات في الفترة المحددة</p>
            <p className="text-sm mt-2">
              جرب تغيير فترة البحث أو إزالة الفلاتر
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>رقم المرجع</TableHead>
                  <TableHead>مدين</TableHead>
                  <TableHead>دائن</TableHead>
                  <TableHead>الرصيد الجاري</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow key={`${transaction.transaction_id}-${index}`}>
                    <TableCell>
                      {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', {
                        locale: ar
                      })}
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeBadge(transaction.transaction_type)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 rounded">
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
                        <span className="text-green-600 font-medium">
                          {formatCurrency(transaction.credit_amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={
                        transaction.running_balance >= 0 
                          ? 'text-destructive' 
                          : 'text-green-600'
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
        )}
      </CardContent>
    </Card>
  );
};