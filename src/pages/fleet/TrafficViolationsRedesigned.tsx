import React, { useEffect, useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  FileWarning, 
  Trash2, 
  FileText, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Car,
  User,
  Calendar,
  Printer,
  ChevronDown,
  MessageSquare,
  Eye,
  CreditCard,
  Edit,
  Upload,
  List,
  Gavel,
  RefreshCw,
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  ReceiptText,
  Send,
  Filter,
  MoreHorizontal,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useTrafficViolations, TrafficViolation, useDeleteTrafficViolation, useDeleteAllTrafficViolations, useUpdatePaymentStatus, useTrafficViolationsStats } from '@/hooks/useTrafficViolations';
import { useRelinkViolations } from '@/hooks/useRelinkViolations';
import { TrafficViolationsSmartDashboard } from '@/components/fleet/TrafficViolationsSmartDashboard';
import { TrafficViolationsAlertsPanel } from '@/components/fleet/TrafficViolationsAlertsPanel';
import { TrafficViolationSidePanel } from '@/components/fleet/TrafficViolationSidePanel';
import { TrafficViolationReportDialog } from '@/components/fleet/TrafficViolationReportDialog';
import { TrafficViolationReminderDialog } from '@/components/fleet/TrafficViolationReminderDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';

// Lazy load heavy components for better performance
const TrafficViolationForm = lazy(() =>
  import('@/components/fleet/TrafficViolationForm').then(m => ({ default: m.TrafficViolationForm }))
);
const TrafficViolationPaymentsDialog = lazy(() =>
  import('@/components/fleet/TrafficViolationPaymentsDialog').then(m => ({ default: m.TrafficViolationPaymentsDialog }))
);
const TrafficViolationPDFImport = lazy(() =>
  import('@/components/fleet/TrafficViolationPDFImport').then(m => ({ default: m.TrafficViolationPDFImport }))
);

