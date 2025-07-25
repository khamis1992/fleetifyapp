import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ChartOfAccount } from '@/hooks/useFinance';

interface AccountDetailsDialogProps {
  account: ChartOfAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountDetailsDialog: React.FC<AccountDetailsDialogProps> = ({
  account,
  open,
  onOpenChange,
}) => {
  if (!account) return null;

  const getAccountTypeColor = (type: string): string => {
    switch (type) {
      case 'assets':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'liabilities':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'equity':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'revenue':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expenses':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAccountTypeLabel = (type: string): string => {
    switch (type) {
      case 'assets':
        return 'أصول';
      case 'liabilities':
        return 'خصوم';
      case 'equity':
        return 'حقوق ملكية';
      case 'revenue':
        return 'إيرادات';
      case 'expenses':
        return 'مصروفات';
      default:
        return type;
    }
  };

  const formatBalance = (balance: number, balanceType: string) => {
    const formattedBalance = Math.abs(balance).toLocaleString('ar-KW', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
    
    const isNormalBalance = 
      (['assets', 'expenses'].includes(balanceType) && balance >= 0) ||
      (['liabilities', 'equity', 'revenue'].includes(balanceType) && balance < 0);
    
    return (
      <span className={cn(
        "font-mono text-lg",
        isNormalBalance ? "text-success" : "text-destructive"
      )}>
        {formattedBalance} د.ك
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>تفاصيل الحساب</span>
            <Badge variant={account.is_active ? 'default' : 'secondary'}>
              {account.is_active ? 'نشط' : 'غير نشط'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">كود الحساب</label>
                <p className="text-lg font-mono">{account.account_code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">المستوى</label>
                <p className="text-lg">{account.account_level}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">اسم الحساب</label>
              <p className="text-lg font-medium">{account.account_name}</p>
              {account.account_name_ar && (
                <p className="text-sm text-muted-foreground">{account.account_name_ar}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Account Classification */}
          <div className="space-y-4">
            <h3 className="font-medium">التصنيف المحاسبي</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">نوع الحساب</label>
                <div className="mt-1">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getAccountTypeColor(account.account_type))}
                  >
                    {getAccountTypeLabel(account.account_type)}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">طبيعة الرصيد</label>
                <div className="mt-1">
                  <Badge variant={account.balance_type === 'debit' ? 'secondary' : 'default'}>
                    {account.balance_type === 'debit' ? 'مدين' : 'دائن'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {account.account_subtype && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">النوع الفرعي</label>
                <p className="text-sm">{account.account_subtype}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="font-medium">المعلومات المالية</h3>
            {!account.is_header && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">الرصيد الحالي</label>
                <div className="mt-1">
                  {formatBalance(account.current_balance, account.account_type)}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Account Properties */}
          <div className="space-y-4">
            <h3 className="font-medium">خصائص الحساب</h3>
            <div className="flex flex-wrap gap-2">
              {account.is_header && (
                <Badge variant="outline">حساب رئيسي</Badge>
              )}
              {account.is_system && (
                <Badge variant="outline">حساب نظام</Badge>
              )}
              {account.is_default && (
                <Badge variant="outline">حساب افتراضي</Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {account.description && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">الوصف</label>
                <p className="text-sm mt-1">{account.description}</p>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <label>تاريخ الإنشاء</label>
              <p>{new Date(account.created_at).toLocaleDateString('ar-KW')}</p>
            </div>
            <div>
              <label>آخر تحديث</label>
              <p>{new Date(account.updated_at).toLocaleDateString('ar-KW')}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};