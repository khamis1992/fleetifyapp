/**
 * واجهة النظام الاحترافي للمدفوعات - Professional Payment System UI
 * واجهة شاملة لإدارة وتشغيل النظام الاحترافي للمدفوعات
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Settings, 
  Play, 
  Pause, 
  RefreshCw,
  FileText,
  DollarSign,
  Link,
  Calculator,
  Shield,
  TrendingUp,
  Eye,
  Download,
  Upload,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useProfessionalPaymentSystem } from '@/hooks/useProfessionalPaymentSystem';
import { usePayments } from '@/hooks/usePayments';
import { formatCurrency } from '@/utils/currencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ProfessionalPaymentSystemProps {
  className?: string;
}

export const ProfessionalPaymentSystem: React.FC<ProfessionalPaymentSystemProps> = ({ 
  className = '' 
}) => {
  // الحالة المحلية
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [auditSummary, setAuditSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('dashboard');

  // استخدام النظام الاحترافي
  const {
    systemStatus,
    isProcessing,
    processingProgress,
    processPayment,
    findContractMatches,
    suggestLinking,
    getAuditSummary,
    searchAuditLogs,
    reinitializeSystem
  } = useProfessionalPaymentSystem();

  // استخدام بيانات المدفوعات
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = usePayments({
    onlyUnlinked: false
  });

  // تحميل البيانات
  useEffect(() => {
    loadAuditSummary();
    loadAuditLogs();
  }, []);

  const loadAuditSummary = async () => {
    try {
      const summary = await getAuditSummary();
      setAuditSummary(summary);
    } catch (error) {
      console.error('خطأ في تحميل ملخص المراجعة:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await searchAuditLogs({ limit: 20 });
      setAuditLogs(logs);
    } catch (error) {
      console.error('خطأ في تحميل سجل المراجعة:', error);
    }
  };

  // معالجة مدفوعة
  const handleProcessPayment = async (payment: any) => {
    setSelectedPayment(payment);
    setIsProcessingDialogOpen(true);
    setProcessingResult(null);

    try {
      const result = await processPayment(payment, {
        autoLink: true,
        autoInvoice: true,
        autoAllocate: true,
        autoAccounting: true,
        logAudit: true
      });

      setProcessingResult(result);
      
      // تحديث قائمة المدفوعات
      await refetchPayments();
      
      // تحديث سجل المراجعة
      await loadAuditLogs();

    } catch (error) {
      console.error('خطأ في معالجة المدفوعة:', error);
      toast.error('فشل في معالجة المدفوعة');
    }
  };

  // معالجة مجمعة
  const handleBulkProcess = async () => {
    const unlinkedPayments = payments?.filter(p => !p.contract_id) || [];
    
    if (unlinkedPayments.length === 0) {
      toast.info('لا توجد مدفوعات تحتاج معالجة');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const payment of unlinkedPayments) {
      try {
        await processPayment(payment);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    toast.success(`تمت معالجة ${successCount} مدفوعة بنجاح، ${errorCount} فشلت`);
    await refetchPayments();
    await loadAuditLogs();
  };

  // إعادة تهيئة النظام
  const handleReinitialize = async () => {
    try {
      await reinitializeSystem();
      toast.success('تم إعادة تهيئة النظام بنجاح');
    } catch (error) {
      toast.error('فشل في إعادة تهيئة النظام');
    }
  };

  // الحصول على لون حالة النظام
  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  // الحصول على أيقونة الحالة
  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">النظام الاحترافي للمدفوعات</h1>
          <p className="text-gray-600 mt-2">
            نظام متكامل لربط وتوزيع ومعالجة المدفوعات باحترافية عالية
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleReinitialize}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة تهيئة
          </Button>
          
          <Button 
            onClick={handleBulkProcess}
            disabled={isProcessing || !payments?.some(p => !p.contract_id)}
          >
            <Zap className="h-4 w-4 mr-2" />
            معالجة مجمعة
          </Button>
        </div>
      </div>

      {/* حالة النظام */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            حالة النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(systemStatus.contractMatching)}
              <span className="text-sm font-medium">الربط الذكي</span>
              <Badge className={getStatusColor(systemStatus.contractMatching)}>
                {systemStatus.contractMatching ? 'نشط' : 'معطل'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusIcon(systemStatus.autoInvoicing)}
              <span className="text-sm font-medium">الفواتير التلقائية</span>
              <Badge className={getStatusColor(systemStatus.autoInvoicing)}>
                {systemStatus.autoInvoicing ? 'نشط' : 'معطل'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusIcon(systemStatus.allocation)}
              <span className="text-sm font-medium">التوزيع</span>
              <Badge className={getStatusColor(systemStatus.allocation)}>
                {systemStatus.allocation ? 'نشط' : 'معطل'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusIcon(systemStatus.accounting)}
              <span className="text-sm font-medium">المحاسبة</span>
              <Badge className={getStatusColor(systemStatus.accounting)}>
                {systemStatus.accounting ? 'نشط' : 'معطل'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusIcon(systemStatus.audit)}
              <span className="text-sm font-medium">المراجعة</span>
              <Badge className={getStatusColor(systemStatus.audit)}>
                {systemStatus.audit ? 'نشط' : 'معطل'}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            آخر تحديث: {format(new Date(systemStatus.lastUpdate), 'dd/MM/yyyy HH:mm', { locale: ar })}
          </div>
        </CardContent>
      </Card>

      {/* التبويبات الرئيسية */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          <TabsTrigger value="processing">المعالجة</TabsTrigger>
          <TabsTrigger value="audit">المراجعة</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        {/* لوحة التحكم */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* إحصائيات سريعة */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payments?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {payments?.filter(p => p.payment_status === 'completed').length || 0} مكتملة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المدفوعات المربوطة</CardTitle>
                <Link className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payments?.filter(p => p.contract_id).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {payments ? Math.round((payments.filter(p => p.contract_id).length / payments.length) * 100) : 0}% من الإجمالي
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المدفوعات غير المربوطة</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payments?.filter(p => !p.contract_id).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  تحتاج معالجة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">عمليات المراجعة</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditSummary?.total_actions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  آخر 30 يوم
                </p>
              </CardContent>
            </Card>
          </div>

          {/* المدفوعات الأخيرة */}
          <Card>
            <CardHeader>
              <CardTitle>المدفوعات الأخيرة</CardTitle>
              <CardDescription>
                آخر المدفوعات التي تم إنشاؤها في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم المدفوعة</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>مربوطة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.slice(0, 10).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.payment_number}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                          {payment.payment_status === 'completed' ? 'مكتملة' : 'معلقة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.contract_id ? 'default' : 'destructive'}>
                          {payment.contract_id ? 'مربوطة' : 'غير مربوطة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessPayment(payment)}
                          disabled={isProcessing}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          معالجة
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* المدفوعات */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>جميع المدفوعات</CardTitle>
              <CardDescription>
                عرض وإدارة جميع المدفوعات في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم المدفوعة</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>مربوطة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.payment_number}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                          {payment.payment_status === 'completed' ? 'مكتملة' : 'معلقة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.contract_id ? 'default' : 'destructive'}>
                          {payment.contract_id ? 'مربوطة' : 'غير مربوطة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessPayment(payment)}
                            disabled={isProcessing}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            معالجة
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* المعالجة */}
        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معالجة المدفوعات</CardTitle>
              <CardDescription>
                معالجة المدفوعات باستخدام النظام الاحترافي
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isProcessing && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">جاري المعالجة...</span>
                  </div>
                  <Progress value={processingProgress} className="w-full" />
                  <p className="text-sm text-gray-500">
                    {processingProgress}% مكتمل
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">المدفوعات غير المربوطة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {payments?.filter(p => !p.contract_id).length || 0}
                    </div>
                    <p className="text-sm text-gray-500">
                      تحتاج معالجة فورية
                    </p>
                    <Button 
                      className="mt-4 w-full"
                      onClick={handleBulkProcess}
                      disabled={isProcessing || !payments?.some(p => !p.contract_id)}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      معالجة جميع المدفوعات غير المربوطة
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">المدفوعات المربوطة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {payments?.filter(p => p.contract_id).length || 0}
                    </div>
                    <p className="text-sm text-gray-500">
                      تم ربطها بنجاح
                    </p>
                    <Button 
                      className="mt-4 w-full"
                      variant="outline"
                      onClick={() => setSelectedTab('payments')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      عرض المدفوعات المربوطة
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* المراجعة */}
        <TabsContent value="audit" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي العمليات</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditSummary?.total_actions || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">العمليات الناجحة</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {auditSummary?.actions_by_severity?.info || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">التحذيرات</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {auditSummary?.actions_by_severity?.warning || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الأخطاء</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {auditSummary?.actions_by_severity?.error || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>سجل المراجعة</CardTitle>
              <CardDescription>
                آخر العمليات المسجلة في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>العملية</TableHead>
                    <TableHead>الكيان</TableHead>
                    <TableHead>المستوى</TableHead>
                    <TableHead>الرسالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>{log.user_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {log.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            log.severity === 'error' ? 'destructive' :
                            log.severity === 'warning' ? 'default' : 'secondary'
                          }
                        >
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الإعدادات */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات النظام</CardTitle>
              <CardDescription>
                تخصيص إعدادات النظام الاحترافي للمدفوعات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">الربط الذكي</h3>
                  <div className="space-y-2">
                    <Label>حد الثقة للربط التلقائي</Label>
                    <Select defaultValue="0.8">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.9">90% - عالي جداً</SelectItem>
                        <SelectItem value="0.8">80% - عالي</SelectItem>
                        <SelectItem value="0.7">70% - متوسط</SelectItem>
                        <SelectItem value="0.6">60% - منخفض</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="fuzzy-search" defaultChecked />
                    <Label htmlFor="fuzzy-search">البحث الضبابي</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">الفواتير التلقائية</h3>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-invoice" />
                    <Label htmlFor="auto-invoice">إنشاء فواتير تلقائية</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>نظام ترقيم الفواتير</Label>
                    <Input placeholder="INV-YYYY-NNNN" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">التوزيع</h3>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-allocate" defaultChecked />
                    <Label htmlFor="auto-allocate">التوزيع التلقائي</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">المحاسبة</h3>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-accounting" defaultChecked />
                    <Label htmlFor="auto-accounting">إنشاء قيود تلقائية</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-post" />
                    <Label htmlFor="auto-post">ترحيل تلقائي</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline">
                  إعادة تعيين
                </Button>
                <Button>
                  حفظ الإعدادات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* حوار معالجة المدفوعة */}
      <Dialog open={isProcessingDialogOpen} onOpenChange={setIsProcessingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معالجة المدفوعة</DialogTitle>
            <DialogDescription>
              معالجة المدفوعة رقم {selectedPayment?.payment_number} باستخدام النظام الاحترافي
            </DialogDescription>
          </DialogHeader>

          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">جاري المعالجة...</span>
              </div>
              <Progress value={processingProgress} className="w-full" />
              <p className="text-sm text-gray-500">
                {processingProgress}% مكتمل
              </p>
            </div>
          )}

          {processingResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">نتائج المعالجة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>النجاح:</span>
                        <Badge variant={processingResult.success ? 'default' : 'destructive'}>
                          {processingResult.success ? 'نجح' : 'فشل'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>وقت المعالجة:</span>
                        <span>{processingResult.processingTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>مربوطة بعقد:</span>
                        <Badge variant={processingResult.contractMatch ? 'default' : 'secondary'}>
                          {processingResult.contractMatch ? 'نعم' : 'لا'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>فاتورة منشأة:</span>
                        <Badge variant={processingResult.invoice ? 'default' : 'secondary'}>
                          {processingResult.invoice ? 'نعم' : 'لا'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>توزيعات:</span>
                        <span>{processingResult.allocations.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>قيد محاسبي:</span>
                        <Badge variant={processingResult.journalEntry ? 'default' : 'secondary'}>
                          {processingResult.journalEntry ? 'منشأ' : 'غير منشأ'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">التفاصيل</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">رقم المدفوعة:</span>
                        <span className="mr-2">{processingResult.payment.payment_number}</span>
                      </div>
                      <div>
                        <span className="font-medium">المبلغ:</span>
                        <span className="mr-2">{formatCurrency(processingResult.payment.amount)}</span>
                      </div>
                      <div>
                        <span className="font-medium">التاريخ:</span>
                        <span className="mr-2">
                          {format(new Date(processingResult.payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">طريقة الدفع:</span>
                        <span className="mr-2">{processingResult.payment.payment_method}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {processingResult.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">الأخطاء</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {processingResult.errors.map((error: string, index: number) => (
                        <li key={index} className="text-sm text-red-600">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {processingResult.warnings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-yellow-600">التحذيرات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {processingResult.warnings.map((warning: string, index: number) => (
                        <li key={index} className="text-sm text-yellow-600">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfessionalPaymentSystem;
