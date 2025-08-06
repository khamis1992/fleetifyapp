import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { ContractCreationData } from "@/types/contracts"
import { toast } from "sonner"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export function useContractCSVUpload() {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CSVUploadResults | null>(null)

  const downloadTemplate = () => {
    const headers = [
      'customer_id',
      'vehicle_id',
      'contract_number',
      'contract_type',
      'contract_date',
      'start_date',
      'end_date',
      'contract_amount',
      'monthly_amount',
      'description',
      'terms',
      'cost_center_id'
    ]

    const exampleData = [
      'customer-uuid-here',
      'vehicle-uuid-here',
      'CON-2024-001',
      'monthly_rental',
      '2024-01-01',
      '2024-01-01',
      '2024-12-31',
      '6000.000',
      '500.000',
      'عقد إيجار شهري لمركبة تويوتا كامري',
      'يلتزم المستأجر بدفع الإيجار في موعده المحدد',
      'cost-center-uuid-here'
    ]

    const csvContent = [
      headers.join(','),
      exampleData.join(',')
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'contracts_template.csv')
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

  const validateContractData = (data: any, rowNumber: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Required fields validation
    if (!data.customer_id) {
      errors.push('معرف العميل مطلوب')
    }

    if (!data.contract_type) {
      errors.push('نوع العقد مطلوب')
    }

    const validContractTypes = ['rental', 'daily_rental', 'weekly_rental', 'monthly_rental', 'yearly_rental', 'rent_to_own']
    if (data.contract_type && !validContractTypes.includes(data.contract_type)) {
      errors.push(`نوع العقد يجب أن يكون أحد القيم التالية: ${validContractTypes.join(', ')}`)
    }

    if (!data.start_date) {
      errors.push('تاريخ بداية العقد مطلوب')
    }

    if (!data.end_date) {
      errors.push('تاريخ نهاية العقد مطلوب')
    }

    if (!data.contract_amount) {
      errors.push('مبلغ العقد مطلوب')
    }

    // Date format validation
    if (data.contract_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.contract_date)) {
      errors.push('تنسيق تاريخ العقد يجب أن يكون YYYY-MM-DD')
    }

    if (data.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.start_date)) {
      errors.push('تنسيق تاريخ بداية العقد يجب أن يكون YYYY-MM-DD')
    }

    if (data.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.end_date)) {
      errors.push('تنسيق تاريخ نهاية العقد يجب أن يكون YYYY-MM-DD')
    }

    // Date logic validation
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)
      if (endDate <= startDate) {
        errors.push('تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية')
      }
    }

    // Numeric validation
    if (data.contract_amount && isNaN(Number(data.contract_amount))) {
      errors.push('مبلغ العقد يجب أن يكون رقماً')
    }

    if (data.monthly_amount && isNaN(Number(data.monthly_amount))) {
      errors.push('المبلغ الشهري يجب أن يكون رقماً')
    }

    // Amount logic validation
    if (data.contract_amount && Number(data.contract_amount) <= 0) {
      errors.push('مبلغ العقد يجب أن يكون أكبر من صفر')
    }

    return { isValid: errors.length === 0, errors }
  }

  const uploadContracts = async (file: File) => {
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
        const contractData = data[i]
        const validation = validateContractData(contractData, contractData.rowNumber)

        setProgress(Math.round(((i + 1) / data.length) * 100))

        if (!validation.isValid) {
          results.failed++
          results.errors.push({
            row: contractData.rowNumber,
            message: validation.errors.join(', ')
          })
          continue
        }

        try {
          // Generate contract number if not provided
          const contractNumber = contractData.contract_number || `CON-${Date.now()}-${i + 1}`

          const contractPayload = {
            company_id: user.profile.company_id,
            customer_id: contractData.customer_id,
            vehicle_id: contractData.vehicle_id || null,
            contract_number: contractNumber,
            contract_type: contractData.contract_type,
            contract_date: contractData.contract_date || new Date().toISOString().split('T')[0],
            start_date: contractData.start_date,
            end_date: contractData.end_date,
            contract_amount: Number(contractData.contract_amount),
            monthly_amount: contractData.monthly_amount ? Number(contractData.monthly_amount) : Number(contractData.contract_amount),
            description: contractData.description || null,
            terms: contractData.terms || null,
            cost_center_id: contractData.cost_center_id || null,
            status: 'draft',
            created_by: user.id
          }

          const { error } = await supabase
            .from('contracts')
            .insert(contractPayload)

          if (error) {
            results.failed++
            results.errors.push({
              row: contractData.rowNumber,
              message: `خطأ في قاعدة البيانات: ${error.message}`
            })
          } else {
            results.successful++
          }
        } catch (error: any) {
          results.failed++
          results.errors.push({
            row: contractData.rowNumber,
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
    uploadContracts,
    downloadTemplate,
    isUploading,
    progress,
    results
  }
}