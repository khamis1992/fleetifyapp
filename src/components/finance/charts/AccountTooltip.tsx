import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  User, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Clock,
  Info
} from 'lucide-react';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface AccountTooltipProps {
  account: ChartOfAccount;
  parentAccount?: ChartOfAccount;
  childrenCount: number;
  accountPath: string[];
}

export const AccountTooltip: React.FC<AccountTooltipProps> = ({
  account,
  parentAccount,
  childrenCount,
  accountPath
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  
  const getAccountTypeColor = (type: string) => {
    const colors = {
      assets: 'text-blue-600 bg-blue-50',
      liabilities: 'text-red-600 bg-red-50',
      equity: 'text-purple-600 bg-purple-50',
      revenue: 'text-green-600 bg-green-50',
      expenses: 'text-orange-600 bg-orange-50',
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };
  
  const getAccountTypeLabel = (type: string) => {
    const labels = {
      assets: 'أصول',
      liabilities: 'خصوم',
      equity: 'حقوق ملكية',
      revenue: 'إيرادات',
      expenses: 'مصروفات',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Card className="w-80 shadow-lg border-2">
      <CardContent className="p-4 space-y-3" dir="rtl">
        {/* Account Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm leading-tight">
                {account.account_name_ar || account.account_name}
              </div>
              {account.account_name_ar && (
                <div className="text-xs text-muted-foreground mt-1">
                  {account.account_name}
                </div>
              )}
            </div>
            <Badge variant="outline" className="font-mono text-xs ml-2">
              {account.account_code}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={`text-xs ${getAccountTypeColor(account.account_type)}`}
            >
              {getAccountTypeLabel(account.account_type)}
            </Badge>
            
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Layers className="h-3 w-3" />
              مستوى {account.account_level}
            </Badge>
            
            {account.is_system && (
              <Badge variant="outline" className="text-xs">
                نظامي
              </Badge>
            )}
            
            {!account.is_active && (
              <Badge variant="secondary" className="text-xs">
                غير نشط
              </Badge>
            )}
            
            {account.is_header && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" />
                رئيسي
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Account Path */}
        {accountPath.length > 1 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              المسار الهرمي
            </div>
            <div className="text-xs bg-muted/50 rounded p-2">
              {accountPath.join(' ← ')}
            </div>
          </div>
        )}

        {/* Parent Account */}
        {parentAccount && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              الحساب الرئيسي
            </div>
            <div className="text-xs bg-muted/50 rounded p-2 flex items-center gap-2">
              <span className="font-mono">{parentAccount.account_code}</span>
              <span>{parentAccount.account_name_ar || parentAccount.account_name}</span>
            </div>
          </div>
        )}

        {/* Children Count */}
        {childrenCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">الحسابات الفرعية:</span>
            <Badge variant="secondary">{childrenCount}</Badge>
          </div>
        )}

        {/* Balance Information */}
        {!account.is_header && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                معلومات الرصيد
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">الرصيد الحالي</span>
                <div className="flex items-center gap-1">
                  {account.current_balance > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : account.current_balance < 0 ? (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                  )}
                  <span className={`font-mono text-xs ${
                    account.current_balance > 0 ? 'text-green-600' : 
                    account.current_balance < 0 ? 'text-red-600' : 
                    'text-muted-foreground'
                  }`}>
                    {formatCurrency(account.current_balance)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs">نوع الرصيد</span>
                <Badge variant="outline" className="text-xs">
                  {account.account_type === 'assets' || account.account_type === 'expenses' ? 'مدين' : 'دائن'}
                </Badge>
              </div>
            </div>
          </>
        )}

        {/* Timestamps */}
        <Separator />
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>تاريخ الإنشاء</span>
            </div>
            <span className="font-mono">
              {new Date(account.created_at).toLocaleDateString('ar')}
            </span>
          </div>
          
          {account.updated_at && account.updated_at !== account.created_at && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>آخر تحديث</span>
              </div>
              <span className="font-mono">
                {new Date(account.updated_at).toLocaleDateString('ar')}
              </span>
            </div>
          )}
        </div>

        {/* Usage Hint */}
        <div className="bg-primary/5 border border-primary/20 rounded p-2">
          <div className="text-xs text-primary">
            💡 اسحب هذا الحساب لنقله إلى حساب رئيسي آخر
          </div>
        </div>
      </CardContent>
    </Card>
  );
};