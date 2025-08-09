import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Vehicle } from "@/hooks/useVehicles"
import { toast } from "sonner"
import { CSVAutoFix } from "@/utils/csvAutoFix"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export function useVehicleCSVUpload() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const companyId = useCurrentCompanyId()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CSVUploadResults | null>(null)

  // تعريف أنواع الحقول للمركبات
  const vehicleFieldTypes = {
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

  const vehicleRequiredFields = ['plate_number', 'make', 'model', 'year'];

  const downloadTemplate = () => {
    const headers = [
      'plate_number',
      'make',
      'model',
      'year',
      'color',
      'color_ar',
      'vin_number',
      'registration_number',
      'insurance_policy',
      'insurance_expiry',
      'license_expiry',
      'status',
      'daily_rate',
      'weekly_rate',
      'monthly_rate',
      'deposit_amount',
      'minimum_rental_price',
      'enforce_minimum_price',
      'fuel_type',
      'transmission_type',
      'seating_capacity',
      'notes'
    ]

    const exampleData = [
      'ABC-123',
      'Toyota',
      'Camry',
      '2023',
      'White',
      'أبيض',
      '1HGBH41JXMN109186',
      'REG123456',
      'POL789123',
      '2024-12-31',
      '2025-06-30',
      'available',
      '25.000',
      '150.000',
      '500.000',
      '100.000',
      '20.000',
      'true',
      'petrol',
      'automatic',
      '5',
      'مركبة في حالة ممتازة'
    ]

    const csvContent = [
      headers.join(','),
      exampleData.join(',')
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'vehicles_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line)
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      data.push({ ...row, rowNumber: i + 1 })
    }

    return data
  }

  const validateVehicleData = (data: any, rowNumber: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Required fields validation
    if (!data.plate_number) {
      errors.push('رقم اللوحة مطلوب')
    }

    if (!data.make) {
      errors.push('الشركة المصنعة مطلوبة')
    }

    if (!data.model) {
      errors.push('الطراز مطلوب')
    }

    if (!data.year) {
      errors.push('سنة الصنع مطلوبة')
    } else {
      const year = Number(data.year)
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        errors.push('سنة الصنع غير صحيحة')
      }
    }

    // Status validation
    if (data.status && !['available', 'rented', 'maintenance', 'out_of_service', 'reserved'].includes(data.status)) {
      errors.push('حالة المركبة يجب أن تكون: available, rented, maintenance, out_of_service, أو reserved')
    }

    // Date format validation
    if (data.insurance_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(data.insurance_expiry)) {
      errors.push('تنسيق تاريخ انتهاء التأمين يجب أن يكون YYYY-MM-DD')
    }

    if (data.license_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(data.license_expiry)) {
      errors.push('تنسيق تاريخ انتهاء الرخصة يجب أن يكون YYYY-MM-DD')
    }

    // Numeric validation
    const numericFields = ['daily_rate', 'weekly_rate', 'monthly_rate', 'deposit_amount', 'minimum_rental_price', 'seating_capacity']
    numericFields.forEach(field => {
      if (data[field] && isNaN(Number(data[field]))) {
        errors.push(`${field} يجب أن يكون رقماً`)
      }
    })

    // Boolean validation
    if (data.enforce_minimum_price !== undefined && data.enforce_minimum_price !== null) {
      const v = String(data.enforce_minimum_price).toLowerCase()
      if (!['true', 'false', '1', '0'].includes(v)) {
        errors.push('enforce_minimum_price يجب أن يكون true أو false')
      }
    }

    return { isValid: errors.length === 0, errors }
  }

  const uploadVehicles = async (file: File) => {
    if (!companyId) {
      throw new Error('معرف الشركة غير متوفر')
    }

    setIsUploading(true)
    setProgress(0)
    setResults(null)

    try {
      const text = await file.text()
      const rawData = parseCSV(text)
      
      if (rawData.length === 0) {
        throw new Error('الملف فارغ أو غير صحيح')
      }

      // تنظيف وإصلاح البيانات أولاً لضمان عدم إدخال قيم شكلية كـ 0
      const fixedRows = rawData.map((row: any) =>
        CSVAutoFix.fixRow(row, row.rowNumber, vehicleFieldTypes as any, vehicleRequiredFields)
      )

      const results: CSVUploadResults = {
        total: fixedRows.length,
        successful: 0,
        failed: 0,
        errors: []
      }

      for (let i = 0; i < fixedRows.length; i++) {
        const rowFix = fixedRows[i]
        const fixed = rowFix.fixedData

        setProgress(Math.round(((i + 1) / fixedRows.length) * 100))

        // أخطاء التنظيف/التحقق الأولي
        if (rowFix.hasErrors) {
          results.failed++
          results.errors.push({ row: rowFix.rowNumber, message: rowFix.validationErrors.join(', ') })
          continue
        }

        // التحقق من قواعد الأعمال الإضافية
        const validation = validateVehicleData(fixed, rowFix.rowNumber)
        if (!validation.isValid) {
          results.failed++
          results.errors.push({ row: rowFix.rowNumber, message: validation.errors.join(', ') })
          continue
        }

        try {
          const vehiclePayload = {
            plate_number: fixed.plate_number,
            make: fixed.make,
            model: fixed.model,
            year: typeof fixed.year === 'number' ? fixed.year : Number(fixed.year),
            color: fixed.color || undefined,
            color_ar: fixed.color_ar || undefined,
            vin_number: fixed.vin_number || undefined,
            registration_number: fixed.registration_number || undefined,
            insurance_policy: fixed.insurance_policy || undefined,
            insurance_expiry: fixed.insurance_expiry || undefined,
            license_expiry: fixed.license_expiry || undefined,
            status: fixed.status || 'available',
            daily_rate: typeof fixed.daily_rate === 'number' ? fixed.daily_rate : (fixed.daily_rate ? Number(fixed.daily_rate) : undefined),
            weekly_rate: typeof fixed.weekly_rate === 'number' ? fixed.weekly_rate : (fixed.weekly_rate ? Number(fixed.weekly_rate) : undefined),
            monthly_rate: typeof fixed.monthly_rate === 'number' ? fixed.monthly_rate : (fixed.monthly_rate ? Number(fixed.monthly_rate) : undefined),
            deposit_amount: typeof fixed.deposit_amount === 'number' ? fixed.deposit_amount : (fixed.deposit_amount ? Number(fixed.deposit_amount) : undefined),
            minimum_rental_price: typeof fixed.minimum_rental_price === 'number' ? fixed.minimum_rental_price : (fixed.minimum_rental_price ? Number(fixed.minimum_rental_price) : undefined),
            enforce_minimum_price: typeof fixed.enforce_minimum_price === 'boolean'
              ? fixed.enforce_minimum_price
              : (fixed.enforce_minimum_price ? ['true', '1'].includes(String(fixed.enforce_minimum_price).toLowerCase()) : false),
            fuel_type: fixed.fuel_type || undefined,
            transmission_type: fixed.transmission_type || undefined,
            seating_capacity: typeof fixed.seating_capacity === 'number' ? fixed.seating_capacity : (fixed.seating_capacity ? Number(fixed.seating_capacity) : undefined),
            notes: fixed.notes || undefined,
            company_id: companyId,
            is_active: true
          }

          const { error } = await supabase
            .from('vehicles')
            .insert(vehiclePayload)

          if (error) {
            results.failed++
            results.errors.push({ row: rowFix.rowNumber, message: `خطأ في قاعدة البيانات: ${error.message}` })
          } else {
            results.successful++
          }
        } catch (error: any) {
          results.failed++
          results.errors.push({ row: rowFix.rowNumber, message: `خطأ غير متوقع: ${error.message}` })
        }
      }

      setResults(results)
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      
    } catch (error: any) {
      toast.error(`خطأ في معالجة الملف: ${error.message}`)
      throw error
    } finally {
      setIsUploading(false)
      setProgress(100)
    }
  }

  // دالة رفع ذكية للمركبات
  const smartUploadVehicles = async (fixedData: any[]) => {
    setIsUploading(true);
    setProgress(0);
    
    const uploadResults: CSVUploadResults = {
      total: fixedData.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      for (let i = 0; i < fixedData.length; i++) {
        const vehicleData = fixedData[i];
        setProgress(((i + 1) / fixedData.length) * 100);
        
        try {
          const vehiclePayload = {
            plate_number: vehicleData.plate_number,
            make: vehicleData.make,
            model: vehicleData.model,
            year: typeof vehicleData.year === 'number' ? vehicleData.year : Number(vehicleData.year),
            color: vehicleData.color || undefined,
            color_ar: vehicleData.color_ar || undefined,
            vin_number: vehicleData.vin_number || undefined,
            registration_number: vehicleData.registration_number || undefined,
            insurance_policy: vehicleData.insurance_policy || undefined,
            insurance_expiry: vehicleData.insurance_expiry || undefined,
            license_expiry: vehicleData.license_expiry || undefined,
            status: vehicleData.status || 'available',
            daily_rate: typeof vehicleData.daily_rate === 'number' ? vehicleData.daily_rate : (vehicleData.daily_rate ? Number(vehicleData.daily_rate) : undefined),
            weekly_rate: typeof vehicleData.weekly_rate === 'number' ? vehicleData.weekly_rate : (vehicleData.weekly_rate ? Number(vehicleData.weekly_rate) : undefined),
            monthly_rate: typeof vehicleData.monthly_rate === 'number' ? vehicleData.monthly_rate : (vehicleData.monthly_rate ? Number(vehicleData.monthly_rate) : undefined),
            deposit_amount: typeof vehicleData.deposit_amount === 'number' ? vehicleData.deposit_amount : (vehicleData.deposit_amount ? Number(vehicleData.deposit_amount) : undefined),
            minimum_rental_price: typeof vehicleData.minimum_rental_price === 'number' ? vehicleData.minimum_rental_price : (vehicleData.minimum_rental_price ? Number(vehicleData.minimum_rental_price) : undefined),
            enforce_minimum_price: typeof vehicleData.enforce_minimum_price === 'boolean'
              ? vehicleData.enforce_minimum_price
              : (vehicleData.enforce_minimum_price ? ['true', '1'].includes(String(vehicleData.enforce_minimum_price).toLowerCase()) : false),
            fuel_type: vehicleData.fuel_type || undefined,
            transmission_type: vehicleData.transmission_type || undefined,
            seating_capacity: typeof vehicleData.seating_capacity === 'number' ? vehicleData.seating_capacity : (vehicleData.seating_capacity ? Number(vehicleData.seating_capacity) : undefined),
            notes: vehicleData.notes || undefined,
            company_id: companyId,
            is_active: true
          };

          const { data, error } = await supabase
            .from('vehicles')
            .insert([vehiclePayload])
            .select();

          if (error) throw error;
          uploadResults.successful++;
        } catch (error: any) {
          uploadResults.failed++;
          uploadResults.errors.push({
            row: vehicleData.rowNumber || i + 1,
            message: error.message
          });
        }
      }
    } finally {
      setIsUploading(false);
      setResults(uploadResults);
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    }

    return uploadResults;
  };

  return {
    uploadVehicles,
    smartUploadVehicles,
    downloadTemplate,
    isUploading,
    progress,
    results,
    vehicleFieldTypes,
    vehicleRequiredFields
  }
}