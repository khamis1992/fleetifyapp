import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentsDashboardStats } from '@/components/super-admin/payments/PaymentsDashboardStats';

import { SubscriptionPlansManager } from '@/components/super-admin/payments/SubscriptionPlansManager';
import { PaymentTransactionsList } from '@/components/super-admin/payments/PaymentTransactionsList';
import { RevenueAnalyticsChart } from '@/components/super-admin/payments/RevenueAnalyticsChart';
import { useSubscriptionsAnalytics } from '@/hooks/useSubscriptionsAnalytics';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { toast } from 'sonner';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  FileText,
  Download,
  Settings,
  RefreshCw,
  Bell,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Globe,
  Shield
} from 'lucide-react';

const SuperAdminPayments: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { data: analytics, isLoading, error, refetch } = useSubscriptionsAnalytics();
  const { formatCurrency: fmt } = useCurrencyFormatter();

  // Debug logging
  console.log('💰 [PAYMENTS_PAGE] Component state:', {
    activeTab,
    isLoading,
    hasAnalytics: !!analytics,
    error,
    analytics
  });

  const handleRefresh = async () => {
    console.log('💰 [PAYMENTS_PAGE] Refreshing data...');
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error('💰 [PAYMENTS_PAGE] Refresh error:', error);
      toast.error('حدث خطأ في تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading state
  if (isLoading) {
    console.log('💰 [PAYMENTS_PAGE] Showing loading state');
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">جاري تحميل بيانات المدفوعات...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('💰 [PAYMENTS_PAGE] Showing error state:', error);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-muted-foreground">حدث خطأ في تحميل البيانات</p>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log('💰 [PAYMENTS_PAGE] Rendering main content');

  return (
    <div className="space-y-6">{/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة المدفوعات والاشتراكات</h1>
          <p className="text-muted-foreground">
            إدارة شاملة لخطط الاشتراك ومدفوعات الشركات والتحليلات المالية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
          
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                إعدادات النظام
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>إعدادات نظام المدفوعات</DialogTitle>
                <DialogDescription>
                  تخصيص إعدادات النظام المالي والاشتراكات
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">العملة الافتراضية</Label>
                    <Select defaultValue="KWD">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                        <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                        <SelectItem value="EUR">يورو (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">معدل الضريبة (%)</Label>
                    <Input id="tax_rate" type="number" defaultValue="0" min="0" max="100" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_gateway">بوابة الدفع الافتراضية</Label>
                  <Select defaultValue="stripe">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="local_bank">البنك المحلي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    تأكد من مراجعة جميع الإعدادات قبل الحفظ. تغيير هذه الإعدادات قد يؤثر على جميع المعاملات المستقبلية.
                  </AlertDescription>
                </Alert>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={() => {
                  toast.success('تم حفظ الإعدادات بنجاح');
                  setShowSettingsDialog(false);
                }}>
                  حفظ الإعدادات
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Badge variant="secondary" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            النظام نشط
          </Badge>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {!isLoading && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{fmt(analytics.monthlyRevenue)}</div>
            <div className="text-sm text-muted-foreground">إيرادات الشهر</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.activeSubscriptions}</div>
            <div className="text-sm text-muted-foreground">اشتراكات نشطة</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.renewalRate}%</div>
            <div className="text-sm text-muted-foreground">معدل التجديد</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{fmt(analytics.averageSubscriptionValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-sm text-muted-foreground">متوسط القيمة</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">+{analytics.revenueGrowth.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">نمو الإيرادات</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            الخطط
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            المعاملات
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            لوحة التحكم
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <PaymentsDashboardStats />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueAnalyticsChart />
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    أهداف الإيرادات
                  </CardTitle>
                  <CardDescription>
                    مقارنة الأداء مع الأهداف المحددة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>هدف الشهر الحالي</span>
                      <span className="font-medium">{fmt(10000, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${analytics ? (analytics.monthlyRevenue / 10000) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      تم تحقيق {analytics ? ((analytics.monthlyRevenue / 10000) * 100).toFixed(1) : 0}% من الهدف
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>هدف عدد الاشتراكات</span>
                      <span className="font-medium">500 اشتراك</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${analytics ? (analytics.activeSubscriptions / 500) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      تم تحقيق {analytics ? ((analytics.activeSubscriptions / 500) * 100).toFixed(1) : 0}% من الهدف
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-500" />
                    تنبيهات مهمة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      5 اشتراكات ستنتهي خلال الأسبوع القادم
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      3 دفعات معلقة تحتاج للمراجعة
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      نمو الإيرادات 15% أعلى من الشهر الماضي
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
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