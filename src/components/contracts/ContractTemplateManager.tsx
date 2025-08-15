import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AdminOnly } from '@/components/common/PermissionGuard'
import { Plus, Edit, Trash2, Copy, Settings } from 'lucide-react'
import { useContractTemplates, ContractTemplate } from '@/hooks/useContractTemplates'
import { useForm } from 'react-hook-form'
import { useEntryAllowedAccounts } from '@/hooks/useEntryAllowedAccounts'
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter'

interface TemplateFormData {
  template_name: string
  template_name_ar: string
  contract_type: string
  default_terms: string
  default_duration_days: number
  auto_calculate_pricing: boolean
  requires_approval: boolean
  approval_threshold: number
  account_id: string // الحساب المحاسبي الرئيسي
  revenue_account_id: string
  receivables_account_id: string
  cost_center_id: string
}

interface ContractTemplateManagerProps {
  onTemplateSelect?: (template: ContractTemplate) => void
  showSelectMode?: boolean
}

export const ContractTemplateManager: React.FC<ContractTemplateManagerProps> = ({
  onTemplateSelect,
  showSelectMode = false
}) => {
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useContractTemplates()
  const { data: accounts } = useEntryAllowedAccounts()
  const { formatCurrency } = useCurrencyFormatter()
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<TemplateFormData>({
    defaultValues: {
      auto_calculate_pricing: true,
      requires_approval: false,
      approval_threshold: 5000,
      default_duration_days: 30
    }
  })

  const handleFormSubmit = (data: TemplateFormData) => {
    const templateData = {
      template_name: data.template_name,
      template_name_ar: data.template_name_ar,
      contract_type: data.contract_type,
      default_terms: data.default_terms,
      default_duration_days: data.default_duration_days,
      auto_calculate_pricing: data.auto_calculate_pricing,
      requires_approval: data.requires_approval,
      approval_threshold: data.approval_threshold,
      account_id: data.account_id || undefined, // الحساب المحاسبي الرئيسي
      account_mappings: {
        revenue_account_id: data.revenue_account_id || undefined,
        receivables_account_id: data.receivables_account_id || undefined,
        cost_center_id: data.cost_center_id || undefined
      }
    }

    if (editingTemplate) {
      updateTemplate.mutate({ 
        id: editingTemplate.id, 
        updates: templateData 
      })
    } else {
      createTemplate.mutate(templateData)
    }

    setShowForm(false)
    setEditingTemplate(null)
    reset()
  }

  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template)
    setValue('template_name', template.template_name)
    setValue('template_name_ar', template.template_name_ar || '')
    setValue('contract_type', template.contract_type)
    setValue('default_terms', template.default_terms)
    setValue('default_duration_days', template.default_duration_days)
    setValue('auto_calculate_pricing', template.auto_calculate_pricing)
    setValue('requires_approval', template.requires_approval)
    setValue('approval_threshold', template.approval_threshold)
    setValue('account_id', template.account_id || '') // الحساب المحاسبي الرئيسي
    setValue('revenue_account_id', template.account_mappings.revenue_account_id || '')
    setValue('receivables_account_id', template.account_mappings.receivables_account_id || '')
    setValue('cost_center_id', template.account_mappings.cost_center_id || '')
    setShowForm(true)
  }

  const getContractTypeLabel = (type: string) => {
    const types = {
      'rent_to_own': 'إيجار حتى التملك',
      'daily_rental': 'إيجار يومي',
      'weekly_rental': 'إيجار أسبوعي',
      'monthly_rental': 'إيجار شهري',
      'yearly_rental': 'إيجار سنوي'
    }
    return types[type as keyof typeof types] || type
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">قوالب العقود</h2>
          <p className="text-muted-foreground">
            إنشاء وإدارة قوالب العقود لتسريع عملية إنشاء العقود الجديدة
          </p>
        </div>
        
        <AdminOnly hideIfNoAccess>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingTemplate(null)
                  reset()
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                قالب جديد
              </Button>
            </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'تحرير القالب' : 'إنشاء قالب جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template_name">اسم القالب (إنجليزي) *</Label>
                  <Input
                    id="template_name"
                    {...register('template_name', { required: true })}
                    placeholder="Daily Rental Template"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="template_name_ar">اسم القالب (عربي)</Label>
                  <Input
                    id="template_name_ar"
                    {...register('template_name_ar')}
                    placeholder="قالب الإيجار اليومي"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contract_type">نوع العقد *</Label>
                  <Select onValueChange={(value) => setValue('contract_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع العقد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent_to_own">إيجار حتى التملك</SelectItem>
                      <SelectItem value="daily_rental">إيجار يومي</SelectItem>
                      <SelectItem value="weekly_rental">إيجار أسبوعي</SelectItem>
                      <SelectItem value="monthly_rental">إيجار شهري</SelectItem>
                      <SelectItem value="yearly_rental">إيجار سنوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default_duration_days">المدة الافتراضية (أيام)</Label>
                  <Input
                    id="default_duration_days"
                    type="number"
                    min="1"
                    {...register('default_duration_days', { valueAsNumber: true })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default_terms">الشروط والأحكام الافتراضية</Label>
                <Textarea
                  id="default_terms"
                  {...register('default_terms')}
                  rows={4}
                  placeholder="الشروط والأحكام العامة للعقد..."
                />
              </div>
              
              {/* Account Mappings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">ربط الحسابات المحاسبية</h3>
                
                <div className="space-y-4">
                  {/* الحساب المحاسبي الرئيسي - سيتم اختياره تلقائياً في العقود */}
                  <div className="space-y-2">
                    <Label htmlFor="account_id">الحساب المحاسبي للعقد *</Label>
                    <div className="text-xs text-muted-foreground mb-2">
                      سيتم اختيار هذا الحساب تلقائياً عند استخدام القالب في إنشاء العقود
                    </div>
                    <Select onValueChange={(value) => setValue('account_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب المحاسبي" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون ربط</SelectItem>
                        {accounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="receivables_account_id">حساب المدينين</Label>
                      <Select onValueChange={(value) => setValue('receivables_account_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حساب المدينين" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون ربط</SelectItem>
                          {accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="revenue_account_id">حساب الإيرادات</Label>
                      <Select onValueChange={(value) => setValue('revenue_account_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حساب الإيرادات" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون ربط</SelectItem>
                          {accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Approval Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">إعدادات الموافقة</h3>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_approval"
                    onCheckedChange={(checked) => setValue('requires_approval', checked)}
                  />
                  <Label htmlFor="requires_approval">يتطلب موافقة</Label>
                </div>
                
                {watch('requires_approval') && (
                  <div className="space-y-2">
                    <Label htmlFor="approval_threshold">حد الموافقة المطلوبة</Label>
                    <Input
                      id="approval_threshold"
                      type="number"
                      step="0.001"
                      min="0"
                      {...register('approval_threshold', { valueAsNumber: true })}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_calculate_pricing"
                  onCheckedChange={(checked) => setValue('auto_calculate_pricing', checked)}
                />
                <Label htmlFor="auto_calculate_pricing">حساب التسعير تلقائياً</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                  {editingTemplate ? 'تحديث' : 'إنشاء'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false)
                    setEditingTemplate(null)
                    reset()
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </AdminOnly>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {template.template_name_ar || template.template_name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {getContractTypeLabel(template.contract_type)}
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {template.default_duration_days} يوم
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">حساب تلقائي:</span>
                  <span>{template.auto_calculate_pricing ? 'نعم' : 'لا'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">يتطلب موافقة:</span>
                  <span>{template.requires_approval ? 'نعم' : 'لا'}</span>
                </div>
                {template.requires_approval && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">حد الموافقة:</span>
                    <span>{formatCurrency(template.approval_threshold ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {showSelectMode ? (
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onTemplateSelect?.(template)}
                  >
                    استخدام القالب
                  </Button>
                 ) : (
                   <AdminOnly hideIfNoAccess>
                     <Button 
                       size="sm" 
                       variant="outline"
                       onClick={() => handleEdit(template)}
                     >
                       <Edit className="h-4 w-4" />
                     </Button>
                     <Button 
                       size="sm" 
                       variant="outline"
                       onClick={() => deleteTemplate.mutate(template.id)}
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </AdminOnly>
                 )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {templates?.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد قوالب بعد</h3>
                <p className="text-muted-foreground text-center mb-4">
                  إنشئ قوالب عقود لتسريع عملية إنشاء العقود الجديدة
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إنشاء القالب الأول
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}