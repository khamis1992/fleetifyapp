import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useInventoryWarehouses, useCreateInventoryWarehouse, useUpdateInventoryWarehouse, useDeleteInventoryWarehouse, type InventoryWarehouse } from "@/hooks/useInventoryWarehouses";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Warehouse, Plus, Search, Edit, Trash2, MapPin, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

interface WarehouseFormData {
  warehouse_name: string;
  warehouse_name_ar?: string;
  warehouse_code?: string;
  location_address?: string;
  location_city?: string;
  location_country?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

const Warehouses = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<InventoryWarehouse | null>(null);

  const { data: warehouses, isLoading } = useInventoryWarehouses();
  const createWarehouse = useCreateInventoryWarehouse();
  const updateWarehouse = useUpdateInventoryWarehouse();
  const deleteWarehouse = useDeleteInventoryWarehouse();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<WarehouseFormData>({
    defaultValues: {
      is_active: true,
      location_country: "السعودية"
    }
  });

  const filteredWarehouses = warehouses?.filter(warehouse =>
    warehouse.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.warehouse_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.location_city?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreate = async (data: WarehouseFormData) => {
    try {
      await createWarehouse.mutateAsync(data);
      setIsCreateDialogOpen(false);
      reset();
    } catch (error) {
      console.error("Error creating warehouse:", error);
    }
  };

  const handleEdit = (warehouse: InventoryWarehouse) => {
    setSelectedWarehouse(warehouse);
    setValue("warehouse_name", warehouse.warehouse_name);
    setValue("warehouse_name_ar", warehouse.warehouse_name_ar || "");
    setValue("warehouse_code", warehouse.warehouse_code || "");
    setValue("location_address", warehouse.location_address || "");
    setValue("location_city", warehouse.location_city || "");
    setValue("location_country", warehouse.location_country || "السعودية");
    setValue("phone", warehouse.phone || "");
    setValue("email", warehouse.email || "");
    setValue("is_active", warehouse.is_active ?? true);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (data: WarehouseFormData) => {
    if (!selectedWarehouse) return;

    try {
      await updateWarehouse.mutateAsync({
        id: selectedWarehouse.id,
        data
      });
      setIsEditDialogOpen(false);
      setSelectedWarehouse(null);
      reset();
    } catch (error) {
      console.error("Error updating warehouse:", error);
    }
  };

  const handleDelete = async (warehouse: InventoryWarehouse) => {
    try {
      await deleteWarehouse.mutateAsync(warehouse.id);
    } catch (error) {
      console.error("Error deleting warehouse:", error);
    }
  };

  const WarehouseForm = ({ onSubmit, isEdit = false }: { onSubmit: (data: WarehouseFormData) => void; isEdit?: boolean }) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="warehouse_name">اسم المستودع (EN) *</Label>
          <Input
            id="warehouse_name"
            {...register("warehouse_name", { required: "اسم المستودع مطلوب" })}
            placeholder="Main Warehouse"
          />
          {errors.warehouse_name && (
            <p className="text-sm text-destructive">{errors.warehouse_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="warehouse_name_ar">اسم المستودع (AR)</Label>
          <Input
            id="warehouse_name_ar"
            {...register("warehouse_name_ar")}
            placeholder="المستودع الرئيسي"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="warehouse_code">كود المستودع</Label>
          <Input
            id="warehouse_code"
            {...register("warehouse_code")}
            placeholder="WH-001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">المدينة</Label>
          <Input
            id="city"
            {...register("location_city")}
            placeholder="الرياض"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location_address">العنوان</Label>
        <Input
          id="location_address"
          {...register("location_address")}
          placeholder="شارع الملك فهد، حي العليا"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_phone">رقم الهاتف</Label>
          <Input
            id="contact_phone"
            {...register("phone")}
            placeholder="+966 50 123 4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">البريد الإلكتروني</Label>
          <Input
            id="contact_email"
            type="email"
            {...register("email")}
            placeholder="warehouse@company.com"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={createWarehouse.isPending || updateWarehouse.isPending}>
          {createWarehouse.isPending || updateWarehouse.isPending ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              جاري الحفظ...
            </>
          ) : (
            isEdit ? "تحديث" : "إضافة"
          )}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المخزون <span>/</span> المستودعات
            </div>
            <h1>إدارة المستودعات</h1>
            <p>إدارة وتنظيم المستودعات ومواقع التخزين.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button dw-button-primary" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus size={17} />
              مستودع جديد
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات المستودعات">
          <div className="dw-metric dw-metric-accent">
            <div className="dw-metric-top"><span>إجمالي المستودعات</span><Warehouse size={19} /></div>
            <strong>{warehouses?.length || 0}</strong>
            <div className="dw-metric-bottom"><small>مستودع نشط</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>المدن</span><MapPin size={19} /></div>
            <strong>{new Set(warehouses?.map(w => w.location_city).filter(Boolean)).size || 0}</strong>
            <div className="dw-metric-bottom"><small>موقع جغرافي</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>مستودعات نشطة</span><Warehouse size={19} /></div>
            <strong>{warehouses?.filter(w => w.is_active).length || 0}</strong>
            <div className="dw-metric-bottom"><small>قيد التشغيل</small></div>
          </div>
        </section>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="قائمة المستودعات"
            subtitle="عرض وإدارة جميع المستودعات"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 240 }}
                    placeholder="ابحث بالاسم، الكود، المدينة…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="بحث في المستودعات"
                  />
                </div>
              </div>
            }
          >
            {isLoading ? (
              <PageLoading label="جاري تحميل المستودعات…" />
            ) : filteredWarehouses.length === 0 ? (
              <PageEmpty icon={Warehouse} message="لا توجد مستودعات">
                <button type="button" className="dw-button" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus size={16} />
                  إضافة مستودع
                </button>
              </PageEmpty>
            ) : (
              <div className="wk-table-wrap">
                <table>
                  <caption className="sr-only">المستودعات</caption>
                  <thead>
                    <tr>
                      <th scope="col">المستودع</th>
                      <th scope="col">الكود</th>
                      <th scope="col">الموقع</th>
                      <th scope="col">جهة الاتصال</th>
                      <th scope="col">الحالة</th>
                      <th scope="col"><span className="sr-only">إجراءات</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWarehouses.map((warehouse) => (
                      <tr key={warehouse.id}>
                        <td>
                          <strong><bdi>{warehouse.warehouse_name}</bdi></strong>
                          {warehouse.warehouse_name_ar && <span className="wk-sub">{warehouse.warehouse_name_ar}</span>}
                        </td>
                        <td>{warehouse.warehouse_code || "-"}</td>
                        <td>
                          {warehouse.location_city ? `${warehouse.location_city}${warehouse.location_country ? `, ${warehouse.location_country}` : ''}` : "-"}
                          {warehouse.location_address && <span className="wk-sub">{warehouse.location_address}</span>}
                        </td>
                        <td>
                          {warehouse.phone && (
                            <span className="wk-sub">
                              <Phone size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                              <bdi>{warehouse.phone}</bdi>
                            </span>
                          )}
                          {warehouse.email && (
                            <span className="wk-sub">
                              <Mail size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                              <bdi>{warehouse.email}</bdi>
                            </span>
                          )}
                          {!warehouse.phone && !warehouse.email && <span className="wk-sub">-</span>}
                        </td>
                        <td>
                          <span className={`wk-badge ${warehouse.is_active ? 'is-ok' : 'is-neutral'}`}>
                            {warehouse.is_active ? "نشط" : "غير نشط"}
                          </span>
                        </td>
                        <td>
                          <div className="wk-actions">
                            <button type="button" className="wk-action" title="تعديل" aria-label={`تعديل ${warehouse.warehouse_name}`} onClick={() => handleEdit(warehouse)}>
                              <Edit size={15} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button type="button" className="wk-action" title="حذف" aria-label={`حذف ${warehouse.warehouse_name}`}>
                                  <Trash2 size={15} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف المستودع "{warehouse.warehouse_name}". هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(warehouse)}
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
              <Warehouse size={14} />
              <span>{filteredWarehouses.length} مستودع معروض.</span>
            </div>
          </PagePanel>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة مستودع جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات المستودع الجديد
            </DialogDescription>
          </DialogHeader>
          <WarehouseForm onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المستودع</DialogTitle>
            <DialogDescription>
              تحديث بيانات المستودع
            </DialogDescription>
          </DialogHeader>
          <WarehouseForm onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Warehouses;
