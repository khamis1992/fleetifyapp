import React, { useState } from 'react';
import { AlertTriangle, BarChart3, CreditCard, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentsDashboardStats } from '@/components/super-admin/payments/PaymentsDashboardStats';
import { SubscriptionPlansManager } from '@/components/super-admin/payments/SubscriptionPlansManager';
import { PaymentTransactionsList } from '@/components/super-admin/payments/PaymentTransactionsList';
import { RevenueAnalyticsChart } from '@/components/super-admin/payments/RevenueAnalyticsChart';
import { useSubscriptionsAnalytics } from '@/hooks/useSubscriptionsAnalytics';

const SuperAdminPayments: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isLoading, error, refetch } = useSubscriptionsAnalytics();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await refetch();
    setIsRefreshing(false);
    if (result.error) {
      toast.error('حدث خطأ في تحديث بيانات الاشتراكات');
      return;
    }
    toast.success('تم تحديث بيانات الاشتراكات');
  };

  if (isLoading) {
    return <div className="flex min-h-96 items-center justify-center text-muted-foreground"><RefreshCw className="ml-2 h-5 w-5 animate-spin" />جاري تحميل بيانات الاشتراكات...</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">تعذر تحميل بيانات الاشتراكات الفعلية</p>
        <Button onClick={handleRefresh} disabled={isRefreshing}><RefreshCw className="ml-2 h-4 w-4" />إعادة المحاولة</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">إدارة المدفوعات والاشتراكات</h1>
          <p className="text-muted-foreground">خطط الاشتراك ومعاملاتها وتحليلاتها من السجلات الفعلية</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`ml-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />تحديث
          </Button>
          <Badge variant="outline">بيانات مباشرة</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-lg p-1">
          <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4" />لوحة التحكم</TabsTrigger>
          <TabsTrigger value="plans" className="gap-2"><CreditCard className="h-4 w-4" />الخطط</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2"><TrendingUp className="h-4 w-4" />المعاملات</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <PaymentsDashboardStats />
          <RevenueAnalyticsChart />
        </TabsContent>
        <TabsContent value="plans"><SubscriptionPlansManager /></TabsContent>
        <TabsContent value="transactions"><PaymentTransactionsList /></TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminPayments;
