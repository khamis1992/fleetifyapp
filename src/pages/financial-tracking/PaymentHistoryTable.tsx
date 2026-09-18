// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, AlertCircle, Clock, Printer, FileSpreadsheet, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { CustomerWithRental, RentalPaymentReceipt } from '@/hooks/useRentalPayments';

interface PaymentHistoryTableProps {
  selectedCustomer: CustomerWithRental | null;
  customerReceipts: RentalPaymentReceipt[];
  onExportToExcel: () => void;
  onPrintAllReceipts: () => void;
  onPrintReceipt: (receipt: RentalPaymentReceipt) => void;
  onDeleteClick: (receipt: RentalPaymentReceipt) => void;
}

const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  selectedCustomer,
  customerReceipts,
  onExportToExcel,
  onPrintAllReceipts,
  onPrintReceipt,
  onDeleteClick,
}) => {
  const navigate = useNavigate();

  if (!selectedCustomer) return null;

  if (customerReceipts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">لا توجد أوراق إيصالات سابقة لهذا العميل</p>
            <p className="text-sm mt-2">ملخص الدفعات الفعلية معروض أعلى السجل.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">القيم والحالات كما سُجلت عند إصدار الورقة، وقد تتضمن ملخصًا تراكميًا. يُراجع السداد الحالي من الدفعات والفواتير.</p>
      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg sm:text-xl">أوراق الإيصالات السابقة -</CardTitle>
              <Button
                variant="link"
                className="text-lg sm:text-xl p-0 h-auto font-bold text-primary hover:text-primary/80"
                onClick={() => navigate(`/customers?id=${selectedCustomer.id}`)}
                title="عرض ملف العميل الكامل"
              >
                {selectedCustomer.name}
                <ExternalLink className="h-4 w-4 mr-1" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={onExportToExcel}>
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                تصدير إكسل
              </Button>
              <Button variant="outline" size="sm" onClick={onPrintAllReceipts}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة الكل
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <ResponsiveTable>
<Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الإيصال</TableHead>
                  <TableHead className="text-right">الشهر</TableHead>
                  <TableHead className="text-right">تاريخ الدفع</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">الإيجار</TableHead>
                  <TableHead className="text-right">الغرامة</TableHead>
                  <TableHead className="text-right">المستحق</TableHead>
                  <TableHead className="text-right">المدفوع</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerReceipts.map((receipt) => {
                  const isPaid = receipt.payment_status === 'paid';
                  const isPartial = receipt.payment_status === 'partial';
                  const isPending = receipt.payment_status === 'pending';
                  
                  const amountDue = receipt.amount_due || (receipt.rent_amount + receipt.fine);
                  const pendingBalance = receipt.pending_balance ?? Math.max(0, amountDue - receipt.total_paid);
                  
                  return (
                    <TableRow 
                      key={receipt.id}
                      className={isPartial ? 'bg-orange-50/50' : ''}
                    >
                      <TableCell>
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                          {(receipt as any).receipt_number || 'غير متاح'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{receipt.month}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {receipt.payment_date && !isNaN(new Date(receipt.payment_date).getTime())
                            ? format(new Date(receipt.payment_date), 'dd MMMM yyyy', { locale: ar })
                            : 'تاريخ غير متاح'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">
                          {(receipt as any).payment_method === 'cash' && '💵 نقداً'}
                          {(receipt as any).payment_method === 'bank_transfer' && '🏦 تحويل بنكي'}
                          {(receipt as any).payment_method === 'check' && '📄 شيك'}
                          {(receipt as any).payment_method === 'credit_card' && '💳 بطاقة ائتمان'}
                          {(receipt as any).payment_method === 'debit_card' && '💳 بطاقة مدين'}
                          {!(receipt as any).payment_method && 'غير محدد'}
                        </span>
                        {(receipt as any).reference_number && (
                          <div className="text-xs text-muted-foreground mt-1">
                            رقم المرجع: {(receipt as any).reference_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {(receipt?.rent_amount || 0).toLocaleString('en-US')} ريال
                        </span>
                      </TableCell>
                      <TableCell>
                        {receipt.fine > 0 ? (
                          <Badge variant="destructive" className="font-semibold">
                            {(receipt?.fine || 0).toLocaleString('en-US')} ريال
                          </Badge>
                        ) : (
                          <Badge variant="secondary">لا يوجد</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {amountDue.toLocaleString('en-US')} ريال
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-lg font-bold text-primary">
                          {(receipt?.total_paid || 0).toLocaleString('en-US')} ريال
                        </span>
                      </TableCell>
                      <TableCell>
                        {pendingBalance > 0 ? (
                          <span className="text-lg font-bold text-orange-600">
                            {pendingBalance.toLocaleString('en-US')} ريال
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-green-600">
                            0 ريال
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isPaid && (
                          <Badge className="bg-green-500">
                            <span className="mr-1">✅</span>
                            مدفوع
                          </Badge>
                        )}
                        {isPartial && (
                          <Badge className="bg-orange-500">
                            <span className="mr-1">⚠️</span>
                            جزئي
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="destructive">
                            <span className="mr-1">❌</span>
                            معلق
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPrintReceipt(receipt)}
                            title="طباعة الإيصال"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteClick(receipt)}
                            title="حذف الإيصال"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
</ResponsiveTable>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default PaymentHistoryTable;
