import { useEffect, useMemo, useState } from 'react';
import { Loader2, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  type PurchaseOrder,
  usePurchaseOrderItems,
} from '@/hooks/usePurchaseOrders';
import { useInventoryWarehouses } from '@/hooks/useInventoryWarehouses';
import { useReceivePOToInventory } from '@/hooks/integrations/useInventoryPurchaseOrders';

interface ReceivePurchaseOrderDialogProps {
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceived?: () => void;
}

export function ReceivePurchaseOrderDialog({
  order,
  open,
  onOpenChange,
  onReceived,
}: ReceivePurchaseOrderDialogProps) {
  const { data: items = [], isLoading: itemsLoading } = usePurchaseOrderItems(
    open ? order?.id : undefined
  );
  const { data: warehouses = [], isLoading: warehousesLoading } =
    useInventoryWarehouses();
  const receiveOrder = useReceivePOToInventory();
  const [warehouseId, setWarehouseId] = useState('');
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [deliveryNote, setDeliveryNote] = useState('');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    setQuantities(
      Object.fromEntries(
        items.map((item) => [
          item.id,
          Math.max(0, Number(item.quantity) - Number(item.received_quantity || 0)),
        ])
      )
    );
  }, [items, open]);

  const receiptItems = useMemo(
    () =>
      items
        .map((item) => ({
          purchase_order_item_id: item.id,
          quantity_received: Number(quantities[item.id] || 0),
        }))
        .filter((item) => item.quantity_received > 0),
    [items, quantities]
  );

  const handleSubmit = async () => {
    if (!order || !warehouseId || receiptItems.length === 0) return;
    await receiveOrder.mutateAsync({
      po_id: order.id,
      warehouse_id: warehouseId,
      receipt_date: receiptDate,
      delivery_note_number: deliveryNote || undefined,
      notes: notes || undefined,
      items: receiptItems,
    });
    onOpenChange(false);
    onReceived?.();
  };

  const isLoading = itemsLoading || warehousesLoading;
  const canSubmit =
    Boolean(order && warehouseId && receiptDate && receiptItems.length) &&
    !receiveOrder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            استلام البضاعة {order?.order_number ? `- ${order.order_number}` : ''}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>المستودع</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستودع" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouse_name_ar || warehouse.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-receipt-date">تاريخ الاستلام</Label>
                <Input
                  id="po-receipt-date"
                  type="date"
                  value={receiptDate}
                  onChange={(event) => setReceiptDate(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="po-delivery-note">رقم إشعار التسليم</Label>
                <Input
                  id="po-delivery-note"
                  value={deliveryNote}
                  onChange={(event) => setDeliveryNote(event.target.value)}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-[1fr_110px_110px] gap-3 bg-muted px-4 py-2 text-sm font-medium">
                <span>البند</span>
                <span>المتبقي</span>
                <span>المستلم الآن</span>
              </div>
              {items.map((item) => {
                const remaining = Math.max(
                  0,
                  Number(item.quantity) - Number(item.received_quantity || 0)
                );
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_110px_110px] items-center gap-3 border-t px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.item_code || 'غير مرتبط برمز صنف'}
                      </p>
                    </div>
                    <span>{remaining.toFixed(3)}</span>
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      step="0.001"
                      value={quantities[item.id] ?? 0}
                      disabled={remaining === 0}
                      onChange={(event) => {
                        const value = Math.min(
                          remaining,
                          Math.max(0, Number(event.target.value || 0))
                        );
                        setQuantities((current) => ({
                          ...current,
                          [item.id]: value,
                        }));
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="po-receipt-notes">ملاحظات</Label>
              <Textarea
                id="po-receipt-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {receiveOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            تأكيد الاستلام
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

