/**
 * نافذة الدفع السريع - تفتح مع اختيار العميل تلقائياً
 * تستخدم في صفحة متابعة الإيجارات الشهرية
 */
import { useState, useRef, useMemo, useEffect } from 'react';
import { Check, X, Loader2, MessageCircle, CheckCircle, FileText, Download, AlertTriangle, ChevronDown } from 'lucide-react';
import { startOfMonth, endOfMonth, addMonths, isBefore, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PaymentReceipt } from '@/components/payments/PaymentReceipt';
import { generateReceiptHTML, downloadHTML, numberToArabicWords, generateReceiptNumber, formatReceiptDate } from '@/utils/receiptGenerator';
import { useQueryClient } from '@tanstack/react-query';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  balance_due: number | null;
  status: string;
  payment_status: string;
  contract_id: string | null;
  contracts: {
    contract_number: string;
    vehicle_number: string | null;
    vehicles: {
      plate_number: string;
    } | null;
  } | null;
}

interface PaymentSuccess {
  paymentId: string;
  receiptNumber: string;
  amount: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  paymentDate: string;
  description: string;
  vehicleNumber: string;
}

interface QuickPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  onSuccess?: () => void;
}

export function QuickPaymentDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerPhone,
  onSuccess,
}: QuickPaymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [readyToPay, setReadyToPay] = useState(false);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  // Load invoices when dialog opens
  useEffect(() => {
    if (open && customerId) {
      loadCustomerInvoices();
    }
  }, [open, customerId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedInvoices([]);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentSuccess(null);
      setShowReceipt(false);
      setReadyToPay(false);
      setShowAllInvoices(false);
    }
  }, [open]);

  const loadCustomerInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          balance_due,
          status,
          payment_status,
          contract_id,
          contracts (
            contract_number,
            vehicle_id,
            vehicles:vehicle_id (
              plate_number
            )
          )
        `)
        .eq('customer_id', customerId)
        .in('payment_status', ['unpaid', 'partial', 'overdue', 'pending'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      setInvoices(data || []);
      
      if (data && data.length === 0) {
        toast({
          title: 'لا توجد فواتير مستحقة',
          description: 'هذا العميل ليس لديه فواتير غير مدفوعة',
        });
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب الفواتير',
        variant: 'destructive',
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (showAllInvoices) return invoices;
    
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const nextMonthEnd = endOfMonth(addMonths(now, 1));
    
    return invoices.filter(invoice => {
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date(invoice.invoice_date);
      return isBefore(dueDate, now) || isWithinInterval(dueDate, { start: currentMonthStart, end: nextMonthEnd });
    });
  }, [invoices, showAllInvoices]);

  const overdueInvoices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return invoices.filter(invoice => {
      if (!invoice.due_date) return false;
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
  }, [invoices]);

  const hasFutureSelectionWithOverdue = useMemo(() => {
    if (overdueInvoices.length === 0 || selectedInvoices.length === 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedFutureOrCurrent = selectedInvoices.some(inv => {
      if (!inv.due_date) return false;
      const dueDate = new Date(inv.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today;
    });
    
    const hasUnselectedOverdue = overdueInvoices.some(overdue => 
      !selectedInvoices.some(sel => sel.id === overdue.id)
    );
    
    return selectedFutureOrCurrent && hasUnselectedOverdue;
  }, [selectedInvoices, overdueInvoices]);

  const hiddenInvoicesCount = invoices.length - filteredInvoices.length;

  const toggleInvoiceSelection = (invoice: Invoice) => {
    setSelectedInvoices(prev => {
      const isSelected = prev.some(i => i.id === invoice.id);
      if (isSelected) {
        const newSelection = prev.filter(i => i.id !== invoice.id);
        const totalAmount = newSelection.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
        setPaymentAmount(totalAmount > 0 ? totalAmount.toString() : '');
        return newSelection;
      } else {
        const newSelection = [...prev, invoice];
        const totalAmount = newSelection.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
        setPaymentAmount(totalAmount.toString());
        return newSelection;
      }
    });
  };

  const selectAllInvoices = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
      setPaymentAmount('');
    } else {
      setSelectedInvoices(invoices);
      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
      setPaymentAmount(totalAmount.toString());
    }
  };

  const getTotalSelectedAmount = () => {
    return selectedInvoices.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
  };

  const processPayment = async () => {
    if (selectedInvoices.length === 0 || !paymentAmount || !companyId) {
      toast({
        title: 'بيانات ناقصة',
        description: 'يرجى التأكد من اختيار فاتورة واحدة على الأقل وإدخال المبلغ',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'مبلغ غير صحيح',
        description: 'يرجى إدخال مبلغ صحيح',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const paymentDate = new Date().toISOString().split('T')[0];
      const paymentNumber = `PAY-${Date.now()}`;
      
      const paymentTypeMap: Record<string, string> = {
        'cash': 'cash',
        'bank_transfer': 'bank_transfer',
        'check': 'check',
        'other': 'cash'
      };

      // ✅ معالجة حالة عدم وجود فواتير - إنشاء فاتورة تلقائياً
      if (selectedInvoices.length === 0) {
        // البحث عن عقد نشط للعميل
        const { data: activeContracts, error: contractError } = await supabase
          .from('contracts')
          .select('id, contract_number, monthly_amount')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (contractError || !activeContracts || activeContracts.length === 0) {
          throw new Error('لا يوجد عقد نشط للعميل. يرجى إنشاء فاتورة أولاً.');
        }

        const activeContract = activeContracts[0];
        
        // إنشاء فاتورة تلقائياً للدفعة
        const { generateInvoiceNumber } = await import('@/utils/createInvoiceForPayment');
        const invoiceNumber = await generateInvoiceNumber(companyId);
        
        const paymentDate = new Date().toISOString().split('T')[0];
        
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            company_id: companyId,
            customer_id: customerId,
            contract_id: activeContract.id,
            invoice_number: invoiceNumber,
            invoice_date: paymentDate,
            due_date: paymentDate,
            total_amount: amount,
            balance_due: 0,
            payment_status: 'paid',
            status: 'draft',
            invoice_type: 'rental',
            description: `فاتورة تلقائية للدفعة - عقد ${activeContract.contract_number}`,
            notes: 'تم إنشاء هذه الفاتورة تلقائياً عند تسجيل دفعة بدون فاتورة',
          })
          .select()
          .single();

        if (invoiceError) {
          throw new Error(`فشل في إنشاء الفاتورة: ${invoiceError.message}`);
        }

        // إضافة الفاتورة الجديدة إلى القائمة المحددة
        selectedInvoices.push(newInvoice as any);
        console.log('✅ تم إنشاء فاتورة تلقائياً:', invoiceNumber);
      }

      const contractIds = [...new Set(selectedInvoices.map(inv => inv.contract_id).filter((id): id is string => id !== null))];
      const invoiceNumbers = selectedInvoices.map(inv => inv.invoice_number).join(', ');
      const contractNumbers = selectedInvoices.map(inv => inv.contracts?.contract_number).filter(Boolean).join(', ');

      console.log('Processing payment for invoices:', invoiceNumbers);

      // ✅ إنشاء دفعة منفصلة لكل فاتورة (الحل الصحيح)
      let remainingAmount = amount;
      let firstPaymentId: string | null = null;
      let paymentsCreated = 0;

      for (let i = 0; i < selectedInvoices.length && remainingAmount > 0; i++) {
        const invoice = selectedInvoices[i];
        const invoiceBalance = invoice.balance_due ?? invoice.total_amount;
        const amountToApply = Math.min(remainingAmount, invoiceBalance);
        
        if (amountToApply <= 0) continue;

        const paymentInsertData = {
          company_id: companyId,
          customer_id: customerId,
          contract_id: invoice.contract_id || null,
          invoice_id: invoice.id,
          amount: amountToApply,
          payment_date: paymentDate,
          payment_method: 'received' as const,
          payment_number: `${paymentNumber}-${i + 1}`,
          payment_type: paymentTypeMap[paymentMethod] || 'cash',
          payment_status: 'completed' as const,
          transaction_type: 'receipt' as const,
          currency: 'QAR',
          notes: `دفعة لفاتورة ${invoice.invoice_number}`,
        };
        
        console.log(`Creating payment ${i + 1} for invoice ${invoice.invoice_number}:`, amountToApply);
        
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert(paymentInsertData)
          .select()
          .single();

        if (paymentError) {
          console.error('Payment insert error:', paymentError);
          if (paymentError.code === '23505' && paymentError.message?.includes('idx_payments_unique_transaction')) {
            console.warn(`تخطي الفاتورة ${invoice.invoice_number} - الدفعة مسجلة بالفعل`);
            continue;
          }
          throw new Error(`خطأ في إنشاء الدفعة: ${paymentError.message}`);
        }
        
        if (!firstPaymentId) firstPaymentId = payment.id;
        paymentsCreated++;

        // تحديث الفاتورة
        const newBalance = Math.max(0, invoiceBalance - amountToApply);
        const newPaymentStatus = newBalance <= 0 ? 'paid' : 'partial';
        
        await supabase
          .from('invoices')
          .update({ 
            payment_status: newPaymentStatus,
            paid_amount: (invoice.total_amount - newBalance),
            balance_due: newBalance
          })
          .eq('id', invoice.id);

        remainingAmount -= amountToApply;
      }

      if (paymentsCreated === 0) {
        throw new Error('لم يتم تسجيل أي دفعة. قد تكون جميع الدفعات مسجلة بالفعل.');
      }

      console.log(`Successfully created ${paymentsCreated} payment(s)`);

      // ✅ تحديث last_payment_date فقط - الـ trigger يحسب total_paid تلقائياً
      for (const contractId of contractIds) {
        await supabase
          .from('contracts')
          .update({
            last_payment_date: paymentDate,
          })
          .eq('id', contractId);
      }
      
      // للتوافق مع الكود التالي
      const payment = { id: firstPaymentId };

      const vehicleNumber = selectedInvoices[0]?.contracts?.vehicles?.plate_number || '';

      setPaymentSuccess({
        paymentId: payment.id,
        receiptNumber: generateReceiptNumber(),
        amount: amount,
        invoiceNumber: selectedInvoices.length > 1 
          ? `${selectedInvoices.length} فواتير` 
          : selectedInvoices[0].invoice_number,
        customerName: customerName,
        customerPhone: customerPhone || '',
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        description: selectedInvoices.length > 1 
          ? `دفعة مجمعة لـ ${selectedInvoices.length} فاتورة - عقود: ${contractNumbers}`
          : `دفعة إيجار - عقد رقم ${contractNumbers} - فاتورة ${invoiceNumbers}`,
        vehicleNumber: vehicleNumber,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['monthly-rent-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      toast({
        title: 'تم تسجيل الدفعة بنجاح ✅',
        description: `تم تسجيل دفعة بمبلغ ${amount.toFixed(2)} ر.ق`,
      });

      onSuccess?.();

    } catch (error: unknown) {
      console.error('Error processing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف';
      toast({
        title: 'خطأ في معالجة الدفعة',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || !paymentSuccess) return;
    
    setGeneratingPDF(true);
    try {
      const html = await generateReceiptHTML(receiptRef.current);
      downloadHTML(html, `سند-قبض-${paymentSuccess.receiptNumber}.html`);
      toast({
        title: 'تم تحميل السند ✅',
        description: 'تم حفظ سند القبض',
      });
    } catch (error) {
      console.error('Error generating HTML:', error);
      toast({
        title: 'خطأ في إنشاء الملف',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const sendReceiptViaWhatsApp = async () => {
    if (!paymentSuccess || !paymentSuccess.customerPhone) {
      toast({
        title: 'لا يوجد رقم هاتف',
        description: 'لا يمكن إرسال الإيصال لعدم وجود رقم هاتف للعميل',
        variant: 'destructive',
      });
      return;
    }

    setShowReceipt(true);
    setGeneratingPDF(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const paymentMethodLabel = 
        paymentSuccess.paymentMethod === 'cash' ? 'نقدي' : 
        paymentSuccess.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 
        paymentSuccess.paymentMethod === 'check' ? 'شيك' : 'أخرى';

      const message = `سند قبض رقم: ${paymentSuccess.receiptNumber}

