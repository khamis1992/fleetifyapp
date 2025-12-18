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
  Wrench, 
  AlertTriangle,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { useVehicleMaintenance } from "@/hooks/useVehicles";
import { useMaintenanceVehicles } from "@/hooks/useMaintenanceVehicles";
import { useVehicleStatusUpdate, useCompleteMaintenanceStatus, useScheduleMaintenanceStatus } from "@/hooks/useVehicleStatusIntegration";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useDeleteVehicleMaintenance, useUpdateVehicleMaintenance } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PageHelp } from "@/components/help";
import { MaintenancePageHelpContent } from "@/components/help/content";
import { FloatingAssistant } from "@/components/employee-assistant";
import { MaintenanceSmartDashboard } from "@/components/fleet/MaintenanceSmartDashboard";
import { MaintenanceAlertsPanel } from "@/components/fleet/MaintenanceAlertsPanel";
import { MaintenanceSidePanel } from "@/components/fleet/MaintenanceSidePanel";

// Lazy load components - only load what's needed
const MaintenanceForm = lazy(() => 
  import("@/components/fleet/MaintenanceForm").then(m => ({ default: m.MaintenanceForm }))
);

// Status mapping for the new design
const statusColors = {
  pending: "bg-green-100 text-green-700 border-green-200",
  in_progress: "bg-amber-500",
  completed: "bg-neutral-500",
  cancelled: "bg-coral-500"
};

const priorityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-coral-100 text-coral-700",
  urgent: "bg-red-100 text-red-700"
};

const priorityLabels = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية", 
  urgent: "عاجلة"
};

const maintenanceTypeIcons = {
  routine: RefreshCw,
  repair: Wrench,
  emergency: AlertTriangle,
  preventive: ShieldCheck
};

const maintenanceTypeLabels = {
  routine: "صيانة دورية",
  repair: "إصلاح",
  emergency: "صيانة طارئة",
  preventive: "صيانة وقائية",
  maintenance: "صيانة"
};

const maintenanceTypeColors = {
  routine: "text-blue-600",
  repair: "text-purple-600",
  emergency: "text-coral-600",
  preventive: "text-green-600"
};

