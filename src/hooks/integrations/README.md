# Integration Hooks - Module Integration Layer

This directory contains integration hooks that connect different modules in the Fleetify system:
- Inventory Management
- Purchase Orders
- Sales Orders
- Vendor Management

## Overview

The integration layer enables seamless data flow and business processes across modules through:
- **Custom React Hooks**: For data fetching and mutations
- **UI Components**: For user interactions
- **Database Views**: For efficient cross-module queries
- **Helper Functions**: For common operations

## Integration Hooks

### 1. Inventory ↔ Purchase Orders
**File**: `useInventoryPurchaseOrders.ts`

#### Hooks

##### `useCreatePOFromLowStock()`
Auto-generates purchase orders from low stock items.

```typescript
const createPO = useCreatePOFromLowStock();

await createPO.mutateAsync({
  item_id: 'uuid',
  vendor_id: 'uuid',
  quantity: 100,
  expected_delivery_date: '2025-11-01',
  notes: 'Urgent reorder',
});
```

**Features**:
- Pre-fills item details
- Calculates totals automatically
- Generates PO number
- Links to inventory item

##### `useReceivePOToInventory()`
Receives purchase orders and updates inventory stock.

```typescript
const receivePO = useReceivePOToInventory();

await receivePO.mutateAsync({
  po_id: 'uuid',
  warehouse_id: 'uuid',
  items: [
    { item_id: 'uuid', quantity_received: 50, notes: 'Partial delivery' },
  ],
});
```

**Features**:
- Creates inventory movements (PURCHASE type)
- Updates stock levels
- Updates PO item received quantities
- Changes PO status (received/partially_received)

##### `useInventoryPurchaseHistory(itemId)`
Gets purchase history for an inventory item.

```typescript
const { data: history } = useInventoryPurchaseHistory(itemId);

// Returns: Array of PO records with vendor, quantities, prices
```

##### `usePreferredVendorForItem(itemId)`
Finds the best vendor for an item based on past purchases.

```typescript
const { data: vendor } = usePreferredVendorForItem(itemId);

// Returns: {
//   vendor_id, vendor_name, last_purchase_price,
//   total_orders, on_time_delivery_rate, avg_delivery_days
// }
```

**Ranking Algorithm**:
- 70% on-time delivery rate
- 30% price competitiveness

---

### 2. Inventory ↔ Sales Orders
**File**: `useInventorySalesOrders.ts`

#### Hooks

##### `useCreateSalesOrderFromInventory()`
Creates sales orders with inventory allocation.

```typescript
const createOrder = useCreateSalesOrderFromInventory();

await createOrder.mutateAsync({
  customer_id: 'uuid',
  order_date: '2025-10-20',
  delivery_date: '2025-10-25',
  warehouse_id: 'uuid',
  items: [
    { item_id: 'uuid', quantity: 10 },
    { item_id: 'uuid', quantity: 5 },
  ],
  notes: 'Rush order',
});
```

**Features**:
- Checks stock availability before creation
- Validates quantities against available stock
- Calculates totals from item prices
- Allocates inventory (updates quantity_allocated)
- Generates order number

##### `useFulfillSalesOrder()`
Fulfills sales orders and reduces inventory.

```typescript
const fulfill = useFulfillSalesOrder();

await fulfill.mutateAsync({
  order_id: 'uuid',
  warehouse_id: 'uuid',
  fulfillment_date: '2025-10-20', // optional
});
```

**Features**:
- Creates inventory movements (SALE type)
- Reduces stock levels
- Updates order status to 'shipped'
- Sets delivery date

##### `useInventoryAvailabilityCheck(items, warehouseId)`
Checks if items are available in stock.

```typescript
const { data: availability } = useInventoryAvailabilityCheck(
  [
    { item_id: 'uuid', quantity: 10 },
    { item_id: 'uuid', quantity: 5 },
  ],
  warehouseId
);

// Returns: Array of availability status for each item
// { item_id, item_name, quantity_requested, quantity_available,
//   is_available, shortage }
```

##### `useInventorySalesHistory(itemId)`
Gets sales history for an inventory item.

```typescript
const { data: history } = useInventorySalesHistory(itemId);

// Returns: Array of sales orders containing this item
```

---

### 3. Vendors ↔ Purchase Orders
**File**: `useVendorPurchaseOrders.ts`

#### Hooks

##### `useVendorPurchaseHistory(vendorId)`
Gets all purchase orders for a vendor.

```typescript
const { data: history } = useVendorPurchaseHistory(vendorId);

// Returns: Array of PO records with delivery metrics
```

##### `useVendorPerformanceMetrics(vendorId)`
Gets comprehensive performance metrics for a vendor.

```typescript
const { data: metrics } = useVendorPerformanceMetrics(vendorId);

// Returns: {
//   vendor_id, vendor_name, total_orders, total_amount,
//   on_time_delivery_count, late_delivery_count,
//   on_time_delivery_rate, avg_delivery_days, quality_score
// }
```

**Metrics Calculated**:
- Total orders and value
- On-time vs late deliveries
- On-time delivery rate (%)
- Average delivery days
- Quality score (1-5 stars based on performance)

