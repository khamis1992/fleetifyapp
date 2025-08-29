import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomerFinancialSummary } from '@/hooks/useCustomerFinancialBalances';
import { useRecalculateCustomerBalance } from '@/hooks/useCustomerFinancialBalances';
// Utility function for currency formatting
const formatCurrency = (amount: number) => `${amount.toFixed(3)} د.ك`;
import { Calendar, CreditCard, Clock, AlertTriangle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CustomerFinancialDashboardProps {
  customerId: string;
}

export const CustomerFinancialDashboard: React.FC<CustomerFinancialDashboardProps> = ({
  customerId
}) => {
  const { data: summary, isLoading } = useCustomerFinancialSummary(customerId);
  const recalculateBalance = useRecalculateCustomerBalance();

  const handleRecalculate = () => {
    recalculateBalance.mutate({ customerId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { total_balance, contracts_balances, recent_obligations, payment_history_summary } = summary;

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      partial: 'secondary',
      paid: 'default',
      overdue: 'destructive',
      cancelled: 'outline',
    } as const;

    const labels = {
      pending: 'معلق',
      partial: 'جزئي',
      paid: 'مدفوع',
      overdue: 'متأخر',
      cancelled: 'ملغي',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    const variants = {
      1: 'destructive',
      2: 'secondary',
      3: 'outline',
    } as const;

    const labels = {
      1: 'عالي',
      2: 'متوسط',
      3: 'منخفض',
    };

    return (
      <Badge variant={variants[priority as keyof typeof variants]}>
        {labels[priority as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with customer name and recalculate button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{summary.customer_name}</h2>
          <p className="text-muted-foreground">
            {summary.customer_type === 'individual' ? 'عميل فردي' : 'شركة'}
          </p>
        </div>
        <Button 
          onClick={handleRecalculate} 
          disabled={recalculateBalance.isPending}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculateBalance.isPending ? 'animate-spin' : ''}`} />
          إعادة حساب الرصيد
        </Button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرصيد</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(total_balance?.remaining_balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              من أصل {formatCurrency(total_balance?.total_obligations || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبلغ المتأخر</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(total_balance?.overdue_amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {total_balance?.days_overdue || 0} يوم تأخير
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستحق حالياً</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(total_balance?.current_amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              مستحق اليوم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">آخر دفعة</CardTitle>
            <Calendar className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(payment_history_summary.last_payment_amount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payment_history_summary.last_payment_date ? 
                format(new Date(payment_history_summary.last_payment_date), 'dd/MM/yyyy', { locale: ar }) :
                'لا توجد دفعات'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis */}
      {total_balance && (
        <Card>
          <CardHeader>
            <CardTitle>تحليل الشيخوخة</CardTitle>
            <CardDescription>توزيع المستحقات حسب فترات التأخير</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">
                  {formatCurrency(total_balance.current_amount)}
                </div>
                <p className="text-xs text-muted-foreground">حالي</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-warning">
                  {formatCurrency(total_balance.aging_30_days)}
                </div>
                <p className="text-xs text-muted-foreground">1-30 يوم</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-warning">
                  {formatCurrency(total_balance.aging_60_days)}
                </div>
                <p className="text-xs text-muted-foreground">31-60 يوم</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-destructive">
                  {formatCurrency(total_balance.aging_90_days)}
                </div>
                <p className="text-xs text-muted-foreground">61-90 يوم</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-destructive">
                  {formatCurrency(total_balance.aging_over_90_days)}
                </div>
                <p className="text-xs text-muted-foreground">أكثر من 90 يوم</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts">أرصدة العقود</TabsTrigger>
          <TabsTrigger value="obligations">الالتزامات الحديثة</TabsTrigger>
          <TabsTrigger value="payments">تاريخ المدفوعات</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أرصدة العقود</CardTitle>
              <CardDescription>تفاصيل الرصيد لكل عقد على حدة</CardDescription>
            </CardHeader>
            <CardContent>
              {contracts_balances.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد عقود نشطة</p>
              ) : (
                <div className="space-y-4">
                  {contracts_balances.map((balance) => (
                    <div key={balance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">رصيد مالي</p>
                        <p className="text-sm text-muted-foreground">
                          آخر تحديث: {format(new Date(balance.last_updated), 'dd/MM/yyyy', { locale: ar })}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-semibold">{formatCurrency(balance.remaining_balance)}</p>
                        {balance.overdue_amount > 0 && (
                          <p className="text-sm text-destructive">
                            متأخر: {formatCurrency(balance.overdue_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="obligations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الالتزامات المالية الحديثة</CardTitle>
              <CardDescription>آخر 10 التزامات مالية</CardDescription>
            </CardHeader>
            <CardContent>
              {recent_obligations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد التزامات مالية</p>
              ) : (
                <div className="space-y-4">
                  {recent_obligations.map((obligation) => (
                    <div key={obligation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{obligation.obligation_number}</p>
                          {getStatusBadge(obligation.status)}
                          {getPriorityBadge(obligation.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          استحقاق: {format(new Date(obligation.due_date), 'dd/MM/yyyy', { locale: ar })}
                        </p>
                        {obligation.description && (
                          <p className="text-sm text-muted-foreground">{obligation.description}</p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-semibold">{formatCurrency(obligation.remaining_amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          من أصل {formatCurrency(obligation.original_amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ملخص تاريخ المدفوعات</CardTitle>
              <CardDescription>إحصائيات سداد العميل</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">إجمالي المدفوعات</span>
                  </div>
                  <p className="text-2xl font-bold">{payment_history_summary.total_payments}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">متوسط أيام السداد</span>
                  </div>
                  <p className="text-2xl font-bold">{payment_history_summary.average_days_to_pay} يوم</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerFinancialDashboard;