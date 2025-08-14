import { useState } from "react"
import { toast } from "sonner"

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
  account_id?: string // إضافة الحساب المحاسبي مباشرة
  account_mappings: {
    revenue_account_id?: string
    receivables_account_id?: string
    cost_center_id?: string
  }
}

// Enhanced mock data with actual terms and accurate durations
const defaultTemplates: ContractTemplate[] = [
  {
    id: '1',
    template_name: 'Daily Rental Template',
    template_name_ar: 'قالب الإيجار اليومي',
    contract_type: 'daily_rental',
    default_terms: `شروط وأحكام عقد الإيجار اليومي

1. مدة الإيجار: يوم واحد من تاريخ بداية العقد
2. الدفع: يستحق الدفع مقدماً قبل استلام المركبة
3. المسؤولية: المستأجر مسؤول عن أي أضرار تلحق بالمركبة
4. الاستخدام: المركبة للاستخدام الشخصي فقط
5. الإرجاع: يجب إرجاع المركبة في نفس اليوم
6. الوقود: يجب إرجاع المركبة بنفس مستوى الوقود
7. المخالفات: المستأجر مسؤول عن جميع المخالفات المرورية
8. التأمين: المركبة مؤمنة ضد الحوادث الكبرى فقط`,
    default_duration_days: 1,
    auto_calculate_pricing: true,
    requires_approval: false,
    approval_threshold: 5000,
    account_mappings: {}
  },
  {
    id: '2',
    template_name: 'Weekly Rental Template', 
    template_name_ar: 'قالب الإيجار الأسبوعي',
    contract_type: 'weekly_rental',
    default_terms: `شروط وأحكام عقد الإيجار الأسبوعي

1. مدة الإيجار: سبعة أيام من تاريخ بداية العقد
2. الدفع: يمكن الدفع مقدماً أو بالتقسيط الأسبوعي
3. المسؤولية: المستأجر مسؤول عن أي أضرار تلحق بالمركبة
4. الاستخدام: للاستخدام التجاري والشخصي
5. الصيانة: الصيانة البسيطة على حساب الشركة
6. الوقود: على حساب المستأجر
7. المخالفات: المستأجر مسؤول عن جميع المخالفات المرورية
8. التأمين: تأمين شامل متاح بتكلفة إضافية`,
    default_duration_days: 7,
    auto_calculate_pricing: true,
    requires_approval: false,
    approval_threshold: 8000,
    account_mappings: {}
  },
  {
    id: '3',
    template_name: 'Monthly Rental Template',
    template_name_ar: 'قالب الإيجار الشهري',
    contract_type: 'monthly_rental',
    default_terms: `شروط وأحكام عقد الإيجار الشهري

1. مدة الإيجار: شهر واحد قابل للتجديد
2. الدفع: دفعة مقدمة + الإيجار الشهري
3. المسؤولية: المستأجر مسؤول عن أي أضرار تلحق بالمركبة
4. الاستخدام: للاستخدام التجاري والشخصي المكثف
5. الصيانة: الصيانة الدورية على حساب الشركة
6. الوقود: على حساب المستأجر
7. التأمين: تأمين شامل مشمول في السعر
8. الإرجاع: إشعار مسبق 48 ساعة لإنهاء العقد
9. الكيلومترات: حد أقصى 3000 كم شهرياً`,
    default_duration_days: 30,
    auto_calculate_pricing: true,
    requires_approval: true,
    approval_threshold: 10000,
    account_mappings: {}
  },
  {
    id: '4',
    template_name: 'Corporate Contract Template',
    template_name_ar: 'قالب العقود المؤسسية',
    contract_type: 'corporate',
    default_terms: `شروط وأحكام العقد المؤسسي

1. مدة الإيجار: حسب الاتفاق (3-12 شهر)
2. الدفع: فوترة شهرية أو ربع سنوية
3. الخصومات: خصومات خاصة للعقود طويلة المدى
4. أسطول المركبات: إمكانية تأجير عدة مركبات
5. الصيانة: صيانة شاملة متضمنة
6. التأمين: تأمين شامل متضمن
7. الاستبدال: إمكانية استبدال المركبة عند الحاجة
8. التقارير: تقارير شهرية للاستخدام والتكاليف
9. الدعم: دعم فني على مدار الساعة`,
    default_duration_days: 90,
    auto_calculate_pricing: false,
    requires_approval: true,
    approval_threshold: 25000,
    account_mappings: {}
  }
]

// Contract type to duration mapping for automatic calculation
export const getDefaultDurationByType = (contractType: string): number => {
  const typeMap: Record<string, number> = {
    'daily_rental': 1,
    'weekly_rental': 7,
    'monthly_rental': 30,
    'quarterly_rental': 90,
    'yearly_rental': 365,
    'corporate': 90,
    'rental': 1,
    'service': 1,
    'maintenance': 7,
    'insurance': 365
  }
  return typeMap[contractType] || 1
}

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

// Hook to get template by contract type
export const useTemplateByType = (contractType: string) => {
  const { templates } = useContractTemplates()
  return templates.find(template => template.contract_type === contractType)
}

// Hook to apply template to contract data
export const useApplyTemplate = () => {
  const applyTemplate = (template: ContractTemplate, baseData: any = {}) => {
    return {
      ...baseData,
      contract_type: template.contract_type,
      terms: template.default_terms,
      rental_days: template.default_duration_days,
      // تطبيق الحساب المحاسبي من القالب مباشرة
      account_id: template.account_id || template.account_mappings.receivables_account_id || '',
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