/**
 * Vehicle Pickup & Return Tab - Redesigned
 * Professional SaaS design matching ContractInvoicesTabRedesigned style
 *
 * @component VehiclePickupReturnTabRedesigned
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
};

const scaleIn = {
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
    contract_number: string;
    customer_name: string;
    customer_phone: string;
    vehicle_plate: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    start_date: string;
    end_date: string;
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
    if (level <= 25) return 'from-red-500 to-red-600';
    if (level <= 50) return 'from-amber-500 to-amber-600';
    if (level <= 75) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${level}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full bg-gradient-to-r', getFuelColor(level))}
        />
      </div>
      <span className="text-sm font-bold text-neutral-700 w-12 text-left">{level}%</span>
    </div>
  );
};

const ConditionRating = ({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) => (
  <div className={cn("p-4 rounded-xl border-2", color)}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5" />
      <span className="font-bold text-sm">{label}</span>
    </div>
    <p className="text-sm text-neutral-700">{value || 'لا توجد ملاحظات'}</p>
  </div>
);

const InspectionCard = ({ record, formatCurrency }: { record: InspectionRecord; formatCurrency: (amount: number) => string }) => {
  const isPickup = record.type === 'pickup';
  const accentColor = isPickup ? 'teal' : 'amber';

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm transition-colors hover:border-[#173A63]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            isPickup ? "bg-[#173A63]" : "bg-amber-600"
          )}>
            <Car className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-neutral-900 text-lg">
                {isPickup ? 'استلام المركبة' : 'تسليم المركبة'}
              </h3>
              <Badge className={cn(
                isPickup ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
              )}>
                {record.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(record.date), 'dd MMM yyyy', { locale: ar })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {record.time}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Eye className="w-4 h-4" />
            <span>عرض</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Mileage */}
        <div className={cn("p-4 rounded-xl", isPickup ? "bg-teal-50 border border-teal-100" : "bg-amber-50 border border-amber-100")}>
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
            <Gauge className="w-4 h-4" />
            <span>قراءة العداد</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{record.mileage.toLocaleString()} كم</p>
        </div>

        {/* Fuel Level */}
        <div className={cn("p-4 rounded-xl", isPickup ? "bg-teal-50 border border-teal-100" : "bg-amber-50 border border-amber-100")}>
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
            <Fuel className="w-4 h-4" />
            <span>مستوى الوقود</span>
          </div>
          <FuelLevelIndicator level={record.fuelLevel} />
        </div>
      </div>

      {/* Vehicle Condition */}
      <div className="mb-6">
        <h4 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          حالة المركبة
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ConditionRating
            label="الخارجي"
            value={record.condition.exterior}
            icon={Car}
            color="bg-blue-50 border-blue-200"
          />
          <ConditionRating
            label="الداخلي"
            value={record.condition.interior}
            icon={Package}
            color="bg-purple-50 border-purple-200"
          />
          <ConditionRating
            label="الميكانيكي"
            value={record.condition.mechanical}
            icon={Wrench}
            color="bg-green-50 border-green-200"
          />
        </div>
      </div>

      {/* Visual Inspection Zone Markers */}
      {record.visualZones && record.visualZones.length > 0 && (
        <div className="mb-6 rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
          <h4 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            الفحص المرئي - المناطق المميزة
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
            {record.visualZones.map((zone) => {
              const zoneColors = {
                clean: '#10b981',
                scratch: '#f59e0b',
                dent: '#f97316',
                crack: '#ef4444',
                broken: '#b91c1c',
                missing: '#6b7280',
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
                <div key={zone.zone_id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zoneColors[zone.condition] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate text-neutral-900">
                      {zone.zone_name_ar}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {zoneLabels[zone.condition]}
                    </div>
                  </div>
                  {zone.photo_urls && zone.photo_urls.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {zone.photo_urls.length}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-sm text-neutral-600">
            <span className="font-semibold">
              {record.visualZones.filter(z => z.condition !== 'clean').length}
            </span>
            {' / '}
            {record.visualZones.length}
            {' منطقة تحتاج انتباه'}
          </div>
        </div>
      )}

      {/* Accessories & Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Accessories */}
        <div className="rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
          <h5 className="font-medium text-neutral-900 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
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
              <span className="text-sm text-neutral-500">لا توجد ملحقات مسجلة</span>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
          <h5 className="font-medium text-neutral-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            المستندات ({record.documents.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {record.documents.length > 0 ? (
              record.documents.map((doc, idx) => (
                <Badge key={idx} className="bg-teal-100 text-teal-700">
                  <CheckCircle className="w-3 h-3 ml-1" />
                  {doc}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-neutral-500">لا توجد مستندات مسجلة</span>
            )}
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs text-neutral-500">العميل</p>
                <p className="font-semibold text-neutral-900">{record.signatures.customer}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-neutral-300" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs text-neutral-500">الموظف</p>
                <p className="font-semibold text-neutral-900">{record.signatures.staff}</p>
              </div>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle className="w-3 h-3" />
            معتمد
          </Badge>
        </div>
      </div>

      {/* Notes */}
      {record.notes && (
        <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-1">ملاحظات</p>
          <p className="text-sm text-blue-800">{record.notes}</p>
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
          "mx-auto flex h-28 w-28 items-center justify-center rounded-lg border md:mx-0",
          isPickup
            ? "border-[#22C7A1]/20 bg-[#22C7A1]/10"
            : "border-[#FB6B7A]/20 bg-[#FB6B7A]/10"
        )}
      >
        <Car className={cn("h-12 w-12", isPickup ? "text-[#22C7A1]" : "text-[#FB6B7A]")} />
      </motion.div>
      <div className="text-center md:text-right">
        <p className={cn("mb-2 text-sm font-bold", isPickup ? "text-[#22C7A1]" : "text-[#FB6B7A]")}>
          {isPickup ? 'استلام المركبة' : 'تسليم المركبة'}
        </p>
        <h3 className="mb-2 text-xl font-bold text-[#020617]">
          لا يوجد سجل {isPickup ? 'استلام' : 'تسليم'} حتى الآن
        </h3>
        <p className="mb-5 max-w-xl text-sm leading-7 text-[#94A3B8]">
          ابدأ بتوثيق حالة المركبة والوقود والعداد والملاحظات قبل متابعة دورة العقد.
        </p>
        <Button
          onClick={onCreate}
          className={cn(
            "gap-2 rounded-lg px-5 shadow-none",
            isPickup
              ? "bg-[#22C7A1] text-white hover:bg-[#1fb391]"
              : "bg-[#FB6B7A] text-white hover:bg-[#e85f6d]"
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
  const { data: inspections, isLoading, error } = useVehicleInspections({
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

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5EAF1] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#E5EAF1] bg-[#F6F8FB] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-1 text-sm font-bold text-[#22C7A1]">دورة المركبة</p>
          <h2 className="text-2xl font-bold text-[#020617]">استلام وتسليم المركبة</h2>
          <p className="mt-2 text-sm text-[#94A3B8]">
            {contract?.contract_number && `العقد #${contract.contract_number} • `}
            {contract?.vehicle_make} {contract?.vehicle_model} • {contract?.vehicle_plate}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <div className="rounded-lg border border-[#E5EAF1] bg-white px-4 py-2">
            <p className="text-xs font-semibold text-[#94A3B8]">سجلات الاستلام</p>
            <p className="text-lg font-black text-[#22C7A1]">{pickupRecords.length}</p>
          </div>
          <div className="rounded-lg border border-[#E5EAF1] bg-white px-4 py-2">
            <p className="text-xs font-semibold text-[#94A3B8]">سجلات التسليم</p>
            <p className="text-lg font-black text-[#7C83F6]">{returnRecords.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pickup' | 'return')} className="w-full">
        <div className="border-b border-[#E5EAF1] p-4">
        <TabsList className="grid h-auto w-full grid-cols-2 justify-start rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-1">
          <TabsTrigger
            value="pickup"
            className="gap-2 rounded-lg px-5 py-3 transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
          >
            <ArrowRight className="h-4 w-4" />
            <span>استلام المركبة</span>
            <Badge variant="outline" className="mr-2 border-[#E5EAF1] bg-white text-[#020617]">{pickupRecords.length}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="return"
            className="gap-2 rounded-lg px-5 py-3 transition-all data-[state=active]:bg-[#7C83F6] data-[state=active]:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>تسليم المركبة</span>
            <Badge variant="outline" className="mr-2 border-[#E5EAF1] bg-white text-[#020617]">{returnRecords.length}</Badge>
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Pickup Tab Content */}
        <TabsContent value="pickup" className="m-0 p-5">
          {isLoading ? (
            <Card className="border-[#E5EAF1]">
              <CardContent className="flex flex-col items-center justify-center p-10">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#22C7A1]" />
                <p className="text-[#94A3B8]">جاري تحميل سجلات الاستلام...</p>
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
              {pickupRecords.map((record) => (
                <InspectionCard key={record.id} record={record} formatCurrency={formatCurrency} />
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
                <p className="text-[#94A3B8]">جاري تحميل سجلات التسليم...</p>
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
              {returnRecords.map((record) => (
                <InspectionCard key={record.id} record={record} formatCurrency={formatCurrency} />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-white">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#EEF5FB]">
                <Car className="h-8 w-8 text-[#173A63]" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                تسجيل استلام جديد
              </h3>
              <p className="text-neutral-500 mb-6">
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
                  className="flex-1 rounded-xl bg-[#173A63] hover:bg-[#173A63]/90"
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
