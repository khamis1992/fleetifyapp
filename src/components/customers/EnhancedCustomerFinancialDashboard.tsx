import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  FileText,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { 
  useCustomerOutstandingBalance,
  useCustomerAgingAnalysis,
  useCustomerCreditStatus,
  useCustomerStatementData,
  useUpdateCustomerAging
} from '@/hooks/useEnhancedCustomerFinancials';
import { useCustomerLinkedAccounts } from '@/hooks/useCustomerAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface EnhancedCustomerFinancialDashboardProps {
  customerId: string;
  customerName: string;
}

export const EnhancedCustomerFinancialDashboard: React.FC<EnhancedCustomerFinancialDashboardProps> = ({
  customerId,
  customerName
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last_month' | 'last_quarter'>('current');
  
  const { data: balanceData, isLoading: balanceLoading } = useCustomerOutstandingBalance(customerId);
  const { data: agingData } = useCustomerAgingAnalysis(customerId);
  const { data: creditStatus } = useCustomerCreditStatus(customerId);
  const { data: statementData } = useCustomerStatementData(customerId);
  const { data: linkedAccounts } = useCustomerLinkedAccounts(customerId);
const updateAgingMutation = useUpdateCustomerAging();
  const { formatCurrency } = useCurrencyFormatter();

  const handleRefreshAging = () => {
    updateAgingMutation.mutate({ customerId });
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'default';
    }
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 80) return 'hsl(var(--success))';
    if (score >= 60) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  if (balanceLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الوضع المالي للعميل</h2>
          <p className="text-muted-foreground">{customerName}</p>
        </div>
        <Button 
          onClick={handleRefreshAging} 
          disabled={updateAgingMutation.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 ml-2 ${updateAgingMutation.isPending ? 'animate-spin' : ''}`} />
          تحديث التحليل
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balanceData?.current_balance || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${balanceData?.overdue_amount ? 'border-l-destructive' : 'border-l-success'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المبلغ المتأخر</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balanceData?.overdue_amount || 0)}
                </p>
                {balanceData?.days_overdue && balanceData.days_overdue > 0 && (
                  <p className="text-xs text-destructive">متأخر {balanceData.days_overdue} يوم</p>
                )}
              </div>
              <AlertTriangle className={`h-8 w-8 ${balanceData?.overdue_amount ? 'text-destructive' : 'text-success'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الائتمان المتاح</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balanceData?.credit_available || 0)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">النقاط الائتمانية</p>
                <p className="text-2xl font-bold text-foreground">
                  {creditStatus?.credit_score || 0}/100
                </p>
                {creditStatus && (
                  <Badge variant={getRiskBadgeVariant(creditStatus.risk_level)}>
                    {creditStatus.risk_level === 'low' ? 'مخاطر منخفضة' : 
                     creditStatus.risk_level === 'medium' ? 'مخاطر متوسطة' : 'مخاطر عالية'}
                  </Badge>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Status Alert */}
      {creditStatus && !creditStatus.can_extend_credit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            تحذير: لا يُنصح بمنح ائتمان إضافي لهذا العميل بسبب المخاطر العالية أو وجود مبالغ متأخرة
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="aging" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="aging">تحليل الأعمار</TabsTrigger>
          <TabsTrigger value="accounts">الحسابات المرتبطة</TabsTrigger>
          <TabsTrigger value="credit">تقييم الائتمان</TabsTrigger>
          <TabsTrigger value="statement">كشف الحساب</TabsTrigger>
        </TabsList>

        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                تحليل أعمار الذمم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agingData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">حالي</p>
                      <p className="text-lg font-semibold">{formatCurrency(agingData.current_amount)}</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">1-30 يوم</p>
                      <p className="text-lg font-semibold">{formatCurrency(agingData.days_1_30)}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">31-60 يوم</p>
                      <p className="text-lg font-semibold">{formatCurrency(agingData.days_31_60)}</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">61-90 يوم</p>
                      <p className="text-lg font-semibold">{formatCurrency(agingData.days_61_90)}</p>
                    </div>
                    <div className="text-center p-3 bg-red-100 rounded-lg">
                      <p className="text-sm text-muted-foreground">91-120 يوم</p>
                      <p className="text-lg font-semibold">{formatCurrency(agingData.days_91_120)}</p>
                    </div>
                    <div className="text-center p-3 bg-red-200 rounded-lg">
                      <p className="text-sm text-muted-foreground">أكثر من 120 يوم</p>
                      <p className="text-lg font-semibold">{formatCurrency(agingData.days_over_120)}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                    <p className="text-center text-lg font-semibold">
                      إجمالي المبلغ المستحق: {formatCurrency(agingData.total_outstanding)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات تحليل أعمار متاحة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                الحسابات المحاسبية المرتبطة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linkedAccounts && linkedAccounts.length > 0 ? (
                <div className="space-y-3">
                  {linkedAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{account.chart_of_accounts.account_name}</p>
                        <p className="text-sm text-muted-foreground">{account.chart_of_accounts.account_code}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{formatCurrency(account.chart_of_accounts.current_balance || 0)}</p>
                        <p className="text-xs text-muted-foreground">الرصيد</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد حسابات مرتبطة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                تقييم الائتمان
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creditStatus ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium">النقاط الائتمانية الإجمالية</label>
                      <div className="mt-2">
                        <Progress 
                          value={creditStatus.credit_score} 
                          className="h-3"
                          style={{ '--progress-background': getCreditScoreColor(creditStatus.credit_score) } as React.CSSProperties}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          {creditStatus.credit_score}/100
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">تاريخ المدفوعات</label>
                      <div className="mt-2">
                        <Progress value={creditStatus.payment_history_score} className="h-3" />
                        <p className="text-sm text-muted-foreground mt-1">
                          {creditStatus.payment_history_score}/100
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">مستوى المخاطر</p>
                      <Badge variant={getRiskBadgeVariant(creditStatus.risk_level)} className="mt-1">
                        {creditStatus.risk_level === 'low' ? 'منخفض' : 
                         creditStatus.risk_level === 'medium' ? 'متوسط' : 'عالي'}
                      </Badge>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">الائتمان المتاح</p>
                      <p className="text-lg font-semibold mt-1">
                        {formatCurrency(creditStatus.credit_available)}
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">حالة الائتمان</p>
                      <Badge variant={creditStatus.can_extend_credit ? 'default' : 'destructive'} className="mt-1">
                        {creditStatus.can_extend_credit ? 'مؤهل' : 'غير مؤهل'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات تقييم ائتمان متاحة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statement">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                كشف حساب العميل
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statementData ? (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-center font-medium">فترة الكشف: {statementData.statement_period}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">الرصيد الافتتاحي</p>
                      <p className="text-lg font-semibold">{formatCurrency(statementData.opening_balance)}</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                      <p className="text-lg font-semibold text-red-600">{formatCurrency(statementData.total_charges)}</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">إجمالي المدفوعات</p>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(statementData.total_payments)}</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">الرصيد الختامي</p>
                      <p className="text-lg font-semibold">{formatCurrency(statementData.closing_balance)}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg text-center">
                    <p className="text-sm">
                      عدد المعاملات: {statementData.transaction_count} | 
                      المبلغ المتأخر: {formatCurrency(statementData.overdue_amount)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات كشف حساب متاحة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};