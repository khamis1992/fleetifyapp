import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Car, 
  Calendar,
  Clock
} from "lucide-react";
import { useOptimizedReservations } from "@/hooks/useOptimizedReservations";
import { useOptimizedVehicles } from "@/hooks/useOptimizedVehicles";
import { useOptimizedCustomers } from "@/hooks/useOptimizedCustomers";
import { useVehicleStatusUpdate, useCompleteReservationStatus, useCancelReservationStatus } from "@/hooks/useVehicleStatusIntegration";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useDeleteReservation, useUpdateReservation, useCreateReservation } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PageHelp } from "@/components/help";
import { ReservationsCalendar } from "@/components/fleet/ReservationsCalendar";
import { FloatingAssistant } from "@/components/employee-assistant";
import { MobileQuickNav } from "@/components/dashboard/customization/MobileQuickNav";

// Lazy load components
const ReservationForm = lazy(() => 
  import("@/components/fleet/ReservationForm").then(m => ({ default: m.ReservationForm }))
);

// Status mapping
const statusColors = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  active: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-neutral-100 text-neutral-700 border-neutral-200",
  cancelled: "bg-red-100 text-red-700 border-red-200"
};

const statusLabels = {
  pending: "معلقة",
  confirmed: "مؤكدة",
  active: "نشطة",
  completed: "مكتملة",
  cancelled: "ملغاة"
};

