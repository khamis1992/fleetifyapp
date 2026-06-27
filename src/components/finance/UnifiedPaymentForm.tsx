import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { TestTube, AlertTriangle, FileText, Eye, EyeOff, DollarSign, Brain, Check, ChevronsUpDown, Search, ReceiptText, WalletCards, UserRound, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountLevelBadge } from "@/components/finance/AccountLevelBadge";
import { useBanks } from "@/hooks/useTreasury";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useActiveContracts } from "@/hooks/useContracts";
import { useEntryAllowedAccounts } from "@/hooks/useEntryAllowedAccounts";
import { usePaymentOperations } from "@/hooks/business/usePaymentOperations";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useCustomers } from "@/hooks/useCustomers";
import { useVendors } from "@/hooks/useFinance";
import { enhancedPaymentSchema, PaymentJournalPreview } from "@/schemas/payment.schema";
import { usePaymentValidation } from "@/hooks/finance/usePaymentValidation";
import { toast } from 'sonner';
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";

interface UnifiedPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Payment context
  type: 'customer_payment' | 'vendor_payment' | 'invoice_payment';
  mode?: 'create' | 'edit' | 'view';
  // Entity IDs
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  contractId?: string;
  // Initial data for editing
  initialData?: any;
  // Callbacks
  onSuccess?: (payment: any) => void;
  onCancel?: () => void;
  // Configuration
  options?: {
    autoCreateJournalEntry?: boolean;
    requireApproval?: boolean;
    enableNotifications?: boolean;
    showJournalPreview?: boolean;
  };
}

