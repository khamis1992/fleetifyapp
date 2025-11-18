import React, { useState } from 'react';
import { Search, DollarSign, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  status: string;
  contract_id: string;
  contracts: {
    contract_number: string;
  };
}

export function QuickPaymentRecording() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

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
          status,
          contract_id,
          contracts (contract_number)
        `)
        .eq('customer_id', customer.id)
        .eq('status', 'unpaid')
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
    setPaymentAmount(invoice.total_amount.toString());
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
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          customer_id: selectedCustomer.id,
          contract_id: selectedInvoice.contract_id,
          invoice_id: selectedInvoice.id,
          payment_amount: amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          status: 'completed',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Update invoice status
      const newStatus = amount >= selectedInvoice.total_amount ? 'paid' : 'partial';
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', selectedInvoice.id);

      if (invoiceError) throw invoiceError;

      // 3. Update contract balance
      const { data: contract, error: contractFetchError } = await supabase
        .from('contracts')
        .select('total_paid, balance_due, contract_amount')
        .eq('id', selectedInvoice.contract_id)
        .single();

      if (contractFetchError) throw contractFetchError;

      const newTotalPaid = (contract.total_paid || 0) + amount;
      const newBalanceDue = contract.contract_amount - newTotalPaid;

      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          total_paid: newTotalPaid,
          balance_due: newBalanceDue,
          last_payment_date: new Date().toISOString().split('T')[0],
          payment_status: newBalanceDue <= 0 ? 'paid' : newBalanceDue < contract.contract_amount ? 'partial' : 'unpaid',
        })
        .eq('id', selectedInvoice.contract_id);

      if (contractError) throw contractError;

      // 4. Send receipt via WhatsApp
      if (selectedCustomer.phone) {
        const message = `
✅ إيصال دفع

عزيزي ${selectedCustomer.first_name} ${selectedCustomer.last_name || ''},

تم استلام دفعتك بنجاح:
📄 رقم الفاتورة: ${selectedInvoice.invoice_number}
💰 المبلغ المدفوع: ${amount.toFixed(2)} ريال
📅 تاريخ الدفع: ${new Date().toLocaleDateString('ar-SA')}
💳 طريقة الدفع: ${paymentMethod === 'cash' ? 'نقدي' : paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'أخرى'}

شكراً لتعاملكم معنا.
        `.trim();

        await supabase.functions.invoke('send-whatsapp-reminders', {
          body: {
            phone: selectedCustomer.phone,
            message: message,
          },
        });
      }

      toast({
        title: 'تم تسجيل الدفعة بنجاح',
        description: `تم تسجيل دفعة بمبلغ ${amount.toFixed(2)} ريال وإرسال الإيصال للعميل`,
      });

      // Reset form
      setSelectedCustomer(null);
      setSelectedInvoice(null);
      setInvoices([]);
      setPaymentAmount('');
      setPaymentMethod('cash');
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

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedInvoice(null);
    setInvoices([]);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setSearchTerm('');
    setCustomers([]);
  };

  return (
    <div className="space-y-6">
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
                                تاريخ الاستحقاق: {new Date(invoice.due_date).toLocaleDateString('ar-SA')}
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
    </div>
  );
}
