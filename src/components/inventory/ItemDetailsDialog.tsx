import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Package, Warehouse, TrendingUp, Clock, DollarSign, FileText } from "lucide-react";
import { type InventoryItem } from "@/hooks/useInventoryItems";
import { useItemStockLevels } from "@/hooks/useInventoryStockLevels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ItemDetailsDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ItemDetailsDialog = ({ item, open, onOpenChange }: ItemDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();

  // Fetch stock levels for this item
  const { data: stockLevels, isLoading: stockLoading } = useItemStockLevels(item?.id || "");

  // Fetch movement history
  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['inventory-movements', item?.id],
    queryFn: async () => {
      if (!item?.id || !user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          warehouse:inventory_warehouses(warehouse_name)
        `)
        .eq('item_id', item.id)
        .eq('company_id', user.profile.company_id)
        .order('movement_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!item?.id && !!user?.profile?.company_id && open,
  });

  // Fetch purchase order items
  const { data: purchaseOrders, isLoading: poLoading } = useQuery({
    queryKey: ['item-purchase-orders', item?.id],
    queryFn: async () => {
      if (!item?.id || !user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          purchase_order:purchase_orders(
            po_number,
            order_date,
            status,
            vendor:vendors(vendor_name)
          )
        `)
        .eq('item_id', item.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!item?.id && !!user?.profile?.company_id && open,
  });

  if (!item) return null;

  const totalStock = stockLevels?.reduce((sum, level) => sum + level.quantity_on_hand, 0) || 0;
  const totalAvailable = stockLevels?.reduce((sum, level) => sum + level.quantity_available, 0) || 0;
  const totalAllocated = stockLevels?.reduce((sum, level) => sum + level.quantity_allocated, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg text-white">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">{item.item_name}</DialogTitle>
              <DialogDescription>
                {item.item_code && `كود: ${item.item_code}`}
                {item.sku && ` | SKU: ${item.sku}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="stock">مستويات المخزون</TabsTrigger>
            <TabsTrigger value="history">سجل الحركات</TabsTrigger>
            <TabsTrigger value="purchase-orders">أوامر الشراء</TabsTrigger>
            <TabsTrigger value="pricing">التسعير</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المخزون</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStock}</div>
                  <p className="text-xs text-muted-foreground">{item.unit_of_measure}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المتاح للبيع</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
                  <p className="text-xs text-muted-foreground">المحجوز: {totalAllocated}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">القيمة الإجمالية</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(totalStock * item.cost_price).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">ريال سعودي</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>معلومات الصنف</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">النوع</p>
                    <Badge variant="outline">{item.item_type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الحالة</p>
                    <Badge variant={item.is_active ? "success" : "secondary"}>
                      {item.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الحد الأدنى</p>
                    <p className="text-sm">{item.min_stock_level} {item.unit_of_measure}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">نقطة إعادة الطلب</p>
                    <p className="text-sm">{item.reorder_point || "-"} {item.unit_of_measure}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">كمية الطلب</p>
                    <p className="text-sm">{item.reorder_quantity || "-"} {item.unit_of_measure}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الحد الأقصى</p>
                    <p className="text-sm">{item.max_stock_level || "-"} {item.unit_of_measure}</p>
                  </div>
                </div>
                {item.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الوصف</p>
                    <p className="text-sm">{item.description}</p>
                  </div>
                )}
                {item.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ملاحظات</p>
                    <p className="text-sm">{item.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Levels Tab */}
          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>مستويات المخزون حسب المستودع</CardTitle>
                <CardDescription>توزيع الكميات في المستودعات المختلفة</CardDescription>
              </CardHeader>
              <CardContent>
                {stockLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : !stockLevels || stockLevels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات مخزون
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المستودع</TableHead>
                        <TableHead>الكمية الفعلية</TableHead>
                        <TableHead>المحجوز</TableHead>
                        <TableHead>المتاح</TableHead>
                        <TableHead>القيمة</TableHead>
                        <TableHead>آخر حركة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockLevels.map((level) => (
                        <TableRow key={level.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Warehouse className="h-4 w-4" />
                              {level.warehouse_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{level.quantity_on_hand}</Badge>
                          </TableCell>
                          <TableCell>{level.quantity_allocated}</TableCell>
                          <TableCell>
                            <Badge variant="success">{level.quantity_available}</Badge>
                          </TableCell>
                          <TableCell>
                            {(level.quantity_on_hand * item.cost_price).toFixed(2)} ريال
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {level.last_movement_at
                              ? new Date(level.last_movement_at).toLocaleDateString('ar-SA')
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Movement History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>سجل حركات المخزون</CardTitle>
                <CardDescription>آخر 20 حركة للصنف</CardDescription>
              </CardHeader>
              <CardContent>
                {movementsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : !movements || movements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد حركات مسجلة
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المستودع</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>المرجع</TableHead>
                        <TableHead>الملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement: any) => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(movement.movement_date).toLocaleDateString('ar-SA')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              movement.movement_type === 'in' ? 'success' :
                              movement.movement_type === 'out' ? 'destructive' :
                              'secondary'
                            }>
                              {movement.movement_type === 'in' ? 'إدخال' :
                               movement.movement_type === 'out' ? 'إخراج' :
                               'تحويل'}
                            </Badge>
                          </TableCell>
                          <TableCell>{movement.warehouse?.warehouse_name || '-'}</TableCell>
                          <TableCell className={
                            movement.movement_type === 'in' ? 'text-green-600 font-semibold' :
                            movement.movement_type === 'out' ? 'text-red-600 font-semibold' :
                            ''
                          }>
                            {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                          </TableCell>
                          <TableCell className="text-xs">
                            {movement.reference_type && movement.reference_number ? (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {movement.reference_number}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs">{movement.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="purchase-orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>أوامر الشراء</CardTitle>
                <CardDescription>سجل أوامر شراء هذا الصنف</CardDescription>
              </CardHeader>
              <CardContent>
                {poLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : !purchaseOrders || purchaseOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد أوامر شراء مسجلة
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الأمر</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المورد</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الإجمالي</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.map((po: any) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">{po.purchase_order?.po_number || '-'}</TableCell>
                          <TableCell className="text-xs">
                            {po.purchase_order?.order_date
                              ? new Date(po.purchase_order.order_date).toLocaleDateString('ar-SA')
                              : '-'}
                          </TableCell>
                          <TableCell>{po.purchase_order?.vendor?.vendor_name || '-'}</TableCell>
                          <TableCell>{po.quantity} {item.unit_of_measure}</TableCell>
                          <TableCell>{po.unit_price.toFixed(2)} ريال</TableCell>
                          <TableCell className="font-semibold">
                            {(po.quantity * po.unit_price).toFixed(2)} ريال
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              po.purchase_order?.status === 'completed' ? 'success' :
                              po.purchase_order?.status === 'pending' ? 'warning' :
                              'secondary'
                            }>
                              {po.purchase_order?.status === 'completed' ? 'مكتمل' :
                               po.purchase_order?.status === 'pending' ? 'قيد الانتظار' :
                               po.purchase_order?.status || '-'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>سعر التكلفة</CardTitle>
                  <CardDescription>تكلفة الصنف</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {item.cost_price.toFixed(2)} ريال
                  </div>
                  <p className="text-sm text-muted-foreground">لكل {item.unit_of_measure}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>سعر البيع</CardTitle>
                  <CardDescription>سعر البيع للعملاء</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {item.unit_price.toFixed(2)} ريال
                  </div>
                  <p className="text-sm text-muted-foreground">لكل {item.unit_of_measure}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>هامش الربح</CardTitle>
                  <CardDescription>الربح لكل وحدة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {(item.unit_price - item.cost_price).toFixed(2)} ريال
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {((item.unit_price - item.cost_price) / item.unit_price * 100).toFixed(1)}% نسبة الربح
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>الربح المحتمل</CardTitle>
                  <CardDescription>على المخزون الحالي</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {((item.unit_price - item.cost_price) * totalAvailable).toFixed(2)} ريال
                  </div>
                  <p className="text-sm text-muted-foreground">
                    على {totalAvailable} {item.unit_of_measure} متاح
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
