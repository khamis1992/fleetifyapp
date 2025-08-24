import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess"
import { normalizeCsvHeaders } from "@/utils/csv"

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
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(header => 
      header.replace(/"/g, '').trim()
    )
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(value => 
        value.replace(/"/g, '').trim()
      )
      
      const row: any = {}
      headers.forEach((header, i) => {
        row[header] = values[i] || ''
      })
      
      row._rowNumber = index + 2
      return normalizeCsvHeaders(row, 'chart_account')
    })
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
      const text = await file.text()
      const data = parseCSV(text)
      
      if (data.length === 0) {
        throw new Error('لا توجد بيانات في الملف')
      }

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

      // معالجة البيانات
      for (let i = 0; i < data.length; i++) {
        const rowData = data[i]
        const rowNumber = rowData._rowNumber || i + 2

        try {
          setProgress((i / data.length) * 100)

          // التحقق من صحة البيانات
          const validation = validateAccountData(rowData, rowNumber)
          if (!validation.valid) {
            results.failed++
            results.errors.push({
              row: rowNumber,
              message: validation.errors.join(', '),
              account_code: rowData.account_code
            })
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
              ['true', '1', 'نعم'].includes(rowData.is_header.toLowerCase()) : false
          }

          // البحث عن الحساب الأب إذا تم تحديده
          if (rowData.parent_account_code) {
            const parentId = existingAccountsMap.get(rowData.parent_account_code)
            if (parentId) {
              accountData.parent_account_id = parentId
            } else {
              results.errors.push({
                row: rowNumber,
                message: `الحساب الأب ${rowData.parent_account_code} غير موجود`,
                account_code: rowData.account_code
              })
              results.failed++
              continue
            }
          }

          // التحقق من وجود الحساب مسبقاً
          const existingAccountId = existingAccountsMap.get(rowData.account_code)
          
          if (existingAccountId) {
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
            } else {
              results.updated++
            }
          } else {
            // إنشاء حساب جديد
            const { error } = await supabase
              .from('chart_of_accounts')
              .insert({
                ...accountData,
                company_id: companyId
              })

            if (error) {
              results.failed++
              results.errors.push({
                row: rowNumber,
                message: `خطأ في إنشاء الحساب: ${error.message}`,
                account_code: rowData.account_code
              })
            } else {
              results.successful++
              // إضافة الحساب الجديد إلى الخريطة
              existingAccountsMap.set(rowData.account_code, 'new')
            }
          }

        } catch (error: any) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            message: `خطأ غير متوقع: ${error.message}`,
            account_code: rowData.account_code
          })
        }
      }

      setProgress(100)
      setResults(results)

      // تحديث cache الاستعلامات
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })

      if (results.successful > 0 || results.updated > 0) {
        toast.success(`تم رفع ${results.successful + results.updated} حساب بنجاح`)
      }

      if (results.failed > 0) {
        toast.error(`فشل في رفع ${results.failed} حساب`)
      }

    } catch (error: any) {
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
      const results: ChartAccountCSVUploadResults = {
        total: fixedData.length,
        successful: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: []
      }

      // إدراج البيانات المصححة
      for (let i = 0; i < fixedData.length; i++) {
        const accountData = fixedData[i]
        
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
              row: i + 1,
              message: error.message,
              account_code: accountData.account_code
            })
          } else {
            results.successful++
          }
        } catch (error: any) {
          results.failed++
          results.errors.push({
            row: i + 1,
            message: error.message,
            account_code: accountData.account_code
          })
        }
      }

      setResults(results)
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })

      if (results.successful > 0) {
        toast.success(`تم رفع ${results.successful} حساب بنجاح`)
      }

    } catch (error: any) {
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