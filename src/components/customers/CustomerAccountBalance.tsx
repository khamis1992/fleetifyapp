import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertCircle, CreditCard } from 'lucide-react';
import { CustomerAccount } from '@/types/customerAccount';

// Utility function to format currency
const formatCurrency = (amount: number, currency: string = 'KWD') => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
};

interface CustomerAccountBalanceProps {
  accounts: CustomerAccount[];
}

export const CustomerAccountBalance: React.FC<CustomerAccountBalanceProps> = ({ accounts }) => {
  const activeAccounts = accounts.filter(account => account.is_active);
  
  const totalBalance = activeAccounts.reduce((sum, account) => 
    sum + (account.account?.current_balance || 0), 0
  );
  
  const totalCreditLimit = activeAccounts.reduce((sum, account) => 
    sum + (account.credit_limit || 0), 0
  );

  const creditUtilization = totalCreditLimit > 0 
    ? Math.abs(Math.min(totalBalance, 0)) / totalCreditLimit * 100 
    : 0;

  const getBalanceStatus = (balance: number, creditLimit?: number) => {
    if (balance > 0) return { status: 'debtor', color: 'destructive', icon: TrendingDown };
    if (balance < 0 && creditLimit && Math.abs(balance) > creditLimit * 0.8) {
      return { status: 'near_limit', color: 'warning', icon: AlertCircle };
    }
    if (balance < 0) return { status: 'creditor', color: 'default', icon: TrendingUp };
    return { status: 'balanced', color: 'secondary', icon: CreditCard };
  };

  const overallStatus = getBalanceStatus(totalBalance, totalCreditLimit);

  if (activeAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            أرصدة الحسابات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            لا توجد حسابات نشطة
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          أرصدة الحسابات ({activeAccounts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">إجمالي الرصيد</div>
                  <div className={`text-2xl font-bold ${
                    totalBalance >= 0 ? 'text-destructive' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.abs(totalBalance))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {totalBalance >= 0 ? 'مدين للشركة' : 'دائن من الشركة'}
                  </div>
                </div>
                <overallStatus.icon className={`h-8 w-8 ${
                  overallStatus.color === 'destructive' ? 'text-destructive' :
                  overallStatus.color === 'warning' ? 'text-yellow-500' :
                  overallStatus.color === 'default' ? 'text-green-600' :
                  'text-muted-foreground'
                }`} />
              </div>
            </CardContent>
          </Card>

          {totalCreditLimit > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>استخدام حد الائتمان</span>
                    <span>{creditUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={creditUtilization} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(Math.abs(Math.min(totalBalance, 0)))} من {formatCurrency(totalCreditLimit)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Individual Account Balances */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">تفاصيل الحسابات</h4>
          {activeAccounts.map((account) => {
            const balance = account.account?.current_balance || 0;
            const accountStatus = getBalanceStatus(balance, account.credit_limit);
            
            return (
              <div 
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {account.account?.account_code} - {account.account?.account_name}
                    </div>
                    {account.is_default && (
                      <Badge variant="outline" className="text-xs">افتراضي</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {account.account_type?.type_name_ar} • {account.currency}
                  </div>
                  {account.account_purpose && (
                    <div className="text-xs text-muted-foreground">
                      {account.account_purpose}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    balance >= 0 ? 'text-destructive' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.abs(balance), account.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {balance >= 0 ? 'مدين' : 'دائن'}
                  </div>
                  {account.credit_limit && (
                    <div className="text-xs text-muted-foreground">
                      حد ائتمان: {formatCurrency(account.credit_limit, account.currency)}
                    </div>
                  )}
                </div>

                <accountStatus.icon className={`h-5 w-5 ml-3 ${
                  accountStatus.color === 'destructive' ? 'text-destructive' :
                  accountStatus.color === 'warning' ? 'text-yellow-500' :
                  accountStatus.color === 'default' ? 'text-green-600' :
                  'text-muted-foreground'
                }`} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};