/**
 * Vehicle Pickup & Return Tab - Redesigned
 * Professional SaaS design matching the Fleetify light design language
 *
 * @component VehiclePickupReturnTabRedesigned
 */

import { useState, useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  Car,
  Calendar,
  Clock,
  Fuel,
  Gauge,
  Wrench,
  Camera,
  FileText,
  User,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Eye,
  Download,
  Signature,
  Shield,
  Package,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { VehicleReturnFormDialog } from './VehicleReturnFormDialog';
import { VisualVehicleDiagram } from './vehicle-inspection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ZoneSelection, VehicleType } from './vehicle-inspection/types';
import { useVehicleInspections, VehicleInspection } from '@/hooks/useVehicleInspections';

// ===== Animation Variants =====
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// ===== Types =====
interface VehiclePickupReturnTabRedesignedProps {
  contract?: {
    id: string;
    vehicle_id: string;
    contract_number: string;
    customer_name: string;
    customer_phone: string;
    vehicle_plate: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    start_date: string;
    end_date: string;
    vehicle_returned?: boolean | null;
  };
  formatCurrency: (amount: number) => string;
}

interface InspectionRecord {
  id: string;
  type: 'pickup' | 'return';
  date: string;
  time: string;
  mileage: number;
  fuelLevel: number;
  condition: {
    exterior: string;
    interior: string;
    mechanical: string;
  };
  accessories: string[];
  documents: string[];
  photos: string[];
  notes: string;
  signatures: {
    customer: string;
    staff: string;
  };
  status: 'completed' | 'pending';
  // Visual inspection data
  vehicleType?: VehicleType;
  visualZones?: ZoneSelection[];
}

// ===== Helper function to transform database inspection to InspectionRecord =====
function transformInspection(inspection: VehicleInspection): InspectionRecord {
  const inspectionDate = new Date(inspection.inspection_date);

  // Transform exterior condition from JSONB to description
  const exteriorDescription = Array.isArray(inspection.exterior_condition) && inspection.exterior_condition.length > 0
    ? inspection.exterior_condition.map((d: any) => `${d.location}: ${d.description}`).join('، ')
    : inspection.exterior_condition && typeof inspection.exterior_condition === 'string'
      ? inspection.exterior_condition
      : 'لا توجد ملاحظات';

  // Transform interior condition from JSONB to description
  const interiorDescription = Array.isArray(inspection.interior_condition) && inspection.interior_condition.length > 0
    ? inspection.interior_condition.map((d: any) => `${d.location}: ${d.description}`).join('، ')
    : inspection.interior_condition && typeof inspection.interior_condition === 'string'
      ? inspection.interior_condition
      : 'لا توجد ملاحظات';

  return {
    id: inspection.id,
    type: inspection.inspection_type === 'check_in' ? 'pickup' : 'return',
    date: format(inspectionDate, 'yyyy-MM-dd'),
    time: format(inspectionDate, 'HH:mm'),
    mileage: inspection.odometer_reading || 0,
    fuelLevel: inspection.fuel_level || 0,
    condition: {
      exterior: exteriorDescription,
      interior: interiorDescription,
      mechanical: inspection.notes || 'لا توجد ملاحظات',
    },
    accessories: (inspection as any).accessories || [],
    documents: (inspection as any).documents || [],
    photos: inspection.photo_urls || [],
    notes: inspection.notes || '',
    signatures: {
      customer: inspection.customer_signature ? 'موقع' : 'غير موقع',
      staff: inspection.inspector?.full_name || 'غير محدد',
    },
    status: 'completed',
    vehicleType: (inspection as any).vehicle_type as VehicleType,
    visualZones: (inspection as any).visual_inspection_zones || [],
  };
}

// ===== Helper Components =====

const FuelLevelIndicator = ({ level }: { level: number }) => {
  const getFuelColor = (level: number) => {
    if (level <= 25) return 'bg-[#FB6B7A]';
    if (level <= 50) return 'bg-[#F59E0B]';
    if (level <= 75) return 'bg-[#38BDF8]';
    return 'bg-[#22C7A1]';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E5EAF1]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${level}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full', getFuelColor(level))}
        />
      </div>
      <span className="w-12 text-left text-sm font-black text-[#0F172A]">{level}%</span>
    </div>
  );
};

const ConditionRating = ({ label, value, icon: Icon, tint, iconColor }: { label: string; value: string; icon: any; tint: string; iconColor: string }) => (
  <div className={cn("rounded-xl border p-4", tint)}>
    <div className="mb-2 flex items-center gap-2">
      <Icon className={cn("h-4 w-4", iconColor)} />
      <span className="text-sm font-black text-[#0F172A]">{label}</span>
    </div>
    <p className="text-sm leading-6 text-slate-600">{value || 'لا توجد ملاحظات'}</p>
  </div>
);

const InspectionCard = ({ record, formatCurrency, isLatest }: { record: InspectionRecord; formatCurrency: (amount: number) => string; isLatest?: boolean }) => {
  const isPickup = record.type === 'pickup';
  const accentSoft = isPickup ? 'bg-[#22C7A1]/10' : 'bg-[#7C83F6]/10';
  const accentText = isPickup ? 'text-[#0E9E7E]' : 'text-[#4F46E5]';
  const accentBorder = isPickup ? 'border-[#22C7A1]/30' : 'border-[#7C83F6]/30';

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -2 }}
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] transition-colors",
        isLatest ? "border-[#22C7A1]/40 ring-1 ring-[#22C7A1]/20" : "border-[#E5EAF1] hover:border-[#22C7A1]/40"
      )}
    >
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", accentSoft)}>
            <Car className={cn("h-6 w-6", accentText)} />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-[#0F172A]">
                {isPickup ? 'استلام المركبة' : 'تسليم المركبة'}
              </h3>
              <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-black", accentSoft, accentText, accentBorder)}>
                {record.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
              </span>
              {isLatest && (
                <span className="inline-flex items-center rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-1 text-xs font-black text-[#0369A1]">
                  الأحدث
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(record.date), 'dd MMM yyyy', { locale: ar })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {record.time}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Eye className="h-4 w-4" />
            <span>عرض</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {/* Mileage */}
        <div className={cn("rounded-xl border p-4", accentBorder, accentSoft)}>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <Gauge className="h-4 w-4" />
            <span>قراءة العداد</span>
          </div>
          <p className="text-lg font-black text-[#0F172A]">{record.mileage.toLocaleString()} كم</p>
        </div>

        {/* Fuel Level */}
        <div className={cn("rounded-xl border p-4", accentBorder, accentSoft)}>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <Fuel className="h-4 w-4" />
            <span>مستوى الوقود</span>
          </div>
          <FuelLevelIndicator level={record.fuelLevel} />
        </div>
      </div>

      {/* Vehicle Condition */}
      <div className="mb-5">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0F172A]">
          <Wrench className="h-4 w-4" />
          حالة المركبة
        </h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ConditionRating
            label="الخارجي"
            value={record.condition.exterior}
            icon={Car}
            tint="border-[#38BDF8]/20 bg-[#38BDF8]/5"
            iconColor="text-[#0369A1]"
          />
          <ConditionRating
            label="الداخلي"
            value={record.condition.interior}
            icon={Package}
            tint="border-[#7C83F6]/20 bg-[#7C83F6]/5"
            iconColor="text-[#4F46E5]"
          />
          <ConditionRating
            label="الميكانيكي"
            value={record.condition.mechanical}
            icon={Wrench}
            tint="border-[#22C7A1]/20 bg-[#22C7A1]/5"
            iconColor="text-[#0E9E7E]"
          />
        </div>
      </div>

      {/* Visual Inspection Zone Markers */}
      {record.visualZones && record.visualZones.length > 0 && (
        <div className="mb-5 rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0F172A]">
            <AlertTriangle className="h-4 w-4 text-[#B45309]" />
            الفحص المرئي - المناطق المميزة
          </h4>
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {record.visualZones.map((zone) => {
              const zoneColors = {
                clean: '#22C7A1',
                scratch: '#F59E0B',
                dent: '#FB6B7A',
                crack: '#BE123C',
                broken: '#7C83F6',
                missing: '#94A3B8',
              };

              const zoneLabels: Record<typeof zone.condition, string> = {
                clean: 'سليم',
                scratch: 'خدش',
                dent: 'مثني',
                crack: 'كسر',
                broken: 'معطل',
                missing: 'مفقود',
              };

              return (
                <div key={zone.zone_id} className="flex items-center gap-2 rounded-lg border border-[#E5EAF1] bg-white p-2">
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: zoneColors[zone.condition] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-[#0F172A]">
                      {zone.zone_name_ar}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {zoneLabels[zone.condition]}
                    </div>
                  </div>
                  {zone.photo_urls && zone.photo_urls.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {zone.photo_urls.length}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-black">
              {record.visualZones.filter(z => z.condition !== 'clean').length}
            </span>
            {' / '}
            {record.visualZones.length}
            {' منطقة تحتاج انتباه'}
          </div>
        </div>
      )}

      {/* Accessories & Documents */}
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Accessories */}
        <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-4">
          <h5 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0F172A]">
            <Package className="h-4 w-4" />
            الملحقات ({record.accessories.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {record.accessories.length > 0 ? (
              record.accessories.map((acc, idx) => (
                <Badge key={idx} variant="outline" className="bg-white">
                  {acc}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">لا توجد ملحقات مسجلة</span>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-4">
          <h5 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0F172A]">
            <FileText className="h-4 w-4" />
            المستندات ({record.documents.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {record.documents.length > 0 ? (
              record.documents.map((doc, idx) => (
                <Badge key={idx} className="bg-[#22C7A1]/10 text-[#0E9E7E]">
                  <CheckCircle className="ml-1 h-3 w-3" />
                  {doc}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">لا توجد مستندات مسجلة</span>
            )}
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">العميل</p>
                <p className="font-bold text-[#0F172A]">{record.signatures.customer}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[#E5EAF1]" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">الموظف</p>
                <p className="font-bold text-[#0F172A]">{record.signatures.staff}</p>
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#22C7A1]/30 bg-[#22C7A1]/10 px-3 py-1 text-xs font-black text-[#0E9E7E]">
            <CheckCircle className="h-3 w-3" />
            معتمد
          </span>
        </div>
      </div>

      {/* Notes */}
      {record.notes && (
        <div className="mt-4 rounded-xl border border-[#38BDF8]/30 bg-[#38BDF8]/10 p-4">
          <p className="mb-1 text-sm font-black text-[#0369A1]">ملاحظات</p>
          <p className="text-sm text-[#0369A1]">{record.notes}</p>
        </div>
      )}
    </motion.div>
  );
};

// ===== Empty State =====
const EmptyState = ({ type, onCreate }: { type: 'pickup' | 'return'; onCreate: () => void }) => {
  const isPickup = type === 'pickup';

  return (
    <div className="grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border md:mx-0",
          isPickup
            ? "border-[#22C7A1]/20 bg-[#22C7A1]/10"
            : "border-[#7C83F6]/20 bg-[#7C83F6]/10"
        )}
      >
        <Car className={cn("h-12 w-12", isPickup ? "text-[#22C7A1]" : "text-[#7C83F6]")} />
      </motion.div>
      <div className="text-center md:text-right">
        <p className={cn("mb-2 text-sm font-black", isPickup ? "text-[#0E9E7E]" : "text-[#4F46E5]")}>
          {isPickup ? 'استلام المركبة' : 'تسليم المركبة'}
        </p>
        <h3 className="mb-2 text-xl font-black text-[#0F172A]">
          لا يوجد سجل {isPickup ? 'استلام' : 'تسليم'} حتى الآن
        </h3>
        <p className="mb-5 max-w-xl text-sm leading-7 text-slate-500">
          ابدأ بتوثيق حالة المركبة والوقود والعداد والملاحظات قبل متابعة دورة العقد.
        </p>
        <Button
          onClick={onCreate}
          className={cn(
            "gap-2 rounded-lg px-5 shadow-none",
            isPickup
              ? "bg-[#22C7A1] text-white hover:bg-[#1fb391]"
              : "bg-[#7C83F6] text-white hover:bg-[#6b72e5]"
          )}
        >
          <Plus className="h-4 w-4" />
          تسجيل {isPickup ? 'استلام' : 'تسليم'} جديد
        </Button>
      </div>
    </div>
  );
};

// ===== Main Component =====
export const VehiclePickupReturnTabRedesigned = ({
  contract,
  formatCurrency,
}: VehiclePickupReturnTabRedesignedProps) => {
  const [activeTab, setActiveTab] = useState<'pickup' | 'return'>('pickup');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'pickup' | 'return'>('pickup');

  // Fetch real data from database
  const { data: inspections, isLoading, error, refetch } = useVehicleInspections({
    contractId: contract?.id,
    enabled: !!contract?.id,
  });

  // Transform and filter inspections by type
  const { pickupRecords, returnRecords } = useMemo(() => {
    if (!inspections) {
      return { pickupRecords: [], returnRecords: [] };
    }

    const pickup: InspectionRecord[] = [];
    const returnRecs: InspectionRecord[] = [];

    inspections.forEach((inspection) => {
      const transformed = transformInspection(inspection);
      if (inspection.inspection_type === 'check_in') {
        pickup.push(transformed);
      } else {
        returnRecs.push(transformed);
      }
    });

    return { pickupRecords: pickup, returnRecords: returnRecs };
  }, [inspections]);

  const handleCreateNew = (type: 'pickup' | 'return') => {
    setCreateType(type);
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
  };

  const hasReturnRecord = returnRecords.length > 0;
  const returnStateMismatch = Boolean(contract?.vehicle_returned) !== hasReturnRecord;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#E5EAF1] bg-[#F6F8FB] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-1 text-sm font-black text-[#0E9E7E]">دورة المركبة</p>
          <h2 className="text-2xl font-black text-[#0F172A]">استلام وتسليم المركبة</h2>
          <p className="mt-2 text-sm text-slate-500">
            {contract?.contract_number && `العقد #${contract.contract_number} • `}
            {contract?.vehicle_make} {contract?.vehicle_model} • {contract?.vehicle_plate}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => setActiveTab('pickup')}
            className={cn(
              "rounded-xl border px-4 py-2 text-right transition-colors",
              activeTab === 'pickup' ? "border-[#22C7A1]/40 bg-[#ECFDF9]" : "border-[#E5EAF1] bg-white hover:border-[#22C7A1]/30"
            )}
          >
            <p className="text-[11px] font-bold text-slate-500">سجلات الاستلام</p>
            <p className="text-lg font-black text-[#0E9E7E]">{pickupRecords.length}</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('return')}
            className={cn(
              "rounded-xl border px-4 py-2 text-right transition-colors",
              activeTab === 'return' ? "border-[#7C83F6]/40 bg-[#EEF2FF]" : "border-[#E5EAF1] bg-white hover:border-[#7C83F6]/30"
            )}
          >
            <p className="text-[11px] font-bold text-slate-500">سجلات التسليم</p>
            <p className="text-lg font-black text-[#4F46E5]">{returnRecords.length}</p>
          </button>
        </div>
      </div>

      {error && (
        <div className="m-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-black text-red-900">تعذر التحقق من سجلات فحص المركبة</p>
              <p className="mt-1 text-sm text-red-700">
                لم يعتبر النظام غياب السجلات دليلاً على عدم وجودها. أعد المحاولة قبل اعتماد التسليم أو الاستلام.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => void refetch()} className="shrink-0 border-red-200 bg-white">
            إعادة التحقق
          </Button>
        </div>
      )}

      {!error && !isLoading && returnStateMismatch && (
        <div className="m-5 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-black text-amber-950">حالة تسليم المركبة غير مكتملة التوثيق</p>
              <p className="mt-1 text-sm text-amber-800">
                {contract?.vehicle_returned
                  ? 'العقد مسجل كمسترد، لكن لا يوجد محضر تسليم وفحص مرتبط به. لا تُعد العملية موثقة حتى حفظ المحضر.'
                  : 'يوجد محضر تسليم مرتبط بالعقد، لكن العقد غير مسجل كمسترد. يلزم تصحيح الحالة قبل متابعة دورة المركبة.'}
              </p>
            </div>
          </div>
          {contract?.vehicle_returned && (
            <Button
              type="button"
              onClick={() => handleCreateNew('return')}
              className="shrink-0 bg-amber-700 text-white hover:bg-amber-800"
            >
              استكمال محضر التسليم
            </Button>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pickup' | 'return')} className="w-full">
        <div className="border-b border-[#E5EAF1] p-4">
        <TabsList className="grid h-auto w-full grid-cols-2 justify-start rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-1">
          <TabsTrigger
            value="pickup"
            className="gap-2 rounded-lg px-5 py-3 transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
          >
            <ArrowRight className="h-4 w-4" />
            <span>استلام المركبة</span>
            <Badge variant="outline" className="mr-2 border-[#E5EAF1] bg-white text-[#0F172A]">{pickupRecords.length}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="return"
            className="gap-2 rounded-lg px-5 py-3 transition-all data-[state=active]:bg-[#7C83F6] data-[state=active]:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>تسليم المركبة</span>
            <Badge variant="outline" className="mr-2 border-[#E5EAF1] bg-white text-[#0F172A]">{returnRecords.length}</Badge>
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Pickup Tab Content */}
        <TabsContent value="pickup" className="m-0 p-5">
          {isLoading ? (
            <Card className="border-[#E5EAF1]">
              <CardContent className="flex flex-col items-center justify-center p-10">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#22C7A1]" />
                <p className="text-slate-500">جاري تحميل سجلات الاستلام...</p>
              </CardContent>
            </Card>
          ) : pickupRecords.length === 0 ? (
            <Card className="border-[#E5EAF1] bg-white">
              <CardContent className="p-0">
                <EmptyState type="pickup" onCreate={() => handleCreateNew('pickup')} />
              </CardContent>
            </Card>
          ) : (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {pickupRecords.map((record, idx) => (
                <InspectionCard key={record.id} record={record} formatCurrency={formatCurrency} isLatest={idx === 0} />
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Return Tab Content */}
        <TabsContent value="return" className="m-0 p-5">
          {isLoading ? (
            <Card className="border-[#E5EAF1]">
              <CardContent className="flex flex-col items-center justify-center p-10">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#7C83F6]" />
                <p className="text-slate-500">جاري تحميل سجلات التسليم...</p>
              </CardContent>
            </Card>
          ) : returnRecords.length === 0 ? (
            <Card className="border-[#E5EAF1] bg-white">
              <CardContent className="p-0">
                <EmptyState type="return" onCreate={() => handleCreateNew('return')} />
              </CardContent>
            </Card>
          ) : (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {returnRecords.map((record, idx) => (
                <InspectionCard key={record.id} record={record} formatCurrency={formatCurrency} isLatest={idx === 0} />
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Handover Dialog - Return Form */}
      {isCreateDialogOpen && createType === 'return' && contract && (
        <VehicleReturnFormDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          contract={contract}
        />
      )}

      {/* Create Pickup Dialog Placeholder (still to be implemented) */}
      {isCreateDialogOpen && createType === 'pickup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#22C7A1]/10">
                <Car className="h-8 w-8 text-[#22C7A1]" />
              </div>
              <h3 className="mb-2 text-xl font-black text-[#0F172A]">
                تسجيل استلام جديد
              </h3>
              <p className="mb-6 text-slate-500">
                نموذج تسجيل استلام المركبة قيد التطوير
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1 rounded-xl"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleCloseDialog}
                  className="flex-1 rounded-xl bg-[#22C7A1] hover:bg-[#1fb391]"
                >
                  متابعة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
