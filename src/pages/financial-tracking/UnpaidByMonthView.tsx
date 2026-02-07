// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, DollarSign, AlertTriangle, Download, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { CustomerWithRental, RentalPaymentReceipt } from '@/hooks/useRentalPayments';

interface UnpaidByMonthViewProps {
  allCustomers: CustomerWithRental[];
  allReceipts: RentalPaymentReceipt[];
  companyId: string | null;
}

const UnpaidByMonthView: React.FC<UnpaidByMonthViewProps> = ({ allCustomers, allReceipts, companyId }) => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'yyyy-MM')
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<number>(new Date().getMonth() + 1);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  const months = [
    { number: 1, name: 'يناير' },
    { number: 2, name: 'فبراير' },
    { number: 3, name: 'مارس' },
    { number: 4, name: 'أبريل' },
    { number: 5, name: 'مايو' },
    { number: 6, name: 'يونيو' },
    { number: 7, name: 'يوليو' },
    { number: 8, name: 'أغسطس' },
    { number: 9, name: 'سبتمبر' },
    { number: 10, name: 'أكتوبر' },
    { number: 11, name: 'نوفمبر' },
    { number: 12, name: 'ديسمبر' }
  ];

  const unpaidCustomers = useMemo(() => {
    if (!allCustomers || !allReceipts) return [];

    const targetMonth = `${selectedYear}-${String(selectedMonthNumber).padStart(2, '0')}`;
    
    return allCustomers
      .map((customer) => {
        const hasPaidForMonth = allReceipts.some((receipt) => {
          const receiptMonth = receipt.payment_date ? format(new Date(receipt.payment_date), 'yyyy-MM') : '';
          return (
            receipt.customer_id === customer.id &&
            receiptMonth === targetMonth &&
            receipt.payment_status === 'paid'
          );
        });

        const hasPartialPayment = allReceipts.some((receipt) => {
          const receiptMonth = receipt.payment_date ? format(new Date(receipt.payment_date), 'yyyy-MM') : '';
          return (
            receipt.customer_id === customer.id &&
            receiptMonth === targetMonth &&
            receipt.payment_status === 'partial'
          );
        });

        if (!hasPaidForMonth) {
          return {
            ...customer,
            status: hasPartialPayment ? 'partial' : 'unpaid',
            partialAmount: hasPartialPayment
              ? allReceipts
                  .filter(r => {
                    const receiptMonth = r.payment_date ? format(new Date(r.payment_date), 'yyyy-MM') : '';
                    return r.customer_id === customer.id && receiptMonth === targetMonth;
                  })
                  .reduce((sum, r) => sum + r.total_paid, 0)
              : 0
          };
        }
        return null;
      })
      .filter((c): c is CustomerWithRental & { status: string; partialAmount: number } => c !== null)
      .sort((a, b) => b.monthly_rent - a.monthly_rent);
  }, [allCustomers, allReceipts, selectedYear, selectedMonthNumber]);

  const totalUnpaidAmount = useMemo(() => {
    return unpaidCustomers.reduce((sum, customer) => {
      const amountDue = customer.monthly_rent - customer.partialAmount;
      return sum + amountDue;
    }, 0);
  }, [unpaidCustomers]);

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonthNumber(month);
    setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const selectedMonthName = months.find(m => m.number === selectedMonthNumber)?.name || '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            اختر الشهر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>السنة</Label>
              <div className="grid grid-cols-3 gap-2">
                {years.map((year) => (
                  <Button
                    key={year}
                    variant={selectedYear === year ? 'default' : 'outline'}
                    onClick={() => handleMonthChange(year, selectedMonthNumber)}
                    className="w-full"
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>الشهر</Label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((month) => (
                  <Button
                    key={month.number}
                    variant={selectedMonthNumber === month.number ? 'default' : 'outline'}
                    onClick={() => handleMonthChange(selectedYear, month.number)}
                    className="text-sm"
                  >
                    {month.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <p className="text-center text-lg font-bold">
              الفترة المختارة: {selectedMonthName} {selectedYear}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">عدد العملاء غير المدفوعين</p>
              <p className="text-4xl font-bold text-destructive mt-2">
                {unpaidCustomers.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                من إجمالي {allCustomers.length} عميل
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">إجمالي المبلغ غير المدفوع</p>
              <p className="text-3xl font-bold text-destructive mt-2">
                {totalUnpaidAmount.toLocaleString('en-US')} ريال
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">الدفعات الجزئية</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {unpaidCustomers.filter(c => c.status === 'partial').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            العملاء الذين لم يدفعوا في {selectedMonthName} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                رائع! جميع العملاء دفعوا
              </h3>
              <p className="text-slate-600">
                جميع العملاء قاموا بالدفع في {selectedMonthName} {selectedYear}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">اسم العميل</TableHead>
                    <TableHead className="text-right">الإيجار الشهري</TableHead>
                    <TableHead className="text-right">المدفوع جزئياً</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidCustomers.map((customer, index) => {
                    const amountDue = customer.monthly_rent - customer.partialAmount;
                    const isPartial = customer.status === 'partial';
                    
                    return (
                      <TableRow 
                        key={customer.id}
                        className={isPartial ? 'bg-orange-50/50' : 'bg-destructive/5'}
                      >
                        <TableCell className="font-semibold">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-lg">
                          {customer.name}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">
                            {customer.monthly_rent.toLocaleString('en-US')} ريال
                          </span>
                        </TableCell>
                        <TableCell>
                          {isPartial ? (
                            <span className="font-semibold text-orange-600">
                              {customer.partialAmount.toLocaleString('en-US')} ريال
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-destructive text-lg">
                            {amountDue.toLocaleString('en-US')} ريال
                          </span>
                        </TableCell>
                        <TableCell>
                          {isPartial ? (
                            <Badge className="bg-orange-500 text-white">
                              دفع جزئي
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              غير مدفوع
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/financial-tracking?customer=${customer.id}`)}
                          >
                            <DollarSign className="h-4 w-4 ml-2" />
                            إضافة دفعة
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {unpaidCustomers.length > 0 && (
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 ml-2" />
                تصدير Excel
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnpaidByMonthView;
