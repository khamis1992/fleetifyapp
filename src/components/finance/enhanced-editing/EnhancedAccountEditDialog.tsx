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
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
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
      
      // Generate AI suggestions
      generateAISuggestions(account);
    }
  }, [account]);

  // Validate changes when form data changes
  useEffect(() => {
    if (account) {
      validateChanges();
    }
  }, [formData, account]);

  const generateAISuggestions = (acc: ChartOfAccount) => {
    const suggestions: string[] = [];
    
    if (!acc.account_name_ar) {
      suggestions.push('يُنصح بإضافة اسم عربي للحساب لتحسين الفهم والتقارير');
    }
    
    if (acc.account_level && acc.account_level > 3 && acc.is_header) {
      suggestions.push('الحسابات في المستوى 4 وما فوق عادة لا تكون حسابات رئيسية');
    }
    
    if (!acc.description) {
      suggestions.push('إضافة وصف مختصر يساعد في فهم الغرض من الحساب');
    }
    
    setAiSuggestions(suggestions);
  };

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
      await updateAccount.mutateAsync({
        id: account.id,
        updates: formData
      });
      
      toast.success('تم تعديل الحساب بنجاح');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('حدث خطأ في تعديل الحساب');
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-3">
            <TreePine className="h-5 w-5" />
            تعديل الحساب: {account.account_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              المعلومات الأساسية
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              الهيكل الهرمي
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              معاينة التغييرات
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              الاقتراحات الذكية
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">معلومات الحساب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="account_code">رمز الحساب</Label>
                    <Input
                      id="account_code"
                      value={formData.account_code}
                      onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="account_name">اسم الحساب (إنجليزي)</Label>
                    <Input
                      id="account_name"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="account_name_ar">اسم الحساب (عربي)</Label>
                    <Input
                      id="account_name_ar"
                      value={formData.account_name_ar}
                      onChange={(e) => setFormData({ ...formData, account_name_ar: e.target.value })}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="text-right"
                      dir="rtl"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">إعدادات الحساب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>نوع الحساب</Label>
                    <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assets">الأصول</SelectItem>
                        <SelectItem value="liabilities">الخصوم</SelectItem>
                        <SelectItem value="equity">حقوق الملكية</SelectItem>
                        <SelectItem value="revenue">الإيرادات</SelectItem>
                        <SelectItem value="expenses">المصروفات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>طبيعة الرصيد</Label>
                    <Select value={formData.balance_type} onValueChange={(value) => setFormData({ ...formData, balance_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">مدين</SelectItem>
                        <SelectItem value="credit">دائن</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_header">حساب رئيسي</Label>
                    <Switch
                      id="is_header"
                      checked={formData.is_header}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_header: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">حساب نشط</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Validation Issues */}
            {validationIssues.length > 0 && (
              <div className="space-y-3">
                {validationIssues.map((issue, index) => (
                  <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-right">
                      <div className="font-medium">{issue.message}</div>
                      {issue.suggestion && (
                        <div className="text-sm mt-1 text-muted-foreground">{issue.suggestion}</div>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Hierarchy Tab */}
          <TabsContent value="hierarchy" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">اختيار الحساب الأب</CardTitle>
                  <CardDescription>
                    اختر الحساب الذي سيكون أباً لهذا الحساب في الهيكل الهرمي
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SmartParentSelector
                    value={formData.parent_account_id}
                    onValueChange={(value) => setFormData({ ...formData, parent_account_id: value })}
                    currentAccountId={account.id}
                    accountType={formData.account_type}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">عرض تفاعلي للهيكل</CardTitle>
                  <CardDescription>
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
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  معاينة التغييرات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasChanges ? (
                  <div className="space-y-4">
                    {Object.entries(formData).map(([key, value]) => {
                      const originalValue = originalData[key as keyof typeof originalData];
                      if (value !== originalValue) {
                        return (
                          <div key={key} className="flex items-center gap-4 p-3 bg-accent/50 rounded-lg">
                            <Badge variant="outline">{getFieldLabel(key)}</Badge>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">{String(originalValue) || 'فارغ'}</span>
                              <ArrowRight className="h-4 w-4" />
                              <span className="font-medium">{String(value) || 'فارغ'}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لم يتم إجراء أي تغييرات بعد
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Suggestions Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  الاقتراحات الذكية
                </CardTitle>
                <CardDescription>
                  اقتراحات لتحسين إعداد الحساب وموقعه في الهيكل
                </CardDescription>
              </CardHeader>
              <CardContent>
                {aiSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    {aiSuggestions.map((suggestion, index) => (
                      <Alert key={index}>
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription className="text-right">
                          {suggestion}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد اقتراحات في الوقت الحالي
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Move className="h-3 w-3" />
                يوجد تغييرات غير محفوظة
              </Badge>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || updateAccount.isPending || validationIssues.some(i => i.type === 'error')}
              className="flex items-center gap-2"
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