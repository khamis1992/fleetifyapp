import { useState } from "react";
import { usePayments } from "@/hooks/useFinance";
import { usePaymentsSummary } from "@/hooks/usePaymentsSummary";
import { UnifiedPaymentForm } from "@/components/finance/UnifiedPaymentForm";
import { FinanceErrorBoundary } from "@/components/finance/FinanceErrorBoundary";
import { PaymentPreviewDialog } from "@/components/finance/PaymentPreviewDialog";
import { PaymentTracking } from "@/components/finance/PaymentTracking";
import { PaymentAssistantPanel } from "@/components/finance/PaymentAssistantPanel";
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
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple";
import { HelpIcon } from '@/components/help/HelpIcon';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * PaymentsUnified - صفحة المدفوعات الشاملة الموحدة
 * 
 * تدمج 3 صفحات في صفحة واحدة قوية:
 * 1. Payments.tsx → Tab: قائمة المدفوعات (الجدول الكامل)
 * 2. PaymentsDashboard.tsx → Tab: لوحة التحكم (KPIs + Summary)
 * 3. UnifiedPayments.tsx → Tab: التتبع والربط (التسوية البنكية)
 * 
 * + إضافة Tab جديد: التحليلات (Charts وإحصائيات)
 */

const PaymentsUnified = () => {
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

  // Filter payments
  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || filterStatus === "all" || payment.payment_status === filterStatus;
    const matchesMethod = !filterMethod || filterMethod === "all" || payment.payment_method === filterMethod;
    
    return matchesSearch && matchesStatus && matchesMethod;
  }) || [];

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'cleared': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled':
      case 'bounced': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
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

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'نقدي',
      check: 'شيك',
      bank_transfer: 'حوالة بنكية',
      credit_card: 'بطاقة ائتمان',
      debit_card: 'بطاقة خصم'
    };
    return labels[method] || method;
  };

  return (
    <FinanceErrorBoundary
      error={error ? new Error(error.message || 'خطأ في تحميل المدفوعات') : null}
      isLoading={isLoading}
      onRetry={refetch}
      title="خطأ في المدفوعات"
      context="صفحة المدفوعات الموحدة"
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
              <p className="text-muted-foreground">إدارة شاملة للمدفوعات والمقبوضات - 4 أقسام موحدة</p>
            </div>
          </div>
          
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            دفعة جديدة
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2 py-3">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">قائمة المدفوعات</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2 py-3">
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">التتبع والتسوية</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 py-3">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">التحليلات</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Dashboard - KPIs and Summary Cards */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-24 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Summary KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          إجمالي المدفوعات
                        </CardTitle>
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(summary?.total_payments || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary?.payments_count || payments?.length || 0} دفعة
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-yellow-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          مدفوعات معلقة
                        </CardTitle>
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(summary?.pending_amount || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary?.pending_count || 0} معلقة
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-red-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          مدفوعات متأخرة
                        </CardTitle>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(summary?.overdue_amount || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary?.overdue_count || 0} متأخرة
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-green-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          مدفوعات اليوم
                        </CardTitle>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(summary?.today_payments || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary?.today_count || 0} دفعة اليوم
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-auto py-4" onClick={() => setActiveTab('list')}>
                    <List className="h-5 w-5 mr-2" />
                    <div className="text-right">
                      <div className="font-semibold">عرض جميع المدفوعات</div>
                      <div className="text-xs text-muted-foreground">الجدول الكامل مع البحث والتصفية</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto py-4" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-5 w-5 mr-2" />
                    <div className="text-right">
                      <div className="font-semibold">تسجيل دفعة جديدة</div>
                      <div className="text-xs text-muted-foreground">إضافة دفعة من عميل</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto py-4" onClick={() => setActiveTab('tracking')}>
                    <GitBranch className="h-5 w-5 mr-2" />
                    <div className="text-right">
                      <div className="font-semibold">التتبع والتسوية</div>
                      <div className="text-xs text-muted-foreground">تسوية المدفوعات البنكية</div>
                    </div>
                  </Button>
                </div>

                {/* Overdue Payments Alert */}
                {summary?.overdue_payments && summary.overdue_payments.length > 0 && (
                  <Card className="border-2 border-red-200 bg-red-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-900">
                        <AlertCircle className="h-5 w-5" />
                        مدفوعات متأخرة تحتاج متابعة ({summary.overdue_payments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {summary.overdue_payments.slice(0, 5).map((payment: any) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div>
                              <p className="font-medium">{payment.contract_number}</p>
                              <p className="text-sm text-muted-foreground">{payment.customer_name}</p>
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-red-600">{formatCurrency(payment.amount)}</p>
                              <Badge variant="destructive" className="text-xs">{payment.days_overdue} يوم</Badge>
                            </div>
                          </div>
                        ))}
                        {summary.overdue_payments.length > 5 && (
                          <Button variant="link" onClick={() => setActiveTab('list')} className="w-full">
                            عرض جميع المدفوعات المتأخرة ({summary.overdue_payments.length})
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab 2: Payments List - Full Detailed Table */}
          <TabsContent value="list" className="space-y-6 mt-6">
            {/* Filters Bar */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث برقم الدفعة أو المرجع..."
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
                    <SelectItem value="bounced">مرتدة</SelectItem>
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
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    قائمة المدفوعات ({filteredPayments.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      تصدير Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">لا توجد مدفوعات</p>
                    <p className="text-sm">ابدأ بإضافة دفعة جديدة</p>
                    <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      دفعة جديدة
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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
                          <TableRow key={payment.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {payment.payment_number}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getMethodLabel(payment.payment_method)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: ar })}
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Tracking & Bank Reconciliation */}
          <TabsContent value="tracking" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  التتبع والتسوية البنكية
                  <HelpIcon topic="paymentTracking" />
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  تسوية المدفوعات مع كشوف الحساب البنكية
                </p>
              </CardHeader>
              <CardContent>
                <PaymentTracking />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Analytics & Charts */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>توزيع المدفوعات حسب الطريقة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>رسم بياني قيد التطوير</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>المدفوعات الشهرية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>رسم بياني قيد التطوير</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Payment Dialog - الموحد */}
        <UnifiedPaymentForm
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          type="customer_payment"
          onSuccess={() => {
            setIsCreateDialogOpen(false);
            refetch();
            toast.success('تم تسجيل الدفعة بنجاح');
          }}
          onCancel={() => setIsCreateDialogOpen(false)}
        />

        {/* Payment Preview Dialog */}
        <PaymentPreviewDialog
          payment={selectedPayment}
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
        />

        {/* مساعد الموظف للدفعات */}
        <PaymentAssistantPanel
          paymentData={{
            amount: 0,
            payment_method: 'cash',
          }}
          mode="floating"
          position="left"
        />
      </div>
    </FinanceErrorBoundary>
  );
};

export default PaymentsUnified;

