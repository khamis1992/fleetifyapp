import { useState } from "react";
import { usePayments } from "@/hooks/usePayments";
import { PaymentForm } from "@/components/finance/PaymentForm";
import { PaymentAnalyticsCard } from "@/components/finance/PaymentAnalyticsCard";
import { PaymentChartsCard } from "@/components/finance/PaymentChartsCard";
import { PaymentExportCard } from "@/components/finance/PaymentExportCard";
import { PaymentSummaryCards } from "@/components/finance/PaymentSummaryCards";
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
import { Plus, Search, Filter, BarChart3, CreditCard, Eye, Download, TrendingUp, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });

  const { data: payments, isLoading, error } = usePayments();

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || filterStatus === 'all' || payment.status === filterStatus;
    const matchesMethod = !filterMethod || filterMethod === 'all' || payment.payment_method === filterMethod;
    return matchesSearch && matchesStatus && matchesMethod;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتملة';
      case 'pending': return 'معلقة';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'check': return 'شيك';
      case 'bank_transfer': return 'حوالة بنكية';
      case 'card': return 'بطاقة';
      default: return method;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'receipt': return 'قبض';
      case 'payment': return 'صرف';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'receipt': return 'bg-success/10 text-success border-success/20';
      case 'payment': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>المدفوعات</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">المدفوعات</h1>
              <p className="text-muted-foreground">إدارة المدفوعات والمقبوضات مع التكامل الكامل</p>
            </div>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            دفع جديد
          </Button>
        </div>

        {/* بطاقات الملخص */}
        <PaymentSummaryCards />

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">قائمة المدفوعات</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              التحليلات والتقارير
            </TabsTrigger>
            <TabsTrigger value="charts">
              <TrendingUp className="h-4 w-4 mr-2" />
              الرسوم البيانية
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    فلترة التقارير
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">من تاريخ</label>
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">إلى تاريخ</label>
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={() => {
                        setDateRange({ start: "", end: "" });
                      }}>
                        مسح التواريخ
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PaymentAnalyticsCard 
                    startDate={dateRange.start || undefined} 
                    endDate={dateRange.end || undefined} 
                  />
                </div>
                <div>
                  <PaymentExportCard 
                    startDate={dateRange.start || undefined} 
                    endDate={dateRange.end || undefined} 
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    فلترة الرسوم البيانية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">من تاريخ</label>
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">إلى تاريخ</label>
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={() => {
                        setDateRange({ start: "", end: "" });
                      }}>
                        مسح التواريخ
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <PaymentChartsCard 
                startDate={dateRange.start || undefined} 
                endDate={dateRange.end || undefined} 
              />
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            {/* فلاتر البحث */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  البحث والفلتر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="البحث برقم الدفع أو المرجع..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="حالة الدفع" />
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
                      <SelectValue placeholder="طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الطرق</SelectItem>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setFilterMethod("all");
                  }}>
                    مسح الفلاتر
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* جدول المدفوعات */}
            <Card>
              <CardHeader>
                <CardTitle>قائمة المدفوعات</CardTitle>
                <p className="text-sm text-muted-foreground">
                  إجمالي {filteredPayments.length} دفعة
                </p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive">حدث خطأ في تحميل البيانات</p>
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد مدفوعات</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      إنشاء أول دفعة
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم الدفع</TableHead>
                          <TableHead>النوع</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>طريقة الدفع</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>رقم المرجع</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {payment.payment_number}
                            </TableCell>
                            <TableCell>
                              <Badge className={getTypeColor(payment.payment_type)}>
                                {getTypeLabel(payment.payment_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(payment.payment_date).toLocaleDateString('ar-KW')}
                            </TableCell>
                            <TableCell className="font-mono">
                              {new Intl.NumberFormat('ar-KW', {
                                style: 'currency',
                                currency: payment.currency || 'KWD',
                                minimumFractionDigits: 3
                              }).format(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getMethodLabel(payment.payment_method)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(payment.status)}>
                                {getStatusLabel(payment.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {payment.reference_number || '-'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
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
        </Tabs>

        {/* نموذج إنشاء دفعة جديدة */}
        <PaymentForm
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          type="payment"
        />
      </div>
    </div>
  );
};

export default Payments;