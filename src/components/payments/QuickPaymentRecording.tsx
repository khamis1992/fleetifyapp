import React, { useState } from 'react';
import { Search, DollarSign, Check, X, Loader2, Send, MessageCircle, CheckCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
  payment_status: string;
  contract_id: string;
  contracts: {
    contract_number: string;
  };
}

interface PaymentSuccess {
  paymentId: string;
  amount: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  paymentDate: string;
}

export function QuickPaymentRecording() {
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null);
  const [sendingReceipt, setSendingReceipt] = useState(false);

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

  const selectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    // Use balance_due if available, otherwise total_amount
    const amountDue = invoice.balance_due ?? invoice.total_amount;
    setPaymentAmount(amountDue.toString());
  };

  const processPayment = async () => {
    if (!selectedCustomer || !selectedInvoice || !paymentAmount) {
      toast({
        title: 'بيانات ناقصة',
        description: 'يرجى التأكد من اختيار العميل والفاتورة وإدخال المبلغ',
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
      // 1. Create payment record
      const paymentDate = new Date().toISOString().split('T')[0];
      const paymentNumber = `PAY-${Date.now()}`;
      
      // Map payment method to payment type
      const paymentTypeMap: Record<string, string> = {
        'cash': 'cash',
        'bank_transfer': 'bank_transfer',
        'check': 'check',
        'other': 'cash'
      };
      
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          company_id: companyId,
          customer_id: selectedCustomer.id,
          contract_id: selectedInvoice.contract_id,
          invoice_id: selectedInvoice.id,
          amount: amount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          payment_number: paymentNumber,
          payment_type: paymentTypeMap[paymentMethod] || 'cash',
          payment_status: 'completed',
          currency: 'QAR',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Update invoice payment_status and balance_due
      const currentBalance = selectedInvoice.balance_due ?? selectedInvoice.total_amount;
      const newBalance = Math.max(0, currentBalance - amount);
      const newPaymentStatus = newBalance <= 0 ? 'paid' : 'partial';
      
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ 
          payment_status: newPaymentStatus,
          paid_amount: (selectedInvoice.total_amount - newBalance),
          balance_due: newBalance
        })
        .eq('id', selectedInvoice.id);

      if (invoiceError) throw invoiceError;

      // 3. Update contract balance if contract exists
      if (selectedInvoice.contract_id) {
        const { data: contract, error: contractFetchError } = await supabase
          .from('contracts')
          .select('total_paid, balance_due, contract_amount')
          .eq('id', selectedInvoice.contract_id)
          .single();

        if (!contractFetchError && contract) {
          const newTotalPaid = (contract.total_paid || 0) + amount;
          const newContractBalance = Math.max(0, (contract.contract_amount || 0) - newTotalPaid);

          await supabase
            .from('contracts')
            .update({
              total_paid: newTotalPaid,
              balance_due: newContractBalance,
              last_payment_date: paymentDate,
              payment_status: newContractBalance <= 0 ? 'paid' : newTotalPaid > 0 ? 'partial' : 'unpaid',
            })
            .eq('id', selectedInvoice.contract_id);
        }
      }

      // Show success screen with receipt option
      setPaymentSuccess({
        paymentId: payment.id,
        amount: amount,
        invoiceNumber: selectedInvoice.invoice_number,
        customerName: `${selectedCustomer.first_name} ${selectedCustomer.last_name || ''}`.trim(),
        customerPhone: selectedCustomer.phone,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
      });

      toast({
        title: 'تم تسجيل الدفعة بنجاح ✅',
        description: `تم تسجيل دفعة بمبلغ ${amount.toFixed(2)} ر.ق`,
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'خطأ في معالجة الدفعة',
        description: 'حدث خطأ أثناء معالجة الدفعة، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
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

    setSendingReceipt(true);
    try {
      const paymentMethodLabel = 
        paymentSuccess.paymentMethod === 'cash' ? 'نقدي' : 
        paymentSuccess.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 
        paymentSuccess.paymentMethod === 'check' ? 'شيك' : 'أخرى';

      const message = `
📄 *سند قبض*

━━━━━━━━━━━━━━━

عزيزي/عزيزتي *${paymentSuccess.customerName}*،

تم استلام دفعتكم بنجاح ✅

📋 *تفاصيل الدفعة:*
• رقم الفاتورة: ${paymentSuccess.invoiceNumber}
• المبلغ المدفوع: *${paymentSuccess.amount.toFixed(2)} ر.ق*
• تاريخ الدفع: ${new Date(paymentSuccess.paymentDate).toLocaleDateString('ar-QA')}
• طريقة الدفع: ${paymentMethodLabel}

━━━━━━━━━━━━━━━

شكراً لتعاملكم معنا 🙏

_شركة العراف لتأجير السيارات_
      `.trim();

      // Use Ultramsg API directly
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('ultramsg_instance_id, ultramsg_token')
        .eq('company_id', companyId)
        .single();

      if (settings?.ultramsg_instance_id && settings?.ultramsg_token) {
        const response = await fetch(
          `https://api.ultramsg.com/${settings.ultramsg_instance_id}/messages/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              token: settings.ultramsg_token,
              to: paymentSuccess.customerPhone,
              body: message,
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to send WhatsApp message');

        toast({
          title: 'تم إرسال سند القبض ✅',
          description: `تم إرسال سند القبض إلى ${paymentSuccess.customerPhone}`,
        });
      } else {
        toast({
          title: 'إعدادات واتساب غير مكتملة',
          description: 'يرجى إعداد واتساب من الإعدادات أولاً',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast({
        title: 'خطأ في إرسال سند القبض',
        description: 'حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setSendingReceipt(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedInvoice(null);
    setInvoices([]);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setSearchTerm('');
    setCustomers([]);
    setPaymentSuccess(null);
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
                  <span>{paymentSuccess.invoiceNumber}</span>
                  <span className="text-muted-foreground">رقم الفاتورة</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{paymentSuccess.customerName}</span>
                  <span className="text-muted-foreground">العميل</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{new Date(paymentSuccess.paymentDate).toLocaleDateString('ar-QA')}</span>
                  <span className="text-muted-foreground">التاريخ</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">هل تريد إرسال سند القبض للعميل؟</p>
                
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={sendReceiptViaWhatsApp} 
                    disabled={sendingReceipt || !paymentSuccess.customerPhone}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {sendingReceipt ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <MessageCircle className="h-4 w-4 ml-2" />
                    )}
                    إرسال عبر واتساب
                  </Button>
                  
                  <Button variant="outline" onClick={resetForm}>
                    دفعة جديدة
                  </Button>
                </div>

                {!paymentSuccess.customerPhone && (
                  <p className="text-xs text-amber-600">
                    ⚠️ لا يوجد رقم هاتف للعميل
                  </p>
                )}
              </div>
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
          {selectedCustomer && !selectedInvoice && (
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
                <Label>اختر الفاتورة المراد دفعها</Label>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد فواتير غير مدفوعة لهذا العميل
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {invoices.map((invoice) => {
                      const isOverdue = new Date(invoice.due_date) < new Date();
                      return (
                        <div
                          key={invoice.id}
                          className="p-3 hover:bg-accent cursor-pointer"
                          onClick={() => selectInvoice(invoice)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{invoice.invoice_number}</div>
                              <div className="text-sm text-muted-foreground">
                                عقد: {invoice.contracts?.contract_number}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                تاريخ الاستحقاق: {new Date(invoice.due_date).toLocaleDateString('ar-EG')}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-lg font-bold">{invoice.total_amount.toFixed(2)} ريال</div>
                              {isOverdue && (
                                <Badge variant="destructive" className="mt-1">
                                  متأخر
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {selectedCustomer && selectedInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>الفاتورة المختارة</Label>
                  <div className="text-lg font-medium">{selectedInvoice.invoice_number}</div>
                  <div className="text-sm text-muted-foreground">
                    المبلغ الإجمالي: {selectedInvoice.total_amount.toFixed(2)} ريال
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>
                  <X className="h-4 w-4" />
                </Button>
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
                  تأكيد الدفعة
                </Button>
                <Button variant="outline" onClick={resetForm}>
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
