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
  missingCustomers?: Array<{ customerName: string; rows: number[] }>
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

  // تطبيع النصوص المتقدم
  const normalize = (s?: string) => {
    if (!s) return ''
    return s.toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u0600-\u06FF]/g, '') // إزالة الأحرف الخاصة عدا العربية والإنجليزية
      .replace(/ة$/g, 'ه') // توحيد التاء المربوطة
      .replace(/ى/g, 'ي') // توحيد الألف المقصورة
  }

  // تطبيع أرقام الهواتف
  const normalizePhone = (phone?: string) => {
    if (!phone) return ''
    return phone.replace(/\D/g, '').replace(/^00965|^\+965|^965/, '')
  }

  // دالة للبحث الضبابي
  const fuzzyMatch = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = getEditDistance(longer, shorter);
    if (longer.length === 0) return 1.0;
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (str1: string, str2: string): number => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // البحث متعدد المستويات عن العميل
  const findCustomerMultiLevel = async (searchData: {
    customerName?: string
    nationalId?: string  
    phone?: string
  }, targetCompanyId: string) => {
    try {
      console.log(`🔍 البحث متعدد المستويات:`, searchData)

      // المستوى الأول: البحث بالرقم الشخصي (الأكثر دقة)
      if (searchData.nationalId) {
        const { data: customerById, error } = await supabase
          .from('customers')
          .select('id, customer_type, company_name, company_name_ar, first_name, last_name, first_name_ar, last_name_ar, national_id')
          .eq('company_id', targetCompanyId)
          .eq('is_active', true)
          .eq('national_id', searchData.nationalId.trim())
          .limit(1)

        if (!error && customerById && customerById.length > 0) {
          console.log(`✅ تطابق بالرقم الشخصي: ${searchData.nationalId} -> ${customerById[0].id}`)
          return customerById[0].id
        }
      }

      // المستوى الثاني: البحث برقم الهاتف
      if (searchData.phone) {
        const normalizedPhone = normalizePhone(searchData.phone)
        if (normalizedPhone.length >= 8) {
          const { data: customerByPhone, error } = await supabase
            .from('customers')
            .select('id, customer_type, company_name, company_name_ar, first_name, last_name, first_name_ar, last_name_ar, phone')
            .eq('company_id', targetCompanyId)
            .eq('is_active', true)
            .like('phone', `%${normalizedPhone}%`)
            .limit(5)

          if (!error && customerByPhone && customerByPhone.length > 0) {
            // التحقق من تطابق دقيق لرقم الهاتف
            const phoneMatch = customerByPhone.find(c => 
              normalizePhone(c.phone) === normalizedPhone
            )
            if (phoneMatch) {
              console.log(`✅ تطابق برقم الهاتف: ${searchData.phone} -> ${phoneMatch.id}`)
              return phoneMatch.id
            }
          }
        }
      }

      // المستوى الثالث: البحث بالاسم (محسن)
      if (searchData.customerName) {
        return await findCustomerByName(searchData.customerName, targetCompanyId)
      }

      console.log(`❌ لم يتم العثور على العميل في جميع المستويات`)
      return null

    } catch (error) {
      console.error(`❌ خطأ في البحث متعدد المستويات:`, error)
      return null
    }
  }

  const findCustomerByName = async (customerName: string, targetCompanyId: string) => {
    try {
      const cleanName = customerName.trim()
      if (!cleanName) return null

      console.log(`🔍 البحث بالاسم: "${cleanName}"`)
      
      // تحسين البحث الأولي
      const normalizedSearchName = normalize(cleanName)
      const searchTerms = normalizedSearchName.split(' ').filter(term => term.length > 2)
      
      // إنشاء استعلام بحث متقدم
      let query = supabase
        .from('customers')
        .select('id, customer_type, company_name, company_name_ar, first_name, last_name, first_name_ar, last_name_ar, national_id, phone')
        .eq('company_id', targetCompanyId)
        .eq('is_active', true)

      // بناء استعلام البحث الديناميكي
      const orConditions = []
      
      // البحث في أسماء الشركات
      orConditions.push(`company_name.ilike.%${cleanName}%`)
      orConditions.push(`company_name_ar.ilike.%${cleanName}%`)
      
      // البحث في أسماء الأفراد
      orConditions.push(`first_name.ilike.%${cleanName}%`)
      orConditions.push(`last_name.ilike.%${cleanName}%`)
      orConditions.push(`first_name_ar.ilike.%${cleanName}%`)
      orConditions.push(`last_name_ar.ilike.%${cleanName}%`)

      // إضافة بحث بالكلمات المفردة للأسماء الطويلة
      for (const term of searchTerms) {
        if (term.length > 2) {
          orConditions.push(`company_name.ilike.%${term}%`)
          orConditions.push(`company_name_ar.ilike.%${term}%`)
          orConditions.push(`first_name.ilike.%${term}%`)
          orConditions.push(`last_name.ilike.%${term}%`)
          orConditions.push(`first_name_ar.ilike.%${term}%`)
          orConditions.push(`last_name_ar.ilike.%${term}%`)
        }
      }

      const { data: customers, error } = await query
        .or(orConditions.join(','))
        .limit(50)

      if (error) {
        console.error('خطأ في البحث عن العميل:', error)
        return null
      }

      if (!customers || customers.length === 0) {
        console.log(`❌ لم يتم العثور على العميل: ${cleanName}`)
        return null
      }

      console.log(`📊 عثر على ${customers.length} نتيجة للبحث عن: ${cleanName}`)

      // أولوية البحث: تطابق دقيق أولاً
      const normalizedName = normalize(cleanName)
      const exactMatch = customers.find(c => {
        const names = [
          normalize(c.company_name || ''),
          normalize(c.company_name_ar || ''),
          normalize(`${c.first_name || ''} ${c.last_name || ''}`),
          normalize(`${c.first_name_ar || ''} ${c.last_name_ar || ''}`)
        ]
        return names.some(name => name === normalizedName)
      })

      if (exactMatch) {
        const displayName = exactMatch.company_name || `${exactMatch.first_name} ${exactMatch.last_name}` || 'غير محدد'
        console.log(`✅ تطابق دقيق: ${cleanName} -> ${exactMatch.id} (${displayName})`)
        return exactMatch.id
      }

      // البحث الضبابي المحسن
      let bestMatch = null
      let bestScore = 0
      let matchDetails = ''

      for (const customer of customers) {
        const customerNames = [
          { name: customer.company_name, type: 'company_name' },
          { name: customer.company_name_ar, type: 'company_name_ar' },
          { name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(), type: 'full_name' },
          { name: `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim(), type: 'full_name_ar' }
        ].filter(item => item.name)

        for (const nameObj of customerNames) {
          const score = fuzzyMatch(normalizedName, normalize(nameObj.name))
          if (score > bestScore && score >= 0.7) { // خفض العتبة إلى 70%
            bestScore = score
            bestMatch = customer
            matchDetails = `${nameObj.name} (${nameObj.type})`
          }
        }
      }

      if (bestMatch && bestScore >= 0.7) {
        console.log(`✅ تطابق ضبابي: ${cleanName} -> ${bestMatch.id} (${Math.round(bestScore * 100)}% - ${matchDetails})`)
        return bestMatch.id
      }

      // إذا كان هناك نتيجة واحدة فقط وتحتوي على جزء من الاسم
      if (customers.length === 1) {
        const customer = customers[0]
        const customerNames = [
          customer.company_name,
          customer.company_name_ar,
          `${customer.first_name || ''} ${customer.last_name || ''}`,
          `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`
        ].filter(Boolean)

        const hasPartialMatch = customerNames.some(name => 
          normalize(name).includes(normalizedName) || normalizedName.includes(normalize(name))
        )

        if (hasPartialMatch) {
          const displayName = customer.company_name || `${customer.first_name} ${customer.last_name}` || 'غير محدد'
          console.log(`✅ تطابق جزئي وحيد: ${cleanName} -> ${customer.id} (${displayName})`)
          return customer.id
        }
      }

      console.log(`⚠️ لا يوجد تطابق مناسب للعميل: ${cleanName} (أفضل نتيجة: ${Math.round(bestScore * 100)}%)`)
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
      const missingCustomers = new Map<string, number[]>()

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        setProgress(Math.round(((i + 1) / data.length) * 50))

        // البحث متعدد المستويات عن العميل
        if ((row.customer_name || row.national_id || row.phone) && !row.customer_id) {
          // تحضير بيانات البحث
          const searchData = {
            customerName: row.customer_name?.trim(),
            nationalId: row.national_id?.trim() || row.customer_national_id?.trim(),
            phone: row.phone?.trim() || row.customer_phone?.trim()
          }

          // محاولة العثور على العميل بجميع الطرق المتاحة
          let customerId = await findCustomerMultiLevel(searchData, companyId)
          
          // إذا لم يوجد العميل ومفعل الإنشاء التلقائي
          if (!customerId && options.autoCreateCustomers && searchData.customerName) {
            customerId = await createCustomer(searchData.customerName, companyId)
            if (customerId) {
              customersCreated++
              console.log(`✅ تم إنشاء عميل جديد: ${searchData.customerName}`)
            }
          }
          
          if (customerId) {
            row.customer_id = customerId
          } else {
            // تسجيل العملاء المفقودين
            const customerName = searchData.customerName || searchData.nationalId || searchData.phone || 'غير محدد'
            if (!missingCustomers.has(customerName)) {
              missingCustomers.set(customerName, [])
            }
            missingCustomers.get(customerName)!.push(row.rowNumber || i + 2)
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
        missingCustomers: Array.from(missingCustomers.entries()).map(([customerName, rows]) => ({
          customerName,
          rows
        })),
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
        const missingCount = result.missingCustomers?.length || 0
        if (missingCount > 0) {
          toast.error(`فشل في إنشاء ${result.failed} عقد. ${missingCount} عميل غير موجود`)
        } else {
          toast.error(`فشل في إنشاء ${result.failed} عقد`)
        }
      }

      // تحذير للعملاء المفقودين
      if (result.missingCustomers && result.missingCustomers.length > 0) {
        const missingNames = result.missingCustomers.map(m => m.customerName).join('، ')
        toast.warning(`العملاء التالية غير موجودة: ${missingNames}`, {
          duration: 8000,
        })
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