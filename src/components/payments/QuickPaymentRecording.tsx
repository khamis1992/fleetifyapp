import { useState, useRef } from 'react';
import { Search, Check, X, Loader2, MessageCircle, CheckCircle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PaymentReceipt } from './PaymentReceipt';
import { generateReceiptPDF, downloadPDF, numberToArabicWords, generateReceiptNumber, formatReceiptDate } from '@/utils/receiptGenerator';

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
}

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
}

export function QuickPaymentRecording() {
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [readyToPay, setReadyToPay] = useState(false);

  const searchCustomers = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      setCustomers(data || []);
      if (data && data.length === 0) {
        toast({
          title: 'لم يتم العثور على عملاء',
          description: 'جرب البحث باسم أو رقم هاتف مختلف',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      toast({
        title: 'خطأ في البحث',
        description: 'حدث خطأ أثناء البحث عن العملاء',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomers([]);
    setSearchTerm('');

    // Fetch unpaid invoices for this customer
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
          contracts (contract_number)
        `)
        .eq('customer_id', customer.id)
        .in('payment_status', ['unpaid', 'partial'])
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
    }
  };

  const toggleInvoiceSelection = (invoice: Invoice) => {
    setSelectedInvoices(prev => {
      const isSelected = prev.some(i => i.id === invoice.id);
      if (isSelected) {
        const newSelection = prev.filter(i => i.id !== invoice.id);
        // Update payment amount
        const totalAmount = newSelection.reduce((sum, inv) => sum + (inv.balance_due ?? inv.total_amount), 0);
        setPaymentAmount(totalAmount > 0 ? totalAmount.toString() : '');
        return newSelection;
      } else {
        const newSelection = [...prev, invoice];
        // Update payment amount
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
    if (!selectedCustomer || selectedInvoices.length === 0 || !paymentAmount || !companyId) {
      toast({
        title: 'بيانات ناقصة',
        description: 'يرجى التأكد من اختيار العميل وفاتورة واحدة على الأقل وإدخال المبلغ',
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
      
      console.log('Processing payment with:', {
        companyId,
        customerId: selectedCustomer.id,
        invoiceIds: selectedInvoices.map(i => i.id),
        amount,
        paymentMethod
      });
      
      const paymentTypeMap: Record<string, string> = {
        'cash': 'cash',
        'bank_transfer': 'bank_transfer',
        'check': 'check',
        'other': 'cash'
      };

      // Group invoices by contract
      const contractIds = [...new Set(selectedInvoices.map(inv => inv.contract_id).filter((id): id is string => id !== null))];
      const invoiceNumbers = selectedInvoices.map(inv => inv.invoice_number).join(', ');
      const contractNumbers = selectedInvoices.map(inv => inv.contracts?.contract_number).filter(Boolean).join(', ');
      const firstContractId = selectedInvoices[0].contract_id;

      // Create single payment record for all selected invoices
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          company_id: companyId,
          customer_id: selectedCustomer.id,
          contract_id: firstContractId || null,
          invoice_id: selectedInvoices[0].id,
          amount: amount,
          payment_date: paymentDate,
          payment_method: 'received' as const,
          payment_number: paymentNumber,
          payment_type: paymentTypeMap[paymentMethod] || 'cash',
          payment_status: 'completed' as const,
          transaction_type: 'receipt' as const,
          currency: 'QAR',
          notes: selectedInvoices.length > 1 
            ? `دفعة مجمعة لـ ${selectedInvoices.length} فاتورة: ${invoiceNumbers}`
            : `دفعة لفاتورة ${invoiceNumbers}`,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Payment insert error:', paymentError);
        throw paymentError;
      }
      console.log('Payment created successfully:', payment);

      // Update all selected invoices
      let remainingAmount = amount;
      for (const invoice of selectedInvoices) {
        const invoiceBalance = invoice.balance_due ?? invoice.total_amount;
        const amountToApply = Math.min(remainingAmount, invoiceBalance);
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
        if (remainingAmount <= 0) break;
      }

      // Update all affected contracts
      for (const contractId of contractIds) {
        const { data: contract, error: contractFetchError } = await supabase
          .from('contracts')
          .select('total_paid, balance_due, contract_amount')
          .eq('id', contractId)
          .single();

        if (!contractFetchError && contract) {
          // Calculate amount applied to this contract's invoices
          const contractInvoices = selectedInvoices.filter(inv => inv.contract_id === contractId);
          const contractPaymentAmount = contractInvoices.reduce((sum, inv) => {
            return sum + Math.min(inv.balance_due ?? inv.total_amount, amount / selectedInvoices.length);
          }, 0);

          const newTotalPaid = (contract.total_paid || 0) + contractPaymentAmount;
          const newContractBalance = Math.max(0, (contract.contract_amount || 0) - newTotalPaid);

          await supabase
            .from('contracts')
            .update({
              total_paid: newTotalPaid,
              balance_due: newContractBalance,
              last_payment_date: paymentDate,
              payment_status: newContractBalance <= 0 ? 'paid' : newTotalPaid > 0 ? 'partial' : 'unpaid',
            })
            .eq('id', contractId);
        }
      }

      // Show success screen
      setPaymentSuccess({
        paymentId: payment.id,
        receiptNumber: generateReceiptNumber(),
        amount: amount,
        invoiceNumber: selectedInvoices.length > 1 
          ? `${selectedInvoices.length} فواتير` 
          : selectedInvoices[0].invoice_number,
        customerName: `${selectedCustomer.first_name} ${selectedCustomer.last_name || ''}`.trim(),
        customerPhone: selectedCustomer.phone,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        description: selectedInvoices.length > 1 
          ? `دفعة مجمعة لـ ${selectedInvoices.length} فاتورة - عقود: ${contractNumbers}`
          : `دفعة إيجار - عقد رقم ${contractNumbers} - فاتورة ${invoiceNumbers}`,
      });

      toast({
        title: 'تم تسجيل الدفعة بنجاح ✅',
        description: `تم تسجيل دفعة بمبلغ ${amount.toFixed(2)} ر.ق لـ ${selectedInvoices.length} فاتورة`,
      });

    } catch (error: unknown) {
      console.error('Error processing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 
        (error as { message?: string })?.message || 'حدث خطأ غير معروف';
      toast({
        title: 'خطأ في معالجة الدفعة',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !paymentSuccess) return;
    
    setGeneratingPDF(true);
    try {
      const blob = await generateReceiptPDF(receiptRef.current, `receipt-${paymentSuccess.receiptNumber}.pdf`);
      downloadPDF(blob, `سند-قبض-${paymentSuccess.receiptNumber}.pdf`);
      toast({
        title: 'تم تحميل السند ✅',
        description: 'تم حفظ سند القبض بصيغة PDF',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'خطأ في إنشاء PDF',
        description: 'حدث خطأ أثناء إنشاء الملف',
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

    // First, show the receipt for PDF generation
    setShowReceipt(true);
    setGeneratingPDF(true);

    // Wait a moment for the receipt to render
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Generate PDF
      if (receiptRef.current) {
        const blob = await generateReceiptPDF(receiptRef.current, `receipt-${paymentSuccess.receiptNumber}.pdf`);
        // Download the PDF first so user can attach it
        downloadPDF(blob, `سند-قبض-${paymentSuccess.receiptNumber}.pdf`);
      }

      const paymentMethodLabel = 
        paymentSuccess.paymentMethod === 'cash' ? 'نقدي' : 
        paymentSuccess.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 
        paymentSuccess.paymentMethod === 'check' ? 'شيك' : 'أخرى';

      const message = `📄 *سند قبض رقم: ${paymentSuccess.receiptNumber}*

━━━━━━━━━━━━━━━

عزيزي/عزيزتي *${paymentSuccess.customerName}*،

تم استلام دفعتكم بنجاح ✅

📋 *تفاصيل الدفعة:*
• رقم السند: ${paymentSuccess.receiptNumber}
• رقم الفاتورة: ${paymentSuccess.invoiceNumber}
• المبلغ المدفوع: *${paymentSuccess.amount.toFixed(2)} ر.ق*
• المبلغ كتابة: ${numberToArabicWords(paymentSuccess.amount)}
• تاريخ الدفع: ${formatReceiptDate(paymentSuccess.paymentDate)}
• طريقة الدفع: ${paymentMethodLabel}

━━━━━━━━━━━━━━━

📎 *مرفق: سند القبض PDF*
(تم تحميل الملف على جهازك، يرجى إرفاقه في المحادثة)

شكراً لتعاملكم معنا 🙏

_شركة العراف لتأجير السيارات_`;

      // Format phone number
      let phone = paymentSuccess.customerPhone.replace(/\s+/g, '').replace(/-/g, '');
      if (phone.startsWith('0')) {
        phone = '974' + phone.substring(1);
      } else if (!phone.startsWith('+') && !phone.startsWith('974')) {
        phone = '974' + phone;
      }
      phone = phone.replace('+', '');

      // Open WhatsApp Web
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: 'تم فتح واتساب ✅',
        description: 'تم تحميل سند القبض PDF، أرفقه في محادثة واتساب ثم اضغط إرسال',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء السند',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedInvoices([]);
    setInvoices([]);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setSearchTerm('');
    setCustomers([]);
    setPaymentSuccess(null);
    setShowReceipt(false);
    setReadyToPay(false);
  };

  return (
    <div className="space-y-6">
      {/* Payment Success Screen */}
      {paymentSuccess && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-green-800">تم تسجيل الدفعة بنجاح!</h3>
                <p className="text-green-600 mt-1">تم حفظ الدفعة في النظام</p>
              </div>

              <div className="bg-white rounded-xl p-4 space-y-3 text-right border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">{paymentSuccess.amount.toFixed(2)} ر.ق</span>
                  <span className="text-muted-foreground">المبلغ المدفوع</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-mono">{paymentSuccess.receiptNumber}</span>
                  <span className="text-muted-foreground">رقم السند</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{paymentSuccess.invoiceNumber}</span>
                  <span className="text-muted-foreground">رقم الفاتورة</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{paymentSuccess.customerName}</span>
                  <span className="text-muted-foreground">العميل</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{formatReceiptDate(paymentSuccess.paymentDate)}</span>
                  <span className="text-muted-foreground">التاريخ</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">هل تريد إرسال سند القبض للعميل؟</p>
                
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button 
                    onClick={sendReceiptViaWhatsApp} 
                    disabled={!paymentSuccess.customerPhone || generatingPDF}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {generatingPDF ? (
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4 ml-2" />
                    )}
                    إرسال عبر واتساب
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setShowReceipt(!showReceipt)}
                  >
                    <FileText className="h-4 w-4 ml-2" />
                    {showReceipt ? 'إخفاء السند' : 'معاينة السند'}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={handleDownloadPDF}
                    disabled={generatingPDF || !showReceipt}
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تحميل PDF
                  </Button>
                  
                  <Button variant="ghost" onClick={resetForm}>
                    دفعة جديدة
                  </Button>
                </div>

                {!paymentSuccess.customerPhone && (
                  <p className="text-xs text-amber-600">
                    ⚠️ لا يوجد رقم هاتف للعميل
                  </p>
                )}
              </div>

              {/* Receipt Preview */}
              {showReceipt && (
                <div className="mt-6 border rounded-lg overflow-auto bg-gray-100 p-4" style={{ maxHeight: '600px' }}>
                  <div className="transform scale-75 origin-top">
                    <PaymentReceipt
                      ref={receiptRef}
                      receiptNumber={paymentSuccess.receiptNumber}
                      date={formatReceiptDate(paymentSuccess.paymentDate)}
                      customerName={paymentSuccess.customerName}
                      amountInWords={numberToArabicWords(paymentSuccess.amount)}
                      amount={paymentSuccess.amount}
                      description={paymentSuccess.description}
                      paymentMethod={paymentSuccess.paymentMethod as 'cash' | 'check' | 'bank_transfer' | 'other'}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Payment Form */}
      {!paymentSuccess && (
      <Card>
        <CardHeader>
          <CardTitle>تسجيل دفعة سريع</CardTitle>
          <CardDescription>
            ابحث عن العميل، اختر الفاتورة، وسجل الدفعة في أقل من دقيقة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Search Customer */}
          {!selectedCustomer && (
            <div className="space-y-4">
              <Label>ابحث عن العميل</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="اسم العميل أو رقم الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
                />
                <Button onClick={searchCustomers} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {customers.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-accent cursor-pointer"
                      onClick={() => selectCustomer(customer)}
                    >
                      <div className="font-medium">
                        {customer.first_name} {customer.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{customer.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Show Selected Customer and Invoices */}
          {selectedCustomer && !readyToPay && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>العميل المختار</Label>
                  <div className="text-lg font-medium">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>اختر الفواتير المراد دفعها (يمكنك تحديد أكثر من فاتورة)</Label>
                  {invoices.length > 0 && (
                    <Button variant="outline" size="sm" onClick={selectAllInvoices}>
                      {selectedInvoices.length === invoices.length ? 'إلغاء الكل' : 'تحديد الكل'}
                    </Button>
                  )}
                </div>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد فواتير غير مدفوعة لهذا العميل
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                    {invoices.map((invoice) => {
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
                              className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{invoice.invoice_number}</div>
                                  <div className="text-sm text-muted-foreground">
                                    عقد: {invoice.contracts?.contract_number || '-'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    تاريخ الاستحقاق: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-EG') : '-'}
                                  </div>
                                </div>
                                <div className="text-left">
                                  <div className="text-lg font-bold">{balanceDue.toFixed(2)} ريال</div>
                                  {isOverdue && (
                                    <Badge variant="destructive" className="mt-1">
                                      متأخر
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show proceed button when invoices are selected */}
                {selectedInvoices.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
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
                      متابعة للدفع ({selectedInvoices.length} فاتورة)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {selectedCustomer && readyToPay && selectedInvoices.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>الفواتير المختارة ({selectedInvoices.length})</Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedInvoices.map(inv => inv.invoice_number).join(' - ')}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setReadyToPay(false)}>
                  <X className="h-4 w-4" />
                  <span className="mr-1">تعديل الاختيار</span>
                </Button>
              </div>

              {/* Summary of selected invoices */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
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

              <div className="flex gap-2 pt-4">
                <Button onClick={processPayment} disabled={processing} className="flex-1">
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Check className="h-4 w-4 ml-2" />
                  )}
                  تأكيد الدفعة ({selectedInvoices.length} فاتورة)
                </Button>
                <Button variant="outline" onClick={() => setReadyToPay(false)}>
                  رجوع
                </Button>
                <Button variant="ghost" onClick={resetForm}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
