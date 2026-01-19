import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useVendorCategories, useCreateVendorCategory, useUpdateVendorCategory, useDeleteVendorCategory, useVendors, type VendorCategory } from "@/hooks/useFinance";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FolderTree, Plus, Search, Edit, Trash2, Building } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const categorySchema = z.object({
  category_name: z.string().min(1, "اسم التصنيف مطلوب"),
  category_name_ar: z.string().optional(),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const VendorCategories = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VendorCategory | null>(null);

  const { data: categories, isLoading, error } = useVendorCategories();
  const { data: vendors } = useVendors();
  const createCategory = useCreateVendorCategory();
  const updateCategory = useUpdateVendorCategory();
  const deleteCategory = useDeleteVendorCategory();

  const filteredCategories = categories?.filter(category =>
    category.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.category_name_ar?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate vendor count per category
  const getVendorCount = (categoryId: string) => {
    return vendors?.filter(v => v.category_id === categoryId).length || 0;
  };

  const handleEditCategory = (category: VendorCategory) => {
    setSelectedCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleDeleteCategory = async (category: VendorCategory) => {
    const vendorCount = getVendorCount(category.id);
    if (vendorCount > 0) {
      // Show warning but allow delete (will set category_id to null for vendors)
      if (!confirm(`هذا التصنيف يحتوي على ${vendorCount} مورد. هل أنت متأكد من الحذف؟`)) {
        return;
      }
    }
    try {
      await deleteCategory.mutateAsync(category.id);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">النظام المالي</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance/vendors">الموردين</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>تصنيفات الموردين</BreadcrumbPage>
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
            <h1 className="text-2xl font-bold">تصنيفات الموردين</h1>
            <p className="text-muted-foreground">تنظيم الموردين في تصنيفات لسهولة الإدارة</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              تصنيف جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة تصنيف جديد</DialogTitle>
              <DialogDescription>
                قم بإدخال بيانات التصنيف الجديد
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              onSuccess={() => setIsCreateDialogOpen(false)}
              mutation={createCategory}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي التصنيفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories?.length || 0}</div>
            <p className="text-xs text-muted-foreground">تصنيف نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الموردين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors?.length || 0}</div>
            <p className="text-xs text-muted-foreground">موزعين على التصنيفات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">بدون تصنيف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendors?.filter(v => !v.category_id).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">مورد بدون تصنيف</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">البحث عن التصنيفات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="البحث بالاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة التصنيفات</CardTitle>
          <CardDescription>
            إجمالي {filteredCategories.length} تصنيف
          </CardDescription>
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
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد تصنيفات</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>عدد الموردين</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{category.category_name}</div>
                          {category.category_name_ar && (
                            <div className="text-xs text-muted-foreground">{category.category_name_ar}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {category.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {getVendorCount(category.id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف التصنيف "{category.category_name}"؟
                                {getVendorCount(category.id) > 0 && (
                                  <span className="block mt-2 text-orange-600">
                                    تحذير: هذا التصنيف يحتوي على {getVendorCount(category.id)} مورد.
                                  </span>
                                )}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل التصنيف</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات التصنيف
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <CategoryForm
              category={selectedCategory}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedCategory(null);
              }}
              mutation={updateCategory}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Category Form Component
interface CategoryFormProps {
  category?: VendorCategory;
  onSuccess?: () => void;
  mutation: ReturnType<typeof useCreateVendorCategory> | ReturnType<typeof useUpdateVendorCategory>;
}

const CategoryForm = ({ category, onSuccess, mutation }: CategoryFormProps) => {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      category_name: category?.category_name || "",
      category_name_ar: category?.category_name_ar || "",
      description: category?.description || "",
    }
  });

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (category) {
        await mutation.mutateAsync({ id: category.id, ...data } as never);
      } else {
        await mutation.mutateAsync(data as never);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting category form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم التصنيف (بالإنجليزية) *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Category Name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category_name_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم التصنيف (بالعربية)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="اسم التصنيف" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الوصف</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="وصف التصنيف..." rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="min-w-24"
          >
            {mutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : category ? (
              "تحديث"
            ) : (
              "إضافة"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default VendorCategories;
