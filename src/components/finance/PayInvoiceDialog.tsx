import React, { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInDays } from "date-fns";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  Check,
  Clock,
  CreditCard,
  FileText,
  Globe,
  Hash,
  Loader2,
  MessageSquare,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreatePayment } from "@/hooks/usePayments.unified";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast-mock";
import { cn } from "@/lib/utils";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";

const paymentSchema = z.object({
  amount: z.number().min(0.001, "المبلغ يجب أن يكون أكبر من صفر"),
  payment_method: z.enum(["cash", "check", "bank_transfer", "credit_card", "online_transfer"], {
    required_error: "طريقة الدفع مطلوبة",
  }),
  payment_date: z.string().min(1, "تاريخ الدفع مطلوب"),
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
  { value: "cash", label: "نقد", icon: Banknote },
  { value: "bank_transfer", label: "تحويل", icon: Building2 },
  { value: "check", label: "شيك", icon: FileText },
  { value: "credit_card", label: "بطاقة", icon: CreditCard },
  { value: "online_transfer", label: "إلكتروني", icon: Globe },
] as const;

const paymentCardColors = {
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

const paymentCardStyle = {
  "--payment-text": paymentCardColors.text,
  "--payment-surface": paymentCardColors.surface,
  "--payment-inner": paymentCardColors.inner,
  "--payment-muted": paymentCardColors.muted,
  "--payment-border": paymentCardColors.border,
  "--payment-info": paymentCardColors.info,
  "--payment-alert": paymentCardColors.alert,
  "--payment-focus": paymentCardColors.focus,
  "--payment-success": paymentCardColors.success,
} as CSSProperties;

const moneyTolerance = 0.01;

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const getRemainingAmount = (due: number, paid: number) => {
  const rawRemaining = due - paid;
  if (rawRemaining <= moneyTolerance) return 0;
  return roundMoney(rawRemaining);
};

export function PayInvoiceDialog({ open, onOpenChange, invoice, onPaymentCreated }: PayInvoiceDialogProps) {
  const createPayment = useCreatePayment();
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingFeeId, setDeletingFeeId] = useState<string | null>(null);
  const [lateFeeWaived, setLateFeeWaived] = useState(false);

  useEffect(() => {
    if (open) {
      setLateFeeWaived(false);
    }
  }, [open]);

  const { data: lateFees = [] } = useQuery({
    queryKey: ["invoice-late-fees", invoice.id],
    queryFn: async () => {
      if (!invoice.id) return [];

      const { data, error } = await supabase
        .from("late_fees")
        .select("*")
        .eq("invoice_id", invoice.id)
        .in("status", ["pending", "applied"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching late fees:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!invoice.id && open,
  });

  const daysOverdue = useMemo(() => {
    if (!invoice.due_date) return 0;
    return Math.max(0, differenceInDays(new Date(), new Date(invoice.due_date)));
  }, [invoice.due_date]);

  const calculatedLateFee = useMemo(() => {
    if (daysOverdue <= 0 || lateFeeWaived) return 0;
    return Math.min(daysOverdue * 120, 3000);
  }, [daysOverdue, lateFeeWaived]);

  const allLateFees = useMemo(() => {
    if (daysOverdue <= 0 || calculatedLateFee <= 0 || lateFeeWaived) return [];

    const existingFee = lateFees.length > 0 ? lateFees[0] : null;
    return [
      {
        id: existingFee?.id || `calculated-${invoice.id}`,
        days_overdue: daysOverdue,
        fee_amount: calculatedLateFee,
        status: existingFee?.status || "pending",
        calculated: !existingFee,
        late_fee_rule_id: existingFee?.late_fee_rule_id,
      },
    ];
  }, [daysOverdue, calculatedLateFee, lateFees, invoice.id, lateFeeWaived]);

  const totalLateFees = roundMoney(allLateFees.reduce((sum, fee) => sum + (fee.fee_amount || 0), 0));
  const totalAmountDue = roundMoney(invoice.balance_due + totalLateFees);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: totalAmountDue,
      payment_method: "cash",
      payment_date: new Date().toISOString().split("T")[0],
      reference_number: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open && invoice) {
      form.setValue("amount", totalAmountDue);
    }
  }, [open, invoice, totalAmountDue, form]);

  const watchedAmount = Number(form.watch("amount") || 0);
  const remainingBalance = getRemainingAmount(totalAmountDue, watchedAmount);
  const isAmountOverpay = watchedAmount > totalAmountDue + moneyTolerance;
  const isAmountPartial = watchedAmount > 0 && remainingBalance > 0 && !isAmountOverpay;
  const isAmountFull = watchedAmount > 0 && remainingBalance === 0 && !isAmountOverpay;
  const paidRatio = totalAmountDue > 0 ? Math.min(100, Math.max(0, (Math.min(watchedAmount, totalAmountDue) / totalAmountDue) * 100)) : 0;

  const handleDeleteLateFee = async (feeId: string) => {
    if (feeId.startsWith("calculated-")) {
      setLateFeeWaived(true);
      toast({
        title: "تم إعفاء الغرامة",
        description: "تم إعفاء العميل من غرامة التأخير لهذه الدفعة",
      });
      return;
    }

    setDeletingFeeId(feeId);

    try {
      const { error } = await supabase
        .from("late_fees")
        .update({
          status: "waived",
          waive_reason: "تم الإعفاء من الغرامة يدوياً",
          waived_at: new Date().toISOString(),
          waived_by: user?.id,
        })
        .eq("id", feeId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["invoice-late-fees", invoice.id] });
      setLateFeeWaived(true);

      toast({
        title: "تم إعفاء الغرامة",
        description: "تم إعفاء العميل من غرامة التأخير بنجاح",
      });
    } catch (error: any) {
      console.error("Error deleting late fee:", error);
      toast({
        title: "خطأ في حذف الغرامة",
        description: error.message || "حدث خطأ أثناء حذف الغرامة",
        variant: "destructive",
      });
    } finally {
      setDeletingFeeId(null);
    }
  };

  const generateInvoiceNumber = async (companyId: string): Promise<string> => {
    const prefix = "INV";
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("company_id", companyId)
      .like("invoice_number", `${prefix}-${year}${month}%`)
      .order("invoice_number", { ascending: false })
      .limit(1)
      .single();

    let sequence = 1;
    if (lastInvoice?.invoice_number) {
      sequence = parseInt(lastInvoice.invoice_number.split("-").pop() || "0") + 1;
    }

    return `${prefix}-${year}${month}-${sequence.toString().padStart(4, "0")}`;
  };

  const createRemainingBalanceInvoice = async (balance: number) => {
    if (!invoice.company_id || !invoice.contract_id || !user?.id) {
      throw new Error("بيانات غير كافية لإنشاء الفاتورة");
    }

    const invoiceNumber = await generateInvoiceNumber(invoice.company_id);
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1).toISOString().split("T")[0];

    const remainingLateFees = Math.max(0, balance - invoice.balance_due);

    const { data: newInvoice, error } = await supabase
      .from("invoices")
      .insert({
        company_id: invoice.company_id,
        customer_id: invoice.customer_id,
        contract_id: invoice.contract_id,
        invoice_number: invoiceNumber,
        invoice_date: today,
        due_date: dueDate,
        total_amount: balance,
        subtotal: balance,
        tax_amount: 0,
        discount_amount: 0,
        paid_amount: 0,
        balance_due: balance,
        status: "sent",
        payment_status: "unpaid",
        invoice_type: "service",
        notes: `فاتورة متبقية من الفاتورة ${invoice.invoice_number}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    if (remainingLateFees > 0 && lateFees.length > 0) {
      const latestLateFee = lateFees[0];
      await supabase.from("late_fees").insert({
        company_id: invoice.company_id,
        invoice_id: newInvoice.id,
        contract_id: invoice.contract_id,
        late_fee_rule_id: latestLateFee.late_fee_rule_id,
        original_amount: balance,
        days_overdue: latestLateFee.days_overdue,
        fee_amount: remainingLateFees,
        fee_type: latestLateFee.fee_type,
        status: "pending",
      });
    }

    return newInvoice;
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await createPayment.mutateAsync({
        payment_type: data.payment_method,
        payment_method: invoice.customer_id ? "received" : "made",
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
            title: "تم تسجيل الدفع",
            description: `تم إنشاء فاتورة جديدة #${newInvoice.invoice_number} للمبلغ المتبقي`,
          });
        } catch (invoiceError) {
          console.error("Error creating remaining balance invoice:", invoiceError);
        }
      }

      onPaymentCreated?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({
        title: "خطأ في تسجيل الدفع",
        description: error.message || "حدث خطأ أثناء تسجيل الدفع",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="payment-card-dialog max-h-[84dvh] max-w-2xl overflow-hidden rounded-lg border-0 p-0" dir="rtl" style={paymentCardStyle}>
        <DialogHeader className="payment-card-header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="payment-card-header-icon">
              <Receipt className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-normal text-[#020617]">تسجيل دفعة</DialogTitle>
              <p className="mt-1 truncate text-sm font-bold text-[#94A3B8]">{invoice.invoice_number}</p>
            </div>
          </div>
          <Badge className="payment-card-badge">
            {invoice.payment_status === "paid" ? "مدفوعة" : invoice.payment_status === "partial" ? "جزئية" : "غير مدفوعة"}
          </Badge>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="payment-card-form">
            <div className="payment-card-scroll">
              <section className="payment-card-summary">
                <div className="payment-card-total">
                  <span>المبلغ المستحق</span>
                  <strong>{formatCurrency(totalAmountDue)}</strong>
                </div>
                <div className="payment-card-summary-grid">
                  <div>
                    <span>رصيد الفاتورة</span>
                    <strong>{formatCurrency(invoice.balance_due)}</strong>
                  </div>
                  <div>
                    <span>غرامات التأخير</span>
                    <strong>{formatCurrency(totalLateFees)}</strong>
                  </div>
                  <div>
                    <span>المتبقي بعد الدفع</span>
                    <strong>{formatCurrency(remainingBalance)}</strong>
                  </div>
                </div>
                <div className="payment-card-progress">
                  <div style={{ width: `${paidRatio}%` }} />
                </div>
              </section>

              {daysOverdue > 0 && !lateFeeWaived && (
                <section className="payment-card-alert">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>غرامة تأخير ({daysOverdue} يوم)</span>
                  </div>
                  {allLateFees.map((fee: any) => (
                    <div key={fee.id} className="payment-card-late-fee">
                      <div>
                        <strong>{formatCurrency(fee.fee_amount)}</strong>
                        <span>{fee.calculated ? `120 ر.ق × ${daysOverdue} يوم` : "مسجلة"}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLateFee(fee.id)}
                        disabled={deletingFeeId === fee.id}
                        className="gap-1 text-[#FB6B7A] hover:bg-[#FB6B7A]/10 hover:text-[#FB6B7A]"
                      >
                        {deletingFeeId === fee.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        إعفاء
                      </Button>
                    </div>
                  ))}
                </section>
              )}

              {lateFeeWaived && daysOverdue > 0 && (
                <section className="payment-card-waived">
                  <Check className="h-4 w-4" />
                  تم إعفاء العميل من غرامة التأخير
                </section>
              )}

              <section className="payment-card-section">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مبلغ الدفع</FormLabel>
                      <div className="payment-card-amount">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                            dir="ltr"
                          />
                        </FormControl>
                        <span>ر.ق</span>
                      </div>
                      <FormMessage />
                      <div className="payment-card-quick-actions">
                        <Button type="button" variant={isAmountFull ? "default" : "outline"} onClick={() => form.setValue("amount", totalAmountDue)}>
                          <Check className="h-4 w-4" />
                          دفع كامل
                        </Button>
                        <Button type="button" variant={isAmountPartial ? "default" : "outline"} onClick={() => form.setValue("amount", roundMoney(totalAmountDue / 2))}>
                          دفع جزئي
                        </Button>
                      </div>
                      {isAmountPartial && (
                        <div className="payment-card-note">
                          <FileText className="h-4 w-4" />
                          سيتم إنشاء فاتورة للمتبقي: {formatCurrency(remainingBalance)}
                        </div>
                      )}
                      {isAmountOverpay && (
                        <div className="payment-card-error">
                          <X className="h-4 w-4" />
                          المبلغ أكبر من المستحق
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>طريقة الدفع</FormLabel>
                      <div className="payment-card-methods">
                        {paymentMethods.map((method) => {
                          const Icon = method.icon;
                          const isSelected = field.value === method.value;
                          return (
                            <button
                              key={method.value}
                              type="button"
                              onClick={() => field.onChange(method.value)}
                              className={cn("payment-card-method", isSelected && "is-selected")}
                            >
                              <Icon className="h-5 w-5" />
                              <span>{method.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="payment-card-grid">
                  <FormField
                    control={form.control}
                    name="payment_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Calendar className="h-4 w-4" />
                          التاريخ
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                        <FormLabel>
                          <Hash className="h-4 w-4" />
                          رقم المرجع
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="اختياري" {...field} />
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
                      <FormLabel>
                        <MessageSquare className="h-4 w-4" />
                        ملاحظات
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="أي ملاحظات إضافية..." {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </div>

            <div className="payment-card-footer">
              <div className="flex min-w-0 items-center gap-3">
                <span className="payment-card-footer-icon">
                  <Wallet className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#020617]">تأكيد الدفعة</p>
                  <p className={cn("text-xs", isAmountOverpay ? "font-bold text-[#FB6B7A]" : "text-[#94A3B8]")}>
                    {isAmountOverpay ? "المبلغ أكبر من المستحق" : formatCurrency(watchedAmount || 0)}
                  </p>
                </div>
              </div>
              <div className="payment-card-footer-actions">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createPayment.isPending || isAmountOverpay || watchedAmount <= 0}
                  className="bg-[#22C7A1] text-white hover:bg-[#1cae8d]"
                >
                  {createPayment.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {isAmountOverpay ? "عدّل المبلغ" : "تأكيد الدفع"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>

        <style>{`
          .payment-card-dialog {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            background: var(--payment-surface);
            color: var(--payment-text);
          }

          .payment-card-header {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 18px;
            border-bottom: 1px solid var(--payment-border);
            background: linear-gradient(180deg, var(--payment-inner), white);
          }

          .payment-card-header-icon,
          .payment-card-footer-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 8px;
          }

          .payment-card-header-icon {
            width: 38px;
            height: 38px;
            color: var(--payment-success);
            background: color-mix(in srgb, var(--payment-success) 12%, white);
            border: 1px solid color-mix(in srgb, var(--payment-success) 24%, white);
          }

          .payment-card-badge {
            border: 0;
            background: color-mix(in srgb, var(--payment-info) 12%, white);
            color: var(--payment-info);
            border-radius: 8px;
            padding: 7px 9px;
          }

          .payment-card-form {
            display: grid;
            grid-template-rows: minmax(0, 1fr) auto;
            min-height: 0;
            max-height: calc(84dvh - 64px);
          }

          .payment-card-scroll {
            min-height: 0;
            overflow-y: auto;
            display: grid;
            gap: 8px;
            padding: 10px 12px;
            background: var(--payment-inner);
          }

          .payment-card-summary,
          .payment-card-section,
          .payment-card-alert,
          .payment-card-waived {
            border: 1px solid var(--payment-border);
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 26px rgba(2, 6, 23, 0.055);
          }

          .payment-card-summary {
            padding: 10px 12px;
          }

          .payment-card-total {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 12px;
          }

          .payment-card-total span,
          .payment-card-summary-grid span {
            font-size: 12px;
            font-weight: 900;
            color: var(--payment-muted);
          }

          .payment-card-total strong {
            font-size: 22px;
            font-weight: 950;
            color: var(--payment-text);
          }

          .payment-card-summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
            margin-top: 8px;
          }

          .payment-card-summary-grid > div {
            border: 1px solid var(--payment-border);
            background: var(--payment-inner);
            border-radius: 8px;
            padding: 7px 9px;
          }

          .payment-card-summary-grid strong {
            display: block;
            margin-top: 4px;
            font-size: 13px;
            color: var(--payment-text);
          }

          .payment-card-progress {
            height: 6px;
            overflow: hidden;
            border-radius: 999px;
            background: var(--payment-inner);
            margin-top: 8px;
          }

          .payment-card-progress > div {
            height: 100%;
            background: var(--payment-success);
            border-radius: inherit;
            transition: width 180ms ease;
          }

          .payment-card-alert {
            display: grid;
            gap: 8px;
            padding: 10px;
            color: var(--payment-alert);
          }

          .payment-card-late-fee {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: 1px solid color-mix(in srgb, var(--payment-alert) 18%, white);
            background: color-mix(in srgb, var(--payment-alert) 8%, white);
            border-radius: 8px;
            padding: 8px 10px;
          }

          .payment-card-late-fee strong,
          .payment-card-late-fee span {
            display: block;
          }

          .payment-card-late-fee span {
            font-size: 11px;
            color: var(--payment-muted);
          }

          .payment-card-waived {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            color: var(--payment-success);
          }

          .payment-card-section {
            display: grid;
            gap: 10px;
            padding: 10px 12px;
          }

          .payment-card-dialog label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 900;
            color: var(--payment-text);
          }

          .payment-card-amount {
            position: relative;
          }

          .payment-card-amount input {
            height: 46px;
            padding-inline: 54px 14px;
            text-align: left;
            font-size: 21px;
            font-weight: 950;
          }

          .payment-card-amount input::-webkit-outer-spin-button,
          .payment-card-amount input::-webkit-inner-spin-button {
            margin: 0;
            appearance: none;
          }

          .payment-card-amount input[type="number"] {
            appearance: textfield;
            -moz-appearance: textfield;
          }

          .payment-card-amount span {
            position: absolute;
            inset-inline-start: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--payment-muted);
            font-size: 13px;
            font-weight: 900;
          }

          .payment-card-quick-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
            margin-top: 8px;
          }

          .payment-card-quick-actions button,
          .payment-card-footer-actions button {
            min-height: 36px;
            gap: 7px;
          }

          .payment-card-methods {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 7px;
          }

          .payment-card-method {
            min-height: 58px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            border: 1px solid var(--payment-border);
            background: var(--payment-inner);
            color: var(--payment-muted);
            border-radius: 8px;
            padding: 8px;
            font-size: 12px;
            font-weight: 900;
            transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
          }

          .payment-card-method.is-selected {
            border-color: var(--payment-success);
            background: color-mix(in srgb, var(--payment-success) 10%, white);
            color: var(--payment-success);
          }

          .payment-card-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .payment-card-note,
          .payment-card-error {
            display: flex;
            align-items: center;
            gap: 8px;
            border-radius: 8px;
            padding: 7px 10px;
            margin-top: 7px;
            font-size: 12px;
            font-weight: 900;
          }

          .payment-card-note {
            background: color-mix(in srgb, var(--payment-info) 10%, white);
            color: var(--payment-text);
          }

          .payment-card-error {
            background: color-mix(in srgb, var(--payment-alert) 10%, white);
            color: var(--payment-alert);
          }

          .payment-card-dialog input,
          .payment-card-dialog textarea {
            min-height: 38px;
            border-radius: 8px !important;
            border-color: var(--payment-border) !important;
            background: var(--payment-inner) !important;
            color: var(--payment-text) !important;
            box-shadow: none !important;
          }

          .payment-card-footer {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 14px;
            border-top: 1px solid var(--payment-border);
            background: white;
            padding: 8px 12px;
            z-index: 2;
          }

          .payment-card-footer-icon {
            width: 32px;
            height: 32px;
            color: var(--payment-success);
            background: color-mix(in srgb, var(--payment-success) 12%, white);
          }

          .payment-card-footer-actions {
            display: flex;
            gap: 7px;
          }

          .payment-card-dialog button {
            border-radius: 8px !important;
          }

          .payment-card-dialog *:focus-visible {
            outline-color: var(--payment-focus) !important;
            --tw-ring-color: var(--payment-focus) !important;
          }

          @media (max-width: 520px) {
            .payment-card-header,
            .payment-card-footer {
              grid-template-columns: 1fr;
              flex-direction: column;
              align-items: stretch;
            }

            .payment-card-summary-grid,
            .payment-card-grid,
            .payment-card-quick-actions {
              grid-template-columns: 1fr;
            }

            .payment-card-methods {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .payment-card-footer-actions {
              flex-direction: column-reverse;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
