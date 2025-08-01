import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaymentsDashboardStats } from '@/components/super-admin/payments/PaymentsDashboardStats';
import { CompanySubscriptionsList } from '@/components/super-admin/payments/CompanySubscriptionsList';
import { SubscriptionPlansManager } from '@/components/super-admin/payments/SubscriptionPlansManager';
import { PaymentTransactionsList } from '@/components/super-admin/payments/PaymentTransactionsList';
import { RevenueAnalyticsChart } from '@/components/super-admin/payments/RevenueAnalyticsChart';
import { CreditCard, DollarSign, TrendingUp, Users } from 'lucide-react';

const SuperAdminPayments: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة المدفوعات والاشتراكات</h1>
          <p className="text-muted-foreground">
            إدارة شاملة لخطط الاشتراك ومدفوعات الشركات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            النظام نشط
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            لوحة التحكم
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            اشتراكات الشركات
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            إدارة الخطط
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            المعاملات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <PaymentsDashboardStats />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueAnalyticsChart />
            <Card>
              <CardHeader>
                <CardTitle>الإحصائيات السريعة</CardTitle>
                <CardDescription>
                  نظرة سريعة على أهم المؤشرات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">متوسط قيمة الاشتراك الشهري</span>
                  <span className="text-lg font-bold text-primary">45.2 د.ك</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">معدل الاحتفاظ بالعملاء</span>
                  <span className="text-lg font-bold text-green-600">94.5%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">معدل النمو الشهري</span>
                  <span className="text-lg font-bold text-blue-600">+12.3%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <CompanySubscriptionsList />
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <SubscriptionPlansManager />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <PaymentTransactionsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminPayments;