import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUnlinkedPayments } from '@/hooks/usePaymentLinking';
import { useCustomers } from '@/hooks/useCustomers';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { PaymentLinkingManagement } from './PaymentLinkingManagement';
import { SmartLinkingSuggestions } from './SmartLinkingSuggestions';
import { SmartLinkingStats } from './SmartLinkingStats';
import { PaymentLinkingSuggestions } from './PaymentLinkingSuggestions';
import { PaymentLinkingReports } from './PaymentLinkingReports';
import { 
  Link, 
  Users, 
  Receipt, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Zap,
  Target
} from 'lucide-react';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3
  }).format(amount);
};

export const PaymentLinkingDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const { data: unlinkedPayments } = useUnlinkedPayments();
  const { data: customers } = useCustomers();
  const { isMobile } = useSimpleBreakpoint();
  const layout = useAdaptiveLayout();

  const totalUnlinked = unlinkedPayments?.length || 0;
  const totalUnlinkedAmount = unlinkedPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  const totalCustomers = customers?.length || 0;

  const linkingProgress = totalUnlinked > 0 ? Math.round(((totalCustomers * 10) / totalUnlinked) * 100) : 100;

  return (
    <div className={`${layout.containerPadding} ${layout.itemSpacing}`}>
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>
            نظام ربط المدفوعات
          </h1>
          <p className="text-muted-foreground text-sm">
            ربط المدفوعات بالعملاء وإنشاء الفواتير التلقائية
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدفوعات غير المربوطة</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnlinked}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج ربط بالعملاء
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalUnlinkedAmount)}</div>
            <p className="text-xs text-muted-foreground">
              مبلغ المدفوعات غير المربوطة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء المسجلين</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              عميل متاح للربط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تقدم الربط</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkingProgress}%</div>
            <Progress value={linkingProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {totalUnlinked > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              إجراءات سريعة
            </CardTitle>
            <CardDescription>
              لديك {totalUnlinked} دفعة غير مربوطة بقيمة {formatCurrency(totalUnlinkedAmount)}
            </CardDescription>
          </CardHeader>
          <CardContent className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-3`}>
            <Button 
              variant="outline" 
              size={isMobile ? "lg" : "sm"}
              onClick={() => setSelectedTab('management')}
              className={`${isMobile ? 'h-12 text-base' : ''} justify-start`}
            >
              <Link className="mr-2 h-4 w-4" />
              بدء الربط اليدوي
            </Button>
            <Button 
              variant="outline" 
              size={isMobile ? "lg" : "sm"}
              onClick={() => setSelectedTab('suggestions')}
              className={`${isMobile ? 'h-12 text-base' : ''} justify-start`}
            >
              <Zap className="mr-2 h-4 w-4" />
              الربط الذكي
            </Button>
            <Button 
              variant="outline" 
              size={isMobile ? "lg" : "sm"}
              onClick={() => setSelectedTab('reports')}
              className={`${isMobile ? 'h-12 text-base' : ''} justify-start`}
            >
              <Target className="mr-2 h-4 w-4" />
              عرض التقارير
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} ${isMobile ? 'gap-1' : ''}`}>
          {isMobile ? (
            <>
              <TabsTrigger value="overview" className="text-xs p-2">نظرة عامة</TabsTrigger>
              <TabsTrigger value="management" className="text-xs p-2">إدارة الربط</TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs p-2">الربط الذكي</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs p-2">التقارير</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="management">إدارة الربط</TabsTrigger>
              <TabsTrigger value="suggestions">الربط الذكي</TabsTrigger>
              <TabsTrigger value="reports">التقارير</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            <Card>
              <CardHeader>
                <CardTitle>حالة النظام</CardTitle>
                <CardDescription>
                  ملخص حالة ربط المدفوعات في النظام
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">المدفوعات المربوطة</span>
                  <Badge variant="outline" className="text-success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    جيد
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">المدفوعات في الانتظار</span>
                  <Badge variant="outline" className="text-warning">
                    <Clock className="mr-1 h-3 w-3" />
                    {totalUnlinked} دفعة
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">معدل الربط التلقائي</span>
                  <Badge variant="outline">
                    85%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إجراءات موصى بها</CardTitle>
                <CardDescription>
                  خطوات لتحسين عملية ربط المدفوعات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  size={isMobile ? "lg" : "sm"} 
                  className={`w-full justify-start ${isMobile ? 'h-12 text-base' : ''}`}
                >
                  <Link className="mr-2 h-4 w-4" />
                  ربط المدفوعات غير المربوطة
                </Button>
                <Button 
                  variant="outline" 
                  size={isMobile ? "lg" : "sm"} 
                  className={`w-full justify-start ${isMobile ? 'h-12 text-base' : ''}`}
                >
                  <Users className="mr-2 h-4 w-4" />
                  مراجعة بيانات العملاء
                </Button>
                <Button 
                  variant="outline" 
                  size={isMobile ? "lg" : "sm"} 
                  className={`w-full justify-start ${isMobile ? 'h-12 text-base' : ''}`}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  إنشاء فواتير مفقودة
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management">
          <PaymentLinkingManagement />
        </TabsContent>

        <TabsContent value="suggestions">
          <SmartLinkingSuggestions />
        </TabsContent>

        <TabsContent value="reports">
          <SmartLinkingStats />
        </TabsContent>
      </Tabs>
    </div>
  );
};