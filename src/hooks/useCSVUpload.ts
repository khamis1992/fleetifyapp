import { useState } from "react"
import Papa from "papaparse"
import { supabase } from "@/integrations/supabase/client"
import type { Database } from "@/integrations/supabase/types"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess"
import { getCustomerDataIssues } from "@/utils/formatCustomerName"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

const customerCSVFields = [
  'customer_type', 'first_name', 'last_name', 'first_name_ar', 'last_name_ar',
  'company_name', 'company_name_ar', 'email', 'phone', 'alternative_phone',
  'national_id', 'nationality', 'passport_number', 'license_number', 'license_expiry',
  'address', 'address_ar', 'city', 'country', 'date_of_birth', 'credit_limit',
  'emergency_contact_name', 'emergency_contact_phone', 'notes'
] as const

type CustomerCSVField = typeof customerCSVFields[number]
type CustomerCSVRecord = Partial<Record<CustomerCSVField, string>> & { rowNumber: number }
type CustomerInsert = Database['public']['Tables']['customers']['Insert']

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error || 'Unexpected error')

const normalizeCustomerRecord = (value: unknown, rowNumber: number): CustomerCSVRecord => {
  const source = typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {}
  const normalized = Object.fromEntries(
    customerCSVFields.map((field) => [field, String(source[field] ?? '').trim()])
  ) as Partial<Record<CustomerCSVField, string>>

  const parsedRowNumber = Number(source.rowNumber)
  return {
    ...normalized,
    rowNumber: Number.isFinite(parsedRowNumber) && parsedRowNumber > 0 ? parsedRowNumber : rowNumber
  }
}

export const parseCustomerCSV = (csvText: string): CustomerCSVRecord[] => {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim()
  })

  const fatalError = parsed.errors.find((error) => error.type === 'Quotes' || error.type === 'Delimiter')
  if (fatalError) throw new Error(`Invalid CSV: ${fatalError.message}`)

  return parsed.data.map((row, index) => normalizeCustomerRecord(row, index + 2))
}

