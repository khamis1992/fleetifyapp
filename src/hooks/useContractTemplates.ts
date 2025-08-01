import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export interface ContractTemplate {
  id: string
  company_id: string
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
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export const useContractTemplates = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['contract-templates', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('template_name')
      
      if (error) throw error
      return data as ContractTemplate[]
    },
    enabled: !!user?.profile?.company_id,
  })

  // Create template mutation
  const createTemplate = useMutation({
    mutationFn: async (templateData: Partial<ContractTemplate>) => {
      const { error } = await supabase
        .from('contract_templates')
        .insert([{
          ...templateData,
          company_id: user?.profile?.company_id,
          created_by: user?.id
        }])
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] })
      toast.success('تم إنشاء القالب بنجاح')
    },
    onError: (error) => {
      console.error('Error creating template:', error)
      toast.error('خطأ في إنشاء القالب')
    }
  })

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<ContractTemplate> }) => {
      const { error } = await supabase
        .from('contract_templates')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] })
      toast.success('تم تحديث القالب بنجاح')
    },
    onError: (error) => {
      console.error('Error updating template:', error)
      toast.error('خطأ في تحديث القالب')
    }
  })

  // Delete template mutation
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] })
      toast.success('تم حذف القالب بنجاح')
    },
    onError: (error) => {
      console.error('Error deleting template:', error)
      toast.error('خطأ في حذف القالب')
    }
  })

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