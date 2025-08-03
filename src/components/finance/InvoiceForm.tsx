import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, TestTube } from "lucide-react";
import { useCreateInvoice, useCostCenters, useFixedAssets } from "@/hooks/useFinance";
import { useEntryAllowedAccounts } from "@/hooks/useEntryAllowedAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveContracts } from "@/hooks/useContracts";
import { PaymentScheduleSection } from "./PaymentScheduleSection";
import { toast } from "sonner";

interface InvoiceItem {
  id: string;
  description: string;
  description_ar?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  account_id?: string;
  cost_center_id?: string;
}

interface InvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  vendorId?: string;
  type: 'sales' | 'purchase';
  contractId?: string;
}

export function InvoiceForm({ open, onOpenChange, customerId, vendorId, type, contractId }: InvoiceFormProps) {
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = useEntryAllowedAccounts();
  const { data: costCenters, isLoading: costCentersLoading } = useCostCenters();
  const { data: fixedAssets, isLoading: assetsLoading } = useFixedAssets();
  const createInvoice = useCreateInvoice();
  
  // Fetch contracts for the customer/vendor
  const { data: contracts } = useActiveContracts(customerId, vendorId);

  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    terms: '',
    notes: '',
    currency: 'KWD',
    discount_amount: 0,
    cost_center_id: '',
    fixed_asset_id: '',
    contract_id: contractId || '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
    }
  ]);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const lineTotal = item.quantity * item.unit_price;
    const taxAmount = lineTotal * (item.tax_rate / 100);
    return lineTotal + taxAmount;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalTax = items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price;
      return sum + (lineTotal * (item.tax_rate / 100));
    }, 0);
    const total = subtotal + totalTax - invoiceData.discount_amount;
    
    return { subtotal, totalTax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.profile?.company_id) {
      toast.error("User company not found");
      return;
    }

    if (!invoiceData.invoice_number) {
      toast.error("رقم الفاتورة مطلوب");
      return;
    }

    if (items.some(item => !item.description || item.quantity <= 0 || item.unit_price < 0)) {
      toast.error("يرجى ملء جميع بيانات الأصناف بشكل صحيح");
      return;
    }

    const { subtotal, totalTax, total } = calculateTotals();

    try {
      await createInvoice.mutateAsync({
        ...invoiceData,
        invoice_type: type,
        customer_id: type === 'sales' ? customerId : undefined,
        vendor_id: type === 'purchase' ? vendorId : undefined,
        contract_id: invoiceData.contract_id || undefined,
        subtotal,
        tax_amount: totalTax,
        total_amount: total,
        status: 'draft',
        payment_status: 'unpaid',
      });

      toast.success(`تم إنشاء ${type === 'sales' ? 'فاتورة المبيعات' : 'فاتورة المشتريات'} بنجاح`);
      onOpenChange(false);
      
      // Reset form
      setInvoiceData({
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        terms: '',
        notes: '',
        currency: 'KWD',
        discount_amount: 0,
        cost_center_id: '',
        fixed_asset_id: '',
        contract_id: '',
      });
      setItems([{
        id: '1',
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
      }]);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error("حدث خطأ في إنشاء الفاتورة");
    }
  };

  const fillSampleData = () => {
    const sampleInvoiceData = {
      invoice_number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      terms: type === 'sales' ? 'الدفع خلال 30 يوماً من تاريخ الفاتورة' : 'شروط الدفع حسب الاتفاق',
      notes: type === 'sales' ? 'شكراً لثقتكم في خدماتنا' : 'فاتورة مشتريات تجريبية',
      currency: 'KWD',
      discount_amount: type === 'sales' ? 50 : 25,
      cost_center_id: costCenters?.[0]?.id || '',
      fixed_asset_id: '',
      contract_id: '',
    };

    const sampleItems: InvoiceItem[] = type === 'sales' ? [
      {
        id: '1',
        description: 'خدمة استشارية',
        quantity: 2,
        unit_price: 150.000,
        tax_rate: 5,
        account_id: availableAccounts[0]?.id || '',
      },
      {
        id: '2',
        description: 'رسوم إدارية',
        quantity: 1,
        unit_price: 75.500,
        tax_rate: 5,
        account_id: availableAccounts[0]?.id || '',
      },
      {
        id: '3',
        description: 'خدمة صيانة',
        quantity: 3,
        unit_price: 100.250,
        tax_rate: 5,
        account_id: availableAccounts[0]?.id || '',
      }
    ] : [
      {
        id: '1',
        description: 'مواد خام',
        quantity: 10,
        unit_price: 25.750,
        tax_rate: 5,
        account_id: availableAccounts[0]?.id || '',
      },
      {
        id: '2',
        description: 'معدات مكتبية',
        quantity: 2,
        unit_price: 180.000,
        tax_rate: 5,
        account_id: availableAccounts[0]?.id || '',
      }
    ];

    setInvoiceData(sampleInvoiceData);
    setItems(sampleItems);
    toast.success("تم ملء البيانات التجريبية بنجاح");
  };

  const { subtotal, totalTax, total } = calculateTotals();

  if (accountsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const revenueAccounts = accounts?.filter(account => 
    account.account_type === 'revenue'
  ) || [];

  const expenseAccounts = accounts?.filter(account => 
    account.account_type === 'expenses'
  ) || [];

  const availableAccounts = type === 'sales' ? revenueAccounts : expenseAccounts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {type === 'sales' ? 'إنشاء فاتورة مبيعات جديدة' : 'إنشاء فاتورة مشتريات جديدة'}
              </DialogTitle>
              <DialogDescription>
                {type === 'sales' 
                  ? 'أدخل تفاصيل فاتورة المبيعات والأصناف' 
                  : 'أدخل تفاصيل فاتورة المشتريات والأصناف'
                }
              </DialogDescription>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={fillSampleData}
              className="gap-2"
            >
              <TestTube className="h-4 w-4" />
              بيانات تجريبية
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات الفاتورة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">رقم الفاتورة *</Label>
                <Input
                  id="invoice_number"
                  value={invoiceData.invoice_number}
                  onChange={(e) => setInvoiceData({...invoiceData, invoice_number: e.target.value})}
                  placeholder="INV-2024-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_date">تاريخ الفاتورة *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={invoiceData.invoice_date}
                  onChange={(e) => setInvoiceData({...invoiceData, invoice_date: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={invoiceData.due_date}
                  onChange={(e) => setInvoiceData({...invoiceData, due_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <Select value={invoiceData.currency} onValueChange={(value) => setInvoiceData({...invoiceData, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                    <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                    <SelectItem value="EUR">يورو (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="terms">شروط الدفع</Label>
                <Textarea
                  id="terms"
                  value={invoiceData.terms}
                  onChange={(e) => setInvoiceData({...invoiceData, terms: e.target.value})}
                  placeholder="شروط الدفع..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_center_id">مركز التكلفة</Label>
                <Select value={invoiceData.cost_center_id} onValueChange={(value) => setInvoiceData({...invoiceData, cost_center_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مركز التكلفة" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters?.map(center => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.center_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="fixed_asset_id">الأصل الثابت (اختياري)</Label>
                  <Select value={invoiceData.fixed_asset_id} onValueChange={(value) => setInvoiceData({...invoiceData, fixed_asset_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الأصل الثابت" />
                    </SelectTrigger>
                    <SelectContent>
                      {fixedAssets?.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.asset_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_id">العقد المرتبط (اختياري)</Label>
                  <Select value={invoiceData.contract_id} onValueChange={(value) => setInvoiceData({...invoiceData, contract_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العقد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون عقد</SelectItem>
                      {contracts?.map(contract => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.contract_number} - {contract.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>أصناف الفاتورة</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                إضافة صنف
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الحساب</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>سعر الوحدة</TableHead>
                    <TableHead>معدل الضريبة (%)</TableHead>
                    <TableHead>المجموع</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="وصف الصنف"
                          className="min-w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.account_id || undefined} 
                          onValueChange={(value) => updateItem(item.id, 'account_id', value)}
                        >
                          <SelectTrigger className="min-w-[150px]">
                            <SelectValue placeholder="اختر الحساب" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_code} - {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-24"
                          min="0"
                          step="0.001"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.tax_rate}
                          onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </TableCell>
                      <TableCell>
                        {calculateItemTotal(item).toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div></div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{subtotal.toFixed(3)} {invoiceData.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الضريبة:</span>
                    <span>{totalTax.toFixed(3)} {invoiceData.currency}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">الخصم</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={invoiceData.discount_amount}
                      onChange={(e) => setInvoiceData({...invoiceData, discount_amount: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.001"
                    />
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>المجموع الإجمالي:</span>
                    <span>{total.toFixed(3)} {invoiceData.currency}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Schedule Section - Only for sales invoices with contracts */}
          {type === 'sales' && invoiceData.contract_id && invoiceData.contract_id !== 'none' && (
            <PaymentScheduleSection
              contractId={invoiceData.contract_id}
              totalAmount={total}
              currency={invoiceData.currency}
              onScheduleCreated={() => {
                toast.success("سيتم إنشاء جدول الدفع بعد حفظ الفاتورة");
              }}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "جاري الحفظ..." : "حفظ الفاتورة"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}