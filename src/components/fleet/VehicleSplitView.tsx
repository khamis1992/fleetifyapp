/**
 * Vehicle Split View Component
 * عرض مقسم للمركبات - قائمة على اليمين وتفاصيل على اليسار
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Car,
  Fuel,
  Gauge,
  Calendar,
  FileText,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  MapPin,
  User,
  Clock,
  DollarSign,
  Settings,
  Image as ImageIcon,
} from 'lucide-react';
import type { Vehicle } from '@/hooks/useVehicles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface VehicleSplitViewProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  companyId: string | null;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicle: Vehicle) => void;
}

export const VehicleSplitView: React.FC<VehicleSplitViewProps> = ({
  vehicles,
  isLoading,
  companyId,
  onEditVehicle,
  onDeleteVehicle,
}) => {
  const navigate = useNavigate();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter vehicles based on search
  const filteredVehicles = useMemo(() => {
    if (!searchTerm.trim()) return vehicles;
    
    const term = searchTerm.toLowerCase();
    return vehicles.filter(vehicle => {
      const name = `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`;
      return name.toLowerCase().includes(term) ||
        vehicle.plate_number?.toLowerCase().includes(term) ||
        vehicle.vin?.toLowerCase().includes(term);
    });
  }, [vehicles, searchTerm]);

  // Fetch contracts for selected vehicle
  const { data: contracts = [] } = useQuery({
    queryKey: ['vehicle-contracts-split', selectedVehicle?.id, companyId],
    queryFn: async () => {
      if (!selectedVehicle?.id || !companyId) return [];
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          start_date,
          end_date,
          total_amount,
          customers:customer_id (
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('vehicle_id', selectedVehicle.id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedVehicle?.id && !!companyId,
  });

  // Fetch maintenance records
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['vehicle-maintenance-split', selectedVehicle?.id],
    queryFn: async () => {
      if (!selectedVehicle?.id) return [];
      
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('vehicle_id', selectedVehicle.id)
        .order('scheduled_date', { ascending: false })
        .limit(5);
      
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedVehicle?.id,
  });

  // Calculate revenue
  const { data: revenue } = useQuery({
    queryKey: ['vehicle-revenue-split', selectedVehicle?.id, companyId],
    queryFn: async () => {
      if (!selectedVehicle?.id || !companyId) return null;
      
      const { data, error } = await supabase
        .from('contracts')
        .select('total_amount')
        .eq('vehicle_id', selectedVehicle.id)
        .eq('company_id', companyId);
      
      if (error) return null;
      
      const total = data?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      return { total, count: data?.length || 0 };
    },
    enabled: !!selectedVehicle?.id && !!companyId,
  });

  // Helper functions
  const getVehicleName = (vehicle: Vehicle) => {
    return `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() || 'مركبة';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-700 border-green-200">متاحة</Badge>;
      case 'rented':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">مؤجرة</Badge>;
      case 'maintenance':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">صيانة</Badge>;
      case 'out_of_service':
        return <Badge className="bg-red-100 text-red-700 border-red-200">خارج الخدمة</Badge>;
      case 'reserved':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">محجوزة</Badge>;
      case 'accident':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">حادث</Badge>;
      case 'stolen':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">مسروقة</Badge>;
      case 'police_station':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">في المخفر</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'rented': return 'bg-blue-500';
      case 'maintenance': return 'bg-amber-500';
      case 'out_of_service': return 'bg-red-500';
      case 'reserved': return 'bg-blue-500';
      case 'accident': return 'bg-rose-600';
      case 'stolen': return 'bg-slate-700';
      case 'police_station': return 'bg-orange-600';
      default: return 'bg-gray-500';
    }
  };

  const handleCreateContract = () => {
    if (selectedVehicle) {
      navigate('/contracts', {
        state: {
          selectedVehicleId: selectedVehicle.id,
          autoOpen: true
        }
      });
      toast.success(`جاري إنشاء عقد للمركبة: ${selectedVehicle.plate_number}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-350px)] gap-4">
        <div className="w-80 space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-350px)] gap-4 bg-[#f0efed] rounded-2xl overflow-hidden">
      {/* Vehicle List - Right Side */}
      <div className="w-80 bg-white rounded-2xl shadow-sm flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-neutral-100">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="بحث عن مركبة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 border-neutral-200 focus:border-coral-500 focus:ring-coral-500 rounded-xl"
            />
          </div>
        </div>

        {/* Vehicle List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <Car className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا توجد مركبات</p>
              </div>
            ) : (
              filteredVehicles.map((vehicle, index) => (
                <motion.button
                  key={vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={cn(
                    "w-full p-3 rounded-xl text-right transition-all",
                    "hover:bg-neutral-50 group",
                    selectedVehicle?.id === vehicle.id
                      ? "bg-coral-50 border-2 border-coral-500"
                      : "border-2 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Vehicle Image */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100">
                      {vehicle.images && vehicle.images[0] ? (
                        <img
                          src={vehicle.images[0]}
                          alt={getVehicleName(vehicle)}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="w-6 h-6 text-neutral-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-neutral-900 truncate text-sm">
                          {getVehicleName(vehicle)}
                        </p>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {vehicle.plate_number}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn("w-2 h-2 rounded-full", getStatusColor(vehicle.status || 'available'))} />
                        <span className="text-xs text-neutral-500">
                          {vehicle.status === 'available' ? 'متاحة' : 
                           vehicle.status === 'rented' ? 'مؤجرة' : 
                           vehicle.status === 'maintenance' ? 'صيانة' : 'خارج الخدمة'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Vehicle Count */}
        <div className="p-3 border-t border-neutral-100 text-center">
          <p className="text-sm text-neutral-500">
            {filteredVehicles.length} مركبة
          </p>
        </div>
      </div>

      {/* Vehicle Details - Left Side */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedVehicle ? (
            <motion.div
              key={selectedVehicle.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* Header with Image */}
                  <div className="flex items-start gap-6 mb-6">
                    {/* Vehicle Image */}
                    <div className="w-32 h-24 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0">
                      {selectedVehicle.images && selectedVehicle.images[0] ? (
                        <img
                          src={selectedVehicle.images[0]}
                          alt={getVehicleName(selectedVehicle)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="w-12 h-12 text-neutral-300" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-neutral-900">
                            {getVehicleName(selectedVehicle)}
                          </h2>
                          <p className="text-neutral-500 text-lg">
                            {selectedVehicle.plate_number}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(selectedVehicle.status || 'available')}
                            {selectedVehicle.type && (
                              <Badge variant="outline" className="border-neutral-200">
                                {selectedVehicle.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={handleCreateContract}
                          className="bg-coral-500 hover:bg-coral-600 text-white rounded-xl shadow-md"
                          style={{ boxShadow: '0 4px 14px rgba(232, 90, 79, 0.3)' }}
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          إنشاء عقد
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <Card className="bg-neutral-50 border-0 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <Gauge className="w-5 h-5 text-coral-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-neutral-900">
                          {selectedVehicle.current_mileage?.toLocaleString('ar-SA') || 0}
                        </p>
                        <p className="text-xs text-neutral-500">كم</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-neutral-50 border-0 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <FileText className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-neutral-900">
                          {revenue?.count || 0}
                        </p>
                        <p className="text-xs text-neutral-500">عقود</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-neutral-50 border-0 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-green-600">
                          {selectedVehicle.daily_rate || 0}
                        </p>
                        <p className="text-xs text-neutral-500">ر.ق/يوم</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-neutral-50 border-0 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-neutral-900">
                          {revenue?.total?.toLocaleString('ar-SA') || 0}
                        </p>
                        <p className="text-xs text-neutral-500">إجمالي الإيرادات</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vehicle Details */}
                  <Card className="mb-6 border-0 bg-neutral-50 rounded-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-neutral-900">تفاصيل المركبة</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-coral-100 flex items-center justify-center">
                          <Car className="w-5 h-5 text-coral-600" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">رقم الهيكل (VIN)</p>
                          <p className="font-medium text-neutral-900 text-sm" dir="ltr">
                            {selectedVehicle.vin || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Fuel className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">نوع الوقود</p>
                          <p className="font-medium text-neutral-900">
                            {selectedVehicle.fuel_type === 'petrol' ? 'بنزين' :
                             selectedVehicle.fuel_type === 'diesel' ? 'ديزل' :
                             selectedVehicle.fuel_type === 'electric' ? 'كهربائي' :
                             selectedVehicle.fuel_type === 'hybrid' ? 'هايبرد' : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <Settings className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">ناقل الحركة</p>
                          <p className="font-medium text-neutral-900">
                            {selectedVehicle.transmission === 'automatic' ? 'أوتوماتيك' :
                             selectedVehicle.transmission === 'manual' ? 'يدوي' : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">سنة الصنع</p>
                          <p className="font-medium text-neutral-900">
                            {selectedVehicle.year || '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Contracts */}
                  <Card className="mb-6 border-0 bg-neutral-50 rounded-xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg text-neutral-900">آخر العقود</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/fleet/vehicles/${selectedVehicle.id}`)}
                        className="text-coral-600 hover:text-coral-700 hover:bg-coral-50"
                      >
                        عرض الكل
                        <ChevronLeft className="w-4 h-4 mr-1" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {contracts.length === 0 ? (
                        <div className="text-center py-6 text-neutral-400">
                          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">لا توجد عقود</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contracts.map((contract: any) => (
                            <div
                              key={contract.id}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                                  <User className="w-5 h-5 text-neutral-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-900">
                                    #{contract.contract_number}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {contract.customers?.customer_type === 'individual'
                                      ? `${contract.customers?.first_name || ''} ${contract.customers?.last_name || ''}`
                                      : contract.customers?.company_name || '-'}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                className={cn(
                                  "rounded-full",
                                  contract.status === 'active' && "bg-green-100 text-green-700",
                                  contract.status === 'completed' && "bg-blue-100 text-blue-700",
                                  contract.status === 'cancelled' && "bg-red-100 text-red-700"
                                )}
                              >
                                {contract.status === 'active' ? 'نشط' : 
                                 contract.status === 'completed' ? 'مكتمل' : 'ملغي'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Maintenance Records */}
                  <Card className="border-0 bg-neutral-50 rounded-xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg text-neutral-900">سجل الصيانة</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/fleet/vehicles/${selectedVehicle.id}?tab=maintenance`)}
                        className="text-coral-600 hover:text-coral-700 hover:bg-coral-50"
                      >
                        عرض الكل
                        <ChevronLeft className="w-4 h-4 mr-1" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {maintenanceRecords.length === 0 ? (
                        <div className="text-center py-6 text-neutral-400">
                          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">لا توجد سجلات صيانة</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {maintenanceRecords.slice(0, 3).map((record: any) => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                  <Wrench className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-900">
                                    {record.maintenance_type}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {record.scheduled_date 
                                      ? format(new Date(record.scheduled_date), 'dd MMM yyyy', { locale: ar })
                                      : '-'}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                className={cn(
                                  "rounded-full",
                                  record.status === 'completed' && "bg-green-100 text-green-700",
                                  record.status === 'scheduled' && "bg-blue-100 text-blue-700",
                                  record.status === 'in_progress' && "bg-amber-100 text-amber-700"
                                )}
                              >
                                {record.status === 'completed' ? 'مكتملة' : 
                                 record.status === 'scheduled' ? 'مجدولة' : 'جارية'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onEditVehicle(selectedVehicle)}
                    className="border-neutral-200 hover:border-coral-500 hover:text-coral-600 rounded-xl"
                  >
                    <Edit className="w-4 h-4 ml-2" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onDeleteVehicle(selectedVehicle)}
                    className="border-neutral-200 hover:border-red-500 hover:text-red-600 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </Button>
                </div>
                <Button
                  onClick={() => navigate(`/fleet/vehicles/${selectedVehicle.id}`)}
                  className="bg-coral-500 hover:bg-coral-600 text-white rounded-xl"
                >
                  عرض الصفحة الكاملة
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center">
                <Car className="w-20 h-20 mx-auto mb-4 text-neutral-200" />
                <h3 className="text-xl font-semibold text-neutral-400 mb-2">اختر مركبة</h3>
                <p className="text-neutral-400">اختر مركبة من القائمة لعرض تفاصيلها</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VehicleSplitView;

