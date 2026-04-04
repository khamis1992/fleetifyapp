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
import { FleetSmartDashboard } from '@/components/fleet/FleetSmartDashboard';
import { useSyncVehicleStatus } from '@/hooks/useSyncVehicleStatus';
import { VehicleStatusChangeDialog } from '@/components/fleet/VehicleStatusChangeDialog';
import VehicleDocumentDistributionDialog from '@/components/fleet/VehicleDocumentDistributionDialog';
import { supabase } from '@/integrations/supabase/client';
import { openVehicleFleetHTMLReport } from '@/components/fleet/VehicleFleetHTMLReport';

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
  available: { label: 'متاحة', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700', dot: 'bg-emerald-500' },
  rented: { label: 'مؤجرة', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700', dot: 'bg-blue-500' },
  street_52: { label: 'شارع 52', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700', dot: 'bg-purple-500' },
  maintenance: { label: 'صيانة', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700', dot: 'bg-amber-500' },
  out_of_service: { label: 'خارج الخدمة', color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700', dot: 'bg-red-500' },
  accident: { label: 'حادث', color: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700', dot: 'bg-rose-500' },
  stolen: { label: 'مسروقة', color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', dot: 'bg-slate-500' },
  police_station: { label: 'في مركز الشرطة', color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700', dot: 'bg-orange-500' },
  reserved_employee: { label: 'محجوزة لموظف', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700', dot: 'bg-indigo-500' },
  municipality: { label: 'البلدية', color: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700', dot: 'bg-teal-500' },
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
  onStatusChange,
  onQuickAction,
}) => {
  const config = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.available;

  const handleCopyVin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vehicle.vin) {
      navigator.clipboard.writeText(vehicle.vin);
      toast.success('تم نسخ رقم الهيكل');
    }
  };

  const getMaintenanceTags = () => {
    const tags: string[] = [];
    if (vehicle.next_service_due) {
      const serviceDate = new Date(vehicle.next_service_due);
      if (serviceDate <= new Date()) tags.push('فحص دوري');
    }
    if (vehicle.current_mileage && vehicle.current_mileage > 50000) {
      tags.push('تغيير زيت');
    }
    if (vehicle.insurance_expiry) {
      const insuranceDate = new Date(vehicle.insurance_expiry);
      const daysUntilExpiry = Math.ceil((insuranceDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) tags.push('تجديد تأمين');
    }
    return tags.length > 0 ? tags : ['جاهزة للاستخدام'];
  };

  const maintenanceTags = getMaintenanceTags();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-teal-500/50 hover:shadow-sm transition-all cursor-pointer overflow-hidden"
      onClick={onView}
    >
      {/* Status Bar */}
      <div className={cn("h-1 w-full", config.dot)} />

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          {/* Status Badge - Clickable to cycle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange();
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105",
              config.color
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {config.label}
          </button>

          {/* Quick Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onQuickAction('rent');
                }} 
                className="gap-2"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                عقد جديد
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onQuickAction('maintenance');
                }} 
                className="gap-2"
              >
                <Wrench className="w-4 h-4 text-amber-500" />
                صيانة
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onCopy();
                }} 
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                نسخ
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEdit();
                }} 
                className="gap-2"
              >
                <Edit3 className="w-4 h-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDelete();
                }} 
                className="gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vehicle Image */}
        <div className="h-36 rounded-lg overflow-hidden bg-neutral-100 dark:bg-slate-800 mb-3 relative">
          {vehicle.images && vehicle.images[0] ? (
            <img
          src={vehicle.images?.[0] || vehicle.image_url || ''}
          alt={`${vehicle.make} ${vehicle.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400';
          }}
        />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-slate-800 dark:to-slate-900">
              <Car className="w-12 h-12 text-neutral-300 dark:text-slate-600" />
            </div>
          )}

          {/* Plate Number Overlay */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-xs font-mono">
            {vehicle.plate_number}
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-neutral-900 dark:text-slate-100 text-sm truncate">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>

            <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Settings className="w-3 h-3" />
                <span>{'2.5L'}</span>
              </div>
              <span>•</span>
              <span>{vehicle.transmission === 'automatic' ? 'أوتوماتيك' : 'يدوي'}</span>
            </div>

          {/* VIN */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-slate-500">
              <Tag className="w-3 h-3" />
              <span className="font-mono truncate max-w-[120px]">{vehicle.vin || 'N/A'}</span>
            </div>
            {vehicle.vin && (
              <button
                onClick={handleCopyVin}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <Copy className="w-3 h-3 text-neutral-400 hover:text-rose-500 dark:text-slate-500" />
              </button>
            )}
          </div>

          {/* Maintenance Tags */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-neutral-100 dark:border-slate-800">
            {maintenanceTags.slice(0, 2).map((tag, i) => (
              <Badge
                key={i}
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0 rounded",
                  tag === 'جاهزة للاستخدام'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                )}
              >
                {tag}
              </Badge>
            ))}
            {maintenanceTags.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 rounded bg-neutral-50 dark:bg-slate-800 text-neutral-500 dark:text-slate-400">
                +{maintenanceTags.length - 2}
              </Badge>
            )}
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
  const config = statusConfig[status as keyof typeof statusConfig];
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        active ? config.color : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-neutral-300 dark:hover:border-slate-600"
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
      <span className={cn(
        "px-1.5 py-0.5 rounded-full text-xs",
        active ? "bg-white/20" : "bg-neutral-100 dark:bg-slate-800"
      )}>
        {count}
      </span>
    </button>
  );
};

// ===== Main Component =====
const FleetPageRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<IVehicleFilters>({ excludeMaintenanceStatus: false });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-slate-100">
                الأسطول
              </h1>
              <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                إدارة وتتبع جميع المركبات ({vehiclesData?.count || 0} مركبة)
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="gap-2 min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500"
                  >
                    <Download className="w-4 h-4" />
                    تصدير
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport()} className="gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">Excel (XLSX)</span>
                      <span className="text-xs text-neutral-500 dark:text-slate-400">ملف جدول بيانات</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('html')} className="gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">تقرير HTML</span>
                      <span className="text-xs text-neutral-500 dark:text-slate-400">تقرير منسق للطباعة</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="default"
                onClick={() => setShowGroupManagement(true)}
                className="gap-2 min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500"
              >
                <Layers3 className="w-4 h-4" />
                المجموعات
              </Button>

              <Button
                variant="outline"
                size="default"
                onClick={handleSyncVehicleStatus}
                disabled={isSyncing}
                className="gap-2 min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500"
              >
                <RotateCcw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'مزامنة...' : 'مزامنة'}
              </Button>

              <Button
                variant="outline"
                size="default"
                onClick={() => setShowDocumentDistribution(true)}
                className="gap-2 min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500"
                title="توزيع المستندات"
              >
                <FileText className="w-4 h-4" />
                توزيع المستندات
              </Button>

              {user?.roles?.includes('super_admin') && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setShowCSVUpload(true)}
                  className="gap-2 min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              )}

                <Button
                  size="default"
                  onClick={() => setShowVehicleForm(true)}
                  className="bg-teal-500 hover:bg-teal-600 text-white gap-2 shadow-sm min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مركبة
                </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Smart Dashboard */}
        <FleetSmartDashboard
          onFilterByStatus={handleStatCardClick}
          activeStatus={filters.status}
        />


        {/* Quick Status Filter Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-neutral-500 dark:text-slate-400 font-medium">تصفية سريع:</span>

            <StatusChip
              label="متاحة"
              status="available"
              count={fleetStatus?.available || 0}
              active={filters.status === 'available'}
              onClick={() => handleStatCardClick('available')}
            />

            <StatusChip
              label="مؤجرة"
              status="rented"
              count={fleetStatus?.rented || 0}
              active={filters.status === 'rented'}
              onClick={() => handleStatCardClick('rented')}
            />

            <StatusChip
              label="صيانة"
              status="maintenance"
              count={fleetStatus?.maintenance || 0}
              active={filters.status === 'maintenance'}
              onClick={() => handleStatCardClick('maintenance')}
            />

            <StatusChip
              label="خارج الخدمة"
              status="out_of_service"
              count={fleetStatus?.outOfService || 0}
              active={filters.status === 'out_of_service'}
              onClick={() => handleStatCardClick('out_of_service')}
            />

            <div className="h-6 w-px bg-neutral-200 dark:bg-slate-700 mx-2" />

            <StatusChip
              label="محجوزة"
              status="reserved"
              count={fleetStatus?.reserved || 0}
              active={filters.status === 'reserved'}
              onClick={() => handleStatCardClick('reserved')}
            />

            <StatusChip
              label="حادث"
              status="accident"
              count={fleetStatus?.accident || 0}
              active={filters.status === 'accident'}
              onClick={() => handleStatCardClick('accident')}
            />

            {filters.status && (
              <button
                onClick={() => handleStatCardClick(filters.status!)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-all"
              >
                <X className="w-3 h-3" />
                مسح الفلتر
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-sm transition-all">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-slate-500" />
                <Input
                  placeholder="بحث باللوحة، الموديل، VIN..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 pr-10 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-teal-500 dark:focus:border-teal-500"
                />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                </button>
              )}
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11 w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SlidersHorizontal className="w-4 h-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="oldest">الأقدم</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
                <SelectItem value="mileage">المسافة</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter Dropdown */}
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => handleFilterChange('status', v === 'all' ? undefined : v as any)}
            >
              <SelectTrigger className="h-11 w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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

            {/* Reset */}
            {(activeFiltersCount > 0 || searchQuery) && (
              <Button
                variant="outline"
                size="default"
                onClick={handleResetFilters}
                className="min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500"
              >
                <RotateCcw className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Vehicle List */}
        {vehiclesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
        ) : vehiclesData?.data && vehiclesData.data.length > 0 ? (
          <>
            {/* Bulk Actions Bar */}
            {selectedVehicles.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-xl p-4 flex items-center justify-between"
              >
                <p className="text-sm text-teal-700 dark:text-teal-300">
                  <span className="font-semibold">{selectedVehicles.size}</span> مركبة محددة
                </p>
                <div className="flex items-center gap-2">
                  <Button size="default" variant="outline" className="min-h-[44px] border-teal-200 dark:border-teal-700 hover:border-teal-500 dark:hover:border-teal-500">
                    تصدير
                  </Button>
                  <Button size="default" variant="outline" className="min-h-[44px] border-teal-200 dark:border-teal-700 hover:border-teal-500 dark:hover:border-teal-500" onClick={() => setSelectedVehicles(new Set())}>
                    إلغاء التحديد
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Vehicle Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehiclesData.data.map((vehicle, index) => (
                <div key={vehicle.id} className="relative">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedVehicles.has(vehicle.id)}
                    onChange={() => handleSelectVehicle(vehicle.id)}
                    className="absolute top-4 left-4 z-10 w-4 h-4 rounded border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:bg-rose-500 focus:ring-rose-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <VehicleCard
                    vehicle={vehicle}
                    index={index}
                    onView={() => handleViewVehicle(vehicle.id)}
                    onEdit={() => handleEditVehicle(vehicle)}
                    onDelete={() => setVehicleToDelete(vehicle)}
                    onCopy={() => handleCopyVehicle(vehicle)}
                    onStatusChange={() => handleStatusChange(vehicle)}
                    onQuickAction={(action) => handleQuickAction(action, vehicle)}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-sm transition-all">
                <p className="text-sm text-neutral-500 dark:text-slate-400">
                  صفحة <span className="font-medium text-neutral-900 dark:text-slate-100">{currentPage}</span> من{' '}
                  <span className="font-medium text-neutral-900 dark:text-slate-100">{totalPages}</span>
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="default"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "min-h-[44px] min-w-[44px]",
                        currentPage === page && "bg-teal-500 text-white hover:bg-teal-600"
                      )}
                    >
                      {page}
                    </Button>
                  ))}

                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-neutral-400 dark:text-slate-500">...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "ghost"}
                        size="default"
                        onClick={() => setCurrentPage(totalPages)}
                        className={cn(
                          "min-h-[44px] min-w-[44px]",
                          currentPage === totalPages && "bg-teal-500 text-white hover:bg-teal-600"
                        )}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <Car className="w-16 h-16 text-neutral-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">لا توجد مركبات</h3>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6">
              {activeFiltersCount > 0 || searchQuery
                ? 'لم يتم العثور على مركبات تطابق البحث'
                : 'ابدأ بإضافة أول مركبة للأسطول'}
            </p>
            <Button onClick={() => setShowVehicleForm(true)} className="bg-teal-500 hover:bg-teal-600 text-white min-h-[44px]">
              <Plus className="w-4 h-4 ml-2" />
              إضافة مركبة
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showVehicleForm} onOpenChange={handleVehicleFormClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'تعديل المركبة' : 'إضافة مركبة جديدة'}
            </DialogTitle>
          </DialogHeader>
          <VehicleForm
            vehicle={editingVehicle || undefined}
            open={showVehicleForm}
            onOpenChange={handleVehicleFormClose}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showGroupManagement} onOpenChange={setShowGroupManagement}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>إدارة مجموعات المركبات</DialogTitle>
          </DialogHeader>
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
