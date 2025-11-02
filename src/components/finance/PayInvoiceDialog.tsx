import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreatePayment } from '@/hooks/usePayments';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast-mock';
import { differenceInDays } from 'date-fns';

const paymentSchema = z.object({
  amount: z.number().min(0.001, 'المبلغ يجب أن يكون أكبر من صفر'),
  payment_method: z.enum(['cash', 'check', 'bank_transfer', 'credit_card', 'online_transfer'], {
    required_error: 'طريقة الدفع مطلوبة',
  }),
  payment_date: z.string().min(1, 'تاريخ الدفع مطلوب'),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PayInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    paid_amount: number;
    balance_due: number;
    customer_id?: string;
    vendor_id?: string;
    contract_id?: string;
    company_id?: string;
    due_date?: string;
    payment_status: string;
  };
  onPaymentCreated?: () => void;
}

export function PayInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onPaymentCreated,
}: PayInvoiceDialogProps) {
  // Debug: طباعة بيانات الفاتورة لتتبع المشكلة
  console.log('Invoice data in PayInvoiceDialog:', invoice);
  
  const createPayment = useCreatePayment();
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuth();
  const { toast } = useToast();

  // جلب غرامات التأخير المرتبطة بالفاتورة
  const { data: lateFees = [], isLoading: loadingLateFees } = useQuery({
    queryKey: ['invoice-late-fees', invoice.id],
    queryFn: async () => {
      if (!invoice.id) return [];
      
      const { data, error } = await supabase
        .from('late_fees')
        .select('*')
        .eq('invoice_id', invoice.id)
        .in('status', ['pending', 'applied'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching late fees:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!invoice.id && open,
  });

  // حساب غرامات التأخير تلقائياً إذا لم تكن موجودة
  const calculatedLateFee = useMemo(() => {
    if (!invoice.due_date) return null;
    
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const daysOverdue = differenceInDays(today, dueDate);
    
    // إذا لم تكن الفاتورة متأخرة، لا توجد غرامة
    if (daysOverdue <= 0) return null;
    
    // إذا كانت هناك غرامات موجودة في قاعدة البيانات، استخدمها
    if (lateFees.length > 0) return null;
    
    // احسب غرامة التأخير باستخدام RPC function
    return {
      days_overdue: daysOverdue,
      fee_amount: 0, // سيتم حسابها من RPC
      status: 'pending',
      calculated: true
    };
  }, [invoice.due_date, lateFees]);

  // جلب حساب غرامة التأخير من قاعدة البيانات
  const { data: calculatedFeeAmount } = useQuery({
    queryKey: ['calculate-late-fee', invoice.id, calculatedLateFee?.days_overdue],
    queryFn: async () => {
      if (!invoice.id || !calculatedLateFee || !calculatedLateFee.days_overdue) return 0;
      
      try {
        const { data, error } = await supabase.rpc('calculate_late_fee', {
          p_invoice_id: invoice.id,
          p_days_overdue: calculatedLateFee.days_overdue
        });
        
        if (error) {
          console.error('Error calculating late fee:', error);
          return 0;
        }
        
        return Number(data) || 0;
      } catch (error) {
        console.error('Error calculating late fee:', error);
        return 0;
      }
    },
    enabled: !!invoice.id && !!calculatedLateFee && calculatedLateFee.days_overdue > 0 && lateFees.length === 0,
  });

  // دمج غرامات التأخير الموجودة والمحسوبة
  const allLateFees = useMemo(() => {
    if (lateFees.length > 0) return lateFees;
    
    if (calculatedLateFee && calculatedFeeAmount && calculatedFeeAmount > 0) {
      return [{
        ...calculatedLateFee,
        fee_amount: calculatedFeeAmount,
        id: 'calculated-' + invoice.id
      }];
    }
    
    return [];
  }, [lateFees, calculatedLateFee, calculatedFeeAmount, invoice.id]);

  // حساب إجمالي غرامات التأخير
  const totalLateFees = allLateFees.reduce((sum, fee) => sum + (fee.fee_amount || 0), 0);
  
  // حساب المبلغ الإجمالي المستحق (رصيد الفاتورة + غرامات التأخير)
  const totalAmountDue = invoice.balance_due + totalLateFees;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: totalAmountDue,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    },
  });

  // تحديث القيمة الافتراضية عند تغيير الفاتورة
  useEffect(() => {
    if (open && invoice) {
      form.setValue('amount', totalAmountDue);
    }
  }, [open, invoice, totalAmountDue, form]);

  const watchedAmount = form.watch('amount');
  
  // Auto-detect if it's partial payment based on amount
  const isAmountPartial = watchedAmount > 0 && watchedAmount < totalAmountDue;
  const isAmountFull = watchedAmount >= totalAmountDue;

  // حساب المبلغ المتبقي بعد الدفع
  const remainingBalance = Math.max(0, totalAmountDue - watchedAmount);

  // دالة إنشاء رقم فاتورة جديد
  const generateInvoiceNumber = async (companyId: string): Promise<string> => {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('company_id', companyId)
      .like('invoice_number', `${prefix}-${year}${month}%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single();

    let sequence = 1;
    if (lastInvoice?.invoice_number) {
      const lastSequence = parseInt(lastInvoice.invoice_number.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  };

  // دالة إنشاء فاتورة جديدة للمبلغ المتبقي
  const createRemainingBalanceInvoice = async (remainingBalance: number) => {
    if (!invoice.company_id || !invoice.contract_id || !user?.id) {
      throw new Error('بيانات غير كافية لإنشاء الفاتورة');
    }

    const invoiceNumber = await generateInvoiceNumber(invoice.company_id);
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)
      .toISOString().split('T')[0];

    // حساب المبلغ المتبقي من الإيجار والغرامات
    const remainingRent = Math.min(remainingBalance, invoice.balance_due);
    const remainingLateFees = Math.max(0, remainingBalance - invoice.balance_due);

    const { data: newInvoice, error } = await supabase
      .from('invoices')
      .insert({
        company_id: invoice.company_id,
        customer_id: invoice.customer_id,
        contract_id: invoice.contract_id,
        invoice_number: invoiceNumber,
        invoice_date: today,
        due_date: dueDate,
        total_amount: remainingBalance,
        subtotal: remainingBalance,
        tax_amount: 0,
        discount_amount: 0,
        paid_amount: 0,
        balance_due: remainingBalance,
        status: 'sent',
        payment_status: 'unpaid',
        invoice_type: 'service',
        notes: `فاتورة متبقية من الفاتورة ${invoice.invoice_number} - المبلغ المتبقي من الإيجار: ${remainingRent.toFixed(3)} ${remainingLateFees > 0 ? `+ غرامات التأخير: ${remainingLateFees.toFixed(3)}` : ''}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating remaining balance invoice:', error);
      throw error;
    }

    // إذا كان هناك غرامات متبقية، إنشاء سجل غرامة جديد للفاتورة الجديدة
    if (remainingLateFees > 0 && lateFees.length > 0) {
      const latestLateFee = lateFees[0];
      await supabase
        .from('late_fees')
        .insert({
          company_id: invoice.company_id,
          invoice_id: newInvoice.id,
          contract_id: invoice.contract_id,
          late_fee_rule_id: latestLateFee.late_fee_rule_id,
          original_amount: remainingBalance,
          days_overdue: latestLateFee.days_overdue,
          fee_amount: remainingLateFees,
          fee_type: latestLateFee.fee_type,
          status: 'pending',
        });
    }

    return newInvoice;
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      // تسجيل الدفعة
      await createPayment.mutateAsync({
        payment_type: data.payment_method, // طريقة الدفع: cash, bank_transfer, check, credit_card, debit_card
        payment_method: invoice.customer_id ? 'received' : 'made', // نوع العملية: received أو made
        amount: data.amount,
        payment_date: data.payment_date,
        reference_number: data.reference_number,
        notes: data.notes,
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        vendor_id: invoice.vendor_id,
        contract_id: invoice.contract_id,
      });

      // إذا كان الدفع جزئياً، إنشاء فاتورة جديدة للمبلغ المتبقي
      if (isAmountPartial && remainingBalance > 0) {
        try {
          const newInvoice = await createRemainingBalanceInvoice(remainingBalance);
          toast({
            title: 'تم تسجيل الدفع وإنشاء فاتورة جديدة',
            description: `تم تسجيل الدفعة وإنشاء فاتورة جديدة #${newInvoice.invoice_number} للمبلغ المتبقي: ${formatCurrency(remainingBalance)}`,
          });
        } catch (invoiceError) {
          console.error('Error creating remaining balance invoice:', invoiceError);
          toast({
            title: 'تم تسجيل الدفع',
            description: 'تم تسجيل الدفعة بنجاح، لكن فشل إنشاء فاتورة للمبلغ المتبقي',
            variant: 'destructive',
          });
        }
      }
      
      onPaymentCreated?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: 'خطأ في تسجيل الدفع',
        description: error.message || 'حدث خطأ أثناء تسجيل الدفع',
        variant: 'destructive',
      });
    }
  };

  const handleFullPayment = () => {
    form.setValue('amount', totalAmountDue);
  };

  const handlePartialPayment = () => {
    // Just focus on amount field, let user enter the amount
    const amountField = document.querySelector('input[name="amount"]') as HTMLInputElement;
    if (amountField) {
      amountField.focus();
      amountField.select();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">دفع الفاتورة</DialogTitle>
          <DialogDescription>
            قم بإدخال تفاصيل الدفع للفاتورة رقم {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary Card */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>📄</span>
                تفاصيل الفاتورة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">رقم الفاتورة</span>
                    <span className="font-medium text-lg">{invoice.invoice_number}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">المبلغ الإجمالي</span>
                    <span className="font-medium text-lg">{formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">المبلغ المدفوع</span>
                    <span className="font-medium text-lg text-green-600">{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">حالة الدفع</span>
                    <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'} className="w-fit">
                      {invoice.payment_status === 'paid' ? 'مدفوعة' : 
                       invoice.payment_status === 'partial' ? 'دفع جزئي' : 'غير مدفوعة'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* عرض غرامات التأخير */}
              {totalLateFees > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-900">غرامات التأخير</span>
                    </div>
                    <div className="space-y-2">
                      {allLateFees.map((fee: any, index: number) => (
                        <div key={fee.id || index} className="flex justify-between items-center text-sm">
                          <span className="text-orange-700">
                            {fee.days_overdue} يوم تأخير
                            {fee.status === 'pending' && (
                              <Badge variant="outline" className="mr-2 text-xs">
                                {fee.calculated ? 'محسوبة' : 'معلقة'}
                              </Badge>
                            )}
                          </span>
                          <span className="font-semibold text-orange-900">
                            {formatCurrency(fee.fee_amount)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-orange-300 pt-2 mt-2 flex justify-between items-center">
                        <span className="font-semibold text-orange-900">إجمالي الغرامات:</span>
                        <span className="font-bold text-lg text-orange-900">
                          {formatCurrency(totalLateFees)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* رسالة إذا كانت الفاتورة متأخرة ولكن لا توجد غرامات بعد */}
              {invoice.due_date && differenceInDays(new Date(), new Date(invoice.due_date)) > 0 && totalLateFees === 0 && !loadingLateFees && (
                <div className="border-t pt-4 mt-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        الفاتورة متأخرة {differenceInDays(new Date(), new Date(invoice.due_date))} يوم
                        {differenceInDays(new Date(), new Date(invoice.due_date)) > 7 ? ' - قد يتم تطبيق غرامات تأخير' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <div className="bg-primary/10 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">رصيد الفاتورة:</span>
                    <span className="font-medium text-lg">{formatCurrency(invoice.balance_due)}</span>
                  </div>
                  {totalLateFees > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">غرامات التأخير:</span>
                      <span className="font-medium text-lg text-orange-600">
                        {formatCurrency(totalLateFees)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between items-center">
                    <span className="text-lg font-medium">المبلغ الإجمالي المستحق:</span>
                    <span className="font-bold text-2xl text-primary">
                      {formatCurrency(totalAmountDue)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Options */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>💳</span>
                خيارات الدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={isAmountFull ? 'default' : 'outline'}
                    onClick={handleFullPayment}
                    className="h-12 text-base"
                  >
                    <span>💰</span>
                    دفع كامل
                  </Button>
                  <Button
                    type="button"
                    variant={isAmountPartial ? 'default' : 'outline'}
                    onClick={handlePartialPayment}
                    className="h-12 text-base"
                  >
                    <span>📊</span>
                    دفع جزئي
                  </Button>
                </div>
                
                {/* Auto-detection feedback */}
                {isAmountPartial && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <span>⚡</span>
                      <span className="text-sm font-medium">تم اكتشاف دفع جزئي تلقائياً</span>
                    </div>
                    <div className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                      <strong>سيتم إنشاء فاتورة جديدة:</strong> للمبلغ المتبقي {formatCurrency(remainingBalance)}
                      {remainingBalance > invoice.balance_due && (
                        <div className="mt-1 text-xs">
                          يشمل: {formatCurrency(invoice.balance_due)} (رصيد الفاتورة) + {formatCurrency(remainingBalance - invoice.balance_due)} (غرامات متبقية)
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {isAmountFull && watchedAmount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <span>✅</span>
                      <span className="text-sm font-medium">دفع كامل - سيتم إغلاق الفاتورة</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>✍️</span>
                بيانات الدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">مبلغ الدفع</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="أدخل مبلغ الدفع"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              max={totalAmountDue}
                              className="h-12 text-lg"
                            />
                          </FormControl>
                          <FormMessage />
                          {watchedAmount > totalAmountDue && (
                            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                              ⚠️ المبلغ أكبر من المبلغ المستحق
                            </p>
                          )}
                          {watchedAmount > 0 && watchedAmount < totalAmountDue && (
                            <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                              💡 سيتم إنشاء فاتورة جديدة للمبلغ المتبقي: {formatCurrency(remainingBalance)}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">طريقة الدفع</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="اختر طريقة الدفع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">💵 نقد</SelectItem>
                              <SelectItem value="bank_transfer">🏦 تحويل بنكي</SelectItem>
                              <SelectItem value="check">📝 شيك</SelectItem>
                              <SelectItem value="credit_card">💳 بطاقة ائتمان</SelectItem>
                              <SelectItem value="online_transfer">🌐 دفع إلكتروني</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="payment_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">تاريخ الدفع</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-12" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reference_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">رقم المرجع (اختياري)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="رقم الشيك، المرجع البنكي، إلخ" 
                              {...field}
                              className="h-12"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">ملاحظات (اختياري)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="أي ملاحظات إضافية حول عملية الدفع"
                            {...field}
                            rows={3}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="h-12 px-8"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={createPayment.isPending || watchedAmount > totalAmountDue || watchedAmount <= 0}
                      className="h-12 px-8"
                    >
                      {createPayment.isPending ? 'جاري الحفظ...' : '💾 تسجيل الدفع'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}