import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryCategories, useCreateInventoryCategory, useUpdateInventoryCategory, useDeleteInventoryCategory, buildCategoryTree, type InventoryCategory } from "@/hooks/useInventoryCategories";
import { FolderTree, Plus, Search, Edit, Trash2, ChevronRight, ChevronDown, Package } from "lucide-react";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

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
      is_active: category.is_active ?? true,
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

  const renderCategoryRow = (
    category: InventoryCategory & { children?: InventoryCategory[] },
    level: number = 0
  ): ReactNode => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <>
        <tr key={category.id}>
          <td>
            <div className="flex items-center gap-2" style={{ paddingInlineStart: `${level * 24}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="wk-action"
                  style={{ minWidth: 26, minHeight: 26 }}
                  aria-label={isExpanded ? `طوي ${category.category_name}` : `توسيع ${category.category_name}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <div style={{ width: 26 }} />
              )}
              <FolderTree className="h-4 w-4" style={{ color: '#829174' }} />
              <strong><bdi>{category.category_name}</bdi></strong>
            </div>
          </td>
          <td>{category.category_name_ar || "-"}</td>
          <td>{category.description || "-"}</td>
          <td>
            <span className="wk-badge is-neutral">{category.item_count || 0} صنف</span>
          </td>
          <td>
            <span className="wk-badge is-info">{category.subcategory_count || 0} تصنيف فرعي</span>
          </td>
          <td>
            <span className={`wk-badge ${category.is_active ? 'is-ok' : 'is-neutral'}`}>
              {category.is_active ? "نشط" : "غير نشط"}
            </span>
          </td>
          <td>
            <div className="wk-actions">
              <button type="button" className="wk-action" title="تعديل" aria-label={`تعديل ${category.category_name}`} onClick={() => handleEditCategory(category)}>
                <Edit size={15} />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" className="wk-action" title="حذف" aria-label={`حذف ${category.category_name}`}>
                    <Trash2 size={15} />
                  </button>
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
          </td>
        </tr>
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
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المخزون <span>/</span> التصنيفات
            </div>
            <h1>تصنيفات المخزون</h1>
            <p>إدارة التصنيفات والتصنيفات الفرعية للأصناف المخزنية.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button dw-button-primary" onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus size={17} />
              تصنيف جديد
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات التصنيفات">
          <div className="dw-metric dw-metric-accent">
            <div className="dw-metric-top"><span>إجمالي التصنيفات</span><FolderTree size={19} /></div>
            <strong>{categories?.length || 0}</strong>
            <div className="dw-metric-bottom"><small>تصنيف نشط</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>التصنيفات الرئيسية</span><FolderTree size={19} /></div>
            <strong>{categories?.filter(c => !c.parent_category_id).length || 0}</strong>
            <div className="dw-metric-bottom"><small>بدون تصنيف أب</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>إجمالي الأصناف</span><Package size={19} /></div>
            <strong>{categories?.reduce((sum, cat) => sum + (cat.item_count || 0), 0) || 0}</strong>
            <div className="dw-metric-bottom"><small>صنف في جميع التصنيفات</small></div>
          </div>
        </section>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="شجرة التصنيفات"
            subtitle="عرض وإدارة التصنيفات بشكل هرمي"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 220 }}
                    placeholder="ابحث عن تصنيف…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="بحث في التصنيفات"
                  />
                </div>
              </div>
            }
          >
            {isLoading ? (
              <PageLoading label="جاري تحميل التصنيفات…" />
            ) : categoryTree.length === 0 ? (
              <PageEmpty icon={FolderTree} message="لا توجد تصنيفات">
                <button type="button" className="dw-button" onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                  <Plus size={16} />
                  إضافة تصنيف
                </button>
              </PageEmpty>
            ) : (
              <div className="wk-table-wrap">
                <table>
                  <caption className="sr-only">شجرة التصنيفات</caption>
                  <thead>
                    <tr>
                      <th scope="col">التصنيف</th>
                      <th scope="col">الاسم بالعربية</th>
                      <th scope="col">الوصف</th>
                      <th scope="col">عدد الأصناف</th>
                      <th scope="col">التصنيفات الفرعية</th>
                      <th scope="col">الحالة</th>
                      <th scope="col"><span className="sr-only">إجراءات</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryTree.map((category) => renderCategoryRow(category))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="dw-panel-foot">
              <FolderTree size={14} />
              <span>وسّع التصنيفات الرئيسية لعرض التصنيفات الفرعية.</span>
            </div>
          </PagePanel>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
