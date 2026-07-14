import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Edit, Plus, Settings, Trash2 } from 'lucide-react';
import { AdminOnly } from '@/components/common/PermissionGuard';
import { CustomerAccountSelector } from '@/components/finance/CustomerAccountSelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  ContractTemplate,
  ContractTemplateData,
  ContractTemplateType,
  useContractTemplates,
  useCreateContractTemplate,
  useDeleteContractTemplate,
  useUpdateContractTemplate,
} from '@/hooks/useContractTemplates';

interface TemplateFormData {
  template_name: string;
  template_name_ar: string;
  contract_type: ContractTemplateType;
  default_terms: string;
  default_duration_days: number;
  auto_calculate_pricing: boolean;
  requires_approval: boolean;
  approval_threshold: number;
  account_id: string;
  revenue_account_id: string;
  receivables_account_id: string;
  cost_center_id: string;
}

interface ContractTemplateManagerProps {
  onTemplateSelect?: (template: ContractTemplate) => void;
  showSelectMode?: boolean;
}

const DEFAULT_FORM: TemplateFormData = {
  template_name: '',
  template_name_ar: '',
  contract_type: 'monthly_rental',
  default_terms: '',
  default_duration_days: 30,
  auto_calculate_pricing: true,
  requires_approval: false,
  approval_threshold: 5000,
  account_id: '',
  revenue_account_id: '',
  receivables_account_id: '',
  cost_center_id: '',
};

const CONTRACT_TYPE_LABELS: Record<ContractTemplateType, string> = {
  rent_to_own: 'إيجار حتى التملك',
  daily_rental: 'إيجار يومي',
  weekly_rental: 'إيجار أسبوعي',
  monthly_rental: 'إيجار شهري',
  yearly_rental: 'إيجار سنوي',
};

export const ContractTemplateManager = ({
  onTemplateSelect,
  showSelectMode = false,
}: ContractTemplateManagerProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const { data: templates = [], isLoading } = useContractTemplates();
  const createTemplate = useCreateContractTemplate();
  const updateTemplate = useUpdateContractTemplate();
  const deleteTemplate = useDeleteContractTemplate();
  const { formatCurrency } = useCurrencyFormatter();
  const { register, handleSubmit, reset, setValue, watch } = useForm<TemplateFormData>({
    defaultValues: DEFAULT_FORM,
  });

  const openNewTemplate = () => {
    setEditingTemplate(null);
    reset(DEFAULT_FORM);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    reset(DEFAULT_FORM);
  };

  const handleEdit = (template: ContractTemplate) => {
    if (template.template_type === 'preset') return;
    setEditingTemplate(template);
    reset({
      template_name: template.template_name,
      template_name_ar: template.template_name_ar || '',
      contract_type: template.contract_type,
      default_terms: template.default_terms,
      default_duration_days: template.default_duration_days,
      auto_calculate_pricing: template.auto_calculate_pricing,
      requires_approval: template.requires_approval,
      approval_threshold: template.approval_threshold,
      account_id: template.account_id || '',
      revenue_account_id: template.account_mappings.revenue_account_id || '',
      receivables_account_id: template.account_mappings.receivables_account_id || '',
      cost_center_id: template.account_mappings.cost_center_id || '',
    });
    setShowForm(true);
  };

  const submitTemplate = async (form: TemplateFormData) => {
    const data: ContractTemplateData = {
      template_name: form.template_name,
      template_name_ar: form.template_name_ar,
      contract_type: form.contract_type,
      default_terms: form.default_terms,
      default_duration_days: form.default_duration_days,
      auto_calculate_pricing: form.auto_calculate_pricing,
      requires_approval: form.requires_approval,
      approval_threshold: form.requires_approval ? form.approval_threshold : 0,
      account_id: form.account_id || undefined,
      account_mappings: {
        revenue_account_id: form.revenue_account_id || undefined,
        receivables_account_id: form.receivables_account_id || undefined,
        cost_center_id: form.cost_center_id || undefined,
      },
    };

    if (editingTemplate) {
      await updateTemplate.mutateAsync({ templateId: editingTemplate.id, data });
    } else {
      await createTemplate.mutateAsync(data);
    }
    closeForm();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><LoadingSpinner size="lg" /></div>;
  }

  const mutationPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">قوالب العقود</h2>
          <p className="text-muted-foreground">إنشاء قوالب موحدة لتسريع إدخال العقود وضبط إعداداتها المالية.</p>
        </div>
        <AdminOnly hideIfNoAccess>
          <Button onClick={openNewTemplate}>
            <Plus className="ml-2 h-4 w-4" />
            قالب جديد
          </Button>
        </AdminOnly>
      </div>

      <Dialog open={showForm} onOpenChange={open => open ? setShowForm(true) : closeForm()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'تعديل القالب' : 'إنشاء قالب جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(submitTemplate)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template_name">اسم القالب *</Label>
                <Input id="template_name" {...register('template_name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template_name_ar">الاسم العربي</Label>
                <Input id="template_name_ar" {...register('template_name_ar')} />
              </div>
              <div className="space-y-2">
                <Label>نوع العقد *</Label>
                <Select
                  value={watch('contract_type')}
                  onValueChange={value => setValue('contract_type', value as ContractTemplateType)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_duration_days">المدة الافتراضية بالأيام</Label>
                <Input
                  id="default_duration_days"
                  type="number"
                  min={1}
                  {...register('default_duration_days', { valueAsNumber: true, min: 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_terms">الشروط والأحكام الافتراضية</Label>
              <Textarea id="default_terms" rows={4} {...register('default_terms')} />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">الحسابات المحاسبية</h3>
              <div className="space-y-2">
                <Label>الحساب الرئيسي للعقد</Label>
                <CustomerAccountSelector
                  value={watch('account_id')}
                  onValueChange={value => setValue('account_id', value)}
                  placeholder="اختر الحساب الرئيسي"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>حساب المدينين</Label>
                  <CustomerAccountSelector
                    value={watch('receivables_account_id')}
                    onValueChange={value => setValue('receivables_account_id', value)}
                    accountType="receivable"
                    placeholder="الحساب الافتراضي"
                  />
                </div>
                <div className="space-y-2">
                  <Label>حساب الإيرادات</Label>
                  <CustomerAccountSelector
                    value={watch('revenue_account_id')}
                    onValueChange={value => setValue('revenue_account_id', value)}
                    accountType="revenue"
                    placeholder="الحساب الافتراضي"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="auto_calculate_pricing">حساب التسعير تلقائيًا</Label>
                <Switch
                  id="auto_calculate_pricing"
                  checked={watch('auto_calculate_pricing')}
                  onCheckedChange={checked => setValue('auto_calculate_pricing', checked)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="requires_approval">يتطلب موافقة</Label>
                <Switch
                  id="requires_approval"
                  checked={watch('requires_approval')}
                  onCheckedChange={checked => setValue('requires_approval', checked)}
                />
              </div>
              {watch('requires_approval') && (
                <div className="space-y-2">
                  <Label htmlFor="approval_threshold">حد المبلغ الذي يتطلب موافقة</Label>
                  <Input
                    id="approval_threshold"
                    type="number"
                    min={0}
                    step="0.01"
                    {...register('approval_threshold', { valueAsNumber: true, min: 0 })}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
              <Button type="submit" disabled={mutationPending}>
                {mutationPending ? 'جارٍ الحفظ...' : editingTemplate ? 'حفظ التعديلات' : 'إنشاء القالب'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-y py-12 text-center">
          <Settings className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-semibold">لا توجد قوالب بعد</h3>
          <p className="mb-4 text-sm text-muted-foreground">أنشئ قالبًا لتوحيد إعدادات العقود المتكررة.</p>
          <AdminOnly hideIfNoAccess><Button onClick={openNewTemplate}>إنشاء القالب الأول</Button></AdminOnly>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <Card key={template.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{template.template_name_ar || template.template_name}</CardTitle>
                    <CardDescription>{CONTRACT_TYPE_LABELS[template.contract_type]}</CardDescription>
                  </div>
                  <Badge variant={template.template_type === 'preset' ? 'secondary' : 'outline'}>
                    {template.template_type === 'preset' ? 'جاهز' : `${template.default_duration_days} يوم`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">المدة</span><span>{template.default_duration_days} يوم</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">تسعير تلقائي</span><span>{template.auto_calculate_pricing ? 'نعم' : 'لا'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">يتطلب موافقة</span><span>{template.requires_approval ? 'نعم' : 'لا'}</span></div>
                  {template.requires_approval && (
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">حد الموافقة</span><span>{formatCurrency(template.approval_threshold)}</span></div>
                  )}
                </div>

                {showSelectMode ? (
                  <Button className="w-full" onClick={() => onTemplateSelect?.(template)}>استخدام القالب</Button>
                ) : template.template_type === 'custom' ? (
                  <AdminOnly hideIfNoAccess>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" onClick={() => handleEdit(template)} aria-label="تعديل القالب" title="تعديل القالب">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm('هل تريد حذف هذا القالب؟')) deleteTemplate.mutate(template.id);
                        }}
                        disabled={deleteTemplate.isPending}
                        aria-label="حذف القالب"
                        title="حذف القالب"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </AdminOnly>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