export default function TrafficViolationsRedesigned() {
  const navigate = useNavigate();
  const violationTheme = systemColorPattern.colors;
  
  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [filterCar, setFilterCar] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<TrafficViolation | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<TrafficViolation | null>(null);
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isRelinkDialogOpen, setIsRelinkDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [selectedViolationsForReminder, setSelectedViolationsForReminder] = useState<TrafficViolation[]>([]);
  
  // Data Fetching - Reduced limit for better performance (was 10000!)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const isServerFilteringActive =
    searchTerm.trim().length > 0 ||
    filterStatus !== 'all' ||
    filterPaymentStatus !== 'all' ||
    filterCar !== 'all' ||
    filterCustomer !== 'all';

  // When switching filters/search, reset pagination to the first page
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPaymentStatus, filterCar, filterCustomer]);

  const { data: violations = [], isLoading, refetch } = useTrafficViolations({
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    enabled: !isServerFilteringActive
  });
  const { data: allViolationStats } = useTrafficViolationsStats();
  const { data: vehicles = [] } = useVehicles({ limit: 500 });

  // When search/filters are active, fetch matching violations server-side
  const { data: serverFilteredViolations = [], isLoading: isLoadingServerFiltered } = useQuery({
    queryKey: [
      'traffic-violations-server-filtered',
      searchTerm,
      filterStatus,
      filterPaymentStatus,
      filterCar,
      filterCustomer,
    ],
    enabled: isServerFilteringActive,
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile?.company_id) return [];

      const rawTerm = searchTerm.trim();
      const termNoHash = rawTerm.replace(/^#/, '');
      const termDigits = rawTerm.replace(/\D/g, '');
      const safeTerm = termNoHash.replace(/[(),]/g, ' ').trim();
      const safeDigits = termDigits.replace(/[(),]/g, ' ').trim();
      const relatedCustomerIds = new Set<string>();
      const relatedContractIds = new Set<string>();

      if (safeTerm.length > 0 || safeDigits.length > 0) {
        const customerSearchParts: string[] = [];
        const contractSearchParts: string[] = [];
        const addRelatedSearchTerm = (term: string) => {
          if (!term) return;
          customerSearchParts.push(`first_name.ilike.%${term}%`);
          customerSearchParts.push(`last_name.ilike.%${term}%`);
          customerSearchParts.push(`company_name.ilike.%${term}%`);
          customerSearchParts.push(`phone.ilike.%${term}%`);
          contractSearchParts.push(`contract_number.ilike.%${term}%`);
        };

        addRelatedSearchTerm(safeTerm);
        if (safeDigits && safeDigits !== safeTerm) addRelatedSearchTerm(safeDigits);

        if (customerSearchParts.length > 0) {
          const { data: customersMatches } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', profile.company_id)
            .or(customerSearchParts.join(','))
            .limit(100);
          (customersMatches || []).forEach((customer) => relatedCustomerIds.add(customer.id));
        }

        if (contractSearchParts.length > 0) {
          const { data: contractMatches } = await supabase
            .from('contracts')
            .select('id, customer_id')
            .eq('company_id', profile.company_id)
            .or(contractSearchParts.join(','))
            .limit(100);
          (contractMatches || []).forEach((contract) => {
            relatedContractIds.add(contract.id);
            if (contract.customer_id) relatedCustomerIds.add(contract.customer_id);
          });
        }
      }

      let query = supabase
        .from('penalties')
        .select(
          `
            id,
            penalty_number,
            violation_type,
            penalty_date,
            amount,
            location,
            vehicle_plate,
            vehicle_id,
            reason,
            notes,
            status,
            payment_status,
            customer_id,
            contract_id,
            created_at,
            updated_at,
            vehicles (
              id,
              plate_number,
              make,
              model,
              year,
              registration_expiry
            ),
            customers (
              id,
              first_name,
              last_name,
              company_name,
              phone
            ),
            contracts (
              id,
              contract_number,
              status,
              start_date,
              end_date,
              customer_id,
              customers (
                id,
                first_name,
                last_name,
                company_name,
                phone
              )
            )
          `
        )
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterPaymentStatus !== 'all') {
        query = query.eq('payment_status', filterPaymentStatus);
      }
      if (filterCustomer !== 'all') {
        query = query.eq('customer_id', filterCustomer);
      }
      if (filterCar !== 'all') {
        // allow both vehicle_id and raw plate number selection
        const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(filterCar);
        query = looksLikeUuid
          ? query.or(`vehicle_id.eq.${filterCar},vehicle_plate.eq.${filterCar}`)
          : query.eq('vehicle_plate', filterCar);
      }

      if (safeTerm.length > 0 || safeDigits.length > 0) {
        const orParts: string[] = [];
        const addTerm = (t: string) => {
          if (!t) return;
          orParts.push(`penalty_number.ilike.%${t}%`);
          orParts.push(`vehicle_plate.ilike.%${t}%`);
          orParts.push(`violation_type.ilike.%${t}%`);
          orParts.push(`reason.ilike.%${t}%`);
          orParts.push(`location.ilike.%${t}%`);
        };
        addTerm(safeTerm);
        if (safeDigits && safeDigits !== safeTerm) addTerm(safeDigits);
        if (relatedCustomerIds.size > 0) {
          orParts.push(`customer_id.in.(${Array.from(relatedCustomerIds).join(',')})`);
        }
        if (relatedContractIds.size > 0) {
          orParts.push(`contract_id.in.(${Array.from(relatedContractIds).join(',')})`);
        }
        query = query.or(orParts.join(','));
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 60 * 1000,
  });

  // Fetch total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['traffic-violations-count'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return 0;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile?.company_id) return 0;

      const { count } = await supabase
        .from('penalties')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const deleteViolationMutation = useDeleteTrafficViolation();
  const deleteAllViolationsMutation = useDeleteAllTrafficViolations();
  const updatePaymentStatusMutation = useUpdatePaymentStatus();
  const { formatCurrency } = useCurrencyFormatter();
  const { relinkViolations, isProcessing: isRelinking, progress: relinkProgress, result: relinkResult, resetResult: resetRelinkResult } = useRelinkViolations();

  // Fetch customers for filter
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name')
        .eq('is_active', true)
        .order('first_name')
        .limit(200);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isAnyLoading = isLoading || (isServerFilteringActive && isLoadingServerFiltered);

  // Helper Functions
  const getCarName = useCallback((violation: TrafficViolation) => {
    if (violation.vehicles) {
      return `${violation.vehicles.make} ${violation.vehicles.model} (${violation.vehicles.plate_number})`;
    }
    if (violation.vehicle_plate) {
      return violation.vehicle_plate;
    }
    return 'غير معروف';
  }, []);
  
  const getCustomerName = useCallback((violation: TrafficViolation) => {
    if (violation.customers) {
      const fullName = `${violation.customers.first_name || ''} ${violation.customers.last_name || ''}`.trim();
      return fullName || violation.customers.company_name || 'غير محدد';
    }
    if (violation.contracts?.customers) {
      const fullName = `${violation.contracts.customers.first_name || ''} ${violation.contracts.customers.last_name || ''}`.trim();
      return fullName || violation.contracts.customers.company_name || 'غير محدد';
    }
    return 'غير محدد';
  }, []);

  const sourceViolations = isServerFilteringActive ? serverFilteredViolations : violations;

  // Filtering Logic
  const filteredViolations = useMemo(() => {
    return sourceViolations.filter(v => {
      const matchesSearch = 
        v.penalty_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        getCarName(v).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCustomerName(v).toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.violation_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
      const matchesPaymentStatus = filterPaymentStatus === 'all' || v.payment_status === filterPaymentStatus;
      const matchesCar = filterCar === 'all' || v.vehicle_id === filterCar || v.vehicle_plate === filterCar;
      const matchesCustomer = filterCustomer === 'all' || v.customer_id === filterCustomer;

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesCar && matchesCustomer;
    });
  }, [sourceViolations, searchTerm, filterStatus, filterPaymentStatus, filterCar, filterCustomer, getCarName, getCustomerName]);

  const violationInsights = useMemo(() => {
    const unpaid = sourceViolations.filter(v => v.payment_status === 'unpaid');
    const partial = sourceViolations.filter(v => v.payment_status === 'partially_paid');
    const paid = sourceViolations.filter(v => v.payment_status === 'paid');
    const unlinked = sourceViolations.filter(v => !v.customer_id || !v.contract_id);
    const unpaidAmount = [...unpaid, ...partial].reduce((sum, v) => sum + Number(v.amount || 0), 0);
    const totalAmount = sourceViolations.reduce((sum, v) => sum + Number(v.amount || 0), 0);

    const currentViewInsights = {
      total: sourceViolations.length,
      shown: filteredViolations.length,
      unpaid: unpaid.length,
      partial: partial.length,
      paid: paid.length,
      unlinked: unlinked.length,
      unpaidAmount,
      totalAmount,
      collectionRate: sourceViolations.length ? Math.round((paid.length / sourceViolations.length) * 100) : 0,
    };

    if (!isServerFilteringActive && allViolationStats) {
      return {
        total: allViolationStats.total,
        shown: filteredViolations.length,
        unpaid: allViolationStats.unpaidCount,
        partial: allViolationStats.partiallyPaidCount,
        paid: allViolationStats.paidCount,
        unlinked: allViolationStats.unlinkedCount,
        unpaidAmount: allViolationStats.unpaidAmount,
        totalAmount: allViolationStats.totalAmount,
        collectionRate: allViolationStats.collectionRate,
      };
    }

    return currentViewInsights;
  }, [allViolationStats, filteredViolations.length, isServerFilteringActive, sourceViolations]);

  // Handlers
  const handleOpenModal = useCallback((violation: TrafficViolation | null = null) => {
    setModalData(violation);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) {
      try {
        await deleteViolationMutation.mutateAsync(id);
        toast.success('تم حذف المخالفة بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف المخالفة');
      }
    }
  }, [deleteViolationMutation]);

  const handleDeleteAllViolations = useCallback(async () => {
    if (deleteAllConfirmText.trim() !== 'حذف') return;

    try {
      await deleteAllViolationsMutation.mutateAsync();
      setIsDeleteAllDialogOpen(false);
      setDeleteAllConfirmText('');
      setCurrentPage(1);
      setFilterStatus('all');
      setFilterPaymentStatus('all');
      setFilterCar('all');
      setFilterCustomer('all');
      setSearchTerm('');
      await refetch();
    } catch (error) {
      console.error('Failed to delete all traffic violations:', error);
    }
  }, [deleteAllConfirmText, deleteAllViolationsMutation, refetch]);

  const handleMarkAsPaid = useCallback(async (violation: TrafficViolation) => {
    try {
      await updatePaymentStatusMutation.mutateAsync({
        id: violation.id,
        paymentStatus: 'paid'
      });
      toast.success('تم تحديث حالة الدفع بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث حالة الدفع');
    }
  }, [updatePaymentStatusMutation]);

  const handleOpenReportDialog = useCallback(() => {
    setIsReportDialogOpen(true);
  }, []);

  const handleOpenSidePanel = useCallback((violation: TrafficViolation) => {
    setSelectedViolation(violation);
    setIsSidePanelOpen(true);
  }, []);

  const handleNavigateToVehicle = useCallback((vehicleId: string) => {
    if (vehicleId) {
      navigate(`/fleet/vehicles/${vehicleId}`);
    }
  }, [navigate]);

  const handleNavigateToCustomer = useCallback((customerId: string) => {
    if (customerId) {
      navigate(`/customers/${customerId}`);
    }
  }, [navigate]);

  const handleNavigateToContract = useCallback((contractId: string) => {
    if (contractId) {
      navigate(`/contracts/${contractId}`);
    }
  }, [navigate]);

  const handleFilterByStatus = useCallback((status: string) => {
    if (status === 'unpaid' || status === 'paid' || status === 'partially_paid') {
      setFilterPaymentStatus(status);
    } else {
      setFilterStatus(status);
    }
  }, []);

  const handleEscalateToLegal = useCallback((violation: TrafficViolation) => {
    // Navigate to legal cases with pre-filled data
    navigate('/legal/cases', { 
      state: { 
        prefillData: {
          customer_id: violation.customer_id,
          violation_id: violation.id,
          amount: violation.amount
        }
      }
    });
    toast.info('جاري التحويل للشؤون القانونية...');
  }, [navigate]);

  // فتح نافذة إرسال تذكير للمخالفات غير المسددة
  const handleOpenReminderDialog = useCallback(() => {
    // جمع المخالفات غير المسددة
    const unpaidViolations = filteredViolations.filter(v => 
      v.payment_status === 'unpaid' || v.payment_status === 'partially_paid'
    );
    
    if (unpaidViolations.length === 0) {
      toast.error('لا توجد مخالفات غير مسددة');
      return;
    }
    
    setSelectedViolationsForReminder(unpaidViolations);
    setIsReminderDialogOpen(true);
  }, [filteredViolations]);

  // إرسال تذكير لمخالفة محددة
  const handleSendReminderForViolation = useCallback((violation: TrafficViolation) => {
    setSelectedViolationsForReminder([violation]);
    setIsReminderDialogOpen(true);
  }, []);

  if (isAnyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="traffic-violations-system min-h-screen bg-[#F6F8FB] font-sans text-[#020617]"
      dir="rtl"
      style={{
        '--tv-text': violationTheme.text,
        '--tv-surface': violationTheme.surface,
        '--tv-inner': violationTheme.innerSurface,
        '--tv-muted': violationTheme.secondaryText,
        '--tv-border': violationTheme.border,
        '--tv-info': violationTheme.info,
        '--tv-alert': violationTheme.alert,
        '--tv-focus': violationTheme.focus,
        '--tv-success': violationTheme.success,
      } as React.CSSProperties}
    >
      
      {/* Side Panel */}
      <TrafficViolationSidePanel
        violation={selectedViolation}
        open={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        onAddPayment={(violation) => {
          setSelectedViolation(violation);
          setIsSidePanelOpen(false);
          setIsPaymentsDialogOpen(true);
        }}
        onEscalateToLegal={handleEscalateToLegal}
      />

      {/* Payments Dialog */}
      <Suspense fallback={<LoadingSpinner size="sm" />}>
        <TrafficViolationPaymentsDialog
          violation={selectedViolation}
          open={isPaymentsDialogOpen}
          onOpenChange={setIsPaymentsDialogOpen}
        />
      </Suspense>

      {/* Report Customization Dialog */}
      <TrafficViolationReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        violations={violations}
      />

      {/* Reminder Dialog */}
      <TrafficViolationReminderDialog
        open={isReminderDialogOpen}
        onOpenChange={setIsReminderDialogOpen}
        violations={selectedViolationsForReminder}
        onSuccess={() => refetch()}
      />

      <Dialog
        open={isDeleteAllDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteAllDialogOpen(open);
          if (!open) setDeleteAllConfirmText('');
        }}
      >
        <DialogContent className="max-w-lg rounded-[8px] border-[#FFD5DC]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#FB6B7A]">
              <AlertTriangle className="h-5 w-5" />
              حذف جميع المخالفات المرورية
            </DialogTitle>
            <DialogDescription className="text-right leading-7">
              سيتم حذف كل المخالفات المرورية المسجلة للشركة الحالية وعددها{' '}
              <span className="font-black text-[#020617]">{totalCount.toLocaleString('en-US')}</span>{' '}
              مخالفة. هذا الإجراء نهائي ولا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-[8px] border border-[#FFD5DC] bg-[#FFF7F8] p-4">
            <p className="text-sm font-bold text-[#102B4E]">
              للتأكيد اكتب كلمة <span className="font-black text-[#FB6B7A]">حذف</span> في الحقل التالي.
            </p>
            <input
              value={deleteAllConfirmText}
              onChange={(event) => setDeleteAllConfirmText(event.target.value)}
              className="h-11 w-full rounded-[8px] border border-[#FFD5DC] bg-white px-3 text-sm font-black text-[#020617] outline-none focus:border-[#FB6B7A]"
              placeholder="اكتب حذف"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteAllDialogOpen(false);
                setDeleteAllConfirmText('');
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllViolations}
              disabled={deleteAllConfirmText.trim() !== 'حذف' || deleteAllViolationsMutation.isPending}
            >
              {deleteAllViolationsMutation.isPending ? 'جاري الحذف...' : 'حذف جميع المخالفات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relink Violations Dialog */}
      <Dialog open={isRelinkDialogOpen} onOpenChange={(open) => {
        setIsRelinkDialogOpen(open);
        if (!open) resetRelinkResult();
      }}>
        <DialogContent className="traffic-violations-dialog max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-orange-600" />
              إعادة ربط المخالفات بالعملاء
            </DialogTitle>
            <DialogDescription>
              سيتم البحث عن العقود المناسبة لكل مخالفة غير مربوطة وربطها بالعميل تلقائياً
            </DialogDescription>
          </DialogHeader>

          {!relinkResult && !isRelinking && (
            <div className="py-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h4 className="font-semibold text-orange-800 mb-2">كيف تعمل هذه الميزة؟</h4>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>البحث عن جميع المخالفات غير المربوطة بعملاء</li>
                  <li>مطابقة كل مخالفة مع العقود بناءً على رقم اللوحة وتاريخ المخالفة</li>
                  <li>ربط المخالفة بالعميل صاحب العقد المناسب</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-2">خوارزمية المطابقة (4 مستويات):</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li><strong>ثقة عالية:</strong> عقد نشط + تاريخ المخالفة ضمن فترة العقد</li>
                  <li><strong>ثقة متوسطة:</strong> أي عقد (حتى منتهي) + تاريخ ضمن فترته</li>
                  <li><strong>ثقة منخفضة:</strong> أقرب عقد انتهى قبل المخالفة (خلال 30 يوم)</li>
                  <li><strong>آخر خيار:</strong> أحدث عقد متوفر للمركبة</li>
                </ol>
              </div>
            </div>
          )}

          {isRelinking && (
            <div className="py-8 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-orange-600 animate-spin" />
                <span className="text-lg font-medium">جاري معالجة المخالفات...</span>
              </div>
              <Progress value={relinkProgress} className="h-3" />
              <p className="text-center text-sm text-neutral-500">{relinkProgress}% مكتمل</p>
            </div>
          )}

          {relinkResult && (
            <div className="py-4 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-slate-700">{relinkResult.totalUnlinked}</div>
                  <div className="text-xs text-slate-500">إجمالي غير المربوطة</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{relinkResult.linked}</div>
                  <div className="text-xs text-green-600">تم ربطها</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{relinkResult.noContractFound}</div>
                  <div className="text-xs text-amber-600">بدون عقد</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{relinkResult.failed}</div>
                  <div className="text-xs text-red-600">فشل</div>
                </div>
              </div>

              {/* Success Rate */}
              {relinkResult.totalUnlinked > 0 && (
                <div className="bg-gradient-to-r from-teal-50 to-green-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-teal-600">
                    {Math.round((relinkResult.linked / relinkResult.totalUnlinked) * 100)}%
                  </div>
                  <div className="text-sm text-teal-700">نسبة النجاح</div>
                </div>
              )}

              {/* Details List */}
              {relinkResult.details.length > 0 && (
                <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-right">رقم المخالفة</th>
                        <th className="px-3 py-2 text-right">اللوحة</th>
                        <th className="px-3 py-2 text-right">الحالة</th>
                        <th className="px-3 py-2 text-right">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {relinkResult.details.slice(0, 50).map((detail, idx) => (
                        <tr key={idx} className={
                          detail.status === 'linked' ? 'bg-green-50/50' :
                          detail.status === 'no_contract' || detail.status === 'no_vehicle' ? 'bg-amber-50/50' :
                          'bg-red-50/50'
                        }>
                          <td className="px-3 py-2 font-mono text-xs">{detail.penaltyNumber}</td>
                          <td className="px-3 py-2">{detail.vehiclePlate}</td>
                          <td className="px-3 py-2">
                            {detail.status === 'linked' && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <CheckCircle2 className="w-3 h-3 ml-1" />
                                تم الربط
                              </Badge>
                            )}
                            {(detail.status === 'no_contract' || detail.status === 'no_vehicle') && (
                              <Badge className="bg-amber-100 text-amber-700 text-xs">
                                <AlertTriangle className="w-3 h-3 ml-1" />
                                لا يوجد عقد
                              </Badge>
                            )}
                            {detail.status === 'error' && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                <XCircle className="w-3 h-3 ml-1" />
                                خطأ
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-neutral-600">
                            {detail.status === 'linked' ? (
                              <span>
                                {detail.customerName} 
                                <span className="text-neutral-400 mx-1">•</span>
                                <span className={
                                  detail.confidence === 'high' ? 'text-green-600' :
                                  detail.confidence === 'medium' ? 'text-amber-600' :
                                  'text-red-600'
                                }>
                                  {detail.confidence === 'high' ? 'ثقة عالية' :
                                   detail.confidence === 'medium' ? 'ثقة متوسطة' :
                                   'ثقة منخفضة'}
                                </span>
                              </span>
                            ) : detail.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {relinkResult.details.length > 50 && (
                    <div className="bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
                      عرض أول 50 نتيجة من {relinkResult.details.length}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {!relinkResult && !isRelinking && (
              <>
                <Button variant="outline" onClick={() => setIsRelinkDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button 
                  onClick={() => relinkViolations()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Link2 className="w-4 h-4 ml-2" />
                  بدء إعادة الربط
                </Button>
              </>
            )}
            {relinkResult && (
              <Button onClick={() => {
                setIsRelinkDialogOpen(false);
                resetRelinkResult();
                refetch();
              }}>
                إغلاق
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="traffic-command-bar sticky top-0 z-30 border-b border-[#DDE5EF] bg-white/95 px-4 py-4 shadow-[0_16px_42px_-34px_rgba(15,23,42,.72)] backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[#102B4E] text-white">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-black">
                <span className="rounded-full bg-[#EAF8FE] px-3 py-1 text-[#38BDF8]">مركز المخالفات</span>
                <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-[#22C7A1]">{violationInsights.collectionRate}% محصل</span>
                {violationInsights.unlinked > 0 && (
                  <span className="rounded-full bg-[#FFF0F2] px-3 py-1 text-[#FB6B7A]">{violationInsights.unlinked} تحتاج ربط</span>
                )}
              </div>
              <h1 className="truncate text-2xl font-black text-[#020617]">إدارة المخالفات المرورية</h1>
              <p className="text-sm font-bold text-[#64748B]">متابعة المخالفات، ربطها بالعقود والعملاء، وتحصيل المدفوعات من شاشة تشغيل واحدة.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} className="h-11 rounded-[8px] border-[#DDE5EF] font-black">
              <RefreshCw className="ml-2 h-4 w-4" />
              تحديث
            </Button>
            <Button variant="outline" onClick={handleOpenReminderDialog} className="h-11 rounded-[8px] border-[#DDE5EF] font-black text-[#38BDF8]">
              <Send className="ml-2 h-4 w-4" />
              تذكير
            </Button>
            <Button variant="outline" onClick={handleOpenReportDialog} className="h-11 rounded-[8px] border-[#DDE5EF] font-black">
              <Printer className="ml-2 h-4 w-4" />
              تقرير
            </Button>
            <Button variant="outline" onClick={() => setIsRelinkDialogOpen(true)} className="h-11 rounded-[8px] border-[#DDE5EF] font-black text-[#FB6B7A]">
              <Link2 className="ml-2 h-4 w-4" />
              ربط المخالفات
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteAllDialogOpen(true)}
              disabled={totalCount === 0 || deleteAllViolationsMutation.isPending}
              className="h-11 rounded-[8px] border-[#FFD5DC] bg-[#FFF0F2] font-black text-[#FB6B7A] hover:bg-[#FFE3E8] hover:text-[#E84F61]"
            >
              <Trash2 className="ml-2 h-4 w-4" />
              حذف جميع المخالفات
            </Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenModal(null)} className="h-11 rounded-[8px] bg-[#22C7A1] px-4 font-black text-white hover:bg-[#1DAE8D]">
                  <Plus className="ml-2 h-5 w-5" />
                  تسجيل مخالفة
                </Button>
              </DialogTrigger>
              <DialogContent className="traffic-violations-dialog max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{modalData ? 'تعديل المخالفة' : 'تسجيل مخالفة جديدة'}</DialogTitle>
                </DialogHeader>
                <Suspense fallback={<LoadingSpinner size="sm" />}>
                  <TrafficViolationForm 
                    violation={modalData} 
                    onSuccess={() => {
                      setIsModalOpen(false);
                      refetch();
                    }} 
                  />
                </Suspense>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* --- Top Navbar --- */}
      <header className="hidden bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 shadow-sm flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-teal-500 p-2.5 rounded-xl shadow-sm">
            <FileWarning className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">إدارة المخالفات المرورية</h1>
            <p className="text-xs text-neutral-500">نظام تتبع وإدارة غرامات المركبات</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="border-slate-200 hover:bg-slate-50 rounded-xl hover:border-teal-500/50"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            <span className="hidden md:inline">تحديث</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenReminderDialog}
            className="border-amber-200/50 hover:bg-amber-50 rounded-xl hover:border-amber-500/30 text-amber-700"
          >
            <MessageSquare className="w-4 h-4 ml-2" />
            <span className="hidden md:inline">إرسال تذكير</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenReportDialog}
            className="border-slate-200 hover:bg-slate-50 rounded-xl hover:border-teal-500/50"
          >
            <Printer className="w-4 h-4 ml-2" />
            <span className="hidden md:inline">طباعة التقرير</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsRelinkDialogOpen(true)}
            className="border-orange-200/50 hover:bg-orange-50 rounded-xl hover:border-orange-500/30 text-orange-700"
          >
            <User className="w-4 h-4 ml-2" />
            <span className="hidden md:inline">ربط المخالفات</span>
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenModal(null)}
                className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-sm"
              >
                <Plus className="w-5 h-5 ml-2" />
                تسجيل مخالفة
              </Button>
            </DialogTrigger>
            <DialogContent className="traffic-violations-dialog max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{modalData ? 'تعديل المخالفة' : 'تسجيل مخالفة جديدة'}</DialogTitle>
              </DialogHeader>
              <Suspense fallback={<LoadingSpinner size="sm" />}>
                <TrafficViolationForm 
                  violation={modalData} 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    refetch();
                  }} 
                />
              </Suspense>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:block p-8 border-b border-slate-200 text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">تقرير المخالفات المرورية</h1>
        <p className="text-slate-500 text-sm">تاريخ التقرير: {new Date().toLocaleDateString('en-US')}</p>
      </div>

      <main className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 print:max-w-none print:p-0">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 print:hidden">
          {[
            {
              label: 'إجمالي السجل',
              value: violationInsights.total.toLocaleString('en-US'),
              caption: isServerFilteringActive
                ? `${violationInsights.shown.toLocaleString('en-US')} ضمن الفلتر`
                : `إجمالي قيمة المخالفات: ${formatCurrency(violationInsights.totalAmount)}`,
              icon: ReceiptText,
              tone: 'neutral'
            },
            { label: 'غير مسددة', value: violationInsights.unpaid.toLocaleString('en-US'), caption: formatCurrency(violationInsights.unpaidAmount), icon: AlertTriangle, tone: 'alert' },
            { label: 'سداد جزئي', value: violationInsights.partial.toLocaleString('en-US'), caption: 'تحتاج متابعة تحصيل', icon: CreditCard, tone: 'info' },
            { label: 'مسددة', value: violationInsights.paid.toLocaleString('en-US'), caption: `${violationInsights.collectionRate}% من السجل`, icon: CheckCircle, tone: 'success' },
            { label: 'غير مرتبطة', value: violationInsights.unlinked.toLocaleString('en-US'), caption: 'عميل أو عقد ناقص', icon: Link2, tone: 'focus' },
          ].map((metric) => {
            const Icon = metric.icon;
            const toneClass =
              metric.tone === 'alert' ? 'bg-[#FFF0F2] text-[#FB6B7A]' :
              metric.tone === 'success' ? 'bg-[#E8FBF6] text-[#22C7A1]' :
              metric.tone === 'info' ? 'bg-[#EAF8FE] text-[#38BDF8]' :
              metric.tone === 'focus' ? 'bg-[#ECEEFE] text-[#7C83F6]' :
              'bg-[#F6F8FB] text-[#64748B]';
            return (
              <div key={metric.label} className="rounded-[8px] border border-[#DDE5EF] bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-[#94A3B8]">{metric.label}</p>
                    <p className="mt-2 text-2xl font-black text-[#020617]">{metric.value}</p>
                    <p className="mt-1 text-xs font-bold text-[#64748B]">{metric.caption}</p>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] ${toneClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <Tabs defaultValue="list" className="space-y-5">
          <div className="flex rounded-[8px] border border-[#DDE5EF] bg-white p-3 shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)] print:hidden">
            <TabsList className="h-auto justify-start gap-1 bg-[#F6F8FB] p-1">
              <TabsTrigger value="list" className="gap-2 rounded-[8px] px-4 py-2.5 font-black data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white">
                <List className="h-4 w-4" />
                سجل المخالفات
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2 rounded-[8px] px-4 py-2.5 font-black data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white">
                <Upload className="h-4 w-4" />
                استيراد ملف
              </TabsTrigger>
            </TabsList>

          </div>

          <TabsContent value="list" className="mt-0 space-y-5">
            <section className="rounded-[8px] border border-[#DDE5EF] bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)] print:hidden">
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#38BDF8]" />
                <h2 className="text-base font-black text-[#020617]">البحث والتصفية</h2>
              </div>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_360px]">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="ابحث برقم المخالفة، اللوحة، العميل، العقد، الموقع..."
                    className="h-12 w-full rounded-[8px] border border-[#DDE5EF] bg-[#F8FAFC] pr-12 text-sm font-bold outline-none transition focus:border-[#22C7A1]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Car className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <select value={filterCar} onChange={(e) => setFilterCar(e.target.value)} className="h-12 w-full appearance-none rounded-[8px] border border-[#DDE5EF] bg-white pr-9 pl-8 text-sm font-bold outline-none">
                    <option value="all">كل المركبات</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.make} {v.model} - {v.plate_number}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                </div>

                <div className="relative">
                  <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="h-12 w-full appearance-none rounded-[8px] border border-[#DDE5EF] bg-white pr-9 pl-8 text-sm font-bold outline-none">
                    <option value="all">كل العملاء</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                </div>

                <div className="grid grid-cols-4 gap-1 rounded-[8px] bg-[#F6F8FB] p-1">
                  {[
                    { value: 'all', label: 'الكل' },
                    { value: 'paid', label: 'مسدد' },
                    { value: 'unpaid', label: 'غير مسدد' },
                    { value: 'partially_paid', label: 'جزئي' },
                  ].map(status => (
                    <button
                      key={status.value}
                      onClick={() => setFilterPaymentStatus(status.value)}
                      className={`h-10 rounded-[8px] text-xs font-black transition ${filterPaymentStatus === status.value ? 'bg-white text-[#020617] shadow-sm' : 'text-[#64748B]'}`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[8px] border border-[#DDE5EF] bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)]">
              <div className="flex flex-col gap-2 border-b border-[#DDE5EF] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#020617]">سجل المخالفات</h2>
                  <p className="text-sm font-bold text-[#64748B]">
                    عرض {filteredViolations.length.toLocaleString('en-US')} من {(isServerFilteringActive ? sourceViolations.length : totalCount).toLocaleString('en-US')} مخالفة
                    {!isServerFilteringActive && ` - الصفحة ${currentPage} من ${totalPages || 1}`}
                  </p>
                </div>
                <p className="text-sm font-black text-[#102B4E]">{formatCurrency(violationInsights.totalAmount)}</p>
              </div>

              {filteredViolations.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[8px] bg-[#F6F8FB] text-[#94A3B8]">
                    <FileWarning className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-[#020617]">لا توجد مخالفات مطابقة</h3>
                  <p className="text-sm font-bold text-[#64748B]">غيّر الفلاتر أو سجّل مخالفة جديدة للمتابعة.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-right">
                    <thead className="sticky top-0 z-10 border-b border-[#DDE5EF] bg-[#F8FAFC] text-xs font-black text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3">المخالفة</th>
                        <th className="px-4 py-3">التاريخ والموقع</th>
                        <th className="px-4 py-3">المركبة</th>
                        <th className="px-4 py-3">العميل</th>
                        <th className="px-4 py-3">العقد</th>
                        <th className="px-4 py-3">المبلغ</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3 text-center print:hidden">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDE5EF] text-sm">
                      {filteredViolations.map((violation) => {
                        const paymentTone =
                          violation.payment_status === 'paid' ? 'bg-[#E8FBF6] text-[#22C7A1] border-[#BFEFE4]' :
                          violation.payment_status === 'partially_paid' ? 'bg-[#EAF8FE] text-[#38BDF8] border-[#BEE9FB]' :
                          'bg-[#FFF0F2] text-[#FB6B7A] border-[#FFD5DC]';
                        const paymentLabel =
                          violation.payment_status === 'paid' ? 'مسددة' :
                          violation.payment_status === 'partially_paid' ? 'سداد جزئي' :
                          'غير مسددة';

                        return (
                          <tr key={`table-${violation.id}`} onClick={() => handleOpenSidePanel(violation)} className="cursor-pointer bg-white transition hover:bg-[#F8FAFC]">
                            <td className="px-4 py-3 align-top">
                              <div className="font-mono text-sm font-black text-[#020617]">#{violation.penalty_number || '-'}</div>
                              <div className="mt-1 max-w-[220px] truncate text-xs font-bold text-[#64748B]">{violation.violation_type || violation.reason || 'مخالفة مرورية'}</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center gap-1 font-bold text-[#020617]">
                                <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                                {violation.penalty_date ? format(new Date(violation.penalty_date), 'dd/MM/yyyy') : '-'}
                              </div>
                              <div className="mt-1 flex max-w-[210px] items-center gap-1 truncate text-xs font-bold text-[#64748B]">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                                {violation.location || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  violation.vehicle_id && handleNavigateToVehicle(violation.vehicle_id);
                                }}
                                className="inline-flex max-w-[230px] items-center gap-2 truncate rounded-[8px] px-2 py-1 text-right font-black text-[#102B4E] hover:bg-[#E8FBF6] hover:text-[#22C7A1]"
                              >
                                <Car className="h-4 w-4 shrink-0" />
                                <span className="truncate">{getCarName(violation)}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  violation.customer_id && handleNavigateToCustomer(violation.customer_id);
                                }}
                                className="inline-flex max-w-[220px] items-center gap-2 truncate rounded-[8px] px-2 py-1 text-right font-black text-[#102B4E] hover:bg-[#EAF8FE] hover:text-[#38BDF8]"
                              >
                                <User className="h-4 w-4 shrink-0" />
                                <span className="truncate">{getCustomerName(violation)}</span>
                              </button>
                              {violation.customers?.phone && <div className="mt-1 pr-2 text-xs font-bold text-[#94A3B8]">{violation.customers.phone}</div>}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  violation.contract_id && handleNavigateToContract(violation.contract_id);
                                }}
                                className="max-w-[160px] truncate rounded-[8px] px-2 py-1 text-xs font-black text-[#102B4E] hover:bg-[#F6F8FB]"
                              >
                                {violation.contracts?.contract_number || (violation.contract_id ? 'عرض العقد' : 'غير مرتبط')}
                              </button>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="whitespace-nowrap text-base font-black text-[#020617]">{formatCurrency(violation.amount || 0)}</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${paymentTone}`}>
                                {violation.payment_status === 'paid' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                                {paymentLabel}
                              </span>
                              {violation.status === 'pending' && (
                                <div className="mt-1">
                                  <span className="rounded-full bg-[#EAF8FE] px-2 py-0.5 text-[11px] font-black text-[#38BDF8]">قيد المراجعة</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center align-top print:hidden" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <Button variant="outline" size="sm" onClick={() => handleOpenSidePanel(violation)} className="h-9 rounded-[8px] border-[#DDE5EF] px-3"><Eye className="h-4 w-4" /></Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedViolation(violation);
                                    setIsPaymentsDialogOpen(true);
                                  }}
                                  className="h-9 rounded-[8px] border-[#DDE5EF] px-3 text-[#22C7A1]"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                {violation.status === 'pending' && (
                                  <Button variant="outline" size="sm" onClick={() => handleOpenModal(violation)} className="h-9 rounded-[8px] border-[#DDE5EF] px-3 text-[#38BDF8]"><Edit className="h-4 w-4" /></Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => handleDelete(violation.id)} className="h-9 rounded-[8px] border-[#DDE5EF] px-3 text-[#FB6B7A]"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!isServerFilteringActive && totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-[#DDE5EF] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
                  <div className="text-sm font-bold text-[#64748B]">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} - {Math.min(currentPage * itemsPerPage, totalCount)} من {totalCount.toLocaleString('en-US')}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="rounded-[8px]">الأولى</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-[8px]">السابق</Button>
                    <span className="rounded-[8px] bg-white px-3 py-2 text-sm font-black text-[#020617]">{currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-[8px]">التالي</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="rounded-[8px]">الأخيرة</Button>
                  </div>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="import" className="mt-0">
            <section className="overflow-hidden rounded-[8px] border border-[#DDE5EF] bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)]">
              <div className="border-b border-[#DDE5EF] bg-[#F8FAFC] p-4">
                <h2 className="text-lg font-black text-[#020617]">استيراد ملف المخالفات</h2>
                <p className="text-sm font-bold text-[#64748B]">ارفع ملف Excel أو PDF أو صورة، ثم راجع النتائج والربط قبل الحفظ.</p>
              </div>
              <Suspense fallback={<LoadingSpinner size="lg" />}>
                <TrafficViolationPDFImport />
              </Suspense>
            </section>
          </TabsContent>
        </Tabs>
      </main>

      <main className="hidden max-w-7xl mx-auto p-6 space-y-6 print:p-0 print:max-w-none">
        
        {/* --- Smart Dashboard --- */}
        <TrafficViolationsSmartDashboard violations={filteredViolations} />

        {/* --- Alerts Panel (collapsible) --- */}
        <TrafficViolationsAlertsPanel 
          onFilterByStatus={handleFilterByStatus}
          onNavigateToVehicle={handleNavigateToVehicle}
        />

        {/* --- Tabs Section --- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-teal-500/50 hover:shadow-sm transition-all">
          <Tabs defaultValue="list" className="w-full">
            <div className="border-b border-neutral-100 px-4 pt-2">
              <TabsList className="h-auto flex justify-start gap-1 p-1 bg-transparent">
                <TabsTrigger value="list" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  <List className="w-4 h-4" />
                  قائمة المخالفات
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  <Upload className="w-4 h-4" />
                  استيراد ملف
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content: List */}
            <TabsContent value="list" className="mt-0">
              {/* --- Advanced Filters Area --- */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-neutral-50 p-4 border-b border-neutral-100 print:hidden">
                 
                {/* Search */}
                <div className="relative w-full xl:w-80">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input 
                    type="text" 
                    placeholder="بحث: رقم المخالفة، المركبة، العميل..."
                    className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition hover:border-teal-500/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                 
                {/* Dropdowns */}
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                   
                  {/* Car Filter */}
                  <div className="relative w-full md:w-48">
                    <Car className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none z-10" />
                    <select 
                      value={filterCar} 
                      onChange={(e) => setFilterCar(e.target.value)}
                      className="w-full pr-9 pl-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none appearance-none text-sm font-medium text-neutral-700 cursor-pointer hover:bg-neutral-50 hover:border-teal-500/50 transition"
                    >
                      <option value="all">جميع المركبات</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.make} {v.model} - {v.plate_number}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                  </div>

                  {/* Customer Filter */}
                  <div className="relative w-full md:w-48">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none z-10" />
                    <select 
                      value={filterCustomer} 
                      onChange={(e) => setFilterCustomer(e.target.value)}
                      className="w-full pr-9 pl-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none appearance-none text-sm font-medium text-neutral-700 cursor-pointer hover:bg-neutral-50 hover:border-teal-500/50 transition"
                    >
                      <option value="all">جميع العملاء</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                  </div>

                  {/* Payment Status Filter */}
                  <div className="flex bg-neutral-100 p-1 rounded-xl w-full md:w-auto">
                    {[
                      { value: 'all', label: 'الكل' },
                      { value: 'paid', label: 'مسددة' },
                      { value: 'unpaid', label: 'غير مسددة' },
                      { value: 'partially_paid', label: 'جزئي' }
                    ].map(status => (
                      <button 
                        key={status.value}
                        onClick={() => setFilterPaymentStatus(status.value)}
                        className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${
                          filterPaymentStatus === status.value 
                          ? 'bg-white text-neutral-900 shadow-sm' 
                          : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>

                </div>
              </div>

              {/* --- Table View --- */}
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-right print:text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium text-xs uppercase tracking-wider print:bg-neutral-100 print:text-black">
                    <tr>
                      <th className="px-6 py-4">رقم المخالفة</th>
                      <th className="px-6 py-4">التاريخ</th>
                      <th className="px-6 py-4">المركبة</th>
                      <th className="px-6 py-4">العميل</th>
                      <th className="px-6 py-4">الموقع</th>
                      <th className="px-6 py-4">القيمة</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4 text-center print:hidden">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-sm print:divide-neutral-200">
                    {filteredViolations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-neutral-400">
                          <div className="flex flex-col items-center gap-2">
                            <FileWarning className="w-10 h-10 opacity-20" />
                            <p>لا توجد سجلات مطابقة للفلاتر الحالية</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredViolations.map(violation => (
                        <tr
                          key={violation.id}
                          className="hover:bg-neutral-50 transition group print:break-inside-avoid cursor-pointer"
                          onClick={() => handleOpenSidePanel(violation)}
                        >
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-neutral-800">{violation.penalty_number}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-neutral-600 text-sm flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-neutral-400"/>
                              {violation.penalty_date && format(new Date(violation.penalty_date), 'dd/MM/yyyy')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className="flex items-center gap-2 cursor-pointer hover:text-teal-600 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                violation.vehicle_id && handleNavigateToVehicle(violation.vehicle_id);
                              }}
                            >
                              <div className="p-1.5 bg-neutral-100 rounded-full print:hidden"><Car className="w-4 h-4 text-neutral-500" /></div>
                              <span className="font-medium text-neutral-700 hover:underline">{getCarName(violation)}</span>
                            </div>
                            {violation.contract_id && (
                              <div
                                className="text-xs text-teal-600 mt-1 cursor-pointer hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigateToContract(violation.contract_id!);
                                }}
                              >
                                عقد: {violation.contracts?.contract_number || 'عرض العقد'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className="flex items-center gap-2 cursor-pointer hover:text-teal-600 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                violation.customer_id && handleNavigateToCustomer(violation.customer_id);
                              }}
                            >
                              <div className="p-1.5 bg-neutral-100 rounded-full print:hidden"><User className="w-4 h-4 text-neutral-500" /></div>
                              <span className="text-neutral-600 hover:underline">{getCustomerName(violation)}</span>
                            </div>
                            {violation.customers?.phone && (
                              <div className="text-xs text-neutral-400 mt-1">{violation.customers.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-neutral-600 text-sm">{violation.location || '-'}</div>
                          </td>
                          <td className="px-6 py-4 font-bold text-teal-600 text-base">{formatCurrency(violation.amount || 0)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              violation.payment_status === 'paid' 
                                ? 'bg-green-100 text-green-700 print:bg-transparent print:text-black print:border print:border-green-500' 
                                : violation.payment_status === 'partially_paid'
                                ? 'bg-amber-100 text-amber-700 print:bg-transparent print:text-black print:border print:border-amber-500'
                                : 'bg-red-100 text-red-700 print:bg-transparent print:text-black print:border print:border-red-500'
                            }`}>
                              {violation.payment_status === 'paid' ? <CheckCircle className="w-3 h-3 print:hidden"/> : <AlertCircle className="w-3 h-3 print:hidden"/>}
                              {violation.payment_status === 'paid' ? 'مسددة' : violation.payment_status === 'partially_paid' ? 'جزئي' : 'غير مسددة'}
                            </span>
                            {/* Status Badge */}
                            {violation.status && violation.status !== 'confirmed' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                violation.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-50 text-neutral-500'
                              }`}>
                                {violation.status === 'pending' ? 'قيد المراجعة' : violation.status === 'cancelled' ? 'ملغاة' : violation.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 print:hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenSidePanel(violation)}
                                className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition"
                                title="عرض التفاصيل"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedViolation(violation);
                                  setIsPaymentsDialogOpen(true);
                                }} 
                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition" 
                                title="إضافة دفعة"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              {violation.status === 'pending' && (
                                <button 
                                  onClick={() => handleOpenModal(violation)} 
                                  className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition" 
                                  title="تعديل"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDelete(violation.id)} 
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" 
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Results Count */}
              {filteredViolations.length > 0 && (
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 text-sm text-neutral-500 print:hidden">
                  عرض {filteredViolations.length.toLocaleString('en-US')} من {(isServerFilteringActive ? sourceViolations.length : totalCount).toLocaleString('en-US')} مخالفة
                  {!isServerFilteringActive && (
                    <> (الصفحة {currentPage} من {totalPages} - الإجمالي: {totalCount.toLocaleString('en-US')} مخالفة)</>
                  )}
                  {isServerFilteringActive && (
                    <> (بحث مباشر)</>
                  )}
                </div>
              )}

              {/* Pagination Controls */}
              {!isServerFilteringActive && totalPages > 1 && (
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-4 print:hidden">
                  <div className="text-sm text-neutral-600">
                    <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}</span>
                    {' '}-{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span>
                    {' '}من {' '}
                    <span className="font-medium">{totalCount.toLocaleString('en-US')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="rounded-lg border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                      الأولى
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                      السابق
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`min-w-[40px] rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                      التالي
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                      الأخيرة
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Import */}
            <TabsContent value="import" className="p-0">
              <Suspense fallback={<LoadingSpinner size="lg" />}>
                <TrafficViolationPDFImport />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Print Styles */}
      <style>{`
        .traffic-violations-system {
          --tv-radius: 8px;
          color: var(--tv-text);
        }

        .traffic-violations-system header,
        .traffic-violations-system .bg-white {
          background-color: var(--tv-surface) !important;
        }

        .traffic-violations-system .bg-slate-50,
        .traffic-violations-system .bg-neutral-50,
        .traffic-violations-system .bg-neutral-100 {
          background-color: var(--tv-inner) !important;
        }

        .traffic-violations-system .border-slate-200,
        .traffic-violations-system .border-neutral-100,
        .traffic-violations-system .border-slate-300,
        .traffic-violations-system .divide-neutral-100 > :not([hidden]) ~ :not([hidden]) {
          border-color: var(--tv-border) !important;
        }

        .traffic-violations-system .text-neutral-900,
        .traffic-violations-system .text-neutral-800,
        .traffic-violations-system .text-neutral-700,
        .traffic-violations-system .text-slate-800,
        .traffic-violations-system .text-slate-700 {
          color: var(--tv-text) !important;
        }

        .traffic-violations-system .text-neutral-600,
        .traffic-violations-system .text-neutral-500,
        .traffic-violations-system .text-neutral-400,
        .traffic-violations-system .text-slate-500,
        .traffic-violations-system .text-slate-400 {
          color: var(--tv-muted) !important;
        }

        .traffic-violations-system .rounded-\\[1\\.25rem\\],
        .traffic-violations-system .rounded-xl,
        .traffic-violations-system .rounded-lg {
          border-radius: var(--tv-radius) !important;
        }

        .traffic-violations-system .shadow-sm,
        .traffic-violations-system .shadow-md,
        .traffic-violations-system .shadow-lg {
          box-shadow: 0 12px 28px -24px rgba(2, 6, 23, 0.38) !important;
        }

        .traffic-violations-system .bg-teal-500,
        .traffic-violations-system .data-\\[state\\=active\\]\\:bg-teal-500[data-state="active"],
        .traffic-violations-system .bg-green-500 {
          background-color: var(--tv-success) !important;
        }

        .traffic-violations-system .hover\\:bg-teal-600:hover,
        .traffic-violations-system .hover\\:bg-green-100:hover {
          background-color: rgba(34, 199, 161, 0.16) !important;
        }

        .traffic-violations-system .text-teal-600,
        .traffic-violations-system .text-green-600,
        .traffic-violations-system .text-green-700,
        .traffic-violations-system .text-green-500,
        .traffic-violations-system .hover\\:text-teal-600:hover {
          color: var(--tv-success) !important;
        }

        .traffic-violations-system .border-teal-500,
        .traffic-violations-system .focus\\:border-teal-500:focus,
        .traffic-violations-system .hover\\:border-teal-500\\/50:hover {
          border-color: var(--tv-success) !important;
        }

        .traffic-violations-system .focus\\:ring-teal-500:focus {
          --tw-ring-color: rgba(34, 199, 161, 0.18) !important;
        }

        .traffic-violations-system .bg-green-50,
        .traffic-violations-system .bg-teal-50,
        .traffic-violations-system .bg-gradient-to-r {
          background: rgba(34, 199, 161, 0.1) !important;
        }

        .traffic-violations-system .bg-blue-50,
        .traffic-violations-system .bg-purple-50 {
          background-color: rgba(124, 131, 246, 0.1) !important;
        }

        .traffic-violations-system .text-blue-600,
        .traffic-violations-system .text-blue-700,
        .traffic-violations-system .text-blue-800,
        .traffic-violations-system .text-purple-600,
        .traffic-violations-system .text-purple-500 {
          color: var(--tv-focus) !important;
        }

        .traffic-violations-system .border-blue-200 {
          border-color: rgba(124, 131, 246, 0.24) !important;
        }

        .traffic-violations-system .bg-rose-50,
        .traffic-violations-system .bg-red-50,
        .traffic-violations-system .bg-red-100,
        .traffic-violations-system .bg-orange-50,
        .traffic-violations-system .bg-orange-100 {
          background-color: rgba(251, 107, 122, 0.1) !important;
        }

        .traffic-violations-system .text-rose-500,
        .traffic-violations-system .text-coral-600,
        .traffic-violations-system .text-red-600,
        .traffic-violations-system .text-red-700,
        .traffic-violations-system .text-orange-600,
        .traffic-violations-system .text-orange-700,
        .traffic-violations-system .text-orange-800 {
          color: var(--tv-alert) !important;
        }

        .traffic-violations-system .bg-red-500,
        .traffic-violations-system .bg-orange-500 {
          background-color: var(--tv-alert) !important;
        }

        .traffic-violations-system .border-red-100,
        .traffic-violations-system .border-red-200,
        .traffic-violations-system .border-orange-200,
        .traffic-violations-system .hover\\:border-orange-500\\/30:hover {
          border-color: rgba(251, 107, 122, 0.28) !important;
        }

        .traffic-violations-system .bg-amber-50,
        .traffic-violations-system .bg-amber-100 {
          background-color: rgba(56, 189, 248, 0.12) !important;
        }

        .traffic-violations-system .text-amber-500,
        .traffic-violations-system .text-amber-600,
        .traffic-violations-system .text-amber-700 {
          color: var(--tv-info) !important;
        }

        .traffic-violations-system .bg-amber-500 {
          background-color: var(--tv-info) !important;
        }

        .traffic-violations-system .border-amber-200,
        .traffic-violations-system .hover\\:border-amber-500\\/30:hover {
          border-color: rgba(56, 189, 248, 0.28) !important;
        }

        .traffic-violations-system input,
        .traffic-violations-system select {
          background-color: var(--tv-surface) !important;
          border-color: var(--tv-border) !important;
          color: var(--tv-text) !important;
          border-radius: var(--tv-radius) !important;
        }

        .traffic-violations-system input:focus,
        .traffic-violations-system select:focus {
          border-color: var(--tv-success) !important;
          box-shadow: 0 0 0 3px rgba(34, 199, 161, 0.12) !important;
        }

        .traffic-violations-system table thead {
          background-color: var(--tv-inner) !important;
          color: var(--tv-muted) !important;
        }

        .traffic-violations-system tbody tr:hover {
          background-color: rgba(56, 189, 248, 0.06) !important;
        }

        .traffic-violations-system button[class*="bg-teal-500"],
        .traffic-violations-system .data-\\[state\\=active\\]\\:bg-teal-500[data-state="active"] {
          background-color: var(--tv-success) !important;
          color: #ffffff !important;
          box-shadow: 0 12px 24px -18px rgba(34, 199, 161, 0.72) !important;
        }

        .traffic-violations-system .hover\\:bg-slate-50:hover,
        .traffic-violations-system .hover\\:bg-neutral-50:hover,
        .traffic-violations-system .hover\\:bg-neutral-100:hover {
          background-color: rgba(56, 189, 248, 0.08) !important;
        }

        .traffic-violations-dialog {
          border-radius: 8px !important;
          border-color: #E5EAF1 !important;
        }

        @media print {
          body, #root, .min-h-screen {
            background: white !important;
            height: auto !important;
            overflow: visible !important;
            width: 100% !important;
            position: static !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:text-black { color: black !important; }
          .print\\:border-slate-300 { border-color: #d1d5db !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:overflow-visible { overflow: visible !important; }
          .print\\:whitespace-normal { white-space: normal !important; }
          
          @page { margin: 1cm; }
          tr { break-inside: avoid; }
          ::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </div>
  );
}
