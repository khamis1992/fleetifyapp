import { useState } from "react";
import { usePayments } from "@/hooks/useFinance";
import { PaymentForm } from "@/components/finance/PaymentForm";
import { PaymentAnalyticsCard } from "@/components/finance/PaymentAnalyticsCard";
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
import { Plus, Search, Filter, BarChart3, CreditCard, Eye, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });

  const { data: payments, isLoading, error } = usePayments();

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
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'cleared': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'bounced': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتملة';
      case 'cleared': return 'مقاصة';
      case 'pending': return 'معلقة';
      case 'cancelled': return 'ملغاة';
      case 'bounced': return 'مرتدة';
      default: return status;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'check': return 'شيك';
      case 'bank_transfer': return 'حوالة بنكية';
      case 'credit_card': return 'بطاقة ائتمان';
      case 'debit_card': return 'بطاقة خصم';
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

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">قائمة المدفوعات</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              التحليلات والتقارير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>فلترة التقارير</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </CardContent>
              </Card>
              
              <PaymentAnalyticsCard 
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
                       <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                       <SelectItem value="debit_card">بطاقة خصم</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("");
                    setFilterMethod("");
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
                           <TableHead>الإجراءات</TableHead>
                           <TableHead>رقم المرجع</TableHead>
                           <TableHead>الحالة</TableHead>
                           <TableHead>طريقة الدفع</TableHead>
                           <TableHead>المبلغ</TableHead>
                           <TableHead>التاريخ</TableHead>
                           <TableHead>النوع</TableHead>
                           <TableHead>رقم الدفع</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                           <TableRow key={payment.id}>
                             <TableCell>
                               <Button 
                                 variant="ghost" 
                                 size="sm"
                                 onClick={() => {
                                   setSelectedPayment(payment);
                                   setIsPreviewDialogOpen(true);
                                 }}
                               >
                                 <Eye className="h-4 w-4" />
                               </Button>
                             </TableCell>
                             <TableCell className="text-muted-foreground">
                               {payment.reference_number || '-'}
                             </TableCell>
                             <TableCell>
                               <Badge className={getStatusColor(payment.payment_status)}>
                                 {getStatusLabel(payment.payment_status)}
                               </Badge>
                             </TableCell>
                             <TableCell>
                               <Badge variant="outline">
                                 {getMethodLabel(payment.payment_method)}
                               </Badge>
                             </TableCell>
                             <TableCell className="font-mono">
                               {new Intl.NumberFormat('ar-KW', {
                                 style: 'currency',
                                 currency: payment.currency || 'KWD',
                                 minimumFractionDigits: 3
                               }).format(payment.amount)}
                             </TableCell>
                             <TableCell>
                               {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                             </TableCell>
                             <TableCell>
                               <Badge className={getTypeColor((payment as any).transaction_type)}>
                                 {getTypeLabel((payment as any).transaction_type)}
                               </Badge>
                             </TableCell>
                             <TableCell className="font-medium">
                               {payment.payment_number}
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

        {/* مكون معاينة تفاصيل الدفعة */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل الدفعة</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">رقم الدفعة</label>
                    <p className="font-medium">{selectedPayment.payment_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">نوع الدفعة</label>
                    <Badge className={getTypeColor((selectedPayment as any).transaction_type)}>
                      {getTypeLabel((selectedPayment as any).transaction_type)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">تاريخ الدفعة</label>
                    <p className="font-medium">
                      {new Date(selectedPayment.payment_date).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">المبلغ</label>
                    <p className="font-medium text-lg font-mono">
                      {new Intl.NumberFormat('ar-KW', {
                        style: 'currency',
                        currency: selectedPayment.currency || 'KWD',
                        minimumFractionDigits: 3
                      }).format(selectedPayment.amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">طريقة الدفع</label>
                    <p className="font-medium">{getMethodLabel(selectedPayment.payment_method)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الحالة</label>
                    <Badge className={getStatusColor(selectedPayment.payment_status)}>
                      {getStatusLabel(selectedPayment.payment_status)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">العملة</label>
                    <p className="font-medium">{selectedPayment.currency}</p>
                  </div>
                  
                  {/* القيد المحاسبي المرتبط */}
                  {(selectedPayment as any).journal_entry_id && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">القيد المحاسبي</label>
                      <div className="flex items-center gap-2 mt-1">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                          قيد محاسبي #{(selectedPayment as any).journal_entry_id?.slice(-8)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* تفاصيل بنكية إضافية */}
                  {(selectedPayment.payment_method === 'bank_transfer' || selectedPayment.payment_method === 'check') && (
                    <>
                      {selectedPayment.bank_account && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">الحساب البنكي</label>
                          <p className="font-medium font-mono">{selectedPayment.bank_account}</p>
                        </div>
                      )}
                      {(selectedPayment as any).check_number && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">رقم الشيك</label>
                          <p className="font-medium">{(selectedPayment as any).check_number}</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {selectedPayment.reference_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">رقم المرجع</label>
                      <p className="font-medium">{selectedPayment.reference_number}</p>
                    </div>
                  )}
                </div>
                
                {selectedPayment.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ملاحظات</label>
                    <p className="text-sm bg-muted p-3 rounded-md mt-1">
                      {selectedPayment.notes}
                    </p>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                      <span>تاريخ الإنشاء: </span>
                      {new Date(selectedPayment.created_at).toLocaleString('en-GB')}
                    </div>
                    <div>
                      <span>آخر تحديث: </span>
                      {new Date(selectedPayment.updated_at).toLocaleString('en-GB')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Payments;