export default function Reservations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | undefined>(undefined);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'stats'>('list');
  const itemsPerPage = 20;
  
  // Read parameters from URL
  useEffect(() => {
    const reservationParam = searchParams.get('reservation');
    if (reservationParam) {
      setSelectedReservationId(reservationParam);
      setShowReservationForm(true);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('reservation');
        return newParams;
      }, { replace: true });
    }
    
    const vehicleParam = searchParams.get('vehicle');
    if (vehicleParam) {
      setSelectedVehicleId(vehicleParam);
      setShowReservationForm(true);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('vehicle');
        return newParams;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  // Optimized data fetching
  const { data, loadingStage, loadingProgress, invalidateCache, searchInCachedData } = useOptimizedReservations({
    enabled: true
  });
  
  const { formatCurrency } = useCurrencyFormatter();
  const completeReservationStatus = useCompleteReservationStatus();
  const cancelReservationStatus = useCancelReservationStatus();
  const vehicleStatusUpdate = useVehicleStatusUpdate();
  const deleteReservation = useDeleteReservation();
  const updateReservation = useUpdateReservation();
  const createReservation = useCreateReservation();
  
  // Filtered and paginated data
  const filteredData = useMemo(() => {
    if (!data.reservations || !data.reservations.length) {
      return {
        paginatedData: [],
        totalCount: 0
      };
    }
    
    let filtered = [...data.reservations];
    
    // Apply filters
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (dateFilter) {
      filtered = filtered.filter(r => {
        const reservationDate = new Date(r.start_date);
        const filterDate = new Date(dateFilter);
        return reservationDate.toDateString() === filterDate.toDateString();
      });
    }
    
    if (searchQuery) {
      filtered = searchInCachedData(
        filtered,
        searchQuery,
        ['plate_number', 'customer_name', 'vehicle_make', 'vehicle_model']
      );
    }
    
    // Pagination
    const totalCount = filtered.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);
    
    return {
      paginatedData,
      totalCount
    };
  }, [data.reservations, statusFilter, dateFilter, searchQuery, currentPage, searchInCachedData]);
  
  if (loadingStage === 'idle') {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-neutral-600">جاري تحميل بيانات الحجوزات...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">إدارة الحجوزات</h1>
              <p className="text-neutral-600 mb-4">إدارة ومتابعة حجوزات المركبات</p>
              
              {/* View Mode Selector */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/50 p-4 mb-6 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">عرض الحجوزات</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'calendar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('calendar')}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      التقويم
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      القائمة
                    </Button>
                    <Button
                      variant={viewMode === 'stats' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('stats')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      الإحصائيات
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/50 p-4 mb-6 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
                <div className="flex flex-col lg:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute right-3 top-3 h-4 w-4 text-neutral-400" />
                      <Input
                        placeholder="البحث بالعميل، رقم اللوحة، أو المركبة..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="كل الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="pending">معلقة</SelectItem>
                        <SelectItem value="confirmed">مؤكدة</SelectItem>
                        <SelectItem value="active">نشطة</SelectItem>
                        <SelectItem value="completed">مكتملة</SelectItem>
                        <SelectItem value="cancelled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="كل الأنواع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الأنواع</SelectItem>
                        <SelectItem value="short_term">قصيرة الأجل</SelectItem>
                        <SelectItem value="long_term">طويلة الأجل</SelectItem>
                        <SelectItem value="hourly">بالساعة</SelectItem>
                        <SelectItem value="daily">يومي</SelectItem>
                        <SelectItem value="weekly">أسبوعي</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      type="date"
                      placeholder="فلترة بالتاريخ"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-40"
                    />
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setTypeFilter("all");
                        setDateFilter("");
                      }}
                    >
                      إعادة تعيين
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Loading Progress */}
              {loadingStage !== 'idle' && (
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/50 p-4 mb-6 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-neutral-600">جاري تحميل البيانات</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-500">({loadingProgress}%)</span>
                      <div className="w-32 bg-neutral-200 rounded-full h-2">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${loadingProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Calendar View */}
              {viewMode === 'calendar' && (
                <ReservationsCalendar 
                  reservations={data.reservations || []}
                  loading={loadingStage === 'reservations'}
                />
              )}
              
              {/* List View */}
              {viewMode === 'list' && (
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/50 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">الإجراءات</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">رقم الحجز</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">العميل</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">المركبة</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">التاريخ</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">الحالة</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">السعر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.paginatedData.map((reservation: any) => (
                          <tr key={reservation.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedReservationId(reservation.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedReservationId(reservation.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm('هل أنت متأكد من حذف هذا الحجز؟')) {
                                      deleteReservation(reservation.id);
                                      invalidateCache();
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-sm">{reservation.reservation_number}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-neutral-200 rounded-full mb-1">
                                  {reservation.customers?.avatar_url ? (
                                    <img src={reservation.customers.avatar_url} alt={reservation.customers.name} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    <div className="w-full h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                      {reservation.customers?.name?.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{reservation.customers?.name}</div>
                                  <div className="text-xs text-neutral-500">{reservation.customers?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {reservation.vehicles && (
                                  <>
                                    <Car className="h-4 w-4 text-neutral-500" />
                                    <div className="text-sm">
                                      <div className="font-medium">{reservation.vehicles.plate_number}</div>
                                      <div className="text-xs text-neutral-500">{reservation.vehicles.make} {reservation.vehicles.model}</div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {new Date(reservation.start_date).toLocaleDateString('ar-SA')}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={statusColors[reservation.status] || "bg-neutral-500"}>
                                {statusLabels[reservation.status] || reservation.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(reservation.total_amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {totalCount > itemsPerPage && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
                      <div className="text-sm text-neutral-600">
                        عرض {startIndex + 1}-{Math.min(endIndex, filteredData.paginatedData.length)} من {filteredData.paginatedData.length} حجز
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          السابق
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          التالي
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Quick Navigation */}
        <MobileQuickNav
          isVisible={viewMode === 'list'}
          onClose={() => setViewMode('stats')}
        />
        
        {/* Side Panel */}
        {selectedReservationId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl mx-auto p-6 w-full max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-neutral-900">تفاصيل الحجز</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedReservationId(null)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Reservation Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-700 mb-1">معلومات الحجز</h3>
                    <div className="bg-neutral-50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">رقم الحجز:</span>
                        <span className="font-mono text-sm">RES-{selectedReservationId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">تاريخ البدء:</span>
                        <span className="text-sm">{data.reservations?.find(r => r.id === selectedReservationId)?.start_date ? new Date(data.reservations.find(r => r.id === selectedReservationId)?.start_date).toLocaleDateString('ar-SA') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">تاريخ الانتهاء:</span>
                        <span className="text-sm">{data.reservations?.find(r => r.id === selectedReservationId)?.end_date ? new Date(data.reservations.find(r => r.id === selectedReservationId)?.end_date).toLocaleDateString('ar-SA') : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من تأكيد هذا الحجز؟')) {
                      completeReservationStatus(selectedReservationId);
                      invalidateCache();
                      setSelectedReservationId(null);
                    }
                  }}
                >
                  تأكيد الحجز
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
                      cancelReservationStatus(selectedReservationId);
                      invalidateCache();
                      setSelectedReservationId(null);
                    }
                  }}
                >
                  إلغاء الحجز
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Reservation Form Modal */}
        {showReservationForm && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><LoadingSpinner size="lg" /></div>}>
            <ReservationForm
              reservationId={selectedReservationId}
              vehicleId={selectedVehicleId}
              onClose={() => {
                setShowReservationForm(false);
                setSelectedReservationId(undefined);
                setSelectedVehicleId(undefined);
                if (selectedReservationId) {
                  setSearchParams(prev => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set('reservation', selectedReservationId);
                    return newParams;
                  }, { replace: true });
                }
                if (selectedVehicleId) {
                  setSearchParams(prev => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set('vehicle', selectedVehicleId);
                    return newParams;
                  }, { replace: true });
                }
              }}
              onSuccess={() => {
                setShowReservationForm(false);
                setSelectedReservationId(undefined);
                setSelectedVehicleId(undefined);
                invalidateCache();
              }}
            />
          </Suspense>
        )}
      </div>
      
      {/* Help and Assistant */}
      <PageHelp 
        content="دليل استخدام صفحة الحجوزات"
        title="مساعد صفحة الحجوزات"
      />
      <FloatingAssistant />
    </div>
  );
}