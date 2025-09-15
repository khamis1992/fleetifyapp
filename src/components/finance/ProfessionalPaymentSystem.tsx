/**
 * واجهة المستخدم للنظام الاحترافي للمدفوعات - Professional Payment System UI
 * واجهة شاملة لإدارة وتشغيل النظام الاحترافي للمدفوعات
 */

import React, { useState, useEffect } from 'react';
import { useProfessionalPaymentSystem } from '@/hooks/useProfessionalPaymentSystem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Zap, 
  Link, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings, 
  Play, 
  Pause, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Upload,
  Brain,
  Target,
  Calculator,
  Shield,
  TrendingUp,
  Activity,
  Clock,
  Users,
  Building,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// ===============================
// أنواع المكونات
// ===============================

interface ProcessingStatus {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  processedCount: number;
  totalCount: number;
  errors: string[];
  warnings: string[];
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

// ===============================
// المكون الرئيسي
// ===============================

export const ProfessionalPaymentSystem: React.FC = () => {
  // Hook النظام الاحترافي
  const {
    isLoading,
    isProcessing,
    payments,
    unlinkedPayments,
    statistics,
    configuration,
    errors,
    warnings,
    processPaymentProfessionally,
    processBatchPayments,
    updateConfiguration,
    generateAuditReport,
    performComplianceCheck,
    loadSystemData
  } = useProfessionalPaymentSystem();

  // الحالة المحلية
  const [activeTab, setActiveTab] = useState('dashboard');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isRunning: false,
    currentStep: '',
    progress: 0,
    processedCount: 0,
    totalCount: 0,
    errors: [],
    warnings: []
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    score: 95,
    issues: []
  });
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  // المساعدات
  const { formatCurrency } = useCurrencyFormatter();

  // ===============================
  // التأثيرات الجانبية
  // ===============================

  useEffect(() => {
    // تحديث صحة النظام
    updateSystemHealth();
  }, [statistics, errors, warnings]);

  // ===============================
  // دوال المعالجة
  // ===============================

  /**
   * معالجة المدفوعات غير المربوطة
   */
  const handleProcessUnlinkedPayments = async () => {
    if (unlinkedPayments.length === 0) {
      toast.warning('لا توجد مدفوعات غير مربوطة للمعالجة');
      return;
    }

    setProcessingStatus({
      isRunning: true,
      currentStep: 'بدء المعالجة الاحترافية...',
      progress: 0,
      processedCount: 0,
      totalCount: unlinkedPayments.length,
      errors: [],
      warnings: []
    });

    try {
      const result = await processBatchPayments(unlinkedPayments, {
        autoLink: true,
        autoAllocate: true,
        autoAccounting: true,
        batchSize: 5
      });

      setProcessingStatus({
        isRunning: false,
        currentStep: 'تمت المعالجة بنجاح',
        progress: 100,
        processedCount: result.processedCount,
        totalCount: unlinkedPayments.length,
        errors: result.errors,
        warnings: result.warnings
      });

      toast.success(`تمت معالجة ${result.processedCount} مدفوعة بنجاح`);
      
      // تحديث البيانات
      await loadSystemData();

    } catch (error) {
      setProcessingStatus({
        isRunning: false,
        currentStep: 'فشلت المعالجة',
        progress: 0,
        processedCount: 0,
        totalCount: unlinkedPayments.length,
        errors: [`خطأ في المعالجة: ${error}`],
        warnings: []
      });

      toast.error('فشلت المعالجة الاحترافية');
    }
  };

  /**
   * معالجة مدفوعات محددة
   */
  const handleProcessSelectedPayments = async () => {
    if (selectedPayments.length === 0) {
      toast.warning('يرجى اختيار مدفوعات للمعالجة');
      return;
    }

    const selectedPaymentsData = payments.filter(p => selectedPayments.includes(p.id!));
    
    setProcessingStatus({
      isRunning: true,
      currentStep: 'معالجة المدفوعات المحددة...',
      progress: 0,
      processedCount: 0,
      totalCount: selectedPaymentsData.length,
      errors: [],
      warnings: []
    });

    try {
      const result = await processBatchPayments(selectedPaymentsData, {
        autoLink: true,
        autoAllocate: true,
        autoAccounting: true,
        batchSize: 3
      });

      setProcessingStatus({
        isRunning: false,
        currentStep: 'تمت المعالجة بنجاح',
        progress: 100,
        processedCount: result.processedCount,
        totalCount: selectedPaymentsData.length,
        errors: result.errors,
        warnings: result.warnings
      });

      toast.success(`تمت معالجة ${result.processedCount} مدفوعة بنجاح`);
      
      // تحديث البيانات
      await loadSystemData();
      setSelectedPayments([]);

    } catch (error) {
      setProcessingStatus({
        isRunning: false,
        currentStep: 'فشلت المعالجة',
        progress: 0,
        processedCount: 0,
        totalCount: selectedPaymentsData.length,
        errors: [`خطأ في المعالجة: ${error}`],
        warnings: []
      });

      toast.error('فشلت المعالجة الاحترافية');
    }
  };

  /**
   * تحديث صحة النظام
   */
  const updateSystemHealth = () => {
    const issues: SystemHealth['issues'] = [];
    let score = 100;

    // فحص المدفوعات غير المربوطة
    if (statistics.unlinkedPayments > 10) {
      issues.push({
        type: 'warning',
        message: `يوجد ${statistics.unlinkedPayments} مدفوعة غير مربوطة`,
        severity: 'medium'
      });
      score -= 15;
    }

    // فحص معدل النجاح
    if (statistics.autoLinkingSuccessRate < 0.8) {
      issues.push({
        type: 'warning',
        message: `معدل نجاح الربط الذكي منخفض: ${(statistics.autoLinkingSuccessRate * 100).toFixed(1)}%`,
        severity: 'medium'
      });
      score -= 10;
    }

    // فحص الأخطاء
    if (errors.length > 0) {
      issues.push({
        type: 'error',
        message: `يوجد ${errors.length} خطأ في النظام`,
        severity: 'high'
      });
      score -= 20;
    }

    const status = score >= 90 ? 'healthy' : score >= 70 ? 'warning' : 'critical';

    setSystemHealth({
      status,
      score,
      issues
    });
  };

  /**
   * فحص الامتثال
   */
  const handleComplianceCheck = async () => {
    try {
      const checks = await performComplianceCheck();
      
      if (checks.length > 0) {
        const failedChecks = checks.filter(c => c.status === 'fail');
        const warningChecks = checks.filter(c => c.status === 'warning');
        
        if (failedChecks.length > 0) {
          toast.error(`فشل ${failedChecks.length} فحص امتثال`);
        } else if (warningChecks.length > 0) {
          toast.warning(`تحذير في ${warningChecks.length} فحص امتثال`);
        } else {
          toast.success('جميع فحوصات الامتثال نجحت');
        }
      }
      
      setShowCompliance(true);
    } catch (error) {
      toast.error('فشل فحص الامتثال');
    }
  };

  // ===============================
  // مكونات الواجهة الفرعية
  // ===============================

  /**
   * لوحة الإحصائيات الرئيسية
   */
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* حالة النظام */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            حالة النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                systemHealth.status === 'healthy' ? 'bg-green-500' :
                systemHealth.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <div>
                <p className="font-medium">
                  {systemHealth.status === 'healthy' ? 'صحي' :
                   systemHealth.status === 'warning' ? 'تحذير' : 'حرج'}
                </p>
                <p className="text-sm text-muted-foreground">
                  النقاط: {systemHealth.score}/100
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">
                  {((statistics.linkedPayments / Math.max(statistics.totalPayments, 1)) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">معدل الربط</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">
                  {statistics.lastProcessingDate ? 
                    new Date(statistics.lastProcessingDate).toLocaleDateString('ar-SA') : 
                    'لم يتم'
                  }
                </p>
                <p className="text-sm text-muted-foreground">آخر معالجة</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{statistics.totalPayments}</p>
                <p className="text-sm text-muted-foreground">إجمالي المدفوعات</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Link className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{statistics.linkedPayments}</p>
                <p className="text-sm text-muted-foreground">مدفوعات مربوطة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{statistics.unlinkedPayments}</p>
                <p className="text-sm text-muted-foreground">غير مربوطة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(statistics.totalAllocated)}</p>
                <p className="text-sm text-muted-foreground">إجمالي الموزع</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أزرار المعالجة */}
      <Card>
        <CardHeader>
          <CardTitle>المعالجة الاحترافية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleProcessUnlinkedPayments}
              disabled={isProcessing || unlinkedPayments.length === 0}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              معالجة المدفوعات غير المربوطة ({unlinkedPayments.length})
            </Button>
            
            <Button 
              onClick={handleProcessSelectedPayments}
              disabled={isProcessing || selectedPayments.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              معالجة المحددة ({selectedPayments.length})
            </Button>
            
            <Button 
              onClick={handleComplianceCheck}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              فحص الامتثال
            </Button>
            
            <Button 
              onClick={() => loadSystemData()}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث البيانات
            </Button>
          </div>

          {/* شريط التقدم */}
          {processingStatus.isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{processingStatus.currentStep}</span>
                <span>{processingStatus.processedCount}/{processingStatus.totalCount}</span>
              </div>
              <Progress value={processingStatus.progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* التحذيرات والأخطاء */}
      {(errors.length > 0 || warnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              التحذيرات والأخطاء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {errors.map((error, index) => (
              <Alert key={index} variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ))}
            {warnings.map((warning, index) => (
              <Alert key={index} variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  /**
   * تبويب المدفوعات غير المربوطة
   */
  const UnlinkedPaymentsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          المدفوعات غير المربوطة ({unlinkedPayments.length})
        </h3>
        <Button 
          onClick={handleProcessUnlinkedPayments}
          disabled={isProcessing || unlinkedPayments.length === 0}
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          معالجة الكل
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input 
                    type="checkbox"
                    checked={selectedPayments.length === unlinkedPayments.length && unlinkedPayments.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPayments(unlinkedPayments.map(p => p.id!));
                      } else {
                        setSelectedPayments([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>رقم المدفوعة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unlinkedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <input 
                      type="checkbox"
                      checked={selectedPayments.includes(payment.id!)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayments([...selectedPayments, payment.id!]);
                        } else {
                          setSelectedPayments(selectedPayments.filter(id => id !== payment.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{payment.payment_number}</TableCell>
                  <TableCell>{new Date(payment.payment_date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {payment.payment_method === 'cash' ? 'نقداً' :
                       payment.payment_method === 'check' ? 'شيك' :
                       payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                       payment.payment_method === 'credit_card' ? 'بطاقة ائتمان' :
                       payment.payment_method === 'debit_card' ? 'بطاقة خصم' : payment.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.customer_id ? 
                      (payment as any).customers?.company_name || 
                      (payment as any).customers?.first_name || 
                      'عميل غير محدد' : 
                      'بدون عميل'
                    }
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleProcessSelectedPayments()}
                      disabled={isProcessing}
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * تبويب التكوين
   */
  const ConfigurationTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الربط الذكي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-linking">الربط التلقائي</Label>
            <Switch
              id="auto-linking"
              checked={configuration.autoLinking.enabled}
              onCheckedChange={(checked) => 
                updateConfiguration({
                  autoLinking: { ...configuration.autoLinking, enabled: checked }
                })
              }
            />
          </div>
          
          <div className="space-y-2">
            <Label>عتبة الثقة: {configuration.autoLinking.confidenceThreshold}</Label>
            <Slider
              value={[configuration.autoLinking.confidenceThreshold]}
              onValueChange={([value]) => 
                updateConfiguration({
                  autoLinking: { ...configuration.autoLinking, confidenceThreshold: value }
                })
              }
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات التوزيع التلقائي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-allocation">التوزيع التلقائي</Label>
            <Switch
              id="auto-allocation"
              checked={configuration.autoAllocation.enabled}
              onCheckedChange={(checked) => 
                updateConfiguration({
                  autoAllocation: { ...configuration.autoAllocation, enabled: checked }
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات المحاسبة التلقائية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-accounting">المحاسبة التلقائية</Label>
            <Switch
              id="auto-accounting"
              checked={configuration.autoAccounting.enabled}
              onCheckedChange={(checked) => 
                updateConfiguration({
                  autoAccounting: { ...configuration.autoAccounting, enabled: checked }
                })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-post">الترحيل التلقائي</Label>
            <Switch
              id="auto-post"
              checked={configuration.autoAccounting.autoPost}
              onCheckedChange={(checked) => 
                updateConfiguration({
                  autoAccounting: { ...configuration.autoAccounting, autoPost: checked }
                })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ===============================
  // المكون الرئيسي
  // ===============================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">النظام الاحترافي للمدفوعات</h1>
          <p className="text-muted-foreground">
            نظام متقدم لربط وتوزيع المدفوعات مع دقة محاسبية عالية
          </p>
        </div>
        <Button 
          onClick={() => setShowSettings(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          الإعدادات
        </Button>
      </div>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            لوحة التحكم
          </TabsTrigger>
          <TabsTrigger value="unlinked" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            غير مربوطة ({unlinkedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            التكوين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="unlinked">
          <UnlinkedPaymentsTab />
        </TabsContent>

        <TabsContent value="configuration">
          <ConfigurationTab />
        </TabsContent>
      </Tabs>

      {/* نافذة الإعدادات */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إعدادات النظام الاحترافي</DialogTitle>
          </DialogHeader>
          <ConfigurationTab />
        </DialogContent>
      </Dialog>

      {/* نافذة فحص الامتثال */}
      <Dialog open={showCompliance} onOpenChange={setShowCompliance}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>تقرير فحص الامتثال</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* سيتم إضافة محتوى فحص الامتثال هنا */}
            <p className="text-muted-foreground">تقرير فحص الامتثال قيد التطوير...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfessionalPaymentSystem;