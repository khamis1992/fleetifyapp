import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Move, 
  Eye, 
  Lightbulb,
  ArrowRight,
  TreePine,
  Target
} from 'lucide-react';
import { useUpdateAccount, useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { InteractiveAccountTree } from './InteractiveAccountTree';
import { SmartParentSelector } from './SmartParentSelector';
import { AccountMoveValidator } from './AccountMoveValidator';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { toast } from 'sonner';

interface EnhancedAccountEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ChartOfAccount | null;
  onSuccess?: () => void;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export const EnhancedAccountEditDialog: React.FC<EnhancedAccountEditDialogProps> = ({
  open,
  onOpenChange,
  account,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_name_ar: '',
    account_type: 'assets',
    account_subtype: '',
    balance_type: 'debit',
    parent_account_id: '',
    is_header: false,
    description: '',
    is_active: true
  });
  const [originalData, setOriginalData] = useState(formData);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [previewChanges, setPreviewChanges] = useState(false);
  
  const updateAccount = useUpdateAccount();
  const { data: allAccounts } = useChartOfAccounts();
  const validator = new AccountMoveValidator(allAccounts || []);

  // Initialize form data when account changes
  useEffect(() => {
    if (account) {
      const data = {
        account_code: account.account_code || '',
        account_name: account.account_name || '',
        account_name_ar: account.account_name_ar || '',
        account_type: account.account_type || 'assets',
        account_subtype: account.account_subtype || '',
        balance_type: account.balance_type || 'debit',
        parent_account_id: account.parent_account_id || '',
        is_header: account.is_header || false,
        description: account.description || '',
        is_active: account.is_active !== false
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [account]);

  // Validate changes when form data changes
  useEffect(() => {
    if (account) {
      validateChanges();
    }
  }, [formData, account]);


  const validateChanges = () => {
    const issues: ValidationIssue[] = [];
    
    if (!account) return;
    
    // Check if parent changed
    if (formData.parent_account_id !== originalData.parent_account_id) {
      const validation = validator.validateMove(account.id, formData.parent_account_id);
      
      if (!validation.isValid) {
        issues.push({
          type: 'error',
          message: validation.issues[0] || 'لا يمكن نقل الحساب إلى هذا الموقع',
          suggestion: validation.suggestions[0]
        });
      } else if (validation.warnings.length > 0) {
        issues.push({
          type: 'warning',
          message: validation.warnings[0],
          suggestion: 'تأكد من أن هذا التغيير مناسب لاحتياجاتك'
        });
      }
    }
    
    // Check code format
    if (formData.account_code !== originalData.account_code) {
      if (!/^\d+$/.test(formData.account_code)) {
        issues.push({
          type: 'warning',
          message: 'يُفضل أن يحتوي رمز الحساب على أرقام فقط',
          suggestion: 'استخدم تسلسل رقمي واضح'
        });
      }
    }
    
    // Check naming consistency
    if (formData.account_name && !formData.account_name_ar) {
      issues.push({
        type: 'info',
        message: 'يُنصح بإضافة اسم عربي للحساب',
        suggestion: 'الأسماء العربية تحسن قراءة التقارير'
      });
    }
    
    setValidationIssues(issues);
  };

  const handleSave = async () => {
    if (!account) return;
    
    // Check for blocking errors
    const errors = validationIssues.filter(issue => issue.type === 'error');
    if (errors.length > 0) {
      toast.error('يجب حل جميع الأخطاء قبل الحفظ');
      return;
    }
    
    try {
      // Clean form data to handle UUID fields properly
      const cleanedFormData = { ...formData };
      
      // Convert empty strings to null for UUID fields
      if (cleanedFormData.parent_account_id === '') {
        cleanedFormData.parent_account_id = null;
      }
      
      // Ensure all required fields have valid values
      const updates = Object.entries(cleanedFormData).reduce((acc, [key, value]) => {
        // Handle UUID fields specially
        if (key === 'parent_account_id' && (value === '' || value === undefined)) {
          acc[key] = null;
        } else if (value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      console.log('🔄 Updating account with cleaned data:', {
        accountId: account.id,
        updates,
        originalFormData: formData
      });
      
      await updateAccount.mutateAsync({
        id: account.id,
        updates
      });
      
      toast.success('تم تعديل الحساب بنجاح');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('حدث خطأ في تعديل الحساب: ' + (error as any)?.message || 'خطأ غير معروف');
    }
  };

  const getDisplayValue = (key: string, value: any): string => {
    if (!value && value !== false) return 'فارغ';
    
    switch (key) {
      case 'parent_account_id':
        if (!value) return 'حساب رئيسي';
        const parentAccount = allAccounts?.find(acc => acc.id === value);
        return parentAccount ? (parentAccount.account_name_ar || parentAccount.account_name || parentAccount.account_code) : 'حساب غير معروف';
      
      case 'account_type':
        const typeLabels: Record<string, string> = {
          'assets': 'الأصول',
          'liabilities': 'الخصوم',
          'equity': 'حقوق الملكية',
          'revenue': 'الإيرادات',
          'expenses': 'المصروفات'
        };
        return typeLabels[value] || value;
      
      case 'balance_type':
        return value === 'debit' ? 'مدين' : value === 'credit' ? 'دائن' : value;
      
      case 'is_header':
        return value ? 'نعم' : 'لا';
      
      case 'is_active':
        return value ? 'نشط' : 'غير نشط';
      
      default:
        return String(value);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto bg-gradient-card shadow-elevated" dir="rtl">
        <DialogHeader className="border-b border-border/50 pb-6">
          <DialogTitle className="arabic-heading-sm text-right flex items-center gap-3 text-foreground">
            <TreePine className="h-6 w-6 text-primary" />
            تعديل الحساب: {account.account_name || account.account_name_ar}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-background/50 p-1 rounded-lg h-12">
            <TabsTrigger 
              value="basic" 
              className="arabic-body-sm flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-smooth"
            >
              <Target className="h-4 w-4" />
              المعلومات الأساسية
            </TabsTrigger>
            <TabsTrigger 
              value="hierarchy" 
              className="arabic-body-sm flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-smooth"
            >
              <TreePine className="h-4 w-4" />
              الهيكل الهرمي
            </TabsTrigger>
            <TabsTrigger 
              value="preview" 
              className="arabic-body-sm flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-smooth"
            >
              <Eye className="h-4 w-4" />
              معاينة التغييرات
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="arabic-heading-sm text-foreground flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    معلومات الحساب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="account_code" className="arabic-body text-foreground font-medium">رمز الحساب</Label>
                    <Input
                      id="account_code"
                      value={formData.account_code}
                      onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                      className="arabic-body text-right border-input-border focus:border-input-focus bg-input/80 backdrop-blur-sm h-11"
                      dir="rtl"
                      placeholder="أدخل رمز الحساب..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="account_name" className="arabic-body text-foreground font-medium">اسم الحساب (إنجليزي)</Label>
                    <Input
                      id="account_name"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      className="arabic-body text-right border-input-border focus:border-input-focus bg-input/80 backdrop-blur-sm h-11"
                      dir="rtl"
                      placeholder="أدخل اسم الحساب بالإنجليزية..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="account_name_ar" className="arabic-body text-foreground font-medium">اسم الحساب (عربي)</Label>
                    <Input
                      id="account_name_ar"
                      value={formData.account_name_ar}
                      onChange={(e) => setFormData({ ...formData, account_name_ar: e.target.value })}
                      className="arabic-body text-right border-input-border focus:border-input-focus bg-input/80 backdrop-blur-sm h-11"
                      dir="rtl"
                      placeholder="أدخل اسم الحساب بالعربية..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description" className="arabic-body text-foreground font-medium">الوصف</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="arabic-body text-right border-input-border focus:border-input-focus bg-input/80 backdrop-blur-sm resize-none"
                      dir="rtl"
                      rows={3}
                      placeholder="أدخل وصفاً للحساب..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="arabic-heading-sm text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    إعدادات الحساب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="arabic-body text-foreground font-medium">نوع الحساب</Label>
                    <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                      <SelectTrigger className="arabic-body text-right border-input-border focus:border-input-focus bg-input/80 backdrop-blur-sm h-11" dir="rtl">
                        <SelectValue placeholder="اختر نوع الحساب" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-elevated">
                        <SelectItem value="assets" className="arabic-body text-right">الأصول</SelectItem>
                        <SelectItem value="liabilities" className="arabic-body text-right">الخصوم</SelectItem>
                        <SelectItem value="equity" className="arabic-body text-right">حقوق الملكية</SelectItem>
                        <SelectItem value="revenue" className="arabic-body text-right">الإيرادات</SelectItem>
                        <SelectItem value="expenses" className="arabic-body text-right">المصروفات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="arabic-body text-foreground font-medium">طبيعة الرصيد</Label>
                    <Select value={formData.balance_type} onValueChange={(value) => setFormData({ ...formData, balance_type: value })}>
                      <SelectTrigger className="arabic-body text-right border-input-border focus:border-input-focus bg-input/80 backdrop-blur-sm h-11" dir="rtl">
                        <SelectValue placeholder="اختر طبيعة الرصيد" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-elevated">
                        <SelectItem value="debit" className="arabic-body text-right">مدين</SelectItem>
                        <SelectItem value="credit" className="arabic-body text-right">دائن</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-accent/20 rounded-lg border border-border/30">
                    <Label htmlFor="is_header" className="arabic-body text-foreground font-medium">حساب رئيسي</Label>
                    <Switch
                      id="is_header"
                      checked={formData.is_header}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_header: checked })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-accent/20 rounded-lg border border-border/30">
                    <Label htmlFor="is_active" className="arabic-body text-foreground font-medium">حساب نشط</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Validation Issues */}
            {validationIssues.length > 0 && (
              <div className="space-y-4">
                <h4 className="arabic-heading-sm text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  التحققات والتنبيهات
                </h4>
                <div className="space-y-3">
                  {validationIssues.map((issue, index) => (
                    <Alert 
                      key={index} 
                      variant={issue.type === 'error' ? 'destructive' : 'default'}
                      className="bg-gradient-card shadow-card border-0"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-right arabic-body">
                        <div className="font-medium">{issue.message}</div>
                        {issue.suggestion && (
                          <div className="arabic-body-sm mt-2 text-muted-foreground bg-accent/10 p-2 rounded-md">
                            💡 {issue.suggestion}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Hierarchy Tab */}
          <TabsContent value="hierarchy" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="arabic-heading-sm text-foreground flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-primary" />
                    اختيار الحساب الأب
                  </CardTitle>
                  <CardDescription className="arabic-body text-muted-foreground">
                    اختر الحساب الذي سيكون أباً لهذا الحساب في الهيكل الهرمي
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SmartParentSelector
                    value={formData.parent_account_id}
                    onValueChange={(value) => setFormData({ ...formData, parent_account_id: value })}
                    currentAccountId={account.id}
                    accountName={formData.account_name_ar || formData.account_name || ''}
                    accountType={formData.account_type}
                  />
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="arabic-heading-sm text-foreground flex items-center gap-2">
                    <Move className="h-5 w-5 text-primary" />
                    عرض تفاعلي للهيكل
                  </CardTitle>
                  <CardDescription className="arabic-body text-muted-foreground">
                    شجرة تفاعلية توضح موقع الحساب في الهيكل العام
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InteractiveAccountTree
                    accounts={allAccounts || []}
                    highlightedAccountId={account.id}
                    selectedParentId={formData.parent_account_id}
                    onParentSelect={(parentId) => setFormData({ ...formData, parent_account_id: parentId })}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6 mt-6">
            <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-smooth border-0">
              <CardHeader className="pb-4">
                <CardTitle className="arabic-heading-sm text-foreground flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  معاينة التغييرات
                </CardTitle>
                <CardDescription className="arabic-body text-muted-foreground">
                  مراجعة جميع التغييرات المقترحة قبل الحفظ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasChanges ? (
                  <div className="space-y-4">
                    {Object.entries(formData).map(([key, value]) => {
                      const originalValue = originalData[key as keyof typeof originalData];
                      if (value !== originalValue) {
                        return (
                          <div key={key} className="flex items-center gap-4 p-4 bg-accent/10 rounded-lg border border-border/30 transition-smooth hover:bg-accent/20">
                            <Badge variant="outline" className="arabic-body-sm bg-primary/10 text-primary border-primary/20">
                              {getFieldLabel(key)}
                            </Badge>
                             <div className="flex items-center gap-3 arabic-body flex-1">
                               <span className="text-muted-foreground bg-background/80 px-3 py-1 rounded-md">
                                 {getDisplayValue(key, originalValue)}
                               </span>
                               <ArrowRight className="h-4 w-4 text-primary" />
                               <span className="font-medium text-foreground bg-primary/10 px-3 py-1 rounded-md">
                                 {getDisplayValue(key, value)}
                               </span>
                             </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="arabic-body text-muted-foreground">لم يتم إجراء أي تغييرات بعد</p>
                    <p className="arabic-body-sm text-muted-foreground/70 mt-2">ابدأ بتعديل المعلومات في التبويبات الأخرى</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-border/50 bg-background/50 -mx-6 -mb-6 px-6 pb-6 mt-8">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="arabic-body-sm flex items-center gap-2 bg-warning/10 text-warning border-warning/20">
                <Move className="h-3 w-3" />
                يوجد تغييرات غير محفوظة
              </Badge>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="arabic-body px-6 h-11 border-border/50 hover:bg-background/80 transition-smooth"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || updateAccount.isPending || validationIssues.some(i => i.type === 'error')}
              className="arabic-body flex items-center gap-2 bg-gradient-primary hover:shadow-glow transition-smooth px-6 h-11"
            >
              <Save className="h-4 w-4" />
              {updateAccount.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const getFieldLabel = (key: string): string => {
  const labels: Record<string, string> = {
    account_code: 'رمز الحساب',
    account_name: 'اسم الحساب',
    account_name_ar: 'الاسم العربي',
    account_type: 'نوع الحساب',
    balance_type: 'طبيعة الرصيد',
    parent_account_id: 'الحساب الأب',
    is_header: 'حساب رئيسي',
    is_active: 'حالة الحساب',
    description: 'الوصف'
  };
  return labels[key] || key;
};