import { useState } from "react"
import { toast } from "sonner"

// Simplified templates without database operations for now
export interface ContractTemplate {
  id: string
  template_name: string
  template_name_ar: string
  contract_type: string
  default_terms: string
  default_duration_days: number
  auto_calculate_pricing: boolean
  requires_approval: boolean
  approval_threshold: number
  account_mappings: {
    revenue_account_id?: string
    receivables_account_id?: string
    cost_center_id?: string
  }
}

// Mock data for demonstration
const defaultTemplates: ContractTemplate[] = [
  {
    id: '1',
    template_name: 'Daily Rental Template',
    template_name_ar: 'قالب الإيجار اليومي',
    contract_type: 'daily_rental',
    default_terms: 'شروط وأحكام الإيجار اليومي...',
    default_duration_days: 1,
    auto_calculate_pricing: true,
    requires_approval: false,
    approval_threshold: 5000,
    account_mappings: {}
  },
  {
    id: '2',
    template_name: 'Monthly Rental Template',
    template_name_ar: 'قالب الإيجار الشهري',
    contract_type: 'monthly_rental',
    default_terms: 'شروط وأحكام الإيجار الشهري...',
    default_duration_days: 30,
    auto_calculate_pricing: true,
    requires_approval: true,
    approval_threshold: 10000,
    account_mappings: {}
  }
]

export const useContractTemplates = () => {
  const [templates] = useState<ContractTemplate[]>(defaultTemplates)
  const [isLoading] = useState(false)

  const createTemplate = {
    mutate: (templateData: Partial<ContractTemplate>) => {
      console.log('Creating template:', templateData)
      toast.success('سيتم إضافة وظيفة القوالب قريباً')
    },
    isPending: false
  }

  const updateTemplate = {
    mutate: ({ id, updates }: { id: string, updates: Partial<ContractTemplate> }) => {
      console.log('Updating template:', id, updates)
      toast.success('سيتم تحديث القوالب قريباً')
    },
    isPending: false
  }

  const deleteTemplate = {
    mutate: (id: string) => {
      console.log('Deleting template:', id)
      toast.success('سيتم حذف القوالب قريباً')
    },
    isPending: false
  }

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate
  }
}

// Hook to apply template to contract data
export const useApplyTemplate = () => {
  const applyTemplate = (template: ContractTemplate, baseData: any = {}) => {
    return {
      ...baseData,
      contract_type: template.contract_type,
      terms: template.default_terms,
      rental_days: template.default_duration_days,
      account_id: template.account_mappings.receivables_account_id || '',
      cost_center_id: template.account_mappings.cost_center_id || '',
      // Calculate end date based on default duration
      end_date: template.default_duration_days > 0 
        ? new Date(Date.now() + template.default_duration_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : '',
      requires_approval: template.requires_approval,
      approval_threshold: template.approval_threshold
    }
  }

  return { applyTemplate }
}