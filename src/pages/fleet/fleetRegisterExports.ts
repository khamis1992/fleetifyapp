import { toast } from 'sonner';
import type { Vehicle } from '@/hooks/useVehicles';
import type { VehicleFilters as IVehicleFilters } from '@/hooks/useVehiclesPaginated';
import { supabase } from '@/integrations/supabase/client';
import { openVehicleFleetHTMLReport } from '@/components/fleet/VehicleFleetHTMLReport';

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

export const exportVehiclesToHTML = async (
  _vehicles: Vehicle[],
  companyId: string,
  filters: IVehicleFilters,
  supabaseClient: typeof supabase
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

    if (filters.status && filters.status !== 'all') {
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

    const vehiclesToExport = (allVehicles || []) as Vehicle[];

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
    if (filters.status && filters.status !== 'all') {
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
export const exportVehiclesToExcel = async (
  _vehicles: Vehicle[],
  companyId: string,
  filters: IVehicleFilters,
  supabaseClient: typeof supabase
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

    if (filters.status && filters.status !== 'all') {
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

    const vehiclesToExport = (allVehicles || []) as Vehicle[];

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
