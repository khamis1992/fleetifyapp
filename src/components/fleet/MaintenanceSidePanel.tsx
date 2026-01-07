/**
 * لوحة تفاصيل الصيانة الجانبية
 * تصميم Bento Dashboard متوافق مع الداشبورد الرئيسية
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Car, 
  Wrench, 
  Calendar,
  Clock,
  User,
  FileText,
  Banknote,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMaintenanceDetails, MaintenanceDetailsData } from '@/hooks/useMaintenanceDetails';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface MaintenanceSidePanelProps {
  maintenanceId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (maintenance: MaintenanceDetailsData) => void;
  onDelete?: (maintenanceId: string, vehicleId?: string) => void;
  onStatusChange?: (maintenanceId: string, vehicleId: string, currentStatus: string) => void;
}

type TabType = 'overview' | 'vehicle' | 'vendor' | 'history' | 'costs';

const statusColors: Record<string, string> = {
  pending: 'bg-green-100 text-green-700 border-green-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  cancelled: 'bg-rose-100 text-coral-700 border-rose-200',
};

const statusLabels: Record<string, string> = {
  pending: 'نشط',
  in_progress: 'قيد المعالجة',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const priorityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-coral-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityLabels: Record<string, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const maintenanceTypeIcons: Record<string, React.ElementType> = {
  routine: RefreshCw,
  repair: Wrench,
  emergency: AlertTriangle,
  preventive: ShieldCheck,
};

const maintenanceTypeLabels: Record<string, string> = {
  routine: 'صيانة دورية',
  repair: 'إصلاح',
  emergency: 'صيانة طارئة',
  preventive: 'صيانة وقائية',
};

export function MaintenanceSidePanel({
  maintenanceId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: MaintenanceSidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { data: maintenance, isLoading } = useMaintenanceDetails(maintenanceId);
  const { formatCurrency } = useCurrencyFormatter();

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: FileText },
    { id: 'vehicle', label: 'المركبة', icon: Car },
    { id: 'vendor', label: 'المورد', icon: Building2 },
    { id: 'history', label: 'السجل', icon: History },
    { id: 'costs', label: 'التكاليف', icon: Banknote },
  ];

  const TypeIcon = maintenance?.maintenance_type 
    ? maintenanceTypeIcons[maintenance.maintenance_type] || Wrench
    : Wrench;

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
        )}
      </AnimatePresence>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[550px] bg-neutral-50 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-rose-500 border-t-transparent" />
              </div>
            ) : maintenance ? (
              <>
                {/* Header */}
                <div className="bg-white border-b border-neutral-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-100 rounded-xl">
                        <TypeIcon className="w-6 h-6 text-coral-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-neutral-900">
                          طلب #{maintenance.maintenance_number || maintenance.id.slice(0, 6)}
                        </h2>
                        <p className="text-sm text-neutral-500">
                          {maintenanceTypeLabels[maintenance.maintenance_type] || maintenance.maintenance_type}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-neutral-500" />
                    </button>
                  </div>

                  {/* Status & Priority */}
                  <div className="flex items-center gap-2">
                    <Badge className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium border",
                      statusColors[maintenance.status]
                    )}>
                      {statusLabels[maintenance.status]}
                    </Badge>
                    <Badge className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      priorityColors[maintenance.priority]
                    )}>
                      أولوية {priorityLabels[maintenance.priority]}
                    </Badge>
                    {maintenance.vehicle && (
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-mono">
                        {maintenance.vehicle.plate_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border-b border-neutral-200 px-4 flex gap-1 overflow-x-auto">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                        activeTab === tab.id
                          ? "border-rose-500 text-coral-600"
                          : "border-transparent text-neutral-500 hover:text-neutral-700"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeTab === 'overview' && (
                    <>
                      {/* معلومات أساسية */}
                      <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
                        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-rose-500" />
                          معلومات الصيانة
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-neutral-50 rounded-xl">
                            <p className="text-[11px] text-neutral-500 mb-1">تاريخ البدء</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {maintenance.scheduled_date 
                                ? new Date(maintenance.scheduled_date).toLocaleDateString('en-US')
                                : 'غير محدد'}
                            </p>
                          </div>
                          <div className="p-3 bg-neutral-50 rounded-xl">
                            <p className="text-[11px] text-neutral-500 mb-1">تاريخ الإنتهاء</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {maintenance.completion_date 
                                ? new Date(maintenance.completion_date).toLocaleDateString('en-US')
                                : 'غير محدد'}
                            </p>
                          </div>
                          <div className="p-3 bg-neutral-50 rounded-xl">
                            <p className="text-[11px] text-neutral-500 mb-1">التكلفة المقدرة</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {formatCurrency(maintenance.estimated_cost || 0)}
                            </p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-xl">
                            <p className="text-[11px] text-green-600 mb-1">التكلفة الفعلية</p>
                            <p className="text-sm font-bold text-green-700">
                              {formatCurrency(maintenance.actual_cost || 0)}
                            </p>
                          </div>
                        </div>

                        {/* الوصف */}
                        {maintenance.description && (
                          <div className="mt-4 pt-4 border-t border-neutral-100">
                            <p className="text-xs text-neutral-500 mb-2">الوصف</p>
                            <p className="text-sm text-neutral-700 leading-relaxed">
                              {maintenance.description}
                            </p>
                          </div>
                        )}

                        {/* الفني */}
                        {maintenance.technician_name && (
                          <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {maintenance.technician_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs text-neutral-500">الفني المسؤول</p>
                              <p className="text-sm font-semibold text-neutral-900">
                                {maintenance.technician_name}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ملاحظات */}
                      {maintenance.notes && (
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
                          <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            ملاحظات
                          </h3>
                          <p className="text-sm text-neutral-700 leading-relaxed">
                            {maintenance.notes}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'vehicle' && maintenance.vehicle && (
                    <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
                      <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                        <Car className="w-4 h-4 text-blue-500" />
                        معلومات المركبة
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <Car className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-blue-900 font-mono">
                              {maintenance.vehicle.plate_number}
                            </p>
                            <p className="text-sm text-blue-700">
                              {maintenance.vehicle.make} {maintenance.vehicle.model} {maintenance.vehicle.year}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {maintenance.vehicle.color && (
                            <div className="p-3 bg-neutral-50 rounded-xl">
                              <p className="text-[11px] text-neutral-500 mb-1">اللون</p>
                              <p className="text-sm font-semibold text-neutral-900">
                                {maintenance.vehicle.color}
                              </p>
                            </div>
                          )}
                          {maintenance.vehicle.vin && (
                            <div className="p-3 bg-neutral-50 rounded-xl">
                              <p className="text-[11px] text-neutral-500 mb-1">رقم الشاسيه</p>
                              <p className="text-sm font-semibold text-neutral-900 font-mono text-xs">
                                {maintenance.vehicle.vin}
                              </p>
                            </div>
                          )}
                          {maintenance.vehicle.current_mileage && (
                            <div className="p-3 bg-neutral-50 rounded-xl">
                              <p className="text-[11px] text-neutral-500 mb-1">عداد المسافة</p>
                              <p className="text-sm font-semibold text-neutral-900">
                                {maintenance.vehicle.current_mileage.toLocaleString('en-US')} كم
                              </p>
                            </div>
                          )}
                          <div className="p-3 bg-neutral-50 rounded-xl">
                            <p className="text-[11px] text-neutral-500 mb-1">حالة المركبة</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {maintenance.vehicle.status === 'maintenance' ? 'في الصيانة' : 
                               maintenance.vehicle.status === 'available' ? 'متاحة' :
                               maintenance.vehicle.status === 'rented' ? 'مؤجرة' : 
                               maintenance.vehicle.status}
                            </p>
                          </div>
                        </div>

                        {/* إحصائيات المركبة */}
                        <div className="pt-4 border-t border-neutral-100">
                          <p className="text-xs text-neutral-500 mb-3">إحصائيات الصيانة للمركبة</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-rose-50 rounded-xl text-center">
                              <p className="text-2xl font-bold text-coral-600">
                                {maintenance.stats.totalMaintenanceForVehicle}
                              </p>
                              <p className="text-xs text-coral-700">إجمالي الصيانات</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl text-center">
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(maintenance.stats.totalCostForVehicle)}
                              </p>
                              <p className="text-xs text-green-700">إجمالي التكاليف</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'vendor' && (
                    <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
                      <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-500" />
                        معلومات المورد
                      </h3>
                      
                      {maintenance.vendor ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
                            <div className="p-3 bg-purple-100 rounded-lg">
                              <Building2 className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-lg font-bold text-purple-900">
                                {maintenance.vendor.name}
                              </p>
                              {maintenance.vendor.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        "w-4 h-4",
                                        i < maintenance.vendor!.rating! 
                                          ? "text-amber-400 fill-amber-400"
                                          : "text-neutral-300"
                                      )}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            {maintenance.vendor.contact_person && (
                              <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-700">
                                  {maintenance.vendor.contact_person}
                                </span>
                              </div>
                            )}
                            {maintenance.vendor.phone && (
                              <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-700 font-mono">
                                  {maintenance.vendor.phone}
                                </span>
                              </div>
                            )}
                            {maintenance.vendor.email && (
                              <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-700">
                                  {maintenance.vendor.email}
                                </span>
                              </div>
                            )}
                            {maintenance.vendor.address && (
                              <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-700">
                                  {maintenance.vendor.address}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Building2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                          <p className="text-neutral-500">لم يتم تحديد مورد</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
                      <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-500" />
                        سجل الصيانة للمركبة
                      </h3>
                      
                      {maintenance.vehicleMaintenanceHistory.length > 0 ? (
                        <div className="space-y-3">
                          {maintenance.vehicleMaintenanceHistory.map((record, index) => (
                            <motion.div
                              key={record.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn(
                                "p-3 rounded-xl border",
                                record.id === maintenance.id 
                                  ? "bg-rose-50 border-rose-200"
                                  : "bg-neutral-50 border-neutral-100"
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-neutral-900">
                                  {maintenanceTypeLabels[record.maintenance_type] || record.maintenance_type}
                                </span>
                                <Badge className={cn(
                                  "text-xs",
                                  statusColors[record.status]
                                )}>
                                  {statusLabels[record.status]}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-neutral-500">
                                <span>
                                  {record.scheduled_date 
                                    ? new Date(record.scheduled_date).toLocaleDateString('en-US')
                                    : '-'}
                                </span>
                                <span className="font-semibold text-neutral-700">
                                  {formatCurrency(record.actual_cost || 0)}
                                </span>
                              </div>
                              {record.id === maintenance.id && (
                                <p className="text-xs text-coral-600 mt-2">← الطلب الحالي</p>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <History className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                          <p className="text-neutral-500">لا يوجد سجل صيانة سابق</p>
                        </div>
                      )}

                      {/* معلومات إضافية */}
                      {maintenance.stats.lastMaintenanceDate && (
                        <div className="mt-4 pt-4 border-t border-neutral-100">
                          <p className="text-xs text-neutral-500">
                            آخر صيانة: {new Date(maintenance.stats.lastMaintenanceDate).toLocaleDateString('en-US')}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            معدل الصيانة السنوي: {maintenance.stats.maintenanceFrequency} صيانة/سنة
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'costs' && (
                    <div className="space-y-4">
                      {/* ملخص التكاليف */}
                      <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
                        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-green-500" />
                          ملخص التكاليف
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50 rounded-xl text-center">
                            <Banknote className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <p className="text-xs text-blue-600 mb-1">التكلفة المقدرة</p>
                            <p className="text-xl font-bold text-blue-700">
                              {formatCurrency(maintenance.estimated_cost || 0)}
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-xl text-center">
                            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                            <p className="text-xs text-green-600 mb-1">التكلفة الفعلية</p>
                            <p className="text-xl font-bold text-green-700">
                              {formatCurrency(maintenance.actual_cost || 0)}
                            </p>
                          </div>
                        </div>

                        {/* الفرق */}
                        {maintenance.estimated_cost && maintenance.actual_cost && (
                          <div className="mt-4 pt-4 border-t border-neutral-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-neutral-500">الفرق</span>
                              <span className={cn(
                                "text-sm font-bold",
                                maintenance.actual_cost > maintenance.estimated_cost 
                                  ? "text-coral-600" 
                                  : "text-green-600"
                              )}>
                                {maintenance.actual_cost > maintenance.estimated_cost ? '+' : '-'}
                                {formatCurrency(Math.abs(maintenance.actual_cost - maintenance.estimated_cost))}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* إحصائيات المركبة */}
                      <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
                        <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-500" />
                          إحصائيات تكاليف المركبة
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                            <span className="text-sm text-neutral-600">إجمالي تكاليف الصيانة</span>
                            <span className="text-sm font-bold text-neutral-900">
                              {formatCurrency(maintenance.stats.totalCostForVehicle)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                            <span className="text-sm text-neutral-600">عدد الصيانات</span>
                            <span className="text-sm font-bold text-neutral-900">
                              {maintenance.stats.totalMaintenanceForVehicle}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                            <span className="text-sm text-neutral-600">متوسط التكلفة</span>
                            <span className="text-sm font-bold text-neutral-900">
                              {maintenance.stats.totalMaintenanceForVehicle > 0
                                ? formatCurrency(maintenance.stats.totalCostForVehicle / maintenance.stats.totalMaintenanceForVehicle)
                                : formatCurrency(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="bg-white border-t border-neutral-200 p-4 flex gap-3">
                  <Button
                    onClick={() => onEdit?.(maintenance)}
                    className="flex-1 bg-rose-500 hover:bg-coral-600 text-white rounded-xl py-3"
                  >
                    <Edit className="w-4 h-4 ml-2" />
                    تعديل
                  </Button>
                  {maintenance.status !== 'completed' && maintenance.status !== 'cancelled' && (
                    <Button
                      onClick={() => onStatusChange?.(
                        maintenance.id,
                        maintenance.vehicle?.id || '',
                        maintenance.status
                      )}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3"
                    >
                      <CheckCircle className="w-4 h-4 ml-2" />
                      {maintenance.status === 'pending' ? 'بدء الصيانة' : 'إكمال الصيانة'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => onDelete?.(maintenance.id, maintenance.vehicle?.id)}
                    className="px-4 py-3 rounded-xl border-rose-200 text-coral-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <AlertTriangle className="w-16 h-16 text-neutral-300 mb-4" />
                <p className="text-neutral-500 text-center">لا توجد بيانات الصيانة</p>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="mt-4"
                >
                  إغلاق
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

