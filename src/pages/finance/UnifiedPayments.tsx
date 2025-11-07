import { useState } from 'react';
import { ProtectedFinanceRoute } from '@/components/finance/ProtectedFinanceRoute';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  List,
  GitBranch,
  BarChart3,
  Plus
} from 'lucide-react';
import { HelpIcon } from '@/components/help/HelpIcon';
import { PaymentTracking } from '@/components/finance/PaymentTracking';

const UnifiedPayments = () => {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <ProtectedFinanceRoute 
      permission="finance.payments.view"
      title="المدفوعات"
    >
      <FinanceErrorBoundary
        error={null}
        isLoading={false}
        onRetry={() => window.location.reload()}
        title="خطأ في المدفوعات"
        context="إدارة المدفوعات"
      >
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">إدارة المدفوعات</h1>
                  <HelpIcon topic="payments" />
                </div>
                <p className="text-muted-foreground">إدارة شاملة للمدفوعات والمقبوضات</p>
              </div>
            </div>
            
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              دفعة جديدة
            </Button>
          </div>

          {/* Main Payments Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                قائمة المدفوعات
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                التتبع والتسوية
              </TabsTrigger>
              <TabsTrigger value="linking" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                ربط المدفوعات
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                التحليلات
              </TabsTrigger>
            </TabsList>

            {/* Payments List */}
            <TabsContent value="list" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    قائمة المدفوعات
                    <HelpIcon topic="paymentsList" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>سيتم عرض قائمة المدفوعات هنا</p>
                    <p className="text-sm mt-2">جدول شامل مع البحث والفلترة</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tracking & Reconciliation */}
            <TabsContent value="tracking" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    التتبع والتسوية البنكية
                    <HelpIcon topic="paymentTracking" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentTracking />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Linking */}
            <TabsContent value="linking" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    ربط المدفوعات بالعقود والفواتير
                    <HelpIcon topic="paymentLinking" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>ربط المدفوعات بالعقود والفواتير</p>
                    <p className="text-sm mt-2">مع AI Matching الذكي</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    تحليلات المدفوعات
                    <HelpIcon topic="paymentAnalytics" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>إحصائيات ورسوم بيانية للمدفوعات</p>
                    <p className="text-sm mt-2">تحليل الاتجاهات والأنماط</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </FinanceErrorBoundary>
    </ProtectedFinanceRoute>
  );
};

export default UnifiedPayments;
