/**
 * VehicleSidePanel - لوحة جانبية لعرض تفاصيل المركبة
 * بنمط Bento Dashboard متوافق مع ألوان الداشبورد الرئيسية
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useVehicleDetails } from '@/hooks/useVehicleDetails';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  X,
  Car,
  User,
  FileText,
  Wrench,
  AlertTriangle,
  Shield,
  Calendar,
  MapPin,
  Gauge,
  Fuel,
  DollarSign,
  Clock,
  ChevronLeft,
  Plus,
  Eye,
  Edit3,
  Phone,
  Mail,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Trash2,
  ClipboardEdit,
} from 'lucide-react';
import { UpdateVehicleRegistrationDialog } from './UpdateVehicleRegistrationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ===== Health Score Display =====
const HealthScoreDisplay: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { text: 'text-green-600', bg: 'bg-green-500', label: 'ممتاز' };
    if (s >= 60) return { text: 'text-blue-600', bg: 'bg-blue-500', label: 'جيد' };
    if (s >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'متوسط' };
    return { text: 'text-red-600', bg: 'bg-red-500', label: 'يحتاج تحسين' };
  };

  const scoreStyle = getScoreColor(score);
  const circumference = 2 * Math.PI * 30;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="32" cy="32" r="30" stroke="#e5e7eb" strokeWidth="6" fill="none" />
          <circle
            cx="32"
            cy="32"
            r="30"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            className={scoreStyle.text}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-lg font-black', scoreStyle.text)}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-800">صحة المركبة</p>
        <Badge className={cn('text-xs mt-1', scoreStyle.bg, 'text-white')}>
          {scoreStyle.label}
        </Badge>
      </div>
    </div>
  );
};

// ===== Status Badge =====
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { label: string; bg: string }> = {
    available: { label: 'متاحة', bg: 'bg-green-500' },
    rented: { label: 'مؤجرة', bg: 'bg-purple-500' },
    maintenance: { label: 'صيانة', bg: 'bg-amber-500' },
    out_of_service: { label: 'خارج الخدمة', bg: 'bg-red-500' },
    reserved: { label: 'محجوزة', bg: 'bg-blue-500' },
    reserved_employee: { label: 'محجوزة لموظف', bg: 'bg-indigo-500' },
    accident: { label: 'حادث', bg: 'bg-rose-600' },
    stolen: { label: 'مسروقة', bg: 'bg-slate-700' },
    police_station: { label: 'مركز الشرطة', bg: 'bg-orange-600' },
  };

  const config = configs[status] || { label: status, bg: 'bg-neutral-500' };

  return (
    <Badge className={cn('text-white text-sm px-3 py-1', config.bg)}>
      {config.label}
    </Badge>
  );
};

// ===== Info Card =====
interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  isAlert?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value, color = 'neutral', isAlert }) => {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl',
      isAlert ? 'bg-red-50 border border-red-200' : 'bg-neutral-50'
    )}>
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        isAlert ? 'bg-red-500' : `bg-${color}-500`
      )}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className={cn('text-sm font-semibold', isAlert ? 'text-red-700' : 'text-neutral-800')}>
          {value}
        </p>
      </div>
    </div>
  );
};

// ===== Main Component =====
interface VehicleSidePanelProps {
  vehicleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (vehicleId: string) => void;
  onDelete?: (vehicleId: string) => void;
  onNewContract?: (vehicleId: string) => void;
  onNewMaintenance?: (vehicleId: string) => void;
}

export const VehicleSidePanel: React.FC<VehicleSidePanelProps> = ({
  vehicleId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onNewContract,
  onNewMaintenance,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const { data, isLoading, refetch } = useVehicleDetails(vehicleId);

  // Handle create contract
  const handleCreateContract = () => {
    if (vehicleId) {
      if (onNewContract) {
        onNewContract(vehicleId);
      } else {
        navigate(`/contracts?vehicle=${vehicleId}`);
      }
    }
  };

  // Handle add maintenance
  const handleAddMaintenance = () => {
    if (vehicleId) {
      if (onNewMaintenance) {
        onNewMaintenance(vehicleId);
      } else {
        navigate(`/fleet/maintenance?vehicle=${vehicleId}`);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'غير محدد';
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: ar });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">جاري التحميل...</p>
                </div>
              </div>
            ) : !data?.vehicle ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-neutral-500">لم يتم العثور على المركبة</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-gradient-to-br from-rose-500 to-coral-600 p-5 text-white">
                  <div className="flex items-start justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={onClose}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-red-500/30"
                          onClick={() => onDelete(data.vehicle!.id)}
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          حذف
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={() => setIsRegistrationDialogOpen(true)}
                        title="تحديث بيانات الاستمارة"
                      >
                        <ClipboardEdit className="w-4 h-4 ml-1" />
                        تحديث
                      </Button>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20"
                          onClick={() => onEdit(data.vehicle!.id)}
                        >
                          <Edit3 className="w-4 h-4 ml-1" />
                          تعديل
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={() => navigate(`/fleet/vehicles/${vehicleId}`)}
                      >
                        <ExternalLink className="w-4 h-4 ml-1" />
                        فتح
                      </Button>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                      {data.vehicle.images?.[0] ? (
                        <img
                          src={data.vehicle.images[0]}
                          alt={`${data.vehicle.make} ${data.vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Car className="w-10 h-10 text-white/70" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold">
                          {data.vehicle.year} {data.vehicle.make} {data.vehicle.model}
                        </h2>
                      </div>
                      <p className="text-white/80 text-sm mb-2">{data.vehicle.plate_number}</p>
                      <StatusBadge status={data.vehicle.status} />
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className="mt-4 bg-white/10 rounded-xl p-3">
                    <HealthScoreDisplay score={data.vehicleHealthScore} />
                  </div>
                </div>

                {/* Tabs Content */}
                <div className="flex-1 overflow-hidden">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="grid grid-cols-5 gap-1 p-2 bg-neutral-100 mx-4 mt-4 rounded-xl">
                      <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                        نظرة عامة
                      </TabsTrigger>
                      <TabsTrigger value="contract" className="text-xs data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                        العقود
                      </TabsTrigger>
                      <TabsTrigger value="maintenance" className="text-xs data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                        الصيانة
                      </TabsTrigger>
                      <TabsTrigger value="penalties" className="text-xs data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                        المخالفات
                      </TabsTrigger>
                      <TabsTrigger value="stats" className="text-xs data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                        إحصائيات
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto p-4">
                      {/* Overview Tab */}
                      <TabsContent value="overview" className="m-0 space-y-4">
                        {/* Alerts */}
                        {(data.alerts.isInsuranceExpired || data.alerts.isRegistrationExpired || data.alerts.isServiceOverdue) && (
                          <div className="bg-red-50 border border-red-200 rounded-[1.25rem] p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertCircle className="w-5 h-5 text-red-500" />
                              <span className="font-semibold text-red-700">تنبيهات حرجة</span>
                            </div>
                            <div className="space-y-2">
                              {data.alerts.isInsuranceExpired && (
                                <div className="flex items-center gap-2 text-sm text-red-600">
                                  <XCircle className="w-4 h-4" />
                                  <span>التأمين منتهي - {formatDate(data.alerts.insuranceExpiry)}</span>
                                </div>
                              )}
                              {data.alerts.isRegistrationExpired && (
                                <div className="flex items-center gap-2 text-sm text-red-600">
                                  <XCircle className="w-4 h-4" />
                                  <span>الفحص الدوري منتهي - {formatDate(data.alerts.registrationExpiry)}</span>
                                </div>
                              )}
                              {data.alerts.isServiceOverdue && (
                                <div className="flex items-center gap-2 text-sm text-red-600">
                                  <XCircle className="w-4 h-4" />
                                  <span>صيانة متأخرة - {formatDate(data.alerts.nextServiceDue)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Vehicle Details */}
                        <div className="bg-white rounded-[1.25rem] p-4 shadow-sm border border-neutral-100">
                          <h3 className="text-sm font-semibold text-neutral-700 mb-3">معلومات المركبة</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <InfoCard icon={Car} label="رقم اللوحة" value={data.vehicle.plate_number} />
                            <InfoCard icon={Gauge} label="الكيلومترات" value={`${data.vehicle.current_mileage.toLocaleString('en-US')} كم`} />
                            <InfoCard icon={Fuel} label="مستوى الوقود" value={`${data.vehicle.fuel_level}%`} />
                            <InfoCard icon={MapPin} label="الموقع" value={data.vehicle.location || 'غير محدد'} />
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="bg-white rounded-[1.25rem] p-4 shadow-sm border border-neutral-100">
                          <h3 className="text-sm font-semibold text-neutral-700 mb-3">التواريخ المهمة</h3>
                          <div className="space-y-3">
                            <InfoCard
                              icon={Shield}
                              label="انتهاء التأمين"
                              value={formatDate(data.alerts.insuranceExpiry)}
                              isAlert={data.alerts.isInsuranceExpired}
                            />
                            <InfoCard
                              icon={FileText}
                              label="انتهاء الفحص"
                              value={formatDate(data.alerts.registrationExpiry)}
                              isAlert={data.alerts.isRegistrationExpired}
                            />
                            <InfoCard
                              icon={Wrench}
                              label="الصيانة القادمة"
                              value={formatDate(data.alerts.nextServiceDue)}
                              isAlert={data.alerts.isServiceOverdue}
                            />
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-white rounded-[1.25rem] p-4 shadow-sm border border-neutral-100">
                          <h3 className="text-sm font-semibold text-neutral-700 mb-3">الأسعار</h3>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-rose-50 rounded-xl">
                              <p className="text-lg font-bold text-coral-600">{formatCurrency(data.vehicle.daily_rate)}</p>
                              <p className="text-xs text-neutral-500">يومي</p>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-xl">
                              <p className="text-lg font-bold text-blue-600">{formatCurrency(data.vehicle.weekly_rate)}</p>
                              <p className="text-xs text-neutral-500">أسبوعي</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-xl">
                              <p className="text-lg font-bold text-green-600">{formatCurrency(data.vehicle.monthly_rate)}</p>
                              <p className="text-xs text-neutral-500">شهري</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Contract Tab */}
                      <TabsContent value="contract" className="m-0 space-y-4">
                        {/* Active Contract */}
                        {data.activeContract ? (
                          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-[1.25rem] p-4 border border-green-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-semibold text-green-700">عقد نشط</span>
                              </div>
                              <Badge className="bg-green-500 text-white">
                                {data.activeContract.contract_number}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-700">{data.activeContract.customer_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-700">
                                  {formatDate(data.activeContract.start_date)} - {formatDate(data.activeContract.end_date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-700">
                                  {formatCurrency(data.activeContract.monthly_amount)} / شهري
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-neutral-50 rounded-[1.25rem] p-6 text-center">
                            <Car className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
                            <p className="text-neutral-500">لا يوجد عقد نشط</p>
                            <Button 
                              className="mt-3 bg-rose-500 hover:bg-coral-600"
                              onClick={handleCreateContract}
                            >
                              <Plus className="w-4 h-4 ml-1" />
                              إنشاء عقد
                            </Button>
                          </div>
                        )}

                        {/* Contract History */}
                        <div className="bg-white rounded-[1.25rem] p-4 shadow-sm border border-neutral-100">
                          <h3 className="text-sm font-semibold text-neutral-700 mb-3">سجل العقود ({data.contractHistory.length})</h3>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {data.contractHistory.length === 0 ? (
                              <p className="text-sm text-neutral-400 text-center py-4">لا توجد عقود سابقة</p>
                            ) : (
                              data.contractHistory.map(contract => (
                                <div
                                  key={contract.id}
                                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-neutral-800">{contract.contract_number}</p>
                                    <p className="text-xs text-neutral-500">{contract.customer_name}</p>
                                  </div>
                                  <div className="text-left">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-xs',
                                        contract.status === 'active' && 'bg-green-50 text-green-700 border-green-200',
                                        contract.status === 'completed' && 'bg-neutral-50 text-neutral-700',
                                        contract.status === 'cancelled' && 'bg-red-50 text-red-700 border-red-200'
                                      )}
                                    >
                                      {contract.status === 'active' ? 'نشط' : contract.status === 'completed' ? 'مكتمل' : 'ملغي'}
                                    </Badge>
                                    <p className="text-xs text-neutral-400 mt-1">
                                      {formatCurrency(contract.monthly_amount)}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Maintenance Tab */}
                      <TabsContent value="maintenance" className="m-0 space-y-4">
                        <div className="bg-white rounded-[1.25rem] p-4 shadow-sm border border-neutral-100">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-neutral-700">سجل الصيانة</h3>
                            <Button 
                              size="sm" 
                              className="bg-rose-500 hover:bg-coral-600"
                              onClick={handleAddMaintenance}
                            >
                              <Plus className="w-4 h-4 ml-1" />
                              إضافة
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {data.maintenanceHistory.length === 0 ? (
                              <p className="text-sm text-neutral-400 text-center py-8">لا توجد سجلات صيانة</p>
                            ) : (
                              data.maintenanceHistory.map(m => (
                                <div
                                  key={m.id}
                                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      'w-8 h-8 rounded-lg flex items-center justify-center',
                                      m.status === 'completed' ? 'bg-green-500' :
                                      m.status === 'in_progress' ? 'bg-amber-500' : 'bg-neutral-400'
                                    )}>
                                      <Wrench className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-neutral-800">{m.maintenance_type}</p>
                                      <p className="text-xs text-neutral-500">{formatDate(m.scheduled_date)}</p>
                                    </div>
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-bold text-coral-600">{formatCurrency(m.actual_cost)}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Penalties Tab */}
                      <TabsContent value="penalties" className="m-0 space-y-4">
                        <div className="bg-white rounded-[1.25rem] p-4 shadow-sm border border-neutral-100">
                          <h3 className="text-sm font-semibold text-neutral-700 mb-3">
                            المخالفات ({data.penalties.length})
                          </h3>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {data.penalties.length === 0 ? (
                              <div className="text-center py-8">
                                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                                <p className="text-sm text-neutral-400">لا توجد مخالفات</p>
                              </div>
                            ) : (
                              data.penalties.map(p => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      'w-8 h-8 rounded-lg flex items-center justify-center',
                                      p.payment_status === 'paid' ? 'bg-green-500' : 'bg-red-500'
                                    )}>
                                      <AlertTriangle className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-neutral-800">{p.violation_type}</p>
                                      <p className="text-xs text-neutral-500">{formatDate(p.penalty_date)}</p>
                                    </div>
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-bold text-red-600">{formatCurrency(p.amount)}</p>
                                    <Badge
                                      className={cn(
                                        'text-[10px]',
                                        p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      )}
                                    >
                                      {p.payment_status === 'paid' ? 'مدفوعة' : 'معلقة'}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Stats Tab */}
                      <TabsContent value="stats" className="m-0 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-[1.25rem] p-4 border border-rose-200">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-5 h-5 text-rose-500" />
                              <span className="text-sm text-coral-700">إجمالي الإيرادات</span>
                            </div>
                            <p className="text-2xl font-black text-coral-600">
                              {formatCurrency(data.stats.totalRevenue)}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-[1.25rem] p-4 border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-5 h-5 text-blue-500" />
                              <span className="text-sm text-blue-700">عدد العقود</span>
                            </div>
                            <p className="text-2xl font-black text-blue-600">{data.stats.totalContracts}</p>
                          </div>
                          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-[1.25rem] p-4 border border-amber-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Wrench className="w-5 h-5 text-amber-500" />
                              <span className="text-sm text-amber-700">تكلفة الصيانة</span>
                            </div>
                            <p className="text-2xl font-black text-amber-600">
                              {formatCurrency(data.stats.totalMaintenanceCost)}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-[1.25rem] p-4 border border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              <span className="text-sm text-red-700">مخالفات معلقة</span>
                            </div>
                            <p className="text-2xl font-black text-red-600">
                              {formatCurrency(data.stats.pendingPenaltiesAmount)}
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </>
            )}
          </motion.div>

          {/* نافذة تحديث بيانات الاستمارة */}
          <UpdateVehicleRegistrationDialog
            open={isRegistrationDialogOpen}
            onOpenChange={setIsRegistrationDialogOpen}
            vehicle={data?.vehicle ? {
              id: data.vehicle.id,
              plate_number: data.vehicle.plate_number,
              make: data.vehicle.make,
              model: data.vehicle.model,
              year: data.vehicle.year,
              registration_expiry: data.alerts.registrationExpiry,
              insurance_expiry: data.alerts.insuranceExpiry,
              current_mileage: data.vehicle.current_mileage,
              fuel_level: data.vehicle.fuel_level,
              location: data.vehicle.location,
            } : null}
            onSuccess={() => {
              refetch();
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default VehicleSidePanel;

