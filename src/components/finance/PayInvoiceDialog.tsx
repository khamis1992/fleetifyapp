import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from '@/components/ui/badge';
import { useCreatePayment } from '@/hooks/usePayments.unified';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertTriangle, 
  Trash2, 
  Receipt, 
  CreditCard,
  Banknote,
  Building2,
  FileText,
  Globe,
  Calendar,
  Hash,
  MessageSquare,
  Check,
  X,
  Clock,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast-mock';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

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

const paymentMethods = [
  { value: 'cash', label: 'نقد', icon: Banknote },
  { value: 'bank_transfer', label: 'تحويل بنكي', icon: Building2 },
  { value: 'check', label: 'شيك', icon: FileText },
  { value: 'credit_card', label: 'بطاقة ائتمان', icon: CreditCard },
  { value: 'online_transfer', label: 'دفع إلكتروني', icon: Globe },
];

export function PayInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onPaymentCreated,
}: PayInvoiceDialogProps) {
  const createPayment = useCreatePayment();
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingFeeId, setDeletingFeeId] = useState<string | null>(null);
  const [lateFeeWaived, setLateFeeWaived] = useState(false);

  // إعادة تعيين حالة الإعفاء عند فتح النافذة
  useEffect(() => {
    if (open) {
      setLateFeeWaived(false);
    }
  }, [open]);

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

  // حساب أيام التأخير الفعلية
  const daysOverdue = useMemo(() => {
    if (!invoice.due_date) return 0;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    return Math.max(0, differenceInDays(today, dueDate));
  }, [invoice.due_date]);

  // حساب الغرامة ديناميكياً (120 ريال/يوم، حد أقصى 3000 ريال)
  const calculatedLateFee = useMemo(() => {
    if (daysOverdue <= 0 || lateFeeWaived) return 0;
    
    const DAILY_FEE = 120;
    const MAX_FEE = 3000;
    
    const fee = daysOverdue * DAILY_FEE;
    return Math.min(fee, MAX_FEE);
  }, [daysOverdue, lateFeeWaived]);

  // دمج غرامات التأخير
  const allLateFees = useMemo(() => {
    if (daysOverdue <= 0 || calculatedLateFee <= 0 || lateFeeWaived) return [];
    
    const existingFee = lateFees.length > 0 ? lateFees[0] : null;
    
    return [{
      id: existingFee?.id || 'calculated-' + invoice.id,
      days_overdue: daysOverdue,
      fee_amount: calculatedLateFee,
      status: existingFee?.status || 'pending',
      calculated: !existingFee,
      late_fee_rule_id: existingFee?.late_fee_rule_id,
    }];
  }, [daysOverdue, calculatedLateFee, lateFees, invoice.id, lateFeeWaived]);

  const totalLateFees = allLateFees.reduce((sum, fee) => sum + (fee.fee_amount || 0), 0);
  const totalAmountDue = invoice.balance_due + totalLateFees;

  // دالة حذف/إعفاء غرامة التأخير
  const handleDeleteLateFee = async (feeId: string) => {
    // إذا كانت غرامة محسوبة تلقائياً - نقوم بإعفائها محلياً
    if (feeId.startsWith('calculated-')) {
      setLateFeeWaived(true);
      toast({
        title: 'تم إعفاء الغرامة',
        description: 'تم إعفاء العميل من غرامة التأخير لهذه الدفعة',
      });
      return;
    }

    // إذا كانت غرامة مخزنة في قاعدة البيانات
    setDeletingFeeId(feeId);
    
    try {
      const { error } = await supabase
        .from('late_fees')
        .update({ 
          status: 'waived',
          waive_reason: 'تم الإعفاء من الغرامة يدوياً',
          waived_at: new Date().toISOString(),
          waived_by: user?.id
        })
        .eq('id', feeId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['invoice-late-fees', invoice.id] });
      setLateFeeWaived(true);
      
      toast({
        title: 'تم إعفاء الغرامة',
        description: 'تم إعفاء العميل من غرامة التأخير بنجاح',
      });
    } catch (error: any) {
      console.error('Error deleting late fee:', error);
      toast({
        title: 'خطأ في حذف الغرامة',
        description: error.message || 'حدث خطأ أثناء حذف الغرامة',
        variant: 'destructive',
      });
    } finally {
      setDeletingFeeId(null);
    }
  };

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

  useEffect(() => {
    if (open && invoice) {
      form.setValue('amount', totalAmountDue);
    }
  }, [open, invoice, totalAmountDue, form]);

  const watchedAmount = form.watch('amount');
  const isAmountPartial = watchedAmount > 0 && watchedAmount < totalAmountDue;
  const isAmountFull = watchedAmount >= totalAmountDue;
  const remainingBalance = Math.max(0, totalAmountDue - watchedAmount);

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
        notes: `فاتورة متبقية من الفاتورة ${invoice.invoice_number}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

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
      await createPayment.mutateAsync({
        payment_type: data.payment_method,
        payment_method: invoice.customer_id ? 'received' : 'made',
        amount: data.amount,
        payment_date: data.payment_date,
        reference_number: data.reference_number,
        notes: data.notes,
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        vendor_id: invoice.vendor_id,
        contract_id: invoice.contract_id,
      });

      if (isAmountPartial && remainingBalance > 0) {
        try {
          const newInvoice = await createRemainingBalanceInvoice(remainingBalance);
          toast({
            title: 'تم تسجيل الدفع',
            description: `تم إنشاء فاتورة جديدة #${newInvoice.invoice_number} للمبلغ المتبقي`,
          });
        } catch (invoiceError) {
          console.error('Error creating remaining balance invoice:', invoiceError);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-0 shadow-xl">
        {/* Header - استخدام اللون الأحمر الأساسي للنظام */}
        <DialogHeader className="p-5 pb-4 bg-gradient-to-l from-primary/5 via-primary/10 to-primary/5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">تسجيل دفعة</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                  {invoice.invoice_number}
                </p>
              </div>
            </div>
            <Badge 
              className={cn(
                "text-xs font-semibold px-3 py-1",
                invoice.payment_status === 'paid' && "bg-success text-success-foreground hover:bg-success",
                invoice.payment_status === 'partial' && "bg-warning text-warning-foreground hover:bg-warning",
                invoice.payment_status === 'unpaid' && "bg-muted text-muted-foreground hover:bg-muted"
              )}
            >
              {invoice.payment_status === 'paid' ? 'مدفوعة' : 
               invoice.payment_status === 'partial' ? 'جزئي' : 'غير مدفوعة'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* ملخص المبالغ */}
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-4 space-y-3 border border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">رصيد الفاتورة</span>
              <span className="font-bold text-foreground">{formatCurrency(invoice.balance_due)}</span>
            </div>
            
            {/* غرامات التأخير */}
            {daysOverdue > 0 && !lateFeeWaived && (
              <div className="border-t border-border/50 pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <span className="text-sm font-semibold text-warning">
                    غرامة تأخير ({daysOverdue} يوم)
                  </span>
                </div>
                
                {allLateFees.map((fee: any) => (
                  <div key={fee.id} className="flex items-center justify-between bg-warning/10 rounded-xl px-3 py-2.5 border border-warning/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-warning">
                          {formatCurrency(fee.fee_amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fee.calculated ? '120 ر.ق × ' + daysOverdue + ' يوم' : 'مسجلة'}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-destructive hover:text-white hover:bg-destructive transition-colors"
                      onClick={() => handleDeleteLateFee(fee.id)}
                      disabled={deletingFeeId === fee.id}
                    >
                      {deletingFeeId === fee.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 ml-1" />
                          إعفاء
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* رسالة الإعفاء */}
            {lateFeeWaived && daysOverdue > 0 && (
              <div className="border-t border-border/50 pt-3">
                <div className="flex items-center gap-2 bg-success/10 rounded-xl px-3 py-2.5 border border-success/20">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-success">
                    تم إعفاء العميل من غرامة التأخير
                  </span>
                </div>
              </div>
            )}
            
            {/* الإجمالي المستحق */}
            <div className="border-t border-border/50 pt-3">
              <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3 border border-primary/10">
                <span className="font-semibold text-foreground">المبلغ المستحق</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalAmountDue)}
                </span>
              </div>
            </div>
          </div>

          {/* نموذج الدفع */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* مبلغ الدفع */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">مبلغ الدفع</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="h-14 text-xl font-bold pr-16 text-left bg-background border-2 border-border focus:border-primary transition-colors"
                          dir="ltr"
                        />
                      </FormControl>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                        ر.ق
                      </span>
                    </div>
                    <FormMessage />
                    
                    {/* أزرار سريعة */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        type="button"
                        variant={isAmountFull ? "default" : "outline"}
                        size="sm"
                        onClick={() => form.setValue('amount', totalAmountDue)}
                        className={cn(
                          "flex-1 h-10 font-semibold transition-all",
                          isAmountFull && "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                        )}
                      >
                        <Check className="w-4 h-4 ml-1.5" />
                        دفع كامل
                      </Button>
                      <Button
                        type="button"
                        variant={isAmountPartial ? "default" : "outline"}
                        size="sm"
                        onClick={() => form.setValue('amount', Math.round(totalAmountDue / 2))}
                        className={cn(
                          "flex-1 h-10 font-semibold transition-all",
                          isAmountPartial && "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                        )}
                      >
                        دفع جزئي
                      </Button>
                    </div>
                    
                    {/* رسالة المبلغ المتبقي */}
                    {isAmountPartial && (
                      <div className="flex items-center gap-2 mt-3 p-3 bg-accent rounded-xl border border-accent-muted">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          سيتم إنشاء فاتورة للمتبقي: {formatCurrency(remainingBalance)}
                        </span>
                      </div>
                    )}
                    
                    {watchedAmount > totalAmountDue && (
                      <div className="flex items-center gap-2 mt-3 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                        <X className="w-4 h-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">المبلغ أكبر من المستحق</span>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* طريقة الدفع */}
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">طريقة الدفع</FormLabel>
                    <div className="grid grid-cols-5 gap-2">
                      {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = field.value === method.value;
                        return (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => field.onChange(method.value)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                              isSelected 
                                ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10" 
                                : "border-border bg-background hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
                            )}
                          >
                            <Icon className={cn("w-5 h-5", isSelected && "text-primary")} />
                            <span className={cn("text-xs font-semibold", isSelected && "text-primary")}>{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* التاريخ والمرجع */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        التاريخ
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="h-11 bg-background border-2 border-border focus:border-primary transition-colors" 
                        />
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
                      <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        رقم المرجع
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="اختياري" 
                          {...field}
                          className="h-11 bg-background border-2 border-border focus:border-primary transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* الملاحظات */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      ملاحظات
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أي ملاحظات إضافية..."
                        {...field}
                        rows={2}
                        className="resize-none text-sm bg-background border-2 border-border focus:border-primary transition-colors"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 font-semibold border-2"
          >
            إلغاء
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createPayment.isPending || watchedAmount > totalAmountDue || watchedAmount <= 0}
            className="flex-1 h-12 font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
          >
            {createPayment.isPending ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 ml-2" />
                تأكيد الدفع
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
