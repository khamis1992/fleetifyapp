import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useInventoryItem } from '@/hooks/useInventoryItems';
import { useVendors } from '@/hooks/useFinance';
import { useCreatePOFromLowStock, usePreferredVendorForItem } from '@/hooks/integrations/useInventoryPurchaseOrders';

interface QuickPurchaseOrderButtonProps {
  itemId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Quick Purchase Order Button Component
 *
 * Features:
 * - One-click PO creation for low stock items
 * - Auto-suggests preferred vendor
 * - Pre-fills reorder quantity
 * - Shows item details in dialog
 */
export const QuickPurchaseOrderButton: React.FC<QuickPurchaseOrderButtonProps> = ({
  itemId,
  variant = 'default',
  size = 'default',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Hooks
  const { data: item, isLoading: itemLoading } = useInventoryItem(itemId);
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const { data: preferredVendor } = usePreferredVendorForItem(itemId);
  const createPO = useCreatePOFromLowStock();

  // Initialize form when dialog opens
  React.useEffect(() => {
    if (isOpen && item) {
      // Set default quantity to reorder quantity or min stock level
      setQuantity(item.reorder_quantity || item.min_stock_level || 1);

      // Set default delivery date to 7 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setExpectedDeliveryDate(defaultDate.toISOString().split('T')[0]);

      // Set preferred vendor if available
      if (preferredVendor) {
        setSelectedVendorId(preferredVendor.vendor_id);
      }
    }
  }, [isOpen, item, preferredVendor]);

  const handleSubmit = async () => {
    if (!selectedVendorId || !quantity || !expectedDeliveryDate) {
      return;
    }

    try {
      await createPO.mutateAsync({
        item_id: itemId,
        vendor_id: selectedVendorId,
        quantity,
        expected_delivery_date: expectedDeliveryDate,
        notes,
      });
      setIsOpen(false);
      // Reset form
      setSelectedVendorId('');
      setQuantity(0);
      setExpectedDeliveryDate('');
      setNotes('');
    } catch (error) {
      console.error('Error creating PO:', error);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
        disabled={itemLoading}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        إنشاء أمر شراء
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء أمر شراء سريع</DialogTitle>
            <DialogDescription>
              إنشاء أمر شراء للصنف منخفض المخزون
            </DialogDescription>
          </DialogHeader>

          {itemLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : item ? (
            <div className="space-y-4">
              {/* Item Details */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">الصنف:</span>
                  <span className="text-sm">{item.item_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">كود الصنف:</span>
                  <span className="text-sm">{item.item_code || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">سعر التكلفة:</span>
                  <span className="text-sm">{item.cost_price || item.unit_price} ر.ق</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">الحد الأدنى للمخزون:</span>
                  <span className="text-sm">{item.min_stock_level}</span>
                </div>
                {item.reorder_quantity && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">كمية إعادة الطلب:</span>
                    <span className="text-sm">{item.reorder_quantity}</span>
                  </div>
                )}
              </div>

              {/* Vendor Selection */}
              <div className="space-y-2">
                <Label htmlFor="vendor">المورد *</Label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المورد" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorsLoading ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        جاري التحميل...
                      </div>
                    ) : vendors && vendors.length > 0 ? (
                      vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.vendor_name}
                          {vendor.id === preferredVendor?.vendor_id && (
                            <span className="ml-2 text-xs text-primary">(مورد مفضل)</span>
                          )}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        لا يوجد موردين
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {preferredVendor && selectedVendorId === preferredVendor.vendor_id && (
                  <p className="text-xs text-muted-foreground">
                    آخر سعر شراء: {preferredVendor.last_purchase_price} ر.ق |
                    معدل التسليم في الوقت: {preferredVendor.on_time_delivery_rate.toFixed(0)}%
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">الكمية *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  placeholder="أدخل الكمية"
                />
              </div>

              {/* Expected Delivery Date */}
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">تاريخ التسليم المتوقع *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات..."
                  rows={3}
                />
              </div>

              {/* Estimated Total */}
              {quantity > 0 && item.cost_price > 0 && (
                <div className="bg-primary/10 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">الإجمالي المتوقع:</span>
                    <span className="text-lg font-bold text-primary">
                      {(quantity * (item.cost_price || item.unit_price)).toFixed(2)} ر.ق
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لم يتم العثور على الصنف
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedVendorId ||
                !quantity ||
                !expectedDeliveryDate ||
                createPO.isPending
              }
            >
              {createPO.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء أمر الشراء'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
