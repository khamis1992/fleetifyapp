import React, { type CSSProperties, useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  FileText,
  Hash,
  Plus,
  Receipt,
  Save,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateInvoice } from "@/hooks/useFinance";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useEntryAllowedAccounts } from "@/hooks/useEntryAllowedAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";
import { FeatureTourButton, FeatureTourDialog, type FeatureTourContent } from "@/components/common/FeatureTourGuide";

const invoiceEditTour = {
  title: "جولة تعديل الفاتورة",
  description: "شرح طريقة تعديل بيانات الفاتورة بدون إرباك التحصيل.",
  steps: [
    "راجع رقم الفاتورة وحالتها قبل التعديل، خاصة إذا كانت مدفوعة جزئياً أو مرتبطة بعقد.",
    "عدّل بيانات التاريخ والاستحقاق والعميل أو العقد فقط عند وجود سبب واضح.",
    "راجع البنود والحسابات ومراكز التكلفة لأن أي تغيير يؤثر على الإجمالي والتقارير.",
    "استخدم إضافة بند أو حذف بند لتصحيح محتوى الفاتورة، ثم راجع الإجمالي بعد التعديل.",
    "احفظ التغييرات بعد التأكد من أن الفاتورة لا تتعارض مع الدفعات المسجلة.",
  ],
} satisfies FeatureTourContent;

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

interface InvoiceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  onSave?: (invoice: any) => void;
}

const editColors = {
  text: systemColorPattern.colors.text,
  surface: systemColorPattern.colors.surface,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

const editStyle = {
  "--invoice-edit-text": editColors.text,
  "--invoice-edit-surface": editColors.surface,
  "--invoice-edit-inner": editColors.inner,
  "--invoice-edit-muted": editColors.muted,
  "--invoice-edit-border": editColors.border,
  "--invoice-edit-info": editColors.info,
  "--invoice-edit-alert": editColors.alert,
  "--invoice-edit-focus": editColors.focus,
  "--invoice-edit-success": editColors.success,
} as CSSProperties;

const FieldIcon = ({ icon: Icon, color = editColors.info }: { icon: React.ElementType; color?: string }) => (
  <span className="invoice-edit-field-icon" style={{ color, backgroundColor: `${color}14` }}>
    <Icon className="h-4 w-4" />
  </span>
);

export function InvoiceEditDialog({ open, onOpenChange, invoice, onSave }: InvoiceEditDialogProps) {
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = useEntryAllowedAccounts();
  const { data: costCenters } = useCostCenters();
  const updateInvoice = useUpdateInvoice();
  const { formatCurrency } = useCurrencyFormatter();
  const { currency: companyCurrency } = useCompanyCurrency();
  const financeAccess = useFinanceAccessGuard();
  const [activeTour, setActiveTour] = useState<FeatureTourContent | null>(null);

  const [invoiceData, setInvoiceData] = useState({
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    terms: "",
    notes: "",
    currency: companyCurrency,
    discount_amount: 0,
    cost_center_id: "",
    fixed_asset_id: "",
    contract_id: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      description: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
    },
  ]);

  useEffect(() => {
    if (invoice && open) {
      setInvoiceData({
        invoice_number: invoice.invoice_number || "",
        invoice_date: invoice.invoice_date
          ? new Date(invoice.invoice_date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split("T")[0] : "",
        terms: invoice.terms || "",
        notes: invoice.notes || "",
        currency: invoice.currency || companyCurrency,
        discount_amount: invoice.discount_amount || 0,
        cost_center_id: invoice.cost_center_id || "",
        fixed_asset_id: invoice.fixed_asset_id || "",
        contract_id: invoice.contract_id || "",
      });

      setItems([
        {
          id: "1",
          description: "خدمة استشارية",
          quantity: 2,
          unit_price: 150.0,
          tax_rate: 5,
        },
        {
          id: "2",
          description: "رسوم إدارية",
          quantity: 1,
          unit_price: 75.5,
          tax_rate: 5,
        },
      ]);
    }
  }, [invoice, open, companyCurrency]);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: unknown) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const lineTotal = item.quantity * item.unit_price;
    const taxAmount = lineTotal * (item.tax_rate / 100);
    return lineTotal + taxAmount;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const totalTax = items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price;
      return sum + lineTotal * (item.tax_rate / 100);
    }, 0);
    const total = subtotal + totalTax - invoiceData.discount_amount;

    return { subtotal, totalTax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.profile?.company_id) {
      toast.error("لم يتم العثور على شركة المستخدم");
      return;
    }

    if (!invoiceData.invoice_number) {
      toast.error("رقم الفاتورة مطلوب");
      return;
    }

    if (items.some((item) => !item.description || item.quantity <= 0 || item.unit_price < 0)) {
      toast.error("يرجى تعبئة جميع بيانات الأصناف بشكل صحيح");
      return;
    }

    const { subtotal, totalTax, total } = calculateTotals();

    try {
      const originalTotal = Number(invoice.total_amount) || 0;
      const originalTax = Number(invoice.tax_amount) || 0;
      const originalDiscount = Number(invoice.discount_amount) || 0;
      const originalInvoiceDate = invoice.invoice_date
        ? new Date(invoice.invoice_date).toISOString().split("T")[0]
        : "";
      const originalDueDate = invoice.due_date ? new Date(invoice.due_date).toISOString().split("T")[0] : "";

      if (
        (Math.abs(total - originalTotal) > 0.01 ||
          Math.abs(totalTax - originalTax) > 0.01 ||
          Math.abs(Number(invoiceData.discount_amount) - originalDiscount) > 0.01) &&
        !financeAccess.canEditField("invoice", "total_amount")
      ) {
        toast.error("ليس لديك صلاحية تعديل مبلغ الفاتورة أو إجمالياتها");
        return;
      }

      if (
        ((invoiceData.invoice_date || "") !== originalInvoiceDate || (invoiceData.due_date || "") !== originalDueDate) &&
        !financeAccess.canEditField("invoice", "invoice_date")
      ) {
        toast.error("ليس لديك صلاحية تعديل تاريخ الفاتورة أو الاستحقاق");
        return;
      }

      await updateInvoice.mutateAsync({
        invoiceId: invoice.id,
        invoiceData: {
          invoice_number: invoiceData.invoice_number,
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date || undefined,
          terms: invoiceData.terms || undefined,
          notes: invoiceData.notes || undefined,
          currency: invoiceData.currency,
          discount_amount: invoiceData.discount_amount,
          cost_center_id: invoiceData.cost_center_id || undefined,
          fixed_asset_id: invoiceData.fixed_asset_id || undefined,
          contract_id: invoiceData.contract_id || undefined,
          subtotal,
          tax_amount: totalTax,
          total_amount: total,
        },
      });

      onOpenChange(false);

      if (onSave) {
        onSave({
          ...invoiceData,
          subtotal,
          tax_amount: totalTax,
          total_amount: total,
        });
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("حدث خطأ في تحديث الفاتورة");
    }
  };

  const { subtotal, totalTax, total } = calculateTotals();

  if (accountsLoading || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-lg">
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#22C7A1]" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const revenueAccounts = accounts?.filter((account) => account.account_type === "revenue") || [];
  const expenseAccounts = accounts?.filter((account) => account.account_type === "expenses") || [];
  const availableAccounts = invoice.invoice_type === "sales" ? revenueAccounts : expenseAccounts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="invoice-edit-dialog max-h-[92vh] max-w-6xl overflow-hidden rounded-lg border-0 p-0" dir="rtl" style={editStyle}>
        <DialogHeader className="invoice-edit-header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="invoice-edit-header-icon">
              <Receipt className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-black tracking-normal text-[#020617]">
                تعديل الفاتورة #{invoice.invoice_number}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-[#94A3B8]">
                تعديل تفاصيل الفاتورة والأصناف مع مراجعة الإجماليات قبل الحفظ.
              </DialogDescription>
            </div>
          </div>
          <div className="invoice-edit-status">
            <FeatureTourButton
              tour={invoiceEditTour}
              onStart={setActiveTour}
              className="h-9 gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
            />
            <span>الحالة</span>
            <strong>{invoice.payment_status || "غير محدد"}</strong>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="invoice-edit-form">
          <div className="invoice-edit-scroll">
            <section className="invoice-edit-summary">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#94A3B8]">Invoice Total</p>
                <h3 className="mt-1 text-2xl font-black text-[#020617]">
                  {formatCurrency(total, { currency: invoiceData.currency })}
                </h3>
              </div>
              <div className="invoice-edit-summary-grid">
                <div>
                  <span>المجموع الفرعي</span>
                  <strong>{formatCurrency(subtotal, { currency: invoiceData.currency })}</strong>
                </div>
                <div>
                  <span>الضريبة</span>
                  <strong>{formatCurrency(totalTax, { currency: invoiceData.currency })}</strong>
                </div>
                <div>
                  <span>الخصم</span>
                  <Input
                    id="discount"
                    type="number"
                    value={invoiceData.discount_amount}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, discount_amount: parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.001"
                  />
                </div>
              </div>
            </section>

            <section className="invoice-edit-section">
              <div className="invoice-edit-section-title">
                <FieldIcon icon={FileText} color={editColors.info} />
                <div>
                  <h3>معلومات الفاتورة</h3>
                  <p>البيانات الأساسية ومركز التكلفة وشروط الدفع.</p>
                </div>
              </div>

              <div className="invoice-edit-grid">
                <div className="invoice-edit-field">
                  <Label htmlFor="invoice_number">رقم الفاتورة *</Label>
                  <div className="invoice-edit-input-shell">
                    <Hash className="h-4 w-4" />
                    <Input
                      id="invoice_number"
                      value={invoiceData.invoice_number}
                      onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                      placeholder="INV-2024-001"
                      required
                    />
                  </div>
                </div>

                <div className="invoice-edit-field">
                  <Label htmlFor="invoice_date">تاريخ الفاتورة *</Label>
                  <div className="invoice-edit-input-shell">
                    <CalendarDays className="h-4 w-4" />
                    <Input
                      id="invoice_date"
                      type="date"
                      value={invoiceData.invoice_date}
                      onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="invoice-edit-field">
                  <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                  <div className="invoice-edit-input-shell">
                    <CalendarDays className="h-4 w-4" />
                    <Input
                      id="due_date"
                      type="date"
                      value={invoiceData.due_date}
                      onChange={(e) => setInvoiceData({ ...invoiceData, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="invoice-edit-field">
                  <Label htmlFor="currency">العملة</Label>
                  <Select value={invoiceData.currency} onValueChange={(value) => setInvoiceData({ ...invoiceData, currency: value })}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                      <SelectItem value="QAR">ريال قطري (QAR)</SelectItem>
                      <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                      <SelectItem value="EUR">يورو (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="invoice-edit-field">
                  <Label htmlFor="cost_center_id">مركز التكلفة</Label>
                  <Select
                    value={invoiceData.cost_center_id || undefined}
                    onValueChange={(value) => setInvoiceData({ ...invoiceData, cost_center_id: value })}
                  >
                    <SelectTrigger id="cost_center_id">
                      <SelectValue placeholder="اختر مركز التكلفة" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters?.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.center_name_ar || center.center_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="invoice-edit-field invoice-edit-field-wide">
                  <Label htmlFor="terms">شروط الدفع</Label>
                  <Textarea
                    id="terms"
                    value={invoiceData.terms}
                    onChange={(e) => setInvoiceData({ ...invoiceData, terms: e.target.value })}
                    placeholder="شروط الدفع..."
                    rows={2}
                  />
                </div>

                <div className="invoice-edit-field invoice-edit-field-full">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea
                    id="notes"
                    value={invoiceData.notes}
                    onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية..."
                    rows={2}
                  />
                </div>
              </div>
            </section>

            <section className="invoice-edit-section">
              <div className="invoice-edit-items-head">
                <div className="invoice-edit-section-title">
                  <FieldIcon icon={Wallet} color={editColors.success} />
                  <div>
                    <h3>أصناف الفاتورة</h3>
                    <p>عدّل الوصف والحساب والقيم المالية لكل صنف.</p>
                  </div>
                </div>
                <Button type="button" onClick={addItem} className="gap-2 bg-[#020617] text-white hover:bg-[#020617]/90">
                  <Plus className="h-4 w-4" />
                  إضافة صنف
                </Button>
              </div>

              <div className="invoice-edit-items">
                {items.map((item, index) => (
                  <article key={item.id} className="invoice-edit-item-card">
                    <div className="invoice-edit-item-index">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{formatCurrency(calculateItemTotal(item), { currency: invoiceData.currency })}</strong>
                    </div>

                    <div className="invoice-edit-item-fields">
                      <div className="invoice-edit-field invoice-edit-field-full">
                        <Label>الوصف</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="وصف الصنف"
                        />
                      </div>

                      <div className="invoice-edit-field invoice-edit-account">
                        <Label>الحساب</Label>
                        <Select value={item.account_id || undefined} onValueChange={(value) => updateItem(item.id, "account_id", value)}>
                          <SelectTrigger>
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
                      </div>

                      <div className="invoice-edit-field">
                        <Label>الكمية</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="invoice-edit-field">
                        <Label>سعر الوحدة</Label>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.001"
                        />
                      </div>

                      <div className="invoice-edit-field">
                        <Label>الضريبة %</Label>
                        <Input
                          type="number"
                          value={item.tax_rate}
                          onChange={(e) => updateItem(item.id, "tax_rate", parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="invoice-edit-delete"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      aria-label="حذف الصنف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="invoice-edit-footer">
            <div className="flex min-w-0 items-center gap-3">
              <FieldIcon icon={Building2} color={editColors.focus} />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#020617]">الإجمالي بعد التعديل</p>
                <p className="text-xs text-[#94A3B8]">يشمل الضريبة والخصم</p>
              </div>
            </div>
            <div className="invoice-edit-footer-total">{formatCurrency(total, { currency: invoiceData.currency })}</div>
            <div className="invoice-edit-footer-actions">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
                <X className="h-4 w-4" />
                إلغاء
              </Button>
              <Button type="submit" className="gap-2 bg-[#22C7A1] text-white hover:bg-[#1cae8d]" disabled={updateInvoice.isPending}>
                <Save className="h-4 w-4" />
                {updateInvoice.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          </div>
        </form>

        <style>{`
          .invoice-edit-dialog {
            background: var(--invoice-edit-surface);
            color: var(--invoice-edit-text);
          }

          .invoice-edit-header {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding: 20px 22px;
            border-bottom: 1px solid var(--invoice-edit-border);
            background: linear-gradient(180deg, var(--invoice-edit-inner), white);
          }

          .invoice-edit-header-icon,
          .invoice-edit-field-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 8px;
          }

          .invoice-edit-header-icon {
            width: 48px;
            height: 48px;
            color: var(--invoice-edit-info);
            background: color-mix(in srgb, var(--invoice-edit-info) 12%, white);
            border: 1px solid color-mix(in srgb, var(--invoice-edit-info) 24%, white);
          }

          .invoice-edit-field-icon {
            width: 40px;
            height: 40px;
          }

          .invoice-edit-status {
            min-width: 124px;
            border: 1px solid var(--invoice-edit-border);
            background: white;
            border-radius: 8px;
            padding: 10px 12px;
            text-align: center;
          }

          .invoice-edit-status span {
            display: block;
            font-size: 11px;
            font-weight: 900;
            color: var(--invoice-edit-muted);
          }

          .invoice-edit-status strong {
            display: block;
            margin-top: 2px;
            font-size: 13px;
            color: var(--invoice-edit-text);
          }

          .invoice-edit-form {
            display: grid;
            grid-template-rows: minmax(0, 1fr) auto;
            max-height: calc(92vh - 90px);
          }

          .invoice-edit-scroll {
            overflow-y: auto;
            padding: 18px;
            background: var(--invoice-edit-inner);
            display: grid;
            gap: 14px;
          }

          .invoice-edit-summary,
          .invoice-edit-section {
            border: 1px solid var(--invoice-edit-border);
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 26px rgba(2, 6, 23, 0.055);
          }

          .invoice-edit-summary {
            display: grid;
            grid-template-columns: minmax(180px, 0.45fr) minmax(0, 1fr);
            align-items: center;
            gap: 16px;
            padding: 16px;
          }

          .invoice-edit-summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .invoice-edit-summary-grid > div {
            min-height: 74px;
            border: 1px solid var(--invoice-edit-border);
            background: var(--invoice-edit-inner);
            border-radius: 8px;
            padding: 10px;
          }

          .invoice-edit-summary-grid span {
            display: block;
            font-size: 12px;
            font-weight: 900;
            color: var(--invoice-edit-muted);
          }

          .invoice-edit-summary-grid strong {
            display: block;
            margin-top: 8px;
            font-size: 15px;
            color: var(--invoice-edit-text);
          }

          .invoice-edit-section {
            padding: 16px;
          }

          .invoice-edit-section-title,
          .invoice-edit-items-head {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .invoice-edit-items-head {
            justify-content: space-between;
            margin-bottom: 14px;
          }

          .invoice-edit-section-title h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 900;
            color: var(--invoice-edit-text);
          }

          .invoice-edit-section-title p {
            margin: 2px 0 0;
            font-size: 12px;
            color: var(--invoice-edit-muted);
          }

          .invoice-edit-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-top: 16px;
          }

          .invoice-edit-field {
            display: grid;
            gap: 7px;
          }

          .invoice-edit-field label {
            font-size: 12px;
            font-weight: 900;
            color: var(--invoice-edit-text);
          }

          .invoice-edit-field-wide {
            grid-column: span 2;
          }

          .invoice-edit-field-full {
            grid-column: 1 / -1;
          }

          .invoice-edit-input-shell {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--invoice-edit-border);
            background: var(--invoice-edit-inner);
            border-radius: 8px;
            padding-inline: 10px;
          }

          .invoice-edit-input-shell svg {
            color: var(--invoice-edit-muted);
            flex-shrink: 0;
          }

          .invoice-edit-dialog input,
          .invoice-edit-dialog textarea,
          .invoice-edit-dialog [role="combobox"] {
            min-height: 42px;
            border-radius: 8px !important;
            border-color: var(--invoice-edit-border) !important;
            background: var(--invoice-edit-inner) !important;
            color: var(--invoice-edit-text) !important;
            box-shadow: none !important;
          }

          .invoice-edit-input-shell input {
            border: 0 !important;
            background: transparent !important;
            padding-inline: 0;
          }

          .invoice-edit-items {
            display: grid;
            gap: 10px;
          }

          .invoice-edit-item-card {
            display: grid;
            grid-template-columns: 126px minmax(0, 1fr) auto;
            align-items: stretch;
            gap: 12px;
            border: 1px solid var(--invoice-edit-border);
            background: var(--invoice-edit-inner);
            border-radius: 8px;
            padding: 12px;
          }

          .invoice-edit-item-index {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border-radius: 8px;
            background: white;
            border: 1px solid var(--invoice-edit-border);
            padding: 12px;
          }

          .invoice-edit-item-index span {
            font-size: 12px;
            font-weight: 900;
            color: var(--invoice-edit-muted);
          }

          .invoice-edit-item-index strong {
            font-size: 14px;
            color: var(--invoice-edit-success);
          }

          .invoice-edit-item-fields {
            display: grid;
            grid-template-columns: minmax(180px, 1.2fr) minmax(220px, 1.1fr) repeat(3, minmax(90px, 0.5fr));
            gap: 10px;
          }

          .invoice-edit-delete {
            align-self: center;
            color: var(--invoice-edit-alert) !important;
          }

          .invoice-edit-footer {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto auto;
            align-items: center;
            gap: 16px;
            border-top: 1px solid var(--invoice-edit-border);
            background: white;
            padding: 14px 18px;
          }

          .invoice-edit-footer-total {
            border: 1px solid color-mix(in srgb, var(--invoice-edit-success) 28%, white);
            background: color-mix(in srgb, var(--invoice-edit-success) 10%, white);
            color: var(--invoice-edit-text);
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 18px;
            font-weight: 900;
            white-space: nowrap;
          }

          .invoice-edit-footer-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }

          .invoice-edit-dialog button {
            border-radius: 8px !important;
          }

          .invoice-edit-dialog *:focus-visible {
            outline-color: var(--invoice-edit-focus) !important;
            --tw-ring-color: var(--invoice-edit-focus) !important;
          }

          @media (max-width: 1100px) {
            .invoice-edit-summary,
            .invoice-edit-footer {
              grid-template-columns: 1fr;
            }

            .invoice-edit-summary-grid,
            .invoice-edit-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .invoice-edit-item-card {
              grid-template-columns: 1fr;
            }

            .invoice-edit-item-index {
              flex-direction: row;
              align-items: center;
            }

            .invoice-edit-item-fields {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 640px) {
            .invoice-edit-header,
            .invoice-edit-items-head {
              flex-direction: column;
              align-items: stretch;
            }

            .invoice-edit-scroll {
              padding: 12px;
            }

            .invoice-edit-summary-grid,
            .invoice-edit-grid,
            .invoice-edit-item-fields {
              grid-template-columns: 1fr;
            }

            .invoice-edit-field-wide {
              grid-column: 1 / -1;
            }

            .invoice-edit-footer-actions {
              flex-direction: column-reverse;
            }
          }
        `}</style>
        <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />
      </DialogContent>
    </Dialog>
  );
}
