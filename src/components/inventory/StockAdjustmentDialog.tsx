import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type InventoryItem } from "@/hooks/useInventoryItems";
import { useInventoryWarehouses } from "@/hooks/useInventoryWarehouses";
import { useForm } from "react-hook-form";

interface StockAdjustmentDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AdjustmentFormData {
  warehouse_id: string;
  adjustment_type: "increase" | "decrease" | "damage" | "return" | "transfer" | "manual_count";
  quantity: number;
  reason: string;
  notes?: string;
}

export const StockAdjustmentDialog = ({ item, open, onOpenChange }: StockAdjustmentDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: warehouses } = useInventoryWarehouses();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<AdjustmentFormData>({
    defaultValues: {
      adjustment_type: "increase",
      quantity: 0,
      reason: "",
      notes: ""
    }
  });

  const adjustmentType = watch("adjustment_type");

  const handleAdjustment = async (data: AdjustmentFormData) => {
    if (!item || !user?.profile?.company_id) return;

    if (data.quantity <= 0) {
      toast({
        title: "خطأ في الكمية",
        description: "يجب إدخال كمية أكبر من صفر",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current stock level
      const { data: stockLevel, error: stockError } = await supabase
        .from('inventory_stock_levels')
        .select('quantity_on_hand')
        .eq('item_id', item.id)
        .eq('warehouse_id', data.warehouse_id)
        .single();

      if (stockError && stockError.code !== 'PGRST116') {
        throw stockError;
      }

      const currentQuantity = stockLevel?.quantity_on_hand || 0;

      // Calculate new quantity based on adjustment type
      let newQuantity = currentQuantity;
      let movementType: 'in' | 'out' | 'adjustment' = 'adjustment';

      switch (data.adjustment_type) {
        case 'increase':
          newQuantity = currentQuantity + data.quantity;
          movementType = 'in';
          break;
        case 'decrease':
        case 'damage':
        case 'return':
          if (currentQuantity < data.quantity) {
            toast({
              title: "خطأ في الكمية",
              description: `الكمية المتاحة (${currentQuantity}) أقل من الكمية المطلوبة (${data.quantity})`,
              variant: "destructive"
            });
            setIsSubmitting(false);
            return;
          }
          newQuantity = currentQuantity - data.quantity;
          movementType = 'out';
          break;
        case 'manual_count':
          newQuantity = data.quantity;
          movementType = 'adjustment';
          break;
      }

      // Create inventory movement record
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          company_id: user.profile.company_id,
          item_id: item.id,
          warehouse_id: data.warehouse_id,
          movement_type: movementType,
          quantity: Math.abs(newQuantity - currentQuantity),
          movement_date: new Date().toISOString(),
          reference_type: 'adjustment',
          reference_number: `ADJ-${Date.now()}`,
          notes: `${getAdjustmentTypeLabel(data.adjustment_type)} - ${data.reason}${data.notes ? ' - ' + data.notes : ''}`,
          created_by: user.id
        });

      if (movementError) throw movementError;

      // Update or insert stock level
      const { error: updateError } = await supabase
        .from('inventory_stock_levels')
        .upsert({
          company_id: user.profile.company_id,
          item_id: item.id,
          warehouse_id: data.warehouse_id,
          quantity_on_hand: newQuantity,
          quantity_available: newQuantity, // Simplified - should consider allocations
          last_movement_at: new Date().toISOString()
        }, {
          onConflict: 'item_id,warehouse_id'
        });

      if (updateError) throw updateError;

      toast({
        title: "تم تسجيل التسوية",
        description: `تم تحديث مخزون ${item.item_name} بنجاح`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });

      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast({
        title: "خطأ في تسجيل التسوية",
        description: "حدث خطأ أثناء تحديث المخزون",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAdjustmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      increase: "زيادة المخزون",
      decrease: "تقليل المخزون",
      damage: "تالف/هالك",
      return: "إرجاع للمورد",
      transfer: "نقل داخلي",
      manual_count: "جرد يدوي"
    };
    return labels[type] || type;
  };

  const getAdjustmentTypeIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
      case 'damage':
      case 'return':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'manual_count':
        return <Package className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>تسوية المخزون - {item.item_name}</DialogTitle>
          <DialogDescription>
            تسجيل حركة تسوية للصنف
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleAdjustment)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="warehouse_id">المستودع *</Label>
            <Select
              onValueChange={(value) => setValue("warehouse_id", value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المستودع" />
              </SelectTrigger>
              <SelectContent>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouse_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment_type">نوع التسوية *</Label>
            <Select
              onValueChange={(value) => setValue("adjustment_type", value as any)}
              defaultValue="increase"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    زيادة المخزون
                  </div>
                </SelectItem>
                <SelectItem value="decrease">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    تقليل المخزون
                  </div>
                </SelectItem>
                <SelectItem value="damage">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    تالف/هالك
                  </div>
                </SelectItem>
                <SelectItem value="return">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    إرجاع للمورد
                  </div>
                </SelectItem>
                <SelectItem value="manual_count">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-500" />
                    جرد يدوي
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {adjustmentType === 'manual_count' ? 'الكمية الفعلية' : 'الكمية'} *
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="0.01"
              {...register("quantity", {
                required: "الكمية مطلوبة",
                min: { value: 0.01, message: "يجب أن تكون الكمية أكبر من صفر" }
              })}
              placeholder="0"
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
            <p className="text-xs text-muted-foreground">الوحدة: {item.unit_of_measure}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">السبب *</Label>
            <Input
              id="reason"
              {...register("reason", { required: "السبب مطلوب" })}
              placeholder="مثال: جرد دوري، تلف، خطأ في الإدخال..."
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات إضافية</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="ملاحظات إضافية (اختياري)..."
              rows={3}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {getAdjustmentTypeIcon(adjustmentType)}
              {getAdjustmentTypeLabel(adjustmentType)}
            </div>
            <p className="text-xs text-muted-foreground">
              {adjustmentType === 'manual_count'
                ? 'سيتم تحديث الكمية الفعلية في المخزون حسب الجرد'
                : adjustmentType === 'increase'
                ? 'سيتم إضافة الكمية المدخلة إلى المخزون الحالي'
                : 'سيتم طرح الكمية المدخلة من المخزون الحالي'
              }
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  جاري الحفظ...
                </>
              ) : (
                "تسجيل التسوية"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
