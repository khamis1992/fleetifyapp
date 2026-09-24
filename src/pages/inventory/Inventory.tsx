import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryItems, useDeleteInventoryItem, useLowStockItems, type InventoryItem } from "@/hooks/useInventoryItems";
import { useInventoryWarehouses } from "@/hooks/useInventoryWarehouses";
import { useInventoryStockLevels, useItemStockLevels } from "@/hooks/useInventoryStockLevels";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";
import { Package, Plus, Search, Eye, Edit, Trash2, AlertTriangle, Warehouse, TrendingDown, Settings } from "lucide-react";
import { ItemDetailsDialog } from "@/components/inventory/ItemDetailsDialog";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { AddInventoryItemForm } from "@/components/inventory/AddInventoryItemForm";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("items");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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
    setIsDetailsDialogOpen(true);
  };

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsDialogOpen(true);
  };

  const handleAdjustStock = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAdjustmentDialogOpen(true);
  };

  const stockBadgeTone = (item: InventoryItem) => {
    const minLevel = item.min_stock_level ?? 0;
    const reorderPoint = item.reorder_point ?? minLevel;
    if (minLevel === 0) return 'is-ok';
    if (item.min_stock_level && reorderPoint && item.reorder_point === item.min_stock_level) return 'is-ok';
    return 'is-ok';
  };

  const getStockIndicator = (item: InventoryItem, currentStock?: number) => {
    const stock = currentStock || 0;
    const minLevel = item.min_stock_level ?? 0;
    const reorderPoint = item.reorder_point ?? minLevel;

    if (stock === 0) {
      return { label: "نفذ", tone: "is-risk" as const };
    } else if (stock < minLevel) {
      return { label: "منخفض جداً", tone: "is-risk" as const };
    } else if (stock <= reorderPoint) {
      return { label: "منخفض", tone: "is-warn" as const };
    } else {
      return { label: "طبيعي", tone: "is-ok" as const };
    }
  };

  const dwMetrics = [
    { label: 'إجمالي الأصناف', value: items?.length || 0, hint: 'صنف نشط', accent: true },
    { label: 'مخزون منخفض', value: lowStockItems?.length || 0, hint: 'صنف يحتاج إعادة طلب', accent: false },
    { label: 'المستودعات', value: warehouses?.length || 0, hint: 'مستودع نشط', accent: false },
    { label: 'مخزون بدون حركة', value: 0, hint: 'صنف راكد', accent: false },
  ];

  const tabs = [
    { value: 'items', label: 'جميع الأصناف' },
    { value: 'low-stock', label: 'مخزون منخفض' },
    { value: 'stock-levels', label: 'مستويات المخزون' },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المخزون <span>/</span> الأصناف
            </div>
            <h1>إدارة المخزون</h1>
            <p>متابعة الأصناف والمخزون في جميع المستودعات.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button dw-button-primary" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus size={17} />
              صنف جديد
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات المخزون">
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
            title="الأصناف المخزنية"
            subtitle="عرض وإدارة جميع الأصناف ومستويات مخزونها"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 240 }}
                    placeholder="ابحث بالاسم، الكود، SKU…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="بحث في الأصناف"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="wk-field" style={{ width: 160 }}>
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
                  <SelectTrigger className="wk-field" style={{ width: 160 }}>
                    <SelectValue placeholder="المستودع" />
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
            }
          >
            <div className="wk-toolbar">
              <div className="dw-filters" role="group" aria-label="أقسام المخزون">
                {tabs.map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={activeTab === tab.value}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Tab */}
            {activeTab === 'items' && (
              itemsLoading ? (
                <PageLoading label="جاري تحميل الأصناف…" />
              ) : filteredItems.length === 0 ? (
                <PageEmpty icon={Package} message="لا توجد أصناف مخزنية">
                  <button type="button" className="dw-button" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus size={16} />
                    إضافة صنف جديد
                  </button>
                </PageEmpty>
              ) : (
                <div className="wk-table-wrap">
                  <table>
                    <caption className="sr-only">الأصناف المخزنية</caption>
                    <thead>
                      <tr>
                        <th scope="col">الصنف</th>
                        <th scope="col">الكود</th>
                        <th scope="col">SKU</th>
                        <th scope="col">حالة المخزون</th>
                        <th scope="col">الوحدة</th>
                        <th scope="col">سعر البيع</th>
                        <th scope="col">النوع</th>
                        <th scope="col">الحالة</th>
                        <th scope="col"><span className="sr-only">إجراءات</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => {
                        const stockIndicator = getStockIndicator(item);
                        return (
                          <tr key={item.id}>
                            <td>
                              <strong><bdi>{item.item_name}</bdi></strong>
                              {item.item_name_ar && <span className="wk-sub">{item.item_name_ar}</span>}
                            </td>
                            <td>{item.item_code || "-"}</td>
                            <td>{item.sku || "-"}</td>
                            <td>
                              <span className={`wk-badge ${stockIndicator.tone}`}>
                                {stockIndicator.label}
                              </span>
                              {item.reorder_point && (
                                <span className="wk-sub">إعادة طلب: {item.reorder_point}</span>
                              )}
                            </td>
                            <td>{item.unit_of_measure}</td>
                            <td>{(item.unit_price ?? 0).toFixed(2)} ريال</td>
                            <td>
                              <span className="wk-badge is-neutral">{item.item_type}</span>
                            </td>
                            <td>
                              <span className={`wk-badge ${item.is_active ? 'is-ok' : 'is-neutral'}`}>
                                {item.is_active ? "نشط" : "غير نشط"}
                              </span>
                            </td>
                            <td>
                              <div className="wk-actions">
                                <button type="button" className="wk-action" title="عرض التفاصيل" aria-label={`عرض ${item.item_name}`} onClick={() => handleViewDetails(item)}>
                                  <Eye size={15} />
                                </button>
                                <button type="button" className="wk-action" title="تسوية المخزون" aria-label={`تسوية مخزون ${item.item_name}`} onClick={() => handleAdjustStock(item)}>
                                  <Settings size={15} />
                                </button>
                                <button type="button" className="wk-action" title="تعديل" aria-label={`تعديل ${item.item_name}`} onClick={() => handleEditItem(item)}>
                                  <Edit size={15} />
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button type="button" className="wk-action" title="حذف" aria-label={`حذف ${item.item_name}`}>
                                      <Trash2 size={15} />
                                    </button>
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
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Low Stock Tab */}
            {activeTab === 'low-stock' && (
              lowStockLoading ? (
                <PageLoading label="جاري تحميل الأصناف منخفضة المخزون…" />
              ) : !lowStockItems || lowStockItems.length === 0 ? (
                <PageEmpty icon={AlertTriangle} message="لا توجد أصناف بمخزون منخفض" />
              ) : (
                <div className="wk-table-wrap">
                  <table>
                    <caption className="sr-only">الأصناف منخفضة المخزون</caption>
                    <thead>
                      <tr>
                        <th scope="col">الصنف</th>
                        <th scope="col">الكمية المتاحة</th>
                        <th scope="col">الحد الأدنى</th>
                        <th scope="col">النقص</th>
                        <th scope="col">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item: any) => (
                        <tr key={item.id}>
                          <td><strong><bdi>{item.item_name}</bdi></strong></td>
                          <td>
                            <span className="wk-badge is-risk">{item.quantity_available}</span>
                          </td>
                          <td>{item.min_stock_level}</td>
                          <td>
                            <span className="wk-badge is-risk">-{item.shortage}</span>
                          </td>
                          <td>
                            <span className="wk-badge is-warn">يحتاج إعادة طلب</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Stock Levels Tab */}
            {activeTab === 'stock-levels' && (
              !stockLevels || stockLevels.length === 0 ? (
                <PageEmpty icon={Warehouse} message="لا توجد بيانات مخزون" />
              ) : (
                <div className="wk-table-wrap">
                  <table>
                    <caption className="sr-only">مستويات المخزون</caption>
                    <thead>
                      <tr>
                        <th scope="col">الصنف</th>
                        <th scope="col">المستودع</th>
                        <th scope="col">الكمية الفعلية</th>
                        <th scope="col">المحجوز</th>
                        <th scope="col">المتاح</th>
                        <th scope="col">آخر حركة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLevels.map((level) => (
                        <tr key={level.id}>
                          <td><strong><bdi>{level.item_name}</bdi></strong></td>
                          <td>{level.warehouse_name}</td>
                          <td>{level.quantity_on_hand}</td>
                          <td>{level.quantity_allocated}</td>
                          <td>
                            <span className="wk-badge is-info">{level.quantity_available}</span>
                          </td>
                          <td>
                            {level.last_movement_at
                              ? new Date(level.last_movement_at).toLocaleDateString('en-GB')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
            <div className="dw-panel-foot">
              <Warehouse size={14} />
              <span>جميع الأسعار بالريال القطري (QAR).</span>
            </div>
          </PagePanel>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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