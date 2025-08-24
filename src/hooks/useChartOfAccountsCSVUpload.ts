import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess"
import { normalizeCsvHeaders, processAccountsWithHierarchy } from "@/utils/csv"
import Papa from "papaparse"

interface ChartAccountCSVUploadResults {
  total: number
  successful: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ row: number; message: string; account_code?: string }>
}

interface ChartAccountFormData {
  account_code: string
  account_name: string
  account_name_ar?: string
  account_type: string
  account_subtype?: string
  balance_type: string
  parent_account_code?: string
  parent_account_id?: string
  account_level?: number
  is_header?: boolean
  description?: string
}

export function useChartOfAccountsCSVUpload() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const companyId = useCurrentCompanyId()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ChartAccountCSVUploadResults | null>(null)

  // تعريف أنواع الحقول لدليل الحسابات
  const chartAccountFieldTypes = {
    account_code: 'text' as const,
    account_name: 'text' as const,
    account_name_ar: 'text' as const,
    account_type: 'select' as const,
    account_subtype: 'text' as const,
    balance_type: 'select' as const,
    parent_account_code: 'text' as const,
    account_level: 'number' as const,
    is_header: 'boolean' as const,
    description: 'text' as const,
  }

  const downloadTemplate = () => {
    const headers = [
      'رقم الحساب',
      'اسم الحساب',
      'اسم الحساب بالعربية',
      'نوع الحساب',
      'النوع الفرعي',
      'نوع الرصيد',
      'رقم الحساب الأب',
      'المستوى',
      'حساب رئيسي',
      'الوصف'
    ]
    
    const englishHeaders = [
      'account_code',
      'account_name',
      'account_name_ar',
      'account_type',
      'account_subtype',
      'balance_type',
      'parent_account_code',
      'account_level',
      'is_header',
      'description'
    ]

    const exampleData = [
      [
        '1',
        'Assets',
        'الأصول',
        'assets',
        '',
        'debit',
        '',
        '1',
        'true',
        'Main assets account'
      ],
      [
        '11',
        'Current Assets',
        'الأصول المتداولة',
        'assets',
        'current',
        'debit',
        '1',
        '2',
        'true',
        'Current assets subcategory'
      ],
      [
        '1101',
        'Cash',
        'النقدية',
        'assets',
        'cash',
        'debit',
        '11',
        '3',
        'false',
        'Cash accounts'
      ]
    ]

    const csvContent = [
      headers.join(','),
      englishHeaders.join(','),
      ...exampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'chart_of_accounts_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseCSV = (csvText: string): any[] => {
    try {
      console.log('🔍 [CSV_PARSE] Starting CSV parsing...')
      
      // Use papaparse for better CSV handling
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim()
      })
      
      if (parseResult.errors.length > 0) {
        console.warn('🔍 [CSV_PARSE] Papa parse errors:', parseResult.errors)
      }
      
      if (!parseResult.data || parseResult.data.length === 0) {
        console.warn('🔍 [CSV_PARSE] No data found in CSV')
        return []
      }
      
      console.log('🔍 [CSV_PARSE] Raw data count:', parseResult.data.length)
      console.log('🔍 [CSV_PARSE] Sample headers:', Object.keys(parseResult.data[0] || {}))
      
      // Normalize headers and add row numbers
      const normalizedData = parseResult.data.map((row: any, index: number) => {
        const normalizedRow = normalizeCsvHeaders(row, 'chart_account')
        normalizedRow._rowNumber = index + 2 // Account for header row
        return normalizedRow
      }).filter(row => row.account_code && row.account_code.trim() !== '') // Filter out empty rows
      
      console.log('🔍 [CSV_PARSE] Normalized data count:', normalizedData.length)
      
      return normalizedData
    } catch (error) {
      console.error('🔍 [CSV_PARSE] Parse error:', error)
      throw new Error(`خطأ في تحليل ملف CSV: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    }
  }

  const validateAccountData = (data: any, rowNumber: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // التحقق من الحقول المطلوبة
    if (!data.account_code) {
      errors.push('رقم الحساب مطلوب')
    }

    if (!data.account_name) {
      errors.push('اسم الحساب مطلوب')
    }

    if (!data.account_type) {
      errors.push('نوع الحساب مطلوب')
    } else {
      const validTypes = ['assets', 'liabilities', 'equity', 'revenue', 'expenses']
      if (!validTypes.includes(data.account_type)) {
        errors.push(`نوع الحساب غير صحيح. يجب أن يكون أحد: ${validTypes.join(', ')}`)
      }
    }

    if (!data.balance_type) {
      errors.push('نوع الرصيد مطلوب')
    } else {
      const validBalanceTypes = ['debit', 'credit']
      if (!validBalanceTypes.includes(data.balance_type)) {
        errors.push('نوع الرصيد يجب أن يكون debit أو credit')
      }
    }

    // التحقق من صحة المستوى
    if (data.account_level) {
      const level = parseInt(data.account_level)
      if (isNaN(level) || level < 1 || level > 6) {
        errors.push('مستوى الحساب يجب أن يكون بين 1 و 6')
      }
    }

    // التحقق من صحة is_header
    if (data.is_header && typeof data.is_header === 'string') {
      const headerValue = data.is_header.toLowerCase()
      if (!['true', 'false', '1', '0', 'نعم', 'لا'].includes(headerValue)) {
        errors.push('حساب رئيسي يجب أن يكون true أو false')
      }
    }

    return { valid: errors.length === 0, errors }
  }

  const uploadAccounts = async (file: File) => {
    if (!companyId) {
      toast.error('معرف الشركة غير موجود')
      return
    }

    setIsUploading(true)
    setProgress(0)
    setResults(null)

    try {
      console.log('🔍 [UPLOAD] Starting file upload process...')
      console.log('🔍 [UPLOAD] File details:', { name: file.name, size: file.size, type: file.type })
      
      const text = await file.text()
      console.log('🔍 [UPLOAD] File text length:', text.length)
      
      let data = parseCSV(text)
      console.log('🔍 [UPLOAD] Parsed data count:', data.length)
      
      if (data.length === 0) {
        throw new Error('لا توجد بيانات صالحة في الملف')
      }

      // Process hierarchy relationships
      console.log('🔍 [UPLOAD] Processing hierarchy...')
      data = processAccountsWithHierarchy(data)
      console.log('🔍 [UPLOAD] Hierarchy processing complete')

      const results: ChartAccountCSVUploadResults = {
        total: data.length,
        successful: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: []
      }

      // الحصول على الحسابات الموجودة مسبقاً
      const { data: existingAccounts } = await supabase
        .from('chart_of_accounts')
        .select('account_code, id')
        .eq('company_id', companyId)

      const existingAccountsMap = new Map(
        existingAccounts?.map(acc => [acc.account_code, acc.id]) || []
      )

      // معالجة البيانات in chunks to prevent freezing
      const CHUNK_SIZE = 20
      console.log('🔍 [UPLOAD] Processing in chunks of', CHUNK_SIZE)
      
      for (let chunkStart = 0; chunkStart < data.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, data.length)
        const chunk = data.slice(chunkStart, chunkEnd)
        
        console.log(`🔍 [UPLOAD] Processing chunk ${chunkStart + 1}-${chunkEnd}`)
        
        for (let i = 0; i < chunk.length; i++) {
          const globalIndex = chunkStart + i
          const rowData = chunk[i]
          const rowNumber = rowData._rowNumber || globalIndex + 2

          try {
            const progressPercent = ((globalIndex + 1) / data.length) * 100
            setProgress(progressPercent)
            
            // Add small delay for UI responsiveness
            if (globalIndex % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1))
            }

            // التحقق من صحة البيانات
            const validation = validateAccountData(rowData, rowNumber)
            if (!validation.valid) {
              results.failed++
              results.errors.push({
                row: rowNumber,
                message: validation.errors.join(', '),
                account_code: rowData.account_code
              })
              console.warn(`🔍 [UPLOAD] Validation failed for row ${rowNumber}:`, validation.errors)
              continue
            }

            // تحضير البيانات للإدراج
            const accountData: ChartAccountFormData = {
              account_code: rowData.account_code,
              account_name: rowData.account_name,
              account_name_ar: rowData.account_name_ar || rowData.account_name,
              account_type: rowData.account_type,
              account_subtype: rowData.account_subtype || null,
              balance_type: rowData.balance_type,
              description: rowData.description || null,
              account_level: rowData.account_level ? parseInt(rowData.account_level) : undefined,
              is_header: rowData.is_header ? 
                ['true', '1', 'نعم'].includes(String(rowData.is_header).toLowerCase()) : false
            }

            // البحث عن الحساب الأب إذا تم تحديده
            if (rowData.parent_account_code && rowData.parent_account_code.trim() !== '') {
              const parentId = existingAccountsMap.get(rowData.parent_account_code)
              if (parentId && parentId !== 'new') {
                accountData.parent_account_id = parentId
              } else {
                // Skip parent validation for now - let the hierarchy processing handle it
                console.warn(`🔍 [UPLOAD] Parent account ${rowData.parent_account_code} not found for ${rowData.account_code}`)
              }
            }

            // التحقق من وجود الحساب مسبقاً
            const existingAccountId = existingAccountsMap.get(rowData.account_code)
            
            if (existingAccountId && existingAccountId !== 'new') {
              // تحديث الحساب الموجود
              const { error } = await supabase
                .from('chart_of_accounts')
                .update(accountData)
                .eq('id', existingAccountId)
                .eq('company_id', companyId)

              if (error) {
                results.failed++
                results.errors.push({
                  row: rowNumber,
                  message: `خطأ في تحديث الحساب: ${error.message}`,
                  account_code: rowData.account_code
                })
                console.error(`🔍 [UPLOAD] Update error for ${rowData.account_code}:`, error)
              } else {
                results.updated++
                console.log(`🔍 [UPLOAD] Updated account: ${rowData.account_code}`)
              }
            } else {
              // إنشاء حساب جديد
              const { data: newAccount, error } = await supabase
                .from('chart_of_accounts')
                .insert({
                  ...accountData,
                  company_id: companyId
                })
                .select('id')
                .single()

              if (error) {
                results.failed++
                results.errors.push({
                  row: rowNumber,
                  message: `خطأ في إنشاء الحساب: ${error.message}`,
                  account_code: rowData.account_code
                })
                console.error(`🔍 [UPLOAD] Insert error for ${rowData.account_code}:`, error)
              } else {
                results.successful++
                // إضافة الحساب الجديد إلى الخريطة مع معرفه الفعلي
                existingAccountsMap.set(rowData.account_code, newAccount?.id || 'new')
                console.log(`🔍 [UPLOAD] Created account: ${rowData.account_code}`)
              }
            }

          } catch (error: any) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              message: `خطأ غير متوقع: ${error.message}`,
              account_code: rowData.account_code
            })
            console.error(`🔍 [UPLOAD] Unexpected error for row ${rowNumber}:`, error)
          }
        }
        
        // Small delay between chunks to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      setProgress(100)
      setResults(results)

      console.log('🔍 [UPLOAD] Final results:', results)

      // تحديث cache الاستعلامات
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })

      // Show success/error messages
      if (results.successful > 0 || results.updated > 0) {
        const total = results.successful + results.updated
        toast.success(`تم رفع ${total} حساب بنجاح (${results.successful} جديد، ${results.updated} محدث)`)
      }

      if (results.failed > 0) {
        toast.error(`فشل في رفع ${results.failed} حساب. راجع تقرير الأخطاء للتفاصيل.`)
      }

      if (results.total === 0) {
        toast.warning('لم يتم العثور على بيانات صالحة في الملف')
      }

    } catch (error: any) {
      console.error('🔍 [UPLOAD] Fatal error:', error)
      toast.error(`خطأ في رفع الملف: ${error.message}`)
      setResults({
        total: 0,
        successful: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        errors: [{ row: 1, message: error.message }]
      })
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }

  const smartUploadAccounts = async (fixedData: any[]) => {
    if (!companyId) {
      toast.error('معرف الشركة غير موجود')
      return
    }

    setIsUploading(true)
    setResults(null)

    try {
      console.log('🔍 [SMART_UPLOAD] Starting smart upload with', fixedData.length, 'records')
      
      // Process hierarchy for smart upload too
      const processedData = processAccountsWithHierarchy(fixedData)
      
      const results: ChartAccountCSVUploadResults = {
        total: processedData.length,
        successful: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: []
      }

      // إدراج البيانات المصححة in chunks
      const CHUNK_SIZE = 20
      for (let chunkStart = 0; chunkStart < processedData.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, processedData.length)
        const chunk = processedData.slice(chunkStart, chunkEnd)
        
        for (let i = 0; i < chunk.length; i++) {
          const globalIndex = chunkStart + i
          const accountData = chunk[i]
          
          try {
            const { error } = await supabase
              .from('chart_of_accounts')
              .insert({
                ...accountData,
                company_id: companyId
              })

            if (error) {
              results.failed++
              results.errors.push({
                row: globalIndex + 1,
                message: error.message,
                account_code: accountData.account_code
              })
              console.error(`🔍 [SMART_UPLOAD] Error for ${accountData.account_code}:`, error)
            } else {
              results.successful++
              console.log(`🔍 [SMART_UPLOAD] Created account: ${accountData.account_code}`)
            }
          } catch (error: any) {
            results.failed++
            results.errors.push({
              row: globalIndex + 1,
              message: error.message,
              account_code: accountData.account_code
            })
            console.error(`🔍 [SMART_UPLOAD] Unexpected error:`, error)
          }
          
          // Small delay for UI responsiveness
          if (globalIndex % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1))
          }
        }
        
        // Delay between chunks
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      setResults(results)
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })

      if (results.successful > 0) {
        toast.success(`تم رفع ${results.successful} حساب بنجاح من خلال الرفع الذكي`)
      }

      if (results.failed > 0) {
        toast.error(`فشل في رفع ${results.failed} حساب في الرفع الذكي`)
      }

    } catch (error: any) {
      console.error('🔍 [SMART_UPLOAD] Fatal error:', error)
      toast.error(`خطأ في الرفع الذكي: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadAccounts,
    smartUploadAccounts,
    downloadTemplate,
    isUploading,
    progress,
    results,
    fieldTypes: chartAccountFieldTypes
  }
}