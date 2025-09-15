import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  FileText,
  Settings,
  RefreshCw,
  Link
} from 'lucide-react';
import { useProfessionalPaymentSystem } from '@/hooks/useProfessionalPaymentSystem';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/hooks/use-toast';

export const ProfessionalPaymentSystem: React.FC = () => {
  const queryClient = useQueryClient();
  const companyId = useCurrentCompanyId() || '';
  const { toast } = useToast();
  const {
    stats,
    pendingPayments,
    statsLoading,
    pendingLoading,
    isProcessing,
    processPayment,
    performSmartLinking,
    isLinking
  } = useProfessionalPaymentSystem(companyId);

  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const handleProcessPayment = async (paymentId: string) => {
    if (!companyId) {
      toast({ 
        title: 'خطأ في الشركة', 
        description: 'يجب تحديد الشركة أولاً لمعالجة المدفوعات',
        variant: 'destructive' 
      });
      return;
    }

    setSelectedPayment(paymentId);
    toast({ title: 'جاري المعالجة', description: 'سيتم تنفيذ الربط والتوزيع وإنشاء القيد' });
    try {
      await processPayment(paymentId, {
        enableSmartLinking: true,
        enableAllocation: true,
        enableJournalEntry: true
      });
      toast({ title: 'تمت المعالجة', description: 'اكتملت العمليات المطلوبة لهذه الدفعة' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      
      if (errorMessage.includes('customer_id')) {
        toast({ 
          title: 'فشل في المعالجة', 
          description: 'هذه المدفوعة غير مربوطة بعميل. يرجى ربطها بعميل أولاً أو البحث بالمبلغ والمرجع.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'فشل في المعالجة', description: errorMessage, variant: 'destructive' });
      }
      console.error('Failed to process payment:', error);
    } finally {
      setSelectedPayment(null);
    }
  };

  const handleSmartLink = (paymentId: string) => {
    performSmartLinking({
      paymentId,
      criteria: {
        tolerancePercentage: 0.05
      }
    });
  };

  if (!companyId) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">يرجى تحديد الشركة أولاً</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            النظام الاحترافي للمدفوعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">المعالجة الشهرية</p>
              <p className="text-2xl font-bold">{statsLoading ? '...' : stats?.totalProcessed || 0}</p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">+12%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">متوسط وقت المعالجة</p>
              <p className="text-2xl font-bold">{statsLoading ? '...' : stats?.averageProcessingTime || 0}د</p>
              <div className="flex items-center gap-1 text-blue-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm">سريع</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">معدل النجاح</p>
              <p className="text-2xl font-bold">{statsLoading ? '...' : Math.round(stats?.successRate || 0)}%</p>
              <Progress value={stats?.successRate || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">الربط التلقائي</p>
              <p className="text-2xl font-bold">{statsLoading ? '...' : stats?.autoLinkedPercentage || 0}%</p>
              <div className="flex items-center gap-1 text-primary">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">ممتاز</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            المدفوعات المعلقة
            {stats?.pendingReview ? (
              <Badge variant="destructive" className="ml-1">
                {stats.pendingReview}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            التحليلات
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            مسار المراجعة
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>المدفوعات المعلقة للمراجعة</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={pendingLoading}
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['pending-payments', companyId] });
                    queryClient.invalidateQueries({ queryKey: ['professional-payment-stats', companyId] });
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${pendingLoading ? 'animate-spin' : ''}`} />
                  تحديث
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : pendingPayments?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد مدفوعات معلقة للمراجعة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPayments?.map((payment) => (
                    <div 
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{payment.paymentNumber}</h4>
                          <Badge 
                            variant={payment.confidence > 0.8 ? "default" : payment.confidence > 0.6 ? "secondary" : "destructive"}
                          >
                            ثقة: {Math.round(payment.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payment.customerName} • {payment.amount.toLocaleString()} ر.ق • {new Date(payment.paymentDate).toLocaleDateString('ar')}
                        </p>
                        <div className="flex gap-1">
                          {payment.suggestedActions.map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSmartLink(payment.id)}
                          disabled={isLinking}
                          className="flex items-center gap-1"
                        >
                          <Link className="h-4 w-4" />
                          ربط ذكي
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!companyId) {
                              toast({
                                variant: "destructive",
                                title: "خطأ",
                                description: "معرف الشركة مفقود - لا يمكن معالجة الدفعة"
                              });
                              return;
                            }
                            handleProcessPayment(payment.id);
                          }}
                          disabled={isProcessing || !companyId}
                          className="flex items-center gap-1"
                        >
                          <Zap className="h-4 w-4" />
                          معالجة شاملة
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تحليلات الأداء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">الاتجاه الشهري</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats?.monthlyTrend?.slice(0, 3).map((month, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <h5 className="font-medium">{month.month}</h5>
                          <p className="text-2xl font-bold text-primary">{month.count}</p>
                          <p className="text-sm text-muted-foreground">
                            {month.amount.toLocaleString()} ر.ق
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>مسار المراجعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">سيتم عرض سجل المراجعة هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات النظام الاحترافي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">سيتم عرض إعدادات النظام هنا</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};