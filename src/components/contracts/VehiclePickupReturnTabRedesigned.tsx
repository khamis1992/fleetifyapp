/**
 * Vehicle Pickup & Return Tab - Redesigned
 * Professional SaaS design matching ContractInvoicesTabRedesigned style
 *
 * @component VehiclePickupReturnTabRedesigned
 */

import { useState } from 'react';
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
} from 'lucide-react';
import { VehicleReturnFormDialog } from './VehicleReturnFormDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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
}

// ===== Mock Data (replace with actual data fetching) =====
const mockPickupRecords: InspectionRecord[] = [
  {
    id: '1',
    type: 'pickup',
    date: '2024-01-15',
    time: '10:30',
    mileage: 45000,
    fuelLevel: 75,
    condition: {
      exterior: 'ممتاز - لا يوجد خدوش',
      interior: 'نظيف - فرش جديد',
      mechanical: 'سليم - صيانة حديثة',
    },
    accessories: ['spare_tire', 'jack', 'extinguisher'],
    documents: ['registration', 'insurance'],
    photos: [],
    notes: 'المركبة بحالة ممتازة',
    signatures: {
      customer: 'أحمد محمد',
      staff: 'خالد علي',
    },
    status: 'completed',
  },
];

const mockReturnRecords: InspectionRecord[] = [];

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
      className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            isPickup ? "bg-gradient-to-br from-teal-500 to-teal-600" : "bg-gradient-to-br from-amber-500 to-amber-600"
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

      {/* Accessories & Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Accessories */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
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
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
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
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
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
    <div className="text-center py-16">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "w-24 h-24 rounded-3xl bg-gradient-to-br flex items-center justify-center mx-auto mb-6",
          isPickup ? "from-teal-50 to-teal-100" : "from-amber-50 to-amber-100"
        )}
      >
        <Car className={cn("w-12 h-12", isPickup ? "text-teal-500" : "text-amber-500")} />
      </motion.div>
      <h3 className="text-xl font-bold text-neutral-900 mb-2">
        لم يتم تسجيل {isPickup ? 'استلام' : 'تسليم'} المركبة
      </h3>
      <p className="text-neutral-500 mb-6 max-w-md mx-auto">
        ابدأ بتسليم العملية لتوثيق حالة المركبة والوقود والمسافات
      </p>
      <Button
        onClick={onCreate}
        className={cn(
          "gap-2 hover:shadow-lg rounded-xl",
          isPickup
            ? "bg-gradient-to-r from-teal-500 to-teal-600 shadow-teal-200"
            : "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-200"
        )}
      >
        <Plus className="w-4 h-4" />
        تسجيل {isPickup ? 'استلام' : 'تسليم'} جديد
      </Button>
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

  const handleCreateNew = (type: 'pickup' | 'return') => {
    setCreateType(type);
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
  };

  const pickupRecords = mockPickupRecords; // Replace with actual data
  const returnRecords = mockReturnRecords; // Replace with actual data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">استلام وتسليم المركبة</h2>
          <p className="text-neutral-500 text-sm">
            {contract?.contract_number && `العقد #${contract.contract_number} • `}
            {contract?.vehicle_make} {contract?.vehicle_model} • {contract?.vehicle_plate}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pickup' | 'return')} className="w-full">
        <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-neutral-200">
          <TabsTrigger
            value="pickup"
            className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
          >
            <ArrowRight className="w-4 h-4" />
            استلام المركبة
            <Badge variant="outline" className="mr-2">{pickupRecords.length}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="return"
            className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-amber-500"
          >
            <ArrowLeft className="w-4 h-4" />
            تسليم المركبة
            <Badge variant="outline" className="mr-2">{returnRecords.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Pickup Tab Content */}
        <TabsContent value="pickup" className="mt-6">
          {pickupRecords.length === 0 ? (
            <Card className="border-neutral-200">
              <CardContent className="p-6">
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
        <TabsContent value="return" className="mt-6">
          {returnRecords.length === 0 ? (
            <Card className="border-neutral-200">
              <CardContent className="p-6">
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-teal-500" />
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
                  className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl"
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