##### `useUpdateVendorPerformanceFromPO()`
Updates vendor performance after PO delivery.

```typescript
const updatePerformance = useUpdateVendorPerformanceFromPO();

await updatePerformance.mutateAsync({
  po_id: 'uuid',
  delivered_on_time: true,
  quality_rating: 4.5,
  notes: 'Good quality products',
});
```

##### `usePreferredVendorsForItem(itemCode)`
Gets ranked vendors for a specific item.

```typescript
const { data: vendors } = usePreferredVendorsForItem(itemCode);

// Returns: Array of vendors sorted by performance score
```

**Ranking Algorithm**:
- 60% on-time delivery rate
- 40% price competitiveness

##### `useVendorsRankedByPerformance()`
Gets all vendors ranked by overall performance.

```typescript
const { data: vendors } = useVendorsRankedByPerformance();

// Returns: Array of all vendors with performance scores
```

**Ranking Algorithm**:
- 70% on-time delivery rate
- 30% delivery speed (faster is better)

---

## UI Components

### 1. QuickPurchaseOrderButton
**File**: `components/integrations/QuickPurchaseOrderButton.tsx`

One-click purchase order creation for low stock items.

```tsx
import { QuickPurchaseOrderButton } from '@/components/integrations';

<QuickPurchaseOrderButton
  itemId="uuid"
  variant="default"
  size="sm"
/>
```

**Features**:
- Opens pre-filled PO dialog
- Suggests preferred vendor
- Auto-fills reorder quantity
- Shows item details and estimated cost

### 2. InventoryAvailabilityBadge
**File**: `components/integrations/InventoryAvailabilityBadge.tsx`

Real-time stock availability indicator with color coding.

```tsx
import { InventoryAvailabilityBadge, StockStatusIcon } from '@/components/integrations';

// Full badge with tooltip
<InventoryAvailabilityBadge
  itemId="uuid"
  quantityNeeded={10}
  warehouseId="uuid" // optional
  showDetails={true}
/>

// Simple icon
<StockStatusIcon
  itemId="uuid"
  quantityNeeded={10}
  warehouseId="uuid"
/>
```

**Color Coding**:
- 🟢 Green: In Stock (available >= needed)
- 🟠 Orange: Low Stock (0 < available < needed)
- 🔴 Red: Out of Stock (available = 0)

### 3. VendorPerformanceIndicator
**File**: `components/integrations/VendorPerformanceIndicator.tsx`

Vendor performance display with star ratings.

```tsx
import { VendorPerformanceIndicator, VendorStars } from '@/components/integrations';

// Compact star rating with tooltip
<VendorPerformanceIndicator
  vendorId="uuid"
  variant="compact"
/>

// Inline badges
<VendorPerformanceIndicator
  vendorId="uuid"
  variant="inline"
/>

// Detailed metrics card
<VendorPerformanceIndicator
  vendorId="uuid"
  variant="detailed"
/>

// Simple stars
<VendorStars vendorId="uuid" showScore={true} />
```

**Variants**:
- `compact`: Star rating + tooltip (default)
- `inline`: Horizontal badges with key metrics
- `detailed`: Full metrics card

**Performance Levels**:
- 🌟🌟🌟🌟🌟 Excellent (≥90% on-time)
- 🌟🌟🌟🌟 Good (75-89%)
- 🌟🌟🌟 Average (60-74%)
- 🌟🌟 Poor (<60%)

---

## Database Views

**File**: `supabase/migrations/20251019230000_create_integration_views.sql`

### 1. inventory_purchase_order_summary
Shows items with pending/received PO quantities.

```sql
SELECT * FROM inventory_purchase_order_summary
WHERE item_id = 'uuid';
```

**Columns**: item details, PO status, ordered quantities, received quantities, pending quantities, PO values

### 2. sales_inventory_availability
Real-time stock availability for sales operations.

```sql
SELECT * FROM sales_inventory_availability
WHERE stock_status = 'available';
```

**Columns**: item details, warehouse details, stock levels, stock status

### 3. vendor_purchase_performance
Vendor performance metrics from purchase orders.

```sql
SELECT * FROM vendor_purchase_performance
WHERE on_time_delivery_rate >= 80
ORDER BY total_purchase_value DESC;
```

**Columns**: vendor details, order counts, delivery metrics, performance rates

### 4. inventory_movement_summary
Aggregated inventory movements for analytics.

```sql
SELECT * FROM inventory_movement_summary
WHERE movement_type = 'SALE'
  AND movement_date >= CURRENT_DATE - INTERVAL '30 days';
```

### 5. inventory_reorder_recommendations
Items requiring reorder with vendor suggestions.

```sql
SELECT * FROM inventory_reorder_recommendations
WHERE shortage > 0
ORDER BY shortage DESC;
```

**Columns**: item details, stock levels, shortage, suggested quantity, preferred vendor

### 6. sales_order_fulfillment_status
Sales orders with inventory allocation status.

```sql
SELECT * FROM sales_order_fulfillment_status
WHERE fulfillment_status = 'pending';
```

---

