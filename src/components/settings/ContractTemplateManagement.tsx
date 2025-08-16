import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy,
  Eye,
  Save,
  HelpCircle,
  InfoIcon,
  DollarSign,
  Users,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { useContractTemplates, ContractTemplate } from '@/hooks/useContractTemplates';
import { CustomerAccountSelector } from '@/components/finance/CustomerAccountSelector';

export const ContractTemplateManagement: React.FC = () => {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useContractTemplates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);
  
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    template_name_ar: '',
    contract_type: 'daily_rental' as string,
    default_terms: '',
    default_duration_days: 1,
    auto_calculate_pricing: true,
    requires_approval: false,
    approval_threshold: 5000,
    account_id: '',
    use_default_accounts: true,
    account_mappings: {
      revenue_account_id: '',
      receivables_account_id: '',
      cost_center_id: ''
    }
  });

  const contractTypes = [
    { value: 'daily_rental', label: 'إيجار يومي', icon: <CalendarDays className="h-4 w-4" />, duration: 1 },
    { value: 'weekly_rental', label: 'إيجار أسبوعي', icon: <CalendarDays className="h-4 w-4" />, duration: 7 },
    { value: 'monthly_rental', label: 'إيجار شهري', icon: <CalendarDays className="h-4 w-4" />, duration: 30 },
    { value: 'corporate', label: 'عقد مؤسسي', icon: <Users className="h-4 w-4" />, duration: 90 }
  ];

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      template_name: '',
      template_name_ar: '',
      contract_type: 'daily_rental',
      default_terms: '',
      default_duration_days: 1,
      auto_calculate_pricing: true,
      requires_approval: false,
      approval_threshold: 5000,
      account_id: '',
      use_default_accounts: true,
      account_mappings: {
        revenue_account_id: '',
        receivables_account_id: '',
        cost_center_id: ''
      }
    });
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      template_name: template.template_name,
      template_name_ar: template.template_name_ar,
      contract_type: template.contract_type,
      default_terms: template.default_terms,
      default_duration_days: template.default_duration_days,
      auto_calculate_pricing: template.auto_calculate_pricing,
      requires_approval: template.requires_approval,
      approval_threshold: template.approval_threshold,
      account_id: template.account_id || '',
      use_default_accounts: !template.account_mappings.receivables_account_id,
      account_mappings: {
        revenue_account_id: template.account_mappings.revenue_account_id || '',
        receivables_account_id: template.account_mappings.receivables_account_id || '',
        cost_center_id: template.account_mappings.cost_center_id || ''
      }
    });
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.template_name || !templateForm.template_name_ar || !templateForm.default_terms) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Update duration based on contract type
    const selectedType = contractTypes.find(t => t.value === templateForm.contract_type);
    const duration = selectedType?.duration || templateForm.default_duration_days;

    const templateData: Partial<ContractTemplate> = {
      template_name: templateForm.template_name,
      template_name_ar: templateForm.template_name_ar,
      contract_type: templateForm.contract_type,
      default_terms: templateForm.default_terms,
      default_duration_days: duration,
      auto_calculate_pricing: templateForm.auto_calculate_pricing,
      requires_approval: templateForm.requires_approval,
      approval_threshold: templateForm.approval_threshold,
      account_id: templateForm.account_id,
      account_mappings: templateForm.use_default_accounts ? {} : {
        revenue_account_id: templateForm.account_mappings.revenue_account_id || '',
        receivables_account_id: templateForm.account_mappings.receivables_account_id || '',
        cost_center_id: templateForm.account_mappings.cost_center_id || ''
      }
    };

    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate.id, updates: templateData });
    } else {
      createTemplate.mutate(templateData);
    }

    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate.mutate(templateId);
  };

  const handleDuplicateTemplate = (template: ContractTemplate) => {
    const newTemplate: Partial<ContractTemplate> = {
      ...template,
      template_name: `${template.template_name} - نسخة`,
      template_name_ar: `${template.template_name_ar} - نسخة`,
    };
    delete newTemplate.id;
    createTemplate.mutate(newTemplate);
  };

  const getTypeIcon = (type: string) => {
    return contractTypes.find(t => t.value === type)?.icon || <FileText className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return contractTypes.find(t => t.value === type)?.label || type;
  };

  const handleContractTypeChange = (contractType: string) => {
    const selectedType = contractTypes.find(t => t.value === contractType);
    setTemplateForm(prev => ({
      ...prev,
      contract_type: contractType,
      default_duration_days: selectedType?.duration || 1
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">إدارة قوالب العقود</h2>
            <p className="text-muted-foreground">إنشاء وتخصيص قوالب العقود مع الحسابات المحاسبية</p>
          </div>
          <Button onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            قالب عقد جديد
          </Button>
        </div>

        {/* Alert for Account Information */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>معلومات مهمة حول الحسابات المحاسبية:</strong>
            <br />
            • <strong>حساب الإيراد:</strong> الحساب الذي سيتم تسجيل دخل الإيجار فيه (مثل: حساب إيجار يومي، إيجار شهري)
            <br />
            • <strong>حساب المدينين:</strong> الحساب الذي سيتم تسجيل المبلغ المستحق من العميل فيه (اختياري - سيتم استخدام الحساب الافتراضي إذا لم يتم التحديد)
            <br />
            • <strong>مركز التكلفة:</strong> لتصنيف العمليات حسب الأقسام أو المشاريع
          </AlertDescription>
        </Alert>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(template.contract_type)}
                    <div>
                      <CardTitle className="text-lg">{template.template_name_ar}</CardTitle>
                      <p className="text-sm text-muted-foreground">{getTypeLabel(template.contract_type)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-col">
                    <Badge variant="outline" className="text-xs">
                      {template.default_duration_days} يوم
                    </Badge>
                    {template.requires_approval && (
                      <Badge variant="secondary" className="text-xs">يتطلب موافقة</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>مدة افتراضية: {template.default_duration_days} يوم</div>
                  <div>حد الموافقة: {template.approval_threshold.toLocaleString()} ريال</div>
                  <div>حساب تلقائي: {template.auto_calculate_pricing ? 'نعم' : 'لا'}</div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    معاينة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create/Edit Template Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'تعديل قالب العقد' : 'إنشاء قالب عقد جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template_name">اسم القالب (بالإنجليزية)</Label>
                  <Input
                    id="template_name"
                    value={templateForm.template_name}
                    onChange={(e) => setTemplateForm(prev => ({...prev, template_name: e.target.value}))}
                    placeholder="Template Name"
                  />
                </div>
                <div>
                  <Label htmlFor="template_name_ar">اسم القالب (بالعربية) *</Label>
                  <Input
                    id="template_name_ar"
                    value={templateForm.template_name_ar}
                    onChange={(e) => setTemplateForm(prev => ({...prev, template_name_ar: e.target.value}))}
                    placeholder="اسم القالب"
                  />
                </div>
              </div>

              {/* Contract Type and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract_type">نوع العقد *</Label>
                  <Select 
                    value={templateForm.contract_type} 
                    onValueChange={handleContractTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            {type.icon}
                            <span>{type.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="duration">المدة الافتراضية (بالأيام)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>المدة الافتراضية للعقد بالأيام، يتم تحديثها تلقائياً حسب نوع العقد</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="duration"
                    type="number"
                    value={templateForm.default_duration_days}
                    onChange={(e) => setTemplateForm(prev => ({...prev, default_duration_days: parseInt(e.target.value) || 1}))}
                    min="1"
                  />
                </div>
              </div>

              {/* Account Settings */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">إعدادات الحسابات المحاسبية</h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="use_default_accounts" className="text-sm">استخدام الحسابات الافتراضية</Label>
                    <Switch
                      id="use_default_accounts"
                      checked={templateForm.use_default_accounts}
                      onCheckedChange={(checked) => setTemplateForm(prev => ({...prev, use_default_accounts: checked}))}
                    />
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>عند التفعيل، سيتم استخدام الحسابات الافتراضية من إعدادات الشركة</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Revenue Account - Always Required */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>حساب الإيراد *</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>الحساب الذي سيتم تسجيل دخل الإيجار فيه (مثل: حساب إيجار يومي، إيجار شهري)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CustomerAccountSelector
                    value={templateForm.account_id}
                    onValueChange={(value) => setTemplateForm(prev => ({...prev, account_id: value}))}
                    accountType="revenue"
                    placeholder="اختر حساب الإيراد"
                  />
                </div>

                {/* Optional Accounts - Only show if not using defaults */}
                {!templateForm.use_default_accounts && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Label>حساب المدينين (اختياري)</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>الحساب الذي سيتم تسجيل المبلغ المستحق من العميل فيه. إذا ترك فارغاً، سيتم استخدام الحساب الافتراضي للمدينين</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <CustomerAccountSelector
                        value={templateForm.account_mappings.receivables_account_id || ''}
                        onValueChange={(value) => setTemplateForm(prev => ({
                          ...prev, 
                          account_mappings: {...prev.account_mappings, receivables_account_id: value}
                        }))}
                        accountType="receivable"
                        placeholder="اختر حساب المدينين (أو اتركه فارغاً لاستخدام الافتراضي)"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Label>مركز التكلفة (اختياري)</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>لتصنيف العمليات حسب الأقسام أو المشاريع</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <CustomerAccountSelector
                        value={templateForm.account_mappings.cost_center_id || ''}
                        onValueChange={(value) => setTemplateForm(prev => ({
                          ...prev, 
                          account_mappings: {...prev.account_mappings, cost_center_id: value}
                        }))}
                        placeholder="اختر مركز التكلفة (اختياري)"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Contract Terms */}
              <div>
                <Label htmlFor="default_terms">شروط وأحكام العقد *</Label>
                <Textarea
                  id="default_terms"
                  value={templateForm.default_terms}
                  onChange={(e) => setTemplateForm(prev => ({...prev, default_terms: e.target.value}))}
                  placeholder="أدخل شروط وأحكام العقد الافتراضية..."
                  className="min-h-32"
                />
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-lg font-medium">إعدادات متقدمة</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="auto_calculate">حساب السعر تلقائياً</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>حساب سعر العقد تلقائياً بناءً على نوع العقد ومدته</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="auto_calculate"
                      checked={templateForm.auto_calculate_pricing}
                      onCheckedChange={(checked) => setTemplateForm(prev => ({...prev, auto_calculate_pricing: checked}))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="requires_approval">يتطلب موافقة</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>العقود التي تتجاوز حد الموافقة تحتاج لموافقة إدارية</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="requires_approval"
                      checked={templateForm.requires_approval}
                      onCheckedChange={(checked) => setTemplateForm(prev => ({...prev, requires_approval: checked}))}
                    />
                  </div>
                </div>

                {templateForm.requires_approval && (
                  <div>
                    <Label htmlFor="approval_threshold">حد الموافقة (ريال)</Label>
                    <Input
                      id="approval_threshold"
                      type="number"
                      value={templateForm.approval_threshold}
                      onChange={(e) => setTemplateForm(prev => ({...prev, approval_threshold: parseFloat(e.target.value) || 0}))}
                      min="0"
                      step="100"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveTemplate} disabled={createTemplate.isPending || updateTemplate.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'تحديث القالب' : 'إنشاء القالب'}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>معاينة قالب العقد: {previewTemplate?.template_name_ar}</DialogTitle>
            </DialogHeader>
            
            {previewTemplate && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>نوع العقد:</strong> {getTypeLabel(previewTemplate.contract_type)}
                  </div>
                  <div>
                    <strong>المدة الافتراضية:</strong> {previewTemplate.default_duration_days} يوم
                  </div>
                  <div>
                    <strong>حساب تلقائي:</strong> {previewTemplate.auto_calculate_pricing ? 'نعم' : 'لا'}
                  </div>
                  <div>
                    <strong>يتطلب موافقة:</strong> {previewTemplate.requires_approval ? 'نعم' : 'لا'}
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">شروط وأحكام العقد:</h4>
                  <div className="whitespace-pre-wrap text-sm">
                    {previewTemplate.default_terms}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};