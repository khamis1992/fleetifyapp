import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Clock,
  FileText,
  Loader2,
  ReceiptText,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { useCreateDeposit, useUpdateDeposit } from "@/hooks/useDeposits";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";

const depositSchema = z.object({
  customer_id: z.string().min(1, "اختيار العميل مطلوب"),
  deposit_type: z.string().min(1, "نوع الوديعة مطلوب"),
  amount: z.number().min(0.001, "المبلغ مطلوب ويجب أن يكون أكبر من صفر"),
  received_date: z.string().min(1, "تاريخ الاستلام مطلوب"),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

type DepositFormData = z.infer<typeof depositSchema>;

interface DepositFormProps {
  deposit?: any;
  onSuccess: () => void;
}

const depositTypes = [
  {
    value: "security",
    label: "وديعة ضمان",
    description: "حجز ضمان مرتبط بالعقد أو المركبة",
    icon: ShieldCheck,
  },
  {
    value: "advance",
    label: "دفعة مقدمة",
    description: "مبلغ مقدم يخص تعاملات العميل",
    icon: WalletCards,
  },
  {
    value: "maintenance",
    label: "وديعة صيانة",
    description: "تغطية مصاريف أو التزامات صيانة",
    icon: ReceiptText,
  },
  {
    value: "other",
    label: "أخرى",
    description: "وديعة مخصصة حسب الحاجة",
    icon: FileText,
  },
];

const colors = {
  text: systemColorPattern.colors.text,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  success: systemColorPattern.colors.success,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
};

const getCustomerName = (customer?: Partial<Customer>) => {
  if (!customer) return "";
  if (customer.customer_type === "corporate") {
    return customer.company_name_ar || customer.company_name || "شركة بدون اسم";
  }

  const arabicName = `${customer.first_name_ar || ""} ${customer.last_name_ar || ""}`.trim();
  const englishName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
  return arabicName || englishName || customer.company_name_ar || customer.company_name || "عميل بدون اسم";
};

const getCustomerSearchValue = (customer: Customer) =>
  [
    getCustomerName(customer),
    customer.company_name,
    customer.company_name_ar,
    customer.first_name,
    customer.last_name,
    customer.first_name_ar,
    customer.last_name_ar,
    customer.phone,
    customer.email,
    customer.customer_code,
    customer.national_id,
  ]
    .filter(Boolean)
    .join(" ");

export function DepositForm({ deposit, onSuccess }: DepositFormProps) {
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const { data: customersResult, isLoading: customersLoading } = useCustomers({ limit: 100, includeInactive: false });
  const createDeposit = useCreateDeposit();
  const updateDeposit = useUpdateDeposit();
  const { formatCurrency } = useCurrencyFormatter();

  const customers = customersResult?.data || [];

  const form = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      customer_id: deposit?.customer_id || "",
      deposit_type: deposit?.deposit_type || "security",
      amount: deposit?.amount || 0,
      received_date: deposit?.received_date || new Date().toISOString().split("T")[0],
      due_date: deposit?.due_date || "",
      notes: deposit?.notes || "",
    },
  });

  const watchedCustomerId = form.watch("customer_id");
  const watchedAmount = Number(form.watch("amount") || 0);
  const watchedType = form.watch("deposit_type");
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === watchedCustomerId),
    [customers, watchedCustomerId],
  );
  const selectedType = depositTypes.find((type) => type.value === watchedType) || depositTypes[0];

  const onSubmit = async (data: DepositFormData) => {
    try {
      if (deposit) {
        await updateDeposit.mutateAsync({
          id: deposit.id,
          updates: {
            customer_id: data.customer_id,
            deposit_type: data.deposit_type,
            amount: data.amount,
            received_date: data.received_date,
            due_date: data.due_date,
            notes: data.notes,
          },
        });
      } else {
        await createDeposit.mutateAsync({
          customer_id: data.customer_id,
          deposit_type: data.deposit_type,
          amount: data.amount,
          received_date: data.received_date,
          due_date: data.due_date,
          notes: data.notes,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving deposit:", error);
    }
  };

  const isLoading = createDeposit.isPending || updateDeposit.isPending;

  if (customersLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="deposit-form-redesign"
        style={
          {
            "--deposit-text": colors.text,
            "--deposit-inner": colors.inner,
            "--deposit-muted": colors.muted,
            "--deposit-border": colors.border,
            "--deposit-success": colors.success,
            "--deposit-info": colors.info,
            "--deposit-alert": colors.alert,
            "--deposit-focus": colors.focus,
          } as React.CSSProperties
        }
      >
        <section className="deposit-summary-strip">
          <div>
            <span>العميل</span>
            <strong>{selectedCustomer ? getCustomerName(selectedCustomer) : "لم يتم الاختيار"}</strong>
          </div>
          <div>
            <span>نوع الوديعة</span>
            <strong>{selectedType.label}</strong>
          </div>
          <div>
            <span>المبلغ</span>
            <strong>{formatCurrency(watchedAmount)}</strong>
          </div>
        </section>

        <section className="deposit-section">
          <div className="deposit-section-heading">
            <span>
              <Search className="h-4 w-4" />
            </span>
            <div>
              <h3>اختيار العميل</h3>
              <p>ابحث بالاسم، رقم الهاتف، البريد، أو رمز العميل بدل التمرير اليدوي.</p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العميل</FormLabel>
                <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button type="button" variant="outline" className="deposit-customer-trigger">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="deposit-customer-avatar">
                            {selectedCustomer ? getCustomerName(selectedCustomer).slice(0, 1) : <UserRound className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 text-right">
                            <strong>{selectedCustomer ? getCustomerName(selectedCustomer) : "ابحث واختر العميل"}</strong>
                            <small dir="ltr">
                              {selectedCustomer?.phone || selectedCustomer?.email || "الاسم، الهاتف، البريد، رمز العميل"}
                            </small>
                          </div>
                        </div>
                        <ChevronsUpDown className="h-4 w-4 text-[#94A3B8]" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="deposit-customer-popover p-0" align="start" dir="rtl">
                    <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                      <CommandInput placeholder="اكتب اسم العميل أو رقم الهاتف..." />
                      <CommandList>
                        <CommandEmpty>لا يوجد عميل مطابق للبحث</CommandEmpty>
                        <CommandGroup heading="العملاء">
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={getCustomerSearchValue(customer)}
                              onSelect={() => {
                                field.onChange(customer.id);
                                setCustomerPickerOpen(false);
                              }}
                              className="deposit-customer-option"
                            >
                              <span className="deposit-customer-avatar small">{getCustomerName(customer).slice(0, 1)}</span>
                              <div className="min-w-0 flex-1">
                                <strong>{getCustomerName(customer)}</strong>
                                <small dir="ltr">{customer.phone || customer.email || customer.customer_code || "بدون بيانات اتصال"}</small>
                              </div>
                              <Check className={cn("h-4 w-4", field.value === customer.id ? "opacity-100" : "opacity-0")} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="deposit-section">
          <div className="deposit-section-heading">
            <span>
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h3>تفاصيل الوديعة</h3>
              <p>اختر الغرض من الوديعة ثم أدخل المبلغ وتواريخ المتابعة.</p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="deposit_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الوديعة</FormLabel>
                <div className="deposit-type-grid">
                  {depositTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = field.value === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => field.onChange(type.value)}
                        className={cn("deposit-type-card", isSelected && "is-selected")}
                      >
                        <Icon className="h-5 w-5" />
                        <strong>{type.label}</strong>
                        <span>{type.description}</span>
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="deposit-grid">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ</FormLabel>
                  <FormControl>
                    <div className="deposit-amount-field">
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        dir="ltr"
                      />
                      <span>د.ك</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="received_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Calendar className="h-4 w-4" />
                    تاريخ الاستلام
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
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Clock className="h-4 w-4" />
                    تاريخ الاستحقاق
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                <FormLabel>ملاحظات</FormLabel>
                <FormControl>
                  <Textarea placeholder="أي ملاحظات إضافية..." {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <footer className="deposit-form-footer">
          <div>
            <strong>{deposit ? "تحديث الوديعة" : "إضافة الوديعة"}</strong>
            <span>{selectedCustomer ? getCustomerName(selectedCustomer) : "اختر العميل لإكمال التسجيل"}</span>
          </div>
          <Button type="submit" disabled={isLoading} className="bg-[#22C7A1] text-white hover:bg-[#1cae8d]">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {deposit ? "تحديث الوديعة" : "إضافة الوديعة"}
          </Button>
        </footer>

        <style>{`
          .deposit-form-redesign {
            display: grid;
            gap: 12px;
            color: var(--deposit-text);
          }

          .deposit-summary-strip {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            border: 1px solid var(--deposit-border);
            border-radius: 8px;
            background: var(--deposit-inner);
            padding: 10px;
          }

          .deposit-summary-strip > div {
            border-radius: 8px;
            background: white;
            padding: 10px;
          }

          .deposit-summary-strip span,
          .deposit-form-footer span,
          .deposit-section-heading p,
          .deposit-type-card span,
          .deposit-customer-trigger small,
          .deposit-customer-option small {
            color: var(--deposit-muted);
          }

          .deposit-summary-strip span {
            display: block;
            font-size: 11px;
            font-weight: 900;
          }

          .deposit-summary-strip strong {
            display: block;
            margin-top: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 13px;
            font-weight: 950;
          }

          .deposit-section {
            display: grid;
            gap: 12px;
            border: 1px solid var(--deposit-border);
            border-radius: 8px;
            background: white;
            padding: 14px;
            box-shadow: 0 10px 26px rgba(2, 6, 23, 0.05);
          }

          .deposit-section-heading {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .deposit-section-heading > span,
          .deposit-customer-avatar {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 8px;
            color: var(--deposit-success);
            background: color-mix(in srgb, var(--deposit-success) 12%, white);
          }

          .deposit-section-heading > span {
            width: 36px;
            height: 36px;
          }

          .deposit-section-heading h3 {
            margin: 0;
            font-size: 15px;
            font-weight: 950;
          }

          .deposit-section-heading p {
            margin: 2px 0 0;
            font-size: 12px;
            font-weight: 700;
          }

          .deposit-form-redesign label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 900;
          }

          .deposit-customer-trigger {
            width: 100%;
            height: auto;
            min-height: 62px;
            justify-content: space-between;
            border: 1px solid var(--deposit-border) !important;
            background: var(--deposit-inner) !important;
            padding: 10px 12px;
            text-align: right;
          }

          .deposit-customer-avatar {
            width: 38px;
            height: 38px;
            font-weight: 950;
          }

          .deposit-customer-avatar.small {
            width: 32px;
            height: 32px;
          }

          .deposit-customer-trigger strong,
          .deposit-customer-option strong {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--deposit-text);
            font-size: 13px;
            font-weight: 950;
          }

          .deposit-customer-trigger small,
          .deposit-customer-option small {
            display: block;
            margin-top: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 11px;
            font-weight: 800;
          }

          .deposit-customer-popover {
            width: min(620px, calc(100vw - 32px));
            border-radius: 8px;
            border-color: var(--deposit-border);
            overflow: hidden;
          }

          .deposit-customer-option {
            gap: 10px;
            padding: 10px !important;
            border-radius: 8px !important;
          }

          .deposit-type-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }

          .deposit-type-card {
            display: grid;
            gap: 6px;
            min-height: 104px;
            border: 1px solid var(--deposit-border);
            border-radius: 8px;
            background: var(--deposit-inner);
            padding: 10px;
            text-align: right;
            transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
          }

          .deposit-type-card svg {
            color: var(--deposit-muted);
          }

          .deposit-type-card strong {
            font-size: 13px;
            font-weight: 950;
          }

          .deposit-type-card span {
            font-size: 11px;
            font-weight: 700;
            line-height: 1.6;
          }

          .deposit-type-card.is-selected {
            border-color: var(--deposit-success);
            background: color-mix(in srgb, var(--deposit-success) 10%, white);
          }

          .deposit-type-card.is-selected svg,
          .deposit-type-card.is-selected strong {
            color: var(--deposit-success);
          }

          .deposit-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .deposit-amount-field {
            position: relative;
          }

          .deposit-amount-field input {
            padding-inline-start: 48px;
            text-align: left;
            font-size: 18px;
            font-weight: 950;
          }

          .deposit-amount-field span {
            position: absolute;
            inset-inline-start: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--deposit-muted);
            font-size: 12px;
            font-weight: 900;
          }

          .deposit-form-redesign input,
          .deposit-form-redesign textarea {
            border-radius: 8px !important;
            border-color: var(--deposit-border) !important;
            background: var(--deposit-inner) !important;
            box-shadow: none !important;
          }

          .deposit-form-redesign input {
            min-height: 44px;
          }

          .deposit-form-redesign textarea {
            min-height: 82px;
          }

          .deposit-form-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-top: 1px solid var(--deposit-border);
            padding-top: 12px;
          }

          .deposit-form-footer strong,
          .deposit-form-footer span {
            display: block;
          }

          .deposit-form-footer strong {
            font-size: 14px;
            font-weight: 950;
          }

          .deposit-form-footer span {
            margin-top: 2px;
            font-size: 12px;
            font-weight: 800;
          }

          .deposit-form-footer button {
            min-height: 42px;
            gap: 8px;
            border-radius: 8px !important;
          }

          .deposit-form-redesign *:focus-visible {
            outline-color: var(--deposit-focus) !important;
            --tw-ring-color: var(--deposit-focus) !important;
          }

          @media (max-width: 760px) {
            .deposit-summary-strip,
            .deposit-grid,
            .deposit-type-grid {
              grid-template-columns: 1fr;
            }

            .deposit-form-footer {
              align-items: stretch;
              flex-direction: column;
            }
          }
        `}</style>
      </form>
    </Form>
  );
}
