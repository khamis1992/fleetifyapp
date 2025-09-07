import { useState } from "react"
import Papa from "papaparse"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { toast } from "sonner"
import { normalizeCsvHeaders } from "@/utils/csv"

interface UploadResults {
  total: number
  successful: number
  failed: number
  customersCreated?: number
  contractsCreated?: number
  errors: Array<{ row: number; message: string; customerName?: string }>
  warnings?: Array<{ row: number; message: string; customerName?: string }>
}

export function useEnhancedContractUpload() {
  const { user, companyId } = useUnifiedCompanyAccess()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<UploadResults | null>(null)

  const parseCSV = (csvText: string): any[] => {
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
    const raw = (parsed.data as any[]).filter(Boolean);
    const normalized = raw.map((row) => normalizeCsvHeaders(row));
    return normalized.map((row, idx) => ({ ...row, rowNumber: idx + 2 }));
  }

  const normalize = (s?: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

  const findCustomerByName = async (customerName: string, targetCompanyId: string) => {
    try {
      const cleanName = customerName.trim()
      if (!cleanName) return null

      console.log(`🔍 البحث عن العميل: "${cleanName}"`)
      
      const like = `%${cleanName}%`
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, customer_type, company_name, first_name, last_name')
        .eq('company_id', targetCompanyId)
        .or(`company_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`)
        .limit(10)

      if (error) {
        console.error('خطأ في البحث عن العميل:', error)
        return null
      }

      if (!customers || customers.length === 0) {
        console.log(`❌ لم يتم العثور على العميل: ${cleanName}`)
        return null
      }

      // محاولة إيجاد تطابق دقيق أولاً
      const normalizedName = normalize(cleanName)
      const exactMatch = customers.find(c => {
        const companyName = normalize(c.company_name || '')
        const fullName = normalize(`${c.first_name || ''} ${c.last_name || ''}`)
        return companyName === normalizedName || fullName === normalizedName
      })

      if (exactMatch) {
        console.log(`✅ تطابق دقيق: ${cleanName} -> ${exactMatch.id}`)
        return exactMatch.id
      }

      if (customers.length === 1) {
        console.log(`✅ تطابق واحد: ${cleanName} -> ${customers[0].id}`)
        return customers[0].id
      }

      console.log(`⚠️ عدة نتائج للعميل: ${cleanName} (${customers.length} نتائج)`)
      return null

    } catch (error) {
      console.error(`❌ خطأ في البحث عن العميل ${customerName}:`, error)
      return null
    }
  }

  const createCustomer = async (customerName: string, targetCompanyId: string) => {
    try {
      const cleanName = customerName.trim()
      if (!cleanName) return null

      console.log(`➕ إنشاء عميل جديد: "${cleanName}"`)
      
      // تحديد نوع العميل (فرد أم شركة)
      const isCompany = cleanName.includes('شركة') || cleanName.includes('مؤسسة') || 
                       cleanName.includes('Company') || cleanName.includes('Corp') ||
                       cleanName.includes('LLC') || cleanName.includes('Ltd') ||
                       cleanName.toUpperCase() === cleanName

      let customerData: any = {
        company_id: targetCompanyId,
        is_active: true,
        is_blacklisted: false,
        credit_limit: 0,
        city: 'Kuwait City',
        country: 'Kuwait',
        phone: '+965XXXXXXXX',
        created_by: user?.id
      }

      if (isCompany) {
        customerData = {
          ...customerData,
          customer_type: 'corporate',
          company_name: cleanName,
          company_name_ar: cleanName,
        }
      } else {
        const nameParts = cleanName.split(' ')
        const firstName = nameParts[0] || cleanName
        const lastName = nameParts.slice(1).join(' ') || 'غير محدد'

        customerData = {
          ...customerData,
          customer_type: 'individual',
          first_name: firstName,
          last_name: lastName,
          first_name_ar: firstName,
          last_name_ar: lastName,
        }
      }

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select('id')
        .single()

      if (error) {
        console.error(`❌ فشل في إنشاء العميل "${cleanName}":`, error)
        return null
      }

      console.log(`✅ تم إنشاء عميل جديد: ${newCustomer.id}`)
      return newCustomer.id

    } catch (error) {
      console.error(`❌ خطأ في إنشاء العميل ${customerName}:`, error)
      return null
    }
  }

  const processContracts = async (file: File, options: { autoCreateCustomers?: boolean; replaceDuplicates?: boolean } = {}) => {
    if (!companyId) {
      throw new Error('لا يوجد معرف شركة محدد للرفع')
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

      console.log(`📊 بدء معالجة ${data.length} عقد...`)

      // معالجة البيانات لتحويل الأسماء إلى معرفات
      const processedRows = []
      let customersCreated = 0

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        setProgress(Math.round(((i + 1) / data.length) * 50))

        // إذا كان هناك اسم عميل ولا يوجد معرف عميل
        if (row.customer_name && !row.customer_id) {
          // محاولة العثور على العميل الموجود
          let customerId = await findCustomerByName(row.customer_name, companyId)
          
          // إذا لم يوجد العميل ومفعل الإنشاء التلقائي
          if (!customerId && options.autoCreateCustomers) {
            customerId = await createCustomer(row.customer_name, companyId)
            if (customerId) {
              customersCreated++
            }
          }
          
          if (customerId) {
            row.customer_id = customerId
          }
        }

        processedRows.push(row)
      }

      console.log(`📊 تم معالجة البيانات. العملاء الجدد: ${customersCreated}`)

      // رفع البيانات باستخدام bulk import
      setProgress(60)
      const { data: bulkResult, error: bulkError } = await supabase.functions.invoke('contracts-bulk-import', {
        body: {
          companyId: companyId,
          rows: processedRows,
          dryRun: false,
          upsertDuplicates: options.replaceDuplicates || false
        }
      })

      setProgress(100)

      if (bulkError) {
        console.error('❌ خطأ في الرفع بالجملة:', bulkError)
        throw new Error(`خطأ في رفع العقود: ${bulkError.message}`)
      }

      const result: UploadResults = {
        total: data.length,
        successful: bulkResult?.successful || 0,
        failed: bulkResult?.failed || 0,
        customersCreated: customersCreated,
        contractsCreated: bulkResult?.successful || 0,
        errors: (bulkResult?.errors || []).map((err: any) => ({
          row: err.row,
          message: err.message,
          customerName: data[err.row - 2]?.customer_name
        }))
      }

      setResults(result)

      if (result.successful > 0) {
        toast.success(`تم إنشاء ${result.successful} عقد بنجاح${customersCreated > 0 ? ` و ${customersCreated} عميل جديد` : ''}`)
      }

      if (result.failed > 0) {
        toast.error(`فشل في إنشاء ${result.failed} عقد`)
      }

      return result

    } catch (error: any) {
      console.error('❌ خطأ في معالجة العقود:', error)
      toast.error(error.message || 'حدث خطأ أثناء رفع العقود')
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  return {
    isUploading,
    progress,
    results,
    processContracts
  }
}