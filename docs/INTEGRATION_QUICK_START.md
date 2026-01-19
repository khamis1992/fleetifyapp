# Integration Layer - Quick Start Guide

**🚀 Get started with the Module Integration Layer in 5 minutes**

## What is the Integration Layer?

The Integration Layer connects Inventory, Purchase Orders, Sales Orders, and Vendors. It provides ready-to-use hooks and components for common business workflows.

---

## 📦 Quick Examples

### 1. Show Stock Status Badge

```tsx
import { InventoryAvailabilityBadge } from '@/components/integrations';

function ProductCard({ productId, quantityNeeded }) {
  return (
    <Card>
      <CardHeader>Product Details</CardHeader>
      <CardContent>
        <InventoryAvailabilityBadge
          itemId={productId}
          quantityNeeded={quantityNeeded}
          showDetails={true}
        />
      </CardContent>
    </Card>
  );
}
```

**Result**: Shows green/orange/red badge with stock availability status.

---

### 2. Quick Purchase Order Button

```tsx
import { QuickPurchaseOrderButton } from '@/components/integrations';

function LowStockItem({ item }) {
  return (
    <div className="flex items-center justify-between">
      <span>{item.item_name} - Low Stock!</span>
      <QuickPurchaseOrderButton itemId={item.id} />
    </div>
  );
}
```

**Result**: Clicking button opens pre-filled PO dialog with suggested vendor.

---

### 3. Display Vendor Performance

```tsx
import { VendorPerformanceIndicator } from '@/components/integrations';

function VendorCard({ vendor }) {
  return (
    <Card>
      <CardHeader>{vendor.vendor_name}</CardHeader>
      <CardContent>
        {/* Compact star rating */}
        <VendorPerformanceIndicator
          vendorId={vendor.id}
          variant="compact"
        />

        {/* Or detailed metrics card */}
        <VendorPerformanceIndicator
          vendorId={vendor.id}
          variant="detailed"
        />
      </CardContent>
    </Card>
  );
}
```

**Result**: Shows vendor rating (1-5 stars) with performance metrics.

---

### 4. Create Sales Order from Inventory

```tsx
import {
  useInventoryAvailabilityCheck,
  useCreateSalesOrderFromInventory,
} from '@/hooks/integrations';

function CreateOrder({ items, warehouseId }) {
  const { data: availability } = useInventoryAvailabilityCheck(items, warehouseId);
  const createOrder = useCreateSalesOrderFromInventory();

  const handleSubmit = async () => {
    // Check if all items are available
    const allAvailable = availability?.every(item => item.is_available);

    if (!allAvailable) {
      toast.error('Some items are out of stock');
      return;
    }

    // Create order
    await createOrder.mutateAsync({
      warehouse_id: warehouseId,
      order_date: new Date().toISOString(),
      items: items.map(item => ({
        item_id: item.itemId,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <Button onClick={handleSubmit} disabled={createOrder.isPending}>
      Create Sales Order
    </Button>
  );
}
```

**Result**: Validates stock, creates order, allocates inventory automatically.

---

### 5. Receive Purchase Order

```tsx
import { useReceivePOToInventory } from '@/hooks/integrations';

function ReceivePOForm({ poId, warehouseId }) {
  const receivePO = useReceivePOToInventory();

  const handleReceive = async (receivedItems) => {
    await receivePO.mutateAsync({
      po_id: poId,
      warehouse_id: warehouseId,
      items: receivedItems.map(item => ({
        item_id: item.itemId,
        quantity_received: item.quantity,
        notes: item.notes,
      })),
    });
  };

  return (
    <Button onClick={handleReceive}>
      Receive Purchase Order
    </Button>
  );
}
```

**Result**: Creates inventory movements, updates stock, marks PO as received.

---

### 6. View Vendor Purchase History

```tsx
import { useVendorPurchaseHistory } from '@/hooks/integrations';

function VendorHistory({ vendorId }) {
  const { data: history, isLoading } = useVendorPurchaseHistory(vendorId);

  if (isLoading) return <Skeleton />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>PO Number</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>On Time?</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history?.map(po => (
          <TableRow key={po.po_id}>
            <TableCell>{po.order_number}</TableCell>
            <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
            <TableCell>{po.total_amount} {po.currency}</TableCell>
            <TableCell>{po.status}</TableCell>
            <TableCell>
              {po.is_on_time ? '✅ Yes' : '❌ No'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

**Result**: Displays complete PO history for a vendor.

---

### 7. Get Preferred Vendor for Item

```tsx
import { usePreferredVendorForItem } from '@/hooks/integrations';

function ItemDetails({ itemId }) {
  const { data: preferredVendor } = usePreferredVendorForItem(itemId);

  return (
    <div>
      {preferredVendor && (
        <Alert>
          <AlertTitle>Suggested Vendor</AlertTitle>
          <AlertDescription>
            <p><strong>{preferredVendor.vendor_name}</strong></p>
            <p>Last Price: {preferredVendor.last_purchase_price} QAR</p>
            <p>On-time Rate: {preferredVendor.on_time_delivery_rate.toFixed(0)}%</p>
            <p>Total Orders: {preferredVendor.total_orders}</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

**Result**: Shows best vendor based on past performance.

---

## 🎯 Common Use Cases

### Use Case 1: Low Stock Alert System
```tsx
import { useLowStockItems } from '@/hooks/useInventoryItems';
import { QuickPurchaseOrderButton } from '@/components/integrations';

function LowStockAlerts() {
  const { data: lowStockItems } = useLowStockItems();

  return (
    <div className="space-y-2">
      {lowStockItems?.map(item => (
        <Alert key={item.item_id} variant="warning">
          <AlertTitle>{item.item_name} - Low Stock</AlertTitle>
          <AlertDescription>
            Current: {item.current_quantity} | Min: {item.min_stock_level}
          </AlertDescription>
          <QuickPurchaseOrderButton itemId={item.item_id} />
        </Alert>
      ))}
    </div>
  );
}
```

### Use Case 2: Sales Order with Stock Validation
```tsx
import {
  useInventoryAvailabilityCheck,
  useCreateSalesOrderFromInventory,
} from '@/hooks/integrations';
import { InventoryAvailabilityBadge } from '@/components/integrations';

function SalesOrderForm({ formData, warehouseId }) {
  const { data: availability } = useInventoryAvailabilityCheck(
    formData.items,
    warehouseId
  );
  const createOrder = useCreateSalesOrderFromInventory();

  return (
    <Form>
      {/* Show availability for each item */}
      {formData.items.map(item => (
        <div key={item.itemId} className="flex items-center gap-2">
          <span>{item.name}</span>
          <InventoryAvailabilityBadge
            itemId={item.itemId}
            quantityNeeded={item.quantity}
            warehouseId={warehouseId}
          />
        </div>
      ))}

      <Button
        onClick={() => createOrder.mutateAsync({
          warehouse_id: warehouseId,
          items: formData.items,
          ...formData
        })}
        disabled={!availability?.every(a => a.is_available)}
      >
        Create Order
      </Button>
    </Form>
  );
}
```

### Use Case 3: Vendor Comparison
```tsx
import {
  useVendorsRankedByPerformance,
  VendorPerformanceIndicator,
} from '@/hooks/integrations';

function VendorRankings() {
  const { data: vendors } = useVendorsRankedByPerformance();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vendors?.map((vendor, index) => (
        <Card key={vendor.vendor_id}>
          <CardHeader>
            <Badge>Rank #{index + 1}</Badge>
            <CardTitle>{vendor.vendor_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <VendorPerformanceIndicator
              vendorId={vendor.vendor_id}
              variant="inline"
            />
            <div className="mt-2 text-sm text-muted-foreground">
              <p>Total Orders: {vendor.total_orders}</p>
              <p>On-time: {vendor.on_time_delivery_rate.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## 📚 Available Hooks

### Inventory ↔ Purchase Orders
- ✅ `useCreatePOFromLowStock()` - Quick PO creation
- ✅ `useReceivePOToInventory()` - Receive and update stock
- ✅ `useInventoryPurchaseHistory()` - View item's PO history
- ✅ `usePreferredVendorForItem()` - Get best vendor

### Inventory ↔ Sales Orders
- ✅ `useCreateSalesOrderFromInventory()` - Create with allocation
- ✅ `useFulfillSalesOrder()` - Ship and reduce stock
- ✅ `useInventoryAvailabilityCheck()` - Real-time stock check
- ✅ `useInventorySalesHistory()` - View item's sales history

### Vendors ↔ Purchase Orders
- ✅ `useVendorPurchaseHistory()` - All POs for vendor
- ✅ `useVendorPerformanceMetrics()` - Performance dashboard
- ✅ `useUpdateVendorPerformanceFromPO()` - Record delivery
- ✅ `usePreferredVendorsForItem()` - Ranked vendors for item
- ✅ `useVendorsRankedByPerformance()` - All vendors ranked

---

## 🎨 Available Components

### UI Components
- ✅ `<QuickPurchaseOrderButton />` - One-click PO creation
- ✅ `<InventoryAvailabilityBadge />` - Stock status indicator
- ✅ `<VendorPerformanceIndicator />` - Vendor ratings
- ✅ `<StockStatusIcon />` - Simple stock icon
- ✅ `<VendorStars />` - Star rating only

---

## 🗄️ Database Views

Query these views directly for reports and analytics:

```sql
-- Items with pending PO quantities
SELECT * FROM inventory_purchase_order_summary;

-- Real-time stock availability
SELECT * FROM sales_inventory_availability
WHERE stock_status = 'available';

-- Vendor performance metrics
SELECT * FROM vendor_purchase_performance
WHERE on_time_delivery_rate >= 80;

-- Reorder recommendations
SELECT * FROM inventory_reorder_recommendations
WHERE shortage > 0;

-- Sales order fulfillment status
SELECT * FROM sales_order_fulfillment_status
WHERE fulfillment_status = 'pending';
```

---

## 🔧 Helper Functions

```sql
-- Allocate stock for sales order
SELECT allocate_inventory_stock(
  'item_uuid',
  'warehouse_uuid',
  10  -- quantity
);

-- Deallocate stock (e.g., order cancelled)
SELECT deallocate_inventory_stock(
  'item_uuid',
  'warehouse_uuid',
  10  -- quantity
);
```

---

## 📖 Full Documentation

For complete details, see:
- **Hook Documentation**: `src/hooks/integrations/README.md`
- **Implementation Summary**: `INTEGRATION_LAYER_SUMMARY.md`
- **Type Definitions**: Exported from each hook file

---

## 🆘 Need Help?

1. Check examples above for common patterns
2. Review `README.md` for detailed API reference
3. Inspect component source for implementation details
4. Contact development team for assistance

---

## ✅ Benefits

- **Less Code**: Ready-to-use hooks and components
- **Type Safe**: Full TypeScript support
- **Multi-tenant**: Automatic company filtering
- **Error Handled**: Toast notifications and fallbacks
- **Performant**: Optimized queries and indexes
- **Real-time**: Auto-invalidates queries on changes

Start building powerful cross-module workflows today! 🚀
