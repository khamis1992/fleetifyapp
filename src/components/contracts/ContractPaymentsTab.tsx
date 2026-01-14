/**
 * تبويب الدفعات - عرض جميع الدفعات مع خيار الإلغاء
 * Payments Tab - Display all payments with cancel option
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  CreditCard,
  XCircle,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  invoice_id: string;
  invoice?: {
    invoice_number: string;
  };
}

interface ContractPaymentsTabProps {
  contractId: string;
  companyId: string;
  invoiceIds: string[];
  formatCurrency: (amount: number) => string;
}

export function ContractPaymentsTab({
  contractId,
  companyId,
  invoiceIds,
  formatCurrency,
}: ContractPaymentsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Fetch payments for all invoices in this contract
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['contract-payments', contractId, invoiceIds],
    queryFn: async () => {
      if (!invoiceIds.length) return [];

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_status,
          payment_method,
          reference_number,
          notes,
          created_at,
          invoice_id,
          invoice:invoices!invoice_id(invoice_number)
        `)
        .in('invoice_id', invoiceIds)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return (data || []) as Payment[];
    },
    enabled: invoiceIds.length > 0,
  });

  // Mutation to cancel payment
  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .update({ 
          payment_status: 'cancelled',
          notes: (selectedPayment?.notes ? selectedPayment.notes + ' | ' : '') + 
                 `تم الإلغاء في ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}`
        })
        .eq('id', paymentId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'تم إلغاء الدفعة',
        description: 'تم إلغاء الدفعة بنجاح وسيتم تحديث الفاتورة تلقائياً',
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['contract-payments'] });
      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
      setIsCancelDialogOpen(false);
      setSelectedPayment(null);
    },
    onError: (error) => {
      toast({
        title: 'خطأ في إلغاء الدفعة',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCancelClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    if (selectedPayment) {
      cancelPaymentMutation.mutate(selectedPayment.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 ml-1" />
            مكتمل
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="w-3 h-3 ml-1" />
            معلق
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <Ban className="w-3 h-3 ml-1" />
            ملغي
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'نقدي',
      bank_transfer: 'تحويل بنكي',
      credit_card: 'بطاقة ائتمان',
      cheque: 'شيك',
      received: 'مستلم',
      other: 'أخرى',
    };
    return methods[method] || method;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-slate-500">
            <Loader2 className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-spin" />
            <p>جاري تحميل الدفعات...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-600" />
            سجل الدفعات
            {payments.length > 0 && (
              <Badge variant="secondary" className="mr-2">
                {payments.length} دفعة
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">لا توجد دفعات مسجلة لهذا العقد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow 
                    key={payment.id}
                    className={payment.payment_status === 'cancelled' ? 'opacity-50' : ''}
                  >
                    <TableCell className="font-medium">
                      {payment.invoice?.invoice_number || '-'}
                    </TableCell>
                    <TableCell>
                      {payment.payment_date
                        ? format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })
                        : '-'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(payment.amount || 0)}
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodLabel(payment.payment_method)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.payment_status)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={payment.notes || ''}>
                      {payment.notes || '-'}
                    </TableCell>
                    <TableCell>
                      {payment.payment_status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => handleCancelClick(payment)}
                        >
                          <XCircle className="w-4 h-4 ml-1" />
                          إلغاء
                        </Button>
                      )}
                      {payment.payment_status === 'cancelled' && (
                        <span className="text-sm text-slate-400">ملغي</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد إلغاء الدفعة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-2">
              <p>هل أنت متأكد من إلغاء هذه الدفعة؟</p>
              {selectedPayment && (
                <div className="bg-slate-50 rounded-lg p-3 mt-3 space-y-1 text-sm">
                  <p><strong>الفاتورة:</strong> {selectedPayment.invoice?.invoice_number}</p>
                  <p><strong>المبلغ:</strong> {formatCurrency(selectedPayment.amount)}</p>
                  <p><strong>التاريخ:</strong> {selectedPayment.payment_date ? format(new Date(selectedPayment.payment_date), 'dd/MM/yyyy') : '-'}</p>
                </div>
              )}
              <p className="text-amber-600 mt-3">
                ⚠️ سيتم تحديث الفاتورة المرتبطة تلقائياً
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={cancelPaymentMutation.isPending}>
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={cancelPaymentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelPaymentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 ml-2" />
                  تأكيد الإلغاء
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