عزيزي/عزيزتي ${paymentSuccess.customerName}،

تم استلام دفعتكم بنجاح

تفاصيل الدفعة:
- رقم السند: ${paymentSuccess.receiptNumber}
- رقم الفاتورة: ${paymentSuccess.invoiceNumber}
- المبلغ المدفوع: ${paymentSuccess.amount.toFixed(2)} ر.ق
- المبلغ كتابة: ${numberToArabicWords(paymentSuccess.amount)}
- تاريخ الدفع: ${formatReceiptDate(paymentSuccess.paymentDate)}
- طريقة الدفع: ${paymentMethodLabel}

شكرا لتعاملكم معنا

شركة العراف لتأجير السيارات`;

      let phone = paymentSuccess.customerPhone.replace(/\s+/g, '').replace(/-/g, '');
      if (phone.startsWith('0')) {
        phone = '974' + phone.substring(1);
      } else if (!phone.startsWith('+') && !phone.startsWith('974')) {
        phone = '974' + phone;
      }
      phone = phone.replace('+', '');

      if (receiptRef.current) {
        const html = await generateReceiptHTML(receiptRef.current);
        downloadHTML(html, `سند-قبض-${paymentSuccess.receiptNumber}.html`);
      }

      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: 'تم فتح واتساب',
        description: 'تم تحميل سند القبض',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            تسجيل دفعة - {customerName}
          </DialogTitle>
        </DialogHeader>

        {/* Payment Success Screen */}
        {paymentSuccess ? (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-green-800">تم تسجيل الدفعة بنجاح!</h3>
              </div>

              <div className="bg-green-50 rounded-xl p-4 space-y-2 text-right border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">{paymentSuccess.amount.toFixed(2)} ر.ق</span>
                  <span className="text-muted-foreground">المبلغ</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-mono">{paymentSuccess.receiptNumber}</span>
                  <span className="text-muted-foreground">رقم السند</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{formatReceiptDate(paymentSuccess.paymentDate)}</span>
                  <span className="text-muted-foreground">التاريخ</span>
                </div>
              </div>

              <div className="flex gap-2 justify-center flex-wrap">
                <Button 
                  onClick={sendReceiptViaWhatsApp} 
                  disabled={!customerPhone || generatingPDF}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {generatingPDF ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <MessageCircle className="h-4 w-4 ml-2" />}
                  إرسال واتساب
                </Button>
                
                <Button variant="outline" size="sm" onClick={() => setShowReceipt(!showReceipt)}>
                  <FileText className="h-4 w-4 ml-2" />
                  {showReceipt ? 'إخفاء' : 'معاينة'}
                </Button>

                <Button variant="outline" size="sm" onClick={handleDownloadReceipt} disabled={generatingPDF || !showReceipt}>
                  <Download className="h-4 w-4 ml-2" />
                  تحميل
                </Button>
                
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  إغلاق
                </Button>
              </div>

              {showReceipt && (
                <div className="mt-4 border rounded-lg overflow-auto bg-gray-100 p-2" style={{ maxHeight: '50vh' }}>
                  <PaymentReceipt
                    ref={receiptRef}
                    receiptNumber={paymentSuccess.receiptNumber}
                    date={formatReceiptDate(paymentSuccess.paymentDate)}
                    customerName={paymentSuccess.customerName}
                    amountInWords={numberToArabicWords(paymentSuccess.amount)}
                    amount={paymentSuccess.amount}
                    description={paymentSuccess.description}
                    paymentMethod={paymentSuccess.paymentMethod as 'cash' | 'check' | 'bank_transfer' | 'other'}
                    vehicleNumber={paymentSuccess.vehicleNumber}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Loading State */}
            {loadingInvoices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
              </div>
            ) : !readyToPay ? (
              /* Invoice Selection */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>اختر الفواتير المراد دفعها</Label>
                  {invoices.length > 0 && (
                    <Button variant="outline" size="sm" onClick={selectAllInvoices}>
                      {selectedInvoices.length === invoices.length ? 'إلغاء الكل' : 'تحديد الكل'}
                    </Button>
                  )}
                </div>

                {hasFutureSelectionWithOverdue && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-amber-800 font-medium text-sm">تنبيه: توجد فواتير متأخرة</p>
                      <p className="text-amber-700 text-xs">يُفضل دفع الفواتير المتأخرة أولاً.</p>
                    </div>
                  </div>
                )}

                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد فواتير غير مدفوعة لهذا العميل
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {filteredInvoices.map((invoice) => {
                        const isOverdue = invoice.due_date ? new Date(invoice.due_date) < new Date() : false;
                        const isSelected = selectedInvoices.some(i => i.id === invoice.id);
                        const balanceDue = invoice.balance_due ?? invoice.total_amount;
                        return (
                          <div
                            key={invoice.id}
                            className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-green-50 border-r-4 border-r-green-500' : 'hover:bg-accent'}`}
                            onClick={() => toggleInvoiceSelection(invoice)}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="h-4 w-4 rounded border-gray-300 text-green-600"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-sm">{invoice.invoice_number}</div>
                                    <div className="text-xs text-muted-foreground">
                                      استحقاق: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-EG') : '-'}
                                    </div>
                                  </div>
                                  <div className="text-left">
                                    <div className="font-bold">{balanceDue.toFixed(2)} ر.ق</div>
                                    {isOverdue && <Badge variant="destructive" className="text-xs">متأخر</Badge>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {!showAllInvoices && hiddenInvoicesCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-blue-600"
                        onClick={() => setShowAllInvoices(true)}
                      >
                        <ChevronDown className="h-4 w-4 ml-1" />
                        عرض {hiddenInvoicesCount} فاتورة إضافية
                      </Button>
                    )}
                  </div>
                )}

                {selectedInvoices.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-green-800">
                        تم تحديد {selectedInvoices.length} فاتورة
                      </span>
                      <span className="text-xl font-bold text-green-700">
                        {getTotalSelectedAmount().toFixed(2)} ر.ق
                      </span>
                    </div>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setReadyToPay(true)}
                    >
                      <Check className="h-4 w-4 ml-2" />
                      متابعة للدفع
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Payment Form */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>تفاصيل الدفع</Label>
                  <Button variant="ghost" size="sm" onClick={() => setReadyToPay(false)}>
                    <X className="h-4 w-4 ml-1" />
                    تعديل الاختيار
                  </Button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                  {selectedInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center text-sm">
                      <span>{invoice.invoice_number}</span>
                      <span className="font-medium">{(invoice.balance_due ?? invoice.total_amount).toFixed(2)} ر.ق</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between items-center font-bold">
                    <span>المجموع</span>
                    <span className="text-green-600">{getTotalSelectedAmount().toFixed(2)} ر.ق</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ المدفوع</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={processPayment} disabled={processing} className="flex-1">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Check className="h-4 w-4 ml-2" />}
                    تأكيد الدفعة
                  </Button>
                  <Button variant="outline" onClick={() => setReadyToPay(false)}>
                    رجوع
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
