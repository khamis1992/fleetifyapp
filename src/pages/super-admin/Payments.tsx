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
import { CompanySubscriptionsList } from '@/components/super-admin/payments/CompanySubscriptionsList';
import { SubscriptionPlansManager } from '@/components/super-admin/payments/SubscriptionPlansManager';
import { PaymentTransactionsList } from '@/components/super-admin/payments/PaymentTransactionsList';
import { RevenueAnalyticsChart } from '@/components/super-admin/payments/RevenueAnalyticsChart';
import { useSubscriptionsAnalytics } from '@/hooks/useSubscriptionsAnalytics';
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
  const { data: analytics, isLoading, refetch } = useSubscriptionsAnalytics();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      toast.error('حدث خطأ في تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <div className="text-2xl font-bold text-primary">{analytics.monthlyRevenue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">إيرادات الشهر (د.ك)</div>
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
            <div className="text-2xl font-bold text-purple-600">{analytics.averageSubscriptionValue.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground">متوسط القيمة (د.ك)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">+{analytics.revenueGrowth.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">نمو الإيرادات</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            لوحة التحكم
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            الاشتراكات
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            الخطط
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            المعاملات
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            التحليلات
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            التقارير
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
                      <span className="font-medium">10,000 د.ك</span>
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

        <TabsContent value="subscriptions" className="space-y-6">
          <CompanySubscriptionsList />
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <SubscriptionPlansManager />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <PaymentTransactionsList />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  توزيع الإيرادات حسب الخطة
                </CardTitle>
                <CardDescription>
                  نسبة مساهمة كل خطة في الإيرادات الإجمالية
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.revenueByPlan.map((plan, index) => {
                  const totalRevenue = analytics.revenueByPlan.reduce((sum, p) => sum + p.revenue, 0);
                  const percentage = totalRevenue > 0 ? (plan.revenue / totalRevenue * 100) : 0;
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                  
                  return (
                    <div key={plan.plan} className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {plan.plan === 'basic' ? 'أساسي' : 
                           plan.plan === 'premium' ? 'مميز' : 'مؤسسي'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}% ({plan.revenue} د.ك)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`${colors[index]} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  إحصائيات عامة
                </CardTitle>
                <CardDescription>
                  مؤشرات الأداء الرئيسية للنظام
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics ? (analytics.monthlyRevenue * 12).toLocaleString() : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">إيرادات سنوية متوقعة</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics ? Math.round(analytics.activeSubscriptions * 0.95) : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">عملاء راضون</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics ? (analytics.averageSubscriptionValue * 12).toFixed(0) : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">قيمة عميل سنوية</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                    <div className="text-2xl font-bold text-orange-600">
                      {analytics ? Math.round(analytics.activeSubscriptions * 1.15) : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">هدف نهاية السنة</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تحليل الاتجاهات</CardTitle>
              <CardDescription>
                تحليل مفصل لاتجاهات النمو والأداء
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">+{analytics?.revenueGrowth.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">نمو الإيرادات الشهري</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">+{analytics?.subscriptionGrowth.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">نمو الاشتراكات</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-600">{analytics?.renewalRate}%</div>
                  <div className="text-sm text-muted-foreground">معدل التجديد</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  تقرير الإيرادات الشهرية
                </CardTitle>
                <CardDescription>
                  تفصيل شامل للإيرادات والمدفوعات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => toast.success('يتم تحضير التقرير...')}>
                  <Download className="h-4 w-4 mr-2" />
                  تنزيل التقرير
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  تقرير الاشتراكات
                </CardTitle>
                <CardDescription>
                  إحصائيات شاملة عن حالة الاشتراكات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => toast.success('يتم تحضير التقرير...')}>
                  <Download className="h-4 w-4 mr-2" />
                  تنزيل التقرير
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  تقرير الأداء
                </CardTitle>
                <CardDescription>
                  تحليل شامل لأداء النظام والنمو
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => toast.success('يتم تحضير التقرير...')}>
                  <Download className="h-4 w-4 mr-2" />
                  تنزيل التقرير
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  تقرير المعاملات
                </CardTitle>
                <CardDescription>
                  سجل مفصل لجميع المعاملات المالية
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => toast.success('يتم تحضير التقرير...')}>
                  <Download className="h-4 w-4 mr-2" />
                  تنزيل التقرير
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  تقرير شهري مخصص
                </CardTitle>
                <CardDescription>
                  إنشاء تقرير مخصص لفترة محددة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <Label className="text-xs">الفترة الزمنية</Label>
                  <Select defaultValue="current_month">
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">الشهر الحالي</SelectItem>
                      <SelectItem value="last_month">الشهر الماضي</SelectItem>
                      <SelectItem value="quarter">الربع الحالي</SelectItem>
                      <SelectItem value="year">السنة الحالية</SelectItem>
                      <SelectItem value="custom">فترة مخصصة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => toast.success('يتم تحضير التقرير المخصص...')}>
                  <Download className="h-4 w-4 mr-2" />
                  إنشاء التقرير
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  تقرير التنبؤات
                </CardTitle>
                <CardDescription>
                  توقعات الإيرادات والنمو المستقبلي
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => toast.success('يتم تحضير تقرير التنبؤات...')}>
                  <Download className="h-4 w-4 mr-2" />
                  تنزيل التقرير
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>جدولة التقارير التلقائية</CardTitle>
              <CardDescription>
                إعداد التقارير التلقائية المنتظمة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">تقرير شهري</div>
                      <div className="text-sm text-muted-foreground">يرسل في بداية كل شهر</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">نشط</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">تقرير أسبوعي</div>
                      <div className="text-sm text-muted-foreground">يرسل كل يوم إثنين</div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800">معطل</Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">تقرير ربعي</div>
                      <div className="text-sm text-muted-foreground">يرسل في نهاية كل ربع</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">نشط</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">تقرير سنوي</div>
                      <div className="text-sm text-muted-foreground">يرسل في نهاية السنة المالية</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">نشط</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminPayments;