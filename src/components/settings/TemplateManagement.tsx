import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy,
  Download,
  Upload,
  Eye,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  name_ar: string;
  type: 'invoice' | 'contract' | 'report' | 'email' | 'letter';
  content: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const sampleTemplates: Template[] = [
  {
    id: '1',
    name: 'Invoice Template',
    name_ar: 'قالب الفاتورة',
    type: 'invoice',
    content: `<div class="invoice">
  <h1>فاتورة رقم {{invoice_number}}</h1>
  <p>التاريخ: {{invoice_date}}</p>
  <p>العميل: {{customer_name}}</p>
  <p>المبلغ: {{total_amount}}</p>
</div>`,
    variables: ['invoice_number', 'invoice_date', 'customer_name', 'total_amount'],
    is_default: true,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    name: 'Contract Template',
    name_ar: 'قالب العقد',
    type: 'contract',
    content: `<div class="contract">
  <h1>عقد إيجار رقم {{contract_number}}</h1>
  <p>الطرف الأول: {{company_name}}</p>
  <p>الطرف الثاني: {{customer_name}}</p>
  <p>المدة: من {{start_date}} إلى {{end_date}}</p>
  <p>القيمة الشهرية: {{monthly_amount}}</p>
</div>`,
    variables: ['contract_number', 'company_name', 'customer_name', 'start_date', 'end_date', 'monthly_amount'],
    is_default: true,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

export const TemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>(sampleTemplates);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    name_ar: '',
    type: 'invoice' as Template['type'],
    content: '',
    variables: [] as string[]
  });

  const templateTypes = [
    { value: 'invoice', label: 'فاتورة', icon: '📄' },
    { value: 'contract', label: 'عقد', icon: '📋' },
    { value: 'report', label: 'تقرير', icon: '📊' },
    { value: 'email', label: 'بريد إلكتروني', icon: '📧' },
    { value: 'letter', label: 'خطاب', icon: '📝' }
  ];

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(match => match.slice(2, -2).trim()))];
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      name_ar: '',
      type: 'invoice',
      content: '',
      variables: []
    });
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      name_ar: template.name_ar,
      type: template.type,
      content: template.content,
      variables: template.variables
    });
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.content) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    const variables = extractVariables(templateForm.content);
    
    const templateData: Template = {
      id: editingTemplate?.id || Date.now().toString(),
      name: templateForm.name,
      name_ar: templateForm.name_ar,
      type: templateForm.type,
      content: templateForm.content,
      variables,
      is_default: false,
      is_active: true,
      created_at: editingTemplate?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? templateData : t));
      toast.success('تم تحديث القالب بنجاح');
    } else {
      setTemplates(prev => [...prev, templateData]);
      toast.success('تم إنشاء القالب بنجاح');
    }

    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.is_default) {
      toast.error('لا يمكن حذف القوالب الافتراضية');
      return;
    }

    setTemplates(prev => prev.filter(t => t.id !== templateId));
    toast.success('تم حذف القالب بنجاح');
  };

  const handleDuplicateTemplate = (template: Template) => {
    const newTemplate: Template = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} - نسخة`,
      name_ar: `${template.name_ar} - نسخة`,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setTemplates(prev => [...prev, newTemplate]);
    toast.success('تم نسخ القالب بنجاح');
  };

  const handleExportTemplate = (template: Template) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${template.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير القالب بنجاح');
  };

  const handleContentChange = (content: string) => {
    setTemplateForm(prev => ({
      ...prev,
      content,
      variables: extractVariables(content)
    }));
  };

  const getTypeIcon = (type: Template['type']) => {
    return templateTypes.find(t => t.value === type)?.icon || '📄';
  };

  const getTypeLabel = (type: Template['type']) => {
    return templateTypes.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة القوالب</h2>
          <p className="text-muted-foreground">إنشاء وتخصيص قوالب المستندات والتقارير</p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          قالب جديد
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeIcon(template.type)}</span>
                  <div>
                    <CardTitle className="text-lg">{template.name_ar || template.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{getTypeLabel(template.type)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {template.is_default && (
                    <Badge variant="outline" className="text-xs">افتراضي</Badge>
                  )}
                  <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-xs">
                    {template.is_active ? 'نشط' : 'معطل'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                المتغيرات: {template.variables.length}
              </div>
              
              <div className="flex flex-wrap gap-1">
                {template.variables.slice(0, 3).map((variable) => (
                  <Badge key={variable} variant="outline" className="text-xs">
                    {variable}
                  </Badge>
                ))}
                {template.variables.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.variables.length - 3}
                  </Badge>
                )}
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
                  onClick={() => handleExportTemplate(template)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                {!template.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
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
              {editingTemplate ? 'تعديل القالب' : 'إنشاء قالب جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">اسم القالب (بالإنجليزية)</Label>
                <Input
                  id="name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({...prev, name: e.target.value}))}
                  placeholder="Template Name"
                />
              </div>
              <div>
                <Label htmlFor="name_ar">اسم القالب (بالعربية)</Label>
                <Input
                  id="name_ar"
                  value={templateForm.name_ar}
                  onChange={(e) => setTemplateForm(prev => ({...prev, name_ar: e.target.value}))}
                  placeholder="اسم القالب"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type">نوع القالب</Label>
              <Select 
                value={templateForm.type} 
                onValueChange={(value: Template['type']) => setTemplateForm(prev => ({...prev, type: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">محتوى القالب</Label>
              <Textarea
                id="content"
                value={templateForm.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="أدخل محتوى القالب هنا... استخدم {{variable_name}} للمتغيرات"
                className="min-h-48 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                استخدم <code>{"{{variable_name}}"}</code> لإدراج المتغيرات القابلة للتبديل
              </p>
            </div>

            {templateForm.variables.length > 0 && (
              <div>
                <Label>المتغيرات المكتشفة</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {templateForm.variables.map((variable) => (
                    <Badge key={variable} variant="outline">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveTemplate}>
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
            <DialogTitle>معاينة القالب: {previewTemplate?.name_ar || previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div 
                  dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
                  className="prose prose-sm max-w-none"
                />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">المتغيرات المتاحة:</h4>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.variables.map((variable) => (
                    <Badge key={variable} variant="outline">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};