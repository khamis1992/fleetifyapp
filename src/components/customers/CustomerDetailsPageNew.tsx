/**
 * صفحة تفاصيل العميل — التجربة الجديدة "غرفة قيادة العميل"
 *
 * فلسفة التصميم (V3) — نفس لغة تصميم صفحة العقد:
 * - Hero فاتح بألوان التطبيق يجيب بنظرة واحدة: من العميل، حال العلاقة،
 *   كم له وكم عليه، وكيف نصل إليه فوراً.
 * - شريط إجراء واحد ذكي يرشّح "الخطوة التالية" حسب حالة الملف
 *   (تحصيل، مخالفات، فرصة تجديد، متابعة متأخرة، نمو).
 * - تبويبات لاصقة بشارات عدد — كل تبويب مسؤول عن عالم واحد فقط
 *   (نظرة عامة / العقود والمركبات / المالي / المخالفات / السجلات).
 * - عمود "نبض العميل": صحة الملف، فرص التجديد، تسجيل مكالمة سريع،
 *   وآخر النشاط — بدل توزيعها على تبويبات متفرقة.
 *
 * كل منطق الأعمال (الاستعلامات، الإجراءات، الحوارات) محفوظ كما هو.
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { calculateContractTotalAmount } from '@/utils/contractCalculations';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { getInvoiceDisplayLabel } from '@/utils/invoiceBillingMonth';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import {
  useCustomerDocuments,
  useUploadCustomerDocument,
} from '@/hooks/useCustomerDocuments';
import { useCustomerCRMActivity } from '@/hooks/useCustomerCRMActivity';
import { useDeleteCustomer } from '@/hooks/useEnhancedCustomers';
import { InvoicePreviewDialog } from '@/components/finance/InvoicePreviewDialog';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Car,
  CreditCard,
  FileImage,
  FileText,
  Folder,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Upload,
  User,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UnifiedPaymentForm } from '@/components/finance/UnifiedPaymentForm';
import { EnhancedCustomerForm } from '@/components/customers/EnhancedCustomerForm';
import { CustomerAISummary } from '@/components/customers/CustomerAISummary';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MissingDataWarnings,
  PersonalInfoTab,
  PhoneNumbersTab,
  ContractsTab,
  VehiclesTab,
  InvoicesTab,
  PaymentsTab,
  NotesTab,
  ViolationsTab,
  ActivityTab,
  DocumentCard,
  type CustomerDocument,
} from './tabs';
import { CustomerHero } from './customer-details-v3/CustomerHero';
import { CustomerActionBar } from './customer-details-v3/CustomerActionBar';
import { CustomerPulse } from './customer-details-v3/CustomerPulse';
import {
  buildCustomerSnapshotV3,
  buildProfileCompletionV3,
  getInitialCustomerTabV3,
} from './customer-details-v3/tokens';

// ===== Main Component =====
const CustomerDetailsPageNew = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();
  const queryClient = useQueryClient();
  const deleteCustomer = useDeleteCustomer();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // State
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => getInitialCustomerTabV3(requestedTab));
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [quickCrmNote, setQuickCrmNote] = useState('');
  const [quickCrmStatus, setQuickCrmStatus] = useState<'answered' | 'no_answer' | 'busy'>('answered');

  useEffect(() => {
    const nextTab = getInitialCustomerTabV3(requestedTab);
    setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, [requestedTab]);

  // Queries
  const { data: customer, isLoading: loadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer-details-new', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) throw new Error('معرف غير صالح');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId && !!companyId,
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['customer-contracts-new', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select(`*, vehicle:vehicles!vehicle_id(id, make, model, year, plate_number)`)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['customer-payments-new', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

  const { data: documents = [] } = useCustomerDocuments(customerId);
  const uploadDocument = useUploadCustomerDocument();

  const { data: customerInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['customer-invoices', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          contract:contracts!contract_id(id, contract_number)
        `)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

  const { data: trafficViolations = [], isLoading: loadingViolations } = useQuery({
    queryKey: ['customer-traffic-violations-new', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          contract:contracts!contract_id(id, contract_number, customer_id),
          vehicle:vehicles!vehicle_id(id, make, model, plate_number)
        `)
        .eq('company_id', companyId)
        .order('violation_date', { ascending: false });
      if (error) {
        console.error('Error fetching traffic violations:', error);
        return [];
      }
      return data?.filter((v: any) => v.contract?.customer_id === customerId) || [];
    },
    enabled: !!customerId && !!companyId,
  });

  const {
    activities: crmActivities = [],
    stats: crmStats,
    addActivity: addCrmActivity,
    isAdding: isAddingCrmActivity,
  } = useCustomerCRMActivity(customerId || '');

  const { data: scheduledFollowups = [] } = useQuery({
    queryKey: ['customer-followups-count', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('scheduled_followups')
        .select('id, status, scheduled_date, priority')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .neq('status', 'completed');
      if (error) return [];
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

  // ===== Derived state =====
  const customerName = useMemo(() => {
    if (!customer) return 'غير محدد';
    return formatCustomerName(customer, { preferArabic: true });
  }, [customer]);

  const initials = useMemo(() => {
    if (!customerName || customerName === 'غير محدد') return '؟';
    return customerName
      .split(' ')
      .filter((part: string) => part.length > 0)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase();
  }, [customerName]);

  const snapshot = useMemo(
    () =>
      buildCustomerSnapshotV3({
        contracts,
        invoices: customerInvoices,
        trafficViolations,
        scheduledFollowups,
      }),
    [contracts, customerInvoices, trafficViolations, scheduledFollowups],
  );

  const completion = useMemo(
    () => buildProfileCompletionV3(customer, documents.length),
    [customer, documents.length],
  );

  const activeContractsValue = useMemo(
    () =>
      contracts
        .filter((contract: any) => contract.status === 'active')
        .reduce((sum: number, contract: any) => sum + calculateContractTotalAmount(contract), 0),
    [contracts],
  );

  // ===== Handlers =====
  const handleBack = useCallback(() => navigate('/customers'), [navigate]);
  const handleEdit = useCallback(() => setIsEditDialogOpen(true), []);

  const handleCall = useCallback(() => {
    if (!customer?.phone) {
      toast({ title: 'رقم الهاتف غير متوفر', description: 'لا يوجد رقم هاتف مسجل لهذا العميل', variant: 'destructive' });
      return;
    }
    window.open(`tel:${customer.phone}`, '_self');
  }, [customer?.phone, toast]);

  const handleWhatsApp = useCallback(() => {
    if (!customer?.phone) {
      toast({ title: 'رقم الهاتف غير متوفر', description: 'لا يوجد رقم هاتف مسجل لهذا العميل', variant: 'destructive' });
      return;
    }
    const cleanedNumber = customer.phone.replace(/[^0-9]/g, '');
    if (!cleanedNumber || cleanedNumber.length < 7) {
      toast({ title: 'رقم الهاتف غير صالح', description: 'رقم الهاتف لا يمكن استخدامه مع واتساب', variant: 'destructive' });
      return;
    }
    window.open(`https://wa.me/${cleanedNumber}`, '_blank', 'noopener,noreferrer');
  }, [customer?.phone, toast]);

  const handleCreateContract = useCallback(() => {
    if (!customerId) return;
    navigate(`/contracts?customer=${customerId}`);
  }, [customerId, navigate]);

  const handleOpenCrm = useCallback(() => {
    if (!customerId) return;
    navigate(`/customers/crm?customer=${customerId}`);
  }, [customerId, navigate]);

  const handleOpenLegal = useCallback(() => {
    const activeContract = contracts?.find((contract: any) => contract.status === 'active');
    if (activeContract) {
      navigate(`/legal/lawsuit/prepare/${activeContract.id}`);
    } else {
      toast({ title: 'لا يوجد عقد نشط', description: 'يجب أن يكون للعميل عقد نشط لإنشاء قضية', variant: 'destructive' });
    }
  }, [contracts, navigate, toast]);

  const handleOpenLegalData = useCallback(() => navigate('/legal/lawsuit-data'), [navigate]);

  const handleRenewContract = useCallback(
    (contractId: string) => {
      const contract = contracts.find((item: any) => item.id === contractId);
      navigate(`/contracts/${contract?.contract_number || contractId}`);
    },
    [contracts, navigate],
  );

  const handlePrint = useCallback(() => window.print(), []);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: customerName, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'تم نسخ الرابط', description: 'تم نسخ رابط العميل إلى الحافظة' });
    }
  }, [customerName, toast]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0 || !customerId) return;
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'خطأ', description: 'حجم الملف كبير جداً', variant: 'destructive' });
        return;
      }

      setIsUploading(true);
      try {
        await uploadDocument.mutateAsync({
          customer_id: customerId,
          document_type: 'identity',
          document_name: file.name,
          file: file,
        });
        toast({ title: 'تم الرفع بنجاح', description: 'تم رفع المستند بنجاح' });
      } catch {
        toast({
          title: 'فشل الرفع',
          description: 'حدث خطأ أثناء رفع المستند',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        event.target.value = '';
      }
    },
    [customerId, uploadDocument, toast],
  );

  const handleSaveQuickCrmActivity = useCallback(async () => {
    if (!customerId) return;

    try {
      await addCrmActivity({
        note_type: 'phone',
        title: 'متابعة من صفحة العميل',
        content: quickCrmNote.trim() || 'تم تسجيل محاولة تواصل من صفحة تفاصيل العميل.',
        call_status: quickCrmStatus,
        is_important: quickCrmStatus !== 'answered',
      });

      setQuickCrmNote('');
      toast({
        title: 'تم حفظ التواصل',
        description: 'تم تحديث سجل CRM لهذا العميل.',
      });
    } catch (saveError) {
      console.error('Error saving customer CRM activity:', saveError);
      toast({
        title: 'تعذر حفظ التواصل',
        description: saveError instanceof Error ? saveError.message : 'حدث خطأ أثناء تحديث سجل CRM.',
        variant: 'destructive',
      });
    }
  }, [addCrmActivity, customerId, quickCrmNote, quickCrmStatus, toast]);

  const handleDeleteCustomer = useCallback(async () => {
    if (!customerId || !companyId) return;

    try {
      await deleteCustomer.mutateAsync(customerId);
      navigate('/customers');
    } catch {
      // The centralized mutation reports the actionable error to the user.
    } finally {
      setIsDeleteDialogOpen(false);
    }
  }, [companyId, customerId, deleteCustomer, navigate]);

  // ===== Loading & Error States =====
  if (isAuthenticating || !companyId || loadingCustomer) {
    return <PageSkeletonFallback />;
  }

  if (customerError || !customer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB] p-6" dir="rtl">
        <div className="w-full max-w-md rounded-2xl border border-[#E5EAF1] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#FB6B7A]/10">
            <AlertCircle className="h-8 w-8 text-[#FB6B7A]" />
          </div>
          <h2 className="mb-2 text-lg font-black text-[#0F172A]">خطأ في تحميل البيانات</h2>
          <p className="mb-5 text-sm font-semibold text-slate-500">
            لم يتم العثور على هذا العميل أو حدث خطأ أثناء التحميل
          </p>
          <Button onClick={handleBack} className="gap-2 rounded-xl bg-[#0F172A] px-6 font-bold hover:bg-[#1E293B]">
            العودة للعملاء
          </Button>
        </div>
      </div>
    );
  }

  const latestPayment = payments[0];
  const latestInvoice = customerInvoices[0];

  const tabs = [
    { value: 'overview', label: 'نظرة عامة', icon: Sparkles, badge: 0 },
    { value: 'contracts', label: 'العقود والمركبات', icon: FileText, badge: 0 },
    { value: 'financial', label: 'المالي', icon: Wallet, badge: snapshot.openInvoicesCount },
    { value: 'violations', label: 'المخالفات', icon: AlertTriangle, badge: trafficViolations.length },
    { value: 'records', label: 'السجلات والمستندات', icon: Folder, badge: 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#F6F8FB]"
      dir="rtl"
    >
      <div className="mx-auto max-w-[1680px] space-y-4 px-4 pb-10 pt-4 sm:px-6">
        {/* Systemic data-quality alerts */}
        <MissingDataWarnings customer={customer} />

        {/* ===== Hero identity band ===== */}
        <CustomerHero
          customer={customer}
          customerName={customerName}
          initials={initials}
          snapshot={snapshot}
          completion={completion}
          contractsCount={contracts.length}
          formatCurrency={formatCurrency}
          onBack={handleBack}
          onEdit={handleEdit}
          onCall={handleCall}
          onWhatsApp={handleWhatsApp}
          onOpenContracts={() => setActiveTab('contracts')}
        />

        {/* ===== Smart action strip ===== */}
        <CustomerActionBar
          snapshot={snapshot}
          formatCurrency={formatCurrency}
          onAddPayment={() => setIsPaymentDialogOpen(true)}
          onCreateContract={handleCreateContract}
          onUploadDocument={() => fileInputRef.current?.click()}
          onOpenCrm={handleOpenCrm}
          onOpenViolations={() => setActiveTab('violations')}
          onOpenFinancial={() => setActiveTab('financial')}
          onOpenContracts={() => setActiveTab('contracts')}
          onRenewContract={handleRenewContract}
          onEdit={handleEdit}
          onPrint={handlePrint}
          onShare={handleShare}
          onOpenLegal={handleOpenLegal}
          onOpenLegalData={handleOpenLegalData}
          onDelete={() => setIsDeleteDialogOpen(true)}
        />

        {/* ===== Main: workbench (+ pulse rail only on the overview tab) ===== */}
        <div className={cn('grid gap-4', activeTab === 'overview' && 'xl:grid-cols-[minmax(0,1fr)_360px]')}>
          {/* Workbench */}
          <div className="min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-[#E5EAF1] bg-white/90 px-1 py-2 shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)] backdrop-blur-md">
                <TabsList className="flex h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-xl bg-transparent p-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="relative gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 transition-all hover:bg-[#F6F8FB] data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white data-[state=active]:shadow-[0_8px_18px_-8px_rgba(34,199,161,0.6)]"
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                      {tab.badge > 0 && (
                        <span
                          className={cn(
                            'absolute -top-0.5 left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black',
                            tab.value === 'violations'
                              ? 'bg-[#FB6B7A] text-white'
                              : 'bg-[#F59E0B] text-[#452A03]',
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="mt-4 min-h-[480px]">
                {/* ===== Overview: AI summary + relationship glance ===== */}
                {activeTab === 'overview' && (
                  <div className="space-y-5">
                    <CustomerAISummary
                      customer={customer}
                      contracts={contracts}
                      invoices={customerInvoices}
                      payments={payments}
                      violations={trafficViolations}
                      activities={crmActivities}
                      scheduledFollowups={scheduledFollowups}
                      formatCurrency={formatCurrency}
                      onCreateContract={handleCreateContract}
                      onOpenCrm={handleOpenCrm}
                    />

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          label: 'قيمة العقود النشطة',
                          value: formatCurrency(activeContractsValue),
                          icon: FileText,
                          tone: 'teal' as const,
                          action: () => setActiveTab('contracts'),
                        },
                        {
                          label: 'آخر دفعة',
                          value: latestPayment ? formatCurrency(latestPayment.amount || 0) : '—',
                          hint: latestPayment?.payment_date,
                          icon: CreditCard,
                          tone: 'ink' as const,
                          action: () => setActiveTab('financial'),
                        },
                        {
                          label: 'آخر فاتورة',
                          value: latestInvoice
                            ? getInvoiceDisplayLabel(latestInvoice)
                            : '—',
                          hint: latestInvoice
                            ? [latestInvoice.invoice_number, latestInvoice.total_amount ? formatCurrency(latestInvoice.total_amount) : null]
                                .filter(Boolean)
                                .join(' · ')
                            : undefined,
                          icon: Wallet,
                          tone: 'ink' as const,
                          action: () => setActiveTab('financial'),
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.action}
                          className={cn(
                            'group rounded-2xl border bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                            item.tone === 'teal'
                              ? 'border-[#22C7A1]/25 hover:border-[#22C7A1]/50'
                              : 'border-[#E5EAF1] hover:border-slate-300',
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-lg',
                                item.tone === 'teal' ? 'bg-[#22C7A1]/10 text-[#0E9E7E]' : 'bg-[#F6F8FB] text-slate-500',
                              )}
                            >
                              <item.icon className="h-[18px] w-[18px]" />
                            </div>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
                          <p className="mt-1 truncate text-lg font-black text-[#0F172A]">{item.value}</p>
                          {item.hint && <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{item.hint}</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== Contracts + vehicles ===== */}
                {activeTab === 'contracts' && (
                  <div className="space-y-5">
                    {loadingContracts ? (
                      <TabLoadingState />
                    ) : (
                      <ContractsTab contracts={contracts} navigate={navigate} customerId={customerId || ''} />
                    )}
                    <div className="overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-sm">
                      <div className="flex items-center gap-2.5 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#38BDF8]/12 text-[#0369A1]">
                          <Car className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-black text-[#0F172A]">المركبات المرتبطة بالعقود النشطة</h3>
                      </div>
                      <div className="p-4">
                        {loadingContracts ? (
                          <TabLoadingState />
                        ) : (
                          <VehiclesTab contracts={contracts} navigate={navigate} />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== Financial: invoices + payments ===== */}
                {activeTab === 'financial' && (
                  <Tabs defaultValue="invoices" className="w-full">
                    <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-[#E5EAF1] bg-white p-1 shadow-sm">
                      <TabsTrigger
                        value="invoices"
                        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                      >
                        <Wallet className="h-4 w-4" />
                        الفواتير
                      </TabsTrigger>
                      <TabsTrigger
                        value="payments"
                        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                      >
                        <RefreshCw className="h-4 w-4" />
                        الدفعات
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="invoices" className="mt-4">
                      {loadingInvoices ? (
                        <TabLoadingState />
                      ) : (
                        <InvoicesTab
                          invoices={customerInvoices}
                          onInvoiceClick={(invoice) => {
                            setSelectedInvoice(invoice);
                            setIsInvoiceDialogOpen(true);
                          }}
                          violations={trafficViolations}
                          customerName={customerName}
                          customerPhone={customer.phone}
                          customerIdNumber={customer.national_id || undefined}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="payments" className="mt-4">
                      {loadingPayments ? (
                        <TabLoadingState />
                      ) : (
                        <PaymentsTab
                          payments={payments}
                          navigate={navigate}
                          onAddPayment={() => setIsPaymentDialogOpen(true)}
                          customerName={customerName}
                          customerPhone={customer.phone}
                          customerIdNumber={customer.national_id || undefined}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* ===== Violations ===== */}
                {activeTab === 'violations' && (
                  <ViolationsTab violations={trafficViolations} navigate={navigate} isLoading={loadingViolations} />
                )}

                {/* ===== Records: personal data + documents + activity ===== */}
                {activeTab === 'records' && (
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-[#E5EAF1] bg-white p-1 shadow-sm">
                      <TabsTrigger
                        value="info"
                        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                      >
                        <User className="h-4 w-4" />
                        البيانات الشخصية
                      </TabsTrigger>
                      <TabsTrigger
                        value="documents"
                        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                      >
                        <Folder className="h-4 w-4" />
                        المستندات
                      </TabsTrigger>
                      <TabsTrigger
                        value="activity"
                        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                      >
                        <RefreshCw className="h-4 w-4" />
                        النشاط والمتابعة
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="mt-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-sm">
                          <div className="border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
                            <h3 className="text-sm font-black text-[#0F172A]">البيانات الأساسية</h3>
                          </div>
                          <div className="p-4">
                            <PersonalInfoTab customer={customer} />
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-sm">
                          <div className="border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
                            <h3 className="text-sm font-black text-[#0F172A]">أرقام التواصل</h3>
                          </div>
                          <div className="p-4">
                            <PhoneNumbersTab customer={customer} />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="documents" className="mt-4">
                      <div className="rounded-2xl border border-[#E5EAF1] bg-white p-5 shadow-sm">
                        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <h3 className="text-base font-black text-[#0F172A]">مستندات العميل</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {documents.length} مستند محفوظ في ملف العميل
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="h-9 gap-2 rounded-xl bg-[#22C7A1] px-4 text-xs font-black text-white shadow-[0_8px_20px_-8px_rgba(34,199,161,0.6)] hover:bg-[#0E9E7E]"
                          >
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {isUploading ? 'جاري الرفع...' : 'رفع مستند'}
                          </Button>
                        </div>

                        {documents.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                            {documents.map((doc: CustomerDocument, index: number) => (
                              <DocumentCard key={doc.id} doc={doc} index={index} />
                            ))}
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {['صورة العميل', 'رخصة القيادة', 'الهوية الوطنية', 'عقد الإيجار'].map((placeholder, index) => (
                              <button
                                type="button"
                                key={index}
                                className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-[#B8C6D8] bg-[#F6F8FB] text-slate-400 transition-colors hover:border-[#22C7A1] hover:bg-[#ECFDF9] hover:text-[#0E9E7E]"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <FileImage className="mb-2 h-7 w-7" />
                                <p className="text-xs font-black">{placeholder}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-4">
                      <div className="space-y-5">
                        <div className="overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-sm">
                          <div className="flex items-center gap-2.5 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C83F6]/12 text-[#4F46E5]">
                              <Star className="h-4 w-4" />
                            </div>
                            <h3 className="text-sm font-black text-[#0F172A]">سجل المتابعة والملاحظات</h3>
                          </div>
                          <div className="p-4">
                            <NotesTab
                              customerId={customerId || ''}
                              customerPhone={customer.phone}
                              companyId={companyId || ''}
                            />
                          </div>
                        </div>
                        <ActivityTab
                          customerId={customerId || ''}
                          companyId={companyId || ''}
                          contracts={contracts}
                          payments={payments}
                          violations={trafficViolations}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </Tabs>
          </div>

          {/* Pulse rail — visible only on the overview tab */}
          {activeTab === 'overview' && (
            <CustomerPulse
              snapshot={snapshot}
              completion={completion}
              crmActivities={crmActivities}
              crmStats={crmStats}
              quickCrmNote={quickCrmNote}
              callStatus={quickCrmStatus}
              isSavingCall={isAddingCrmActivity}
              onCrmNoteChange={setQuickCrmNote}
              onCallStatusChange={setQuickCrmStatus}
              onSaveCall={handleSaveQuickCrmActivity}
              onEdit={handleEdit}
              onUploadDocument={() => fileInputRef.current?.click()}
              onOpenCrm={handleOpenCrm}
              onRenewContract={handleRenewContract}
            />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />

      {/* ===== Edit Dialog ===== */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-[#E5EAF1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#0F172A]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22C7A1]/10">
                <User className="h-4 w-4 text-[#0E9E7E]" />
              </div>
              تعديل بيانات العميل
            </DialogTitle>
          </DialogHeader>
          {customer && (
            <EnhancedCustomerForm
              mode="edit"
              editingCustomer={customer}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['customer-details-new', customerId, companyId] });
                setIsEditDialogOpen(false);
                toast({ title: 'تم التحديث بنجاح' });
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              context="standalone"
              integrationMode="dialog"
              showDuplicateCheck={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Payment Dialog ===== */}
      <UnifiedPaymentForm
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        type="customer_payment"
        customerId={customerId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['customer-payments-new', customerId, companyId] });
          queryClient.invalidateQueries({ queryKey: ['customer-invoices', customerId, companyId] });
          setIsPaymentDialogOpen(false);
          toast({ title: 'تم تسجيل الدفعة بنجاح' });
        }}
      />

      {/* ===== Invoice Preview Dialog ===== */}
      <InvoicePreviewDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        invoice={selectedInvoice}
        customerName={customerName}
      />

      {/* ===== Delete Confirmation Dialog ===== */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-[#E5EAF1]">
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FB6B7A]/10">
                <AlertTriangle className="h-6 w-6 text-[#FB6B7A]" />
              </div>
              <AlertDialogTitle className="text-xl font-black text-[#0F172A]">حذف العميل نهائياً</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-4">
                  <p className="mb-2 text-sm font-bold text-slate-600">هل أنت متأكد من حذف العميل:</p>
                  <p className="text-base font-black text-[#0F172A]">{customerName}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    رقم الهوية: {customer?.national_id || 'غير محدد'}
                  </p>
                </div>

                <div className="rounded-xl border border-[#FB6B7A]/25 bg-[#FFF5F6] p-4">
                  <p className="mb-2 text-sm font-black text-[#BE123C]">تحذير مهم:</p>
                  <ul className="list-inside space-y-1 text-xs font-semibold text-[#BE123C]">
                    <li>• سيتم حذف جميع بيانات العميل نهائياً</li>
                    <li>• لا يمكن التراجع عن هذا الإجراء</li>
                    <li>• سيتم الاحتفاظ بالعقود والفواتير المرتبطة (للأرشيف)</li>
                  </ul>
                </div>

                {(snapshot.activeContracts > 0 || snapshot.dueNowTotal > 0) && (
                  <div className="rounded-xl border border-[#F59E0B]/25 bg-[#FFFBEB] p-4">
                    <p className="mb-2 text-sm font-black text-[#B45309]">ملاحظات قبل الحذف:</p>
                    <ul className="space-y-1 text-xs font-semibold text-[#B45309]">
                      {snapshot.activeContracts > 0 && (
                        <li>
                          • يوجد <strong>{snapshot.activeContracts} عقود نشطة</strong> — يُفضل إلغاؤها أولاً
                        </li>
                      )}
                      {snapshot.dueNowTotal > 0 && (
                        <li>
                          • يوجد مبالغ مستحقة بقيمة <strong>{formatCurrency(snapshot.dueNowTotal)}</strong>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl font-bold">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="flex-1 rounded-xl bg-[#FB6B7A] font-black text-white hover:bg-[#E5484F]"
            >
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

const TabLoadingState = () => (
  <div className="flex h-32 items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
  </div>
);

export default CustomerDetailsPageNew;
