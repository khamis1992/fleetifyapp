import { useState } from "react";
import { usePayments } from "@/hooks/useFinance";
import { usePaymentsSummary } from "@/hooks/usePaymentsSummary";
import { PaymentForm } from "@/components/finance/PaymentForm";
import { FinanceErrorBoundary } from "@/components/finance/FinanceErrorBoundary";
import { PaymentPreviewDialog } from "@/components/finance/PaymentPreviewDialog";
import { PaymentTracking } from "@/components/finance/PaymentTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { 
  Plus, 
  Search, 
  Filter, 
  BarChart3, 
  CreditCard, 
  Eye, 
  FileText, 
  List,
  GitBranch,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { UnifiedPaymentUpload } from "@/components/finance/payment-upload/UnifiedPaymentUpload";
import { BulkDeletePaymentsDialog } from "@/components/finance/payments/BulkDeletePaymentsDialog";
import { ProfessionalPaymentSystem } from "@/components/finance/ProfessionalPaymentSystem";
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple";
import { HelpIcon } from '@/components/help/HelpIcon';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/**
 * PaymentsComplete - صفحة المدفوعات الشاملة
 * 
 * دمج 3 صفحات في واحدة:
 * - Payments.tsx (الجدول الكامل)
 * - PaymentsDashboard.tsx (Dashboard + KPIs)
 * - UnifiedPayments.tsx (التتبع والربط)
 * 
 * التبويبات:
 * 1. لوحة التحكم - KPIs + ملخص
 * 2. قائمة المدفوعات - الجدول الكامل
 * 3. التتبع والربط - تسوية بنكية
 * 4. التحليلات - Charts وإحصائيات
 */

const PaymentsComplete = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const { data: payments, isLoading: paymentsLoading, error, refetch } = usePayments();
  const { data: summary, isLoading: summaryLoading } = usePaymentsSummary();
  const { formatCurrency } = useCurrencyFormatter();
  const { isMobile } = useSimpleBreakpoint();

  const isLoading = paymentsLoading || summaryLoading;

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || filterStatus === "all" || payment.payment_status === filterStatus;
    const matchesMethod = !filterMethod || filterMethod === "all" || payment.payment_method === filterMethod;
    
    return matchesSearch && matchesStatus && matchesMethod;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'cleared': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelled':
      case 'bounced': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'مكتملة',
      cleared: 'مقاصة',
      pending: 'معلقة',
      cancelled: 'ملغاة',
      bounced: 'مرتدة'
    };
    return labels[status] || status;
  };

  return (
    <FinanceErrorBoundary
      error={error ? new Error(error.message || 'خطأ في تحميل المدفوعات') : null}
      isLoading={isLoading}
      onRetry={refetch}
      title="خطأ في المدفوعات"
      context="صفحة المدفوعات الشاملة"
    >
      <div className="container mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/finance/hub">المالية</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>المدفوعات</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

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
          
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            دفعة جديدة
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              لوحة التحكم
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              قائمة المدفوعات
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              التتبع والتسوية
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              التحليلات
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Dashboard - KPIs and Summary */}
          <TabsContent value="dashboard" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
                    <CardContent><Skeleton className="h-10 w-24" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          إجمالي المدفوعات
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(summary?.total_payments || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary?.payments_count || 0} دفعة
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          مدفوعات معلقة
                        </CardTitle>
                        <Clock className="h-4 w-4 text-warning" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-warning">
                        {formatCurrency(summary?.pending_amount || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary?.pending_count || 0} معلقة
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          مدفوعات متأخرة
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {formatCurrency(summary?.overdue_amount || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary?.overdue_count || 0} متأخرة
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          مدفوعات اليوم
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-success" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">
                        {formatCurrency(summary?.today_payments || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary?.today_count || 0} دفعة
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Overdue Payments Table */}
                {summary?.overdue_payments && summary.overdue_payments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        مدفوعات متأخرة تحتاج متابعة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">رقم العقد</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                            <TableHead className="text-right">الأيام</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.overdue_payments.map((payment: any) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">{payment.contract_number}</TableCell>
                              <TableCell className="font-semibold text-destructive">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell>{payment.due_date}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">{payment.days_overdue} يوم</Badge>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline">
                                  متابعة
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab 2: Payments List - Full Table */}
          <TabsContent value="list" className="space-y-6">
            {/* Filters */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث برقم الدفعة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="pending">معلقة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الطرق" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الطرق</SelectItem>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  تصفية متقدمة
                </Button>
              </div>
            </Card>

            {/* Payments Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>قائمة المدفوعات ({filteredPayments.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      تصدير
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد مدفوعات</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الدفعة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الطريقة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.payment_number}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.payment_method === 'cash' && 'نقدي'}
                              {payment.payment_method === 'bank_transfer' && 'حوالة'}
                              {payment.payment_method === 'check' && 'شيك'}
                              {payment.payment_method === 'credit_card' && 'بطاقة'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString('ar-QA')}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(payment.payment_status)}>
                              {getStatusLabel(payment.payment_status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setIsPreviewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Tracking & Reconciliation */}
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

          {/* Tab 4: Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تحليلات المدفوعات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Charts وإحصائيات قيد التطوير</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>دفعة جديدة</DialogTitle>
            </DialogHeader>
            <PaymentForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                refetch();
                toast.success('تم تسجيل الدفعة بنجاح');
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <PaymentPreviewDialog
          payment={selectedPayment}
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
        />
      </div>
    </FinanceErrorBoundary>
  );
};

export default PaymentsComplete;

