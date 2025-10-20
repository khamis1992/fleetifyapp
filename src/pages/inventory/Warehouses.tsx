import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useInventoryWarehouses, useCreateInventoryWarehouse, useUpdateInventoryWarehouse, useDeleteInventoryWarehouse, type InventoryWarehouse } from "@/hooks/useInventoryWarehouses";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Warehouse, Plus, Search, Edit, Trash2, MapPin, Phone, Mail } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useForm } from "react-hook-form";

interface WarehouseFormData {
  warehouse_name: string;
  warehouse_name_ar?: string;
  warehouse_code?: string;
  location_address?: string;
  city?: string;
  country?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
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
      country: "السعودية"
    }
  });

  const filteredWarehouses = warehouses?.filter(warehouse =>
    warehouse.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.warehouse_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.city?.toLowerCase().includes(searchTerm.toLowerCase())
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
    setValue("city", warehouse.city || "");
    setValue("country", warehouse.country || "السعودية");
    setValue("contact_phone", warehouse.contact_phone || "");
    setValue("contact_email", warehouse.contact_email || "");
    setValue("notes", warehouse.notes || "");
    setValue("is_active", warehouse.is_active);
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
            {...register("city")}
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
            {...register("contact_phone")}
            placeholder="+966 50 123 4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">البريد الإلكتروني</Label>
          <Input
            id="contact_email"
            type="email"
            {...register("contact_email")}
            placeholder="warehouse@company.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="ملاحظات إضافية..."
          rows={3}
        />
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/inventory">إدارة المخزون</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>المستودعات</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl text-white">
            <Warehouse className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة المستودعات</h1>
            <p className="text-muted-foreground">إدارة وتنظيم المستودعات ومواقع التخزين</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              مستودع جديد
            </Button>
          </DialogTrigger>
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستودعات</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">مستودع نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدن</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(warehouses?.map(w => w.city).filter(Boolean)).size || 0}
            </div>
            <p className="text-xs text-muted-foreground">موقع جغرافي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مستودعات محلية</CardTitle>
            <Warehouse className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses?.filter(w => w.country === "السعودية").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">داخل المملكة</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة المستودعات</CardTitle>
              <CardDescription>عرض وإدارة جميع المستودعات</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث عن مستودع (الاسم، الكود، المدينة)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredWarehouses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد مستودعات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستودع</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>الموقع</TableHead>
                  <TableHead>جهة الاتصال</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{warehouse.warehouse_name}</div>
                        {warehouse.warehouse_name_ar && (
                          <div className="text-xs text-muted-foreground">{warehouse.warehouse_name_ar}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{warehouse.warehouse_code || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {warehouse.city ? `${warehouse.city}${warehouse.country ? `, ${warehouse.country}` : ''}` : "-"}
                      </div>
                      {warehouse.location_address && (
                        <div className="text-xs text-muted-foreground">{warehouse.location_address}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {warehouse.contact_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {warehouse.contact_phone}
                          </div>
                        )}
                        {warehouse.contact_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {warehouse.contact_email}
                          </div>
                        )}
                        {!warehouse.contact_phone && !warehouse.contact_email && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.is_active ? "success" : "secondary"}>
                        {warehouse.is_active ? "نشط" : "غير نشط"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(warehouse)}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
