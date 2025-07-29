import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Building, TrendingUp, PieChart, DollarSign, Calculator, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';

interface AccountFormData {
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  account_subtype?: string;
  balance_type: string;
  parent_account_id?: string;
  is_header: boolean;
  description?: string;
}

interface EnhancedAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountFormData) => void;
  accounts: ChartOfAccount[];
  editingAccount?: ChartOfAccount | null;
  isLoading?: boolean;
}

const getAccountTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'assets':
    case 'الأصول':
      return Building;
    case 'liabilities':
    case 'الخصوم':
      return TrendingUp;
    case 'equity':
    case 'حقوق الملكية':
      return PieChart;
    case 'revenue':
    case 'الإيرادات':
      return DollarSign;
    case 'expenses':
    case 'المصروفات':
      return Calculator;
    default:
      return Building;
  }
};

const getAccountTypeDescription = (type: string) => {
  const descriptions = {
    'assets': 'الموارد التي تملكها المؤسسة والتي لها قيمة اقتصادية',
    'liabilities': 'الالتزامات المالية والديون المستحقة على المؤسسة',
    'equity': 'حقوق أصحاب المؤسسة في أصولها بعد طرح الخصوم',
    'revenue': 'الإيرادات والدخل المحقق من أنشطة المؤسسة',
    'expenses': 'التكاليف والمصروفات المتكبدة لتحقيق الإيرادات'
  };
  return descriptions[type.toLowerCase() as keyof typeof descriptions] || '';
};

export const EnhancedAccountForm: React.FC<EnhancedAccountFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  accounts,
  editingAccount,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<AccountFormData>({
    account_code: '',
    account_name: '',
    account_name_ar: '',
    account_type: '',
    balance_type: '',
    parent_account_id: '',
    is_header: false,
    description: '',
  });

  // Reset form when dialog opens/closes or editing account changes
  React.useEffect(() => {
    if (editingAccount) {
      setFormData({
        account_code: editingAccount.account_code,
        account_name: editingAccount.account_name,
        account_name_ar: editingAccount.account_name_ar || '',
        account_type: editingAccount.account_type,
        balance_type: editingAccount.balance_type,
        parent_account_id: editingAccount.parent_account_id || '',
        is_header: editingAccount.is_header || false,
        description: editingAccount.description || '',
      });
    } else {
      setFormData({
        account_code: '',
        account_name: '',
        account_name_ar: '',
        account_type: '',
        balance_type: '',
        parent_account_id: '',
        is_header: false,
        description: '',
      });
    }
  }, [editingAccount, open]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!formData.account_code) errors.push('رمز الحساب مطلوب');
    if (!formData.account_name) errors.push('اسم الحساب مطلوب');
    if (!formData.account_type) errors.push('نوع الحساب مطلوب');
    if (!formData.balance_type) errors.push('نوع الرصيد مطلوب');
    
    // Check for duplicate account code
    const duplicateCode = accounts.some(acc => 
      acc.account_code === formData.account_code && 
      acc.id !== editingAccount?.id
    );
    if (duplicateCode) errors.push('رمز الحساب موجود مسبقاً');
    
    return errors;
  }, [formData, accounts, editingAccount]);

  const availableParentAccounts = useMemo(() => {
    return accounts.filter(acc => 
      acc.is_header && 
      acc.account_type === formData.account_type &&
      acc.id !== editingAccount?.id
    );
  }, [accounts, formData.account_type, editingAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationErrors.length === 0) {
      onSubmit(formData);
    }
  };

  const TypeIcon = getAccountTypeIcon(formData.account_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingAccount ? 'تعديل حساب' : 'إضافة حساب جديد'}
            {formData.account_type && <TypeIcon className="h-5 w-5" />}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-medium">المعلومات الأساسية</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_code">رمز الحساب *</Label>
                  <Input
                    id="account_code"
                    value={formData.account_code}
                    onChange={(e) => setFormData({...formData, account_code: e.target.value})}
                    placeholder="مثال: 1001"
                    className="font-mono"
                  />
                </div>
                
                <div>
                  <Label htmlFor="account_name">اسم الحساب *</Label>
                  <Input
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                    placeholder="مثال: النقد في الصندوق"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="account_name_ar">اسم الحساب بالعربية</Label>
                  <Input
                    id="account_name_ar"
                    value={formData.account_name_ar}
                    onChange={(e) => setFormData({...formData, account_name_ar: e.target.value})}
                    placeholder="الاسم العربي للحساب (اختياري)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Classification */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Building className="h-4 w-4 text-primary" />
                <span className="font-medium">تصنيف الحساب</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_type">نوع الحساب *</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value) => setFormData({...formData, account_type: value, parent_account_id: ''})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assets">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          الأصول
                        </div>
                      </SelectItem>
                      <SelectItem value="liabilities">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          الخصوم
                        </div>
                      </SelectItem>
                      <SelectItem value="equity">
                        <div className="flex items-center gap-2">
                          <PieChart className="h-4 w-4" />
                          حقوق الملكية
                        </div>
                      </SelectItem>
                      <SelectItem value="revenue">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          الإيرادات
                        </div>
                      </SelectItem>
                      <SelectItem value="expenses">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          المصروفات
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.account_type && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getAccountTypeDescription(formData.account_type)}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="balance_type">نوع الرصيد *</Label>
                  <Select
                    value={formData.balance_type}
                    onValueChange={(value) => setFormData({...formData, balance_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الرصيد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">مدين</SelectItem>
                      <SelectItem value="credit">دائن</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hierarchy & Settings */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="font-medium">التسلسل الهرمي والإعدادات</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="parent_account">الحساب الأب</Label>
                  <Select
                    value={formData.parent_account_id}
                    onValueChange={(value) => setFormData({...formData, parent_account_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحساب الأب (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون حساب أب</SelectItem>
                      {availableParentAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableParentAccounts.length === 0 && formData.account_type && (
                    <p className="text-xs text-muted-foreground mt-1">
                      لا توجد حسابات إجمالية متاحة من نفس النوع
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_header"
                      checked={formData.is_header}
                      onCheckedChange={(checked) => setFormData({...formData, is_header: checked})}
                    />
                    <div>
                      <Label htmlFor="is_header" className="font-medium">حساب إجمالي</Label>
                      <p className="text-xs text-muted-foreground">
                        الحسابات الإجمالية تستخدم للتقارير فقط ولا يمكن إدخال قيود عليها
                      </p>
                    </div>
                  </div>
                  {formData.is_header && (
                    <Badge variant="secondary">إجمالي</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardContent className="pt-4">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="وصف اختياري للحساب..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <Separator />
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={validationErrors.length > 0 || isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? 'جاري الحفظ...' : editingAccount ? 'تحديث' : 'حفظ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};