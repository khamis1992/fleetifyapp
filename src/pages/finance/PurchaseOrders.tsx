import React, { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { usePurchaseOrders, useDeletePurchaseOrder, PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { PurchaseOrderForm } from '@/components/finance/PurchaseOrderForm';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { HelpIcon } from '@/components/help/HelpIcon';

const getStatusVariant = (status: PurchaseOrder['status']) => {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'pending_approval':
      return 'outline';
    case 'approved':
      return 'default';
    case 'sent_to_vendor':
      return 'default';
    case 'received':
      return 'default';
    case 'partially_received':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const getStatusText = (status: PurchaseOrder['status']) => {
  switch (status) {
    case 'draft':
      return 'مسودة';
    case 'pending_approval':
      return 'في انتظار الموافقة';
    case 'approved':
      return 'موافق عليه';
    case 'sent_to_vendor':
      return 'مرسل للمورد';
    case 'received':
      return 'مستلم';
    case 'partially_received':
      return 'مستلم جزئياً';
    case 'cancelled':
      return 'ملغي';
    default:
      return status;
  }
};

export default function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: purchaseOrders, isLoading, error } = usePurchaseOrders();
  const deletePurchaseOrder = useDeletePurchaseOrder();

  const filteredOrders = purchaseOrders?.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.vendor?.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await deletePurchaseOrder.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting purchase order:', error);
    }
  };

  const handleViewDetails = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const totalOrders = purchaseOrders?.length || 0;
  const totalAmount = purchaseOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
  const pendingOrders = purchaseOrders?.filter(order => 
    ['draft', 'pending_approval', 'approved', 'sent_to_vendor'].includes(order.status)
  ).length || 0;
  const completedOrders = purchaseOrders?.filter(order => 
    ['received', 'partially_received'].includes(order.status)
  ).length || 0;

  if (isLoading) {
    return <div className="p-6">جاري تحميل أوامر الشراء...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">خطأ في تحميل أوامر الشراء</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">أوامر الشراء</h1>
          <p className="text-muted-foreground">إدارة أوامر الشراء والموردين</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              أمر شراء جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء أمر شراء جديد</DialogTitle>
            </DialogHeader>
            <PurchaseOrderForm onSuccess={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الأوامر</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">القيمة الإجمالية</p>
                <p className="text-2xl font-bold">{totalAmount.toFixed(3)} د.ك</p>
              </div>
              <Download className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">قيد المعالجة</p>
                <p className="text-2xl font-bold text-orange-600">{pendingOrders}</p>
              </div>
              <Eye className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">مكتملة</p>
                <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
                  <CardTitle>أوامر الشراء</CardTitle>
                  <HelpIcon topic="debitCredit" />
                </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="البحث في أوامر الشراء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الأمر</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>تاريخ الأمر</TableHead>
                  <TableHead>تاريخ التسليم المتوقع</TableHead>
                  <TableHead>القيمة الإجمالية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.vendor?.vendor_name}</TableCell>
                    <TableCell>
                      {format(new Date(order.order_date), 'PPP', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {order.expected_delivery_date
                        ? format(new Date(order.expected_delivery_date), 'PPP', { locale: ar })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.total_amount.toFixed(3)} د.ك
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف أمر الشراء رقم {order.order_number}؟ 
                                هذا الإجراء لا يمكن التراجع عنه.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(order.id)}>
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
          </div>

          {filteredOrders?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لم يتم العثور على أوامر شراء</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل أمر الشراء</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">معلومات الأمر</h3>
                  <p><strong>رقم الأمر:</strong> {selectedOrder.order_number}</p>
                  <p><strong>تاريخ الأمر:</strong> {format(new Date(selectedOrder.order_date), 'PPP', { locale: ar })}</p>
                  <p><strong>تاريخ التسليم المتوقع:</strong> {
                    selectedOrder.expected_delivery_date 
                      ? format(new Date(selectedOrder.expected_delivery_date), 'PPP', { locale: ar })
                      : '-'
                  }</p>
                  <p><strong>الحالة:</strong> 
                    <Badge variant={getStatusVariant(selectedOrder.status)} className="ml-2">
                      {getStatusText(selectedOrder.status)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">معلومات المورد</h3>
                  <p><strong>اسم المورد:</strong> {selectedOrder.vendor?.vendor_name}</p>
                  <p><strong>شخص الاتصال:</strong> {selectedOrder.contact_person || '-'}</p>
                  <p><strong>الهاتف:</strong> {selectedOrder.phone || '-'}</p>
                  <p><strong>البريد الإلكتروني:</strong> {selectedOrder.email || '-'}</p>
                </div>
              </div>
              
              {selectedOrder.delivery_address && (
                <div>
                  <h3 className="font-semibold">عنوان التسليم</h3>
                  <p>{selectedOrder.delivery_address}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">الملخص المالي</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">المجموع الفرعي</p>
                    <p className="font-medium">{selectedOrder.subtotal.toFixed(3)} د.ك</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الضريبة</p>
                    <p className="font-medium">{selectedOrder.tax_amount.toFixed(3)} د.ك</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الإجمالي</p>
                    <p className="font-bold text-lg">{selectedOrder.total_amount.toFixed(3)} د.ك</p>
                  </div>
                </div>
              </div>

              {selectedOrder.terms_and_conditions && (
                <div>
                  <h3 className="font-semibold">الشروط والأحكام</h3>
                  <p>{selectedOrder.terms_and_conditions}</p>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <h3 className="font-semibold">ملاحظات</h3>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}