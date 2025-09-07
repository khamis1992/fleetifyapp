import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

export interface CSVTemplate {
  id: string
  company_id: string
  template_name: string
  template_name_ar?: string
  entity_type: 'contracts' | 'customers' | 'vehicles' | 'invoices' | 'payments'
  description?: string
  description_ar?: string
  headers: string[]
  sample_data: any[]
  field_mappings: Record<string, any>
  validation_rules: Record<string, any>
  usage_count: number
  last_used_at?: string
  is_default: boolean
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CreateCSVTemplateData {
  template_name: string
  template_name_ar?: string
  entity_type: 'contracts' | 'customers' | 'vehicles' | 'invoices' | 'payments'
  description?: string
  description_ar?: string
  headers: string[]
  sample_data?: any[]
  field_mappings?: Record<string, any>
  validation_rules?: Record<string, any>
  is_default?: boolean
}

export const useCSVTemplates = (entityType?: string) => {
  const queryClient = useQueryClient()

  // جلب القوالب
  const {
    data: templates = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['csv-templates', entityType],
    queryFn: async () => {
      let query = supabase
        .from('csv_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('usage_count', { ascending: false })
        .order('template_name')

      if (entityType) {
        query = query.eq('entity_type', entityType)
      }

      const { data, error } = await query

      if (error) throw error
      return data as CSVTemplate[]
    }
  })

  // إنشاء قالب جديد
  const createTemplate = useMutation({
    mutationFn: async (templateData: CreateCSVTemplateData) => {
      // إضافة company_id من معلومات المستخدم الحالي
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single()

      if (!profile?.company_id) {
        throw new Error('Company ID not found')
      }

      const fullTemplateData = {
        ...templateData,
        company_id: profile.company_id
      }

      const { data, error } = await supabase
        .from('csv_templates')
        .insert([fullTemplateData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-templates'] })
      toast.success('تم إنشاء القالب بنجاح')
    },
    onError: (error) => {
      console.error('Error creating template:', error)
      toast.error('فشل في إنشاء القالب')
    }
  })

  // تحديث قالب
  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<CSVTemplate> }) => {
      const { data, error } = await supabase
        .from('csv_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-templates'] })
      toast.success('تم تحديث القالب بنجاح')
    },
    onError: (error) => {
      console.error('Error updating template:', error)
      toast.error('فشل في تحديث القالب')
    }
  })

  // حذف قالب
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('csv_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-templates'] })
      toast.success('تم حذف القالب بنجاح')
    },
    onError: (error) => {
      console.error('Error deleting template:', error)
      toast.error('فشل في حذف القالب')
    }
  })

  // تحديث إحصائيات الاستخدام
  const updateUsage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('csv_templates')
        .update({ 
          usage_count: templates.find(t => t.id === id)?.usage_count + 1 || 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csv-templates'] })
    }
  })

  // توليد ملف CSV من القالب
  const generateCSVFromTemplate = (template: CSVTemplate) => {
    const headers = template.headers.join(',')
    const sampleRows = template.sample_data.map(row => 
      template.headers.map(header => row[header] || '').join(',')
    ).join('\n')
    
    const csvContent = `${headers}\n${sampleRows}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${template.template_name}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // تحديث إحصائيات الاستخدام
    updateUsage.mutate(template.id)
  }

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateCSVFromTemplate,
    updateUsage
  }
}