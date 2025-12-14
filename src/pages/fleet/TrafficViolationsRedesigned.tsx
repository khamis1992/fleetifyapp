import React, { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  X, 
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
  Download,
  Upload,
  Clock,
  XCircle,
  BarChart,
  List,
  Filter
} from 'lucide-react';
import { FloatingAssistant } from '@/components/employee-assistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTrafficViolations, TrafficViolation, useDeleteTrafficViolation, useUpdatePaymentStatus } from '@/hooks/useTrafficViolations';
import { TrafficViolationSidePanel } from '@/components/fleet/TrafficViolationSidePanel';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

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
  
  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCar, setFilterCar] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<TrafficViolation | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<TrafficViolation | null>(null);
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  
  // Data Fetching
  const { data: violations = [], isLoading, refetch } = useTrafficViolations({ limit: 10000, offset: 0 });
  const { data: vehicles = [] } = useVehicles({ limit: 500 });
  const deleteViolationMutation = useDeleteTrafficViolation();
  const updatePaymentStatusMutation = useUpdatePaymentStatus();
  const { formatCurrency } = useCurrencyFormatter();

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

  // Filtering Logic
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const matchesSearch = 
        v.penalty_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        getCarName(v).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCustomerName(v).toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.violation_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || v.payment_status === filterStatus;
      const matchesCar = filterCar === 'all' || v.vehicle_id === filterCar || v.vehicle_plate === filterCar;
      const matchesCustomer = filterCustomer === 'all' || v.customer_id === filterCustomer;

      return matchesSearch && matchesStatus && matchesCar && matchesCustomer;
    });
  }, [violations, searchTerm, filterStatus, filterCar, filterCustomer, getCarName, getCustomerName]);

  // Statistics
  const stats = useMemo(() => {
    const total = violations.reduce((acc, v) => acc + (v.amount || 0), 0);
    const unpaidTotal = violations.filter(v => v.payment_status === 'unpaid').reduce((acc, v) => acc + (v.amount || 0), 0);
    const paidCount = violations.filter(v => v.payment_status === 'paid').length;
    const unpaidCount = violations.filter(v => v.payment_status === 'unpaid').length;
    return { total, unpaidTotal, paidCount, unpaidCount, totalCount: violations.length };
  }, [violations]);

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

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleOpenSidePanel = useCallback((violation: TrafficViolation) => {
    setSelectedViolation(violation);
    setIsSidePanelOpen(true);
  }, []);

  const handleNavigateToVehicle = useCallback((vehicleId: string) => {
    if (vehicleId) {
      navigate(`/fleet/${vehicleId}`);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800" dir="rtl">
      
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
      />

      {/* Payments Dialog */}
      <Suspense fallback={<LoadingSpinner size="sm" />}>
        <TrafficViolationPaymentsDialog
          violation={selectedViolation}
          open={isPaymentsDialogOpen}
          onOpenChange={setIsPaymentsDialogOpen}
        />
      </Suspense>

      {/* --- Top Navbar --- */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-red-50 p-2 rounded-lg">
            <FileWarning className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">إدارة المخالفات المرورية</h1>
            <p className="text-xs text-gray-500">نظام تتبع وإدارة غرامات المركبات</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
           <button 
             onClick={handlePrint}
             className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2"
           >
             <Printer className="w-4 h-4" /> <span className="hidden md:inline">طباعة تقرير</span>
           </button>
           <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
             <DialogTrigger asChild>
               <button 
                 onClick={() => handleOpenModal(null)} 
                 className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-red-200 transition flex items-center gap-2"
               >
                 <Plus className="w-5 h-5" /> تسجيل مخالفة
               </button>
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

      {/* Print Header (Only visible when printing) */}
      <div className="hidden print:block p-8 border-b border-gray-200 text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">تقرير المخالفات المرورية</h1>
        <p className="text-gray-500 text-sm">تاريخ التقرير: {new Date().toLocaleDateString('en-US')}</p>
      </div>

      <main className="max-w-7xl mx-auto p-6 space-y-6 print:p-0 print:max-w-none">
        
        {/* --- Statistics Cards --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 print:grid-cols-4 print:gap-2">
           {/* Card 1 - Total Violations */}
           <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between print:border-gray-300 hover:shadow-md transition-shadow cursor-pointer">
              <div>
                <p className="text-gray-500 text-sm mb-1">إجمالي الغرامات</p>
                <h3 className="text-2xl font-black text-gray-800">{formatCurrency(stats.total)}</h3>
                <p className="text-xs text-gray-400 mt-1">{stats.totalCount} مخالفة</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl print:bg-transparent"><DollarSign className="w-6 h-6 text-blue-600 print:text-black" /></div>
           </div>
           
           {/* Card 2 - Unpaid Amount */}
           <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between print:border-gray-300 hover:shadow-md transition-shadow cursor-pointer">
              <div>
                <p className="text-gray-500 text-sm mb-1">المبالغ غير المدفوعة</p>
                <h3 className="text-2xl font-black text-red-600">{formatCurrency(stats.unpaidTotal)}</h3>
                <p className="text-xs text-gray-400 mt-1">{stats.unpaidCount} مخالفة</p>
              </div>
              <div className="bg-red-50 p-3 rounded-xl print:bg-transparent"><AlertCircle className="w-6 h-6 text-red-600 print:text-black" /></div>
           </div>

           {/* Card 3 - Paid Count */}
           <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between print:border-gray-300 hover:shadow-md transition-shadow cursor-pointer">
              <div>
                <p className="text-gray-500 text-sm mb-1">مخالفات مسددة</p>
                <h3 className="text-2xl font-black text-green-600">{stats.paidCount}</h3>
                <p className="text-xs text-gray-400 mt-1">{stats.totalCount > 0 ? Math.round((stats.paidCount / stats.totalCount) * 100) : 0}% من الإجمالي</p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl print:bg-transparent"><CheckCircle className="w-6 h-6 text-green-600 print:text-black" /></div>
           </div>

           {/* Card 4 - Pending Count */}
           <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between print:border-gray-300 hover:shadow-md transition-shadow cursor-pointer">
              <div>
                <p className="text-gray-500 text-sm mb-1">مخالفات معلقة</p>
                <h3 className="text-2xl font-black text-orange-500">{stats.unpaidCount}</h3>
                <p className="text-xs text-gray-400 mt-1">{stats.totalCount > 0 ? Math.round((stats.unpaidCount / stats.totalCount) * 100) : 0}% من الإجمالي</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl print:bg-transparent"><FileWarning className="w-6 h-6 text-orange-500 print:text-black" /></div>
           </div>
        </div>

        {/* --- Tabs Section --- */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <Tabs defaultValue="list" className="w-full">
            <div className="border-b border-gray-100 px-4 pt-2">
              <TabsList className="h-auto flex justify-start gap-1 p-1 bg-transparent">
                <TabsTrigger value="list" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  <List className="w-4 h-4" />
                  قائمة المخالفات
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  <Upload className="w-4 h-4" />
                  استيراد PDF
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  <BarChart className="w-4 h-4" />
                  التقارير
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content: List */}
            <TabsContent value="list" className="mt-0">
              {/* --- Advanced Filters Area --- */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-50 p-4 border-b border-gray-100 print:hidden">
                 
                 {/* Search */}
                 <div className="relative w-full xl:w-80">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                   <input 
                     type="text" 
                     placeholder="بحث: رقم المخالفة، المركبة، العميل..." 
                     className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none transition"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
                 
                 {/* Dropdowns */}
                 <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                   
                   {/* Car Filter */}
                   <div className="relative w-full md:w-48">
                     <Car className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                     <select 
                       value={filterCar} 
                       onChange={(e) => setFilterCar(e.target.value)}
                       className="w-full pr-9 pl-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none appearance-none text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition"
                     >
                       <option value="all">جميع المركبات</option>
                       {vehicles.map(v => (
                         <option key={v.id} value={v.id}>{v.make} {v.model} - {v.plate_number}</option>
                       ))}
                     </select>
                     <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>

                   {/* Customer Filter */}
                   <div className="relative w-full md:w-48">
                     <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                     <select 
                       value={filterCustomer} 
                       onChange={(e) => setFilterCustomer(e.target.value)}
                       className="w-full pr-9 pl-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none appearance-none text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition"
                     >
                       <option value="all">جميع العملاء</option>
                       {customers.map(c => (
                         <option key={c.id} value={c.id}>
                           {c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}
                         </option>
                       ))}
                     </select>
                     <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>

                   {/* Status Filter */}
                   <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                      {[
                        { value: 'all', label: 'الكل' },
                        { value: 'paid', label: 'مدفوعة' },
                        { value: 'unpaid', label: 'غير مدفوعة' }
                      ].map(status => (
                        <button 
                          key={status.value}
                          onClick={() => setFilterStatus(status.value)}
                          className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${
                            filterStatus === status.value 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
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
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium text-xs uppercase tracking-wider print:bg-gray-100 print:text-black">
                    <tr>
                      <th className="px-6 py-4">رقم المخالفة / التاريخ</th>
                      <th className="px-6 py-4">المركبة</th>
                      <th className="px-6 py-4">العميل</th>
                      <th className="px-6 py-4">التفاصيل</th>
                      <th className="px-6 py-4">القيمة</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4 text-center print:hidden">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm print:divide-gray-200">
                    {filteredViolations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <FileWarning className="w-10 h-10 opacity-20" />
                            <p>لا توجد سجلات مطابقة للفلاتر الحالية</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredViolations.map(violation => (
                        <tr key={violation.id} className="hover:bg-gray-50 transition group print:break-inside-avoid">
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-gray-800">{violation.penalty_number}</div>
                            <div className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3"/> 
                              {violation.penalty_date && format(new Date(violation.penalty_date), 'dd/MM/yyyy', { locale: ar })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition"
                              onClick={() => violation.vehicle_id && handleNavigateToVehicle(violation.vehicle_id)}
                            >
                              <div className="p-1.5 bg-gray-100 rounded-full print:hidden"><Car className="w-4 h-4 text-gray-500" /></div>
                              <span className="font-medium text-gray-700 hover:underline">{getCarName(violation)}</span>
                            </div>
                            {violation.contract_id && (
                              <div 
                                className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline"
                                onClick={() => handleNavigateToContract(violation.contract_id!)}
                              >
                                عقد: {violation.contracts?.contract_number || 'عرض العقد'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                             <div 
                               className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition"
                               onClick={() => violation.customer_id && handleNavigateToCustomer(violation.customer_id)}
                             >
                              <div className="p-1.5 bg-gray-100 rounded-full print:hidden"><User className="w-4 h-4 text-gray-500" /></div>
                              <span className="text-gray-600 hover:underline">{getCustomerName(violation)}</span>
                            </div>
                            {violation.customers?.phone && (
                              <div className="text-xs text-gray-400 mt-1">{violation.customers.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-800 font-medium">{violation.violation_type || violation.reason || '-'}</div>
                            {violation.location && (
                              <div className="text-xs text-gray-500 mt-1">📍 {violation.location}</div>
                            )}
                            {violation.notes && (
                               <div className="text-xs text-gray-500 mt-1 flex items-start gap-1 max-w-[200px] print:max-w-none">
                                 <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5 print:hidden" /> 
                                 <span className="truncate print:whitespace-normal">{violation.notes}</span>
                               </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-red-600 text-base">{formatCurrency(violation.amount || 0)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              violation.payment_status === 'paid' 
                                ? 'bg-green-100 text-green-700 print:bg-transparent print:text-black print:border print:border-green-500' 
                                : violation.payment_status === 'partially_paid'
                                ? 'bg-yellow-100 text-yellow-700 print:bg-transparent print:text-black print:border print:border-yellow-500'
                                : 'bg-red-100 text-red-700 print:bg-transparent print:text-black print:border print:border-red-500'
                            }`}>
                              {violation.payment_status === 'paid' ? <CheckCircle className="w-3 h-3 print:hidden"/> : <AlertCircle className="w-3 h-3 print:hidden"/>}
                              {violation.payment_status === 'paid' ? 'مدفوعة' : violation.payment_status === 'partially_paid' ? 'جزئي' : 'غير مدفوعة'}
                            </span>
                            {/* Status Badge */}
                            {violation.status && violation.status !== 'confirmed' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                violation.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-500'
                              }`}>
                                {violation.status === 'pending' ? 'قيد المراجعة' : violation.status === 'cancelled' ? 'ملغاة' : violation.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 print:hidden">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleOpenSidePanel(violation)} 
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" 
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
                                  className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition" 
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
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-500 print:hidden">
                  عرض {filteredViolations.length} من {violations.length} مخالفة
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Import */}
            <TabsContent value="import" className="p-6">
              <div className="text-center max-w-md mx-auto space-y-4">
                <div className="w-24 h-24 mx-auto bg-red-50 rounded-full flex items-center justify-center">
                  <Upload className="w-12 h-12 text-red-400" />
                </div>
                <h3 className="text-xl font-bold">استيراد مخالفات من PDF</h3>
                <p className="text-gray-500">قم بتحميل ملف PDF يحتوي على المخالفات المرورية وسيتم استخراجها تلقائياً</p>
                <Suspense fallback={<LoadingSpinner size="lg" />}>
                  <TrafficViolationPDFImport />
                </Suspense>
              </div>
            </TabsContent>

            {/* Tab Content: Reports */}
            <TabsContent value="reports" className="p-6">
              <h3 className="text-xl font-bold mb-6">التقارير والإحصائيات</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <BarChart className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">تقرير المخالفات الشهري</CardTitle>
                        <CardDescription>عرض جميع المخالفات خلال الشهر الحالي</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">عرض التقرير</Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">تقرير المدفوعات</CardTitle>
                        <CardDescription>ملخص المدفوعات والمبالغ المستحقة</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">عرض التقرير</Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Car className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">تقرير المركبات</CardTitle>
                        <CardDescription>المخالفات حسب المركبة</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">عرض التقرير</Button>
                  </CardContent>
                </Card>
              </div>
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
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:overflow-visible { overflow: visible !important; }
          .print\\:whitespace-normal { white-space: normal !important; }
          
          /* Reset margins */
          @page { margin: 1cm; }
          
          /* Ensure table prints nicely */
          tr { break-inside: avoid; }
          
          /* Hide scrollbars */
          ::-webkit-scrollbar { display: none; }
        }
      `}</style>

      {/* مساعد الموظف للمخالفات المرورية */}
      <FloatingAssistant 
        workflowType="traffic_violation" 
        data={{
          vehicle_id: selectedViolation?.vehicle_id,
          vehicle: {
            plate_number: selectedViolation?.vehicle?.plate_number,
          },
          violation_number: selectedViolation?.violation_number,
          violation_date: selectedViolation?.violation_date,
          violation_type: selectedViolation?.violation_type,
          amount: selectedViolation?.fine_amount,
          status: selectedViolation?.payment_status,
          driver_name: selectedViolation?.customer?.first_name_ar || selectedViolation?.customer?.first_name,
          customer_id: selectedViolation?.customer_id,
        }}
      />
    </div>
  );
}
