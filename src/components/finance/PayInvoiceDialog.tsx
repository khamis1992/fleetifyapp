import React, { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInDays } from "date-fns";
import {
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
  PlayCircle,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreatePayment } from "@/hooks/usePayments.unified";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { useTourGuide } from "@/components/tour-guide";
import { PaymentRecordedReadError } from '@/services/paymentCommitResult';
import { contractBusinessDate } from '@/utils/contractScheduleSettlement';

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
  onPaymentCreated?: () => void | Promise<void>;
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
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const { startTour } = useTourGuide();
  const queryClient = useQueryClient();
  const [deletingFeeId, setDeletingFeeId] = useState<string | null>(null);
  const paymentDisplayContext = useRef({});
  useEffect(() => {
    // An old command may complete after a different invoice/session is opened.
    paymentDisplayContext.current = {};
  }, [companyId, invoice.id, open]);

  const invoiceCompanyMismatch = Boolean(invoice.company_id && invoice.company_id !== companyId);
  const {
    data: lateFees = [],
    isSuccess: areLateFeesLoaded,
    isFetching: areLateFeesFetching,
    isError: hasLateFeeReadError,
    refetch: refetchLateFees,
  } = useQuery({
    queryKey: ["invoice-late-fees", invoice.id, companyId],
    queryFn: async () => {
      if (!invoice.id || !companyId || invoiceCompanyMismatch) {
        throw new Error('تعذر التحقق من الشركة المرتبطة بالفاتورة');
      }

      const { data, error } = await supabase
        .from("late_fees")
        .select("*")
        .eq("company_id", companyId)
        .eq("invoice_id", invoice.id)
        .in("status", ["pending", "applied", "waived"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching late fees:", error);
        throw error;
      }

      const feeRows = data || [];
      if (feeRows.length === 0) {
        return feeRows.map((fee) => ({ ...fee, paid_amount: 0 }));
      }

      const { data: allocations, error: allocationsError } = await supabase
        .from("payment_allocations")
        .select("target_id, amount")
        .eq("company_id", companyId)
        .eq("allocation_type", "late_fee")
        .eq("is_active", true)
        .in("target_id", feeRows.map((fee) => fee.id));

      if (allocationsError) {
        console.error("Error fetching late fee allocations:", allocationsError);
        throw allocationsError;
      }

      const paidByFee = new Map<string, number>();
      for (const allocation of allocations || []) {
        paidByFee.set(
          allocation.target_id,
          roundMoney((paidByFee.get(allocation.target_id) || 0) + Number(allocation.amount || 0))
        );
      }

      return feeRows.map((fee) => ({
        ...fee,
        paid_amount: paidByFee.get(fee.id) || 0,
      }));
    },
    enabled: !!invoice.id && open && !!companyId && !isInitializing && !invoiceCompanyMismatch,
    retry: false,
  });

  const areLateFeesReady = Boolean(companyId) && !isInitializing && !invoiceCompanyMismatch
    && areLateFeesLoaded && !areLateFeesFetching;
  const lateFeeReadBlocked = hasLateFeeReadError || invoiceCompanyMismatch
    || (!isInitializing && !companyId);
  const lateFeeReadMessage = lateFeeReadBlocked
    ? 'تعذر التحقق من غرامات الفاتورة والدفعات المخصصة لها. أُوقف الدفع والإعفاء حتى تكتمل القراءة.'
    : 'جاري التحقق من غرامات الفاتورة والدفعات المخصصة لها…';

  const daysOverdue = useMemo(() => {
    if (!invoice.due_date) return 0;
    return Math.max(0, differenceInDays(new Date(), new Date(invoice.due_date)));
  }, [invoice.due_date]);

  const activeLateFees = useMemo(
    () => lateFees.filter((fee) => fee.status === "pending" || fee.status === "applied"),
    [lateFees]
  );
  const persistedLateFeeWaived = useMemo(
    () => activeLateFees.length === 0 && lateFees.some((fee) => fee.status === "waived"),
    [activeLateFees.length, lateFees]
  );
  const isLateFeeWaived = persistedLateFeeWaived;

  const calculatedLateFee = useMemo(() => {
    if (daysOverdue <= 0 || isLateFeeWaived) return 0;
    return Math.min(daysOverdue * 120, 3000);
  }, [daysOverdue, isLateFeeWaived]);

  const allLateFees = useMemo(() => {
    if (daysOverdue <= 0 || isLateFeeWaived) return [];

    if (activeLateFees.length > 0) {
      // Persisted assessments are authoritative: show each active fee's
      // remaining amount instead of re-deriving (and understating) it from a
      // hardcoded daily rate. The rule used at assessment time may differ.
      return activeLateFees.map((fee) => ({
        id: fee.id,
        days_overdue: Number(fee.days_overdue || daysOverdue),
        fee_amount: roundMoney(Math.max(0, Number(fee.fee_amount || 0) - Number(fee.paid_amount || 0))),
        status: fee.status,
        calculated: false,
        late_fee_rule_id: fee.late_fee_rule_id,
      }));
    }

    // No persisted assessment yet: estimate with the default daily rule so the
    // cashier can charge/waive it up front.
    return [
      {
        id: `calculated-${invoice.id}`,
        days_overdue: daysOverdue,
        fee_amount: calculatedLateFee,
        status: "pending",
        calculated: true,
        late_fee_rule_id: undefined,
      },
    ];
  }, [daysOverdue, calculatedLateFee, activeLateFees, invoice.id, isLateFeeWaived]);

  const totalLateFees = roundMoney(allLateFees.reduce((sum, fee) => sum + (fee.fee_amount || 0), 0));
  // Vendor invoices cannot charge fees through the payment command; the
  // amount-due and overpay guard reflect only the invoice principal there.
  const chargeableLateFees = invoice.customer_id ? totalLateFees : 0;
  const totalAmountDue = roundMoney(invoice.balance_due + chargeableLateFees);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      payment_method: "cash",
      payment_date: contractBusinessDate(),
      reference_number: "",
      notes: "",
    },
  });

  const amountContext = useRef<{ key: string; total: number } | null>(null);
  useEffect(() => {
    if (!open) {
      amountContext.current = null;
      return;
    }
    if (!areLateFeesReady) return;
    const key = `${companyId}:${invoice.id}`;
    const previous = amountContext.current;
    if (!previous || previous.key !== key
      || Math.abs(form.getValues('amount') - previous.total) < moneyTolerance) {
      form.setValue("amount", totalAmountDue);
    }
    // Retrying a read must not replace the employee's partial-payment entry.
    amountContext.current = { key, total: totalAmountDue };
  }, [open, invoice.id, companyId, totalAmountDue, form, areLateFeesReady]);

  const watchedAmount = Number(form.watch("amount") || 0);
  const remainingBalance = getRemainingAmount(totalAmountDue, watchedAmount);
  const isAmountOverpay = areLateFeesReady && watchedAmount > totalAmountDue + moneyTolerance;
  const isAmountPartial = areLateFeesReady && watchedAmount > 0 && remainingBalance > 0 && !isAmountOverpay;
  const isAmountFull = areLateFeesReady && watchedAmount > 0 && remainingBalance === 0 && !isAmountOverpay;
  const paidRatio = areLateFeesReady && totalAmountDue > 0 ? Math.min(100, Math.max(0, (Math.min(watchedAmount, totalAmountDue) / totalAmountDue) * 100)) : 0;

  const handleDeleteLateFee = async (feeId: string) => {
    if (!areLateFeesReady || !companyId || deletingFeeId !== null || createPayment.isPending) return;
    setDeletingFeeId(feeId);
    let waiverConfirmed = false;

    try {
      const waivedAt = new Date().toISOString();
      let acknowledgement: { id: string; company_id: string; invoice_id: string; status: string } | null;

      if (feeId.startsWith("calculated-")) {
        let contractId = invoice.contract_id;

        if (!invoice.company_id) {
          const { data: invoiceOwner, error: invoiceOwnerError } = await supabase
            .from("invoices")
            .select("company_id, contract_id")
            .eq("company_id", companyId)
            .eq("id", invoice.id)
            .single();

          if (invoiceOwnerError) throw invoiceOwnerError;
          if (!invoiceOwner || invoiceOwner.company_id !== companyId) {
            throw new Error("تعذر التحقق من الشركة المرتبطة بالفاتورة");
          }
          contractId = contractId || invoiceOwner.contract_id || undefined;
        }

        const result = await supabase.from("late_fees").insert({
          company_id: companyId,
          invoice_id: invoice.id,
          contract_id: contractId || null,
          original_amount: invoice.total_amount,
          days_overdue: daysOverdue,
          fee_amount: calculatedLateFee,
          fee_type: "daily",
          status: "waived",
          waive_reason: "تم الإعفاء من الغرامة يدوياً",
          waived_at: waivedAt,
          waived_by: user?.id,
        }).select("id, company_id, invoice_id, status").single();
        if (result.error) throw result.error;
        acknowledgement = result.data;
      } else {
        const result = await supabase
          .from("late_fees")
          .update({
            status: "waived",
            waive_reason: "تم الإعفاء من الغرامة يدوياً",
            waived_at: waivedAt,
            waived_by: user?.id,
          })
          .eq("company_id", companyId)
          .eq("invoice_id", invoice.id)
          .eq("id", feeId)
          .in("status", ["pending", "applied"])
          .select("id, company_id, invoice_id, status")
          .single();
        if (result.error) throw result.error;
        acknowledgement = result.data;
      }

      if (!acknowledgement?.id || acknowledgement.company_id !== companyId
        || acknowledgement.invoice_id !== invoice.id || acknowledgement.status !== 'waived'
        || (!feeId.startsWith('calculated-') && acknowledgement.id !== feeId)) {
        throw new Error('تعذر تأكيد إعفاء الغرامة. أعد تحميل البيانات للتحقق قبل تكرار الطلب.');
      }
      waiverConfirmed = true;

      // Read the persisted result; a local flag must not waive other fees or invoices.
      await queryClient.invalidateQueries(
        { queryKey: ["invoice-late-fees", invoice.id, companyId] },
        { throwOnError: true },
      );

      toast({
        title: "تم إعفاء الغرامة",
        description: "تم إعفاء العميل من غرامة التأخير بنجاح",
      });
    } catch (error: any) {
      console.error("Error deleting late fee:", error);
      toast({
        title: waiverConfirmed ? "تم إعفاء الغرامة، وتعذر تحديث العرض" : "تعذر تأكيد إعفاء الغرامة",
        description: waiverConfirmed
          ? "أعد تحميل الغرامات للتحقق من الرصيد. لا تكرر طلب الإعفاء."
          : error.message || "أعد تحميل البيانات للتحقق قبل تكرار طلب الإعفاء.",
        variant: "destructive",
      });
    } finally {
      setDeletingFeeId(null);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!areLateFeesReady || deletingFeeId !== null) {
      toast({ title: 'بيانات الغرامات غير جاهزة', description: lateFeeReadMessage, variant: 'destructive' });
      return;
    }
    const submittedContext = paymentDisplayContext.current;
    const refreshRecordedPayment = async () => {
      if (submittedContext === paymentDisplayContext.current) {
        form.reset();
        onOpenChange(false);
      }
      await onPaymentCreated?.();
    };
    try {
      // Vendor payments route through a command that cannot allocate late
      // fees; charging a fee-inclusive amount there would overpay the invoice
      // principal and fail atomically. Keep the fee visible but out of the
      // charged amount for vendor invoices.
      const isVendorPayment = !invoice.customer_id;
      const lateFineAmount = isVendorPayment
        ? 0
        : roundMoney(Math.min(totalLateFees, Math.max(0, data.amount - invoice.balance_due)));
      if (isVendorPayment && totalLateFees > 0) {
        toast({
          title: 'غرامة التأخير غير مشمولة',
          description: 'دفعات فواتير الموردين لا تدعم تحصيل الغرامات آلياً؛ سُجّل مبلغ الفاتورة فقط. راجع الغرامة مع الإدارة.',
          variant: 'destructive',
        });
      }
      const persistedLateFee = allLateFees.find((fee) => !fee.calculated);

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
        late_fee_id: persistedLateFee?.id,
        late_fine_amount: lateFineAmount,
        late_fine_status: lateFineAmount > 0 ? "paid" : "none",
        late_fine_type: lateFineAmount > 0 ? "included_with_payment" : "none",
      });

    } catch (error: any) {
      if (error instanceof PaymentRecordedReadError) {
        toast({ title: 'تم تسجيل الدفعة، وتعذر تحديث العرض', description: error.message, variant: 'destructive' });
        // There is a committed payment ID. Close the entry form and refresh
        // readers, never invoke the payment command a second time.
        try {
          await refreshRecordedPayment();
        } catch (refreshError) {
          console.error('Confirmed payment display refresh failed:', refreshError);
        }
        return;
      }
      console.error("Error creating payment:", error);
      toast({
        title: "خطأ في تسجيل الدفع",
        description: error.message || "حدث خطأ أثناء تسجيل الدفع",
        variant: "destructive",
      });
      return;
    }

    // The payment command has succeeded. A subsequent UI/cache failure must
    // not be reported as a failed payment or encourage another payment entry.
    try {
      await refreshRecordedPayment();
    } catch (refreshError) {
      console.error("Payment recorded but display refresh failed:", refreshError);
      toast({
        title: "تم تسجيل الدفعة، وتعذر تحديث العرض",
        description: "لا تسجّل الدفعة مرة أخرى. أعد تحميل بيانات العقد للتحقق من الرصيد المحدّث.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="payment-card-dialog max-h-[84dvh] max-w-2xl overflow-hidden rounded-lg border-0 p-0" dir="rtl" style={paymentCardStyle} data-tour="contract-pay-invoice-dialog">
        <DialogHeader className="payment-card-header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="payment-card-header-icon">
              <Receipt className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-normal text-[#020617]">تسجيل دفعة</DialogTitle>
              <DialogDescription className="mt-1 truncate text-sm font-bold text-[#94A3B8]">{invoice.invoice_number}</DialogDescription>
            </div>
          </div>
          <Badge className="payment-card-badge">
            {invoice.payment_status === "paid" ? "مدفوعة" : invoice.payment_status === "partial" ? "جزئية" : "غير مدفوعة"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            onClick={() => startTour("contract-pay-invoice")}
            className="h-9 shrink-0 gap-2 border-emerald-200 bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
            data-tour="contract-pay-invoice-tour-start"
          >
            <PlayCircle className="h-4 w-4" />
            ابدأ الجولة التعريفية
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="payment-card-form">
            <div className="payment-card-scroll">
              {!areLateFeesReady && (
                <section role={lateFeeReadBlocked ? 'alert' : 'status'} className="payment-card-alert">
                  <p>{lateFeeReadMessage}</p>
                  {lateFeeReadBlocked && companyId && !invoiceCompanyMismatch && (
                    <Button type="button" variant="outline" disabled={areLateFeesFetching}
                      onClick={() => { void refetchLateFees(); }}>
                      إعادة تحميل الغرامات
                    </Button>
                  )}
                </section>
              )}
              <section className="payment-card-summary" data-tour="contract-pay-invoice-summary">
                <div className="payment-card-total">
                  <span>المبلغ المستحق</span>
                  <strong>{areLateFeesReady ? formatCurrency(totalAmountDue) : 'غير متحقق'}</strong>
                </div>
                <div className="payment-card-summary-grid">
                  <div>
                    <span>رصيد الفاتورة</span>
                    <strong>{formatCurrency(invoice.balance_due)}</strong>
                  </div>
                  <div>
                    <span>غرامات التأخير</span>
                    <strong>{areLateFeesReady ? formatCurrency(totalLateFees) : 'غير متحقق'}</strong>
                  </div>
                  <div>
                    <span>المتبقي بعد الدفع</span>
                    <strong>{areLateFeesReady ? formatCurrency(remainingBalance) : 'غير متحقق'}</strong>
                  </div>
                </div>
                <div className="payment-card-progress">
                  <div style={{ width: `${paidRatio}%` }} />
                </div>
              </section>

              {areLateFeesReady && daysOverdue > 0 && !isLateFeeWaived && (
                <section className="payment-card-alert" data-tour="contract-pay-invoice-late-fee">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>غرامة تأخير ({daysOverdue} يوم)</span>
                  </div>
                  {allLateFees.map((fee: any) => (
                    <div key={fee.id} className="payment-card-late-fee">
                      <div>
                        <strong>{formatCurrency(fee.fee_amount)}</strong>
                        <span>{fee.calculated ? `120 ر.ق × ${daysOverdue} يوم (تقديرية)` : "مسجلة"}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLateFee(fee.id)}
                        disabled={deletingFeeId !== null || createPayment.isPending}
                        className="gap-1 text-[#FB6B7A] hover:bg-[#FB6B7A]/10 hover:text-[#FB6B7A]"
                      >
                        {deletingFeeId === fee.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        إعفاء
                      </Button>
                    </div>
                  ))}
                </section>
              )}

              {areLateFeesReady && isLateFeeWaived && daysOverdue > 0 && (
                <section className="payment-card-waived">
                  <Check className="h-4 w-4" />
                  تم إعفاء العميل من غرامة التأخير
                </section>
              )}

              <section className="payment-card-section" data-tour="contract-pay-invoice-form">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem data-tour="contract-pay-invoice-amount">
                      <FormLabel>مبلغ الدفع</FormLabel>
                      <div className="payment-card-amount">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            disabled={!areLateFeesReady || deletingFeeId !== null}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              // Keep in-progress decimals ("12.") intact instead of
                              // coercing to a number on every keystroke.
                              const raw = e.target.value;
                              field.onChange(raw === '' ? 0 : Number(raw));
                            }}
                            dir="ltr"
                          />
                        </FormControl>
                        <span>ر.ق</span>
                      </div>
                      <FormMessage />
                      <div className="payment-card-quick-actions" data-tour="contract-pay-invoice-quick-amounts">
                        <Button type="button" disabled={!areLateFeesReady || deletingFeeId !== null} variant={isAmountFull ? "default" : "outline"} onClick={() => form.setValue("amount", totalAmountDue)}>
                          <Check className="h-4 w-4" />
                          دفع كامل
                        </Button>
                        <Button type="button" disabled={!areLateFeesReady || deletingFeeId !== null} variant={isAmountPartial ? "default" : "outline"} onClick={() => form.setValue("amount", roundMoney(totalAmountDue / 2))}>
                          دفع جزئي
                        </Button>
                      </div>
                      {isAmountPartial && (
                        <div className="payment-card-note">
                          <FileText className="h-4 w-4" />
                          سيبقى الرصيد على نفس الفاتورة: {formatCurrency(remainingBalance)}
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
                    <FormItem data-tour="contract-pay-invoice-method">
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
                      <FormItem data-tour="contract-pay-invoice-date">
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
                      <FormItem data-tour="contract-pay-invoice-reference">
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
                    <FormItem data-tour="contract-pay-invoice-notes">
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

            <div className="payment-card-footer" data-tour="contract-pay-invoice-footer">
              <div className="flex min-w-0 items-center gap-3">
                <span className="payment-card-footer-icon">
                  <Wallet className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#020617]">تأكيد الدفعة</p>
                  <p className={cn("text-xs", isAmountOverpay ? "font-bold text-[#FB6B7A]" : "text-[#94A3B8]")}>
                    {!areLateFeesReady ? 'بانتظار التحقق' : isAmountOverpay ? "المبلغ أكبر من المستحق" : formatCurrency(watchedAmount || 0)}
                  </p>
                </div>
              </div>
              <div className="payment-card-footer-actions">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={!areLateFeesReady || deletingFeeId !== null || createPayment.isPending || isAmountOverpay || watchedAmount <= 0}
                  className="bg-[#22C7A1] text-white hover:bg-[#1cae8d]"
                  data-tour="contract-pay-invoice-submit"
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