export const UnifiedPaymentForm: React.FC<UnifiedPaymentFormProps> = ({
  open,
  onOpenChange,
  type,
  mode = 'create',
  customerId,
  vendorId,
  invoiceId,
  contractId,
  initialData,
  onSuccess,
  onCancel,
  options = {}
}) => {
  const {
    autoCreateJournalEntry = true,
    requireApproval = false,
    enableNotifications = true,
    showJournalPreview = true
  } = options;

  const [currentTab, setCurrentTab] = useState('details');
  const [showJournalPreviewDialog, setShowJournalPreviewDialog] = useState(false);
  const [journalPreview, setJournalPreview] = useState<PaymentJournalPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [accountSearchOpen, setAccountSearchOpen] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  // Double-submit protection: Track if form is currently being submitted
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Idempotency key: Prevent duplicate payment creation on retry
  const [idempotencyKey] = useState(() => `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  // Payment validation state
  const [paymentValidation, setPaymentValidation] = useState<any>(null);
  const [isValidatingPayment, setIsValidatingPayment] = useState(false);

  // Business logic hook
  const { 
    createPayment, 
    updatePayment,
    generateJournalPreview,
    isCreating, 
    isUpdating,
    canCreatePayments 
  } = usePaymentOperations({
    autoCreateJournalEntry,
    requireApproval,
    enableNotifications
  });

  // Data hooks
  const { data: costCenters } = useCostCenters();
  const { data: banks } = useBanks();
  const { data: entryAllowedAccounts } = useEntryAllowedAccounts();
  const { currency: companyCurrency } = useCompanyCurrency();
  const { data: customers } = useCustomers();
  const { data: vendors } = useVendors();

  // Determine payment subtype based on context
  const getPaymentSubtype = (): 'receipt' | 'payment' => {
    switch (type) {
      case 'customer_payment':
      case 'invoice_payment':
        return customerId ? 'receipt' : 'payment';
      case 'vendor_payment':
        return 'payment';
      default:
        return 'receipt';
    }
  };

  const paymentSubtype = getPaymentSubtype();

  // Form setup - MUST be defined before any form.watch() calls
  const form = useForm({
    resolver: zodResolver(enhancedPaymentSchema),
    defaultValues: {
      payment_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      payment_method: 'cash',
      reference_number: '',
      check_number: '',
      bank_account: '',
      cost_center_id: '',
      bank_id: '',
      account_id: '',
      currency: companyCurrency || 'QAR',
      notes: '',
      type: paymentSubtype, // 'receipt' or 'payment' based on context
      transaction_type: type, // Original type from props for tracking
      customer_id: customerId || '',
      vendor_id: vendorId || '',
      invoice_id: invoiceId || '',
      contract_id: contractId || '',
      payment_status: 'completed',
      ...initialData,
    },
  });

  // Watch values - MUST be after form is defined
  const watchedCustomerId = form.watch('customer_id');
  const watchedVendorId = form.watch('vendor_id');
  const watchedValues = form.watch();
  const paymentMethod = form.watch('payment_method');
  const watchedAmount = form.watch('amount');
  const watchedContractId = form.watch('contract_id');
  const watchedInvoiceId = form.watch('invoice_id');
  const customerList = Array.isArray(customers) ? customers : customers?.data || [];
  const vendorList = vendors || [];

  const selectedCustomer = useMemo(() => {
    if (!watchedCustomerId) return null;
    return customerList.find((customer: any) => customer.id === watchedCustomerId) || null;
  }, [customerList, watchedCustomerId]);

  const selectedVendor = useMemo(() => {
    if (!watchedVendorId) return null;
    return vendorList.find((vendor: any) => vendor.id === watchedVendorId) || null;
  }, [vendorList, watchedVendorId]);

  const selectedEntityName = selectedCustomer
    ? selectedCustomer.company_name_ar || selectedCustomer.company_name || `${selectedCustomer.first_name_ar || selectedCustomer.first_name || ''} ${selectedCustomer.last_name_ar || selectedCustomer.last_name || ''}`.trim() || 'عميل'
    : selectedVendor?.vendor_name || 'بدون ربط';

  const paymentMethodLabel = {
    cash: 'نقداً',
    check: 'شيك',
    bank_transfer: 'تحويل بنكي',
    credit_card: 'بطاقة ائتمان',
    debit_card: 'بطاقة خصم'
  }[paymentMethod as string] || 'غير محدد';

  const amountPreview = Number(watchedAmount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });

  const voucherStyle = {
    "--voucher-text": systemColorPattern.colors.text,
    "--voucher-inner": systemColorPattern.colors.innerSurface,
    "--voucher-muted": systemColorPattern.colors.secondaryText,
    "--voucher-border": systemColorPattern.colors.border,
    "--voucher-success": systemColorPattern.colors.success,
    "--voucher-info": systemColorPattern.colors.info,
    "--voucher-alert": systemColorPattern.colors.alert,
    "--voucher-focus": systemColorPattern.colors.focus,
  } as React.CSSProperties;

  // Payment validation hook
  const { validationResult, validatePayment } = usePaymentValidation({
    contractId: watchedContractId || contractId,
    invoiceId: watchedInvoiceId || invoiceId,
    amount: watchedAmount || 0,
    currency: watchedValues.currency || companyCurrency || 'QAR'
  });

  // Validate payment when amount, contract, or invoice changes
  React.useEffect(() => {
    const validate = async () => {
      if (watchedAmount > 0 && (watchedContractId || watchedInvoiceId || contractId || invoiceId)) {
        setIsValidatingPayment(true);
        const result = await validatePayment();
        setPaymentValidation(result);
        setIsValidatingPayment(false);
      } else {
        setPaymentValidation(null);
      }
    };

    const timeoutId = setTimeout(validate, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedAmount, watchedContractId, watchedInvoiceId, contractId, invoiceId, validatePayment]);

  // Use watched values or props for contracts - only fetch if we have a valid UUID
  const effectiveCustomerId = (watchedCustomerId && watchedCustomerId !== 'none' && watchedCustomerId !== '')
    ? watchedCustomerId : customerId;
  const effectiveVendorId = (watchedVendorId && watchedVendorId !== 'none' && watchedVendorId !== '')
    ? watchedVendorId : vendorId;

  const { data: contracts } = useActiveContracts(effectiveCustomerId, effectiveVendorId);

  // Filter accounts based on search query
  const filteredAccounts = useMemo(() => {
    if (!entryAllowedAccounts) return [];
    if (!accountSearchQuery) return entryAllowedAccounts;
    
    const query = accountSearchQuery.toLowerCase();
    return entryAllowedAccounts.filter(account => 
      account.account_code?.toLowerCase().includes(query) ||
      account.account_name?.toLowerCase().includes(query) ||
      account.account_name_ar?.toLowerCase().includes(query)
    );
  }, [entryAllowedAccounts, accountSearchQuery]);

  // Get selected account details
  const selectedAccount = useMemo(() => {
    const accountId = form.watch('account_id');
    return entryAllowedAccounts?.find(acc => acc.id === accountId);
  }, [entryAllowedAccounts, form.watch('account_id')]);

  // Generate mock data for testing
  const fillMockData = () => {
    const mockData = {
      payment_number: `${paymentSubtype.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      amount: 1500.00,
      payment_method: 'bank_transfer',
      reference_number: `REF-${Math.floor(Math.random() * 10000)}`,
      bank_account: '1234567890',
      cost_center_id: costCenters?.[0]?.id || '',
      bank_id: banks?.[0]?.id || '',
      account_id: entryAllowedAccounts?.[0]?.id || '',
      notes: 'هذه بيانات تجريبية للاختبار',
      contract_id: contracts?.[0]?.id || ''
    };

    Object.keys(mockData).forEach(key => {
      form.setValue(key as any, mockData[key as keyof typeof mockData]);
    });

    toast.success('تم ملء البيانات التجريبية بنجاح');
  };

  // Generate journal preview
  const handleGeneratePreview = async () => {
    if (showJournalPreviewDialog) {
      // If preview is already showing, just close it
      setShowJournalPreviewDialog(false);
      return;
    }

    if (watchedValues.amount <= 0) {
      toast.error('يرجى إدخال المبلغ أولاً');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const preview = await generateJournalPreview(watchedValues);
      setJournalPreview(preview);
      setShowJournalPreviewDialog(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('خطأ في إنشاء المعاينة');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Form submission with double-submit protection
  const onSubmit = async (data: any) => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('⚠️ Form already submitting, ignoring duplicate submission');
      return;
    }

    setIsSubmitting(true);

    try {
      let result;
      if (mode === 'edit' && initialData?.id) {
        result = await updatePayment.mutateAsync({
          paymentId: initialData.id,
          data
        });
      } else {
        // Include idempotency key for new payments to prevent duplicates on retry
        result = await createPayment.mutateAsync({
          ...data,
          idempotencyKey: idempotencyKey
        });
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      // Error handling is done in the business logic hook
      console.error('Form submission error:', error);
    } finally {
      // Reset submitting state after completion (or error)
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (onCancel) {
      onCancel();
    }
  };

  // Get dialog title based on context
  const getDialogTitle = () => {
    const action = mode === 'edit' ? 'تعديل' : 'إنشاء';
    const paymentTypeText = paymentSubtype === 'receipt' ? 'إيصال قبض' : 'إيصال صرف';
    return `${action} ${paymentTypeText}`;
  };

  const getDialogDescription = () => {
    if (paymentSubtype === 'payment') {
      return 'أدخل تفاصيل المبلغ المصروف وحدد المستفيد أو المورد عند الحاجة';
    }

    switch (type) {
      case 'customer_payment':
        return 'أدخل تفاصيل المبلغ المقبوض من العميل';
      case 'vendor_payment':
        return 'أدخل تفاصيل المبلغ المدفوع للمورد';
      case 'invoice_payment':
        return 'أدخل تفاصيل دفع الفاتورة';
      default:
        return 'أدخل تفاصيل الدفعة';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="voucher-dialog max-h-[88dvh] max-w-5xl overflow-hidden rounded-lg border-0 p-0" dir="rtl" style={voucherStyle}>
        <DialogHeader className="voucher-dialog-header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="voucher-dialog-icon">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-black text-[#020617]">{getDialogTitle()}</DialogTitle>
              <DialogDescription className="mt-1 font-bold text-[#94A3B8]">
            {getDialogDescription()}
              </DialogDescription>
            </div>
          </div>
          <div className="voucher-dialog-status">
            <span>{paymentSubtype === 'receipt' ? 'قبض' : 'صرف'}</span>
            <strong>{watchedValues.currency || companyCurrency || 'QAR'}</strong>
          </div>
        </DialogHeader>

        <div className="voucher-dialog-body">
        {/* Permission check */}
        {!canCreatePayments && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ليس لديك صلاحية إنشاء الدفعات
            </AlertDescription>
          </Alert>
        )}

        <section className="voucher-summary">
          <div className="voucher-summary-main">
            <span className="voucher-summary-icon">
              <WalletCards className="h-5 w-5" />
            </span>
            <div>
              <p>{paymentSubtype === 'receipt' ? 'مبلغ القبض' : 'مبلغ الصرف'}</p>
              <strong>{amountPreview} {watchedValues.currency || companyCurrency || 'QAR'}</strong>
            </div>
          </div>
          <div className="voucher-summary-meta">
            <div>
              <span>المستفيد / الرابط</span>
              <strong>{selectedEntityName}</strong>
            </div>
            <div>
              <span>طريقة الدفع</span>
              <strong>{paymentMethodLabel}</strong>
            </div>
            <div>
              <span>رقم الإيصال</span>
              <strong>{watchedValues.payment_number || 'لم يحدد'}</strong>
            </div>
          </div>
        </section>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="voucher-form">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="voucher-tabs grid w-full grid-cols-3">
                <TabsTrigger value="details" className="voucher-tab-trigger">
                  <DollarSign className="h-4 w-4" />
                  تفاصيل الدفعة
                </TabsTrigger>
                <TabsTrigger value="accounting" className="voucher-tab-trigger">
                  <FileText className="h-4 w-4" />
                  الحسابات
                </TabsTrigger>
                {showJournalPreview && (
                  <TabsTrigger value="preview" className="voucher-tab-trigger">
                    <Eye className="h-4 w-4" />
                    معاينة القيد
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Payment Details Tab */}
              <TabsContent value="details" className="voucher-tab-content">
                <Card className="voucher-card">
                  <CardHeader className="voucher-card-header">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="voucher-card-icon">
                          <DollarSign className="h-4 w-4" />
                        </span>
                        <div>
                          <CardTitle>معلومات الدفعة الأساسية</CardTitle>
                          <p>ابدأ بالمبلغ، التاريخ، وطريقة الدفع ثم اربط العملية بالعميل أو المورد عند الحاجة.</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fillMockData}
                        className="voucher-ghost-button"
                      >
                        <TestTube className="h-4 w-4" />
                        بيانات تجريبية
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="voucher-card-content">
                    {/* Payment Number */}
                    <FormField
                      control={form.control}
                      name="payment_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الإيصال *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={paymentSubtype === 'receipt' ? "REC-2024-001" : "PAY-2024-001"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Payment Date */}
                    <FormField
                      control={form.control}
                      name="payment_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ السداد *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Amount */}
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المبلغ *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.001"
                              placeholder="0.000"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                          {/* Payment validation warning */}
                          {paymentValidation && paymentValidation.message && (
                            <div className={`mt-2 p-3 rounded-lg text-sm ${
                              paymentValidation.isBlocked
                                ? 'bg-red-50 border border-red-200 text-red-800'
                                : paymentValidation.isWarning
                                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                                : 'bg-blue-50 border border-blue-200 text-blue-800'
                            }`}>
                              <div className="flex items-start gap-2">
                                <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                  paymentValidation.isBlocked ? 'text-red-600' : 'text-yellow-600'
                                }`} />
                                <div>
                                  <p className="font-medium">
                                    {paymentValidation.isBlocked ? 'تنبيه هام' : paymentValidation.isWarning ? 'تنبيه' : 'ملاحظة'}
                                  </p>
                                  <p className="text-xs mt-1">{paymentValidation.message}</p>
                                  {paymentValidation.details && (
                                    <div className="mt-2 text-xs space-y-1">
                                      {paymentValidation.details.contractAmount > 0 && (
                                        <p>مبلغ العقد: QAR {paymentValidation.details.contractAmount.toLocaleString()}</p>
                                      )}
                                      {paymentValidation.details.totalPaid > 0 && (
                                        <p>المدفوع حتى الآن: QAR {paymentValidation.details.totalPaid.toLocaleString()}</p>
                                      )}
                                      {paymentValidation.details.newTotal > 0 && (
                                        <p>الإجمالي بعد هذه الدفعة: QAR {paymentValidation.details.newTotal.toLocaleString()}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {isValidatingPayment && (
                            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                              جاري التحقق من صحة المبلغ...
                            </div>
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Currency */}
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العملة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="QAR">ريال قطري (QAR)</SelectItem>
                              <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                              <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                              <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                              <SelectItem value="EUR">يورو (EUR)</SelectItem>
                              <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Customer Selection - show when no customer is pre-selected */}
                    {!customerId && (
                      <FormField
                        control={form.control}
                        name="customer_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>العميل (اختياري)</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                              value={field.value || 'none'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر العميل" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">بدون ربط بعميل</SelectItem>
                                {customerList.map((customer: any) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.customer_name || 'عميل'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Vendor Selection - show when no vendor is pre-selected */}
                    {!vendorId && (
                      <FormField
                        control={form.control}
                        name="vendor_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المورد (اختياري)</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                              value={field.value || 'none'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر المورد" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">بدون ربط بمورد</SelectItem>
                                {vendorList.map((vendor) => (
                                  <SelectItem key={vendor.id} value={vendor.id}>
                                    {vendor.vendor_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Contract Selection */}
                    {!contractId && contracts && contracts.length > 0 && (
                      <FormField
                        control={form.control}
                        name="contract_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>العقد (اختياري)</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                              value={field.value || 'none'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر العقد" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">بدون ربط بعقد</SelectItem>
                                {contracts.map((contract: any) => (
                                  <SelectItem key={contract.id} value={contract.id}>
                                    {contract.contract_number}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Payment Method */}
                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>طريقة الدفع *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">نقداً</SelectItem>
                              <SelectItem value="check">شيك</SelectItem>
                              <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                              <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                              <SelectItem value="debit_card">بطاقة خصم</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Reference Number */}
                    <FormField
                      control={form.control}
                      name="reference_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم المرجع</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="رقم المرجع أو التحويل" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Check Number - conditional */}
                    {paymentMethod === 'check' && (
                      <FormField
                        control={form.control}
                        name="check_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم الشيك</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="رقم الشيك" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Bank Account - conditional */}
                    {(paymentMethod === 'bank_transfer' || paymentMethod === 'check') && (
                      <FormField
                        control={form.control}
                        name="bank_account"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الحساب البنكي</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="رقم الحساب البنكي" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Notes */}
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ملاحظات</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="ملاحظات إضافية..."
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Accounting Tab */}
              <TabsContent value="accounting" className="voucher-tab-content">
                <Card className="voucher-card">
                  <CardHeader className="voucher-card-header">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="voucher-card-icon">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                    <CardTitle>الحسابات والتصنيفات</CardTitle>
                        <p>اختر الحساب المحاسبي ومركز التكلفة والبنك ليتكون القيد بشكل صحيح.</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="voucher-card-content accounting">
                    {/* Account - with search */}
                    <FormField
                      control={form.control}
                      name="account_id"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>الحساب المحاسبي</FormLabel>
                          <Popover open={accountSearchOpen} onOpenChange={setAccountSearchOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={accountSearchOpen}
                                  className={cn(
                                    "w-full justify-between h-auto min-h-[40px] py-2",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {selectedAccount ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-sm">{selectedAccount.account_code}</span>
                                      <span>-</span>
                                      <span>{selectedAccount.account_name}</span>
                                      <AccountLevelBadge accountLevel={selectedAccount.account_level} isHeader={false} />
                                    </div>
                                  ) : (
                                    <span>ابحث واختر الحساب المحاسبي...</span>
                                  )}
                                  <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command shouldFilter={false}>
                                <div className="flex items-center border-b px-3">
                                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  <CommandInput 
                                    placeholder="ابحث برقم أو اسم الحساب..." 
                                    value={accountSearchQuery}
                                    onValueChange={setAccountSearchQuery}
                                    className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                  />
                                </div>
                                <CommandList>
                                  <CommandEmpty>لا توجد نتائج للبحث</CommandEmpty>
                                  <CommandGroup className="max-h-[300px] overflow-auto">
                                    {filteredAccounts.map((account) => (
                                      <CommandItem
                                        key={account.id}
                                        value={account.id}
                                        onSelect={() => {
                                          field.onChange(account.id);
                                          setAccountSearchOpen(false);
                                          setAccountSearchQuery('');
                                        }}
                                        className="flex items-center justify-between cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Check
                                            className={cn(
                                              "h-4 w-4",
                                              field.value === account.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <span className="font-mono text-sm text-muted-foreground">
                                            {account.account_code}
                                          </span>
                                          <span>{account.account_name}</span>
                                        </div>
                                        <AccountLevelBadge accountLevel={account.account_level} isHeader={false} />
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

                    {/* Cost Center */}
                    <FormField
                      control={form.control}
                      name="cost_center_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مركز التكلفة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر مركز التكلفة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {costCenters?.map((center) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {center.center_name_ar || center.center_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bank */}
                    <FormField
                      control={form.control}
                      name="bank_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البنك</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر البنك" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {banks?.map((bank) => (
                                <SelectItem key={bank.id} value={bank.id}>
                                  {bank.bank_name_ar || bank.bank_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Contract - show when customer or vendor is selected */}
                    {(effectiveCustomerId || effectiveVendorId) && contracts && contracts.length > 0 && (
                      <FormField
                        control={form.control}
                        name="contract_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              العقد المرتبط (اختياري)
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="ml-2 h-7 text-xs"
                                onClick={() => {
                                  // سيتم إضافة وظيفة الربط الذكي هنا
                                  toast.info('ميزة الربط الذكي قيد التطوير');
                                }}
                              >
                                <Brain className="h-3 w-3 mr-1" />
                                ربط ذكي
                              </Button>
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                              value={field.value || 'none'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر العقد" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">بدون ربط بعقد</SelectItem>
                                {contracts?.map(contract => (
                                  <SelectItem key={contract.id} value={contract.id}>
                                    {contract.contract_number} {contract.customer?.first_name ? `- ${contract.customer.first_name}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Journal Preview Tab */}
              {showJournalPreview && journalPreview && (
                <TabsContent value="preview" className="space-y-6">
                  <Card className="voucher-card">
                    <CardHeader className="voucher-card-header">
                      <CardTitle>معاينة القيد المحاسبي</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">رقم القيد:</span> {journalPreview.entry_number}
                          </div>
                          <div>
                            <span className="font-medium">تاريخ القيد:</span> {journalPreview.entry_date}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">البيان:</span> {journalPreview.description}
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse border border-border">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border border-border p-2 text-right">رقم الحساب</th>
                                <th className="border border-border p-2 text-right">اسم الحساب</th>
                                <th className="border border-border p-2 text-right">البيان</th>
                                <th className="border border-border p-2 text-right">مدين</th>
                                <th className="border border-border p-2 text-right">دائن</th>
                              </tr>
                            </thead>
                            <tbody>
                              {journalPreview.lines.map((line, index) => (
                                <tr key={index}>
                                  <td className="border border-border p-2">{line.account_code}</td>
                                  <td className="border border-border p-2">{line.account_name}</td>
                                  <td className="border border-border p-2">{line.description}</td>
                                  <td className="border border-border p-2 text-right">
                                    {line.debit_amount > 0 && `${line.debit_amount.toFixed(3)} ${watchedValues.currency}`}
                                  </td>
                                  <td className="border border-border p-2 text-right">
                                    {line.credit_amount > 0 && `${line.credit_amount.toFixed(3)} ${watchedValues.currency}`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-muted font-medium">
                                <td colSpan={3} className="border border-border p-2 text-right">الإجمالي:</td>
                                <td className="border border-border p-2 text-right">
                                  {journalPreview.total_amount.toFixed(3)} {watchedValues.currency}
                                </td>
                                <td className="border border-border p-2 text-right">
                                  {journalPreview.total_amount.toFixed(3)} {watchedValues.currency}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>

            {/* Action Buttons */}
            <div className="voucher-form-footer">
              <div className="flex gap-2">
                {currentTab === 'details' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGeneratePreview}
                    disabled={isPreviewLoading || watchedValues.amount <= 0}
                    className="voucher-ghost-button"
                  >
                    {showJournalPreviewDialog ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {isPreviewLoading ? "جاري التحضير..." : showJournalPreviewDialog ? "إخفاء المعاينة" : "معاينة القيد"}
                  </Button>
                )}
              </div>
              
              <div className="voucher-footer-actions">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="voucher-submit-button"
                  disabled={
                    isCreating ||
                    isUpdating ||
                    isSubmitting ||
                    !canCreatePayments ||
                    paymentValidation?.isBlocked ||
                    isValidatingPayment
                  }
                >
                  {(isCreating || isUpdating || isSubmitting) ? "جاري الحفظ..." : mode === 'edit' ? "تحديث الدفعة" : "حفظ الإيصال"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
        </div>
        <style>{`
          .voucher-dialog {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            color: var(--voucher-text);
            background: white;
          }

          .voucher-dialog-header {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 1px solid var(--voucher-border);
            background: linear-gradient(180deg, var(--voucher-inner), white);
            padding: 16px 20px;
          }

          .voucher-dialog-icon,
          .voucher-summary-icon,
          .voucher-card-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 8px;
            color: var(--voucher-success);
            background: color-mix(in srgb, var(--voucher-success) 12%, white);
          }

          .voucher-dialog-icon {
            width: 42px;
            height: 42px;
            border: 1px solid color-mix(in srgb, var(--voucher-success) 24%, white);
          }

          .voucher-dialog-status {
            display: grid;
            gap: 2px;
            min-width: 82px;
            border-radius: 8px;
            background: color-mix(in srgb, var(--voucher-info) 10%, white);
            color: var(--voucher-info);
            padding: 8px 10px;
            text-align: center;
          }

          .voucher-dialog-status span {
            font-size: 11px;
            font-weight: 900;
          }

          .voucher-dialog-status strong {
            font-size: 13px;
            font-weight: 950;
          }

          .voucher-dialog-body {
            min-height: 0;
            overflow-y: auto;
            background: var(--voucher-inner);
            padding: 14px 18px;
          }

          .voucher-summary {
            display: grid;
            grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
            gap: 10px;
            margin-bottom: 12px;
          }

          .voucher-summary-main,
          .voucher-summary-meta > div,
          .voucher-card {
            border: 1px solid var(--voucher-border);
            border-radius: 8px;
            background: white;
            box-shadow: 0 10px 26px rgba(2, 6, 23, 0.05);
          }

          .voucher-summary-main {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
          }

          .voucher-summary-icon {
            width: 44px;
            height: 44px;
          }

          .voucher-summary p,
          .voucher-summary span,
          .voucher-card-header p {
            color: var(--voucher-muted);
            font-weight: 800;
          }

          .voucher-summary p {
            margin: 0;
            font-size: 12px;
          }

          .voucher-summary strong {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--voucher-text);
            font-weight: 950;
          }

          .voucher-summary-main strong {
            margin-top: 2px;
            font-size: 22px;
          }

          .voucher-summary-meta {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .voucher-summary-meta > div {
            padding: 10px;
          }

          .voucher-summary-meta span {
            display: block;
            font-size: 11px;
          }

          .voucher-summary-meta strong {
            margin-top: 4px;
            font-size: 13px;
          }

          .voucher-form {
            display: grid;
            gap: 12px;
          }

          .voucher-tabs {
            height: auto;
            gap: 8px;
            border: 1px solid var(--voucher-border);
            border-radius: 8px;
            background: white;
            padding: 6px;
          }

          .voucher-tab-trigger {
            gap: 7px;
            min-height: 42px;
            border-radius: 8px !important;
            color: var(--voucher-muted);
            font-weight: 900;
          }

          .voucher-tab-trigger[data-state="active"] {
            background: color-mix(in srgb, var(--voucher-success) 12%, white) !important;
            color: var(--voucher-success) !important;
            box-shadow: none !important;
          }

          .voucher-tab-content {
            margin-top: 12px;
          }

          .voucher-card {
            overflow: hidden;
          }

          .voucher-card-header {
            border-bottom: 1px solid var(--voucher-border);
            background: white;
            padding: 14px 16px;
          }

          .voucher-card-header h3,
          .voucher-card-header .text-2xl {
            color: var(--voucher-text);
            font-size: 18px;
            font-weight: 950;
          }

          .voucher-card-header p {
            margin-top: 3px;
            font-size: 12px;
          }

          .voucher-card-icon {
            width: 36px;
            height: 36px;
          }

          .voucher-card-content {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            padding: 16px;
          }

          .voucher-card-content.accounting {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .voucher-dialog label {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--voucher-text);
            font-size: 12px;
            font-weight: 900;
          }

          .voucher-dialog input,
          .voucher-dialog textarea,
          .voucher-dialog [role="combobox"] {
            min-height: 46px;
            border-radius: 8px !important;
            border-color: var(--voucher-border) !important;
            background: var(--voucher-inner) !important;
            color: var(--voucher-text) !important;
            box-shadow: none !important;
          }

          .voucher-dialog input::-webkit-outer-spin-button,
          .voucher-dialog input::-webkit-inner-spin-button {
            margin: 0;
            appearance: none;
          }

          .voucher-dialog input[type="number"] {
            appearance: textfield;
            -moz-appearance: textfield;
          }

          .voucher-dialog textarea {
            min-height: 92px;
          }

          .voucher-ghost-button {
            gap: 7px;
            border-color: var(--voucher-border) !important;
            border-radius: 8px !important;
            background: var(--voucher-inner) !important;
            color: var(--voucher-text) !important;
            font-weight: 900;
          }

          .voucher-form-footer {
            position: sticky;
            bottom: -14px;
            z-index: 4;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-top: 1px solid var(--voucher-border);
            background: white;
            padding: 12px 0 0;
          }

          .voucher-footer-actions {
            display: flex;
            gap: 8px;
          }

          .voucher-footer-actions button {
            min-height: 42px;
            border-radius: 8px !important;
          }

          .voucher-submit-button {
            background: var(--voucher-success) !important;
            color: white !important;
          }

          .voucher-dialog *:focus-visible {
            outline-color: var(--voucher-focus) !important;
            --tw-ring-color: var(--voucher-focus) !important;
          }

          @media (max-width: 760px) {
            .voucher-dialog-header,
            .voucher-form-footer {
              flex-direction: column;
              align-items: stretch;
            }

            .voucher-summary,
            .voucher-summary-meta,
            .voucher-card-content,
            .voucher-card-content.accounting {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </DialogContent>
      
      {/* Journal Preview Dialog */}
      {showJournalPreviewDialog && journalPreview && (
        <Dialog open={showJournalPreviewDialog} onOpenChange={setShowJournalPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>معاينة القيد المحاسبي</DialogTitle>
              <DialogDescription>
                هذا عرض للقيد الذي سيتم إنشاؤه تلقائياً
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">رقم القيد:</span> {journalPreview.entry_number}
                </div>
                <div>
                  <span className="font-medium">تاريخ القيد:</span> {journalPreview.entry_date}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">البيان:</span> {journalPreview.description}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-2 text-right">رقم الحساب</th>
                      <th className="border border-border p-2 text-right">اسم الحساب</th>
                      <th className="border border-border p-2 text-right">البيان</th>
                      <th className="border border-border p-2 text-right">مدين</th>
                      <th className="border border-border p-2 text-right">دائن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalPreview.lines.map((line, index) => (
                      <tr key={index}>
                        <td className="border border-border p-2">{line.account_code}</td>
                        <td className="border border-border p-2">{line.account_name}</td>
                        <td className="border border-border p-2">{line.description}</td>
                        <td className="border border-border p-2 text-right">
                          {line.debit_amount > 0 && `${line.debit_amount.toFixed(3)} ${watchedValues.currency}`}
                        </td>
                        <td className="border border-border p-2 text-right">
                          {line.credit_amount > 0 && `${line.credit_amount.toFixed(3)} ${watchedValues.currency}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-medium">
                      <td colSpan={3} className="border border-border p-2 text-right">الإجمالي:</td>
                      <td className="border border-border p-2 text-right">
                        {journalPreview.total_amount.toFixed(3)} {watchedValues.currency}
                      </td>
                      <td className="border border-border p-2 text-right">
                        {journalPreview.total_amount.toFixed(3)} {watchedValues.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

// Export legacy wrapper for backward compatibility
export const PaymentForm = UnifiedPaymentForm;
