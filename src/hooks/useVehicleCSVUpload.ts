import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Vehicle } from "@/hooks/useVehicles"
import { toast } from "sonner"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export function useVehicleCSVUpload() {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CSVUploadResults | null>(null)

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
    if (data.enforce_minimum_price && !['true', 'false', '1', '0'].includes(data.enforce_minimum_price.toLowerCase())) {
      errors.push('enforce_minimum_price يجب أن يكون true أو false')
    }

    return { isValid: errors.length === 0, errors }
  }

  const uploadVehicles = async (file: File) => {
    if (!user?.profile?.company_id) {
      throw new Error('معرف الشركة غير متوفر')
    }

    setIsUploading(true)
    setProgress(0)
    setResults(null)

    try {
      const text = await file.text()
      const data = parseCSV(text)
      
      if (data.length === 0) {
        throw new Error('الملف فارغ أو غير صحيح')
      }

      const results: CSVUploadResults = {
        total: data.length,
        successful: 0,
        failed: 0,
        errors: []
      }

      for (let i = 0; i < data.length; i++) {
        const vehicleData = data[i]
        const validation = validateVehicleData(vehicleData, vehicleData.rowNumber)

        setProgress(Math.round(((i + 1) / data.length) * 100))

        if (!validation.isValid) {
          results.failed++
          results.errors.push({
            row: vehicleData.rowNumber,
            message: validation.errors.join(', ')
          })
          continue
        }

        try {
          const vehiclePayload = {
            plate_number: vehicleData.plate_number,
            make: vehicleData.make,
            model: vehicleData.model,
            year: Number(vehicleData.year),
            color: vehicleData.color || undefined,
            color_ar: vehicleData.color_ar || undefined,
            vin_number: vehicleData.vin_number || undefined,
            registration_number: vehicleData.registration_number || undefined,
            insurance_policy: vehicleData.insurance_policy || undefined,
            insurance_expiry: vehicleData.insurance_expiry || undefined,
            license_expiry: vehicleData.license_expiry || undefined,
            status: vehicleData.status || 'available',
            daily_rate: vehicleData.daily_rate ? Number(vehicleData.daily_rate) : undefined,
            weekly_rate: vehicleData.weekly_rate ? Number(vehicleData.weekly_rate) : undefined,
            monthly_rate: vehicleData.monthly_rate ? Number(vehicleData.monthly_rate) : undefined,
            deposit_amount: vehicleData.deposit_amount ? Number(vehicleData.deposit_amount) : undefined,
            minimum_rental_price: vehicleData.minimum_rental_price ? Number(vehicleData.minimum_rental_price) : undefined,
            enforce_minimum_price: vehicleData.enforce_minimum_price ? ['true', '1'].includes(vehicleData.enforce_minimum_price.toLowerCase()) : false,
            fuel_type: vehicleData.fuel_type || undefined,
            transmission_type: vehicleData.transmission_type || undefined,
            seating_capacity: vehicleData.seating_capacity ? Number(vehicleData.seating_capacity) : undefined,
            notes: vehicleData.notes || undefined,
            company_id: user.profile.company_id,
            is_active: true
          }

          const { error } = await supabase
            .from('vehicles')
            .insert(vehiclePayload)

          if (error) {
            results.failed++
            results.errors.push({
              row: vehicleData.rowNumber,
              message: `خطأ في قاعدة البيانات: ${error.message}`
            })
          } else {
            results.successful++
          }
        } catch (error: any) {
          results.failed++
          results.errors.push({
            row: vehicleData.rowNumber,
            message: `خطأ غير متوقع: ${error.message}`
          })
        }
      }

      setResults(results)
      
    } catch (error: any) {
      toast.error(`خطأ في معالجة الملف: ${error.message}`)
      throw error
    } finally {
      setIsUploading(false)
      setProgress(100)
    }
  }

  return {
    uploadVehicles,
    downloadTemplate,
    isUploading,
    progress,
    results
  }
}