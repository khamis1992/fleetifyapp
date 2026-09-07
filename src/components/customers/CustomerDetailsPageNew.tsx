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

import {
  AlertCircle,
  AlertTriangle,
  Folder,
  Loader2,
  Upload,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
import { CustomerWorkspace, CustomerPanel, CustomerSearch } from './customer-workspace/CustomerWorkspace';
import { resolveCustomerSection, type CustomerSection } from './customer-workspace/navigation';
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

import { CustomerActionBar } from './customer-details-v3/CustomerActionBar';
import { CustomerPulse } from './customer-details-v3/CustomerPulse';
import {
  buildCustomerSnapshotV3,
  buildProfileCompletionV3,
} from './customer-details-v3/tokens';

// ===== Main Component =====
const CustomerDetailsPageNew = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();
  const queryClient = useQueryClient();
  const deleteCustomer = useDeleteCustomer();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // State
  const requestedTab = searchParams.get('tab');
  const activeTab = resolveCustomerSection(requestedTab);
  const [recordSearch, setRecordSearch] = useState('');
  const setActiveTab = useCallback((tab: CustomerSection) => {
    setSearchParams(current => { const next = new URLSearchParams(current); next.set('tab', tab); return next; });
  }, [setSearchParams]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [quickCrmNote, setQuickCrmNote] = useState('');
  const [quickCrmStatus, setQuickCrmStatus] = useState<'answered' | 'no_answer' | 'busy'>('answered');

  useEffect(() => { setRecordSearch(''); }, [requestedTab, customerId]);

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

  const { data: documents = [], isLoading: loadingDocuments, error: documentError } = useCustomerDocuments(customerId);
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
  const matchesSearch = (...values: unknown[]) => values.some(value => String(value ?? '').toLocaleLowerCase().includes(recordSearch.trim().toLocaleLowerCase()));
  const filteredContracts = contracts.filter(c => matchesSearch(c.contract_number, c.vehicle?.make, c.vehicle?.model, c.vehicle?.plate_number));
  const filteredInvoices = customerInvoices.filter(i => matchesSearch(i.invoice_number, getInvoiceDisplayLabel(i), i.contract?.contract_number));
  const filteredPayments = payments.filter(p => matchesSearch(p.payment_number, p.payment_method, p.amount));
  const filteredDocuments = documents.filter(d => matchesSearch(d.document_name, d.document_type));
  const filteredViolations = trafficViolations.filter(v => matchesSearch(v.violation_number, v.violation_type, v.vehicle?.plate_number));
  const isSummaryLoading = loadingContracts || loadingInvoices || loadingViolations;
  const uploadButton = <Button className="cw-primary gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
    {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}{isUploading ? 'جاري الرفع…' : 'رفع مستند'}
  </Button>;

  return (
    <>
      <CustomerWorkspace
        customer={customer} customerName={customerName} initials={initials} snapshot={snapshot} completion={completion}
        contractsCount={contracts.length} formatCurrency={formatCurrency} onBack={handleBack} onEdit={handleEdit}
        onCall={handleCall} onWhatsApp={handleWhatsApp} onOpenContracts={() => setActiveTab('contracts')}
        section={activeTab} onSectionChange={setActiveTab} onCreateContract={handleCreateContract}
        onAddPayment={() => setIsPaymentDialogOpen(true)} loadingSummary={isSummaryLoading}
        counts={{ contracts: contracts.length, vehicles: contracts.filter(c => c.status === 'active' && c.vehicle).length,
          invoices: customerInvoices.length, payments: payments.length, violations: trafficViolations.length, documents: documents.length }}
        actions={<CustomerActionBar snapshot={snapshot} formatCurrency={formatCurrency}
          onAddPayment={() => setIsPaymentDialogOpen(true)} onCreateContract={handleCreateContract}
          onUploadDocument={() => setActiveTab('documents')} onOpenCrm={handleOpenCrm}
          onOpenViolations={() => setActiveTab('violations')} onOpenFinancial={() => setActiveTab('invoices')}
          onOpenContracts={() => setActiveTab('contracts')} onRenewContract={handleRenewContract}
          onEdit={handleEdit} onPrint={handlePrint} onShare={handleShare} onOpenLegal={handleOpenLegal}
          onOpenLegalData={handleOpenLegalData} onDelete={() => setIsDeleteDialogOpen(true)}/>}
      >
        {activeTab === 'overview' && <div className="cw-overview-grid">
          <div className="cw-overview-main">
            <div className="cw-overview-intro">
              <div className="cw-eyebrow">العلاقة مع العميل</div>
              <h3>{isSummaryLoading ? 'جاري قراءة ملف العميل…' : snapshot.riskMeta.label}</h3>
              <p>{isSummaryLoading ? 'يتم تحميل العقود والبيانات المالية المرتبطة بالملف.' : snapshot.riskHelper}</p>
              <Button variant="outline" onClick={() => setActiveTab(snapshot.dueNowTotal > 0 ? 'invoices' : 'activity')}>{snapshot.dueNowTotal > 0 ? 'مراجعة المستحقات' : 'فتح سجل المتابعة'}</Button>
            </div>
            <CustomerPanel title="آخر العمليات" description="نقاط وصول سريعة إلى حركة حساب العميل">
              <div className="cw-recent-row"><div><p>العقود النشطة</p><strong>{loadingContracts ? '—' : formatCurrency(activeContractsValue)}</strong><p>القيمة الإجمالية للعقود النشطة</p></div><button onClick={() => setActiveTab('contracts')}>عرض العقود ←</button></div>
              <div className="cw-recent-row"><div><p>آخر دفعة</p><strong>{loadingPayments ? '—' : latestPayment ? formatCurrency(latestPayment.amount || 0) : 'لا توجد دفعات مسجلة'}</strong><p>{latestPayment?.payment_date}</p></div><button onClick={() => setActiveTab('payments')}>سجل الدفعات ←</button></div>
              <div className="cw-recent-row"><div><p>آخر فاتورة</p><strong>{loadingInvoices ? '—' : latestInvoice ? getInvoiceDisplayLabel(latestInvoice) : 'لا توجد فواتير مسجلة'}</strong><p>{latestInvoice?.invoice_number}</p></div><button onClick={() => setActiveTab('invoices')}>عرض الفواتير ←</button></div>
            </CustomerPanel>
            <details className="cw-panel"><summary className="cursor-pointer p-5 text-sm font-semibold">تحليل العلاقة وتوصيات المتابعة</summary><div className="p-4"><CustomerAISummary customer={customer} contracts={contracts} invoices={customerInvoices} payments={payments} violations={trafficViolations} activities={crmActivities} scheduledFollowups={scheduledFollowups} formatCurrency={formatCurrency} onCreateContract={handleCreateContract} onOpenCrm={handleOpenCrm}/></div></details>
          </div>
          <CustomerPulse snapshot={snapshot} completion={completion} crmActivities={crmActivities} crmStats={crmStats}
            quickCrmNote={quickCrmNote} callStatus={quickCrmStatus} isSavingCall={isAddingCrmActivity}
            onCrmNoteChange={setQuickCrmNote} onCallStatusChange={setQuickCrmStatus} onSaveCall={handleSaveQuickCrmActivity}
            onEdit={handleEdit} onUploadDocument={() => setActiveTab('documents')} onOpenCrm={handleOpenCrm} onRenewContract={handleRenewContract}/>
        </div>}
        {activeTab === 'info' && <div className="cw-info-grid"><MissingDataWarnings customer={customer}/><PersonalInfoTab customer={customer}/><PhoneNumbersTab customer={customer}/></div>}
        {['contracts', 'vehicles', 'invoices', 'payments', 'violations', 'documents'].includes(activeTab) && <CustomerSearch value={recordSearch} onChange={setRecordSearch} placeholder={activeTab === 'documents' ? 'ابحث باسم المستند…' : 'ابحث في سجلات هذا القسم…'}/>}
        {recordSearch && <p className="mb-4 text-xs text-slate-500" role="status">نتائج البحث عن «{recordSearch}» <button className="underline" onClick={() => setRecordSearch('')}>عرض جميع السجلات</button></p>}
        {activeTab === 'contracts' && (loadingContracts ? <TabLoadingState/> : <ContractsTab contracts={filteredContracts} navigate={navigate} customerId={customerId || ''}/>)}
        {activeTab === 'vehicles' && (loadingContracts ? <TabLoadingState/> : <VehiclesTab contracts={filteredContracts} navigate={navigate}/>)}
        {activeTab === 'invoices' && (loadingInvoices ? <TabLoadingState/> : <InvoicesTab isFiltered={!!recordSearch.trim()} invoices={filteredInvoices}
          onInvoiceClick={invoice => { setSelectedInvoice(invoice); setIsInvoiceDialogOpen(true); }} violations={trafficViolations}
          customerName={customerName} customerPhone={customer.phone} customerIdNumber={customer.national_id || undefined}/>)}
        {activeTab === 'payments' && (loadingPayments ? <TabLoadingState/> : <PaymentsTab isFiltered={!!recordSearch.trim()} payments={filteredPayments} navigate={navigate}
          onAddPayment={() => setIsPaymentDialogOpen(true)} customerName={customerName} customerPhone={customer.phone} customerIdNumber={customer.national_id || undefined}/>)}
        {activeTab === 'violations' && <ViolationsTab violations={filteredViolations} navigate={navigate} isLoading={loadingViolations}/>}
        {activeTab === 'documents' && <CustomerPanel title="مكتبة المستندات" description={documents.length + ' مستند في ملف العميل'} action={uploadButton}>
          {loadingDocuments ? <TabLoadingState/> : documentError ? <p role="alert">تعذر تحميل المستندات. أعد المحاولة بتحديث الصفحة.</p> : filteredDocuments.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredDocuments.map((doc: CustomerDocument, index) => <DocumentCard key={doc.id} doc={doc} index={index}/>)}</div> :
            <div className="cw-empty"><Folder className="h-10 w-10"/><h3>{recordSearch ? 'لا توجد مستندات مطابقة' : 'ابدأ بتنظيم وثائق العميل'}</h3><p>{recordSearch ? 'جرّب اسماً آخر أو امسح البحث لعرض كل الملفات.' : 'أضف الهوية أو رخصة القيادة أو المستندات الداعمة للوصول إليها من ملف العميل.'}</p>{!recordSearch && uploadButton}</div>}
          <p className="cw-document-help">PDF، صور JPG وPNG، أو مستندات Word · الحد الأقصى 10 ميجابايت لكل ملف</p>
        </CustomerPanel>}
        {activeTab === 'activity' && <div className="space-y-5"><CustomerPanel title="التواصل والملاحظات" action={<Button variant="outline" onClick={handleOpenCrm}>فتح إدارة العلاقات</Button>}>
          <NotesTab customerId={customerId || ''} customerPhone={customer.phone} companyId={companyId || ''}/>
          </CustomerPanel><CustomerPanel title="التسلسل الزمني للعمليات"><ActivityTab customerId={customerId || ''} companyId={companyId || ''} contracts={contracts} payments={payments} violations={trafficViolations}/></CustomerPanel></div>}
      </CustomerWorkspace>

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
    </>
  );
};

const TabLoadingState = () => (
  <div className="flex h-32 items-center justify-center gap-3" role="status" aria-label="جاري تحميل بيانات القسم">
    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
  </div>
);

export default CustomerDetailsPageNew;
