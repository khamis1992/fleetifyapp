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
import { TestTube, AlertTriangle, FileText, Eye, EyeOff, DollarSign, Brain, Check, ChevronsUpDown, Search } from "lucide-react";
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
import { toast } from 'sonner';

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

  // Form submission
  const onSubmit = async (data: any) => {
    try {
      let result;
      if (mode === 'edit' && initialData?.id) {
        result = await updatePayment.mutateAsync({
          paymentId: initialData.id,
          data
        });
      } else {
        result = await createPayment.mutateAsync(data);
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      // Error handling is done in the business logic hook
      console.error('Form submission error:', error);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Permission check */}
        {!canCreatePayments && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ليس لديك صلاحية إنشاء الدفعات
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  تفاصيل الدفعة
                </TabsTrigger>
                <TabsTrigger value="accounting" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  الحسابات
                </TabsTrigger>
                {showJournalPreview && (
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    معاينة القيد
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Payment Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>معلومات الدفعة الأساسية</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fillMockData}
                        className="flex items-center gap-2"
                      >
                        <TestTube className="h-4 w-4" />
                        بيانات تجريبية
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                {(Array.isArray(customers) ? customers : customers?.data || []).map((customer: any) => (
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
                                {vendors?.map((vendor) => (
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
              <TabsContent value="accounting" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>الحسابات والتصنيفات</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Card>
                    <CardHeader>
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
            <div className="flex justify-between items-center pt-6 border-t border-border/50">
              <div className="flex gap-2">
                {currentTab === 'details' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGeneratePreview}
                    disabled={isPreviewLoading || watchedValues.amount <= 0}
                    className="flex items-center gap-2"
                  >
                    {showJournalPreviewDialog ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {isPreviewLoading ? "جاري التحضير..." : showJournalPreviewDialog ? "إخفاء المعاينة" : "معاينة القيد"}
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreating || isUpdating || !canCreatePayments}
                >
                  {isCreating || isUpdating ? "جاري الحفظ..." : mode === 'edit' ? "تحديث الدفعة" : "حفظ الإيصال"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
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