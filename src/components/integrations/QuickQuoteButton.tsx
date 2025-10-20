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
import { FileText, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useSalesInventoryAvailability } from '@/hooks/integrations/useSalesInventoryAvailability';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface QuickQuoteButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Quick Quote Button Component
 *
 * Features:
 * - Quick quote creation with inventory availability check
 * - Shows stock status before creating quote
 * - Only allows quoting available items
 * - Real-time inventory validation
 */

export const QuickQuoteButton: React.FC<QuickQuoteButtonProps> = ({
  variant = 'default',
  size = 'default',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Hooks
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: availableItems, isLoading: itemsLoading } = useSalesInventoryAvailability();

  // Get selected item details
  const selectedItem = availableItems?.find((item) => item.item_id === selectedItemId);

  // Check inventory availability for selected quantity
  const isAvailable = selectedItem ? selectedItem.quantity_available >= quantity : false;
  const shortage = selectedItem ? Math.max(0, quantity - selectedItem.quantity_available) : 0;

  const handleSubmit = async () => {
    if (!selectedCustomerId || !selectedItemId || !quantity) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!isAvailable) {
      toast.error('الكمية المطلوبة غير متوفرة في المخزون');
      return;
    }

    setIsCreating(true);

    try {
      // TODO: Integrate with actual quote creation hook
      // await createQuote.mutateAsync({
      //   customer_id: selectedCustomerId,
      //   items: [{ item_id: selectedItemId, quantity, unit_price: selectedItem!.unit_price }],
      //   notes,
      // });

      // Simulated delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('تم إنشاء عرض السعر بنجاح');
      setIsOpen(false);

      // Reset form
      setSelectedCustomerId('');
      setSelectedItemId('');
      setQuantity(1);
      setNotes('');
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('خطأ في إنشاء عرض السعر');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        <FileText className="h-4 w-4 mr-2" />
        إنشاء عرض سعر سريع
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء عرض سعر سريع</DialogTitle>
            <DialogDescription>
              إنشاء عرض سعر مع التحقق من توفر المخزون
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer">العميل *</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {customersLoading ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      جاري التحميل...
                    </div>
                  ) : customers && customers.length > 0 ? (
                    customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      لا يوجد عملاء
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
              <Label htmlFor="item">الصنف *</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصنف" />
                </SelectTrigger>
                <SelectContent>
                  {itemsLoading ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      جاري التحميل...
                    </div>
                  ) : availableItems && availableItems.length > 0 ? (
                    availableItems.map((item) => (
                      <SelectItem key={item.item_id} value={item.item_id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{item.item_name}</span>
                          <Badge
                            variant={
                              item.stock_status === 'available'
                                ? 'default'
                                : item.stock_status === 'low_stock'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className="mr-2"
                          >
                            {item.quantity_available} متوفر
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      لا يوجد أصناف متاحة
                    </div>
                  )}
                </SelectContent>
              </Select>
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

            {/* Stock Status Indicator */}
            {selectedItem && (
              <div
                className={`p-3 rounded-lg border ${
                  isAvailable
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isAvailable ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className={`font-medium ${isAvailable ? 'text-green-900' : 'text-red-900'}`}>
                        {isAvailable ? 'متوفر في المخزون' : 'غير متوفر'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        متوفر: {selectedItem.quantity_available} {selectedItem.unit_of_measure}
                      </p>
                    </div>
                  </div>
                  {!isAvailable && shortage > 0 && (
                    <div className="text-left">
                      <p className="text-sm font-medium text-red-600">نقص</p>
                      <p className="text-sm text-red-800">{shortage} {selectedItem.unit_of_measure}</p>
                    </div>
                  )}
                </div>
                {selectedItem.quantity_allocated > 0 && (
                  <div className="mt-2 pt-2 border-t border-current/10">
                    <p className="text-xs text-muted-foreground">
                      كمية مخصصة: {selectedItem.quantity_allocated} {selectedItem.unit_of_measure}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Price Estimate */}
            {selectedItem && quantity > 0 && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">السعر المتوقع:</span>
                  <span className="text-lg font-bold text-primary">
                    {(quantity * selectedItem.unit_price).toLocaleString('ar-SA')} ر.ق
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                  <span>سعر الوحدة:</span>
                  <span>{selectedItem.unit_price.toLocaleString('ar-SA')} ر.ق</span>
                </div>
              </div>
            )}

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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedCustomerId ||
                !selectedItemId ||
                !quantity ||
                !isAvailable ||
                isCreating
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء عرض السعر'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
