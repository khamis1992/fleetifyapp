import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePayments } from '@/hooks/useFinance';
import { useUnlinkedPayments } from '@/hooks/usePaymentLinking';
import { useCustomers } from '@/hooks/useCustomers';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Receipt, 
  FileText,
  Download,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3
  }).format(amount);
};

export const PaymentLinkingReports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  const { data: allPayments } = usePayments();
  const { data: unlinkedPayments } = useUnlinkedPayments();
  const { data: customers } = useCustomers();

  // Calculate statistics
  const totalPayments = allPayments?.length || 0;
  const totalUnlinked = unlinkedPayments?.length || 0;
  const linkedPayments = totalPayments - totalUnlinked;
  const linkingRate = totalPayments > 0 ? Math.round((linkedPayments / totalPayments) * 100) : 0;

  const totalAmount = allPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  const unlinkedAmount = unlinkedPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  const linkedAmount = totalAmount - unlinkedAmount;

  // Get payments with invoices
  const paymentsWithInvoices = allPayments?.filter(payment => payment.invoice_id) || [];
  const invoiceGenerationRate = linkedPayments > 0 ? Math.round((paymentsWithInvoices.length / linkedPayments) * 100) : 0;

  // Recent linking activity (mock data for demonstration)
  const recentActivity = [
    {
      id: '1',
      action: 'ربط دفعة',
      payment_number: 'PAY-2024-001',
      customer_name: 'أحمد محمد',
      amount: 150.500,
      date: new Date(),
      type: 'manual'
    },
    {
      id: '2',
      action: 'إنشاء فاتورة',
      payment_number: 'PAY-2024-002',
      customer_name: 'شركة الخليج',
      amount: 280.750,
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      type: 'automatic'
    },
    {
      id: '3',
      action: 'ربط جماعي',
      payment_number: '5 دفعات',
      customer_name: 'عملاء متعددين',
      amount: 1250.000,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: 'bulk'
    }
  ];

  // Customer linking performance
  const customerLinkingStats = customers?.map(customer => {
    const customerPayments = allPayments?.filter(payment => payment.customer_id === customer.id) || [];
    const customerAmount = customerPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    return {
      customer,
      paymentsCount: customerPayments.length,
      totalAmount: customerAmount,
      hasInvoices: customerPayments.some(payment => payment.invoice_id)
    };
  })
  .filter(stat => stat.paymentsCount > 0)
  .sort((a, b) => b.totalAmount - a.totalAmount)
  .slice(0, 10) || [];

  const exportReport = () => {
    // Mock export functionality
    const reportData = {
      summary: {
        totalPayments,
        linkedPayments,
        unlinkedPayments: totalUnlinked,
        linkingRate,
        totalAmount,
        linkedAmount,
        unlinkedAmount,
        invoiceGenerationRate
      },
      customerStats: customerLinkingStats,
      recentActivity,
      generatedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-linking-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">تقارير ربط المدفوعات</h2>
          <p className="text-muted-foreground">
            تحليل أداء وإحصائيات ربط المدفوعات
          </p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          تصدير التقرير
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
          <TabsTrigger value="activity">النشاط</TabsTrigger>
          <TabsTrigger value="customers">العملاء</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل الربط</CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{linkingRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {linkedPayments} من {totalPayments} دفعة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">قيمة المدفوعات المربوطة</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(linkedAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  من إجمالي {formatCurrency(totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل إنشاء الفواتير</CardTitle>
                <Receipt className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invoiceGenerationRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {paymentsWithInvoices.length} فاتورة تم إنشاؤها
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مدفوعات في الانتظار</CardTitle>
                <AlertCircle className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUnlinked}</div>
                <p className="text-xs text-muted-foreground">
                  بقيمة {formatCurrency(unlinkedAmount)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Overview */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>توزيع حالة المدفوعات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>مربوطة بالعملاء</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{linkedPayments}</div>
                    <div className="text-sm text-muted-foreground">{linkingRate}%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>غير مربوطة</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{totalUnlinked}</div>
                    <div className="text-sm text-muted-foreground">{100 - linkingRate}%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>مع فواتير</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{paymentsWithInvoices.length}</div>
                    <div className="text-sm text-muted-foreground">{invoiceGenerationRate}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الأداء الشهري</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mx-auto mb-2" />
                  <p>مخطط الأداء الشهري</p>
                  <p className="text-sm">(سيتم تطبيقه في المرحلة التالية)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>النشاط الأخير</CardTitle>
              <CardDescription>
                آخر عمليات ربط المدفوعات وإنشاء الفواتير
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النشاط</TableHead>
                    <TableHead>الدفعة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.action}</TableCell>
                      <TableCell>{activity.payment_number}</TableCell>
                      <TableCell>{activity.customer_name}</TableCell>
                      <TableCell>{formatCurrency(activity.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          activity.type === 'automatic' ? 'default' :
                          activity.type === 'bulk' ? 'secondary' : 'outline'
                        }>
                          {activity.type === 'automatic' ? 'تلقائي' :
                           activity.type === 'bulk' ? 'جماعي' : 'يدوي'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(activity.date, 'dd MMM yyyy', { locale: ar })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أداء العملاء في الربط</CardTitle>
              <CardDescription>
                العملاء الأكثر نشاطاً في المدفوعات المربوطة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>عدد المدفوعات</TableHead>
                    <TableHead>إجمالي المبلغ</TableHead>
                    <TableHead>الفواتير</TableHead>
                    <TableHead>النوع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerLinkingStats.map((stat, index) => (
                    <TableRow key={stat.customer.id}>
                      <TableCell className="font-medium">
                        {stat.customer.customer_type === 'individual' 
                          ? `${stat.customer.first_name || ''} ${stat.customer.last_name || ''}`.trim()
                          : stat.customer.company_name
                        }
                      </TableCell>
                      <TableCell>{stat.paymentsCount}</TableCell>
                      <TableCell>{formatCurrency(stat.totalAmount)}</TableCell>
                      <TableCell>
                        {stat.hasInvoices ? (
                          <Badge variant="default">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            متوفرة
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            مفقودة
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {stat.customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};