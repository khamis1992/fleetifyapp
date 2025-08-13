import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2, Building, CreditCard, TrendingDown, Star, AlertCircle } from 'lucide-react';
import { VendorAccountSelector } from './VendorAccountSelector';
import { useVendorAccountsByVendor, useCreateVendorAccount, useUpdateVendorAccount, useDeleteVendorAccount, useCreateVendorFinancialAccount, VendorAccount } from '@/hooks/useVendorAccounts';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

interface VendorAccountManagerProps {
  vendorId: string;
  vendorName: string;
  showCreateNewOption?: boolean;
}

const getAccountTypeIcon = (accountType: 'payable' | 'expense' | 'advance') => {
  switch (accountType) {
    case 'payable':
      return <CreditCard className="h-4 w-4 text-orange-500" />;
    case 'expense':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'advance':
      return <Building className="h-4 w-4 text-blue-500" />;
  }
};

const getAccountTypeLabel = (accountType: 'payable' | 'expense' | 'advance') => {
  switch (accountType) {
    case 'payable':
      return 'حساب دائن';
    case 'expense':
      return 'حساب مصاريف';
    case 'advance':
      return 'دفعات مقدمة';
  }
};

const getAccountTypeBadge = (accountType: 'payable' | 'expense' | 'advance') => {
  switch (accountType) {
    case 'payable':
      return <Badge className="bg-orange-100 text-orange-700">دائن</Badge>;
    case 'expense':
      return <Badge className="bg-red-100 text-red-700">مصاريف</Badge>;
    case 'advance':
      return <Badge className="bg-blue-100 text-blue-700">مقدم</Badge>;
  }
};

export const VendorAccountManager: React.FC<VendorAccountManagerProps> = ({
  vendorId,
  vendorName,
  showCreateNewOption = true,
}) => {
  const { companyId } = useUnifiedCompanyAccess();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAccountId, setNewAccountId] = useState<string>('');
  const [newAccountType, setNewAccountType] = useState<'payable' | 'expense' | 'advance'>('payable');
  const [newIsDefault, setNewIsDefault] = useState(false);

  const { data: vendorAccounts, isLoading } = useVendorAccountsByVendor(vendorId);
  const createVendorAccount = useCreateVendorAccount();
  const updateVendorAccount = useUpdateVendorAccount();
  const deleteVendorAccount = useDeleteVendorAccount();
  const createVendorFinancialAccount = useCreateVendorFinancialAccount();

  const handleAddAccount = async () => {
    if (!newAccountId) {
      toast.error('يرجى اختيار حساب محاسبي');
      return;
    }

    try {
      await createVendorAccount.mutateAsync({
        vendor_id: vendorId,
        account_id: newAccountId,
        account_type: newAccountType,
        is_default: newIsDefault,
      });

      setIsAddingNew(false);
      setNewAccountId('');
      setNewAccountType('payable');
      setNewIsDefault(false);
    } catch (error) {
      console.error('Error adding vendor account:', error);
    }
  };

  const handleCreateNewAccount = async () => {
    if (!companyId) {
      toast.error('معرف الشركة مطلوب');
      return;
    }

    try {
      await createVendorFinancialAccount.mutateAsync({
        vendorId,
        companyId,
        vendorData: { vendor_name: vendorName }
      });
      
      toast.success('تم إنشاء حساب محاسبي جديد للمورد بنجاح');
    } catch (error) {
      console.error('Error creating vendor financial account:', error);
    }
  };

  const handleToggleDefault = async (accountId: string, isDefault: boolean) => {
    try {
      await updateVendorAccount.mutateAsync({
        id: accountId,
        data: { is_default: !isDefault }
      });
    } catch (error) {
      console.error('Error updating default status:', error);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteVendorAccount.mutateAsync(accountId);
    } catch (error) {
      console.error('Error deleting vendor account:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          الحسابات المحاسبية المرتبطة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Accounts */}
        {vendorAccounts && vendorAccounts.length > 0 ? (
          <div className="space-y-3">
            {vendorAccounts.map((vendorAccount) => (
              <div key={vendorAccount.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getAccountTypeIcon(vendorAccount.account_type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {vendorAccount.account?.account_code} - {vendorAccount.account?.account_name}
                      </span>
                      {vendorAccount.is_default && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    {vendorAccount.account?.account_name_ar && (
                      <p className="text-sm text-muted-foreground">
                        {vendorAccount.account.account_name_ar}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {getAccountTypeBadge(vendorAccount.account_type)}
                      {vendorAccount.account?.current_balance !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          الرصيد: {vendorAccount.account.current_balance.toFixed(3)} د.ك
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleDefault(vendorAccount.id, vendorAccount.is_default)}
                    disabled={updateVendorAccount.isPending}
                  >
                    {vendorAccount.is_default ? 'إلغاء افتراضي' : 'تعيين افتراضي'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteVendorAccount.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف ربط هذا الحساب؟ لن يؤثر هذا على الحساب المحاسبي نفسه.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAccount(vendorAccount.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>لا توجد حسابات محاسبية مرتبطة بهذا المورد</p>
          </div>
        )}

        <Separator />

        {/* Add New Account Section */}
        {!isAddingNew ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddingNew(true)}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              ربط حساب موجود
            </Button>
            {showCreateNewOption && (
              <Button
                onClick={handleCreateNewAccount}
                disabled={createVendorFinancialAccount.isPending}
                className="flex-1"
              >
                {createVendorFinancialAccount.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                إنشاء حساب جديد
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="account-type">نوع الحساب</Label>
              <Select
                value={newAccountType}
                onValueChange={(value: 'payable' | 'expense' | 'advance') => setNewAccountType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payable">حساب دائن (الموردين)</SelectItem>
                  <SelectItem value="expense">حساب مصاريف</SelectItem>
                  <SelectItem value="advance">دفعات مقدمة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="account-select">الحساب المحاسبي</Label>
              <VendorAccountSelector
                value={newAccountId}
                onValueChange={setNewAccountId}
                accountType={newAccountType}
                placeholder="اختر الحساب المحاسبي"
              />
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="is-default"
                checked={newIsDefault}
                onCheckedChange={setNewIsDefault}
              />
              <Label htmlFor="is-default">تعيين كحساب افتراضي</Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddAccount}
                disabled={createVendorAccount.isPending || !newAccountId}
                className="flex-1"
              >
                {createVendorAccount.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  'إضافة الربط'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewAccountId('');
                  setNewAccountType('payable');
                  setNewIsDefault(false);
                }}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
