import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateInventoryItem } from "@/hooks/useInventoryItems";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Package } from "lucide-react";

const UNITS_OF_MEASURE = [
  { id: 'piece', name: 'قطعة' },
  { id: 'box', name: 'صندوق' },
  { id: 'kg', name: 'كيلوجرام' },
  { id: 'liter', name: 'لتر' },
  { id: 'meter', name: 'متر' },
  { id: 'set', name: 'طقم' },
  { id: 'pack', name: 'حزمة' },
];

const ITEM_TYPES = [
  { id: 'product', name: 'منتج' },
  { id: 'service', name: 'خدمة' },
  { id: 'raw_material', name: 'مادة خام' },
  { id: 'spare_part', name: 'قطعة غيار' },
];

interface AddInventoryItemFormProps {
  onSuccess?: () => void;
}

export const AddInventoryItemForm = ({ onSuccess }: AddInventoryItemFormProps) => {
  const [formData, setFormData] = useState({
    item_name: '',
    item_name_ar: '',
    item_code: '',
    sku: '',
    barcode: '',
    category_id: '',
    description: '',
    unit_of_measure: 'piece',
    unit_price: '',
    cost_price: '',
    min_stock_level: '10',
    max_stock_level: '',
    reorder_point: '',
    reorder_quantity: '',
    is_tracked: true,
    item_type: 'product',
    notes: '',
  });

  const createItem = useCreateInventoryItem();
  const { data: categories, isLoading: categoriesLoading } = useInventoryCategories({ is_active: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createItem.mutateAsync({
        item_name: formData.item_name,
        item_name_ar: formData.item_name_ar || undefined,
        item_code: formData.item_code || undefined,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        category_id: formData.category_id || undefined,
        description: formData.description || undefined,
        unit_of_measure: formData.unit_of_measure,
        unit_price: parseFloat(formData.unit_price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 0,
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level) : undefined,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : undefined,
        reorder_quantity: formData.reorder_quantity ? parseInt(formData.reorder_quantity) : undefined,
        is_tracked: formData.is_tracked,
        is_active: true,
        item_type: formData.item_type,
        notes: formData.notes || undefined,
      });

      // Reset form
      setFormData({
        item_name: '',
        item_name_ar: '',
        item_code: '',
        sku: '',
        barcode: '',
        category_id: '',
        description: '',
        unit_of_measure: 'piece',
        unit_price: '',
        cost_price: '',
        min_stock_level: '10',
        max_stock_level: '',
        reorder_point: '',
        reorder_quantity: '',
        is_tracked: true,
        item_type: 'product',
        notes: '',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting inventory item form:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">المعلومات الأساسية</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="item_name">
              اسم الصنف <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item_name"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              placeholder="مثال: إطار سيارة"
              required
            />
          </div>

          {/* Item Name Arabic */}
          <div className="space-y-2">
            <Label htmlFor="item_name_ar">الاسم بالعربية</Label>
            <Input
              id="item_name_ar"
              value={formData.item_name_ar}
              onChange={(e) => setFormData({ ...formData, item_name_ar: e.target.value })}
              placeholder="مثال: إطار سيارة"
            />
          </div>

          {/* Item Code */}
          <div className="space-y-2">
            <Label htmlFor="item_code">كود الصنف</Label>
            <Input
              id="item_code"
              value={formData.item_code}
              onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              placeholder="مثال: ITM-001"
            />
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <Label htmlFor="sku">رقم SKU</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="مثال: SKU-12345"
            />
          </div>

          {/* Barcode */}
          <div className="space-y-2">
            <Label htmlFor="barcode">الباركود</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="مثال: 1234567890123"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category_id">التصنيف</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger id="category_id">
                <SelectValue placeholder="اختر التصنيف" />
              </SelectTrigger>
              <SelectContent>
                {categoriesLoading ? (
                  <div className="p-2 text-center">
                    <LoadingSpinner className="h-4 w-4" />
                  </div>
                ) : (
                  <>
                    <SelectItem value="">بدون تصنيف</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.category_name_ar || category.category_name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Item Type */}
          <div className="space-y-2">
            <Label htmlFor="item_type">
              نوع الصنف <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.item_type}
              onValueChange={(value) => setFormData({ ...formData, item_type: value })}
            >
              <SelectTrigger id="item_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit of Measure */}
          <div className="space-y-2">
            <Label htmlFor="unit_of_measure">
              وحدة القياس <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.unit_of_measure}
              onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
            >
              <SelectTrigger id="unit_of_measure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS_OF_MEASURE.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">الوصف</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="وصف تفصيلي للصنف..."
            rows={3}
          />
        </div>
      </div>

      {/* Pricing Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">معلومات التسعير</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Unit Price */}
          <div className="space-y-2">
            <Label htmlFor="unit_price">
              سعر البيع (ريال قطري) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="unit_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          {/* Cost Price */}
          <div className="space-y-2">
            <Label htmlFor="cost_price">
              سعر التكلفة (ريال قطري) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cost_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>
        </div>
      </div>

      {/* Stock Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">معلومات المخزون</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Min Stock Level */}
          <div className="space-y-2">
            <Label htmlFor="min_stock_level">
              الحد الأدنى للمخزون <span className="text-destructive">*</span>
            </Label>
            <Input
              id="min_stock_level"
              type="number"
              min="0"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
              placeholder="10"
              required
            />
          </div>

          {/* Max Stock Level */}
          <div className="space-y-2">
            <Label htmlFor="max_stock_level">الحد الأقصى للمخزون</Label>
            <Input
              id="max_stock_level"
              type="number"
              min="0"
              value={formData.max_stock_level}
              onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
              placeholder="100"
            />
          </div>

          {/* Reorder Point */}
          <div className="space-y-2">
            <Label htmlFor="reorder_point">نقطة إعادة الطلب</Label>
            <Input
              id="reorder_point"
              type="number"
              min="0"
              value={formData.reorder_point}
              onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
              placeholder="20"
            />
          </div>

          {/* Reorder Quantity */}
          <div className="space-y-2">
            <Label htmlFor="reorder_quantity">كمية إعادة الطلب</Label>
            <Input
              id="reorder_quantity"
              type="number"
              min="0"
              value={formData.reorder_quantity}
              onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
              placeholder="50"
            />
          </div>
        </div>

        {/* Is Tracked */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <Checkbox
            id="is_tracked"
            checked={formData.is_tracked}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, is_tracked: checked as boolean })
            }
          />
          <Label htmlFor="is_tracked" className="cursor-pointer">
            تتبع حركة المخزون
          </Label>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="أضف أي ملاحظات إضافية..."
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={
            createItem.isPending ||
            !formData.item_name ||
            !formData.unit_price ||
            !formData.cost_price
          }
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          {createItem.isPending ? (
            <>
              <LoadingSpinner className="ml-2 h-4 w-4" />
              جاري الإضافة...
            </>
          ) : (
            <>
              <Package className="ml-2 h-4 w-4" />
              إضافة الصنف
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
