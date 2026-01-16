import React, { useState, useMemo, lazy, Suspense, useCallback } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useTrafficViolations, TrafficViolation, useDeleteTrafficViolation, useUpdatePaymentStatus } from '@/hooks/useTrafficViolations';
import { useRelinkViolations } from '@/hooks/useRelinkViolations';
import { TrafficViolationsSmartDashboard } from '@/components/fleet/TrafficViolationsSmartDashboard';
import { TrafficViolationsAlertsPanel } from '@/components/fleet/TrafficViolationsAlertsPanel';
import { TrafficViolationSidePanelNew } from '@/components/fleet/TrafficViolationSidePanelNew';
import { TrafficViolationReportDialog } from '@/components/fleet/TrafficViolationReportDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Lazy load heavy components for better performance
const TrafficViolationForm = lazy(() =>
  import('@/components/fleet/TrafficViolationForm').then(m => ({ default: m.TrafficViolationForm }))
);
const TrafficViolationPaymentsDialog = lazy(() =>
  import('@/components/fleet/TrafficViolationPaymentsDialog').then(m => ({ default: m.TrafficViolationPaymentsDialog }))
);
const TrafficViolationPDFImport = lazy(() =>
  import('@/components/fleet/TrafficViolationPDFImportRedesigned').then(m => ({ default: m.TrafficViolationPDFImportRedesigned }))
);

export default function TrafficViolationsRedesigned() {
  const navigate = useNavigate();
  
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
  
  // Data Fetching - Reduced limit for better performance (was 10000!)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const { data: violations = [], isLoading, refetch } = useTrafficViolations({
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage
  });
  const { data: vehicles = [] } = useVehicles({ limit: 500 });

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

  // Filtering Logic - Now works on paginated data
  // For full filtering, we'd need to move this to server-side with query params
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
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
  }, [violations, searchTerm, filterStatus, filterPaymentStatus, filterCar, filterCustomer, getCarName, getCustomerName]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 font-sans text-slate-800" dir="rtl">
      
      {/* Side Panel */}
      <TrafficViolationSidePanelNew
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

      {/* Relink Violations Dialog */}
      <Dialog open={isRelinkDialogOpen} onOpenChange={(open) => {
        setIsRelinkDialogOpen(open);
        if (!open) resetRelinkResult();
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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

      {/* --- Top Navbar --- */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-30 px-6 py-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-teal-500/20">
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
            className="border-slate-200/50 hover:bg-slate-50 rounded-xl hover:border-teal-500/30"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            <span className="hidden md:inline">تحديث</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenReportDialog}
            className="border-slate-200/50 hover:bg-slate-50 rounded-xl hover:border-teal-500/30"
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
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-teal-500/20"
              >
                <Plus className="w-5 h-5 ml-2" />
                تسجيل مخالفة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      <main className="max-w-7xl mx-auto p-6 space-y-6 print:p-0 print:max-w-none">
        
        {/* --- Smart Dashboard --- */}
        <TrafficViolationsSmartDashboard violations={filteredViolations} />

        {/* --- Alerts Panel (collapsible) --- */}
        <TrafficViolationsAlertsPanel 
          onFilterByStatus={handleFilterByStatus}
          onNavigateToVehicle={handleNavigateToVehicle}
        />

        {/* --- Tabs Section --- */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <Tabs defaultValue="list" className="w-full">
            <div className="border-b border-neutral-100 px-4 pt-2">
              <TabsList className="h-auto flex justify-start gap-1 p-1 bg-transparent">
                <TabsTrigger value="list" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  <List className="w-4 h-4" />
                  قائمة المخالفات
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  <Upload className="w-4 h-4" />
                  استيراد PDF
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
                    className="w-full pr-10 pl-4 py-2.5 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition hover:border-teal-500/30"
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
                      className="w-full pr-9 pl-8 py-2.5 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none appearance-none text-sm font-medium text-neutral-700 cursor-pointer hover:bg-neutral-50 hover:border-teal-500/30 transition"
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
                      className="w-full pr-9 pl-8 py-2.5 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none appearance-none text-sm font-medium text-neutral-700 cursor-pointer hover:bg-neutral-50 hover:border-teal-500/30 transition"
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
                  عرض {filteredViolations.length.toLocaleString('en-US')} من {violations.length.toLocaleString('en-US')} مخالفة
                  (الصفحة {currentPage} من {totalPages} - الإجمالي: {totalCount.toLocaleString('en-US')} مخالفة)
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
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
                      className="rounded-lg border-slate-200/50 hover:bg-slate-50 disabled:opacity-50"
                    >
                      الأولى
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border-slate-200/50 hover:bg-slate-50 disabled:opacity-50"
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
                                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/20'
                                : 'border-slate-200/50 hover:bg-slate-50'
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
                      className="rounded-lg border-slate-200/50 hover:bg-slate-50 disabled:opacity-50"
                    >
                      التالي
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border-slate-200/50 hover:bg-slate-50 disabled:opacity-50"
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
