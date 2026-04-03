import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Save } from "lucide-react";
import { useCreateInvoice, useFixedAssets } from "@/hooks/useFinance";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useEntryAllowedAccounts } from "@/hooks/useEntryAllowedAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveContracts } from "@/hooks/useContracts";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/hooks/useAutoSave";

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

interface InvoiceFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  vendorId?: string;
  type: 'sales' | 'purchase';
  contractId?: string;
}

const STEPS = [
  { id: 1, label: "العميل والعقد", labelEn: "Customer & Contract" },
  { id: 2, label: "البنود", labelEn: "Items" },
  { id: 3, label: "المراجعة والحفظ", labelEn: "Review & Save" },
];

export function InvoiceFormWizard({ open, onOpenChange, customerId, vendorId, type, contractId }: InvoiceFormWizardProps) {
  const { user } = useAuth();
  const { data: accounts } = useEntryAllowedAccounts();
  const { data: costCenters } = useCostCenters();
  useFixedAssets();
  const createInvoice = useCreateInvoice();
  const { formatCurrency } = useCurrencyFormatter();
  const { currency: companyCurrency } = useCompanyCurrency();
  const { data: contracts } = useActiveContracts(customerId, vendorId);

  const [step, setStep] = useState(1);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    terms: '',
    notes: '',
    currency: companyCurrency,
    discount_amount: 0,
    cost_center_id: '',
    fixed_asset_id: '',
    contract_id: contractId || '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }
  ]);

  const autoSaveKey = `invoice-draft-${type}-${customerId || vendorId || 'new'}`;
  const { loadDraft, clearDraft } = useAutoSave(
    { ...invoiceData, items },
    autoSaveKey,
    15000
  );

  useEffect(() => {
    if (open) {
      const draft = loadDraft();
      if (draft && draft.invoice_number) {
        setShowDraftPrompt(true);
      }
    }
  }, [open]);

  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setInvoiceData({
        invoice_number: draft.invoice_number || '',
        invoice_date: draft.invoice_date || new Date().toISOString().split('T')[0],
        due_date: draft.due_date || '',
        terms: draft.terms || '',
        notes: draft.notes || '',
        currency: draft.currency || companyCurrency,
        discount_amount: draft.discount_amount || 0,
        cost_center_id: draft.cost_center_id || '',
        fixed_asset_id: draft.fixed_asset_id || '',
        contract_id: draft.contract_id || '',
      });
      setItems(draft.items || [{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);
      toast.success("تم استعادة المسودة");
    }
    setShowDraftPrompt(false);
  };

  const handleDismissDraft = () => {
    clearDraft();
    setShowDraftPrompt(false);
  };

  useEffect(() => {
    if (invoiceData.invoice_number || items.some(i => i.description)) {
      setLastSaved(new Date());
    }
  }, [invoiceData, items]);

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: unknown) => {
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
      clearDraft();
      onOpenChange(false);
      
      setInvoiceData({
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        terms: '',
        notes: '',
        currency: companyCurrency,
        discount_amount: 0,
        cost_center_id: '',
        fixed_asset_id: '',
        contract_id: '',
      });
      setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);
      setStep(1);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error("حدث خطأ في إنشاء الفاتورة");
    }
  };

  const { subtotal, totalTax, total } = calculateTotals();

  const revenueAccounts = accounts?.filter(account => account.account_type === 'revenue') || [];
  const expenseAccounts = accounts?.filter(account => account.account_type === 'expenses') || [];
  const availableAccounts = type === 'sales' ? revenueAccounts : expenseAccounts;

  const canProceed = () => {
    if (step === 1) return invoiceData.invoice_number && invoiceData.invoice_date;
    if (step === 2) return items.length > 0 && items.every(item => item.description && item.quantity > 0);
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {type === 'sales' ? 'إنشاء فاتورة مبيعات جديدة' : 'إنشاء فاتورة مشتريات جديدة'}
            </span>
            {lastSaved && (
              <span className="text-xs font-normal text-slate-500 flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                تم الحفظ تلقائياً
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {type === 'sales' ? 'أدخل تفاصيل فاتورة المبيعات والأصناف' : 'أدخل تفاصيل فاتورة المشتريات والأصناف'}
          </DialogDescription>
        </DialogHeader>

        {showDraftPrompt && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Save className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">يوجد مسودة محفوظة</p>
                <p className="text-xs text-amber-700 mt-1">هل تريد استعادة البيانات السابقة؟</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDismissDraft}>
                  تجاهل
                </Button>
                <Button size="sm" onClick={handleRestoreDraft}>
                  استعادة
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2",
                s.id <= step && "text-primary"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                  s.id === step ? "bg-primary text-primary-foreground border-primary" : 
                  s.id < step ? "bg-primary/10 border-primary text-primary" : 
                  "border-slate-300 text-slate-400"
                )}>
                  {s.id < step ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  s.id < step ? "bg-primary" : "bg-slate-200"
                )} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
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
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>أصناف الفاتورة</CardTitle>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة صنف
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                            {formatCurrency(calculateItemTotal(item), { currency: invoiceData.currency })}
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
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>ملخص البيانات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">رقم الفاتورة:</p>
                      <p className="font-medium">{invoiceData.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">تاريخ الفاتورة:</p>
                      <p className="font-medium">{invoiceData.invoice_date}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">تاريخ الاستحقاق:</p>
                      <p className="font-medium">{invoiceData.due_date || 'غير محدد'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">العملة:</p>
                      <p className="font-medium">{invoiceData.currency}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="font-medium mb-2">الأصناف ({items.length}):</p>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={item.id} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                          <span>{idx + 1}. {item.description}</span>
                          <span className="font-medium">{formatCurrency(calculateItemTotal(item), { currency: invoiceData.currency })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span>{formatCurrency(subtotal, { currency: invoiceData.currency })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الضريبة:</span>
                      <span>{formatCurrency(totalTax, { currency: invoiceData.currency })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Label htmlFor="discount" className="cursor-pointer">الخصم:</Label>
                      <Input
                        id="discount"
                        type="number"
                        value={invoiceData.discount_amount}
                        onChange={(e) => setInvoiceData({...invoiceData, discount_amount: parseFloat(e.target.value) || 0})}
                        className="w-32"
                        min="0"
                        step="0.001"
                      />
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>المجموع الإجمالي:</span>
                      <span>{formatCurrency(total, { currency: invoiceData.currency })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
            >
              <ChevronRight className="h-4 w-4 ml-2" />
              السابق
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={createInvoice.isPending}>
                  {createInvoice.isPending ? "جاري الحفظ..." : "حفظ الفاتورة"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}