export default function Maintenance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Read vehicle parameter from URL
  useEffect(() => {
    const vehicleParam = searchParams.get('vehicle');
    if (vehicleParam) {
      setSelectedVehicleId(vehicleParam);
      setShowMaintenanceForm(true);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('vehicle');
        return newParams;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  // Fetch data with optimized queries
  const { data: maintenanceRecords, isLoading: maintenanceLoading } = useVehicleMaintenance(undefined, {
    limit: 50,
    enabled: true // Only fetch what's needed
  });
  
  const { data: maintenanceVehicles, isLoading: maintenanceVehiclesLoading } = useMaintenanceVehicles({
    limit: 20, // Reduced limit for better performance
    enabled: true // Only fetch what's needed
  });
  
  const { formatCurrency } = useCurrencyFormatter();
  const completeMaintenanceStatus = useCompleteMaintenanceStatus();
  const vehicleStatusUpdate = useVehicleStatusUpdate();
  const scheduleMaintenanceStatus = useScheduleMaintenanceStatus();
  const deleteMaintenance = useDeleteVehicleMaintenance();
  const updateMaintenance = useUpdateVehicleMaintenance();
  
  // Optimized filtering with useMemo
  const filteredRecords = useMemo(() => {
    if (!maintenanceRecords) return [];
    
    return maintenanceRecords.filter(record => {
      const matchesSearch = !searchQuery || 
        record.maintenance_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.maintenance_type?.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesType = typeFilter === "all" || record.maintenance_type === typeFilter;
      const matchesPriority = priorityFilter === "all" || record.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [maintenanceRecords, searchQuery, statusFilter, typeFilter, priorityFilter]);
  
  // Add vehicles in maintenance status ONLY if they don't have a maintenance record
  const displayRecords = useMemo(() => {
    const records: any[] = [...filteredRecords];
    
    // Get vehicle IDs that already have maintenance records
    const vehiclesWithMaintenance = new Set(
      maintenanceRecords?.map(r => r.vehicle_id).filter(Boolean) || []
    );
    
  // Add vehicles in maintenance status ONLY if they don't have any maintenance records
  if (maintenanceVehicles && !vehiclesWithMaintenance.size) {
    maintenanceVehicles.forEach(vehicle => {
      if (vehiclesWithMaintenance.has(vehicle.id)) {
        return;
      }
      
      const matchesSearch = !searchQuery || 
        vehicle.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Always show vehicles if searching or in specific status, regardless of maintenance records
      if (matchesSearch || statusFilter === "all" || statusFilter === "in_progress" || statusFilter === "completed") {
        records.push({
          id: `vehicle-${vehicle.id}`,
          maintenance_number: `VEH-${vehicle.plate_number}`,
          maintenance_type: 'maintenance',
          status: statusFilter === "all" ? 'available' : statusFilter === "completed" ? 'completed' : 'in_progress',
          priority: statusFilter === "completed" ? 'low' : 'medium',
          vehicle_id: vehicle.id,
          vehicles: {
            plate_number: vehicle.plate_number,
            make: vehicle.make,
            model: vehicle.model
          },
        });
      }
    });
  }
    
    return records;
  }, [filteredRecords, maintenanceVehicles, searchQuery, statusFilter]);
  
  // Pagination
  const totalPages = Math.ceil(displayRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = displayRecords.slice(startIndex, endIndex);
  
  // Show smart dashboard for overview, detailed table for filtered views
  const showSmartDashboard = statusFilter === "all" && typeFilter === "all" && priorityFilter === "all" && !searchQuery;
  
  if (maintenanceLoading) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-neutral-600">جاري تحميل بيانات الصيانة...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#f0efed]">
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">إدارة الصيانة</h1>
              <p className="text-neutral-600">إدارة ومتابعة طلبات الصيانة للأسطول</p>
            </div>
            
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="البحث برقم الطلب، المركبة..."
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
                      <SelectItem value="in_progress">قيد المعالجة</SelectItem>
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
                      <SelectItem value="routine">صيانة دورية</SelectItem>
                      <SelectItem value="repair">إصلاح</SelectItem>
                      <SelectItem value="emergency">صيانة طارئة</SelectItem>
                      <SelectItem value="preventive">صيانة وقائية</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setTypeFilter("all");
                      setPriorityFilter("all");
                    }}
                  >
                    <RotateCcw className="h-4 w-4 ml-2" />
                    إعادة تعيين
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Smart Dashboard for Overview */}
            {showSmartDashboard ? (
              <MaintenanceSmartDashboard />
            ) : (
              /* Detailed Table for Filtered Views */
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">الإجراءات</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">رقم الطلب</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">نوع الصيانة</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">المركبة</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">الحالة</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">الأولوية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((record: any) => (
                        <tr key={record.id} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer">
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedMaintenance(record)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                                    deleteMaintenance(record.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{record.maintenance_number}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {React.createElement(maintenanceTypeIcons[record.maintenance_type] || Wrench, { className: "h-4 w-4" })}
                              <span className={maintenanceTypeColors[record.maintenance_type] || "text-neutral-600"}>
                                {maintenanceTypeLabels[record.maintenance_type] || "صيانة"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {record.vehicles ? (
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-neutral-500" />
                                <div>
                                  <div className="text-sm font-medium">{record.vehicles.plate_number}</div>
                                  <div className="text-xs text-neutral-500">{record.vehicles.make} {record.vehicles.model}</div>
                                </div>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={statusColors[record.status] || "bg-neutral-500"}>
                              {record.status === 'pending' && 'معلقة'}
                              {record.status === 'in_progress' && 'قيد المعالجة'}
                              {record.status === 'completed' && 'مكتملة'}
                              {record.status === 'cancelled' && 'ملغاة'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={priorityColors[record.priority] || "bg-neutral-500"}>
                              {priorityLabels[record.priority] || "عادية"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
                    <div className="text-sm text-neutral-600">
                      عرض {startIndex + 1}-{Math.min(endIndex, displayRecords.length)} من {displayRecords.length} سجل
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
        
        {/* Side Panels */}
        <MaintenanceSidePanel 
          isOpen={sidePanelOpen}
          onClose={() => setSidePanelOpen(false)}
          selectedMaintenance={selectedMaintenance}
          onMaintenanceUpdate={() => {
            setSelectedMaintenance(null);
            // Refresh data
            window.location.reload();
          }}
        />
        
        <MaintenanceAlertsPanel />
        
        {/* Maintenance Form Modal */}
        {showMaintenanceForm && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><LoadingSpinner size="lg" /></div>}>
            <MaintenanceForm
              vehicleId={selectedVehicleId}
              onClose={() => {
                setShowMaintenanceForm(false);
                setSelectedVehicleId(undefined);
                if (selectedVehicleId) {
                  setSearchParams(prev => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set('vehicle', selectedVehicleId);
                    return newParams;
                  });
                }
              }}
              onSuccess={() => {
                setShowMaintenanceForm(false);
                setSelectedVehicleId(undefined);
                // Refresh data
                window.location.reload();
              }}
            />
          </Suspense>
        )}
      </div>
      
      {/* Help and Assistant */}
      <PageHelp 
        content={MaintenancePageHelpContent}
        title="مساعد صفحة الصيانة"
      />
      <FloatingAssistant />
    </div>
  );
}