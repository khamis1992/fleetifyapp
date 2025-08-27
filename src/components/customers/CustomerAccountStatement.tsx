import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, FileDownIcon, PrinterIcon, SearchIcon } from 'lucide-react';
import { useCustomerAccountStatement } from '@/hooks/useCustomerAccountStatement';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CustomerAccountStatementProps {
  customerCode?: string;
  onCustomerCodeChange?: (code: string) => void;
}

export const CustomerAccountStatement = ({ 
  customerCode: initialCustomerCode,
  onCustomerCodeChange 
}: CustomerAccountStatementProps) => {
  const [customerCode, setCustomerCode] = useState(initialCustomerCode || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStatement, setShowStatement] = useState(false);

  const { data: transactions, isLoading, error } = useCustomerAccountStatement({
    customerCode: showStatement ? customerCode : undefined,
    dateFrom,
    dateTo,
    enabled: showStatement && !!customerCode
  });

  const handleSearch = () => {
    if (customerCode.trim()) {
      setShowStatement(true);
      onCustomerCodeChange?.(customerCode);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!transactions || transactions.length === 0) return;

    const csvContent = [
      ['التاريخ', 'النوع', 'الوصف', 'المرجع', 'مدين', 'دائن', 'الرصيد'].join(','),
      ...transactions.map(transaction => [
        transaction.transaction_date,
        transaction.transaction_type === 'payment' ? 'دفعة' : 'فاتورة',
        transaction.description,
        transaction.reference_number,
        transaction.debit_amount || '',
        transaction.credit_amount || '',
        transaction.running_balance
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customer-statement-${customerCode}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalDebits = transactions?.reduce((sum, t) => sum + (t.debit_amount || 0), 0) || 0;
  const totalCredits = transactions?.reduce((sum, t) => sum + (t.credit_amount || 0), 0) || 0;
  const finalBalance = transactions?.[transactions.length - 1]?.running_balance || 0;

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">
            كشف حساب العميل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerCode">كود العميل</Label>
              <Input
                id="customerCode"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="CUST-24-IND-001"
                className="font-mono"
              />
            </div>
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
                onClick={handleSearch}
                className="w-full"
                disabled={!customerCode.trim()}
              >
                <SearchIcon className="w-4 h-4 mr-2" />
                عرض الكشف
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statement Section */}
      {showStatement && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">
                كشف حساب العميل: {customerCode}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <PrinterIcon className="w-4 h-4 mr-2" />
                  طباعة
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <FileDownIcon className="w-4 h-4 mr-2" />
                  تصدير
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                جاري تحميل البيانات...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                خطأ في تحميل البيانات: {error.message}
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد حركات مالية لهذا العميل في الفترة المحددة
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">إجمالي المدين</div>
                    <div className="text-lg font-semibold text-destructive">
                      {totalDebits.toFixed(3)} د.ك
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">إجمالي الدائن</div>
                    <div className="text-lg font-semibold text-green-600">
                      {totalCredits.toFixed(3)} د.ك
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">الرصيد النهائي</div>
                    <div className={`text-lg font-semibold ${finalBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {finalBalance.toFixed(3)} د.ك
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الوصف</TableHead>
                        <TableHead className="text-right">المرجع</TableHead>
                        <TableHead className="text-right">مدين</TableHead>
                        <TableHead className="text-right">دائن</TableHead>
                        <TableHead className="text-right">الرصيد</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction, index) => (
                        <TableRow key={`${transaction.transaction_id}-${index}`}>
                          <TableCell>
                            {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.transaction_type === 'payment' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {transaction.transaction_type === 'payment' ? 'دفعة' : 'فاتورة'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {transaction.reference_number}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {transaction.debit_amount ? `${transaction.debit_amount.toFixed(3)} د.ك` : '-'}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {transaction.credit_amount ? `${transaction.credit_amount.toFixed(3)} د.ك` : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            transaction.running_balance >= 0 ? 'text-green-600' : 'text-destructive'
                          }`}>
                            {transaction.running_balance.toFixed(3)} د.ك
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};