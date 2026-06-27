import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, CheckCircle2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NoticeVariables } from './NoticeTemplateManager';

interface NoticeAutoFillerProps {
  companyId: string;
  selectedTemplate?: string;
  onVariablesReady: (variables: NoticeVariables) => void;
  isLoading?: boolean;
}

const INVOICE_REQUIRED_TEMPLATES = new Set([
  'friendlyReminder',
  'pre_warning',
  'final_demand',
  'court_filing',
  'settlement',
  'paymentPlan',
  'promiseToPay',
  'guarantorNotice',
  'assetReturnNotice',
  'legalReferral',
]);

const getCustomerDisplayName = (customer: any) => {
  if (customer.customer_type === 'corporate') {
    return customer.company_name_ar || customer.company_name || 'عميل شركة';
  }
  return (
    `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim() ||
    customer.company_name_ar ||
    customer.company_name ||
    'عميل'
  );
};

export const NoticeAutoFiller: React.FC<NoticeAutoFillerProps> = ({
  companyId,
  selectedTemplate = 'pre_warning',
  onVariablesReady,
  isLoading = false,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('7');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const requiresInvoices = INVOICE_REQUIRED_TEMPLATES.has(selectedTemplate);

  const { data: companyInfo } = useQuery({
    queryKey: ['notice-company-info', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('name, name_ar, address, address_ar, phone, email, commercial_register, logo_url')
        .eq('id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch customers
  const { data: customers, isLoading: isLoadingCustomers, error: customersError } = useQuery({
    queryKey: ['customers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar, customer_type, national_id, phone, email, address')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch unpaid invoices for selected customer
  const { data: unpaidInvoices, isLoading: isLoadingInvoices, error: invoicesError } = useQuery({
    queryKey: ['unpaid-invoices', selectedCustomerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_amount, payment_status, created_at')
        .eq('customer_id', selectedCustomerId)
        .in('payment_status', ['unpaid', 'overdue', 'partial', 'partially_paid', 'pending'])
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomerId,
  });

  useEffect(() => {
    if (!requiresInvoices) {
      setSelectedInvoiceIds([]);
    }
  }, [requiresInvoices]);

  const generateVariables = useCallback(async () => {
    if (!selectedCustomerId) {
      toast.error('يرجى اختيار العميل أولاً');
      return;
    }

    if (requiresInvoices && selectedInvoiceIds.length === 0) {
      toast.error('نوع الكتاب المحدد يحتاج اختيار فاتورة واحدة على الأقل');
      return;
    }

    setIsProcessing(true);
    setCompletionStatus({});

    try {
      const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);
      if (!selectedCustomer) throw new Error('Customer not found');
      setCompletionStatus((prev) => ({ ...prev, customer: true }));

      // Fetch selected invoices
      const selectedInvoices = unpaidInvoices?.filter((inv) => selectedInvoiceIds.includes(inv.id));
      if (requiresInvoices && (!selectedInvoices || selectedInvoices.length === 0)) throw new Error('No invoices selected');
      setCompletionStatus((prev) => ({ ...prev, invoices: true }));

      // Calculate totals
      const invoicesForDocument = selectedInvoices || [];
      const totalRent = invoicesForDocument.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const firstInvoiceDate = invoicesForDocument[0]?.invoice_date;
      const daysOverdue = firstInvoiceDate
        ? Math.max(0, Math.floor((new Date().getTime() - new Date(firstInvoiceDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      const lateFees = totalRent * 0.001 * daysOverdue;
      const violationsFees = 0;
      const totalDebt = totalRent + lateFees + violationsFees;

      setCompletionStatus((prev) => ({ ...prev, calculations: true }));

      // Generate document number
      const docNumber = `NTF-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + parseInt(deadlineDays, 10));

      setCompletionStatus((prev) => ({ ...prev, formatting: true }));

      const customerName = getCustomerDisplayName(selectedCustomer);
      const officialCompanyName = companyInfo?.name_ar || companyInfo?.name || 'شركة العراف لتأجير السيارات';
      const officialCompanyAddress = companyInfo?.address_ar || companyInfo?.address || 'أم صلال محمد - الشارع التجاري - مبنى رقم 79 - الطابق الأول - مكتب 2';

      const variables: NoticeVariables = {
        companyName: companyInfo?.name || officialCompanyName,
        companyNameAr: officialCompanyName,
        companyAddress: officialCompanyAddress,
        companyPhone: companyInfo?.phone || '31411919',
        companyEmail: companyInfo?.email || 'info@alaraf.qa',
        commercialRegNo: companyInfo?.commercial_register || '146832',
        companyLogoUrl: companyInfo?.logo_url || '/receipts/logo.png',
        customerName,
        customerType: selectedCustomer.customer_type === 'corporate' ? 'company' : 'individual',
        customerAddress: selectedCustomer.address || '',
        customerPhone: selectedCustomer.phone || '',
        customerEmail: selectedCustomer.email || '',
        customerId: selectedCustomer.id,
        nationalId: selectedCustomer.national_id || '',
        contractNumber: 'N/A',
        contractDate: new Date().toISOString(),
        contractTermsAr: 'عقد إيجار طويل الأجل',
        invoiceNumbers: invoicesForDocument.map((inv) => inv.invoice_number),
        invoiceDates: invoicesForDocument.map((inv) => inv.invoice_date),
        invoiceAmounts: invoicesForDocument.map((inv) => inv.total_amount || 0),
        invoiceCurrency: 'QAR',
        invoiceCurrencyAr: 'ريال قطري',
        totalRent,
        lateFees: Math.round(lateFees),
        courtFees: Math.round(totalDebt * 0.01),
        violationsFees: Math.round(violationsFees),
        totalDebt: Math.round(totalDebt),
        daysOverdue,
        deadlineDays: parseInt(deadlineDays, 10),
        deadlineDate: deadlineDate.toISOString(),
        documentNumber: docNumber,
        dateIssued: new Date().toISOString(),
        companyRepName: 'إدارة التحصيل',
        companyRepTitle: 'مدير قسم التحصيل',
      };

      setCompletionStatus((prev) => ({ ...prev, ready: true }));
      onVariablesReady(variables);

      toast.success('تم ملء البيانات بنجاح', {
        description: 'جاهز لإنشاء الوثيقة',
      });
    } catch (error) {
      console.error('Error generating variables:', error);
      toast.error('حدث خطأ في جمع البيانات', {
        description: error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedCustomerId, selectedInvoiceIds, customers, unpaidInvoices, deadlineDays, onVariablesReady, companyInfo, requiresInvoices]);

  const stats = useMemo(() => {
    const selectedInvoices = unpaidInvoices?.filter((inv) => selectedInvoiceIds.includes(inv.id));
    const totalAmount = selectedInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
    return {
      invoiceCount: selectedInvoiceIds.length,
      totalAmount,
    };
  }, [selectedInvoiceIds, unpaidInvoices]);

  const unpaidInvoiceIds = useMemo(
    () => unpaidInvoices?.map((invoice) => invoice.id) || [],
    [unpaidInvoices]
  );

  const allInvoicesSelected = unpaidInvoiceIds.length > 0
    && unpaidInvoiceIds.every((invoiceId) => selectedInvoiceIds.includes(invoiceId));

  const handleToggleAllInvoices = useCallback(() => {
    setSelectedInvoiceIds(allInvoicesSelected ? [] : unpaidInvoiceIds);
  }, [allInvoicesSelected, unpaidInvoiceIds]);

  const filteredCustomers = useMemo(() => {
    const term = customerSearchTerm.trim().toLowerCase();
    if (!term) return customers?.slice(0, 20) || [];

    return (customers || [])
      .filter((customer) => {
        const haystack = [
          getCustomerDisplayName(customer),
          customer.first_name,
          customer.last_name,
          customer.first_name_ar,
          customer.last_name_ar,
          customer.company_name,
          customer.company_name_ar,
          customer.phone,
          customer.national_id,
          customer.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 30);
  }, [customers, customerSearchTerm]);

  const selectedCustomer = useMemo(
    () => customers?.find((customer) => customer.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  if (!companyId) {
    return (
      <Card className="legal-panel">
        <CardContent className="p-6 text-sm text-[#64748B]">
          جاري تحميل بيانات الشركة...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="legal-system space-y-6">
      <Card className="legal-panel">
        <CardHeader>
          <CardTitle>ملء بيانات الوثيقة تلقائياً</CardTitle>
          <CardDescription>حدد العميل والفواتير لملء البيانات بشكل تلقائي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Label>ابحث عن العميل</Label>
              {selectedCustomer && (
                <Badge variant="secondary" className="w-fit">
                  تم اختيار: {getCustomerDisplayName(selectedCustomer)}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                value={customerSearchTerm}
                onChange={(event) => setCustomerSearchTerm(event.target.value)}
                placeholder="ابحث بالاسم، رقم الجوال، الرقم الشخصي، أو البريد..."
                className="h-12 rounded-lg border-[#E5EAF1] bg-white pr-10 text-right"
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-[#E5EAF1] bg-white p-2">
              {isLoadingCustomers && (
                <div className="flex items-center gap-2 rounded-lg bg-[#F6F8FB] p-3 text-sm text-[#64748B]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تحميل العملاء...
                </div>
              )}
              {!isLoadingCustomers && filteredCustomers.length === 0 && (
                <div className="rounded-lg bg-[#F6F8FB] p-3 text-sm text-[#64748B]">
                  لا توجد نتائج مطابقة. جرّب الاسم أو رقم الجوال أو الرقم الشخصي.
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                {filteredCustomers.map((customer) => {
                  const isSelected = selectedCustomerId === customer.id;
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setSelectedInvoiceIds([]);
                        setCompletionStatus({});
                      }}
                      className={`rounded-lg border p-3 text-right transition-colors ${
                        isSelected
                          ? 'border-[#22C7A1] bg-[#22C7A1]/10'
                          : 'border-[#E5EAF1] hover:border-[#38BDF8]/60 hover:bg-[#38BDF8]/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#020617]">
                            {getCustomerDisplayName(customer)}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#64748B]">
                            {customer.phone && <span>جوال: {customer.phone}</span>}
                            {customer.national_id && <span>رقم شخصي: {customer.national_id}</span>}
                          </div>
                          {customer.email && (
                            <div className="mt-1 truncate text-xs text-[#94A3B8]">{customer.email}</div>
                          )}
                        </div>
                        {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22C7A1]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {customersError && (
              <div className="flex items-center gap-2 rounded-lg border border-[#FB6B7A]/30 bg-[#FB6B7A]/10 p-3 text-sm text-[#B91C1C]">
                <AlertCircle className="h-4 w-4" />
                تعذر تحميل العملاء. تحقق من صلاحيات الشركة أو الاتصال.
              </div>
            )}
            {!isLoadingCustomers && !customersError && customers?.length === 0 && (
              <div className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3 text-sm text-[#64748B]">
                لا يوجد عملاء متاحون لهذه الشركة.
              </div>
            )}
          </div>

          {/* Invoice Selection */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Label>الفواتير المرتبطة بالكتاب</Label>
              <Badge variant={requiresInvoices ? 'default' : 'secondary'} className="w-fit">
                {requiresInvoices ? 'مطلوبة لهذا النوع' : 'غير مطلوبة لهذا النوع'}
              </Badge>
            </div>

            {!selectedCustomerId && (
              <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F6F8FB] p-4 text-sm text-[#64748B]">
                اختر العميل أولاً لعرض الفواتير غير المسددة المرتبطة به.
              </div>
            )}

            {selectedCustomerId && !requiresInvoices && (
              <div className="rounded-lg border border-[#22C7A1]/30 bg-[#22C7A1]/10 p-4 text-sm text-[#166B57]">
                نوع الكتاب المحدد لا يحتاج إرفاق فواتير. يمكنك المتابعة بعد اختيار العميل وتحديد مهلة السداد.
              </div>
            )}

            {selectedCustomerId && requiresInvoices && (
              <>
                {isLoadingInvoices && (
                  <div className="flex items-center gap-2 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3 text-sm text-[#64748B]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري تحميل الفواتير...
                  </div>
                )}
                {invoicesError && (
                  <div className="flex items-center gap-2 rounded-lg border border-[#FB6B7A]/30 bg-[#FB6B7A]/10 p-3 text-sm text-[#B91C1C]">
                    <AlertCircle className="h-4 w-4" />
                    تعذر تحميل الفواتير غير المسددة لهذا العميل.
                  </div>
                )}
                {!isLoadingInvoices && !invoicesError && unpaidInvoices?.length === 0 && (
                  <div className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3 text-sm text-[#64748B]">
                    لا توجد فواتير غير مسددة لهذا العميل.
                  </div>
                )}
                {unpaidInvoiceIds.length > 0 && (
                  <div className="flex flex-col gap-3 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[#64748B]">
                      <span className="font-semibold text-[#020617]">{selectedInvoiceIds.length}</span>
                      {' '}من {unpaidInvoiceIds.length} فواتير محددة
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleToggleAllInvoices}
                      className="w-full border-[#CBD5E1] bg-white sm:w-auto"
                    >
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                      {allInvoicesSelected ? 'إلغاء تحديد الكل' : 'تحديد كل الفواتير'}
                    </Button>
                  </div>
                )}
                <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
                  {unpaidInvoices?.map((invoice) => (
                    <button
                      key={invoice.id}
                      type="button"
                      onClick={() => {
                        setSelectedInvoiceIds((prev) =>
                          prev.includes(invoice.id)
                            ? prev.filter((id) => id !== invoice.id)
                            : [...prev, invoice.id]
                        );
                      }}
                      className={`rounded-lg border p-3 text-right transition-colors ${
                        selectedInvoiceIds.includes(invoice.id)
                          ? 'border-[#38BDF8] bg-[#38BDF8]/10'
                          : 'border-[#E5EAF1] hover:border-[#38BDF8]/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-[#020617]">{invoice.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(invoice.invoice_date).toLocaleDateString('ar-QA')}
                          </div>
                        </div>
                        {selectedInvoiceIds.includes(invoice.id) && <Check className="h-4 w-4 text-[#38BDF8]" />}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold">
                        <span>{invoice.total_amount?.toLocaleString('ar-QA')} ر.ق</span>
                        <span className="rounded-md bg-[#F6F8FB] px-2 py-0.5 text-[#64748B]">{invoice.payment_status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Stats */}
          {stats.invoiceCount > 0 && (
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-[#F6F8FB] p-4">
              <div>
                <div className="text-sm text-muted-foreground">عدد الفواتير</div>
                <div className="text-2xl font-bold">{stats.invoiceCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">المجموع</div>
                <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString('ar-QA')} ر.ق</div>
              </div>
            </div>
          )}

          {/* Deadline Days */}
          <div className="space-y-2">
            <Label>مهلة السداد (بالأيام)</Label>
            <Input
              type="number"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              min="1"
              max="90"
              placeholder="7"
            />
          </div>

          {/* Completion Status */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">جاري جمع البيانات...</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { key: 'customer', label: 'بيانات العميل' },
                  { key: 'invoices', label: 'الفواتير' },
                  { key: 'calculations', label: 'الحسابات' },
                  { key: 'formatting', label: 'التنسيق' },
                  { key: 'ready', label: 'جاهز' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    {completionStatus[item.key] ? (
                      <CheckCircle2 className="h-4 w-4 text-[#22C7A1]" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={generateVariables}
            disabled={!selectedCustomerId || (requiresInvoices && selectedInvoiceIds.length === 0) || isProcessing || isLoading}
            size="lg"
            className="legal-action-primary w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الملء التلقائي...
              </>
            ) : (
              'ملء البيانات تلقائياً'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoticeAutoFiller;