export function useCSVUpload() {
  const { user } = useAuth()
  const companyId = useCurrentCompanyId()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CSVUploadResults | null>(null)

  // تعريف أنواع الحقول للعملاء
  const customerFieldTypes = {
    customer_type: 'text' as const,
    first_name: 'text' as const,
    last_name: 'text' as const,
    first_name_ar: 'text' as const,
    last_name_ar: 'text' as const,
    company_name: 'text' as const,
    company_name_ar: 'text' as const,
    email: 'email' as const,
    phone: 'phone' as const,
    alternative_phone: 'phone' as const,
    national_id: 'text' as const,
    nationality: 'text' as const,
    passport_number: 'text' as const,
    license_number: 'text' as const,
    license_expiry: 'date' as const,
    address: 'text' as const,
    address_ar: 'text' as const,
    city: 'text' as const,
    country: 'text' as const,
    date_of_birth: 'date' as const,
    credit_limit: 'number' as const,
    emergency_contact_name: 'text' as const,
    emergency_contact_phone: 'phone' as const,
    notes: 'text' as const,
  };

  const customerRequiredFields = ['customer_type', 'phone'];

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

  const validateCustomerData = (data: CustomerCSVRecord, rowNumber: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    console.log(`🔍 [VALIDATE] Row ${rowNumber} validation data:`, data);
    console.log(`🔍 [VALIDATE] Row ${rowNumber} available keys:`, Object.keys(data));
    console.log(`🔍 [VALIDATE] Row ${rowNumber} phone field:`, data.phone);

    // التحقق من المطلوب
    if (!data.customer_type || !['individual', 'corporate'].includes(data.customer_type)) {
      errors.push('نوع العميل مطلوب ويجب أن يكون individual أو corporate')
    }

    if (!data.phone) {
      console.log(`🔍 [VALIDATE] Row ${rowNumber} PHONE MISSING - phone field value:`, data.phone);
      console.log(`🔍 [VALIDATE] Row ${rowNumber} All data:`, JSON.stringify(data, null, 2));
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

    const customerDataIssues = getCustomerDataIssues({
      customer_type: data.customer_type === 'corporate' ? 'corporate' : 'individual',
      first_name_ar: data.first_name_ar,
      last_name_ar: data.last_name_ar,
      company_name_ar: data.company_name_ar,
      nationality: data.nationality,
    })
    if (customerDataIssues.length > 0) {
      errors.push(`استكمل بيانات العميل: ${customerDataIssues.join('، ')}`)
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

  const createCustomerPayload = (
    customerData: CustomerCSVRecord,
    targetCompanyId: string
  ): CustomerInsert => ({
    customer_type: customerData.customer_type === 'corporate' ? 'corporate' : 'individual',
    first_name: customerData.first_name || undefined,
    last_name: customerData.last_name || undefined,
    first_name_ar: customerData.first_name_ar || undefined,
    last_name_ar: customerData.last_name_ar || undefined,
    company_name: customerData.company_name || undefined,
    company_name_ar: customerData.company_name_ar || undefined,
    email: customerData.email || undefined,
    phone: customerData.phone || '',
    alternative_phone: customerData.alternative_phone || undefined,
    national_id: customerData.national_id || undefined,
    nationality: customerData.nationality || undefined,
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
    company_id: targetCompanyId,
    is_active: true,
    created_by: user?.id
  })

  const uploadCustomers = async (file: File) => {
    console.log('📝 [CSV] Starting CSV upload for user:', user?.id);
    console.log('📝 [CSV] User company info:', {
      company: user?.company,
      profile_company_id: user?.profile?.company_id,
      has_company: !!user?.company?.id
    });

    const targetCompanyId = companyId || user?.company?.id || user?.profile?.company_id;

    if (!targetCompanyId) {
      console.error('📝 [CSV] Company ID not available. User data:', {
        user_id: user?.id,
        email: user?.email,
        company: user?.company,
        profile: user?.profile
      });
      throw new Error('معرف الشركة غير متوفر. تأكد من تسجيل الدخول بحساب مرتبط بشركة.')
    }

    setIsUploading(true)
    setProgress(0)
    setResults(null)

    try {
      const text = await file.text()
      const data = parseCustomerCSV(text)

      if (data.length === 0) {
        throw new Error('الملف فارغ أو غير صحيح')
      }

      const results: CSVUploadResults = {
        total: data.length,
        successful: 0,
        failed: 0,
        errors: []
      }

      // First pass: validate all records and prepare valid ones
      const validRecords: Array<{ customerData: CustomerCSVRecord; payload: CustomerInsert }> = []

      for (let i = 0; i < data.length; i++) {
        const customerData = data[i]
        const validation = validateCustomerData(customerData, customerData.rowNumber)

        if (!validation.isValid) {
          results.failed++
          results.errors.push({
            row: customerData.rowNumber,
            message: validation.errors.join(', ')
          })
          continue
        }

        const customerPayload = createCustomerPayload(customerData, targetCompanyId)

        validRecords.push({ customerData, payload: customerPayload })
      }

      // Batch insert - process in chunks of 50 for better performance
      const BATCH_SIZE = 50
      const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE)
      let processedBatches = 0

      console.log(`📝 [CSV] Processing ${validRecords.length} valid customers in ${totalBatches} batches`)

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const startIdx = batchNum * BATCH_SIZE
        const endIdx = Math.min(startIdx + BATCH_SIZE, validRecords.length)
        const batch = validRecords.slice(startIdx, endIdx)

        console.log(`📝 [CSV] Processing batch ${batchNum + 1}/${totalBatches} (${batch.length} records)`)

        try {
          const { error, data: insertedData } = await supabase
            .from('customers')
            .insert(batch.map(r => r.payload))
            .select()

          if (error) {
            // If batch insert fails, try individual inserts for this batch
            console.error(`❌ [CSV] Batch ${batchNum + 1} failed, trying individual inserts:`, error)

            for (const record of batch) {
              try {
                const { error: singleError } = await supabase
                  .from('customers')
                  .insert(record.payload)

                if (singleError) {
                  console.error(`❌ [CSV] Individual insert failed for row ${record.customerData.rowNumber}:`, singleError)
                  results.failed++
                  results.errors.push({
                    row: record.customerData.rowNumber,
                    message: `خطأ في قاعدة البيانات: ${singleError.message}`
                  })
                } else {
                  console.log(`✅ [CSV] Successfully inserted customer row ${record.customerData.rowNumber}`)
                  results.successful++
                }
              } catch (err: unknown) {
                console.error(`❌ [CSV] Unexpected error for row ${record.customerData.rowNumber}:`, err)
                results.failed++
                results.errors.push({
                  row: record.customerData.rowNumber,
                  message: `خطأ غير متوقع: ${getErrorMessage(err)}`
                })
              }
            }
          } else {
            // Batch successful
            console.log(`✅ [CSV] Batch ${batchNum + 1} inserted successfully (${insertedData?.length ?? 0} records)`)
            results.successful += batch.length
          }
        } catch (error: unknown) {
          console.error(`❌ [CSV] Unexpected error in batch ${batchNum + 1}:`, error)
          // Try individual inserts
          for (const record of batch) {
            try {
              const { error: singleError } = await supabase
                .from('customers')
                .insert(record.payload)

              if (singleError) {
                results.failed++
                results.errors.push({
                  row: record.customerData.rowNumber,
                  message: singleError.message
                })
              } else {
                results.successful++
              }
            } catch (err: unknown) {
              results.failed++
              results.errors.push({
                row: record.customerData.rowNumber,
                message: getErrorMessage(err)
              })
            }
          }
        }

        processedBatches++
        setProgress(Math.round((processedBatches / totalBatches) * 100))
      }

      setResults(results)

    } catch (error: unknown) {
      toast.error(`خطأ في معالجة الملف: ${getErrorMessage(error)}`)
      throw error
    } finally {
      setIsUploading(false)
      setProgress(100)
    }
  }

  // دالة رفع ذكية للعملاء
  const smartUploadCustomers = async (fixedData: unknown[]) => {
    console.log('Smart upload started with data:', fixedData);

    const targetCompanyId = companyId || user?.company?.id || user?.profile?.company_id;

    if (!targetCompanyId) {
      throw new Error('معرف الشركة غير متوفر. تأكد من تسجيل الدخول بحساب مرتبط بشركة.');
    }

    setIsUploading(true);
    setProgress(0);

    const uploadResults: CSVUploadResults = {
      total: fixedData.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      console.log(`Processing ${fixedData.length} customers...`);

      // Prepare all records
      const validRecords: Array<{ customerData: CustomerCSVRecord; payload: CustomerInsert }> = []

      for (let i = 0; i < fixedData.length; i++) {
        const customerData = normalizeCustomerRecord(fixedData[i], i + 1)
        const customerPayload = createCustomerPayload(customerData, targetCompanyId)

        validRecords.push({ customerData, payload: customerPayload })
      }

      // Batch insert - process in chunks of 50 for better performance
      const BATCH_SIZE = 50
      const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE)
      let processedBatches = 0

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const startIdx = batchNum * BATCH_SIZE
        const endIdx = Math.min(startIdx + BATCH_SIZE, validRecords.length)
        const batch = validRecords.slice(startIdx, endIdx)

        console.log(`Processing batch ${batchNum + 1}/${totalBatches} (${batch.length} records)`)

        try {
          const { error, data } = await supabase
            .from('customers')
            .insert(batch.map(r => r.payload))
            .select()

          if (error) {
            // If batch insert fails, try individual inserts for this batch
            console.error(`Batch ${batchNum + 1} failed, trying individual inserts:`, error)

            for (const record of batch) {
              try {
                const { error: singleError } = await supabase
                  .from('customers')
                  .insert(record.payload)

                if (singleError) {
                  console.error(`Individual insert failed for row ${record.customerData.rowNumber || 'N/A'}:`, singleError)
                  uploadResults.failed++
                  uploadResults.errors.push({
                    row: record.customerData.rowNumber || validRecords.indexOf(record) + 1,
                    message: singleError.message
                  })
                } else {
                  uploadResults.successful++
                }
              } catch (err: unknown) {
                uploadResults.failed++
                uploadResults.errors.push({
                  row: record.customerData.rowNumber || validRecords.indexOf(record) + 1,
                  message: getErrorMessage(err)
                })
              }
            }
          } else {
            // Batch successful
            console.log(`Batch ${batchNum + 1} inserted successfully (${data?.length ?? 0} records)`)
            uploadResults.successful += batch.length
          }
        } catch (error: unknown) {
          console.error(`Unexpected error in batch ${batchNum + 1}:`, error)
          // Try individual inserts
          for (const record of batch) {
            try {
              const { error: singleError } = await supabase
                .from('customers')
                .insert(record.payload)

              if (singleError) {
                uploadResults.failed++
                uploadResults.errors.push({
                  row: record.customerData.rowNumber || validRecords.indexOf(record) + 1,
                  message: singleError.message
                })
              } else {
                uploadResults.successful++
              }
            } catch (err: unknown) {
              uploadResults.failed++
              uploadResults.errors.push({
                row: record.customerData.rowNumber || validRecords.indexOf(record) + 1,
                message: getErrorMessage(err)
              })
            }
          }
        }

        processedBatches++
        setProgress(Math.round((processedBatches / totalBatches) * 100))
      }

      console.log('Upload completed. Results:', uploadResults);
    } finally {
      setIsUploading(false);
      setResults(uploadResults);
    }

    return uploadResults;
  };

  return {
    uploadCustomers,
    smartUploadCustomers,
    downloadTemplate,
    isUploading,
    progress,
    results,
    customerFieldTypes,
    customerRequiredFields
  }
}
