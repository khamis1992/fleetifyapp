import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Move, UserCheck, Building2, CreditCard, Receipt, ShoppingCart } from 'lucide-react';
import { useCreateWorkflow, useUpdateWorkflow, RequestSource } from '@/hooks/useApprovalWorkflows';
import { toast } from 'sonner';

interface WorkflowStep {
  step_order: number;
  approver_type: 'role' | 'user' | 'amount_threshold';
  approver_value: string;
  required: boolean;
}

interface WorkflowFormData {
  workflow_name: string;
  workflow_name_ar: string;
  description: string;
  source_type: RequestSource;
  is_active: boolean;
  conditions: any;
  steps: WorkflowStep[];
}

interface WorkflowFormProps {
  workflow?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const SOURCE_TYPE_OPTIONS = [
  { value: 'contract', label: 'العقود', icon: Building2 },
  { value: 'payment', label: 'المدفوعات', icon: CreditCard },
  { value: 'expense', label: 'المصروفات', icon: Receipt },
  { value: 'purchase', label: 'المشتريات', icon: ShoppingCart },
  { value: 'payroll', label: 'الرواتب', icon: UserCheck },
  { value: 'leave_request', label: 'طلبات الإجازة', icon: UserCheck },
  { value: 'vehicle_maintenance', label: 'صيانة المركبات', icon: Building2 },
  { value: 'budget', label: 'الميزانية', icon: Receipt },
  { value: 'other', label: 'أخرى', icon: UserCheck },
];

const APPROVER_ROLES = [
  { value: 'manager', label: 'مدير', description: 'مدير المشروع أو القسم' },
  { value: 'company_admin', label: 'مدير الشركة', description: 'مدير عام للشركة' },
  { value: 'super_admin', label: 'مدير النظام', description: 'مدير النظام العام' },
  { value: 'sales_agent', label: 'مندوب مبيعات', description: 'مسؤول المبيعات' },
];

export const WorkflowForm: React.FC<WorkflowFormProps> = ({
  workflow,
  onSuccess,
  onCancel,
}) => {
  const isEdit = !!workflow;
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<WorkflowFormData>({
    defaultValues: {
      workflow_name: workflow?.workflow_name || '',
      workflow_name_ar: workflow?.workflow_name_ar || '',
      description: workflow?.description || '',
      source_type: workflow?.source_type || 'contract',
      is_active: workflow?.is_active ?? true,
      conditions: workflow?.conditions || {},
      steps: workflow?.steps || [
        { step_order: 1, approver_type: 'role', approver_value: 'manager', required: true }
      ]
    }
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'steps',
  });

  const addStep = () => {
    append({
      step_order: fields.length + 1,
      approver_type: 'role',
      approver_value: 'manager',
      required: true
    });
  };

  const onSubmit = async (data: WorkflowFormData) => {
    try {
      // إعادة ترقيم الخطوات
      const normalizedSteps = data.steps.map((step, index) => ({
        ...step,
        step_order: index + 1
      }));

      const workflowData = {
        ...data,
        steps: normalizedSteps
      };

      if (isEdit) {
        await updateWorkflow.mutateAsync({ id: workflow.id, ...workflowData });
        toast.success('تم تحديث سير العمل بنجاح');
      } else {
        await createWorkflow.mutateAsync(workflowData);
        toast.success('تم إنشاء سير العمل بنجاح');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Error saving workflow:', error);
      toast.error(error?.message || 'حدث خطأ في حفظ سير العمل');
    }
  };

  const getSourceTypeIcon = (sourceType: string) => {
    const option = SOURCE_TYPE_OPTIONS.find(opt => opt.value === sourceType);
    const IconComponent = option?.icon || UserCheck;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {getSourceTypeIcon(watch('source_type'))}
        <div>
          <h2 className="text-lg font-semibold">
            {isEdit ? 'تعديل سير العمل' : 'إنشاء سير عمل جديد'}
          </h2>
          <p className="text-sm text-muted-foreground">
            قم بتحديد خطوات الموافقة والشروط المطلوبة
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workflow_name">اسم سير العمل (English) *</Label>
                <Input
                  id="workflow_name"
                  {...register('workflow_name', { required: 'اسم سير العمل مطلوب' })}
                  placeholder="Contract Approval Workflow"
                />
                {errors.workflow_name && (
                  <p className="text-sm text-destructive mt-1">{errors.workflow_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="workflow_name_ar">اسم سير العمل (العربية)</Label>
                <Input
                  id="workflow_name_ar"
                  {...register('workflow_name_ar')}
                  placeholder="سير عمل الموافقة على العقود"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="وصف مختصر لسير العمل وآلية الموافقة..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="source_type">نوع العملية *</Label>
                <Select 
                  value={watch('source_type')} 
                  onValueChange={(value) => setValue('source_type', value as RequestSource)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العملية" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPE_OPTIONS.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
                <Label htmlFor="is_active">تفعيل سير العمل</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Steps */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">خطوات الموافقة</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  حدد الخطوات المطلوبة للموافقة على هذا النوع من العمليات
                </p>
              </div>
              <Button type="button" onClick={addStep} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                إضافة خطوة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="relative">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-5 gap-4 items-end">
                      <div>
                        <Label>الخطوة رقم</Label>
                        <div className="flex items-center justify-center h-9 bg-muted rounded-md">
                          <Badge variant="outline">{index + 1}</Badge>
                        </div>
                      </div>

                      <div>
                        <Label>نوع الموافق</Label>
                        <Select
                          value={watch(`steps.${index}.approver_type`)}
                          onValueChange={(value) => setValue(`steps.${index}.approver_type`, value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="role">دور وظيفي</SelectItem>
                            <SelectItem value="user">مستخدم محدد</SelectItem>
                            <SelectItem value="amount_threshold">حد المبلغ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>المعرف/القيمة</Label>
                        {watch(`steps.${index}.approver_type`) === 'role' ? (
                          <Select
                            value={watch(`steps.${index}.approver_value`)}
                            onValueChange={(value) => setValue(`steps.${index}.approver_value`, value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {APPROVER_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="space-y-1">
                                    <div className="font-medium">{role.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {role.description}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            {...register(`steps.${index}.approver_value`)}
                            placeholder={
                              watch(`steps.${index}.approver_type`) === 'user' 
                                ? 'معرف المستخدم' 
                                : 'المبلغ المحدد'
                            }
                          />
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={watch(`steps.${index}.required`)}
                          onCheckedChange={(checked) => setValue(`steps.${index}.required`, checked)}
                        />
                        <Label className="text-sm">مطلوب</Label>
                      </div>

                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => move(index, index - 1)}
                          >
                            <Move className="w-4 h-4" />
                          </Button>
                        )}
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد خطوات موافقة. اضغط "إضافة خطوة" للبدء.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button 
            type="submit" 
            disabled={createWorkflow.isPending || updateWorkflow.isPending}
            className="min-w-[120px]"
          >
            {createWorkflow.isPending || updateWorkflow.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                جاري الحفظ...
              </div>
            ) : (
              isEdit ? 'تحديث سير العمل' : 'إنشاء سير العمل'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};