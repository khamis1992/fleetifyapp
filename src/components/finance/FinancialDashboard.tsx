import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinancialDashboardStats } from '@/hooks/useCustomerFinancialBalances';
import { useCompanyCustomersBalances } from '@/hooks/useCustomerFinancialBalances';
import { useOverdueObligations } from '@/hooks/useFinancialObligations';
import { useUpdateObligationsStatus } from '@/hooks/useFinancialObligations';
// Utility function for currency formatting
const formatCurrency = (amount: number) => `${amount.toFixed(3)} د.ك`;
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  Calendar,
  RefreshCw,
  CreditCard,
  Clock,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const FinancialDashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useFinancialDashboardStats();
  const { data: customerBalances, isLoading: balancesLoading } = useCompanyCustomersBalances({
    hasOverdue: true
  });
  const { data: overdueObligations, isLoading: overdueLoading } = useOverdueObligations();
  const updateObligationsStatus = useUpdateObligationsStatus();

  const handleRefreshStatus = () => {
    updateObligationsStatus.mutate();
  };

  if (statsLoading) {
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

  const getStatusBadge = (amount: number) => {
    if (amount === 0) return <Badge variant="default">مسدد</Badge>;
    if (amount > 0) return <Badge variant="destructive">متأخر</Badge>;
    return <Badge variant="secondary">جيد</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة المالية</h1>
          <p className="text-muted-foreground">
            إدارة شاملة للالتزامات المالية وأرصدة العملاء
          </p>
        </div>
        <Button 
          onClick={handleRefreshStatus} 
          disabled={updateObligationsStatus.isPending}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${updateObligationsStatus.isPending ? 'animate-spin' : ''}`} />
          تحديث الحالة
        </Button>
      </div>

      {/* Main Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستحقات</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.total_outstanding_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                من {stats.total_customers_with_balance} عميل
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبالغ المتأخرة</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.total_overdue_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {((stats.total_overdue_amount / stats.total_outstanding_amount) * 100).toFixed(1)}% من الإجمالي
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المستحق اليوم</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {formatCurrency(stats.total_current_due)}
              </div>
              <p className="text-xs text-muted-foreground">
                يحتاج متابعة فورية
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">العملاء النشطون</CardTitle>
              <Users className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.total_customers_with_balance}
              </div>
              <p className="text-xs text-muted-foreground">
                عميل لديه رصيد مالي
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aging Analysis */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>تحليل الشيخوخة للمستحقات</CardTitle>
            <CardDescription>توزيع المستحقات حسب فترات التأخير</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center p-4 border rounded-lg bg-success/5">
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(stats.aging_analysis.current)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">حالي</p>
                <p className="text-xs text-muted-foreground">غير متأخر</p>
              </div>

              <div className="text-center p-4 border rounded-lg bg-warning/5">
                <div className="text-2xl font-bold text-warning">
                  {formatCurrency(stats.aging_analysis.days_30)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">1-30 يوم</p>
                <p className="text-xs text-muted-foreground">متأخر قليلاً</p>
              </div>

              <div className="text-center p-4 border rounded-lg bg-warning/10">
                <div className="text-2xl font-bold text-warning">
                  {formatCurrency(stats.aging_analysis.days_60)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">31-60 يوم</p>
                <p className="text-xs text-muted-foreground">يحتاج متابعة</p>
              </div>

              <div className="text-center p-4 border rounded-lg bg-destructive/5">
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(stats.aging_analysis.days_90)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">61-90 يوم</p>
                <p className="text-xs text-muted-foreground">متأخر جداً</p>
              </div>

              <div className="text-center p-4 border rounded-lg bg-destructive/10">
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(stats.aging_analysis.over_90)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">أكثر من 90 يوم</p>
                <p className="text-xs text-muted-foreground">حرج</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overdue-customers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overdue-customers">العملاء المتأخرون</TabsTrigger>
          <TabsTrigger value="overdue-obligations">الالتزامات المتأخرة</TabsTrigger>
          <TabsTrigger value="all-balances">جميع الأرصدة</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue-customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أكبر العملاء المتأخرون في السداد</CardTitle>
              <CardDescription>العملاء الذين لديهم أكبر مبالغ متأخرة</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.top_overdue_customers && stats.top_overdue_customers.length > 0 ? (
                <div className="space-y-4">
                  {stats.top_overdue_customers.map((customer, index) => (
                    <div key={customer.customer_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-destructive">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{customer.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.days_overdue} يوم تأخير
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-destructive">
                          {formatCurrency(customer.overdue_amount)}
                        </div>
                        <Badge variant="destructive" className="mt-1">
                          متأخر
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  لا توجد عملاء متأخرون في السداد
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue-obligations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الالتزامات المالية المتأخرة</CardTitle>
              <CardDescription>جميع الالتزامات المالية المتأخرة عن موعد الاستحقاق</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-48"></div>
                        <div className="h-3 bg-muted rounded w-32"></div>
                      </div>
                      <div className="h-6 bg-muted rounded w-24"></div>
                    </div>
                  ))}
                </div>
              ) : overdueObligations && overdueObligations.length > 0 ? (
                <div className="space-y-4">
                  {overdueObligations.slice(0, 10).map((obligation) => (
                    <div key={obligation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{obligation.obligation_number}</p>
                          <Badge variant="destructive">متأخر</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          العميل: {obligation.customers?.customer_type === 'individual' 
                            ? `${obligation.customers.first_name || ''} ${obligation.customers.last_name || ''}`.trim()
                            : obligation.customers?.company_name || ''
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          استحقاق: {format(new Date(obligation.due_date), 'dd/MM/yyyy', { locale: ar })}
                        </p>
                        {obligation.contracts && (
                          <p className="text-sm text-muted-foreground">
                            العقد: {obligation.contracts.contract_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-lg font-bold text-destructive">
                          {formatCurrency(obligation.remaining_amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          من أصل {formatCurrency(obligation.original_amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {overdueObligations.length > 10 && (
                    <p className="text-center text-muted-foreground text-sm">
                      وعرض 10 من أصل {overdueObligations.length} التزام متأخر
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  لا توجد التزامات مالية متأخرة
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>جميع أرصدة العملاء</CardTitle>
              <CardDescription>قائمة شاملة بأرصدة جميع العملاء</CardDescription>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-48"></div>
                        <div className="h-3 bg-muted rounded w-32"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-24"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : customerBalances && customerBalances.length > 0 ? (
                <div className="space-y-4">
                  {customerBalances.map((balance) => {
                    const customer = balance.customers;
                    const customerName = customer?.customer_type === 'individual' 
                      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                      : customer?.company_name || '';

                    return (
                      <div key={balance.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{customerName}</p>
                            {getStatusBadge(balance.overdue_amount)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {customer?.customer_type === 'individual' ? 'عميل فردي' : 'شركة'}
                          </p>
                          {balance.last_payment_date && (
                            <p className="text-sm text-muted-foreground">
                              آخر دفعة: {format(new Date(balance.last_payment_date), 'dd/MM/yyyy', { locale: ar })}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(balance.remaining_balance)}
                          </p>
                          {balance.overdue_amount > 0 && (
                            <p className="text-sm text-destructive">
                              متأخر: {formatCurrency(balance.overdue_amount)}
                            </p>
                          )}
                          {balance.current_amount > 0 && (
                            <p className="text-sm text-warning">
                              مستحق اليوم: {formatCurrency(balance.current_amount)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  لا توجد أرصدة مالية للعملاء
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;