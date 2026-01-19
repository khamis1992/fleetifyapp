/**
 * Vehicle Return Registration Form Dialog
 * Comprehensive form for recording vehicle return with condition assessment
 *
 * @component VehicleReturnFormDialog
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Fuel,
  Gauge,
  Car,
  Wrench,
  Package,
  Camera,
  Upload,
  X,
  Check,
  AlertTriangle,
  Shield,
  User,
  FileText,
  Plus,
  Minus,
  Star,
  MapPin,
  ChevronDown,
  ChevronUp,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { VehicleMarking } from './vehicle-inspection/VehicleMarking';
import { VehicleMark } from './vehicle-inspection/types';

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
interface VehicleReturnFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
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
}

interface FormErrors {
  returnDate?: string;
  returnTime?: string;
  mileage?: string;
  fuelLevel?: string;
}

interface PhotoPreview {
  id: string;
  url: string;
  file: File;
}

// ===== Comprehensive Check Sheet Types =====
type ConditionStatus = 'good' | 'scratch' | 'broken' | 'dented' | 'missing' | 'needs_maintenance';

interface InspectionItem {
  id: string;
  name: string;
  nameAr: string;
  condition: ConditionStatus;
  notes: string;
  photo?: PhotoPreview;
}

interface InspectionCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: any;
  items: InspectionItem[];
}

interface MechanicalItem {
  id: string;
  name: string;
  nameAr: string;
  condition: 'good' | 'needs_maintenance' | 'broken';
  notes: string;
}

// ===== Fuel Level Options =====
const fuelLevels = [
  { value: 0, label: 'فارغ', color: 'from-red-500 to-red-600', bgColor: 'bg-red-50' },
  { value: 25, label: 'ربع', color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50' },
  { value: 50, label: 'نصف', color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50' },
  { value: 75, label: 'ثلاثة أرباع', color: 'from-lime-500 to-lime-600', bgColor: 'bg-lime-50' },
  { value: 100, label: 'امل', color: 'from-green-500 to-green-600', bgColor: 'bg-green-50' },
];

// ===== Condition Rating Options =====
const conditionRatings = [
  { value: 'excellent', label: 'ممتاز', icon: '⭐⭐⭐⭐⭐', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'good', label: 'جيد', icon: '⭐⭐⭐⭐', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'fair', label: 'متوسط', icon: '⭐⭐⭐', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'poor', label: 'سيء', icon: '⭐⭐', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: 'damaged', label: 'تالف', icon: '⭐', color: 'bg-red-50 border-red-200 text-red-700' },
];

// ===== Condition Status Options =====
const exteriorConditionOptions: { value: ConditionStatus; label: string; color: string }[] = [
  { value: 'good', label: 'سليم', color: 'bg-green-50 border-green-300 text-green-700' },
  { value: 'scratch', label: 'خدش', color: 'bg-yellow-50 border-yellow-300 text-yellow-700' },
  { value: 'dented', label: 'مثني', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { value: 'broken', label: 'كسر', color: 'bg-red-50 border-red-300 text-red-700' },
  { value: 'missing', label: 'مفقود', color: 'bg-red-50 border-red-300 text-red-700' },
];

const mechanicalConditionOptions: { value: 'good' | 'needs_maintenance' | 'broken'; label: string; color: string }[] = [
  { value: 'good', label: 'جيد', color: 'bg-green-50 border-green-300 text-green-700' },
  { value: 'needs_maintenance', label: 'يحتاج صيانة', color: 'bg-yellow-50 border-yellow-300 text-yellow-700' },
  { value: 'broken', label: 'معطل', color: 'bg-red-50 border-red-300 text-red-700' },
];

// ===== Initial Inspection Data =====
const initialExteriorItems: InspectionItem[] = [
  { id: 'front_bumper', name: 'Front Bumper', nameAr: 'الصادم الأمامي', condition: 'good', notes: '' },
  { id: 'rear_bumper', name: 'Rear Bumper', nameAr: 'الصادم الخلفي', condition: 'good', notes: '' },
  { id: 'hood', name: 'Hood', nameAr: 'الغطاء الأمامي', condition: 'good', notes: '' },
  { id: 'trunk', name: 'Trunk', nameAr: 'صندوق الأمتعة', condition: 'good', notes: '' },
  { id: 'door_front_left', name: 'Front Left Door', nameAr: 'الباب الأمامي الأيسر', condition: 'good', notes: '' },
  { id: 'door_front_right', name: 'Front Right Door', nameAr: 'الباب الأمامي الأيمن', condition: 'good', notes: '' },
  { id: 'door_rear_left', name: 'Rear Left Door', nameAr: 'الباب الخلفي الأيسر', condition: 'good', notes: '' },
  { id: 'door_rear_right', name: 'Rear Right Door', nameAr: 'الباب الخلفي الأيمن', condition: 'good', notes: '' },
  { id: 'fender_front_left', name: 'Front Left Fender', nameAr: 'الجناح الأمامي الأيسر', condition: 'good', notes: '' },
  { id: 'fender_front_right', name: 'Front Right Fender', nameAr: 'الجناح الأمامي الأيمن', condition: 'good', notes: '' },
  { id: 'fender_rear_left', name: 'Rear Left Fender', nameAr: 'الجناح الخلفي الأيسر', condition: 'good', notes: '' },
  { id: 'fender_rear_right', name: 'Rear Right Fender', nameAr: 'الجناح الخلفي الأيمن', condition: 'good', notes: '' },
  { id: 'roof', name: 'Roof', nameAr: 'السقف', condition: 'good', notes: '' },
  { id: 'windshield', name: 'Windshield', nameAr: 'الزجاج الأمامي', condition: 'good', notes: '' },
  { id: 'windows', name: 'Windows', nameAr: 'النوافذ', condition: 'good', notes: '' },
  { id: 'mirror_left', name: 'Left Mirror', nameAr: 'المرآة اليسرى', condition: 'good', notes: '' },
  { id: 'mirror_right', name: 'Right Mirror', nameAr: 'المرآة اليمنى', condition: 'good', notes: '' },
  { id: 'lights_head', name: 'Headlights', nameAr: 'الأضواء الأمامية', condition: 'good', notes: '' },
  { id: 'lights_tail', name: 'Taillights', nameAr: 'الأضواء الخلفية', condition: 'good', notes: '' },
  { id: 'lights_signal', name: 'Signal Lights', nameAr: 'أضواء الإشارة', condition: 'good', notes: '' },
];

const initialInteriorItems: InspectionItem[] = [
  { id: 'seats_front', name: 'Front Seats', nameAr: 'المقاعد الأمامية', condition: 'good', notes: '' },
  { id: 'seats_rear', name: 'Rear Seats', nameAr: 'المقاعد الخلفية', condition: 'good', notes: '' },
  { id: 'dashboard', name: 'Dashboard', nameAr: 'لوحة القيادة', condition: 'good', notes: '' },
  { id: 'steering_wheel', name: 'Steering Wheel', nameAr: 'عجلة القيادة', condition: 'good', notes: '' },
  { id: 'floor_mats', name: 'Floor Mats', nameAr: 'سجاد الأرضية', condition: 'good', notes: '' },
  { id: 'ceiling', name: 'Ceiling', nameAr: 'السقف الداخلي', condition: 'good', notes: '' },
  { id: 'door_panels', name: 'Door Panels', nameAr: 'ألواح الأبواب', condition: 'good', notes: '' },
  { id: 'ac_controls', name: 'AC/Heater Controls', nameAr: 'أجهزة التحكم', condition: 'good', notes: '' },
  { id: 'entertainment', name: 'Entertainment System', nameAr: 'نظام الترفيه', condition: 'good', notes: '' },
  { id: 'gauges', name: 'Gauges/Meters', nameAr: 'عدادات السيارة', condition: 'good', notes: '' },
  { id: 'buttons', name: 'Buttons/Switches', nameAr: 'الأزرار والمفاتيح', condition: 'good', notes: '' },
];

const initialMechanicalItems: MechanicalItem[] = [
  { id: 'engine', name: 'Engine', nameAr: 'المحرك', condition: 'good', notes: '' },
  { id: 'transmission', name: 'Transmission', nameAr: 'ناقل الحركة', condition: 'good', notes: '' },
  { id: 'brakes', name: 'Brakes', nameAr: 'الفرامل', condition: 'good', notes: '' },
  { id: 'suspension', name: 'Suspension', nameAr: 'المساعدين', condition: 'good', notes: '' },
  { id: 'tires', name: 'Tires', nameAr: 'الإطارات', condition: 'good', notes: '' },
  { id: 'battery', name: 'Battery', nameAr: 'البطارية', condition: 'good', notes: '' },
  { id: 'oil', name: 'Oil Level', nameAr: 'مستوى الزيت', condition: 'good', notes: '' },
  { id: 'coolant', name: 'Coolant Level', nameAr: 'مستوى المبرد', condition: 'good', notes: '' },
  { id: 'ac', name: 'AC Performance', nameAr: 'عمل المكيف', condition: 'good', notes: '' },
  { id: 'lights_func', name: 'Lights Function', nameAr: 'عمل الأضواء', condition: 'good', notes: '' },
  { id: 'horn', name: 'Horn', nameAr: 'البوق', condition: 'good', notes: '' },
  { id: 'wipers', name: 'Wipers', nameAr: 'المساحات', condition: 'good', notes: '' },
];

// ===== Additional Charges Types =====
const chargeTypes = [
  { id: 'extra_km', label: 'كيلومترات إضافية', icon: Gauge },
  { id: 'fuel_shortage', label: 'نقص في الوقود', icon: Fuel },
  { id: 'cleaning', label: 'تنظيف', icon: Wrench },
  { id: 'damage', label: 'أضرار', icon: AlertTriangle },
  { id: 'late_return', label: 'تأخير في التسليم', icon: Clock },
  { id: 'other', label: 'أخرى', icon: Plus },
];

// ===== Component =====
export const VehicleReturnFormDialog = ({
  open,
  onOpenChange,
  contract,
}: VehicleReturnFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [returnDate, setReturnDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [returnTime, setReturnTime] = useState(format(new Date(), 'HH:mm'));
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState<number>(75);
  const [exteriorCondition, setExteriorCondition] = useState('good');
  const [interiorCondition, setInteriorCondition] = useState('good');
  const [mechanicalCondition, setMechanicalCondition] = useState('good');

  // Comprehensive inspection data
  const [exteriorItems, setExteriorItems] = useState<InspectionItem[]>(initialExteriorItems);
  const [interiorItems, setInteriorItems] = useState<InspectionItem[]>(initialInteriorItems);
  const [mechanicalItems, setMechanicalItems] = useState<MechanicalItem[]>(initialMechanicalItems);

  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [notes, setNotes] = useState('');
  const [customerAcknowledgment, setCustomerAcknowledgment] = useState(false);
  const [staffNotes, setStaffNotes] = useState('');

  // Additional charges
  const [additionalCharges, setAdditionalCharges] = useState<Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
  }>>([]);

  // Accessories & Documents
  const [accessories, setAccessories] = useState({
    spare_tire: true,
    jack: true,
    lug_wrench: true,
    extinguisher: true,
    first_aid_kit: true,
    warning_triangle: true,
    floor_mats: true,
    car_manual: true,
    tools: true,
  });

  const [documents, setDocuments] = useState({
    registration: true,
    insurance: true,
    permit: true,
  });

  // Vehicle Marks State (new marking system)
  const [vehicleMarks, setVehicleMarks] = useState<VehicleMark[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5; // Updated to include visual inspection step

  // Calculate additional charges total
  const chargesTotal = additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!returnDate) newErrors.returnDate = 'مطلوب';
    if (!returnTime) newErrors.returnTime = 'مطلوب';
    if (!mileage || parseInt(mileage) <= 0) newErrors.mileage = 'مطلوب';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [returnDate, returnTime, mileage]);

  // Handle photo upload
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos: PhotoPreview[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      file,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  // Handle inspection item photo upload
  const handleItemPhotoUpload = useCallback((itemId: string, category: 'exterior' | 'interior', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const photo: PhotoPreview = {
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      file,
    };

    if (category === 'exterior') {
      setExteriorItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, photo } : item
      ));
    } else {
      setInteriorItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, photo } : item
      ));
    }
  }, []);

  // Update inspection item condition
  const updateItemCondition = useCallback((
    itemId: string,
    category: 'exterior' | 'interior' | 'mechanical',
    condition: ConditionStatus | 'good' | 'needs_maintenance' | 'broken'
  ) => {
    if (category === 'exterior') {
      setExteriorItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, condition: condition as ConditionStatus } : item
      ));
    } else if (category === 'interior') {
      setInteriorItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, condition: condition as ConditionStatus } : item
      ));
    } else {
      setMechanicalItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, condition: condition as 'good' | 'needs_maintenance' | 'broken' } : item
      ));
    }
  }, []);

  // Update inspection item notes
  const updateItemNotes = useCallback((
    itemId: string,
    category: 'exterior' | 'interior' | 'mechanical',
    notes: string
  ) => {
    if (category === 'exterior') {
      setExteriorItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, notes } : item
      ));
    } else if (category === 'interior') {
      setInteriorItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, notes } : item
      ));
    } else {
      setMechanicalItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, notes } : item
      ));
    }
  }, []);

  // Calculate overall condition ratings
  const calculateOverallRating = useCallback((items: InspectionItem[] | MechanicalItem[]): string => {
    const hasIssues = items.some(item => item.condition !== 'good');
    const hasMajorIssues = items.some(item =>
      item.condition === 'broken' || item.condition === 'missing' || item.condition === 'dented'
    );

    if (hasMajorIssues) return 'damaged';
    if (hasIssues) return 'fair';
    return 'good';
  }, []);

  // Remove photo
  const removePhoto = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  // Add charge
  const addCharge = useCallback(() => {
    setAdditionalCharges(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'other',
      description: '',
      amount: 0,
    }]);
  }, []);

  // Update charge
  const updateCharge = useCallback((id: string, field: string, value: string | number) => {
    setAdditionalCharges(prev => prev.map(charge =>
      charge.id === id ? { ...charge, [field]: value } : charge
    ));
  }, []);

  // Remove charge
  const removeCharge = useCallback((id: string) => {
    setAdditionalCharges(prev => prev.filter(c => c.id !== id));
  }, []);

  // ===== Vehicle Marking Handlers =====

  // Handle adding a new mark
  const handleAddMark = useCallback((mark: Omit<VehicleMark, 'id' | 'created_at' | 'created_by'>) => {
    const newMark: VehicleMark = {
      ...mark,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      created_by: '', // Will be set by user in handleSubmit
    };
    setVehicleMarks(prev => [...prev, newMark]);
  }, []);

  // Handle deleting a mark
  const handleDeleteMark = useCallback((markId: string) => {
    setVehicleMarks(prev => prev.filter(mark => mark.id !== markId));
  }, []);

  // Submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'خطأ في التحقق',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Upload photos to storage
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileName = `vehicle-return/${contract.id}/${Date.now()}-${photo.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-documents')
          .upload(fileName, photo.file);

        if (uploadError) throw uploadError;
        photoUrls.push(uploadData.path);
      }

      // Upload inspection item photos
      for (const item of [...exteriorItems, ...interiorItems]) {
        if (item.photo) {
          const fileName = `vehicle-return/${contract.id}/inspection-${item.id}-${Date.now()}-${item.photo.file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('vehicle-documents')
            .upload(fileName, item.photo.file);

          if (uploadError) throw uploadError;
          photoUrls.push(uploadData.path);
        }
      }

      // Calculate overall ratings from comprehensive inspection
      const exteriorRating = calculateOverallRating(exteriorItems);
      const interiorRating = calculateOverallRating(interiorItems);
      const mechanicalRating = calculateOverallRating(mechanicalItems);

      // Prepare comprehensive inspection data
      const inspectionData = {
        exterior: exteriorItems.map(({ id, nameAr, condition, notes }) => ({
          id,
          name: nameAr,
          condition,
          notes: notes || null,
        })),
        interior: interiorItems.map(({ id, nameAr, condition, notes }) => ({
          id,
          name: nameAr,
          condition,
          notes: notes || null,
        })),
        mechanical: mechanicalItems.map(({ id, nameAr, condition, notes }) => ({
          id,
          name: nameAr,
          condition,
          notes: notes || null,
        })),
      };

      // Create return record
      const { data: returnRecord, error: returnError } = await supabase
        .from('vehicle_inspections')
        .insert({
          contract_id: contract.id,
          company_id: user?.user_metadata?.company_id,
          inspection_type: 'check_out',
          inspection_date: returnDate,
          inspection_time: returnTime,
          mileage: parseInt(mileage),
          fuel_level: fuelLevel,
          exterior_condition: exteriorRating,
          interior_condition: interiorRating,
          mechanical_condition: mechanicalRating,
          inspection_details: inspectionData,
          accessories: Object.entries(accessories)
            .filter(([_, present]) => present)
            .map(([key]) => key),
          documents: Object.entries(documents)
            .filter(([_, present]) => present)
            .map(([key]) => key),
          photos: photoUrls,
          damages: additionalCharges
            .filter(c => c.type === 'damage')
            .map(c => c.description)
            .filter(Boolean),
          additional_charges: additionalCharges,
          notes: notes,
          staff_notes: staffNotes,
          customer_acknowledgment: customerAcknowledgment,
          status: 'completed',
          // Visual inspection data - using new marking system
          visual_inspection_zones: vehicleMarks.map(mark => ({
            zone_id: mark.id,
            zone_name: 'Mark',
            zone_name_ar: 'علامة',
            category: 'exterior' as const,
            condition: mark.condition || 'scratch',
            severity: mark.severity || 'minor',
            description: mark.description,
            photo_urls: mark.photo_urls,
            marked_by: user?.id || '',
            marked_at: mark.created_at,
          })),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (returnError) throw returnError;

      toast({
        title: 'تم تسجيل التسليم بنجاح',
        description: `تم تسجيل تسليم المركبة ${contract.vehicle_plate} بنجاح`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['contract-details'] });

      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting return:', error);
      toast({
        title: 'خطأ في تسجيل التسليم',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    contract,
    returnDate,
    returnTime,
    mileage,
    fuelLevel,
    exteriorItems,
    interiorItems,
    mechanicalItems,
    accessories,
    documents,
    photos,
    additionalCharges,
    notes,
    staffNotes,
    customerAcknowledgment,
    vehicleMarks,
    calculateOverallRating,
    validateForm,
    toast,
    queryClient,
    onOpenChange,
  ]);

  // Next step
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  // Previous step
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-neutral-100 bg-gradient-to-br from-teal-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-neutral-900">
                  تسجيل تسليم المركبة
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {contract.contract_number} • {contract.vehicle_make} {contract.vehicle_model}
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-0 px-4 py-2">
              <AlertTriangle className="w-4 h-4 ml-2" />
              استرجاع المركبة
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">
                الخطوة {currentStep} من {totalSteps}
              </span>
              <span className="text-sm text-neutral-500">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-8">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">المعلومات الأساسية</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Return Date */}
                  <div className="space-y-2">
                    <Label htmlFor="returnDate" className="text-base font-medium">
                      <Calendar className="w-4 h-4 ml-2 inline" />
                      تاريخ التسليم *
                    </Label>
                    <Input
                      id="returnDate"
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className={cn(
                        "rounded-xl border-neutral-200",
                        errors.returnDate && "border-red-300 focus:border-red-500"
                      )}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                    {errors.returnDate && (
                      <p className="text-sm text-red-600">{errors.returnDate}</p>
                    )}
                  </div>

                  {/* Return Time */}
                  <div className="space-y-2">
                    <Label htmlFor="returnTime" className="text-base font-medium">
                      <Clock className="w-4 h-4 ml-2 inline" />
                      وقت التسليم *
                    </Label>
                    <Input
                      id="returnTime"
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className={cn(
                        "rounded-xl border-neutral-200",
                        errors.returnTime && "border-red-300 focus:border-red-500"
                      )}
                    />
                    {errors.returnTime && (
                      <p className="text-sm text-red-600">{errors.returnTime}</p>
                    )}
                  </div>

                  {/* Mileage */}
                  <div className="space-y-2">
                    <Label htmlFor="mileage" className="text-base font-medium">
                      <Gauge className="w-4 h-4 ml-2 inline" />
                      قراءة العداد (كم) *
                    </Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="مثال: 50000"
                      className={cn(
                        "rounded-xl border-neutral-200",
                        errors.mileage && "border-red-300 focus:border-red-500"
                      )}
                    />
                    {errors.mileage && (
                      <p className="text-sm text-red-600">{errors.mileage}</p>
                    )}
                  </div>

                  {/* Fuel Level */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      <Fuel className="w-4 h-4 ml-2 inline" />
                      مستوى الوقود
                    </Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-4 bg-neutral-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fuelLevel}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className={cn(
                            'h-full bg-gradient-to-r',
                            fuelLevel <= 25 ? 'from-red-500 to-red-600' :
                            fuelLevel <= 50 ? 'from-yellow-500 to-yellow-600' :
                            fuelLevel <= 75 ? 'from-lime-500 to-lime-600' :
                            'from-green-500 to-green-600'
                          )}
                        />
                      </div>
                      <span className="text-lg font-bold text-neutral-700 w-16 text-center">{fuelLevel}%</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {fuelLevels.map((level) => (
                        <Button
                          key={level.value}
                          type="button"
                          variant={fuelLevel === level.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFuelLevel(level.value)}
                          className={cn(
                            "flex-1 rounded-lg",
                            fuelLevel === level.value
                              ? `bg-gradient-to-r ${level.color} text-white border-0`
                              : 'border-neutral-200'
                          )}
                        >
                          {level.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Visual Inspection */}
            {currentStep === 2 && (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900">فحص السيارة</h3>
                    <p className="text-sm text-neutral-500">انقر على أي مكان في الصورة لإضافة علامة ووصف المشكلة</p>
                  </div>
                </div>

                <VehicleMarking
                  vehicleImage="/images/vehicles/sedan-top-view.png"
                  marks={vehicleMarks}
                  onMarkAdd={handleAddMark}
                  onMarkDelete={handleDeleteMark}
                  mode="add"
                  contractId={contract.id}
                />

                {vehicleMarks.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg border border-neutral-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        <MapPin className="w-4 h-4 inline ml-2" />
                        العلامات المضافة ({vehicleMarks.length})
                      </h4>
                      <Badge variant="secondary" className="gap-1">
                        <Camera className="w-3 h-3" />
                        {vehicleMarks.filter(m => m.photo_urls.length > 0).length} مع صور
                      </Badge>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Vehicle Condition Check Sheet */}
            {currentStep === 3 && (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">بطاقة فحص الشاملة</h3>
                </div>

                {/* Exterior Inspection */}
                <CollapsibleSection
                  title="الفحص الخارجي"
                  description="تفقد جميع أجزاء الهيكل الخارجي"
                  icon={Car}
                  defaultExpanded={true}
                  storageKey="exterior_inspection"
                  badge="إلزامي"
                  badgeVariant="default"
                  className="border-neutral-200"
                >
                  <div className="space-y-4">
                    {exteriorItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <Label className="text-base font-semibold text-neutral-900">{item.nameAr}</Label>
                            <p className="text-sm text-neutral-500">{item.name}</p>
                          </div>
                          <div className="flex gap-2">
                            {exteriorConditionOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => updateItemCondition(item.id, 'exterior', option.value)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2",
                                  item.condition === option.value
                                    ? option.color
                                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Photo upload for damaged items */}
                        {(item.condition === 'scratch' || item.condition === 'broken' || item.condition === 'dented') && (
                          <div className="flex items-center gap-3 mt-3">
                            <input
                              type="file"
                              id={`photo-${item.id}`}
                              accept="image/*"
                              onChange={(e) => handleItemPhotoUpload(item.id, 'exterior', e)}
                              className="hidden"
                            />
                            <label
                              htmlFor={`photo-${item.id}`}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer transition-colors text-sm font-medium"
                            >
                              <Camera className="w-4 h-4" />
                              إضافة صورة
                            </label>
                            {item.photo && (
                              <div className="relative">
                                <img
                                  src={item.photo.url}
                                  alt={item.nameAr}
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-teal-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExteriorItems(prev => prev.map(i =>
                                      i.id === item.id ? { ...i, photo: undefined } : i
                                    ));
                                  }}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes field */}
                        <div className="mt-3">
                          <Input
                            placeholder="ملاحظات..."
                            value={item.notes}
                            onChange={(e) => updateItemNotes(item.id, 'exterior', e.target.value)}
                            className="rounded-lg border-neutral-200 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* Interior Inspection */}
                <CollapsibleSection
                  title="الفحص الداخلي"
                  description="تفقد جميع أجزاء المقصورة الداخلية"
                  icon={Package}
                  defaultExpanded={true}
                  storageKey="interior_inspection"
                  badge="إلزامي"
                  badgeVariant="default"
                  className="border-neutral-200"
                >
                  <div className="space-y-4">
                    {interiorItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <Label className="text-base font-semibold text-neutral-900">{item.nameAr}</Label>
                            <p className="text-sm text-neutral-500">{item.name}</p>
                          </div>
                          <div className="flex gap-2">
                            {exteriorConditionOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => updateItemCondition(item.id, 'interior', option.value)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2",
                                  item.condition === option.value
                                    ? option.color
                                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Photo upload for damaged items */}
                        {(item.condition === 'scratch' || item.condition === 'broken' || item.condition === 'dented') && (
                          <div className="flex items-center gap-3 mt-3">
                            <input
                              type="file"
                              id={`photo-${item.id}`}
                              accept="image/*"
                              onChange={(e) => handleItemPhotoUpload(item.id, 'interior', e)}
                              className="hidden"
                            />
                            <label
                              htmlFor={`photo-${item.id}`}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer transition-colors text-sm font-medium"
                            >
                              <Camera className="w-4 h-4" />
                              إضافة صورة
                            </label>
                            {item.photo && (
                              <div className="relative">
                                <img
                                  src={item.photo.url}
                                  alt={item.nameAr}
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-teal-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInteriorItems(prev => prev.map(i =>
                                      i.id === item.id ? { ...i, photo: undefined } : i
                                    ));
                                  }}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes field */}
                        <div className="mt-3">
                          <Input
                            placeholder="ملاحظات..."
                            value={item.notes}
                            onChange={(e) => updateItemNotes(item.id, 'interior', e.target.value)}
                            className="rounded-lg border-neutral-200 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* Mechanical Inspection */}
                <CollapsibleSection
                  title="الفحص الميكانيكي"
                  description="تفقد جميع الأنظمة الميكانيكية"
                  icon={Wrench}
                  defaultExpanded={true}
                  storageKey="mechanical_inspection"
                  badge="إلزامي"
                  badgeVariant="default"
                  className="border-neutral-200"
                >
                  <div className="space-y-4">
                    {mechanicalItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <Label className="text-base font-semibold text-neutral-900">{item.nameAr}</Label>
                            <p className="text-sm text-neutral-500">{item.name}</p>
                          </div>
                          <div className="flex gap-2">
                            {mechanicalConditionOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => updateItemCondition(item.id, 'mechanical', option.value)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2",
                                  item.condition === option.value
                                    ? option.color
                                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Notes field */}
                        <div className="mt-3">
                          <Input
                            placeholder="ملاحظات..."
                            value={item.notes}
                            onChange={(e) => updateItemNotes(item.id, 'mechanical', e.target.value)}
                            className="rounded-lg border-neutral-200 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* Accessories & Equipment */}
                <CollapsibleSection
                  title="الإكسسوارات والمعدات"
                  description="تأكد من وجود جميع الملحقات"
                  icon={Package}
                  defaultExpanded={true}
                  storageKey="accessories_check"
                  badge="إلزامي"
                  badgeVariant="default"
                  className="border-neutral-200"
                >
                  <div className="space-y-6">
                    {/* Accessories Checklist */}
                    <div>
                      <h4 className="text-base font-semibold text-neutral-900 mb-3">الإكسسوارات</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries({
                          spare_tire: 'إطار احتياطي',
                          jack: 'رافعة',
                          lug_wrench: 'مفتاح العجلات',
                          extinguisher: 'طفاية حريق',
                          first_aid_kit: 'حقيبة إسعافات أولية',
                          warning_triangle: 'مثلث تحذير',
                          floor_mats: 'حصائر الأرضية',
                          car_manual: 'كتيب التعليمات',
                          tools: 'أدوات',
                        }).map(([key, label]) => (
                          <label
                            key={key}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                              accessories[key as keyof typeof accessories]
                                ? 'bg-teal-50 border-teal-300'
                                : 'border-neutral-200 hover:border-neutral-300'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={accessories[key as keyof typeof accessories] || false}
                              onChange={(e) => setAccessories(prev => ({
                                ...prev,
                                [key]: e.target.checked
                              }))}
                              className="w-5 h-5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm font-medium">{label}</span>
                            {accessories[key as keyof typeof accessories] && (
                              <Check className="w-4 h-4 text-teal-600 mr-auto" />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Documents Checklist */}
                    <div>
                      <h4 className="text-base font-semibold text-neutral-900 mb-3">المستندات</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries({
                          registration: 'استمارة السيارة',
                          insurance: 'التأمين',
                          permit: 'تصريح الطريق',
                        }).map(([key, label]) => (
                          <label
                            key={key}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                              documents[key as keyof typeof documents]
                                ? 'bg-teal-50 border-teal-300'
                                : 'border-neutral-200 hover:border-neutral-300'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={documents[key as keyof typeof documents] || false}
                              onChange={(e) => setDocuments(prev => ({
                                ...prev,
                                [key]: e.target.checked
                              }))}
                              className="w-5 h-5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm font-medium">{label}</span>
                            {documents[key as keyof typeof documents] && (
                              <Check className="w-4 h-4 text-teal-600 mr-auto" />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Summary Section */}
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-600" />
                      ملخص الحالة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-white border border-neutral-200">
                        <div className="text-sm text-neutral-600 mb-1">الخارجي</div>
                        <Badge className={cn(
                          "text-sm px-3 py-1",
                          calculateOverallRating(exteriorItems) === 'good' && 'bg-green-100 text-green-700',
                          calculateOverallRating(exteriorItems) === 'fair' && 'bg-yellow-100 text-yellow-700',
                          calculateOverallRating(exteriorItems) === 'damaged' && 'bg-red-100 text-red-700'
                        )}>
                          {conditionRatings.find(r => r.value === calculateOverallRating(exteriorItems))?.label}
                        </Badge>
                        <div className="text-xs text-neutral-500 mt-2">
                          {exteriorItems.filter(i => i.condition !== 'good').length} عنصر به مشاكل
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-white border border-neutral-200">
                        <div className="text-sm text-neutral-600 mb-1">الداخلي</div>
                        <Badge className={cn(
                          "text-sm px-3 py-1",
                          calculateOverallRating(interiorItems) === 'good' && 'bg-green-100 text-green-700',
                          calculateOverallRating(interiorItems) === 'fair' && 'bg-yellow-100 text-yellow-700',
                          calculateOverallRating(interiorItems) === 'damaged' && 'bg-red-100 text-red-700'
                        )}>
                          {conditionRatings.find(r => r.value === calculateOverallRating(interiorItems))?.label}
                        </Badge>
                        <div className="text-xs text-neutral-500 mt-2">
                          {interiorItems.filter(i => i.condition !== 'good').length} عنصر به مشاكل
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-white border border-neutral-200">
                        <div className="text-sm text-neutral-600 mb-1">الميكانيكي</div>
                        <Badge className={cn(
                          "text-sm px-3 py-1",
                          calculateOverallRating(mechanicalItems) === 'good' && 'bg-green-100 text-green-700',
                          calculateOverallRating(mechanicalItems) === 'fair' && 'bg-yellow-100 text-yellow-700',
                          calculateOverallRating(mechanicalItems) === 'damaged' && 'bg-red-100 text-red-700'
                        )}>
                          {conditionRatings.find(r => r.value === calculateOverallRating(mechanicalItems))?.label}
                        </Badge>
                        <div className="text-xs text-neutral-500 mt-2">
                          {mechanicalItems.filter(i => i.condition !== 'good').length} عنصر به مشاكل
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Accessories & Documents */}
            {currentStep === 4 && (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">الصور والمصاريف الإضافية</h3>
                </div>

                {/* Photo Upload */}
                <Card className="border-neutral-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Camera className="w-5 h-5 text-teal-600" />
                      صور المركبة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
                      <input
                        type="file"
                        id="photos"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <label htmlFor="photos" className="cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-4">
                          <Camera className="w-8 h-8 text-teal-500" />
                        </div>
                        <p className="text-base font-semibold text-neutral-900 mb-1">
                          انقر لرفع الصور
                        </p>
                        <p className="text-sm text-neutral-500">
                          أو اسحب الملفات وأفلتها هنا
                        </p>
                      </label>
                    </div>

                    {/* Photo Previews */}
                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                        {photos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.url}
                              alt="Preview"
                              className="w-full aspect-square object-cover rounded-lg border-2 border-neutral-200"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Charges */}
                <Card className="border-neutral-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        المصاريف الإضافية
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCharge}
                        className="gap-2 rounded-xl"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {additionalCharges.length === 0 ? (
                      <div className="text-center py-8 text-neutral-500">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                        <p>لا توجد مصاريف إضافية</p>
                        <p className="text-sm">انقر على "إضافة" لإضافة مصاريف</p>
                      </div>
                    ) : (
                      additionalCharges.map((charge) => (
                        <div key={charge.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                          <select
                            value={charge.type}
                            onChange={(e) => updateCharge(charge.id, 'type', e.target.value)}
                            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                          >
                            {chargeTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="text"
                            placeholder="الوصف"
                            value={charge.description}
                            onChange={(e) => updateCharge(charge.id, 'description', e.target.value)}
                            className="flex-1 rounded-lg border-neutral-200"
                          />
                          <Input
                            type="number"
                            placeholder="المبلغ"
                            value={charge.amount || ''}
                            onChange={(e) => updateCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-32 rounded-lg border-neutral-200"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCharge(charge.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}

                    {/* Total */}
                    {additionalCharges.length > 0 && (
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                        <span className="font-semibold text-neutral-900">الإجمالي</span>
                        <span className="text-xl font-bold text-teal-600">
                          {chargesTotal.toLocaleString()} ر.ق
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 5: Notes & Confirmation */}
            {currentStep === 5 && (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">
                    5
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900">الملاحظات والتأكيد</h3>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-base font-medium">
                    ملاحظات التسليم
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية حول التسليم..."
                    rows={4}
                    className="rounded-xl border-neutral-200 resize-none"
                  />
                </div>

                {/* Staff Notes */}
                <div className="space-y-2">
                  <Label htmlFor="staffNotes" className="text-base font-medium">
                    <Shield className="w-4 h-4 ml-2 inline" />
                    ملاحظات الموظف (داخلية)
                  </Label>
                  <Textarea
                    id="staffNotes"
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    placeholder="ملاحظات داخلية للموظفين فقط..."
                    rows={3}
                    className="rounded-xl border-neutral-200 resize-none"
                  />
                </div>

                {/* Summary Card */}
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-600" />
                      ملخص التسليم
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">التاريخ:</span>
                        <span className="font-semibold text-neutral-900" dir="ltr">
                          {format(new Date(returnDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">الوقت:</span>
                        <span className="font-semibold text-neutral-900">{returnTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">العداد:</span>
                        <span className="font-semibold text-neutral-900">{parseInt(mileage).toLocaleString()} كم</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">الوقود:</span>
                        <span className="font-semibold text-neutral-900">{fuelLevel}%</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-neutral-600 block">الخارجي</span>
                        <span className="font-semibold text-neutral-900">
                          {conditionRatings.find(r => r.value === exteriorCondition)?.label}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-600 block">الداخلي</span>
                        <span className="font-semibold text-neutral-900">
                          {conditionRatings.find(r => r.value === interiorCondition)?.label}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-600 block">الميكانيكي</span>
                        <span className="font-semibold text-neutral-900">
                          {conditionRatings.find(r => r.value === mechanicalCondition)?.label}
                        </span>
                      </div>
                    </div>

                    {chargesTotal > 0 && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-900">المصاريف الإضافية:</span>
                          <span className="text-xl font-bold text-red-600">
                            {chargesTotal.toLocaleString()} ر.ق
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Acknowledgment */}
                <Card className={cn(
                  "border-2 transition-all",
                  customerAcknowledgment
                    ? "bg-teal-50 border-teal-300"
                    : "bg-amber-50 border-amber-300"
                )}>
                  <CardContent className="p-6">
                    <label className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customerAcknowledgment}
                        onChange={(e) => setCustomerAcknowledgment(e.target.checked)}
                        className="w-5 h-5 mt-1 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <p className="font-semibold text-neutral-900 mb-1">
                          <User className="w-4 h-4 ml-2 inline" />
                          إقرار العميل
                        </p>
                        <p className="text-sm text-neutral-700 leading-relaxed">
                          أقر أنا العميل <strong>{contract.customer_name}</strong> بأنني قد استلمت المركبة
                          الموضحة أعلاه وأن الحالة المسجلة صحيحة. أوافق بأن يتم تحميلي أي مصاريف إضافية
                          ناتجة عن أضرار أو نقص في الوقود أو تجاوز للكيلومترات المسموح بها.
                        </p>
                      </div>
                    </label>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting}
                className="gap-2 rounded-xl px-6"
              >
                السابق
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={isSubmitting}
                  className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl px-6"
                >
                  التالي
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !customerAcknowledgment}
                  className="gap-2 bg-gradient-to-r from-green-500 to-green-600 rounded-xl px-6"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      تأكيد التسليم
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
