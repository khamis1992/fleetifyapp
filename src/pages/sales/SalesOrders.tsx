import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalesOrders, useDeleteSalesOrder, type SalesOrder } from "@/hooks/useSalesOrders";
import { ShoppingCart, Plus, Search, Edit, Trash2, Package, TrendingUp, CheckCircle } from "lucide-react";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const statusTones: Record<string, string> = {
  pending: 'is-warn',
  confirmed: 'is-info',
  processing: 'is-warn',
  shipped: 'is-info',
  delivered: 'is-ok',
  cancelled: 'is-risk',
};

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
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

  const dwMetrics = [
    { label: 'إجمالي الطلبيات', value: statusCounts.all, hint: 'طلبية نشطة', accent: true },
    { label: 'قيد المعالجة', value: statusCounts.pending + statusCounts.confirmed + statusCounts.processing, hint: 'طلبية قيد التنفيذ', accent: false },
    { label: 'تم التسليم', value: statusCounts.delivered, hint: 'طلبية مكتملة', accent: false },
    { label: 'إجمالي الإيرادات', value: formatCurrency(totalRevenue), hint: `مكتمل: ${formatCurrency(deliveredRevenue)}`, accent: false },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المبيعات <span>/</span> الطلبيات
            </div>
            <h1>طلبيات المبيعات</h1>
            <p>متابعة وإدارة طلبيات المبيعات من الطلب حتى التسليم.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button dw-button-primary" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus size={17} />
              طلبية جديدة
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات الطلبيات">
          {dwMetrics.map((metric) => (
            <div key={metric.label} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
              <div className="dw-metric-top">
                <span>{metric.label}</span>
              </div>
              <strong>{metric.value}</strong>
              <div className="dw-metric-bottom">
                <small>{metric.hint}</small>
              </div>
            </div>
          ))}
        </section>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="قائمة الطلبيات"
            subtitle="عرض وإدارة جميع طلبيات المبيعات وتصفيتها"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 220 }}
                    placeholder="ابحث برقم الطلبية…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="بحث في الطلبيات"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="wk-field" style={{ width: 160 }}>
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
            }
          >
            <div className="wk-toolbar">
              <div className="dw-filters" role="group" aria-label="تصفية بالحالة">
                {([
                  { value: 'all', label: 'الكل', count: statusCounts.all },
                  { value: 'pending', label: 'قيد الانتظار', count: statusCounts.pending },
                  { value: 'processing', label: 'قيد المعالجة', count: statusCounts.processing },
                  { value: 'shipped', label: 'تم الشحن', count: statusCounts.shipped },
                  { value: 'delivered', label: 'تم التسليم', count: statusCounts.delivered },
                ] as const).map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    aria-pressed={activeTab === chip.value}
                    onClick={() => setActiveTab(chip.value)}
                  >
                    {chip.label}<span>{chip.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <PageLoading label="جاري تحميل الطلبيات…" />
            ) : filteredOrders.length === 0 ? (
              <PageEmpty icon={ShoppingCart} message="لا توجد طلبيات مطابقة" />
            ) : (
              <div className="wk-table-wrap">
                <table>
                  <caption className="sr-only">طلبيات المبيعات</caption>
                  <thead>
                    <tr>
                      <th scope="col">رقم الطلبية</th>
                      <th scope="col">تاريخ الطلب</th>
                      <th scope="col">تاريخ التسليم</th>
                      <th scope="col">الإجمالي</th>
                      <th scope="col">الحالة</th>
                      <th scope="col"><span className="sr-only">إجراءات</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td><strong><bdi>{order.order_number}</bdi></strong></td>
                        <td>{new Date(order.order_date).toLocaleDateString('en-GB')}</td>
                        <td>
                          {order.delivery_date
                            ? new Date(order.delivery_date).toLocaleDateString('en-GB')
                            : '-'}
                        </td>
                        <td>{formatCurrency(order.total || 0)}</td>
                        <td>
                          <span className={`wk-badge ${statusTones[order.status ?? ''] ?? 'is-neutral'}`}>
                            {getStatusLabel(order.status ?? '')}
                          </span>
                        </td>
                        <td>
                          <div className="wk-actions">
                            <button type="button" className="wk-action" title="تعديل" aria-label={`تعديل ${order.order_number}`} onClick={() => handleEditOrder(order)}>
                              <Edit size={15} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button type="button" className="wk-action" title="حذف" aria-label={`حذف ${order.order_number}`}>
                                  <Trash2 size={15} />
                                </button>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="dw-panel-foot">
              <TrendingUp size={14} />
              <span>{filteredOrders.length} طلبية معروضة بعد التصفية.</span>
            </div>
          </PagePanel>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة طلبية جديدة</DialogTitle>
            <DialogDescription>
              أدخل بيانات الطلبية الجديدة
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">نظام إدارة الطلبيات قيد التطوير</h3>
            <p className="text-muted-foreground mb-4">
              يمكنكم إنشاء الطلبيات يدوياً من خلال النظام الأساسي
            </p>
            <button type="button" className="dw-button" onClick={() => setIsCreateDialogOpen(false)}>
              إغلاق
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الطلبية {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              تحديث بيانات الطلبية — قيد التطوير
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">نموذج تعديل الطلبيات قيد التطوير</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrders;