import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Users, 
  Shield, 
  Plus, 
  Eye, 
  Edit, 
  Star,
  Clock,
  Settings,
  Save
} from 'lucide-react';
import { UserRole, ROLE_PERMISSIONS } from '@/types/permissions';
import { useToast } from '@/hooks/use-toast';

interface PermissionTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  category: 'operational' | 'administrative' | 'analytical' | 'custom';
  roles: UserRole[];
  permissions: string[];
  isActive: boolean;
  isPredefined: boolean;
  usage_count: number;
  created_at: string;
}

const PREDEFINED_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'view-only',
    name: 'View Only Access',
    nameAr: 'صلاحيات العرض فقط',
    description: 'View-only access to all data without modification rights',
    category: 'operational',
    roles: ['employee'],
    permissions: [
      'hr.employees.read',
      'finance.invoices.read',
      'fleet.vehicles.read',
      'customers.read',
      'contracts.read'
    ],
    isActive: true,
    isPredefined: true,
    usage_count: 45,
    created_at: '2024-01-01'
  },
  {
    id: 'data-entry',
    name: 'Data Entry Specialist',
    nameAr: 'أخصائي إدخال البيانات',
    description: 'Create and edit basic records with limited administrative access',
    category: 'operational',
    roles: ['sales_agent'],
    permissions: [
      'customers.create',
      'customers.update',
      'customers.read',
      'contracts.create',
      'contracts.update',
      'contracts.read',
      'finance.invoices.create',
      'finance.invoices.read'
    ],
    isActive: true,
    isPredefined: true,
    usage_count: 32,
    created_at: '2024-01-01'
  },
  {
    id: 'financial-analyst',
    name: 'Financial Analyst',
    nameAr: 'محلل مالي',
    description: 'Full access to financial data and reports',
    category: 'analytical',
    roles: ['manager'],
    permissions: [
      'finance.invoices.read',
      'finance.payments.read',
      'finance.reports.read',
      'finance.analytics.read',
      'finance.budgets.read',
      'finance.treasury.read'
    ],
    isActive: true,
    isPredefined: true,
    usage_count: 18,
    created_at: '2024-01-01'
  },
  {
    id: 'department-manager',
    name: 'Department Manager',
    nameAr: 'مدير قسم',
    description: 'Manage specific department with approval rights',
    category: 'administrative',
    roles: ['manager'],
    permissions: [
      'hr.employees.read',
      'hr.attendance.manage',
      'hr.payroll.read',
      'contracts.approve',
      'finance.invoices.approve',
      'reports.department.read'
    ],
    isActive: true,
    isPredefined: true,
    usage_count: 25,
    created_at: '2024-01-01'
  }
];

interface AdvancedPermissionTemplatesProps {
  onApplyTemplate?: (template: PermissionTemplate) => void;
}

export default function AdvancedPermissionTemplates({ onApplyTemplate }: AdvancedPermissionTemplatesProps) {
  const [templates, setTemplates] = useState<PermissionTemplate[]>(PREDEFINED_TEMPLATES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<PermissionTemplate>>({
    category: 'custom',
    roles: [],
    permissions: [],
    isActive: true,
    isPredefined: false
  });
  const { toast } = useToast();

  const categoryLabels = {
    all: 'جميع القوالب',
    operational: 'تشغيلية',
    administrative: 'إدارية', 
    analytical: 'تحليلية',
    custom: 'مخصصة'
  };

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const handleApplyTemplate = (template: PermissionTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
      toast({
        title: "تم تطبيق القالب",
        description: `تم تطبيق قالب "${template.nameAr}" بنجاح`,
      });
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.nameAr) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم القالب",
        variant: "destructive"
      });
      return;
    }

    const template: PermissionTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplate.name!,
      nameAr: newTemplate.nameAr!,
      description: newTemplate.description || '',
      category: newTemplate.category as any,
      roles: newTemplate.roles || [],
      permissions: newTemplate.permissions || [],
      isActive: true,
      isPredefined: false,
      usage_count: 0,
      created_at: new Date().toISOString()
    };

    setTemplates(prev => [...prev, template]);
    setNewTemplate({
      category: 'custom',
      roles: [],
      permissions: [],
      isActive: true,
      isPredefined: false
    });
    setShowCreateDialog(false);

    toast({
      title: "تم إنشاء القالب",
      description: `تم إنشاء قالب "${template.nameAr}" بنجاح`,
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'operational': return <Users className="w-4 h-4" />;
      case 'administrative': return <Shield className="w-4 h-4" />;
      case 'analytical': return <Eye className="w-4 h-4" />;
      case 'custom': return <Settings className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getRoleLabels = (roles: UserRole[]) => {
    const roleLabels: Record<UserRole, string> = {
      super_admin: 'مدير النظام',
      company_admin: 'مدير الشركة',
      manager: 'مدير',
      sales_agent: 'مندوب مبيعات',
      employee: 'موظف'
    };
    return roles.map(role => roleLabels[role]).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">قوالب الصلاحيات المتقدمة</h2>
          <p className="text-muted-foreground">
            قوالب جاهزة لتطبيق مجموعات صلاحيات شائعة
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              إنشاء قالب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء قالب صلاحيات جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">اسم القالب (إنجليزي)</Label>
                  <Input
                    id="template-name"
                    value={newTemplate.name || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Data Entry Specialist"
                  />
                </div>
                <div>
                  <Label htmlFor="template-name-ar">اسم القالب (عربي)</Label>
                  <Input
                    id="template-name-ar"
                    value={newTemplate.nameAr || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, nameAr: e.target.value }))}
                    placeholder="أخصائي إدخال البيانات"
                    dir="rtl"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="template-category">فئة القالب</Label>
                <Select 
                  value={newTemplate.category} 
                  onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">تشغيلية</SelectItem>
                    <SelectItem value="administrative">إدارية</SelectItem>
                    <SelectItem value="analytical">تحليلية</SelectItem>
                    <SelectItem value="custom">مخصصة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template-description">وصف القالب</Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description || ''}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف مختصر لاستخدام هذا القالب"
                  dir="rtl"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleCreateTemplate}>
                  <Save className="w-4 h-4 mr-2" />
                  إنشاء القالب
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(key)}
                className="flex items-center gap-2"
              >
                {getCategoryIcon(key)}
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(template.category)}
                  <div>
                    <CardTitle className="text-lg">{template.nameAr}</CardTitle>
                    <p className="text-sm text-muted-foreground">{template.name}</p>
                  </div>
                </div>
                {template.isPredefined && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>

              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">الأدوار المشمولة</p>
                  <p className="text-sm">{getRoleLabels(template.roles)}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-muted-foreground">عدد الصلاحيات</p>
                  <Badge variant="outline">{template.permissions.length} صلاحية</Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {template.usage_count} استخدام
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(template.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => handleApplyTemplate(template)}
                >
                  تطبيق القالب
                </Button>
                <Button variant="outline" size="icon">
                  <Eye className="w-4 h-4" />
                </Button>
                {!template.isPredefined && (
                  <Button variant="outline" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد قوالب</h3>
            <p className="text-muted-foreground text-center mb-4">
              لا توجد قوالب في هذه الفئة حالياً
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              إنشاء أول قالب
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}