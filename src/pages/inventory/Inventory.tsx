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
import { useInventoryItems, useDeleteInventoryItem, useLowStockItems, type InventoryItem } from "@/hooks/useInventoryItems";
import { useInventoryWarehouses } from "@/hooks/useInventoryWarehouses";
import { useInventoryStockLevels, useItemStockLevels } from "@/hooks/useInventoryStockLevels";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Package, Plus, Search, Eye, Edit, Trash2, AlertTriangle, Warehouse, TrendingDown, Settings } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ItemDetailsDialog } from "@/components/inventory/ItemDetailsDialog";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { AddInventoryItemForm } from "@/components/inventory/AddInventoryItemForm";

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("items");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data: items, isLoading: itemsLoading } = useInventoryItems({
    search: searchTerm,
  });
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockItems();
  const { data: warehouses } = useInventoryWarehouses();
  const { data: categories } = useInventoryCategories({ is_active: true });
  const { data: stockLevels } = useInventoryStockLevels(selectedWarehouse !== "all" ? selectedWarehouse : undefined);
  const deleteItem = useDeleteInventoryItem();

  const filteredItems = items?.filter(item => {
    const matchesSearch = !searchTerm ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  }) || [];

  const handleDeleteItem = async (item: InventoryItem) => {
    try {
      await deleteItem.mutateAsync(item.id);
    } catch (error) {
      console.error("Error deleting inventory item:", error);
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsDialogOpen(true);
  };

  const handleAdjustStock = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAdjustmentDialogOpen(true);
  };

  const getStockBadgeVariant = (quantity: number, minLevel: number, reorderPoint?: number) => {
    if (quantity === 0) return "destructive";
    if (quantity < minLevel) return "destructive";
    if (reorderPoint && quantity <= reorderPoint) return "warning";
    return "success";
  };

  const getStockIndicator = (item: InventoryItem, currentStock?: number) => {
    const stock = currentStock || 0;
    const minLevel = item.min_stock_level;
    const reorderPoint = item.reorder_point || minLevel;

    if (stock === 0) {
      return { label: "نفذ", color: "bg-red-500", textColor: "text-red-600" };
    } else if (stock < minLevel) {
      return { label: "منخفض جداً", color: "bg-red-500", textColor: "text-red-600" };
    } else if (stock <= reorderPoint) {
      return { label: "منخفض", color: "bg-orange-500", textColor: "text-orange-600" };
    } else {
      return { label: "طبيعي", color: "bg-green-500", textColor: "text-green-600" };
    }
  };

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
            <BreadcrumbPage>إدارة المخزون</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة المخزون</h1>
            <p className="text-muted-foreground">متابعة الأصناف والمخزون في جميع المستودعات</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              صنف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة صنف جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات الصنف الجديد لإضافته إلى المخزون. جميع الأسعار بالريال القطري (QAR)
              </DialogDescription>
            </DialogHeader>
            <AddInventoryItemForm onSuccess={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأصناف</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items?.length || 0}</div>
            <p className="text-xs text-muted-foreground">صنف نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مخزون منخفض</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems?.length || 0}</div>
            <p className="text-xs text-muted-foreground">صنف يحتاج إعادة طلب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستودعات</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">مستودع نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مخزون بدون حركة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">صنف راكد</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>الأصناف المخزنية</CardTitle>
              <CardDescription>عرض وإدارة جميع الأصناف المخزنية</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="items">جميع الأصناف</TabsTrigger>
              <TabsTrigger value="low-stock">مخزون منخفض</TabsTrigger>
              <TabsTrigger value="stock-levels">مستويات المخزون</TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن صنف (الاسم، الكود، SKU، الباركود)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التصنيفات</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="اختر المستودع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستودعات</SelectItem>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.warehouse_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4">
              {itemsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد أصناف مخزنية
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصنف</TableHead>
                      <TableHead>الكود</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>حالة المخزون</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead>سعر البيع</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const stockIndicator = getStockIndicator(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{item.item_name}</div>
                              {item.item_name_ar && (
                                <div className="text-xs text-muted-foreground">{item.item_name_ar}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.item_code || "-"}</TableCell>
                          <TableCell>{item.sku || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${stockIndicator.color}`} />
                              <span className={`text-sm font-medium ${stockIndicator.textColor}`}>
                                {stockIndicator.label}
                              </span>
                            </div>
                            {item.reorder_point && (
                              <p className="text-xs text-muted-foreground">
                                إعادة طلب: {item.reorder_point}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{item.unit_of_measure}</TableCell>
                          <TableCell>{item.unit_price.toFixed(2)} ريال</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.item_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? "success" : "secondary"}>
                              {item.is_active ? "نشط" : "غير نشط"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(item)}
                                title="عرض التفاصيل"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAdjustStock(item)}
                                title="تسوية المخزون"
                              >
                                <Settings className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                                title="تعديل"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" title="حذف">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      سيتم حذف الصنف "{item.item_name}" من المخزون. هذا الإجراء لا يمكن التراجع عنه.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteItem(item)}
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Low Stock Tab */}
            <TabsContent value="low-stock" className="space-y-4">
              {lowStockLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : !lowStockItems || lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد أصناف بمخزون منخفض
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصنف</TableHead>
                      <TableHead>الكمية المتاحة</TableHead>
                      <TableHead>الحد الأدنى</TableHead>
                      <TableHead>النقص</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {item.quantity_available}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.min_stock_level}</TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          -{item.shortage}
                        </TableCell>
                        <TableCell>
                          <Badge variant="warning">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            يحتاج إعادة طلب
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Stock Levels Tab */}
            <TabsContent value="stock-levels" className="space-y-4">
              {!stockLevels || stockLevels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات مخزون
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصنف</TableHead>
                      <TableHead>المستودع</TableHead>
                      <TableHead>الكمية الفعلية</TableHead>
                      <TableHead>المحجوز</TableHead>
                      <TableHead>المتاح</TableHead>
                      <TableHead>آخر حركة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockLevels.map((level) => (
                      <TableRow key={level.id}>
                        <TableCell className="font-medium">{level.item_name}</TableCell>
                        <TableCell>{level.warehouse_name}</TableCell>
                        <TableCell>{level.quantity_on_hand}</TableCell>
                        <TableCell>{level.quantity_allocated}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {level.quantity_available}
                          </Badge>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ItemDetailsDialog
        item={selectedItem}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
      <StockAdjustmentDialog
        item={selectedItem}
        open={isAdjustmentDialogOpen}
        onOpenChange={setIsAdjustmentDialogOpen}
      />
    </div>
  );
};

export default Inventory;
