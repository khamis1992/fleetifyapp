import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, DollarSign, Calendar } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PaymentScheduleSection } from '@/components/finance/PaymentScheduleSection';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { formatMonthlyPaymentDescription } from '@/utils/invoiceDescriptionFormatter';

interface ContractInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  onSuccess?: () => void;
}

export const ContractInvoiceDialog: React.FC<ContractInvoiceDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onSuccess
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [paymentScheduleCreated, setPaymentScheduleCreated] = React.useState(false);
  
  const { formatCurrency, currency } = useCurrencyFormatter();
  
  const getInitialDescription = () => {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1); // Default due date is next month
    return formatMonthlyPaymentDescription(dueDate, contract?.contract_number || '');
  };

  const [invoiceData, setInvoiceData] = React.useState({
    invoice_type: 'sales',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    subtotal: contract?.monthly_amount || 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: contract?.monthly_amount || 0,
    notes: '',
    terms: contract?.terms || '',
    items: [
      {
        item_description: getInitialDescription(),
        quantity: 1,
        unit_price: contract?.monthly_amount || 0,
        line_total: contract?.monthly_amount || 0,
        tax_rate: 0,
        tax_amount: 0
      }
    ]
  });

  // Get cost centers for the invoice
  const { data: costCenters } = useQuery({
    queryKey: ['cost-centers', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const { data } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('center_name');
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  const calculateTotals = () => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.line_total, 0);
    const totalTax = invoiceData.items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = subtotal + totalTax - invoiceData.discount_amount;
    
    return {
      subtotal,
      tax_amount: totalTax,
      total_amount: total
    };
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...invoiceData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate line total and tax amount
    if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
      const item = newItems[index];
      item.line_total = item.quantity * item.unit_price;
      item.tax_amount = item.line_total * (item.tax_rate / 100);
    }
    
    // Update items and recalculate totals
    setInvoiceData(prev => {
      const updatedData = { ...prev, items: newItems };
      const totals = calculateTotalsFromItems(newItems, prev.discount_amount);
      return { ...updatedData, ...totals };
    });
  };

  const calculateTotalsFromItems = (items: any[], discountAmount: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = subtotal + totalTax - discountAmount;
    
    return {
      subtotal,
      tax_amount: totalTax,
      total_amount: total
    };
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_description: '',
          quantity: 1,
          unit_price: 0,
          line_total: 0,
          tax_rate: 0,
          tax_amount: 0
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    if (invoiceData.items.length > 1) {
      setInvoiceData(prev => {
        const newItems = prev.items.filter((_, i) => i !== index);
        const totals = calculateTotalsFromItems(newItems, prev.discount_amount);
        return { ...prev, items: newItems, ...totals };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('=== Invoice Creation Debug ===');
      console.log('User profile:', user?.profile);
      console.log('Contract:', contract);
      console.log('Invoice data:', invoiceData);
      
      const invoiceNumber = generateInvoiceNumber();
      console.log('Generated invoice number:', invoiceNumber);
      
      const invoicePayload = {
        company_id: user?.profile?.company_id,
        invoice_number: invoiceNumber,
        invoice_type: invoiceData.invoice_type,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date || null,
        customer_id: contract.customer_id,
        contract_id: contract.id,
        cost_center_id: contract.cost_center_id,
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.tax_amount,
        discount_amount: invoiceData.discount_amount,
        total_amount: invoiceData.total_amount,
        balance_due: invoiceData.total_amount,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        status: 'sent',
        payment_status: 'unpaid',
        created_by: user?.id
      };
      
      console.log('Invoice payload:', invoicePayload);
      
      // Create the invoice
      console.log('Attempting to insert invoice...');
      const { data: invoiceResponse, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoicePayload])
        .select();

      console.log('Insert response:', { invoiceResponse, invoiceError });

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        console.error('Error details:', JSON.stringify(invoiceError, null, 2));
        throw invoiceError;
      }

      if (!invoiceResponse || invoiceResponse.length === 0) {
        console.error('No invoice data returned from insert');
        throw new Error('Failed to create invoice - no data returned');
      }

      const invoice = invoiceResponse[0];
      console.log('Created invoice:', invoice);

      // Create invoice items
      const itemsToInsert = invoiceData.items.map((item, index) => ({
        invoice_id: invoice.id,
        line_number: index + 1,
        item_description: item.item_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        cost_center_id: contract.cost_center_id
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('تم إنشاء الفاتورة بنجاح');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['contract-invoices', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setInvoiceData({
        invoice_type: 'sales',
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        subtotal: contract?.monthly_amount || 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: contract?.monthly_amount || 0,
        notes: '',
        terms: contract?.terms || '',
        items: [
          {
            item_description: getInitialDescription(),
            quantity: 1,
            unit_price: contract?.monthly_amount || 0,
            line_total: contract?.monthly_amount || 0,
            tax_rate: 0,
            tax_amount: 0
          }
        ]
      });
      setPaymentScheduleCreated(false);

    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ في إنشاء الفاتورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إنشاء فاتورة من العقد رقم {contract.contract_number}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات الفاتورة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>نوع الفاتورة</Label>
                <Select
                  value={invoiceData.invoice_type}
                  onValueChange={(value) => setInvoiceData(prev => ({ ...prev, invoice_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">فاتورة مبيعات</SelectItem>
                    <SelectItem value="service">فاتورة خدمة</SelectItem>
                    <SelectItem value="rental">فاتورة إيجار</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>تاريخ الفاتورة</Label>
                <Input
                  type="date"
                  value={invoiceData.invoice_date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>تاريخ الاستحقاق</Label>
                <Input
                  type="date"
                  value={invoiceData.due_date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Schedule Section - Only show for sales invoices */}
          {invoiceData.invoice_type === 'sales' && contract?.id && (
            <PaymentScheduleSection
              contractId={contract.id}
              totalAmount={invoiceData.total_amount}
              currency={currency}
              onScheduleCreated={() => {
                setPaymentScheduleCreated(true);
                toast.success('تم إنشاء جدول الدفع بنجاح');
                // Invalidate payment schedules queries
                queryClient.invalidateQueries({ queryKey: ['contract-payment-schedules', contract.id] });
              }}
            />
          )}

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">بنود الفاتورة</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة بند
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoiceData.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">البند {index + 1}</span>
                    {invoiceData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-destructive"
                      >
                        حذف
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2 space-y-2">
                      <Label>وصف البند</Label>
                      <Textarea
                        value={item.item_description}
                        onChange={(e) => updateItem(index, 'item_description', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>الكمية</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>سعر الوحدة ({currency})</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>المجموع ({currency})</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.line_total.toFixed(3)}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>معدل الضريبة (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>مبلغ الضريبة ({currency})</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.tax_amount.toFixed(3)}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الإجماليات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>المجموع الفرعي ({currency})</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={invoiceData.subtotal.toFixed(3)}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الضريبة ({currency})</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={invoiceData.tax_amount.toFixed(3)}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الخصم ({currency})</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={invoiceData.discount_amount}
                    onChange={(e) => {
                      const discount = parseFloat(e.target.value) || 0;
                      setInvoiceData(prev => {
                        const totals = calculateTotalsFromItems(prev.items, discount);
                        return { ...prev, discount_amount: discount, ...totals };
                      });
                    }}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>المجموع الإجمالي</span>
                  <span className="text-2xl text-primary">
                    {formatCurrency(invoiceData.total_amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية للفاتورة"
                  rows={4}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>شروط الدفع</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={invoiceData.terms}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, terms: e.target.value }))}
                  placeholder="شروط وأحكام الدفع"
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};