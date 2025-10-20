import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryCategories, useCreateInventoryCategory, useUpdateInventoryCategory, useDeleteInventoryCategory, buildCategoryTree, type InventoryCategory } from "@/hooks/useInventoryCategories";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FolderTree, Plus, Search, Edit, Trash2, ChevronRight, ChevronDown, Package } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const InventoryCategories = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    category_name: "",
    category_name_ar: "",
    description: "",
    parent_category_id: "",
    is_active: true,
  });

  const { data: categories, isLoading } = useInventoryCategories({
    search: searchTerm,
    is_active: true,
  });

  const createCategory = useCreateInventoryCategory();
  const updateCategory = useUpdateInventoryCategory();
  const deleteCategory = useDeleteInventoryCategory();

  const handleCreateCategory = async () => {
    try {
      await createCategory.mutateAsync({
        category_name: formData.category_name,
        category_name_ar: formData.category_name_ar || undefined,
        description: formData.description || undefined,
        parent_category_id: formData.parent_category_id || undefined,
        is_active: formData.is_active,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  const handleEditCategory = (category: InventoryCategory) => {
    setSelectedCategory(category);
    setFormData({
      category_name: category.category_name,
      category_name_ar: category.category_name_ar || "",
      description: category.description || "",
      parent_category_id: category.parent_category_id || "",
      is_active: category.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return;

    try {
      await updateCategory.mutateAsync({
        id: selectedCategory.id,
        data: {
          category_name: formData.category_name,
          category_name_ar: formData.category_name_ar || undefined,
          description: formData.description || undefined,
          parent_category_id: formData.parent_category_id || undefined,
          is_active: formData.is_active,
        },
      });
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedCategory(null);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleDeleteCategory = async (category: InventoryCategory) => {
    try {
      await deleteCategory.mutateAsync(category.id);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      category_name: "",
      category_name_ar: "",
      description: "",
      parent_category_id: "",
      is_active: true,
    });
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryRow = (category: InventoryCategory & { children?: InventoryCategory[] }, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <>
        <TableRow key={category.id}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingRight: `${level * 24}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <div className="w-6" />
              )}
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{category.category_name}</span>
            </div>
          </TableCell>
          <TableCell>{category.category_name_ar || "-"}</TableCell>
          <TableCell>{category.description || "-"}</TableCell>
          <TableCell>
            <Badge variant="outline">
              {category.item_count || 0} صنف
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline">
              {category.subcategory_count || 0} تصنيف فرعي
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={category.is_active ? "success" : "secondary"}>
              {category.is_active ? "نشط" : "غير نشط"}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditCategory(category)}
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
                      سيتم حذف التصنيف "{category.category_name}". هذا الإجراء لا يمكن التراجع عنه.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteCategory(category)}
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
        {hasChildren && isExpanded && category.children!.map((child) => renderCategoryRow(child, level + 1))}
      </>
    );
  };

  const categoryTree = categories ? buildCategoryTree(categories) : [];

  const CategoryFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category_name">اسم التصنيف (EN) *</Label>
        <Input
          id="category_name"
          value={formData.category_name}
          onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
          placeholder="Electronics"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category_name_ar">اسم التصنيف (AR)</Label>
        <Input
          id="category_name_ar"
          value={formData.category_name_ar}
          onChange={(e) => setFormData({ ...formData, category_name_ar: e.target.value })}
          placeholder="إلكترونيات"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">الوصف</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="وصف التصنيف..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent_category_id">التصنيف الأب (اختياري)</Label>
        <Select
          value={formData.parent_category_id}
          onValueChange={(value) => setFormData({ ...formData, parent_category_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر التصنيف الأب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">لا يوجد (تصنيف رئيسي)</SelectItem>
            {categories?.filter(cat => !selectedCategory || cat.id !== selectedCategory.id).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.category_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
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
            <BreadcrumbPage>تصنيفات المخزون</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
            <FolderTree className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">تصنيفات المخزون</h1>
            <p className="text-muted-foreground">إدارة التصنيفات والتصنيفات الفرعية للأصناف المخزنية</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              تصنيف جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة تصنيف جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات التصنيف الجديد
              </DialogDescription>
            </DialogHeader>
            <CategoryFormFields />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateCategory} disabled={!formData.category_name}>
                حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التصنيفات</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories?.length || 0}</div>
            <p className="text-xs text-muted-foreground">تصنيف نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التصنيفات الرئيسية</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories?.filter(c => !c.parent_category_id).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">بدون تصنيف أب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأصناف</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories?.reduce((sum, cat) => sum + (cat.item_count || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">صنف في جميع التصنيفات</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>شجرة التصنيفات</CardTitle>
              <CardDescription>عرض وإدارة التصنيفات بشكل هرمي</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث عن تصنيف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Category Tree Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : categoryTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد تصنيفات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الاسم بالعربية</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>عدد الأصناف</TableHead>
                  <TableHead>التصنيفات الفرعية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryTree.map((category) => renderCategoryRow(category))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث التصنيف</DialogTitle>
            <DialogDescription>
              تعديل بيانات التصنيف
            </DialogDescription>
          </DialogHeader>
          <CategoryFormFields />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedCategory(null);
              resetForm();
            }}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateCategory} disabled={!formData.category_name}>
              حفظ التغييرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryCategories;
