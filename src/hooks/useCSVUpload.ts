import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { CustomerFormData } from "@/types/customer"
import { toast } from "sonner"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export function useCSVUpload() {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CSVUploadResults | null>(null)

  const downloadTemplate = () => {
    const headers = [
      'customer_type',
      'first_name',
      'last_name', 
      'first_name_ar',
      'last_name_ar',
      'company_name',
      'company_name_ar',
      'email',
      'phone',
      'alternative_phone',
      'national_id',
      'passport_number',
      'license_number',
      'license_expiry',
      'address',
      'address_ar',
      'city',
      'country',
      'date_of_birth',
      'credit_limit',
      'emergency_contact_name',
      'emergency_contact_phone',
      'notes'
    ]

    const exampleData = [
      'individual',
      'أحمد',
      'محمد',
      'Ahmed',
      'Mohammed',
      '',
      '',
      'ahmed@example.com',
      '12345678',
      '87654321',
      '123456789012',
      '',
      'DL123456',
      '2025-12-31',
      'شارع الخليج العربي',
      'Arabian Gulf Street',
      'الكويت',
      'الكويت',
      '1990-01-15',
      '5000',
      'فاطمة محمد',
      '11111111',
      'عميل مميز'
    ]

    const csvContent = [
      headers.join(','),
      exampleData.join(',')
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'customers_template.csv')
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

  const validateCustomerData = (data: any, rowNumber: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // التحقق من المطلوب
    if (!data.customer_type || !['individual', 'corporate'].includes(data.customer_type)) {
      errors.push('نوع العميل مطلوب ويجب أن يكون individual أو corporate')
    }

    if (!data.phone) {
      errors.push('رقم الهاتف مطلوب')
    }

    if (data.customer_type === 'individual') {
      if (!data.first_name && !data.first_name_ar) {
        errors.push('الاسم الأول مطلوب للعملاء الأفراد')
      }
      if (!data.last_name && !data.last_name_ar) {
        errors.push('اسم العائلة مطلوب للعملاء الأفراد')
      }
    }

    if (data.customer_type === 'corporate') {
      if (!data.company_name && !data.company_name_ar) {
        errors.push('اسم الشركة مطلوب للعملاء الشركات')
      }
    }

    // التحقق من البريد الإلكتروني
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('تنسيق البريد الإلكتروني غير صحيح')
    }

    // التحقق من تاريخ الميلاد
    if (data.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(data.date_of_birth)) {
      errors.push('تنسيق تاريخ الميلاد يجب أن يكون YYYY-MM-DD')
    }

    // التحقق من انتهاء الرخصة
    if (data.license_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(data.license_expiry)) {
      errors.push('تنسيق تاريخ انتهاء الرخصة يجب أن يكون YYYY-MM-DD')
    }

    // التحقق من الحد الائتماني
    if (data.credit_limit && isNaN(Number(data.credit_limit))) {
      errors.push('الحد الائتماني يجب أن يكون رقماً')
    }

    return { isValid: errors.length === 0, errors }
  }

  const uploadCustomers = async (file: File) => {
    if (!user?.company?.id) {
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
        const customerData = data[i]
        const validation = validateCustomerData(customerData, customerData.rowNumber)

        setProgress(Math.round(((i + 1) / data.length) * 100))

        if (!validation.isValid) {
          results.failed++
          results.errors.push({
            row: customerData.rowNumber,
            message: validation.errors.join(', ')
          })
          continue
        }

        try {
          const customerPayload: CustomerFormData = {
            customer_type: customerData.customer_type,
            first_name: customerData.first_name || undefined,
            last_name: customerData.last_name || undefined,
            first_name_ar: customerData.first_name_ar || undefined,
            last_name_ar: customerData.last_name_ar || undefined,
            company_name: customerData.company_name || undefined,
            company_name_ar: customerData.company_name_ar || undefined,
            email: customerData.email || undefined,
            phone: customerData.phone,
            alternative_phone: customerData.alternative_phone || undefined,
            national_id: customerData.national_id || undefined,
            passport_number: customerData.passport_number || undefined,
            license_number: customerData.license_number || undefined,
            license_expiry: customerData.license_expiry || undefined,
            address: customerData.address || undefined,
            address_ar: customerData.address_ar || undefined,
            city: customerData.city || undefined,
            country: customerData.country || undefined,
            date_of_birth: customerData.date_of_birth || undefined,
            credit_limit: customerData.credit_limit ? Number(customerData.credit_limit) : undefined,
            emergency_contact_name: customerData.emergency_contact_name || undefined,
            emergency_contact_phone: customerData.emergency_contact_phone || undefined,
            notes: customerData.notes || undefined,
          }

          const { error } = await supabase
            .from('customers')
            .insert({
              ...customerPayload,
              company_id: user.company.id,
              is_active: true,
              created_by: user.id
            })

          if (error) {
            results.failed++
            results.errors.push({
              row: customerData.rowNumber,
              message: `خطأ في قاعدة البيانات: ${error.message}`
            })
          } else {
            results.successful++
          }
        } catch (error: any) {
          results.failed++
          results.errors.push({
            row: customerData.rowNumber,
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
    uploadCustomers,
    downloadTemplate,
    isUploading,
    progress,
    results
  }
}