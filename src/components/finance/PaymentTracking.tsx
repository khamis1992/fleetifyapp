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
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

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
  const { companyId, user } = useUnifiedCompanyAccess();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');

  // Fetch invoice timeline
  const { data: invoiceTimeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['invoice-payment-timeline', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          paid_amount,
          balance_due,
          payment_status,
          customers:customer_id(first_name, last_name, company_name),
          payments(id, amount, payment_date, payment_method, payment_status, reconciliation_status)
        `)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .order('invoice_date', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []).map((invoice): InvoiceTimeline => {
        const payments = Array.isArray(invoice.payments)
          ? invoice.payments
          : invoice.payments
            ? [invoice.payments]
            : [];
        const completed = payments.filter(payment => payment.payment_status === 'completed');
        const pending = payments.filter(payment => payment.payment_status === 'pending');
        const failed = payments.filter(payment => ['failed', 'rejected'].includes(payment.payment_status));
        const reconciled = completed.filter(payment => ['matched', 'reconciled'].includes(payment.reconciliation_status || ''));
        const customerName = invoice.customers?.company_name
          || [invoice.customers?.first_name, invoice.customers?.last_name].filter(Boolean).join(' ')
          || '-';
        const totalAmount = Number(invoice.total_amount || 0);
        const totalPaid = Number(invoice.paid_amount || 0);
        const sortedDates = completed
          .map(payment => payment.payment_date)
          .filter((date): date is string => Boolean(date))
          .sort();

        return {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_name_ar: customerName,
          customer_name_en: customerName,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date || invoice.invoice_date,
          total_amount: totalAmount,
          payment_status: invoice.payment_status,
          total_paid: totalPaid,
          outstanding_balance: Number(invoice.balance_due || 0),
          payment_progress_percentage: totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0,
          total_payment_attempts: payments.length,
          successful_payments: completed.length,
          pending_payments: pending.length,
          failed_payments: failed.length,
          first_payment_date: sortedDates[0] || null,
          last_payment_date: sortedDates.at(-1) || null,
          reconciled_payments: reconciled.length,
          unreconciled_payments: completed.length - reconciled.length,
          payment_methods_used: [...new Set(completed.map(payment => payment.payment_method))],
        };
      });
    },
    enabled: Boolean(companyId),
  });

  // Fetch payment details for selected invoice
  const { data: paymentDetails } = useQuery({
    queryKey: ['payment-timeline-details', companyId, selectedInvoice],
    queryFn: async () => {
      if (!companyId || !selectedInvoice) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select('id, payment_number, payment_date, amount, payment_method, payment_status, reference_number, bank_account, reconciliation_status, reconciled_at, notes, invoices:invoice_id(total_amount)')
        .eq('company_id', companyId)
        .eq('invoice_id', selectedInvoice)
        .order('payment_date', { ascending: true });
      
      if (error) throw error;
      let cumulativePaid = 0;
      return (data || []).map((payment, index): PaymentDetail => {
        if (payment.payment_status === 'completed') {
          cumulativePaid += Number(payment.amount || 0);
        }
        const invoiceTotal = Number(payment.invoices?.total_amount || 0);
        return {
          payment_id: payment.id,
          payment_number: payment.payment_number,
          payment_date: payment.payment_date,
          amount: Number(payment.amount || 0),
          payment_method: payment.payment_method,
          status: payment.payment_status,
          transaction_reference: payment.reference_number || '',
          bank_reference: payment.bank_account || '',
          reconciled: ['matched', 'reconciled'].includes(payment.reconciliation_status || ''),
          reconciled_at: payment.reconciled_at,
          reconciled_by_name: null,
          invoice_total: invoiceTotal,
          cumulative_paid: cumulativePaid,
          remaining_balance: Math.max(0, invoiceTotal - cumulativePaid),
          payment_sequence: index + 1,
          notes: payment.notes || '',
        };
      });
    },
    enabled: Boolean(companyId && selectedInvoice),
  });

  // Fetch payment method statistics
  const { data: methodStats } = useQuery({
    queryKey: ['payment-method-statistics', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select('payment_method, amount, payment_status, reconciliation_status')
        .eq('company_id', companyId)
        .neq('payment_status', 'cancelled');
      
      if (error) throw error;
      const groups = new Map<string, PaymentMethodStats>();
      for (const payment of data || []) {
        const method = payment.payment_method || 'other';
        const current = groups.get(method) || {
          payment_method: method,
          total_transactions: 0,
          successful_transactions: 0,
          total_amount: 0,
          average_transaction: 0,
          success_rate: 0,
          pending_reconciliation: 0,
        };
        current.total_transactions += 1;
        current.total_amount += Number(payment.amount || 0);
        if (payment.payment_status === 'completed') current.successful_transactions += 1;
        if (payment.payment_status === 'completed' && !['matched', 'reconciled'].includes(payment.reconciliation_status || '')) {
          current.pending_reconciliation += 1;
        }
        groups.set(method, current);
      }

      return Array.from(groups.values())
        .map(group => ({
          ...group,
          average_transaction: group.total_transactions > 0 ? group.total_amount / group.total_transactions : 0,
          success_rate: group.total_transactions > 0 ? (group.successful_transactions / group.total_transactions) * 100 : 0,
        }))
        .sort((left, right) => right.total_amount - left.total_amount);
    },
    enabled: Boolean(companyId),
  });

  // Fetch reconciliation summary
  const { data: reconciliationSummary } = useQuery({
    queryKey: ['bank-reconciliation-summary', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_method, payment_status, reconciliation_status')
        .eq('company_id', companyId)
        .neq('payment_status', 'cancelled');
      
      if (error) throw error;
      const completed = (data || []).filter(payment => payment.payment_status === 'completed');
      const reconciled = completed.filter(payment => ['matched', 'reconciled'].includes(payment.reconciliation_status || ''));
      const pending = completed.filter(payment => !['matched', 'reconciled'].includes(payment.reconciliation_status || ''));
      const now = Date.now();
      const pendingDays = (days: number) => pending.filter(payment => {
        const timestamp = new Date(payment.payment_date).getTime();
        return Number.isFinite(timestamp) && now - timestamp > days * 24 * 60 * 60 * 1000;
      }).length;
      const pendingForMethod = (method: string) => pending.filter(payment => payment.payment_method === method).length;
      const totalAmount = completed.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const reconciledAmount = reconciled.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      return {
        total_completed_payments: completed.length,
        reconciled_payments: reconciled.length,
        pending_reconciliation: pending.length,
        total_payments_amount: totalAmount,
        reconciled_amount: reconciledAmount,
        pending_reconciliation_amount: totalAmount - reconciledAmount,
        reconciliation_percentage: completed.length > 0 ? (reconciled.length / completed.length) * 100 : 0,
        cash_pending: pendingForMethod('cash'),
        bank_transfer_pending: pendingForMethod('bank_transfer'),
        check_pending: pendingForMethod('check'),
        credit_card_pending: pendingForMethod('credit_card') + pendingForMethod('debit_card'),
        unreconciled_over_7_days: pendingDays(7),
        unreconciled_over_30_days: pendingDays(30),
      } satisfies ReconciliationSummary;
    },
    enabled: Boolean(companyId),
  });

  // Reconcile payment mutation
  const reconcilePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.rpc('reconcile_payment_with_bank_transaction', {
        p_payment_id: paymentId,
        p_reason: 'تسوية يدوية من شاشة متابعة الدفعات',
        p_actor_id: user?.id,
      });
      
      if (error) {
        throw new Error(error.message || 'تعذر مطابقة الدفعة مع حركة بنكية مرتبطة');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-timeline-details'] });
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliation-summary'] });
      toast({
        title: '✅ تمت التسوية',
        description: 'تم تسوية الدفعة بنجاح',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ فشلت التسوية',
        description: error.message,
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
                          <div className="font-bold">{(invoice.total_amount || 0).toFixed(3)}</div>
                          <div className="text-xs text-green-600">
                            مدفوع: {(invoice.total_paid || 0).toFixed(3)}
                          </div>
                          {(invoice.outstanding_balance || 0) > 0 && (
                            <div className="text-xs text-red-600">
                              متبقي: {(invoice.outstanding_balance || 0).toFixed(3)}
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
                              {(invoice.payment_progress_percentage || 0).toFixed(1)}%
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
                            <span className="font-bold">{(method.total_amount || 0).toFixed(3)} ر.ق</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">عدد المعاملات:</span>
                            <span className="font-medium">{method.total_transactions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">متوسط المعاملة:</span>
                            <span className="font-medium">{(method.average_transaction || 0).toFixed(3)} ر.ق</span>
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
                          <span className="font-bold text-green-600">{(payment.amount || 0).toFixed(3)} ر.ق</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">المدفوع حتى الآن:</span>
                          <span className="font-medium">{(payment.cumulative_paid || 0).toFixed(3)} ر.ق</span>
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
