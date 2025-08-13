import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface BalanceHistoryEntry {
  id: string;
  date: string;
  previous_balance: number;
  new_balance: number;
  change_amount: number;
  change_type: 'manual_adjustment' | 'journal_entry' | 'opening_balance';
  reference: string;
  notes?: string;
}

interface AccountBalanceHistoryProps {
  accountId: string;
  currentBalance: number;
  balanceHistory?: BalanceHistoryEntry[];
  accountType: string;
}

export const AccountBalanceHistory: React.FC<AccountBalanceHistoryProps> = ({
  accountId,
  currentBalance,
  balanceHistory = [],
  accountType,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'manual_adjustment':
        return 'تعديل يدوي';
      case 'journal_entry':
        return 'قيد يومية';
      case 'opening_balance':
        return 'رصيد افتتاحي';
      default:
        return 'غير محدد';
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'manual_adjustment':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'journal_entry':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'opening_balance':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isPositiveChange = (amount: number) => amount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          محفوظات الرصيد
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance Summary */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">الرصيد الحالي</h3>
              <p className="text-2xl font-bold font-mono text-primary">
                {formatCurrency(Math.abs(currentBalance))}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentBalance >= 0 ? 'رصيد مدين' : 'رصيد دائن'}
              </p>
            </div>
            <div className="text-primary">
              {currentBalance > 0 ? (
                <TrendingUp className="h-8 w-8" />
              ) : currentBalance < 0 ? (
                <TrendingDown className="h-8 w-8" />
              ) : (
                <Activity className="h-8 w-8" />
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Balance History */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            سجل التغييرات
          </h3>
          
          {balanceHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد تغييرات على الرصيد بعد</p>
              <p className="text-sm">ستظهر هنا جميع التغييرات المستقبلية على رصيد الحساب</p>
            </div>
          ) : (
            <div className="space-y-2">
              {balanceHistory.map((entry, index) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getChangeTypeColor(entry.change_type))}
                        >
                          {getChangeTypeLabel(entry.change_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span>من:</span>
                          <span className="font-mono">
                            {formatCurrency(Math.abs(entry.previous_balance))}
                          </span>
                          <span>→</span>
                          <span className="font-mono font-medium">
                            {formatCurrency(Math.abs(entry.new_balance))}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">التغيير:</span>
                          <span className={cn(
                            "text-sm font-medium font-mono",
                            isPositiveChange(entry.change_amount) ? "text-success" : "text-destructive"
                          )}>
                            {isPositiveChange(entry.change_amount) ? '+' : ''}
                            {formatCurrency(entry.change_amount)}
                          </span>
                        </div>
                        
                        {entry.reference && (
                          <div className="text-xs text-muted-foreground">
                            المرجع: {entry.reference}
                          </div>
                        )}
                        
                        {entry.notes && (
                          <div className="text-xs text-muted-foreground">
                            ملاحظات: {entry.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {isPositiveChange(entry.change_amount) ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics */}
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="font-medium">عدد التغييرات</div>
            <div className="text-lg font-bold text-primary">{balanceHistory.length}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="font-medium">آخر تحديث</div>
            <div className="text-sm text-muted-foreground">
              {balanceHistory.length > 0 
                ? new Date(balanceHistory[0].date).toLocaleDateString('en-GB')
                : 'لم يتم التحديث'
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};