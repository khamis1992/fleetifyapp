/**
 * Fleet Management Page - Professional SaaS Design
 * Clean, minimal interface inspired by Linear, Stripe, Vercel
 *
 * @component FleetPageRedesigned
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useVehiclesPaginated, VehicleFilters as IVehicleFilters } from '@/hooks/useVehiclesPaginated';
import { useFleetStatus } from '@/hooks/useFleetStatus';
import { useDeleteVehicle } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Vehicle } from '@/hooks/useVehicles';
import {
  Car,
  Plus,
  Search,
  SlidersHorizontal,
  Copy,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wrench,
  Settings,
  Tag,
  Upload,
  Download,
  Layers3,
  RotateCcw,
  FileText,
  MoreHorizontal,
  X,
  Filter,
  AlertTriangle,
  HelpCircle,
  PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VehicleForm } from '@/components/fleet/VehicleForm';
import { VehicleGroupManagement } from '@/components/fleet/VehicleGroupManagement';
import { VehicleCSVUpload } from '@/components/fleet/VehicleCSVUpload';
import { useSyncVehicleStatus } from '@/hooks/useSyncVehicleStatus';
import { VehicleStatusChangeDialog } from '@/components/fleet/VehicleStatusChangeDialog';
import VehicleDocumentDistributionDialog from '@/components/fleet/VehicleDocumentDistributionDialog';
import { supabase } from '@/integrations/supabase/client';
import { openVehicleFleetHTMLReport } from '@/components/fleet/VehicleFleetHTMLReport';
import { EmptyState } from '@/components/ui/EmptyState';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';

import { useFleetifyTranslation } from "@/hooks/useTranslation";

const fleetTheme = {
  text: systemColorPattern.colors.text,
  surface: systemColorPattern.colors.surface,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  water: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

type FleetTourContent = {
  title: string;
  description: string;
  steps: string[];
};

type FleetFeatureAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tour: FleetTourContent;
  onConfirm: () => void | Promise<void>;
  confirmVariant?: 'default' | 'danger';
};

const fleetTours = {
  addVehicle: {
    title: 'جولة إضافة مركبة',
    description: 'شرح طريقة إضافة مركبة جديدة وربط بياناتها التشغيلية والمستندية.',
    steps: [
      'ابدأ بإدخال رقم اللوحة والماركة والموديل والسنة.',
      'أضف رقم الهيكل واللون والعداد حتى تكون بيانات المركبة قابلة للتتبع.',
      'راجع الحالة التشغيلية والقيمة اليومية قبل الحفظ.',
      'بعد الحفظ ستظهر المركبة في قائمة الأسطول ويمكن فتح ملفها الكامل.',
    ],
  },
  filters: {
    title: 'جولة فلاتر الأسطول',
    description: 'شرح البحث والفرز وفلاتر الحالة وكيف تساعدك في الوصول للمركبات بسرعة.',
    steps: [
      'استخدم البحث للعثور على مركبة باللوحة أو الموديل أو رقم الهيكل.',
      'استخدم ترتيب النتائج حسب الأحدث أو الأقدم أو الاسم أو المسافة.',
      'فلتر الحالة يعرض المركبات المتاحة أو المؤجرة أو في الصيانة وغيرها.',
      'تصفير الفلاتر يعيد الصفحة إلى العرض الكامل.',
    ],
  },
  export: {
    title: 'جولة تصدير الأسطول',
    description: 'شرح الفرق بين تصدير Excel والتقرير الرسمي القابل للطباعة.',
    steps: [
      'تصدير Excel مناسب للمراجعة والتحليل في الجداول.',
      'تقرير HTML مناسب للطباعة أو الحفظ كملف رسمي.',
      'التصدير يعتمد على البحث والفلاتر الحالية في الصفحة.',
      'راجع عدد المركبات الظاهر قبل تنفيذ التصدير.',
    ],
  },
  groups: {
    title: 'جولة مجموعات المركبات',
    description: 'شرح استخدام مجموعات المركبات لتنظيم الأسطول حسب التشغيل أو الفرع أو النوع.',
    steps: [
      'افتح المجموعات لإنشاء أو تعديل مجموعات المركبات.',
      'استخدم المجموعات لتسهيل المتابعة والتقارير.',
      'بعد تعديل المجموعات يمكن استخدامها في تنظيم المركبات والعمليات.',
    ],
  },
  sync: {
    title: 'جولة مزامنة الحالات',
    description: 'شرح وظيفة مزامنة حالات المركبات مع العقود والصيانة والبيانات المرتبطة.',
    steps: [
      'المزامنة تراجع البيانات المرتبطة بالمركبات.',
      'تحدث الحالة عند وجود اختلاف بين حالة المركبة والعمليات المسجلة.',
      'استخدمها عند ملاحظة حالة مركبة غير متطابقة مع الواقع التشغيلي.',
    ],
  },
  documents: {
    title: 'جولة توزيع المستندات',
    description: 'شرح توزيع مستندات المركبات وربطها بالمركبات المناسبة.',
    steps: [
      'افتح نافذة توزيع المستندات لمراجعة الملفات المتاحة.',
      'اربط كل مستند بالمركبة الصحيحة ونوع المستند المناسب.',
      'يساعد ذلك في تقارير النواقص والتنبيهات قبل انتهاء المستندات.',
    ],
  },
  csv: {
    title: 'جولة رفع CSV',
    description: 'شرح استيراد المركبات أو تحديثها باستخدام ملف CSV.',
    steps: [
      'استخدم CSV عند وجود عدد كبير من المركبات أو تحديثات جماعية.',
      'راجع الأعمدة المطلوبة قبل الرفع لتقليل أخطاء الاستيراد.',
      'بعد الرفع يتم تحديث قائمة المركبات وإعادة تحميل البيانات.',
    ],
  },
  metrics: {
    title: 'جولة مؤشرات الأسطول',
    description: 'شرح بطاقات الأرقام أعلى صفحة الأسطول وكيف تستخدم كاختصارات للفلاتر.',
    steps: [
      'إجمالي المركبات يعطيك حجم الأسطول الحالي.',
      'جاهزية الأسطول تعرض نسبة المركبات المتاحة للتشغيل.',
      'قيد التشغيل يركز على المركبات المؤجرة أو المستخدمة.',
      'تحتاج متابعة تعرض حالات الصيانة والتوقف والحوادث.',
    ],
  },
  vehicleCard: {
    title: 'جولة بطاقة المركبة',
    description: 'شرح أزرار بطاقة المركبة والإجراءات السريعة المرتبطة بها.',
    steps: [
      'الضغط على البطاقة يفتح ملف المركبة الكامل.',
      'زر الحالة يفتح تغيير حالة المركبة مع سبب التغيير.',
      'زر عقد ينقلك لإنشاء عقد مرتبط بالمركبة.',
      'زر صيانة ينقلك لجدولة صيانة للمركبة.',
      'قائمة الثلاث نقاط تحتوي النسخ والتعديل والحذف.',
    ],
  },
  selection: {
    title: 'جولة التحديد الجماعي',
    description: 'شرح تحديد مركبات الصفحة والتعامل معها كدفعة واحدة.',
    steps: [
      'استخدم تحديد الصفحة لاختيار كل المركبات الظاهرة حاليًا.',
      'يمكن إلغاء التحديد للعودة للوضع العادي.',
      'أي إجراء جماعي يجب أن يعتمد على المركبات المحددة فقط.',
    ],
  },
  pagination: {
    title: 'جولة التنقل بين الصفحات',
    description: 'شرح التنقل بين صفحات المركبات مع الحفاظ على البحث والفلاتر.',
    steps: [
      'السابق واللاحق ينقلان بين صفحات النتائج.',
      'أرقام الصفحات تفتح صفحة محددة مباشرة.',
      'آخر صفحة تظهر عندما يكون عدد الصفحات كبيرًا.',
      'الفلاتر والبحث تبقى كما هي أثناء تغيير الصفحة.',
    ],
  },
} satisfies Record<string, FleetTourContent>;

function FeatureTourButton({
  tour,
  onStart,
}: {
  tour: FleetTourContent;
  onStart: (tour: FleetTourContent) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onStart(tour)}
      className="h-9 gap-2 rounded-[8px] border bg-white"
      style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
    >
      <PlayCircle className="h-4 w-4" style={{ color: fleetTheme.success }} />
      ابدأ الجولة التعريفية
    </Button>
  );
}

function FeatureTourDialog({
  tour,
  onOpenChange,
}: {
  tour: FleetTourContent | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!tour} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[8px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-5 w-5" style={{ color: fleetTheme.success }} />
            {tour?.title}
          </DialogTitle>
          <DialogDescription>{tour?.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {tour?.steps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-[8px] border bg-white p-3" style={{ borderColor: fleetTheme.border }}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-sm font-bold text-white" style={{ backgroundColor: fleetTheme.success }}>
                {index + 1}
              </span>
              <p className="text-sm leading-6" style={{ color: fleetTheme.text }}>{step}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="rounded-[8px] text-white" style={{ backgroundColor: fleetTheme.success }}>
            فهمت
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FleetFeatureActionDialog({
  action,
  onClose,
  onStartTour,
}: {
  action: FleetFeatureAction | null;
  onClose: () => void;
  onStartTour: (tour: FleetTourContent) => void;
}) {
  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-[8px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>{action?.title}</DialogTitle>
          <DialogDescription>{action?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-between">
          {action && <FeatureTourButton tour={action.tour} onStart={onStartTour} />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-[8px]">
              إلغاء
            </Button>
            <Button
              onClick={async () => {
                await action?.onConfirm();
                onClose();
              }}
              className={cn(
                'rounded-[8px] text-white',
                action?.confirmVariant === 'danger' && 'bg-red-600 hover:bg-red-700'
              )}
              style={action?.confirmVariant === 'danger' ? undefined : { backgroundColor: fleetTheme.success }}
            >
              {action?.confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// ===== Helper Functions for Missing Data Detection =====

const getMissingVehicleFields = (vehicle: Vehicle): string[] => {
  const missing: string[] = [];

  if (!vehicle.plate_number) missing.push('رقم اللوحة');
  if (!vehicle.make) missing.push('الماركة');
  if (!vehicle.model) missing.push('الموديل');
  if (!vehicle.year) missing.push('السنة');
  if (!vehicle.color) missing.push('اللون');
  if (!vehicle.vin && !vehicle.vin_number) missing.push('رقم الهيكل (VIN)');

  return missing;
};

const getMissingVehicleDocuments = (
  vehicle: Vehicle,
  documents: any[]
): string[] => {
  const missing: string[] = [];

  // Check for registration document
  const hasRegistration = documents.some(
    (doc) => doc.document_type === 'registration'
  );
  if (!hasRegistration && !vehicle.registration_expiry) {
    missing.push('صورة الاستمارة');
  }

  // Check for insurance document
  const hasInsurance = documents.some(
    (doc) => doc.document_type === 'insurance'
  );
  if (!hasInsurance && !vehicle.insurance_expiry) {
    missing.push('وثيقة التأمين');
  }

  return missing;
};

// ===== HTML Export Helper with Professional Report =====
const statusLabels: Record<string, string> = {
  available: 'متاحة',
  rented: 'مؤجرة',
  street_52: 'شارع 52',
  maintenance: 'صيانة',
  out_of_service: 'خارج الخدمة',
  accident: 'حادث',
  stolen: 'مسروقة',
  police_station: 'في مركز الشرطة',
  reserved_employee: 'محجوزة لموظف',
  municipality: 'البلدية',
};

const exportVehiclesToHTML = async (
  _vehicles: Vehicle[],
  companyId: string,
  filters: IVehicleFilters,
  supabaseClient: any
): Promise<void> => {
  if (!companyId) {
    toast.error('لا يمكن تصدير البيانات - لا يوجد معرف الشركة');
    return;
  }

  try {
    toast.loading('جاري تحضير البيانات للتصدير...');

    let query = supabaseClient
      .from('vehicles')
      .select('*')
      .eq('company_id', companyId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.search) {
      const searchWords = filters.search
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 0);
      const primarySearchWord = searchWords[searchWords.length - 1];

      query = query.or(
        `plate_number.ilike.%${primarySearchWord}%,` +
          `make.ilike.%${primarySearchWord}%,` +
          `model.ilike.%${primarySearchWord}%,` +
          `vin.ilike.%${filters.search}%,` +
          `vin_number.ilike.%${filters.search}%`
      );
    }

    query = query.order('created_at', { ascending: false });

    const { data: allVehicles, error } = await query;

    if (error) throw error;

    const vehiclesToExport = allVehicles || [];

    if (!vehiclesToExport.length) {
      toast.dismiss();
      toast.error('لا يوجد مركبات لتصديرها');
      return;
    }

    // Fetch documents for all vehicles
    const vehicleIds = vehiclesToExport.map((v) => v.id);
    const { data: allDocuments } = await supabaseClient
      .from('vehicle_documents')
      .select('*')
      .in('vehicle_id', vehicleIds);

    const documentsByVehicle = new Map<string, any[]>();
    allDocuments?.forEach((doc: any) => {
      if (!documentsByVehicle.has(doc.vehicle_id)) {
        documentsByVehicle.set(doc.vehicle_id, []);
      }
      documentsByVehicle.get(doc.vehicle_id)!.push(doc);
    });

    // Count vehicles with issues
    let vehiclesWithMissingData = 0;
    let vehiclesWithMissingDocuments = 0;
    let expiringDocumentsCount = 0;

    // Enrich vehicles with missing data info
    const vehiclesWithMetadata = vehiclesToExport.map((vehicle: Vehicle) => {
      const missingFields = getMissingVehicleFields(vehicle);
      const vehicleDocuments = documentsByVehicle.get(vehicle.id) || [];
      const missingDocuments = getMissingVehicleDocuments(
        vehicle,
        vehicleDocuments
      );
      const hasMissingData = missingFields.length > 0;
      const hasMissingDocuments = missingDocuments.length > 0;

      // Check for registration documents specifically
      const registrationDocuments = vehicleDocuments.filter((doc: any) =>
        doc.document_type === 'registration' ||
        doc.document_type === 'ترخيص' ||
        doc.document_name?.includes('استمارة') ||
        doc.document_name?.includes('رخيص')
      );
      const hasRegistrationDocuments = registrationDocuments.length > 0;
      const registrationDocumentCount = registrationDocuments.length;

      if (hasMissingData) vehiclesWithMissingData++;
      if (hasMissingDocuments) vehiclesWithMissingDocuments++;

      // Check for expiring documents
      const regExpiring = isExpiringSoon(vehicle.registration_expiry);
      const insExpiring = isExpiringSoon(vehicle.insurance_expiry);
      if (regExpiring || insExpiring) expiringDocumentsCount++;

      return {
        ...vehicle,
        missingFields,
        missingDocuments,
        hasRegistrationDocuments,
        registrationDocumentCount,
      };
    });

    // Generate filter description
    const filterParts: string[] = [];
    if (filters.status) {
      filterParts.push(`الحالة: ${statusLabels[filters.status] || filters.status}`);
    }
    if (filters.search) {
      filterParts.push(`بحث: ${filters.search}`);
    }

    // Use the new professional report generator
    openVehicleFleetHTMLReport(
      vehiclesWithMetadata,
      {
        generatedAt: new Date(),
        generatedBy: 'النظام',
        filters: filterParts.length > 0 ? filterParts.join(' | ') : undefined,
        totalCount: vehiclesToExport.length,
        completeCount: vehiclesToExport.length - vehiclesWithMissingData,
        incompleteCount: vehiclesWithMissingData,
        expiringDocumentsCount,
      }
    );

    toast.dismiss();

    if (vehiclesWithMissingData > 0 || vehiclesWithMissingDocuments > 0) {
      toast.success(
        `تم تصدير ${vehiclesToExport.length} مركبة - ${vehiclesWithMissingData} مركبة لديها بيانات ناقصة، ${vehiclesWithMissingDocuments} مركبة لديها مستندات ناقصة`,
        { duration: 5000 }
      );
    } else {
      toast.success(
        `تم تصدير ${vehiclesToExport.length} مركبة - جميع البيانات والمستندات مكتملة`
      );
    }
  } catch (error: any) {
    toast.dismiss();
    console.error('Export error:', error);
    toast.error(error.message || 'فشل تصدير البيانات');
  }
};

// Helper function to check if date is expiring soon
const isExpiringSoon = (dateStr: string | undefined, days: number = 30): boolean => {
  if (!dateStr) return false;
  try {
    const expiryDate = new Date(dateStr);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= days && daysUntilExpiry > 0;
  } catch {
    return false;
  }
};

// ===== Excel Export Helper with Missing Data Highlighting =====
const exportVehiclesToExcel = async (
  _vehicles: Vehicle[],
  companyId: string,
  filters: IVehicleFilters,
  supabaseClient: any
): Promise<void> => {
  if (!companyId) {
    toast.error('لا يمكن تصدير البيانات - لا يوجد معرف الشركة');
    return;
  }

  try {
    toast.loading('جاري تحضير البيانات للتصدير...');

    const ExcelJS = await import('exceljs');

    let query = supabaseClient
      .from('vehicles')
      .select('*')
      .eq('company_id', companyId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.search) {
      const searchWords = filters.search
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 0);
      const primarySearchWord = searchWords[searchWords.length - 1];

      query = query.or(
        `plate_number.ilike.%${primarySearchWord}%,` +
          `make.ilike.%${primarySearchWord}%,` +
          `model.ilike.%${primarySearchWord}%,` +
          `vin.ilike.%${filters.search}%,` +
          `vin_number.ilike.%${filters.search}%`
      );
    }

    query = query.order('created_at', { ascending: false });

    const { data: allVehicles, error } = await query;

    if (error) throw error;

    const vehiclesToExport = allVehicles || [];

    if (!vehiclesToExport.length) {
      toast.dismiss();
      toast.error('لا يوجد مركبات لتصديرها');
      return;
    }

    // Fetch documents for all vehicles
    const vehicleIds = vehiclesToExport.map((v) => v.id);
    const { data: allDocuments } = await supabaseClient
      .from('vehicle_documents')
      .select('*')
      .in('vehicle_id', vehicleIds);

    const documentsByVehicle = new Map<string, any[]>();
    allDocuments?.forEach((doc: any) => {
      if (!documentsByVehicle.has(doc.vehicle_id)) {
        documentsByVehicle.set(doc.vehicle_id, []);
      }
      documentsByVehicle.get(doc.vehicle_id)!.push(doc);
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fleetify';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('المركبات', {
      views: [{ rightToLeft: true }],
    });

    // Define columns
    worksheet.columns = [
      { header: 'رقم اللوحة', key: 'plate', width: 15 },
      { header: 'الماركة', key: 'make', width: 20 },
      { header: 'الموديل', key: 'model', width: 20 },
      { header: 'السنة', key: 'year', width: 10 },
      { header: 'اللون', key: 'color', width: 15 },
      { header: 'رقم الهيكل (VIN)', key: 'vin', width: 25 },
      { header: 'حالة المركبة', key: 'status', width: 15 },
      { header: 'تاريخ انتهاء الاستمارة', key: 'registration_expiry', width: 20 },
      { header: 'تاريخ انتهاء التأمين', key: 'insurance_expiry', width: 20 },
      { header: 'المعلومات الناقصة', key: 'missing', width: 35 },
      { header: 'المستندات الناقصة', key: 'missing_docs', width: 35 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Arabic status labels
    const statusLabels: Record<string, string> = {
      available: 'متاحة',
      rented: 'مؤجرة',
      street_52: 'شارع 52',
      maintenance: 'صيانة',
      out_of_service: 'خارج الخدمة',
      accident: 'حادث',
      stolen: 'مسروقة',
      police_station: 'في مركز الشرطة',
      reserved_employee: 'محجوزة لموظف',
      municipality: 'البلدية',
    };

    // Count vehicles with issues
    let vehiclesWithMissingData = 0;
    let vehiclesWithMissingDocuments = 0;

    // Add data rows
    vehiclesToExport.forEach((vehicle: Vehicle) => {
      const missingFields = getMissingVehicleFields(vehicle);
      const vehicleDocuments = documentsByVehicle.get(vehicle.id) || [];
      const missingDocuments = getMissingVehicleDocuments(
        vehicle,
        vehicleDocuments
      );
      const hasMissingData = missingFields.length > 0;
      const hasMissingDocuments = missingDocuments.length > 0;

      if (hasMissingData) vehiclesWithMissingData++;
      if (hasMissingDocuments) vehiclesWithMissingDocuments++;

      // Format dates
      const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        try {
          return new Date(dateStr).toLocaleDateString('ar-SA');
        } catch {
          return '';
        }
      };

      // Check if registration is expiring soon or expired
      const registrationExpiry = vehicle.registration_expiry;
      let isRegistrationExpiring = false;
      if (registrationExpiry) {
        const expiryDate = new Date(registrationExpiry);
        const today = new Date();
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        isRegistrationExpiring = daysUntilExpiry <= 30;
      }

      const row = worksheet.addRow({
        plate: vehicle.plate_number || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        color: vehicle.color || vehicle.color_ar || '',
        vin: vehicle.vin || vehicle.vin_number || '',
        status: statusLabels[vehicle.status || 'available'] || vehicle.status || 'متاحة',
        registration_expiry: formatDate(vehicle.registration_expiry),
        insurance_expiry: formatDate(vehicle.insurance_expiry),
        missing: hasMissingData ? missingFields.join('، ') : '✓ مكتمل',
        missing_docs: hasMissingDocuments
          ? missingDocuments.join('، ')
          : '✓ مكتمل',
      });

      // Highlight registration expiry cell if expiring soon or expired
      if (isRegistrationExpiring) {
        const registrationCell = row.getCell('registration_expiry');
        registrationCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }, // Light yellow background
        };
        registrationCell.font = {
          bold: true,
          color: { argb: 'FFB45309' },
        }; // Orange/amber text
      }

      // Highlight row with missing data in red
      if (hasMissingData) {
        row.eachCell((cell, colNumber) => {
          // Don't change color of registration expiry if it's yellow
          if (colNumber === 8 && isRegistrationExpiring) return;

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }, // Light red background
          };
          cell.font = { color: { argb: 'FFDC2626' } }; // Red text
        });

        // Make missing column bold
        const missingCell = row.getCell('missing');
        missingCell.font = { bold: true, color: { argb: 'FFDC2626' } };
      } else {
        // Green for complete data
        const missingCell = row.getCell('missing');
        missingCell.font = { color: { argb: 'FF16A34A' } }; // Green text
      }

      // Highlight missing documents column
      if (hasMissingDocuments) {
        const missingDocsCell = row.getCell('missing_docs');
        missingDocsCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' }, // Light red background
        };
        missingDocsCell.font = { bold: true, color: { argb: 'FFDC2626' } };
      } else {
        // Green for complete documents
        const missingDocsCell = row.getCell('missing_docs');
        missingDocsCell.font = { color: { argb: 'FF16A34A' } }; // Green text
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Add summary row at the end
    worksheet.addRow({});
    const summaryRow = worksheet.addRow({
      plate: 'ملخص:',
      make: `إجمالي المركبات: ${vehiclesToExport.length}`,
      model: `مركبات مكتملة: ${vehiclesToExport.length - vehiclesWithMissingData}`,
      year: `بيانات ناقصة: ${vehiclesWithMissingData}`,
      color: `مستندات ناقصة: ${vehiclesWithMissingDocuments}`,
    });
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    // Add legend row
    const legendRow = worksheet.addRow({
      plate: 'دليل الألوان:',
      make: '🔴 أحمر = بيانات ناقصة',
      model: '🟡 أصفر = تنتهي قريباً',
      color: '🟢 أخضر = مكتمل',
    });
    legendRow.font = { italic: true };

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `vehicles_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.dismiss();

    if (vehiclesWithMissingData > 0 || vehiclesWithMissingDocuments > 0) {
      toast.success(
        `تم تصدير ${vehiclesToExport.length} مركبة - ${vehiclesWithMissingData} مركبة لديها بيانات ناقصة، ${vehiclesWithMissingDocuments} مركبة لديها مستندات ناقصة (محددين باللون الأحمر)`,
        { duration: 5000 }
      );
    } else {
      toast.success(
        `تم تصدير ${vehiclesToExport.length} مركبة - جميع البيانات والمستندات مكتملة`
      );
    }
  } catch (error: any) {
    toast.dismiss();
    console.error('Export error:', error);
    toast.error(error.message || 'فشل تصدير البيانات');
  }
};

// ===== Status Config =====
const statusConfig = {
  available: { label: 'متاحة', accent: fleetTheme.success },
  rented: { label: 'مؤجرة', accent: fleetTheme.focus },
  street_52: { label: 'شارع 52', accent: fleetTheme.water },
  maintenance: { label: 'صيانة', accent: fleetTheme.alert },
  out_of_service: { label: 'خارج الخدمة', accent: fleetTheme.alert },
  accident: { label: 'حادث', accent: fleetTheme.alert },
  stolen: { label: 'مسروقة', accent: fleetTheme.text },
  police_station: { label: 'في مركز الشرطة', accent: fleetTheme.focus },
  reserved: { label: 'محجوزة', accent: fleetTheme.water },
  reserved_employee: { label: 'محجوزة لموظف', accent: fleetTheme.focus },
  municipality: { label: 'البلدية', accent: fleetTheme.water },
};

// Status cycle for quick status changes

// ===== Professional Vehicle Card =====
interface VehicleCardProps {
  vehicle: Vehicle;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCopyVin: () => void;
  onStatusChange: () => void;
  onQuickAction: (action: 'rent' | 'maintenance' | 'contract') => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  index,
  onView,
  onEdit,
  onDelete,
  onCopy,
  onCopyVin,
  onStatusChange,
  onQuickAction,
}) => {
  const config = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.available;
  const accent = config.accent;
  const vehicleImage = vehicle.images?.[0] || vehicle.image_url || '';
  const mileage = vehicle.current_mileage ? vehicle.current_mileage.toLocaleString('en-US') : '0';
  const transmission = vehicle.transmission_type === 'automatic' || vehicle.transmission === 'automatic'
    ? 'أوتوماتيك'
    : vehicle.transmission_type || vehicle.transmission
    ? 'يدوي'
    : '-';

  const handleCopyVin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyVin();
    return;
    if (vehicle.vin) {
      navigator.clipboard.writeText(vehicle.vin);
      toast.success('تم نسخ رقم الهيكل');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="group relative cursor-pointer overflow-hidden rounded-[8px] border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: fleetTheme.border }}
      onClick={onView}
    >
      <div className="absolute inset-y-0 right-0 w-1.5" style={{ backgroundColor: accent }} />

      <div className="p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange();
            }}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border px-2.5 text-xs font-semibold transition hover:opacity-90"
            style={{ backgroundColor: `${accent}14`, borderColor: `${accent}44`, color: accent }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
            {config.label}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-[8px] p-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); e.preventDefault(); onQuickAction('rent'); }} className="gap-2">
                <FileText className="h-4 w-4" style={{ color: fleetTheme.focus }} />
                عقد جديد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); e.preventDefault(); onQuickAction('maintenance'); }} className="gap-2">
                <Wrench className="h-4 w-4" style={{ color: fleetTheme.alert }} />
                صيانة
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCopy(); }} className="gap-2">
                <Copy className="h-4 w-4" />
                نسخ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }} className="gap-2">
                <Edit3 className="h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }} className="gap-2 text-red-600">
                <Trash2 className="h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-[8px]" style={{ backgroundColor: fleetTheme.inner }}>
          {vehicleImage ? (
            <img
              src={vehicleImage}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Car className="h-12 w-12" style={{ color: fleetTheme.muted }} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
            <div>
              <p className="text-[10px] opacity-75">رقم اللوحة</p>
              <p className="font-mono text-xl font-bold tracking-normal">{vehicle.plate_number || '-'}</p>
            </div>
            <ChevronLeft className="h-4 w-4 opacity-80" />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="truncate text-base font-bold" style={{ color: fleetTheme.text }}>
              {vehicle.make} {vehicle.model} {vehicle.year || ''}
            </h3>
            <p className="mt-1 truncate text-xs" style={{ color: fleetTheme.muted }}>
              {vehicle.color || 'بدون لون'} · {transmission}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[8px] px-3 py-2" style={{ backgroundColor: fleetTheme.inner }}>
              <p className="text-[11px]" style={{ color: fleetTheme.muted }}>العداد</p>
              <p className="font-mono text-sm font-bold" style={{ color: fleetTheme.water }}>{mileage} كم</p>
            </div>
            <div className="rounded-[8px] px-3 py-2" style={{ backgroundColor: fleetTheme.inner }}>
              <p className="text-[11px]" style={{ color: fleetTheme.muted }}>القيمة اليومية</p>
              <p className="font-mono text-sm font-bold" style={{ color: fleetTheme.alert }}>{vehicle.daily_rate || 0}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: fleetTheme.border }}>
            <div className="min-w-0 flex items-center gap-1.5 text-xs" style={{ color: fleetTheme.muted }}>
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-mono">{vehicle.vin || vehicle.vin_number || 'N/A'}</span>
            </div>
            {(vehicle.vin || vehicle.vin_number) && (
              <button
                onClick={handleCopyVin}
                className="rounded-[8px] p-1.5 transition hover:bg-slate-100"
                style={{ color: fleetTheme.muted }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onQuickAction('contract'); }}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] text-xs font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: fleetTheme.focus }}
            >
              <FileText className="h-3.5 w-3.5" />
              عقد
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onQuickAction('maintenance'); }}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border text-xs font-bold transition hover:bg-slate-50"
              style={{ borderColor: fleetTheme.border, color: fleetTheme.alert }}
            >
              <Wrench className="h-3.5 w-3.5" />
              صيانة
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
// ===== Quick Status Filter Chips =====
interface StatusChipProps {
  label: string;
  count: number;
  status: string;
  active: boolean;
  onClick: () => void;
}

const StatusChip: React.FC<StatusChipProps> = ({ label, count, status, active, onClick }) => {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  const accent = config.accent;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        backgroundColor: active ? `${accent}16` : '#FFFFFF',
        borderColor: active ? `${accent}88` : fleetTheme.border,
        color: active ? accent : fleetTheme.text,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
      {label}
      <span
        className="rounded-full px-2 py-0.5 text-xs font-black"
        style={{ backgroundColor: active ? `${accent}22` : fleetTheme.inner, color: active ? accent : fleetTheme.muted }}
      >
        {count}
      </span>
    </button>
  );
};

// ===== Main Component =====
const FleetPageRedesigned: React.FC = () => {
  const { t } = useFleetifyTranslation("ui");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<IVehicleFilters>({ excludeMaintenanceStatus: false });
  const [showFilters, setShowFilters] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [vehicleForStatus, setVehicleForStatus] = useState<Vehicle | null>(null);
  const [showDocumentDistribution, setShowDocumentDistribution] = useState(false);
  const [featureAction, setFeatureAction] = useState<FleetFeatureAction | null>(null);
  const [activeTour, setActiveTour] = useState<FleetTourContent | null>(null);

  // Hooks
  const { isSyncing, handleSync } = useSyncVehicleStatus();
  const deleteVehicle = useDeleteVehicle();
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus();
  const { data: vehiclesData, isLoading: vehiclesLoading, refetch } = useVehiclesPaginated(
    currentPage,
    pageSize,
    { ...filters, search: searchQuery || undefined }
  );

  // Computed
  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== false).length;
  const totalPages = vehiclesData?.totalPages || 1;
  const allSelected = vehiclesData?.data && vehiclesData.data.length > 0 && selectedVehicles.size === vehiclesData.data.length;
  const totalVehicles = fleetStatus?.total || vehiclesData?.count || 0;
  const unavailableVehicles = (fleetStatus?.maintenance || 0) + (fleetStatus?.outOfService || 0) + (fleetStatus?.accident || 0) + (fleetStatus?.stolen || 0);
  const readinessRate = totalVehicles ? Math.round(((fleetStatus?.available || 0) / totalVehicles) * 100) : 0;
  const activeVehicles = (fleetStatus?.available || 0) + (fleetStatus?.rented || 0);

  const fleetMetrics = [
    {
      label: 'إجمالي المركبات',
      value: totalVehicles,
      helper: `${vehiclesData?.count || 0} مركبة في القائمة الحالية`,
      icon: Car,
      color: fleetTheme.water,
    },
    {
      label: 'جاهزية الأسطول',
      value: `${readinessRate}%`,
      helper: `${fleetStatus?.available || 0} مركبة متاحة`,
      icon: RotateCcw,
      color: fleetTheme.success,
      status: 'available',
    },
    {
      label: 'قيد التشغيل',
      value: activeVehicles,
      helper: `${fleetStatus?.rented || 0} مؤجرة حالياً`,
      icon: FileText,
      color: fleetTheme.focus,
      status: 'rented',
    },
    {
      label: 'تحتاج متابعة',
      value: unavailableVehicles,
      helper: 'صيانة أو توقف أو حادث',
      icon: AlertTriangle,
      color: fleetTheme.alert,
      status: 'maintenance',
    },
  ];

  const quickStatusFilters = [
    { label: 'متاحة', status: 'available', count: fleetStatus?.available || 0 },
    { label: 'مؤجرة', status: 'rented', count: fleetStatus?.rented || 0 },
    { label: 'صيانة', status: 'maintenance', count: fleetStatus?.maintenance || 0 },
    { label: 'خارج الخدمة', status: 'out_of_service', count: fleetStatus?.outOfService || 0 },
    { label: 'محجوزة', status: 'reserved', count: fleetStatus?.reserved || 0 },
    { label: 'حادث', status: 'accident', count: fleetStatus?.accident || 0 },
  ];

  // Handlers
  const handleFilterChange = (key: keyof IVehicleFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleStatCardClick = (status: string) => {
    if (filters.status === status) {
      setFilters({ excludeMaintenanceStatus: false });
    } else {
      setFilters({ status, excludeMaintenanceStatus: false });
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ excludeMaintenanceStatus: false });
    setSearchQuery('');
    setCurrentPage(1);
    setSelectedVehicles(new Set());
  };

  const openFeatureAction = (action: FleetFeatureAction) => {
    setFeatureAction(action);
  };

  const openAddVehicleAction = () => {
    openFeatureAction({
      title: 'إضافة مركبة جديدة',
      description: 'سيتم فتح نموذج إضافة مركبة جديدة داخل الصفحة لإدخال بيانات المركبة الأساسية والتشغيلية.',
      confirmLabel: 'فتح نموذج الإضافة',
      tour: fleetTours.addVehicle,
      onConfirm: () => {
        setEditingVehicle(null);
        setShowVehicleForm(true);
      },
    });
  };

  const openFiltersAction = () => {
    openFeatureAction({
      title: showFilters ? 'إخفاء الفلاتر المتقدمة' : 'فتح الفلاتر المتقدمة',
      description: showFilters
        ? 'سيتم إخفاء لوحة الفلاتر المتقدمة مع بقاء الفلاتر الحالية فعالة.'
        : 'سيتم فتح لوحة الفلاتر المتقدمة لمراجعة عدد النتائج والفلاتر النشطة والتحديد الحالي.',
      confirmLabel: showFilters ? 'إخفاء الفلاتر' : 'فتح الفلاتر',
      tour: fleetTours.filters,
      onConfirm: () => setShowFilters((value) => !value),
    });
  };

  const openExportAction = (format: 'excel' | 'html') => {
    openFeatureAction({
      title: format === 'html' ? 'تصدير تقرير HTML' : 'تصدير ملف Excel',
      description: format === 'html'
        ? 'سيتم إنشاء تقرير منسق قابل للطباعة حسب البحث والفلاتر الحالية.'
        : 'سيتم إنشاء ملف Excel حسب البحث والفلاتر الحالية.',
      confirmLabel: format === 'html' ? 'إنشاء التقرير' : 'تصدير Excel',
      tour: fleetTours.export,
      onConfirm: () => handleExport(format),
    });
  };

  const openStatusFilterAction = (status: string, label?: string) => {
    openFeatureAction({
      title: label ? `عرض مركبات ${label}` : 'تطبيق فلتر الحالة',
      description: filters.status === status
        ? 'سيتم مسح فلتر الحالة الحالي والعودة إلى عرض كل المركبات.'
        : 'سيتم تطبيق فلتر الحالة على قائمة المركبات الحالية.',
      confirmLabel: filters.status === status ? 'مسح الفلتر' : 'تطبيق الفلتر',
      tour: fleetTours.metrics,
      onConfirm: () => handleStatCardClick(status),
    });
  };

  const openPaginationAction = (page: number) => {
    openFeatureAction({
      title: 'تغيير صفحة المركبات',
      description: `سيتم الانتقال إلى صفحة ${page} مع الإبقاء على البحث والفلاتر الحالية.`,
      confirmLabel: 'تغيير الصفحة',
      tour: fleetTours.pagination,
      onConfirm: () => setCurrentPage(page),
    });
  };

  const openSelectAllAction = () => {
    openFeatureAction({
      title: allSelected ? 'إلغاء تحديد الصفحة' : 'تحديد مركبات الصفحة',
      description: allSelected
        ? 'سيتم إلغاء تحديد كل المركبات الظاهرة في الصفحة الحالية.'
        : 'سيتم تحديد كل المركبات الظاهرة في الصفحة الحالية لإجراء جماعي لاحق.',
      confirmLabel: allSelected ? 'إلغاء التحديد' : 'تحديد الصفحة',
      tour: fleetTours.selection,
      onConfirm: handleSelectAll,
    });
  };

  const openVehicleSelectionAction = (vehicle: Vehicle) => {
    openFeatureAction({
      title: selectedVehicles.has(vehicle.id) ? 'إلغاء تحديد المركبة' : 'تحديد المركبة',
      description: `سيتم ${selectedVehicles.has(vehicle.id) ? 'إلغاء تحديد' : 'تحديد'} المركبة ${vehicle.plate_number || ''}.`,
      confirmLabel: selectedVehicles.has(vehicle.id) ? 'إلغاء التحديد' : 'تحديد',
      tour: fleetTours.selection,
      onConfirm: () => handleSelectVehicle(vehicle.id),
    });
  };

  const openVehicleAction = (vehicle: Vehicle, action: 'view' | 'status' | 'contract' | 'maintenance' | 'copy' | 'edit' | 'delete') => {
    const actionConfig = {
      view: {
        title: 'فتح ملف المركبة',
        description: 'سيتم فتح صفحة تفاصيل المركبة لمراجعة العقود والمستندات والحالة التشغيلية.',
        confirmLabel: 'فتح التفاصيل',
        onConfirm: () => handleViewVehicle(vehicle.id),
      },
      status: {
        title: 'تغيير حالة المركبة',
        description: 'سيتم فتح نافذة تغيير الحالة لإدخال الحالة الجديدة وسبب التغيير.',
        confirmLabel: 'فتح تغيير الحالة',
        onConfirm: () => handleStatusChange(vehicle),
      },
      contract: {
        title: 'إنشاء عقد للمركبة',
        description: 'سيتم فتح صفحة العقود مع ربط المركبة المحددة لإنشاء عقد جديد.',
        confirmLabel: 'فتح العقود',
        onConfirm: () => handleQuickAction('contract', vehicle),
      },
      maintenance: {
        title: 'جدولة صيانة للمركبة',
        description: 'سيتم فتح صفحة الصيانة مع تحديد المركبة تلقائيًا.',
        confirmLabel: 'فتح الصيانة',
        onConfirm: () => handleQuickAction('maintenance', vehicle),
      },
      copy: {
        title: 'نسخ بيانات المركبة',
        description: 'سيتم فتح نموذج مركبة جديد مملوء بنسخة من بيانات هذه المركبة.',
        confirmLabel: 'نسخ المركبة',
        onConfirm: () => handleCopyVehicle(vehicle),
      },
      edit: {
        title: 'تعديل المركبة',
        description: 'سيتم فتح نموذج تعديل بيانات المركبة الحالية.',
        confirmLabel: 'فتح التعديل',
        onConfirm: () => handleEditVehicle(vehicle),
      },
      delete: {
        title: 'حذف المركبة',
        description: 'سيتم فتح نافذة تأكيد الحذف النهائي لهذه المركبة.',
        confirmLabel: 'متابعة الحذف',
        onConfirm: () => setVehicleToDelete(vehicle),
        confirmVariant: 'danger' as const,
      },
    }[action];

    openFeatureAction({
      ...actionConfig,
      tour: fleetTours.vehicleCard,
    });
  };

  const handleSyncVehicleStatus = async () => {
    if (!user?.profile?.company_id) {
      toast.error('لا يمكن تحديد الشركة');
      return;
    }
    const result = await handleSync(user.profile.company_id);
    if (result) {
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    }
  };

  const handleVehicleFormClose = (open: boolean) => {
    setShowVehicleForm(open);
    if (!open) {
      setEditingVehicle(null);
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowVehicleForm(true);
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    try {
      await deleteVehicle.mutateAsync(vehicleToDelete.id);
      setVehicleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
      toast.success('تم حذف المركبة بنجاح');
    } catch (error) {
      toast.error('فشل حذف المركبة');
    }
  };

  const handleCopyVehicle = (vehicle: Vehicle) => {
    const vehicleData = { ...vehicle, plate_number: `${vehicle.plate_number} (نسخة)` };
    delete (vehicleData as any).id;
    setEditingVehicle(vehicleData as Vehicle);
    setShowVehicleForm(true);
    toast.success('تم نسخ المركبة');
  };

  const handleViewVehicle = (vehicleId: string) => {
    navigate(`/fleet/vehicles/${vehicleId}`);
  };

  const handleStatusChange = (vehicle: Vehicle) => {
    setVehicleForStatus(vehicle);
    setShowStatusDialog(true);
  };

  const handleQuickAction = (action: 'rent' | 'maintenance' | 'contract', vehicle: Vehicle) => {
    if (action === 'rent' || action === 'contract') {
      navigate(`/contracts?vehicle=${vehicle.id}`);
    } else if (action === 'maintenance') {
      navigate(`/fleet/maintenance?vehicle=${vehicle.id}`);
    }
  };

  const handleExport = async (format: 'excel' | 'html' = 'excel') => {
    if (!user?.profile?.company_id) {
      toast.error('لا يمكن تصدير البيانات - لا يوجد معرف الشركة');
      return;
    }

    if (format === 'html') {
      await exportVehiclesToHTML(
        vehiclesData?.data || [],
        user.profile.company_id,
        { ...filters, search: searchQuery || undefined },
        supabase
      );
    } else {
      await exportVehiclesToExcel(
        vehiclesData?.data || [],
        user.profile.company_id,
        { ...filters, search: searchQuery || undefined },
        supabase
      );
    }
  };

  const handleSelectAll = () => {
    if (!vehiclesData?.data) return;
    if (allSelected) {
      setSelectedVehicles(new Set());
    } else {
      setSelectedVehicles(new Set(vehiclesData.data.map(v => v.id)));
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  // Loading
  if (statusLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-teal-600 dark:text-teal-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]" style={{ color: fleetTheme.text }}>
      <main className="mx-auto max-w-[1700px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[8px] border bg-white shadow-sm" style={{ borderColor: fleetTheme.border }}>
          <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: fleetTheme.muted }}>إدارة الأسطول</p>
              <h1 className="text-3xl font-black sm:text-4xl" style={{ color: fleetTheme.text }}>المركبات</h1>
              <p className="max-w-3xl text-sm leading-6" style={{ color: fleetTheme.muted }}>
                متابعة المركبات والحالات والمستندات من مساحة تشغيل واحدة ({vehiclesData?.count || 0} مركبة)
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <span className="rounded-[8px] border px-3 py-2 text-xs font-bold" style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}>
                  {fleetStatus?.available || 0} متاحة الآن
                </span>
                <span className="rounded-[8px] border px-3 py-2 text-xs font-bold" style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}>
                  {fleetStatus?.rented || 0} مؤجرة
                </span>
                <span className="rounded-[8px] border px-3 py-2 text-xs font-bold" style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}>
                  {unavailableVehicles} تحتاج متابعة
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:max-w-xl xl:justify-end">
              <Button
                onClick={openAddVehicleAction}
                className="h-10 gap-2 rounded-[8px] text-white"
                style={{ backgroundColor: fleetTheme.success }}
              >
                <Plus className="h-4 w-4" />
                إضافة مركبة
              </Button>

              <Button
                variant="outline"
                onClick={openFiltersAction}
                className="h-10 gap-2 rounded-[8px] border bg-white"
                style={{ borderColor: showFilters ? `${fleetTheme.focus}66` : fleetTheme.border, color: fleetTheme.text }}
              >
                <Filter className="h-4 w-4" style={{ color: fleetTheme.focus }} />
                فلاتر متقدمة
                {activeFiltersCount > 0 && (
                  <Badge className="px-1.5 py-0.5 text-xs text-white" style={{ backgroundColor: fleetTheme.focus }}>
                    {activeFiltersCount}
                  </Badge>
                )}
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 rounded-[8px] border bg-white" style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}>
                    <Download className="h-4 w-4" style={{ color: fleetTheme.water }} />
                    تصدير
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openExportAction('excel')} className="gap-2">
                    <FileText className="h-4 w-4" style={{ color: fleetTheme.success }} />
                    <div className="flex flex-col">
                      <span className="font-medium">{t("excelXlsx")}</span>
                      <span className="text-xs" style={{ color: fleetTheme.muted }}>ملف جدول بيانات</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExportAction('html')} className="gap-2">
                    <FileText className="h-4 w-4" style={{ color: fleetTheme.focus }} />
                    <div className="flex flex-col">
                      <span className="font-medium">تقرير HTML</span>
                      <span className="text-xs" style={{ color: fleetTheme.muted }}>تقرير منسق للطباعة</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                onClick={() => openFeatureAction({
                  title: 'إدارة مجموعات المركبات',
                  description: 'سيتم فتح نافذة إدارة المجموعات لتنظيم مركبات الأسطول حسب التشغيل أو الفرع أو التصنيف.',
                  confirmLabel: 'فتح المجموعات',
                  tour: fleetTours.groups,
                  onConfirm: () => setShowGroupManagement(true),
                })}
                className="h-10 gap-2 rounded-[8px] border bg-white"
                style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
              >
                <Layers3 className="h-4 w-4" style={{ color: fleetTheme.focus }} />
                المجموعات
              </Button>

              <Button
                variant="outline"
                onClick={() => openFeatureAction({
                  title: 'مزامنة حالات المركبات',
                  description: 'سيتم مراجعة حالات المركبات وتحديثها بناءً على العقود والصيانة والبيانات التشغيلية المرتبطة.',
                  confirmLabel: 'بدء المزامنة',
                  tour: fleetTours.sync,
                  onConfirm: handleSyncVehicleStatus,
                })}
                disabled={isSyncing}
                className="h-10 gap-2 rounded-[8px] border bg-white"
                style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
              >
                <RotateCcw className={cn("h-4 w-4", isSyncing && "animate-spin")} style={{ color: fleetTheme.success }} />
                {isSyncing ? 'مزامنة...' : 'مزامنة'}
              </Button>

              <Button
                variant="outline"
                onClick={() => openFeatureAction({
                  title: 'توزيع مستندات المركبات',
                  description: 'سيتم فتح نافذة توزيع المستندات لربط الملفات بالمركبات وأنواع المستندات الصحيحة.',
                  confirmLabel: 'فتح توزيع المستندات',
                  tour: fleetTours.documents,
                  onConfirm: () => setShowDocumentDistribution(true),
                })}
                className="h-10 gap-2 rounded-[8px] border bg-white"
                style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
              >
                <FileText className="h-4 w-4" style={{ color: fleetTheme.alert }} />
                توزيع المستندات
              </Button>

              {user?.roles?.includes('super_admin') && (
                <Button
                  variant="outline"
                  onClick={() => openFeatureAction({
                    title: 'رفع ملف CSV',
                    description: 'سيتم فتح نافذة استيراد CSV لإضافة أو تحديث بيانات المركبات بشكل جماعي.',
                    confirmLabel: 'فتح الاستيراد',
                    tour: fleetTours.csv,
                    onConfirm: () => setShowCSVUpload(true),
                  })}
                  className="h-10 w-10 rounded-[8px] border bg-white p-0"
                  style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
                  title="رفع CSV"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {fleetMetrics.map((metric) => {
            const Icon = metric.icon;
            const isActive = metric.status && filters.status === metric.status;
            return (
              <button
                key={metric.label}
                type="button"
                onClick={() => metric.status && openStatusFilterAction(metric.status, metric.label)}
                className="group overflow-hidden rounded-[8px] border bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: isActive ? `${metric.color}88` : fleetTheme.border }}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[8px] transition group-hover:scale-105" style={{ backgroundColor: `${metric.color}14` }}>
                    <Icon className="h-5 w-5" style={{ color: metric.color }} />
                  </div>
                  <span className="max-w-[120px] text-xs font-bold leading-5" style={{ color: fleetTheme.muted }}>{metric.label}</span>
                </div>
                <p className="text-3xl font-black" style={{ color: metric.color }}>{metric.value}</p>
                <p className="mt-1 min-h-5 text-xs leading-5" style={{ color: fleetTheme.muted }}>{metric.helper}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: fleetTheme.inner }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: typeof metric.value === 'number' && totalVehicles ? `${Math.min(100, Math.round((metric.value / totalVehicles) * 100))}%` : metric.status === 'available' ? `${readinessRate}%` : '68%',
                      backgroundColor: metric.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </section>

        <section className="sticky top-3 z-20 rounded-[8px] border bg-white/95 p-4 shadow-sm backdrop-blur" style={{ borderColor: fleetTheme.border }}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px_auto]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: fleetTheme.muted }} />
              <Input
                placeholder="بحث باللوحة، الموديل، VIN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-12 rounded-[8px] border bg-white pr-10 text-sm shadow-inner"
                style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
              />
              {searchQuery && (
                <button
                  onClick={() => openFeatureAction({
                    title: 'مسح البحث',
                    description: 'سيتم مسح عبارة البحث الحالية مع الإبقاء على الفلاتر الأخرى كما هي.',
                    confirmLabel: 'مسح البحث',
                    tour: fleetTours.filters,
                    onConfirm: () => setSearchQuery(''),
                  })}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-[8px] p-1 transition hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5" style={{ color: fleetTheme.muted }} />
                </button>
              )}
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-12 rounded-[8px] border bg-white" style={{ borderColor: fleetTheme.border }}>
                <SlidersHorizontal className="ml-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="oldest">الأقدم</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
                <SelectItem value="mileage">المسافة</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status || "all"}
              onValueChange={(v) => handleFilterChange('status', v === 'all' ? undefined : v as any)}
            >
              <SelectTrigger className="h-12 rounded-[8px] border bg-white" style={{ borderColor: fleetTheme.border }}>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="available">متاحة</SelectItem>
                <SelectItem value="rented">مؤجرة</SelectItem>
                <SelectItem value="street_52">شارع 52</SelectItem>
                <SelectItem value="maintenance">صيانة</SelectItem>
                <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
                <SelectItem value="accident">حادث</SelectItem>
                <SelectItem value="stolen">مسروقة</SelectItem>
                <SelectItem value="police_station">في مركز الشرطة</SelectItem>
                <SelectItem value="reserved_employee">محجوزة لموظف</SelectItem>
                <SelectItem value="municipality">البلدية</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openSelectAllAction} className="h-12 flex-1 rounded-[8px] border bg-white" style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}>
                {allSelected ? 'إلغاء التحديد' : 'تحديد الصفحة'}
              </Button>
              {(activeFiltersCount > 0 || searchQuery) && (
                <Button
                  variant="outline"
                  onClick={() => openFeatureAction({
                    title: 'تصفير فلاتر الأسطول',
                    description: 'سيتم مسح البحث والفلاتر والتحديد الحالي والعودة لأول صفحة.',
                    confirmLabel: 'تصفير',
                    tour: fleetTours.filters,
                    onConfirm: handleResetFilters,
                  })}
                  className="h-12 w-12 rounded-[8px] border bg-white p-0"
                  style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: fleetTheme.muted }}>تصفية سريعة:</span>
            {quickStatusFilters.map((item) => (
              <StatusChip
                key={item.status}
                label={item.label}
                status={item.status}
                count={item.count}
                active={filters.status === item.status}
                onClick={() => openStatusFilterAction(item.status, item.label)}
              />
            ))}
            {filters.status && (
              <button
                onClick={() => filters.status && openStatusFilterAction(filters.status)}
                className="flex items-center gap-1 rounded-[8px] border px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
                style={{ borderColor: fleetTheme.border, color: fleetTheme.muted }}
              >
                <X className="h-3.5 w-3.5" />
                مسح الفلتر
              </button>
            )}
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4"
              style={{ borderColor: fleetTheme.border }}
            >
              <div className="rounded-[8px] px-3 py-2" style={{ backgroundColor: fleetTheme.inner }}>
                <p className="text-xs" style={{ color: fleetTheme.muted }}>نتيجة البحث</p>
                <p className="font-bold" style={{ color: fleetTheme.text }}>{vehiclesData?.count || 0} مركبة</p>
              </div>
              <div className="rounded-[8px] px-3 py-2" style={{ backgroundColor: fleetTheme.inner }}>
                <p className="text-xs" style={{ color: fleetTheme.muted }}>الفلاتر النشطة</p>
                <p className="font-bold" style={{ color: fleetTheme.focus }}>{activeFiltersCount}</p>
              </div>
              <div className="rounded-[8px] px-3 py-2" style={{ backgroundColor: fleetTheme.inner }}>
                <p className="text-xs" style={{ color: fleetTheme.muted }}>المحدد حالياً</p>
                <p className="font-bold" style={{ color: fleetTheme.success }}>{selectedVehicles.size}</p>
              </div>
              <div className="rounded-[8px] px-3 py-2" style={{ backgroundColor: fleetTheme.inner }}>
                <p className="text-xs" style={{ color: fleetTheme.muted }}>الصفحة</p>
                <p className="font-bold" style={{ color: fleetTheme.water }}>{currentPage} / {totalPages}</p>
              </div>
            </motion.div>
          )}
        </section>

        {vehiclesLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-[8px] border bg-white" style={{ borderColor: fleetTheme.border }} />
            ))}
          </div>
        ) : vehiclesData?.data && vehiclesData.data.length > 0 ? (
          <>
            {selectedVehicles.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky top-24 z-10 flex flex-col gap-3 rounded-[8px] border bg-white p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: `${fleetTheme.success}55` }}
              >
                <p className="text-sm" style={{ color: fleetTheme.text }}>
                  <span className="font-bold" style={{ color: fleetTheme.success }}>{selectedVehicles.size}</span> مركبة محددة
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openFeatureAction({
                      title: 'تصدير المركبات المحددة',
                      description: `سيتم تصدير ${selectedVehicles.size} مركبة محددة من الصفحة الحالية.`,
                      confirmLabel: 'تصدير المحدد',
                      tour: fleetTours.selection,
                      onConfirm: () => toast.info('سيتم تفعيل تصدير المركبات المحددة في المرحلة التالية'),
                    })}
                    className="h-10 rounded-[8px] border bg-white"
                    style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
                  >
                    تصدير
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-[8px] border bg-white"
                    style={{ borderColor: fleetTheme.border, color: fleetTheme.text }}
                    onClick={() => openFeatureAction({
                      title: 'إلغاء التحديد',
                      description: 'سيتم إلغاء تحديد كل المركبات المحددة حاليًا.',
                      confirmLabel: 'إلغاء التحديد',
                      tour: fleetTours.selection,
                      onConfirm: () => setSelectedVehicles(new Set()),
                    })}
                  >
                    إلغاء التحديد
                  </Button>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {vehiclesData.data.map((vehicle, index) => (
                <div key={vehicle.id} className="relative">
                  <input
                    type="checkbox"
                    checked={selectedVehicles.has(vehicle.id)}
                    onChange={() => openVehicleSelectionAction(vehicle)}
                    className="absolute left-4 top-4 z-10 h-5 w-5 cursor-pointer rounded border-slate-300 bg-white shadow"
                    style={{ accentColor: fleetTheme.success }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <VehicleCard
                    vehicle={vehicle}
                    index={index}
                    onView={() => openVehicleAction(vehicle, 'view')}
                    onEdit={() => openVehicleAction(vehicle, 'edit')}
                    onDelete={() => openVehicleAction(vehicle, 'delete')}
                    onCopy={() => openVehicleAction(vehicle, 'copy')}
                    onCopyVin={() => openFeatureAction({
                      title: 'نسخ رقم الهيكل',
                      description: 'سيتم نسخ رقم الهيكل VIN إلى الحافظة لاستخدامه في البحث أو المستندات.',
                      confirmLabel: 'نسخ الرقم',
                      tour: fleetTours.vehicleCard,
                      onConfirm: () => {
                        const vin = vehicle.vin || vehicle.vin_number;
                        if (vin) {
                          navigator.clipboard.writeText(vin);
                          toast.success('تم نسخ رقم الهيكل');
                        }
                      },
                    })}
                    onStatusChange={() => openVehicleAction(vehicle, 'status')}
                    onQuickAction={(action) => {
                      if (action === 'maintenance') {
                        openVehicleAction(vehicle, 'maintenance');
                      } else {
                        openVehicleAction(vehicle, 'contract');
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 rounded-[8px] border bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: fleetTheme.border }}>
                <p className="text-sm" style={{ color: fleetTheme.muted }}>
                  صفحة <span className="font-bold" style={{ color: fleetTheme.text }}>{currentPage}</span> من{' '}
                  <span className="font-bold" style={{ color: fleetTheme.text }}>{totalPages}</span>
                </p>

                <div className="flex items-center gap-1">
                  <Button variant="outline" onClick={() => openPaginationAction(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-10 rounded-[8px] border bg-white" style={{ borderColor: fleetTheme.border }}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      onClick={() => openPaginationAction(page)}
                      className="h-10 min-w-10 rounded-[8px]"
                      style={currentPage === page ? { backgroundColor: fleetTheme.success, color: '#fff' } : { color: fleetTheme.text }}
                    >
                      {page}
                    </Button>
                  ))}

                  {totalPages > 5 && (
                    <>
                      <span className="px-2" style={{ color: fleetTheme.muted }}>...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "ghost"}
                        onClick={() => openPaginationAction(totalPages)}
                        className="h-10 min-w-10 rounded-[8px]"
                        style={currentPage === totalPages ? { backgroundColor: fleetTheme.success, color: '#fff' } : { color: fleetTheme.text }}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}

                  <Button variant="outline" onClick={() => openPaginationAction(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-10 rounded-[8px] border bg-white" style={{ borderColor: fleetTheme.border }}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[8px] border bg-white p-12 text-center shadow-sm" style={{ borderColor: fleetTheme.border }}>
            <Car className="mx-auto mb-4 h-16 w-16" style={{ color: fleetTheme.muted }} />
            <h3 className="mb-2 text-lg font-bold" style={{ color: fleetTheme.text }}>لا توجد مركبات</h3>
            <p className="mb-6 text-sm" style={{ color: fleetTheme.muted }}>
              {activeFiltersCount > 0 || searchQuery
                ? 'لم يتم العثور على مركبات تطابق البحث'
                : 'ابدأ بإضافة أول مركبة للأسطول'}
            </p>
            <Button onClick={openAddVehicleAction} className="h-10 rounded-[8px] text-white" style={{ backgroundColor: fleetTheme.success }}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة مركبة
            </Button>
          </div>
        )}
      </main>
      <FleetFeatureActionDialog
        action={featureAction}
        onClose={() => setFeatureAction(null)}
        onStartTour={setActiveTour}
      />
      <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />

      {/* Dialogs */}
      <Dialog open={showVehicleForm} onOpenChange={handleVehicleFormClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="gap-3">
            <DialogTitle>
              {editingVehicle ? 'تعديل المركبة' : 'إضافة مركبة جديدة'}
            </DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <FeatureTourButton tour={fleetTours.addVehicle} onStart={setActiveTour} />
          </div>
          <VehicleForm
            vehicle={editingVehicle || undefined}
            open={showVehicleForm}
            onOpenChange={handleVehicleFormClose}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showGroupManagement} onOpenChange={setShowGroupManagement}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="gap-3">
            <DialogTitle>إدارة مجموعات المركبات</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <FeatureTourButton tour={fleetTours.groups} onStart={setActiveTour} />
          </div>
          {user?.profile?.company_id && (
            <VehicleGroupManagement companyId={user.profile.company_id} />
          )}
        </DialogContent>
      </Dialog>

      <VehicleCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          setShowCSVUpload(false);
          refetch();
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">حذف نهائي للمركبة</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {vehicleToDelete && (
                <>
                  <p>
                    سيتم حذف المركبة <strong>{vehicleToDelete.plate_number}</strong> ({vehicleToDelete.make} {vehicleToDelete.model}) <strong>نهائياً</strong> من النظام.
                  </p>
                  <p className="text-red-600 font-semibold">
                    ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه! سيتم حذف المركبة وجميع البيانات المرتبطة بها نهائياً.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mb-4">
            <FeatureTourButton
              tour={{
                title: 'جولة حذف المركبة',
                description: 'شرح ما يحدث عند حذف مركبة من الأسطول.',
                steps: [
                  'راجع رقم اللوحة وبيانات المركبة قبل التأكيد.',
                  'الحذف النهائي يزيل المركبة من سجلات الأسطول.',
                  'لا تستخدم الحذف لمعالجة حالة تشغيلية، استخدم تغيير الحالة بدلًا من ذلك.',
                ],
              }}
              onStart={setActiveTour}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteVehicle.isPending}
            >
              {deleteVehicle.isPending ? 'جاري الحذف...' : 'حذف نهائياً'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {vehicleForStatus && (
        <VehicleStatusChangeDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          vehicleId={vehicleForStatus.id}
          currentStatus={vehicleForStatus.status}
          currentNotes={vehicleForStatus.notes}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
            queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
            refetch();
          }}
        />
      )}

      {/* Document Distribution Dialog */}
      <VehicleDocumentDistributionDialog
        open={showDocumentDistribution}
        onOpenChange={setShowDocumentDistribution}
      />

    </div>
  );
};

export default FleetPageRedesigned;
