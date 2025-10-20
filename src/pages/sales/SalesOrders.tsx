import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalesOrders, useDeleteSalesOrder, type SalesOrder } from "@/hooks/useSalesOrders";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ShoppingCart, Plus, Search, Edit, Trash2, Package, TrendingUp, CheckCircle } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const SalesOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const { data: orders, isLoading } = useSalesOrders({
    search: searchTerm,
    is_active: true,
  });
  const deleteOrder = useDeleteSalesOrder();

  const filteredOrders = orders?.filter(order => {
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    const matchesTab = activeTab === "all" || order.status === activeTab;
    return matchesStatus && matchesTab;
  }) || [];

  const handleDeleteOrder = async (order: SalesOrder) => {
    try {
      await deleteOrder.mutateAsync(order.id);
    } catch (error) {
      console.error("Error deleting sales order:", error);
    }
  };

  const handleEditOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'confirmed':
        return 'secondary';
      case 'processing':
        return 'warning';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const statusCounts = {
    all: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
    processing: orders?.filter(o => o.status === 'processing').length || 0,
    shipped: orders?.filter(o => o.status === 'shipped').length || 0,
    delivered: orders?.filter(o => o.status === 'delivered').length || 0,
  };

  const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  const deliveredRevenue = orders?.filter(o => o.status === 'delivered').reduce((sum, order) => sum + (order.total || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/sales/pipeline">المبيعات</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>الطلبيات</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">طلبيات المبيعات</h1>
            <p className="text-muted-foreground">متابعة وإدارة طلبيات المبيعات</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              طلبية جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة طلبية جديدة</DialogTitle>
              <DialogDescription>
                أدخل بيانات الطلبية الجديدة
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 text-center text-muted-foreground">
              نموذج إضافة الطلبية سيتم إضافته قريباً
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبيات</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <p className="text-xs text-muted-foreground">طلبية نشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد المعالجة</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statusCounts.pending + statusCounts.confirmed + statusCounts.processing}
            </div>
            <p className="text-xs text-muted-foreground">طلبية قيد التنفيذ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تم التسليم</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.delivered}</div>
            <p className="text-xs text-muted-foreground">طلبية مكتملة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              مكتمل: {formatCurrency(deliveredRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة الطلبيات</CardTitle>
              <CardDescription>عرض وإدارة جميع طلبيات المبيعات</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">الكل ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="pending">قيد الانتظار ({statusCounts.pending})</TabsTrigger>
              <TabsTrigger value="processing">قيد المعالجة ({statusCounts.processing})</TabsTrigger>
              <TabsTrigger value="shipped">تم الشحن ({statusCounts.shipped})</TabsTrigger>
              <TabsTrigger value="delivered">تم التسليم ({statusCounts.delivered})</TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن طلبية (رقم الطلبية)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="confirmed">مؤكد</SelectItem>
                  <SelectItem value="processing">قيد المعالجة</SelectItem>
                  <SelectItem value="shipped">تم الشحن</SelectItem>
                  <SelectItem value="delivered">تم التسليم</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبيات
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلبية</TableHead>
                      <TableHead>تاريخ الطلب</TableHead>
                      <TableHead>تاريخ التسليم</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.order_date).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.delivery_date
                            ? new Date(order.delivery_date).toLocaleDateString('ar-SA')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.total || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف الطلبية "{order.order_number}". هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteOrder(order)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOrders;
