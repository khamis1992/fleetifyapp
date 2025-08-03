import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { generateContractPdf } from '@/utils/contractPdfGenerator'
import { generateUnsignedContractPdf } from '@/utils/unsignedContractPdfGenerator'
import { useCreateContractDocument } from './useContractDocuments'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'
import type { 
  DocumentSavingStep, 
  ContractDocumentSavingResult,
  ContractDocumentSavingSettings,
  UnsignedContractPdfData 
} from '@/types/contractDocumentSaving'
import type { ContractPdfData } from '@/utils/contractPdfGenerator'

interface ContractData {
  contract_id: string
  contract_number: string
  contract_type: string
  customer_name: string
  vehicle_info?: string
  start_date: string
  end_date: string
  contract_amount: number
  monthly_amount: number
  terms?: string
  customer_signature?: string
  company_signature?: string
  condition_report_id?: string
}

export const useContractDocumentSaving = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const { mutateAsync: createDocument } = useCreateContractDocument()
  
  const [savingSteps, setSavingSteps] = useState<DocumentSavingStep[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Get company document saving settings
  const getCompanySettings = useCallback(async (): Promise<ContractDocumentSavingSettings> => {
    if (!companyId) {
      return getDefaultSettings()
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', companyId)
        .single()

      if (error || !data?.settings) {
        return getDefaultSettings()
      }

      const settings = data.settings as any
      if (!settings.document_saving) {
        return getDefaultSettings()
      }

      return {
        ...getDefaultSettings(),
        ...settings.document_saving
      }
    } catch (error) {
      console.warn('Failed to load company document saving settings:', error)
      return getDefaultSettings()
    }
  }, [companyId])

  const getDefaultSettings = (): ContractDocumentSavingSettings => ({
    auto_save_unsigned_contracts: true,
    auto_save_signed_contracts: true,
    auto_save_condition_reports: true,
    auto_save_signatures: false,
    pdf_generation_priority: 'immediate',
    error_handling_mode: 'lenient',
    notification_preferences: {
      success: true,
      warnings: true,
      errors: true
    }
  })

  const updateStep = useCallback((stepId: string, updates: Partial<DocumentSavingStep>) => {
    setSavingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            ...updates,
            completed_at: updates.status === 'completed' || updates.status === 'failed' || updates.status === 'warning' 
              ? new Date().toISOString() 
              : step.completed_at
          }
        : step
    ))
  }, [])

  const initializeSteps = useCallback((contractData: ContractData, settings: ContractDocumentSavingSettings) => {
    const steps: DocumentSavingStep[] = []

    if (settings.auto_save_unsigned_contracts) {
      steps.push({
        id: 'unsigned-contract',
        title: 'حفظ نسخة أولية من العقد',
        description: 'إنشاء وحفظ نسخة PDF غير موقعة من العقد',
        status: 'pending',
        progress: 0
      })
    }

    if (contractData.customer_signature && contractData.company_signature && settings.auto_save_signed_contracts) {
      steps.push({
        id: 'signed-contract',
        title: 'حفظ العقد الموقع',
        description: 'إنشاء وحفظ نسخة PDF موقعة من العقد',
        status: 'pending',
        progress: 0
      })
    }

    if (contractData.condition_report_id && settings.auto_save_condition_reports) {
      steps.push({
        id: 'condition-report',
        title: 'ربط تقرير حالة المركبة',
        description: 'ربط تقرير حالة المركبة بوثائق العقد',
        status: 'pending',
        progress: 0
      })
    }

    if (settings.auto_save_signatures && (contractData.customer_signature || contractData.company_signature)) {
      steps.push({
        id: 'signatures',
        title: 'حفظ التوقيعات',
        description: 'حفظ التوقيعات كمستندات منفصلة',
        status: 'pending',
        progress: 0
      })
    }

    setSavingSteps(steps)
    return steps
  }, [])

  const saveDocumentsMutation = useMutation({
    mutationFn: async (contractData: ContractData): Promise<ContractDocumentSavingResult> => {
      setIsProcessing(true)
      const settings = await getCompanySettings()
      const steps = initializeSteps(contractData, settings)
      
      const result: ContractDocumentSavingResult = {
        success: true,
        documents_created: [],
        warnings: [],
        errors: [],
        total_documents: steps.length,
        successful_saves: 0
      }

      try {
        // Save unsigned contract PDF
        if (settings.auto_save_unsigned_contracts) {
          await saveUnsignedContract(contractData, result, settings)
        }

        // Save signed contract PDF
        if (contractData.customer_signature && contractData.company_signature && settings.auto_save_signed_contracts) {
          await saveSignedContract(contractData, result, settings)
        }

        // Link condition report
        if (contractData.condition_report_id && settings.auto_save_condition_reports) {
          await linkConditionReport(contractData, result, settings)
        }

        // Save individual signatures
        if (settings.auto_save_signatures && (contractData.customer_signature || contractData.company_signature)) {
          await saveSignatures(contractData, result, settings)
        }

        // Show notifications based on settings
        if (settings.notification_preferences.success && result.successful_saves > 0) {
          toast.success(`تم حفظ ${result.successful_saves} مستند بنجاح`)
        }

        if (settings.notification_preferences.warnings && result.warnings.length > 0) {
          result.warnings.forEach(warning => toast.warning(warning))
        }

        if (settings.notification_preferences.errors && result.errors.length > 0) {
          result.errors.forEach(error => toast.error(error))
        }

        return result

      } catch (error) {
        console.error('Document saving failed:', error)
        result.success = false
        result.errors.push(error instanceof Error ? error.message : 'حدث خطأ غير متوقع')
        
        if (settings.notification_preferences.errors) {
          toast.error('فشل في حفظ مستندات العقد')
        }
        
        return result
      } finally {
        setIsProcessing(false)
      }
    }
  })

  const saveUnsignedContract = async (
    contractData: ContractData, 
    result: ContractDocumentSavingResult,
    settings: ContractDocumentSavingSettings
  ) => {
    updateStep('unsigned-contract', { status: 'processing', progress: 20 })

    try {
      const unsignedPdfData: UnsignedContractPdfData = {
        contract_number: contractData.contract_number,
        contract_type: contractData.contract_type,
        customer_name: contractData.customer_name,
        vehicle_info: contractData.vehicle_info,
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        contract_amount: contractData.contract_amount,
        monthly_amount: contractData.monthly_amount,
        terms: contractData.terms,
        company_name: 'الشركة',
        created_date: new Date().toLocaleDateString('ar-SA'),
        is_draft: true,
        draft_watermark: true
      }

      updateStep('unsigned-contract', { status: 'processing', progress: 50 })
      
      const pdfBlob = await generateUnsignedContractPdf(unsignedPdfData)
      const pdfFile = new File([pdfBlob], `draft-contract-${contractData.contract_number}.pdf`, {
        type: 'application/pdf'
      })

      updateStep('unsigned-contract', { status: 'processing', progress: 80 })

      await createDocument({
        contract_id: contractData.contract_id,
        document_type: 'draft_contract',
        document_name: `مسودة العقد رقم ${contractData.contract_number}`,
        file: pdfFile,
        notes: 'نسخة أولية غير موقعة من العقد',
        is_required: false
      })

      result.documents_created.push({
        id: 'unsigned-contract',
        document_type: 'draft_contract',
        document_name: `مسودة العقد رقم ${contractData.contract_number}`,
        status: 'saved'
      })

      result.successful_saves++
      updateStep('unsigned-contract', { status: 'completed', progress: 100 })

    } catch (error) {
      console.error('Failed to save unsigned contract:', error)
      const errorMessage = 'فشل في حفظ نسخة المسودة من العقد'
      
      if (settings.error_handling_mode === 'strict') {
        result.errors.push(errorMessage)
        updateStep('unsigned-contract', { status: 'failed', progress: 0, error: errorMessage })
        throw error
      } else {
        result.warnings.push(errorMessage)
        updateStep('unsigned-contract', { status: 'warning', progress: 100, warnings: [errorMessage] })
      }
    }
  }

  const saveSignedContract = async (
    contractData: ContractData, 
    result: ContractDocumentSavingResult,
    settings: ContractDocumentSavingSettings
  ) => {
    updateStep('signed-contract', { status: 'processing', progress: 20 })

    try {
      const signedPdfData: ContractPdfData = {
        contract_number: contractData.contract_number,
        contract_type: contractData.contract_type,
        customer_name: contractData.customer_name,
        vehicle_info: contractData.vehicle_info,
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        contract_amount: contractData.contract_amount,
        monthly_amount: contractData.monthly_amount,
        terms: contractData.terms,
        customer_signature: contractData.customer_signature,
        company_signature: contractData.company_signature,
        company_name: 'الشركة',
        created_date: new Date().toLocaleDateString('ar-SA')
      }

      updateStep('signed-contract', { status: 'processing', progress: 50 })
      
      const pdfBlob = await generateContractPdf(signedPdfData)
      const pdfFile = new File([pdfBlob], `signed-contract-${contractData.contract_number}.pdf`, {
        type: 'application/pdf'
      })

      updateStep('signed-contract', { status: 'processing', progress: 80 })

      await createDocument({
        contract_id: contractData.contract_id,
        document_type: 'signed_contract',
        document_name: `العقد الموقع رقم ${contractData.contract_number}`,
        file: pdfFile,
        notes: 'نسخة موقعة من العقد',
        is_required: true
      })

      result.documents_created.push({
        id: 'signed-contract',
        document_type: 'signed_contract',
        document_name: `العقد الموقع رقم ${contractData.contract_number}`,
        status: 'saved'
      })

      result.successful_saves++
      updateStep('signed-contract', { status: 'completed', progress: 100 })

    } catch (error) {
      console.error('Failed to save signed contract:', error)
      const errorMessage = 'فشل في حفظ العقد الموقع'
      
      if (settings.error_handling_mode === 'strict') {
        result.errors.push(errorMessage)
        updateStep('signed-contract', { status: 'failed', progress: 0, error: errorMessage })
        throw error
      } else {
        result.warnings.push(errorMessage)
        updateStep('signed-contract', { status: 'warning', progress: 100, warnings: [errorMessage] })
      }
    }
  }

  const linkConditionReport = async (
    contractData: ContractData, 
    result: ContractDocumentSavingResult,
    settings: ContractDocumentSavingSettings
  ) => {
    updateStep('condition-report', { status: 'processing', progress: 50 })

    try {
      await createDocument({
        contract_id: contractData.contract_id,
        document_type: 'condition_report',
        document_name: `تقرير حالة المركبة - ${new Date().toLocaleDateString('en-GB')}`,
        notes: 'تقرير حالة المركبة المرتبط بالعقد',
        is_required: true,
        condition_report_id: contractData.condition_report_id
      })

      result.documents_created.push({
        id: 'condition-report',
        document_type: 'condition_report',
        document_name: 'تقرير حالة المركبة',
        status: 'saved'
      })

      result.successful_saves++
      updateStep('condition-report', { status: 'completed', progress: 100 })

    } catch (error) {
      console.error('Failed to link condition report:', error)
      const errorMessage = 'فشل في ربط تقرير حالة المركبة'
      
      if (settings.error_handling_mode === 'strict') {
        result.errors.push(errorMessage)
        updateStep('condition-report', { status: 'failed', progress: 0, error: errorMessage })
        throw error
      } else {
        result.warnings.push(errorMessage)
        updateStep('condition-report', { status: 'warning', progress: 100, warnings: [errorMessage] })
      }
    }
  }

  const saveSignatures = async (
    contractData: ContractData, 
    result: ContractDocumentSavingResult,
    settings: ContractDocumentSavingSettings
  ) => {
    updateStep('signatures', { status: 'processing', progress: 25 })

    try {
      let savedSignatures = 0

      if (contractData.customer_signature) {
        // Convert base64 signature to file
        const response = await fetch(contractData.customer_signature)
        const blob = await response.blob()
        const signatureFile = new File([blob], `customer-signature-${contractData.contract_number}.png`, {
          type: 'image/png'
        })

        await createDocument({
          contract_id: contractData.contract_id,
          document_type: 'signature',
          document_name: `توقيع العميل - ${contractData.contract_number}`,
          file: signatureFile,
          notes: 'توقيع العميل',
          is_required: false
        })

        savedSignatures++
        updateStep('signatures', { status: 'processing', progress: 50 })
      }

      if (contractData.company_signature) {
        const response = await fetch(contractData.company_signature)
        const blob = await response.blob()
        const signatureFile = new File([blob], `company-signature-${contractData.contract_number}.png`, {
          type: 'image/png'
        })

        await createDocument({
          contract_id: contractData.contract_id,
          document_type: 'signature',
          document_name: `توقيع الشركة - ${contractData.contract_number}`,
          file: signatureFile,
          notes: 'توقيع ممثل الشركة',
          is_required: false
        })

        savedSignatures++
      }

      if (savedSignatures > 0) {
        result.documents_created.push({
          id: 'signatures',
          document_type: 'signature',
          document_name: `التوقيعات (${savedSignatures})`,
          status: 'saved'
        })

        result.successful_saves++
      }

      updateStep('signatures', { status: 'completed', progress: 100 })

    } catch (error) {
      console.error('Failed to save signatures:', error)
      const errorMessage = 'فشل في حفظ التوقيعات'
      
      if (settings.error_handling_mode === 'strict') {
        result.errors.push(errorMessage)
        updateStep('signatures', { status: 'failed', progress: 0, error: errorMessage })
        throw error
      } else {
        result.warnings.push(errorMessage)
        updateStep('signatures', { status: 'warning', progress: 100, warnings: [errorMessage] })
      }
    }
  }

  return {
    saveDocuments: saveDocumentsMutation.mutateAsync,
    isProcessing: isProcessing || saveDocumentsMutation.isPending,
    savingSteps,
    getCompanySettings,
    resetSteps: () => setSavingSteps([])
  }
}