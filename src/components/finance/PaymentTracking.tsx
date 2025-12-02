/**
 * Payment Tracking Component
 * 
 * Features:
 * - Payment timeline view with visual progress
 * - Visual indicators: Unpaid/Partial/Paid
 * - Payment method tracking and statistics
 * - Bank reconciliation dashboard
 * - Payment history and details
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Receipt,
  Building2,
  Wallet,
  FileText,
  CheckSquare,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceTimeline {
  invoice_id: string;
  invoice_number: string;
  customer_name_ar: string;
  customer_name_en: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  payment_status: string;
  total_paid: number;
  outstanding_balance: number;
  payment_progress_percentage: number;
  total_payment_attempts: number;
  successful_payments: number;
  pending_payments: number;
  failed_payments: number;
  first_payment_date: string | null;
  last_payment_date: string | null;
  reconciled_payments: number;
  unreconciled_payments: number;
  payment_methods_used: string[] | null;
}

interface PaymentDetail {
  payment_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction_reference: string;
  bank_reference: string;
  reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by_name: string | null;
  invoice_total: number;
  cumulative_paid: number;
  remaining_balance: number;
  payment_sequence: number;
  notes: string;
}

interface PaymentMethodStats {
  payment_method: string;
  total_transactions: number;
  successful_transactions: number;
  total_amount: number;
  average_transaction: number;
  success_rate: number;
  pending_reconciliation: number;
}

interface ReconciliationSummary {
  total_completed_payments: number;
  reconciled_payments: number;
  pending_reconciliation: number;
  total_payments_amount: number;
  reconciled_amount: number;
  pending_reconciliation_amount: number;
  reconciliation_percentage: number;
  cash_pending: number;
  bank_transfer_pending: number;
  check_pending: number;
  credit_card_pending: number;
  unreconciled_over_7_days: number;
  unreconciled_over_30_days: number;
}

export const PaymentTracking: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');

  // Fetch invoice timeline
  const { data: invoiceTimeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['invoice-payment-timeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_payment_timeline')
        .select('*')
        .order('invoice_date', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as InvoiceTimeline[];
    }
  });

  // Fetch payment details for selected invoice
  const { data: paymentDetails } = useQuery({
    queryKey: ['payment-timeline-details', selectedInvoice],
    queryFn: async () => {
      if (!selectedInvoice) return [];
      
      const { data, error } = await supabase
        .from('payment_timeline_details')
        .select('*')
        .eq('invoice_id', selectedInvoice)
        .order('payment_date', { ascending: true });
      
      if (error) throw error;
      return data as PaymentDetail[];
    },
    enabled: !!selectedInvoice
  });

  // Fetch payment method statistics
  const { data: methodStats } = useQuery({
    queryKey: ['payment-method-statistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_method_statistics')
        .select('*')
        .order('total_amount', { ascending: false });
      
      if (error) throw error;
      return data as PaymentMethodStats[];
    }
  });

  // Fetch reconciliation summary
  const { data: reconciliationSummary } = useQuery({
    queryKey: ['bank-reconciliation-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_reconciliation_summary')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as ReconciliationSummary;
    }
  });

  // Reconcile payment mutation
  const reconcilePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('payments')
        .update({
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_by: user?.id
        })
        .eq('id', paymentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-timeline-details'] });
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliation-summary'] });
      toast({
        title: '✅ تمت التسوية',
        description: 'تم تسوية الدفعة بنجاح',
      });
    },
    onError: () => {
      toast({
        title: '❌ فشلت التسوية',
        description: 'حدث خطأ أثناء تسوية الدفعة',
        variant: 'destructive',
      });
    }
  });

  // Get payment status badge
  const getPaymentStatusBadge = (status: string, percentage: number) => {
    if (status === 'paid' || percentage >= 100) {
      return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />مدفوع بالكامل</Badge>;
    } else if (status === 'partial' || percentage > 0) {
      return <Badge className="bg-yellow-600"><AlertCircle className="h-3 w-3 mr-1" />دفع جزئي ({percentage.toFixed(0)}%)</Badge>;
    } else {
      return <Badge className="bg-red-600"><XCircle className="h-3 w-3 mr-1" />غير مدفوع</Badge>;
    }
  };

  // Get payment method label
  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'نقداً',
      bank_transfer: 'تحويل بنكي',
      check: 'شيك',
      credit_card: 'بطاقة ائتمان',
      debit_card: 'بطاقة مدين',
      online: 'دفع إلكتروني'
    };
    return labels[method] || method;
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, React.ReactNode> = {
      cash: <Wallet className="h-4 w-4" />,
      bank_transfer: <Building2 className="h-4 w-4" />,
      check: <FileText className="h-4 w-4" />,
      credit_card: <CreditCard className="h-4 w-4" />,
      debit_card: <CreditCard className="h-4 w-4" />,
      online: <DollarSign className="h-4 w-4" />
    };
    return icons[method] || <DollarSign className="h-4 w-4" />;
  };

  // Check if there is any data
  const hasData = invoiceTimeline && invoiceTimeline.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">تتبع الدفعات</h2>
        <p className="text-sm text-muted-foreground">
          متابعة الدفعات الجزئية والتسويات البنكية
        </p>
      </div>

      {/* Show message if no data */}
      {!timelineLoading && !hasData && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            لا توجد بيانات مدفوعات لعرضها حالياً. يتم عرض البيانات عندما يكون هناك فواتير ومدفوعات مسجلة في النظام.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الدفعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(reconciliationSummary?.total_payments_amount || 0).toLocaleString()} ر.ق
            </div>
            <p className="text-xs text-muted-foreground">
              {reconciliationSummary?.total_completed_payments || 0} دفعة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تم التسوية</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reconciliationSummary?.reconciled_payments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {reconciliationSummary?.reconciliation_percentage || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">قيد التسوية</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {reconciliationSummary?.pending_reconciliation || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(reconciliationSummary?.pending_reconciliation_amount || 0).toFixed(3)} ر.ق
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تأخر +7 أيام</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reconciliationSummary?.unreconciled_over_7_days || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {reconciliationSummary?.unreconciled_over_30_days || 0} أكثر من 30 يوم
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">الجدول الزمني للدفعات</TabsTrigger>
          <TabsTrigger value="methods">طرق الدفع</TabsTrigger>
          <TabsTrigger value="reconciliation">التسويات البنكية</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الدفعات حسب الفواتير</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <p>جاري التحميل...</p>
              ) : invoiceTimeline && invoiceTimeline.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الفاتورة</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التقدم</TableHead>
                      <TableHead>الدفعات</TableHead>
                      <TableHead>التسوية</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceTimeline.map((invoice) => (
                      <TableRow key={invoice.invoice_id}>
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.customer_name_ar}</div>
                            <div className="text-xs text-muted-foreground">
                              {invoice.customer_name_en}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</div>
                            <div className="text-xs text-muted-foreground">
                              استحقاق: {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold">{invoice.total_amount.toFixed(3)}</div>
                          <div className="text-xs text-green-600">
                            مدفوع: {invoice.total_paid.toFixed(3)}
                          </div>
                          {invoice.outstanding_balance > 0 && (
                            <div className="text-xs text-red-600">
                              متبقي: {invoice.outstanding_balance.toFixed(3)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(invoice.payment_status, invoice.payment_progress_percentage)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[120px]">
                            <Progress value={invoice.payment_progress_percentage} />
                            <div className="text-xs text-center text-muted-foreground">
                              {invoice.payment_progress_percentage.toFixed(1)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              {invoice.successful_payments}
                            </div>
                            {invoice.pending_payments > 0 && (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <Clock className="h-3 w-3" />
                                {invoice.pending_payments}
                              </div>
                            )}
                            {invoice.failed_payments > 0 && (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-3 w-3" />
                                {invoice.failed_payments}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckSquare className="h-3 w-3" />
                              {invoice.reconciled_payments}
                            </div>
                            {invoice.unreconciled_payments > 0 && (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <AlertCircle className="h-3 w-3" />
                                {invoice.unreconciled_payments}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice.invoice_id);
                              setShowPaymentDetails(true);
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <AlertDescription>لا توجد فواتير</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات طرق الدفع</CardTitle>
            </CardHeader>
            <CardContent>
              {methodStats && methodStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {methodStats.map((method) => (
                    <Card key={method.payment_method}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          {getPaymentMethodLabel(method.payment_method)}
                        </CardTitle>
                        {getPaymentMethodIcon(method.payment_method)}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">إجمالي المبلغ:</span>
                            <span className="font-bold">{method.total_amount.toFixed(3)} ر.ق</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">عدد المعاملات:</span>
                            <span className="font-medium">{method.total_transactions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">متوسط المعاملة:</span>
                            <span className="font-medium">{method.average_transaction.toFixed(3)} ر.ق</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">معدل النجاح:</span>
                            <span className="font-medium text-green-600">{method.success_rate}%</span>
                          </div>
                          {method.pending_reconciliation > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">قيد التسوية:</span>
                              <Badge variant="outline" className="text-yellow-600">
                                {method.pending_reconciliation}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>لا توجد بيانات</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>التسويات البنكية حسب طريقة الدفع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">نقداً</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {reconciliationSummary?.cash_pending || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">قيد التسوية</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">تحويل بنكي</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {reconciliationSummary?.bank_transfer_pending || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">قيد التسوية</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">شيك</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {reconciliationSummary?.check_pending || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">قيد التسوية</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">بطاقة ائتمان</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {reconciliationSummary?.credit_card_pending || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">قيد التسوية</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الدفعات</DialogTitle>
            <DialogDescription>
              الجدول الزمني للدفعات والأرصدة
            </DialogDescription>
          </DialogHeader>

          {paymentDetails && paymentDetails.length > 0 ? (
            <div className="space-y-4">
              {paymentDetails.map((payment, index) => (
                <Card key={payment.payment_id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>الدفعة #{payment.payment_sequence}</Badge>
                          <span className="font-medium">{payment.payment_number}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                          </div>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(payment.payment_method)}
                            {getPaymentMethodLabel(payment.payment_method)}
                          </div>
                          {payment.transaction_reference && (
                            <div className="text-xs text-muted-foreground">
                              مرجع: {payment.transaction_reference}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">مبلغ الدفعة:</span>
                          <span className="font-bold text-green-600">{payment.amount.toFixed(3)} ر.ق</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">المدفوع حتى الآن:</span>
                          <span className="font-medium">{payment.cumulative_paid.toFixed(3)} ر.ق</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">المتبقي:</span>
                          <span className="font-medium text-red-600">{payment.remaining_balance.toFixed(3)} ر.ق</span>
                        </div>
                        <Progress 
                          value={(payment.cumulative_paid / payment.invoice_total) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>

                    {!payment.reconciled && payment.status === 'completed' && (
                      <div className="mt-4 flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-600">لم يتم التسوية</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => reconcilePayment.mutate(payment.payment_id)}
                          disabled={reconcilePayment.isPending}
                        >
                          تسوية الآن
                        </Button>
                      </div>
                    )}

                    {payment.reconciled && (
                      <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div className="text-sm text-green-600">
                          <span>تم التسوية</span>
                          {payment.reconciled_at && (
                            <span className="mr-2">
                              في {format(new Date(payment.reconciled_at), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {payment.reconciled_by_name && (
                            <span>بواسطة {payment.reconciled_by_name}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>لا توجد دفعات لهذه الفاتورة</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentTracking;
