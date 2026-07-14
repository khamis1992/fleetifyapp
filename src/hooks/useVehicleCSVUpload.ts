import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
type VehicleStatus = Database['public']['Enums']['vehicle_status'];
type RawVehicleRow = Record<string, unknown> & { rowNumber?: number };

interface CSVUploadResults {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

interface PreparedVehicle {
  rowNumber: number;
  payload: VehicleInsert;
  plateKey: string;
}

const VEHICLE_STATUSES: VehicleStatus[] = [
  'available',
  'rented',
  'maintenance',
  'out_of_service',
  'street_52',
  'accident',
  'stolen',
  'police_station',
  'reserved_employee',
  'municipality',
];

export const vehicleFieldTypes = {
  plate_number: 'text' as const,
  make: 'text' as const,
  model: 'text' as const,
  year: 'number' as const,
  color: 'text' as const,
  color_ar: 'text' as const,
  vin_number: 'text' as const,
  registration_number: 'text' as const,
  insurance_policy: 'text' as const,
  insurance_expiry: 'date' as const,
  license_expiry: 'date' as const,
  status: 'text' as const,
  daily_rate: 'number' as const,
  weekly_rate: 'number' as const,
  monthly_rate: 'number' as const,
  deposit_amount: 'number' as const,
  minimum_rental_price: 'number' as const,
  enforce_minimum_price: 'boolean' as const,
  fuel_type: 'text' as const,
  transmission_type: 'text' as const,
  seating_capacity: 'number' as const,
  notes: 'text' as const,
};

export const vehicleRequiredFields = ['plate_number', 'make', 'model', 'year'];

const textValue = (value: unknown) => String(value ?? '').trim();
const optionalText = (value: unknown) => textValue(value) || null;

export const normalizeVehiclePlate = (value: unknown) =>
  textValue(value).normalize('NFKC').replace(/\s+/g, ' ').toUpperCase();

const plateKey = (value: unknown) => normalizeVehiclePlate(value).toLocaleLowerCase('en');

const normalizeStatus = (value: unknown): VehicleStatus | null => {
  const normalized = textValue(value).toLowerCase();
  if (!normalized) return 'available';
  if (normalized === 'reserve' || normalized === 'reserved') return 'reserved_employee';
  return VEHICLE_STATUSES.includes(normalized as VehicleStatus)
    ? (normalized as VehicleStatus)
    : null;
};

const parseOptionalNumber = (
  value: unknown,
  fieldLabel: string,
  errors: string[],
  options: { integer?: boolean; min?: number } = {}
) => {
  if (textValue(value) === '') return null;
  const parsed = Number(textValue(value).replace(/,/g, ''));
  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldLabel} يجب أن يكون رقمًا صالحًا`);
    return null;
  }
  if (options.integer && !Number.isInteger(parsed)) {
    errors.push(`${fieldLabel} يجب أن يكون عددًا صحيحًا`);
  }
  if (options.min !== undefined && parsed < options.min) {
    errors.push(`${fieldLabel} يجب ألا يقل عن ${options.min}`);
  }
  return parsed;
};

const parseBoolean = (value: unknown, errors: string[]) => {
  if (typeof value === 'boolean') return value;
  const normalized = textValue(value).toLowerCase();
  if (!normalized) return false;
  if (['true', '1', 'yes', 'نعم'].includes(normalized)) return true;
  if (['false', '0', 'no', 'لا'].includes(normalized)) return false;
  errors.push('enforce_minimum_price يجب أن يكون true أو false');
  return false;
};

const parseDate = (value: unknown, fieldLabel: string, errors: string[]) => {
  const normalized = textValue(value);
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    errors.push(`${fieldLabel} يجب أن يكون بالتنسيق YYYY-MM-DD`);
    return null;
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    errors.push(`${fieldLabel} غير صالح`);
    return null;
  }
  return normalized;
};

export const prepareVehicleRow = (
  row: RawVehicleRow,
  companyId: string,
  fallbackRowNumber: number
): { vehicle: PreparedVehicle | null; errors: string[] } => {
  const errors: string[] = [];
  const rowNumber = Number(row.rowNumber) || fallbackRowNumber;
  const plateNumber = normalizeVehiclePlate(row.plate_number);
  const make = textValue(row.make);
  const model = textValue(row.model);

  if (!plateNumber) errors.push('رقم اللوحة مطلوب');
  if (!make) errors.push('الشركة المصنعة مطلوبة');
  if (!model) errors.push('الطراز مطلوب');

  const year = parseOptionalNumber(row.year, 'سنة الصنع', errors, {
    integer: true,
    min: 1900,
  });
  if (year === null) errors.push('سنة الصنع مطلوبة');
  else if (year > new Date().getFullYear() + 1) errors.push('سنة الصنع في المستقبل البعيد');

  const status = normalizeStatus(row.status);
  if (!status) errors.push(`حالة المركبة غير مدعومة: ${textValue(row.status)}`);

  const dailyRate = parseOptionalNumber(row.daily_rate, 'السعر اليومي', errors, { min: 0 });
  const weeklyRate = parseOptionalNumber(row.weekly_rate, 'السعر الأسبوعي', errors, { min: 0 });
  const monthlyRate = parseOptionalNumber(row.monthly_rate, 'السعر الشهري', errors, { min: 0 });
  const depositAmount = parseOptionalNumber(row.deposit_amount, 'مبلغ التأمين', errors, { min: 0 });
  const minimumRentalPrice = parseOptionalNumber(
    row.minimum_rental_price,
    'الحد الأدنى لسعر الإيجار',
    errors,
    { min: 0 }
  );
  const seatingCapacity = parseOptionalNumber(row.seating_capacity, 'عدد المقاعد', errors, {
    integer: true,
    min: 1,
  });
  const insuranceExpiry = parseDate(row.insurance_expiry, 'تاريخ انتهاء التأمين', errors);
  const licenseExpiry = parseDate(row.license_expiry, 'تاريخ انتهاء الرخصة', errors);
  const enforceMinimumPrice = parseBoolean(row.enforce_minimum_price, errors);

  if (errors.length || year === null || !status) return { vehicle: null, errors };

  return {
    vehicle: {
      rowNumber,
      plateKey: plateKey(plateNumber),
      payload: {
        company_id: companyId,
        plate_number: plateNumber,
        make,
        model,
        year,
        color: optionalText(row.color),
        color_ar: optionalText(row.color_ar),
        vin_number: optionalText(row.vin_number)?.toUpperCase() || null,
        registration_number: optionalText(row.registration_number),
        insurance_policy: optionalText(row.insurance_policy),
        insurance_expiry: insuranceExpiry,
        license_expiry: licenseExpiry,
        status,
        daily_rate: dailyRate,
        weekly_rate: weeklyRate,
        monthly_rate: monthlyRate,
        deposit_amount: depositAmount,
        minimum_rental_price: minimumRentalPrice,
        enforce_minimum_price: enforceMinimumPrice,
        fuel_type: optionalText(row.fuel_type),
        transmission_type: optionalText(row.transmission_type),
        seating_capacity: seatingCapacity,
        notes: optionalText(row.notes),
        is_active: true,
      },
    },
    errors: [],
  };
};

export const parseVehicleCSV = (csvText: string): RawVehicleRow[] => {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
  });

  const seriousErrors = parsed.errors.filter((error) => error.type !== 'FieldMismatch');
  if (seriousErrors.length) {
    const first = seriousErrors[0];
    throw new Error(`تعذر قراءة CSV عند الصف ${(first.row ?? 0) + 2}: ${first.message}`);
  }

  const fields = new Set(parsed.meta.fields || []);
  const missing = vehicleRequiredFields.filter((field) => !fields.has(field));
  if (missing.length) throw new Error(`الأعمدة المطلوبة غير موجودة: ${missing.join(', ')}`);

  return parsed.data.map((row, index) => ({ ...row, rowNumber: index + 2 }));
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'خطأ غير متوقع';

export function useVehicleCSVUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CSVUploadResults | null>(null);

  const downloadTemplate = () => {
    const csv = Papa.unparse([
      {
        plate_number: 'ABC-123',
        make: 'Toyota',
        model: 'Camry',
        year: '2023',
        color: 'White',
        color_ar: 'أبيض',
        vin_number: '1HGBH41JXMN109186',
        registration_number: 'REG123456',
        insurance_policy: 'POL789123',
        insurance_expiry: '2027-12-31',
        license_expiry: '2027-06-30',
        status: 'available',
        daily_rate: '25',
        weekly_rate: '150',
        monthly_rate: '500',
        deposit_amount: '100',
        minimum_rental_price: '20',
        enforce_minimum_price: 'true',
        fuel_type: 'petrol',
        transmission_type: 'automatic',
        seating_capacity: '5',
        notes: 'مركبة في حالة ممتازة',
      },
    ]);
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vehicles_template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const runUpload = async (
    rows: RawVehicleRow[],
    options: { upsert?: boolean; targetCompanyId?: string } = {}
  ) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولًا');
    const targetCompanyId = options.targetCompanyId || companyId;
    if (!targetCompanyId) throw new Error('لم يتم تحديد الشركة المستهدفة');
    validateCompanyAccess(targetCompanyId);

    const uploadResults: CSVUploadResults = {
      total: rows.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    const { data: existing, error: existingError } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .eq('company_id', targetCompanyId);
    if (existingError) throw existingError;
    const existingByPlate = new Map(
      (existing || []).map((vehicle) => [plateKey(vehicle.plate_number), vehicle.id])
    );
    const seenInFile = new Set<string>();
    const prepared: PreparedVehicle[] = [];

    rows.forEach((row, index) => {
      const result = prepareVehicleRow(row, targetCompanyId, index + 2);
      if (!result.vehicle) {
        uploadResults.failed += 1;
        uploadResults.errors.push({
          row: Number(row.rowNumber) || index + 2,
          message: result.errors.join('، '),
        });
        return;
      }
      if (seenInFile.has(result.vehicle.plateKey)) {
        uploadResults.skipped += 1;
        uploadResults.errors.push({
          row: result.vehicle.rowNumber,
          message: `رقم اللوحة مكرر داخل الملف: ${result.vehicle.payload.plate_number}`,
        });
        return;
      }
      seenInFile.add(result.vehicle.plateKey);

      if (!options.upsert && existingByPlate.has(result.vehicle.plateKey)) {
        uploadResults.skipped += 1;
        uploadResults.errors.push({
          row: result.vehicle.rowNumber,
          message: `رقم اللوحة موجود مسبقًا: ${result.vehicle.payload.plate_number}`,
        });
        return;
      }
      prepared.push(result.vehicle);
    });

    for (const [index, vehicle] of prepared.entries()) {
      const existingId = existingByPlate.get(vehicle.plateKey);
      const operation =
        options.upsert && existingId
          ? supabase
              .from('vehicles')
              .update(vehicle.payload)
              .eq('id', existingId)
              .eq('company_id', targetCompanyId)
          : supabase.from('vehicles').insert(vehicle.payload);
      const { error } = await operation;

      if (error) {
        uploadResults.failed += 1;
        uploadResults.errors.push({
          row: vehicle.rowNumber,
          message:
            error.code === '23505'
              ? `توجد مركبة أخرى بنفس اللوحة: ${vehicle.payload.plate_number}`
              : error.message,
        });
      } else {
        uploadResults.successful += 1;
        if (!existingId) existingByPlate.set(vehicle.plateKey, 'inserted-in-current-upload');
      }
      setProgress(prepared.length ? Math.round(((index + 1) / prepared.length) * 100) : 100);
    }

    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    return uploadResults;
  };

  const executeUpload = async (
    rows: RawVehicleRow[],
    options?: { upsert?: boolean; targetCompanyId?: string }
  ) => {
    setIsUploading(true);
    setProgress(0);
    setResults(null);
    try {
      const uploadResults = await runUpload(rows, options);
      setResults(uploadResults);
      setProgress(100);
      return uploadResults;
    } catch (error) {
      toast.error(`خطأ في استيراد المركبات: ${errorMessage(error)}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadVehicles = async (file: File) => {
    if (file.size <= 0) throw new Error('الملف فارغ');
    if (file.size > 10 * 1024 * 1024) throw new Error('حجم ملف CSV يتجاوز 10MB');
    const rows = parseVehicleCSV(await file.text());
    if (!rows.length) throw new Error('لا يحتوي الملف على صفوف بيانات');
    return executeUpload(rows);
  };

  const smartUploadVehicles = async (
    fixedData: unknown[],
    options?: { upsert?: boolean; targetCompanyId?: string }
  ) => executeUpload(fixedData as RawVehicleRow[], options);

  return {
    uploadVehicles,
    smartUploadVehicles,
    downloadTemplate,
    isUploading,
    progress,
    results,
    vehicleFieldTypes,
    vehicleRequiredFields,
  };
}
