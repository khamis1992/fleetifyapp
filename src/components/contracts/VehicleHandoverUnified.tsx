/**
 * Vehicle Handover Unified Interface
 * Combines pickup (استلام) and delivery (تسليم) workflows in a single, beautifully designed interface
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  ArrowRight,
  ArrowLeft,
  Check,
  Camera,
  Gauge,
  FileText,
  Signature,
  User,
  Phone,
  Calendar,
  Clock,
  Fuel,
  Settings,
  Wrench,
  Package,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Types
type HandoverType = 'pickup' | 'delivery';
type HandoverStatus = 'pending' | 'in-progress' | 'completed';

interface HandoverState {
  type: HandoverType;
  status: HandoverStatus;
  step: number;
  data: {
    date: string;
    time: string;
    mileage: number;
    fuelLevel: number;
    condition: {
      exterior: string;
      interior: string;
      mechanical: string;
      notes: string;
    };
    accessories: Record<string, boolean>;
    photos: string[];
    documents: Record<string, boolean>;
    signatures: {
      customer: string;
      staff: string;
      customerAccepted: boolean;
      staffAccepted: boolean;
    };
  };
}

const ACCESSORIES = [
  { key: 'spare_tire', label: 'إطار احتياطي', icon: '◉' },
  { key: 'jack', label: 'رافعة', icon: '🔧' },
  { key: 'repair_kit', label: 'عدة تصليح', icon: '🧰' },
  { key: 'floor_mats', label: 'فرشات', icon: '▦' },
  { key: 'extinguisher', label: 'طفاية حريق', icon: '🔥' },
  { key: 'first_aid', label: 'إسعافات أولية', icon: '✚' },
  { key: 'radio', label: 'راديو', icon: '📻' },
  { key: 'wipers', label: 'مساحات', icon: '≋' },
  { key: 'cables', label: 'أسلاك كهرباء', icon: '⚡' },
  { key: 'manual', label: 'دليل الاستخدام', icon: '📖' },
];

const DOCUMENTS = [
  { key: 'registration', label: 'استمارة المركبة', required: true },
  { key: 'insurance', label: 'بوليصة التأمين', required: true },
  { key: 'inspection', label: 'فحص دوري', required: false },
  { key: 'permit', label: 'تصريح', required: false },
];

const FUEL_LEVELS = [
  { value: 0, label: 'فارغ', icon: '⛽' },
  { value: 25, label: 'ربع', icon: '¼' },
  { value: 50, label: 'نصف', icon: '½' },
  { value: 75, label: 'ثلاثة أرباع', icon: '¾' },
  { value: 100, label: 'ممتلئ', icon: '●' },
];

const STEPS = [
  { id: 1, title: 'المعلومات الأساسية', icon: User, subtitle: 'التاريخ والوقت' },
  { id: 2, title: 'الوقود والعداد', icon: Gauge, subtitle: 'مستوى الوقود والمسافة' },
  { id: 3, title: 'المعدات والمستندات', icon: Package, subtitle: 'الملحقات والأوراق' },
  { id: 4, title: 'فحص المركبة', icon: Settings, subtitle: 'الفحص الشامل' },
  { id: 5, title: 'الصور والملاحظات', icon: Camera, subtitle: 'التوثيق' },
  { id: 6, title: 'التوقيع والاعتماد', icon: Signature, subtitle: 'إتمام العملية' },
];

interface VehicleHandoverUnifiedProps {
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
  initialType?: HandoverType;
  onComplete?: (type: HandoverType, data: HandoverState['data']) => void;
}

export function VehicleHandoverUnified({
  contract,
  initialType = 'pickup',
  onComplete,
}: VehicleHandoverUnifiedProps) {
  const [handoverState, setHandoverState] = useState<HandoverState>({
    type: initialType,
    status: 'pending',
    step: 1,
    data: {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      mileage: 0,
      fuelLevel: 50,
      condition: {
        exterior: '',
        interior: '',
        mechanical: '',
        notes: '',
      },
      accessories: {},
      photos: [],
      documents: {},
      signatures: {
        customer: '',
        staff: '',
        customerAccepted: false,
        staffAccepted: false,
      },
    },
  });

  const [currentType, setCurrentType] = useState<HandoverType>(initialType);

  const isPickup = currentType === 'pickup';
  const pickupColor = isPickup;
  const accentBg = isPickup ? 'bg-emerald-500' : 'bg-amber-500';
  const accentBgHover = isPickup ? 'hover:bg-emerald-600' : 'hover:bg-amber-600';
  const accentBorder = isPickup ? 'border-emerald-500' : 'border-amber-500';
  const accentText = isPickup ? 'text-emerald-600' : 'text-amber-600';
  const accentBgLight = isPickup ? 'bg-emerald-50' : 'bg-amber-50';
  const gradientBg = isPickup
    ? 'from-emerald-50 via-teal-50 to-cyan-50'
    : 'from-amber-50 via-orange-50 to-yellow-50';
  const gradientHeader = isPickup
    ? 'from-emerald-500 to-emerald-600'
    : 'from-amber-500 to-amber-600';
  const accentBgSubtle = isPickup ? 'bg-emerald-100' : 'bg-amber-100';
  const accentTextSubtle = isPickup ? 'text-emerald-200' : 'text-amber-200';

  const updateData = <K extends keyof HandoverState['data']>(
    key: K,
    value: HandoverState['data'][K]
  ) => {
    setHandoverState((prev) => ({
      ...prev,
      data: { ...prev.data, [key]: value },
    }));
  };

  const nextStep = () => {
    if (handoverState.step < STEPS.length) {
      setHandoverState((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const prevStep = () => {
    if (handoverState.step > 1) {
      setHandoverState((prev) => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const toggleAccessory = (key: string) => {
    setHandoverState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        accessories: {
          ...prev.data.accessories,
          [key]: !prev.data.accessories[key],
        },
      },
    }));
  };

  const toggleDocument = (key: string) => {
    setHandoverState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        documents: {
          ...prev.data.documents,
          [key]: !prev.data.documents[key],
        },
      },
    }));
  };

  const handleNext = () => {
    if (handoverState.step < STEPS.length) {
      setHandoverState((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const handlePrev = () => {
    if (handoverState.step > 1) {
      setHandoverState((prev) => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const handleSubmit = () => {
    setHandoverState((prev) => ({ ...prev, status: 'completed' }));
    onComplete?.(currentType, handoverState.data);
  };

  const switchType = (type: HandoverType) => {
    setCurrentType(type);
    setHandoverState((prev) => ({
      ...prev,
      type,
      step: 1,
      status: 'pending',
    }));
  };

  // Render current step content
  const renderStepContent = () => {
    switch (handoverState.step) {
      case 1:
        return <BasicInfoStep />;
      case 2:
        return <FuelMileageStep />;
      case 3:
        return <AccessoriesDocumentsStep />;
      case 4:
        return <ConditionStep />;
      case 5:
        return <PhotosNotesStep />;
      case 6:
        return <SignatureStep />;
      default:
        return null;
    }
  };

  // Step Components
  const BasicInfoStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date & Time */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-500" />
            التاريخ
          </Label>
          <Input
            type="date"
            value={handoverState.data.date}
            onChange={(e) => updateData('date', e.target.value)}
            className="text-lg h-12"
          />
        </div>
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            الوقت
          </Label>
          <Input
            type="time"
            value={handoverState.data.time}
            onChange={(e) => updateData('time', e.target.value)}
            className="text-lg h-12"
          />
        </div>
      </div>

      {/* Vehicle Info Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Car className={cn('w-8 h-8', isPickup ? 'text-emerald-400' : 'text-amber-400')} />
              <div>
                <h3 className="text-xl font-bold">
                  {contract?.vehicle_make} {contract?.vehicle_model}
                </h3>
                <p className="text-slate-400 text-sm">
                  {contract?.vehicle_year} • {contract?.vehicle_plate}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>{contract?.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span dir="ltr">{contract?.customer_phone}</span>
              </div>
            </div>
          </div>
          <div
            className={cn(
              'px-4 py-2 rounded-full text-sm font-bold',
              accentBg
            )}
          >
            {isPickup ? 'استلام' : 'تسليم'}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const FuelMileageStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Mileage */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-100">
        <Label className="text-lg font-semibold mb-4 flex items-center gap-3">
          <Gauge className="w-6 h-6 text-slate-600" />
          قراءة العداد (كم)
        </Label>
        <div className="relative">
          <Input
            type="number"
            value={handoverState.data.mileage}
            onChange={(e) => updateData('mileage', parseInt(e.target.value) || 0)}
            className="text-3xl font-bold text-center h-16"
            placeholder="0"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            كم
          </span>
        </div>
      </div>

      {/* Fuel Level */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-100">
        <Label className="text-lg font-semibold mb-4 flex items-center gap-3">
          <Fuel className="w-6 h-6 text-slate-600" />
          مستوى الوقود
        </Label>
        <div className="flex gap-2 flex-wrap">
          {FUEL_LEVELS.map((level) => {
            const isSelected = handoverState.data.fuelLevel === level.value;
            const levelColor =
              level.value === 0
                ? 'bg-red-500'
                : level.value === 25
                  ? 'bg-orange-500'
                  : level.value === 50
                    ? 'bg-amber-500'
                    : level.value === 75
                      ? 'bg-yellow-500'
                      : 'bg-green-500';

            return (
              <button
                key={level.value}
                onClick={() => updateData('fuelLevel', level.value)}
                className={cn(
                  'flex-1 min-w-[80px] p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2',
                  isSelected
                    ? cn(accentBorder, accentBgLight)
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <span className="text-2xl">{level.icon}</span>
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-full text-white',
                    levelColor
                  )}
                >
                  {level.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const AccessoriesDocumentsStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Accessories */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-100">
        <Label className="text-lg font-semibold mb-4 flex items-center gap-3">
          <Package className="w-6 h-6 text-slate-600" />
          ملحقات المركبة
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ACCESSORIES.map((item) => {
            const isChecked = handoverState.data.accessories[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggleAccessory(item.key)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2',
                  isChecked
                    ? cn(accentBorder, accentBgLight)
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-center font-medium">{item.label}</span>
                {isChecked && (
                  <Check className={cn('w-4 h-4', accentText)} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-100">
        <Label className="text-lg font-semibold mb-4 flex items-center gap-3">
          <FileText className="w-6 h-6 text-slate-600" />
          المستندات المطلوبة
        </Label>
        <div className="space-y-3">
          {DOCUMENTS.map((doc) => {
            const isChecked = handoverState.data.documents[doc.key];
            return (
              <div
                key={doc.key}
                className={cn(
                  'flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer',
                  isChecked
                    ? cn(accentBorder, accentBgLight)
                    : 'border-slate-200 hover:border-slate-300'
                )}
                onClick={() => toggleDocument(doc.key)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={isChecked} className="pointer-events-none" />
                  <span className="font-medium">{doc.label}</span>
                  {doc.required && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      مطلوب
                    </span>
                  )}
                </div>
                {isChecked && (
                  <Check className={cn('w-5 h-5', accentText)} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const ConditionStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exterior */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100">
          <Label className="text-base font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5" />
            الخارجي
          </Label>
          <Textarea
            value={handoverState.data.condition.exterior}
            onChange={(e) =>
              updateData('condition', {
                ...handoverState.data.condition,
                exterior: e.target.value,
              })
            }
            placeholder="الهيكل، الأضواء، الإطارات، الزجاج..."
            rows={4}
            className="bg-white border-blue-200"
          />
        </div>

        {/* Interior */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-100">
          <Label className="text-base font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            الداخلي
          </Label>
          <Textarea
            value={handoverState.data.condition.interior}
            onChange={(e) =>
              updateData('condition', {
                ...handoverState.data.condition,
                interior: e.target.value,
              })
            }
            placeholder="المقاعد، الفرش، المكيف..."
            rows={4}
            className="bg-white border-purple-200"
          />
        </div>

        {/* Mechanical */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-100">
          <Label className="text-base font-bold text-green-900 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            الميكانيكي
          </Label>
          <Textarea
            value={handoverState.data.condition.mechanical}
            onChange={(e) =>
              updateData('condition', {
                ...handoverState.data.condition,
                mechanical: e.target.value,
              })
            }
            placeholder="المحرك، الفرامل، التعليق..."
            rows={4}
            className="bg-white border-green-200"
          />
        </div>
      </div>
    </motion.div>
  );

  const PhotosNotesStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Photo Upload Area */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-dashed border-slate-300">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">إضافة صور توضيحية</h3>
            <p className="text-sm text-slate-500 mt-1">
              التقط صوراً للمركبة من عدة زوايا
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className={cn(accentBorder, accentText)}
          >
            <Camera className="w-4 h-4 ml-2" />
            فتح الكاميرا
          </Button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-100">
        <Label className="text-base font-semibold mb-4 flex items-center gap-3">
          <FileText className="w-6 h-6 text-slate-600" />
          ملاحظات إضافية
        </Label>
        <Textarea
          value={handoverState.data.condition.notes}
          onChange={(e) =>
            updateData('condition', {
              ...handoverState.data.condition,
              notes: e.target.value,
            })
          }
          placeholder="أي ملاحظات خاصة..."
          rows={5}
          className="text-base"
        />
      </div>
    </motion.div>
  );

  const SignatureStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl p-8 shadow-xl">
        {/* Customer Signature */}
        <div className="mb-8 pb-8 border-b-2 border-slate-100">
          <Label className="text-lg font-bold mb-4 flex items-center gap-2">
            <User className="w-6 h-6 text-slate-600" />
            توقيع العميل
          </Label>
          <Input
            type="text"
            value={handoverState.data.signatures.customer}
            onChange={(e) =>
              updateData('signatures', {
                ...handoverState.data.signatures,
                customer: e.target.value,
              })
            }
            placeholder="الاسم الكامل"
            className="text-lg mb-4"
          />
          <div className="h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
            <Signature className="w-12 h-12 opacity-50" />
          </div>
        </div>

        {/* Staff Signature */}
        <div className="mb-8 pb-8 border-b-2 border-slate-100">
          <Label className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-600" />
            توقيع الموظف
          </Label>
          <Input
            type="text"
            value={handoverState.data.signatures.staff}
            onChange={(e) =>
              updateData('signatures', {
                ...handoverState.data.signatures,
                staff: e.target.value,
              })
            }
            placeholder="اسم الموظف"
            className="text-lg mb-4"
          />
          <div className="h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
            <Signature className="w-12 h-12 opacity-50" />
          </div>
        </div>

        {/* Acknowledgment */}
        <div className="space-y-4">
          <div
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
              handoverState.data.signatures.customerAccepted
                ? cn(accentBorder, accentBgLight)
                : 'border-slate-200 hover:border-slate-300'
            )}
            onClick={() =>
              updateData('signatures', {
                ...handoverState.data.signatures,
                customerAccepted: !handoverState.data.signatures.customerAccepted,
              })
            }
          >
            <Checkbox
              checked={handoverState.data.signatures.customerAccepted}
              className="mt-1"
            />
            <p className="text-sm text-slate-700">
              أقر بأنني فحصت المركبة واستلمتها/سلمتها بالحالة الموضحة أعلاه
            </p>
          </div>

          <div
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
              handoverState.data.signatures.staffAccepted
                ? cn(accentBorder, accentBgLight)
                : 'border-slate-200 hover:border-slate-300'
            )}
            onClick={() =>
              updateData('signatures', {
                ...handoverState.data.signatures,
                staffAccepted: !handoverState.data.signatures.staffAccepted,
              })
            }
          >
            <Checkbox
              checked={handoverState.data.signatures.staffAccepted}
              className="mt-1"
            />
            <p className="text-sm text-slate-700">
              أوافق على صحة البيانات المسجلة وأتحمل مسؤولية التدقيق
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={cn('min-h-screen bg-gradient-to-br', gradientBg, 'font-sans')}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Car className={cn('w-8 h-8', accentText)} />
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {isPickup ? 'استلام المركبة' : 'تسليم المركبة'}
                </h1>
                <p className="text-sm text-slate-500">
                  {contract?.contract_number} • {contract?.customer_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isPickup ? 'default' : 'outline'}
                onClick={() => switchType('pickup')}
                className={cn(
                  'px-4 py-2',
                  isPickup
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                استلام
              </Button>
              <Button
                variant={!isPickup ? 'default' : 'outline'}
                onClick={() => switchType('delivery')}
                className={cn(
                  'px-4 py-2',
                  !isPickup
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                تسليم
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = handoverState.step === step.id;
            const isCompleted = handoverState.step > step.id;

            return (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300',
                      isActive
                        ? cn(accentBorder, accentBg, 'text-white shadow-lg')
                        : isCompleted
                          ? cn(accentBorder, accentBgSubtle, accentText)
                          : 'border-slate-300 bg-white text-slate-400'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </motion.div>
                  <span
                    className={cn(
                      'text-xs font-semibold mt-2 text-center max-w-[80px]',
                      isActive || isCompleted ? accentText : 'text-slate-400'
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-16 md:w-24 h-1 mx-2 rounded-full transition-all duration-300',
                      isCompleted ? accentBg : 'bg-slate-200'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          {/* Step Header */}
          <div className={cn('bg-gradient-to-r', gradientHeader, 'px-8 py-6 text-white')}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {STEPS[handoverState.step - 1].title}
                </h2>
                <p className={cn('text-sm', accentTextSubtle)}>
                  {STEPS[handoverState.step - 1].subtitle}
                </p>
              </div>
              <div className="text-right">
                <div className={cn('text-5xl font-bold', accentTextSubtle)}>
                  {handoverState.step}
                </div>
                <div className={cn('text-sm', accentTextSubtle)}>من {STEPS.length}</div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="p-8 min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={handoverState.step}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="bg-slate-50 px-8 py-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={handoverState.step === 1}
                className="px-6"
              >
                السابق
              </Button>

              {handoverState.step === STEPS.length ? (
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !handoverState.data.signatures.customerAccepted ||
                    !handoverState.data.signatures.staffAccepted
                  }
                  className={cn('px-8', accentBg, accentBgHover, 'text-white')}
                >
                  <Check className="w-5 h-5 ml-2" />
                  اعتماد {isPickup ? 'الاستلام' : 'التسليم'}
                </Button>
              ) : (
                <Button onClick={handleNext} className={cn('px-6', accentBg, accentBgHover, 'text-white')}>
                  التالي
                  <ChevronRight className="w-4 h-4 mr-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
