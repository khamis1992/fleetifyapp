/**
 * لوحة تحكم المدفوعات المربوطة بالعقود
 * توفر عرضاً شاملاً للمدفوعات المربوطة وغير المربوطة مع إحصائيات وأدوات إدارة
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link, 
  Unlink, 
  Eye, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  BarChart3,
  PieChart
} from 'lucide-react';
import { usePaymentContractLinking } from '@/hooks/usePaymentContractLinking';
import { UnifiedPaymentUpload } from './payment-upload/UnifiedPaymentUpload';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface LinkedPaymentsDashboardProps {
  className?: string;
}

export function LinkedPaymentsDashboard({ className }: LinkedPaymentsDashboardProps) {
  const {
    linkingStats,
    unlinkablePayments,
    linkedPayments,
    statsLoading,
    unlinkedLoading,
    linkedLoading,
    searchPotentialContracts,
    linkPaymentToContract,
    unlinkPaymentFromContract,
    autoLinkPayments,
    isAutoLinking
  } = usePaymentContractLinking();

  // الحالات المحلية
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showLinkingModal, setShowLinkingModal] = useState(false);

  // معالجة الربط التلقائي
  const handleAutoLink = async () => {
    try {
      await autoLinkPayments.mutateAsync({
        minConfidence: 0.8,
        dryRun: false
      });
    } catch (error) {
      console.error('خطأ في الربط التلقائي:', error);
    }
  };

  // عرض إحصائيات الربط
  const renderStats = () => {
    if (statsLoading || !linkingStats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    const { total_payments, linked_payments, unlinked_payments, linking_percentage } = linkingStats;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_payments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              جميع المدفوعات في النظام
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدفوعات المربوطة</CardTitle>
            <Link className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{linked_payments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              مربوطة بعقود
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدفوعات غير المربوطة</CardTitle>
            <Unlink className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unlinked_payments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج لربط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نسبة الربط</CardTitle>
            <PieChart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{linking_percentage.toFixed(1)}%</div>
            <Progress value={linking_percentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>
    );
  };

  // عرض أدوات التحكم
  const renderControls = () => (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-2 flex-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث في المدفوعات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المدفوعات</SelectItem>
            <SelectItem value="linked">المربوطة فقط</SelectItem>
            <SelectItem value="unlinked">غير المربوطة فقط</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleAutoLink}
          disabled={isAutoLinking}
          className="flex items-center gap-2"
        >
          {isAutoLinking ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          ربط تلقائي
        </Button>
        
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          رفع مدفوعات
        </Button>
      </div>
    </div>
  );

  // عرض جدول المدفوعات المربوطة
  const renderLinkedPaymentsTable = () => {
    if (linkedLoading) {
      return <div className="text-center py-8">جاري التحميل...</div>;
    }

    if (!linkedPayments || linkedPayments.length === 0) {
      return (
        <div className="text-center py-8">
          <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">لا توجد مدفوعات مربوطة</p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الدفعة</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>تاريخ الدفع</TableHead>
              <TableHead>العقد</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linkedPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  {payment.payment_number}
                </TableCell>
                <TableCell>
                  {payment.amount.toLocaleString()} {payment.currency || 'KWD'}
                </TableCell>
                <TableCell>
                  {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-green-600" />
                    {payment.contracts?.contract_number}
                  </div>
                </TableCell>
                <TableCell>
                  {payment.contracts?.customers?.company_name || 
                   `${payment.contracts?.customers?.first_name} ${payment.contracts?.customers?.last_name}`}
                </TableCell>
                <TableCell>
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    مربوط
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => unlinkPaymentFromContract.mutate(payment.id)}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // عرض جدول المدفوعات غير المربوطة
  const renderUnlinkedPaymentsTable = () => {
    if (unlinkedLoading) {
      return <div className="text-center py-8">جاري التحميل...</div>;
    }

    if (!unlinkablePayments || unlinkablePayments.length === 0) {
      return (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">جميع المدفوعات مربوطة!</p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الدفعة</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>تاريخ الدفع</TableHead>
              <TableHead>رقم الاتفاقية</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unlinkablePayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  {payment.payment_number}
                </TableCell>
                <TableCell>
                  {payment.amount.toLocaleString()} {payment.currency || 'KWD'}
                </TableCell>
                <TableCell>
                  {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                </TableCell>
                <TableCell>
                  {payment.payment_number || '-'}
                </TableCell>
                <TableCell>
                  {payment.customers?.company_name || 
                   `${payment.customers?.first_name} ${payment.customers?.last_name}` || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    غير مربوط
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowLinkingModal(true);
                      }}
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // عرض اقتراحات الربط
  const renderLinkingSuggestions = () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          يمكنك استخدام الربط التلقائي لربط المدفوعات التي تحتوي على أرقام عقود صحيحة.
          سيتم ربط المدفوعات التي تحقق مستوى ثقة 80% أو أكثر.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">نصائح لتحسين الربط</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>• تأكد من وجود رقم الاتفاقية في المدفوعات</p>
            <p>• استخدم أرقام عقود صحيحة ومطابقة</p>
            <p>• راجع المدفوعات المرفوضة يدوياً</p>
            <p>• حدث بيانات العقود المفقودة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">إحصائيات سريعة</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>معدل الربط الناجح:</span>
              <span className="font-semibold">{linkingStats?.linking_percentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>مدفوعات تحتاج مراجعة:</span>
              <span className="font-semibold">{unlinkablePayments?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>آخر تحديث:</span>
              <span className="font-semibold">الآن</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* الإحصائيات */}
      {renderStats()}
      
      {/* أدوات التحكم */}
      {renderControls()}
      
      {/* المحتوى الرئيسي */}
      <Tabs defaultValue="linked" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="linked">المدفوعات المربوطة</TabsTrigger>
          <TabsTrigger value="unlinked">المدفوعات غير المربوطة</TabsTrigger>
          <TabsTrigger value="suggestions">اقتراحات الربط</TabsTrigger>
        </TabsList>
        
        <TabsContent value="linked" className="space-y-4">
          {renderLinkedPaymentsTable()}
        </TabsContent>
        
        <TabsContent value="unlinked" className="space-y-4">
          {renderUnlinkedPaymentsTable()}
        </TabsContent>
        
        <TabsContent value="suggestions" className="space-y-4">
          {renderLinkingSuggestions()}
        </TabsContent>
      </Tabs>
      
      {/* نافذة رفع المدفوعات */}
      <UnifiedPaymentUpload
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={() => {
          setShowUploadDialog(false);
          // تحديث البيانات
        }}
      />
    </div>
  );
}

export default LinkedPaymentsDashboard;