## Helper Functions

### allocate_inventory_stock()
Allocates inventory for sales orders.

```sql
SELECT allocate_inventory_stock(
  'item_id_uuid',
  'warehouse_id_uuid',
  10  -- quantity
);
```

**Actions**:
- Increases `quantity_allocated`
- Decreases `quantity_available`
- Validates sufficient stock

### deallocate_inventory_stock()
Deallocates inventory when orders are cancelled.

```sql
SELECT deallocate_inventory_stock(
  'item_id_uuid',
  'warehouse_id_uuid',
  10  -- quantity
);
```

**Actions**:
- Decreases `quantity_allocated`
- Increases `quantity_available`

---

## Usage Examples

### Example 1: Create PO from Low Stock Alert

```typescript
import { useCreatePOFromLowStock } from '@/hooks/integrations';

function LowStockAlert({ item }) {
  const createPO = useCreatePOFromLowStock();

  const handleCreatePO = async () => {
    await createPO.mutateAsync({
      item_id: item.id,
      vendor_id: item.preferred_vendor_id,
      quantity: item.reorder_quantity,
      expected_delivery_date: addDays(new Date(), 7),
    });
  };

  return (
    <Alert>
      <AlertTitle>Low Stock: {item.item_name}</AlertTitle>
      <Button onClick={handleCreatePO}>Create Purchase Order</Button>
    </Alert>
  );
}
```

### Example 2: Check Stock Before Creating Sales Order

```typescript
import { useInventoryAvailabilityCheck, useCreateSalesOrderFromInventory } from '@/hooks/integrations';

function CreateSalesOrder({ items, warehouseId }) {
  const { data: availability } = useInventoryAvailabilityCheck(items, warehouseId);
  const createOrder = useCreateSalesOrderFromInventory();

  const canFulfill = availability?.every(item => item.is_available);

  const handleCreateOrder = async () => {
    if (!canFulfill) {
      toast.error('Some items are not available in stock');
      return;
    }

    await createOrder.mutateAsync({
      warehouse_id: warehouseId,
      items,
      order_date: new Date().toISOString(),
    });
  };

  return (
    <div>
      {availability?.map(item => (
        <InventoryAvailabilityBadge
          key={item.item_id}
          itemId={item.item_id}
          quantityNeeded={item.quantity_requested}
          warehouseId={warehouseId}
        />
      ))}
      <Button onClick={handleCreateOrder} disabled={!canFulfill}>
        Create Order
      </Button>
    </div>
  );
}
```

### Example 3: Display Vendor Performance

```typescript
import { VendorPerformanceIndicator } from '@/components/integrations';

function VendorList({ vendors }) {
  return (
    <div className="space-y-4">
      {vendors.map(vendor => (
        <Card key={vendor.id}>
          <CardHeader>
            <CardTitle>{vendor.vendor_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <VendorPerformanceIndicator
              vendorId={vendor.id}
              variant="detailed"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Best Practices

1. **Stock Validation**: Always check stock availability before creating sales orders
2. **Error Handling**: Wrap mutations in try-catch blocks
3. **Multi-tenant**: All hooks respect company_id from auth context
4. **Real-time Updates**: Hooks invalidate relevant queries on success
5. **Performance**: Use database views for complex cross-module queries
6. **Allocation**: Use allocation functions to prevent overselling

---

## Integration Workflows

### Workflow 1: Low Stock → Purchase Order → Receipt
1. Monitor low stock with `useLowStockItems()`
2. Create PO with `useCreatePOFromLowStock()`
3. Receive PO with `useReceivePOToInventory()`
4. Stock levels auto-update via triggers

### Workflow 2: Sales Order → Allocation → Fulfillment
1. Check availability with `useInventoryAvailabilityCheck()`
2. Create order with `useCreateSalesOrderFromInventory()`
3. Inventory allocated automatically
4. Fulfill with `useFulfillSalesOrder()`
5. Stock reduced via SALE movements

### Workflow 3: Vendor Performance Tracking
1. View history with `useVendorPurchaseHistory()`
2. Update performance with `useUpdateVendorPerformanceFromPO()`
3. Display metrics with `VendorPerformanceIndicator`
4. Use rankings for vendor selection

---

## Database Schema Dependencies

### Required Tables
- `inventory_items`
- `inventory_stock_levels`
- `inventory_movements`
- `inventory_warehouses`
- `purchase_orders`
- `purchase_order_items`
- `sales_orders`
- `vendors`

### Optional Tables
- `vendor_performance` (for extended metrics)

---

## Future Enhancements

1. **Automatic Reordering**: Trigger PO creation when stock hits reorder point
2. **Demand Forecasting**: ML-based reorder quantity suggestions
3. **Multi-warehouse Transfers**: Auto-balance stock across warehouses
4. **Vendor Price Comparison**: Real-time price tracking and alerts
5. **Quality Tracking**: Link QC data to vendor performance
6. **Return Processing**: Handle RMA and stock returns

---

## Support

For questions or issues:
- Check existing components for usage examples
- Review database views for query patterns
- See hook implementations for business logic
- Contact development team for assistance
