import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Clock, Activity } from 'lucide-react';

interface AccountChange {
  id: string;
  change_type: 'balance' | 'info' | 'status';
  old_value: any;
  new_value: any;
  field_name: string;
  changed_by: string;
  changed_at: string;
  description: string;
}

interface AccountChangeHistoryProps {
  account: any;
  changes?: AccountChange[];
}

export const AccountChangeHistory: React.FC<AccountChangeHistoryProps> = ({ 
  account, 
  changes = [] 
}) => {
  const formatValue = (value: unknown, fieldName: string) => {
    if (fieldName === 'current_balance' || fieldName === 'balance') {
      return `${Number(value || 0).toFixed(3)} د.ك`;
    }
    if (fieldName === 'is_active') {
      return value ? 'نشط' : 'غير نشط';
    }
    if (fieldName === 'balance_type') {
      return value === 'debit' ? 'مدين' : 'دائن';
    }
    return value || '-';
  };

  const getChangeTypeLabel = (type: string) => {
    const types = {
      balance: 'تغيير الرصيد',
      info: 'تعديل البيانات',
      status: 'تغيير الحالة'
    };
    return types[type as keyof typeof types] || type;
  };

  const getChangeTypeColor = (type: string) => {
    const colors = {
      balance: 'default',
      info: 'secondary',
      status: 'outline'
    };
    return colors[type as keyof typeof colors] || 'outline';
  };

  const getFieldNameLabel = (fieldName: string) => {
    const labels = {
      current_balance: 'الرصيد الحالي',
      account_name: 'اسم الحساب',
      account_code: 'رمز الحساب',
      is_active: 'حالة النشاط',
      balance_type: 'طبيعة الرصيد',
      description: 'الوصف'
    };
    return labels[fieldName as keyof typeof labels] || fieldName;
  };

  const lastUpdate = changes.length > 0 
    ? new Date(changes[0].changed_at).toLocaleDateString('en-GB')
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            محفوظات الرصيد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                <p className="text-2xl font-bold text-primary">
                  {formatValue(account?.current_balance, 'current_balance')}
                </p>
                <p className="text-xs text-muted-foreground">رصيد مدين</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <Clock className="h-4 w-4" />
              سجل التغييرات
            </h3>
            
            {changes.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">لا توجد تغييرات على الرصيد بعد</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ستظهر هنا جميع التغييرات المستقبلية على رصيد الحساب
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {changes.map((change, index) => (
                  <div key={change.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getChangeTypeColor(change.change_type) as any}>
                          {getChangeTypeLabel(change.change_type)}
                        </Badge>
                        <span className="text-sm font-medium">
                          {getFieldNameLabel(change.field_name)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(change.changed_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">القيمة السابقة:</p>
                        <p className="font-medium">
                          {formatValue(change.old_value, change.field_name)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">القيمة الجديدة:</p>
                        <p className="font-medium">
                          {formatValue(change.new_value, change.field_name)}
                        </p>
                      </div>
                    </div>
                    
                    {change.description && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {change.description}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      بواسطة: {change.changed_by}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">عدد التغييرات</p>
              <p className="text-xl font-bold text-primary">{changes.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">آخر تحديث</p>
              <p className="text-sm font-medium">
                {lastUpdate || 'لم يتم التحديث'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};