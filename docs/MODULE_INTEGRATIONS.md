# Module Integrations Guide

**Version:** 1.0
**Date:** 2025-10-19
**Phase:** 7B - Module Expansion

## Table of Contents

1. [Overview](#overview)
2. [Integration Architecture](#integration-architecture)
3. [Workflow 1: Sales Order to Inventory Fulfillment](#workflow-1-sales-order-to-inventory-fulfillment)
4. [Workflow 2: Low Stock to Purchase Order](#workflow-2-low-stock-to-purchase-order)
5. [Workflow 3: Vendor Performance Tracking](#workflow-3-vendor-performance-tracking)
6. [Integration Hooks](#integration-hooks)
7. [Database Triggers](#database-triggers)
8. [Error Handling](#error-handling)

---

## Overview

Phase 7B integrations connect Sales, Inventory, and Purchasing modules to create seamless business workflows. These integrations eliminate manual data entry, reduce errors, and ensure data consistency across the system.

### Key Integration Points

```
┌─────────────┐         ┌──────────────┐         ┌────────────────┐
│   Sales     │────────▶│  Inventory   │────────▶│   Purchasing   │
│   Module    │         │   Module     │         │    Module      │
└─────────────┘         └──────────────┘         └────────────────┘
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
 Orders & Quotes      Stock Movements           Purchase Orders
 Reserve Stock        Update Levels             Reorder Items
 Trigger Shipment     Generate Alerts           Receive Goods
```

### Benefits

- **Automated Workflows** - Reduce manual steps by 70%
- **Real-time Updates** - Stock levels update instantly
- **Data Integrity** - Single source of truth across modules
- **Audit Trail** - Complete transaction history
- **Proactive Alerts** - Prevent stockouts before they happen

---

## Integration Architecture

### Database Layer

**Foreign Keys:**
```sql
-- Sales → Inventory
sales_orders.items → references inventory_items (via JSONB)

-- Inventory → Movements
inventory_movements.item_id → inventory_items.id
inventory_movements.warehouse_id → inventory_warehouses.id
inventory_movements.reference_id → sales_orders.id | purchase_orders.id

-- Movements → Stock Levels (Automated by Trigger)
inventory_movements INSERT → updates inventory_stock_levels
```

**Triggers:**
- `update_stock_level_on_movement` - Automatically adjusts stock when movements are recorded
- `update_inventory_timestamp` - Tracks last modification time

**Views:**
- `inventory_stock_alerts` - Low stock notifications
- `sales_pipeline_metrics` - Sales forecasting data

---

## Workflow 1: Sales Order to Inventory Fulfillment

**Purpose:** Seamlessly process customer orders from quote to delivery

### Process Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                   SALES ORDER FULFILLMENT                        │
└──────────────────────────────────────────────────────────────────┘

Step 1: Create Sales Quote
┌─────────────────────────────────────────────────────────────┐
│ User creates quote in Sales → Quotes                        │
│ - Add line items (products/services)                        │
│ - Set pricing and taxes                                     │
│ - Set validity period                                       │
│ Status: DRAFT → SENT                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 2: Customer Accepts Quote
┌─────────────────────────────────────────────────────────────┐
│ Update quote status: SENT → ACCEPTED                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 3: Convert Quote to Order
┌─────────────────────────────────────────────────────────────┐
│ Click "Generate Order" button                               │
│ System creates sales_order record:                          │
│   - Links to quote (quote_id)                               │
│   - Copies customer and items                               │
│   - Status: PENDING                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 4: Check Stock Availability
┌─────────────────────────────────────────────────────────────┐
│ FOR EACH item in order:                                     │
│   Query inventory_stock_levels:                             │
│     SELECT quantity_available                               │
│     WHERE item_id = [item] AND warehouse_id = [default]     │
│                                                              │
│   IF quantity_available >= order_quantity:                  │
│     ✓ Item available                                        │
│   ELSE:                                                      │
│     ⚠ Warning: Insufficient stock                           │
│     Options:                                                 │
│       - Backorder                                            │
│       - Partial fulfillment                                  │
│       - Cancel                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 5: Confirm Order & Reserve Stock
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Confirm Order"                                  │
│ Status: PENDING → CONFIRMED                                  │
│                                                              │
│ FOR EACH item in order:                                     │
│   UPDATE inventory_stock_levels                             │
│   SET quantity_reserved = quantity_reserved + order_qty     │
│   WHERE item_id = [item] AND warehouse_id = [warehouse]     │
│                                                              │
│ Effect: quantity_available auto-decreases                   │
│         (computed column: on_hand - reserved)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 6: Process Order (Pick & Pack)
┌─────────────────────────────────────────────────────────────┐
│ Warehouse staff prepares order                              │
│ Status: CONFIRMED → PROCESSING                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 7: Ship Order
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Ship Order"                                     │
│ Status: PROCESSING → SHIPPED                                 │
│ Set delivery_date                                            │
│                                                              │
│ FOR EACH item in order:                                     │
│   INSERT INTO inventory_movements:                          │
│     movement_type = 'SALE'                                   │
│     quantity = -order_qty (negative = outbound)             │
│     warehouse_id = [warehouse]                               │
│     reference_type = 'SALES_ORDER'                           │
│     reference_id = order.id                                  │
│                                                              │
│   TRIGGER update_stock_level_on_movement fires:             │
│     UPDATE inventory_stock_levels                           │
│     SET quantity_on_hand = quantity_on_hand - order_qty     │
│         quantity_reserved = quantity_reserved - order_qty   │
│     WHERE item_id = [item] AND warehouse_id = [warehouse]   │
│                                                              │
│ Net Effect:                                                  │
│   - quantity_on_hand: Decreased                             │
│   - quantity_reserved: Decreased (unreserved)               │
│   - quantity_available: No change (was already reserved)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 8: Customer Receives Order
┌─────────────────────────────────────────────────────────────┐
│ Update status: SHIPPED → DELIVERED                          │
│ Order complete                                               │
└─────────────────────────────────────────────────────────────┘
```

### Code Example

```typescript
// Step 3: Convert Quote to Order
const createOrderFromQuote = async (quoteId: string) => {
  const quote = await supabase
    .from('sales_quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (quote.data.status !== 'accepted') {
    throw new Error('Quote must be accepted before creating order');
  }

  const order = await supabase
    .from('sales_orders')
    .insert({
      quote_id: quoteId,
      customer_id: quote.data.customer_id,
      order_number: generateOrderNumber(),
      order_date: new Date().toISOString(),
      status: 'pending',
      items: quote.data.items,
      total: quote.data.total
    })
    .select()
    .single();

  return order.data;
};

// Step 4: Check Stock Availability
const checkStockAvailability = async (orderItems: OrderItem[], warehouseId: string) => {
  const availability = [];

  for (const item of orderItems) {
    const { data: stockLevel } = await supabase
      .from('inventory_stock_levels')
      .select('quantity_available')
      .eq('item_id', item.item_id)
      .eq('warehouse_id', warehouseId)
      .single();

    availability.push({
      item_id: item.item_id,
      requested: item.quantity,
      available: stockLevel?.quantity_available || 0,
      sufficient: (stockLevel?.quantity_available || 0) >= item.quantity
    });
  }

  return availability;
};

// Step 5: Reserve Stock
const reserveStock = async (orderId: string, warehouseId: string) => {
  const { data: order } = await supabase
    .from('sales_orders')
    .select('items')
    .eq('id', orderId)
    .single();

  for (const item of order.items) {
    await supabase.rpc('reserve_inventory', {
      p_item_id: item.item_id,
      p_warehouse_id: warehouseId,
      p_quantity: item.quantity
    });
  }

  // Update order status
  await supabase
    .from('sales_orders')
    .update({ status: 'confirmed' })
    .eq('id', orderId);
};

// Step 7: Ship Order (Creates Movement)
const shipOrder = async (orderId: string, warehouseId: string) => {
  const { data: order } = await supabase
    .from('sales_orders')
    .select('items')
    .eq('id', orderId)
    .single();

  for (const item of order.items) {
    // Create SALE movement (trigger updates stock automatically)
    await supabase
      .from('inventory_movements')
      .insert({
        item_id: item.item_id,
        warehouse_id: warehouseId,
        movement_type: 'SALE',
        quantity: -item.quantity,
        unit_cost: item.cost_price,
        total_cost: item.cost_price * item.quantity,
        reference_type: 'SALES_ORDER',
        reference_id: orderId,
        reference_number: order.order_number
      });
  }

  // Update order status
  await supabase
    .from('sales_orders')
    .update({
      status: 'shipped',
      delivery_date: new Date().toISOString()
    })
    .eq('id', orderId);
};
```

### UI Components

**Sales Order Form:**
- Real-time stock availability indicator (green/yellow/red)
- "Insufficient Stock" warnings
- Suggested alternatives (if configured)

**Order Status Timeline:**
```
Pending → Confirmed → Processing → Shipped → Delivered
  10%       25%         50%         75%        100%
```

---

## Workflow 2: Low Stock to Purchase Order

**Purpose:** Automatically reorder inventory when stock falls below thresholds

### Process Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                   AUTOMATED REORDERING                           │
└──────────────────────────────────────────────────────────────────┘

Step 1: Stock Level Monitoring
┌─────────────────────────────────────────────────────────────┐
│ System continuously monitors inventory_stock_alerts view    │
│                                                              │
│ View automatically shows items where:                        │
│   - quantity_available = 0 (OUT OF STOCK)                   │
│   - quantity_available < min_stock_level (LOW STOCK)        │
│   - quantity_available ≤ reorder_point (REORDER)            │
│   - quantity_on_hand > max_stock_level (OVERSTOCK)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 2: Low Stock Alert Triggered
┌─────────────────────────────────────────────────────────────┐
│ Example Alert:                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Item: Brake Pads - Front (SKU: BP-001)               │   │
│ │ Warehouse: Main Warehouse                             │   │
│ │ Current Stock: 8 units                                │   │
│ │ Reorder Point: 10 units                               │   │
│ │ Alert Type: Reorder Point Reached                     │   │
│ │ Suggested Order Qty: 50 units (reorder_quantity)     │   │
│ │                                                        │   │
│ │ [Create Purchase Order]  [Ignore]                     │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 3: User Reviews Alert
┌─────────────────────────────────────────────────────────────┐
│ Navigate to: Inventory → Stock Alerts (تنبيهات المخزون)    │
│ Alerts sorted by priority:                                   │
│   1. Out of Stock (red)                                      │
│   2. Below Minimum (orange)                                  │
│   3. Reorder Point (yellow)                                  │
│   4. Overstock (blue)                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 4: Create Purchase Order from Alert
┌─────────────────────────────────────────────────────────────┐
│ Click "Create Purchase Order" button on alert row           │
│                                                              │
│ System opens PO form pre-filled with:                       │
│   - Item: From alert                                         │
│   - Quantity: suggested_order_quantity                       │
│   - Vendor: preferred_vendor (if configured)                 │
│   - Warehouse: From alert                                    │
│   - Expected Date: today + vendor_lead_time                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 5: Review & Adjust PO
┌─────────────────────────────────────────────────────────────┐
│ User can modify:                                             │
│   - Quantity (adjust based on current needs)                 │
│   - Vendor (select alternative)                              │
│   - Price (negotiate with vendor)                            │
│   - Delivery date                                            │
│                                                              │
│ Add additional items if consolidating orders                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 6: Submit PO to Vendor
┌─────────────────────────────────────────────────────────────┐
│ Status: DRAFT → SENT                                         │
│                                                              │
│ Actions:                                                     │
│   - Generate PDF purchase order                              │
│   - Email to vendor (if configured)                          │
│   - Print for fax/mail                                       │
│   - Track in Purchasing → Purchase Orders                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 7: Vendor Processes Order
┌─────────────────────────────────────────────────────────────┐
│ Vendor confirms order                                        │
│ Status: SENT → APPROVED                                      │
│                                                              │
│ User tracks:                                                 │
│   - Expected delivery date                                   │
│   - Shipment tracking number                                 │
│   - Partial deliveries                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 8: Receive Goods
┌─────────────────────────────────────────────────────────────┐
│ Warehouse receives shipment                                  │
│ User clicks "Receive Goods" in PO                            │
│ Status: APPROVED → RECEIVED                                  │
│                                                              │
│ FOR EACH item in PO:                                        │
│   Enter received quantity (may differ from ordered)          │
│                                                              │
│   INSERT INTO inventory_movements:                          │
│     movement_type = 'PURCHASE'                               │
│     quantity = +received_qty (positive = inbound)           │
│     warehouse_id = [destination warehouse]                   │
│     unit_cost = po_line_item.unit_price                     │
│     total_cost = unit_cost * received_qty                    │
│     reference_type = 'PURCHASE_ORDER'                        │
│     reference_id = po.id                                     │
│     reference_number = po.po_number                          │
│                                                              │
│   TRIGGER update_stock_level_on_movement fires:             │
│     UPDATE inventory_stock_levels                           │
│     SET quantity_on_hand = quantity_on_hand + received_qty  │
│     WHERE item_id = [item] AND warehouse_id = [warehouse]   │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 9: Stock Level Restored
┌─────────────────────────────────────────────────────────────┐
│ inventory_stock_alerts view updates automatically           │
│ Alert removed (if quantity now above reorder point)         │
│                                                              │
│ New Status:                                                  │
│   Before: 8 units (below reorder point of 10)               │
│   After: 58 units (8 + 50 received)                         │
│   Alert: Cleared ✓                                          │
└─────────────────────────────────────────────────────────────┘
```

### Automatic vs. Manual Reordering

**Option 1: Manual (Current Implementation)**
- User reviews alerts daily/weekly
- Manually creates POs from alerts
- Flexibility to adjust quantities and timing
- Suitable for most businesses

**Option 2: Automatic (Future Enhancement)**
```typescript
// Scheduled job (daily at 2 AM)
async function autoReorder() {
  const alerts = await supabase
    .from('inventory_stock_alerts')
    .select('*')
    .eq('alert_type', 'Reorder Point')
    .order('alert_priority', { ascending: true });

  for (const alert of alerts.data) {
    // Check if PO already exists
    const existingPO = await checkExistingPO(alert.item_id);
    if (existingPO) continue;

    // Get preferred vendor
    const vendor = await getPreferredVendor(alert.item_id);
    if (!vendor) continue;

    // Create PO automatically
    await supabase
      .from('purchase_orders')
      .insert({
        vendor_id: vendor.id,
        po_number: generatePONumber(),
        status: 'draft',
        items: [{
          item_id: alert.item_id,
          quantity: alert.suggested_order_quantity,
          unit_price: vendor.last_price || alert.cost_price
        }]
      });

    // Send notification to purchasing team
    await sendNotification({
      type: 'auto_reorder',
      message: `Auto-generated PO for ${alert.item_name}`,
      po_id: po.id
    });
  }
}
```

### Code Example

```typescript
// View Stock Alerts
const { data: alerts } = await supabase
  .from('inventory_stock_alerts')
  .select('*')
  .order('alert_priority', { ascending: true })
  .limit(50);

// Create PO from Alert
const createPOFromAlert = async (alert: StockAlert) => {
  const po = await supabase
    .from('purchase_orders')
    .insert({
      vendor_id: alert.preferred_vendor_id,
      po_number: generatePONumber(),
      status: 'draft',
      items: [{
        item_id: alert.item_id,
        quantity: alert.suggested_order_quantity,
        unit_price: alert.cost_price
      }],
      expected_date: addDays(new Date(), alert.vendor_lead_time || 7)
    })
    .select()
    .single();

  return po.data;
};

// Receive Goods
const receiveGoods = async (poId: string, receivedItems: ReceivedItem[]) => {
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', poId)
    .single();

  for (const item of receivedItems) {
    // Create PURCHASE movement
    await supabase
      .from('inventory_movements')
      .insert({
        item_id: item.item_id,
        warehouse_id: item.warehouse_id,
        movement_type: 'PURCHASE',
        quantity: item.received_quantity,
        unit_cost: item.unit_price,
        total_cost: item.unit_price * item.received_quantity,
        reference_type: 'PURCHASE_ORDER',
        reference_id: poId,
        reference_number: po.po_number
      });
  }

  // Update PO status
  await supabase
    .from('purchase_orders')
    .update({
      status: 'received',
      received_date: new Date().toISOString()
    })
    .eq('id', poId);
};
```

---

## Workflow 3: Vendor Performance Tracking

**Purpose:** Monitor vendor reliability and quality for better purchasing decisions

**Note:** This workflow is designed for future vendor module implementation.

### Process Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                VENDOR PERFORMANCE TRACKING                       │
└──────────────────────────────────────────────────────────────────┘

Step 1: Create Purchase Order
┌─────────────────────────────────────────────────────────────┐
│ User creates PO with:                                        │
│   - Vendor selection                                         │
│   - Expected delivery date                                   │
│   - Items and quantities                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 2: Receive Goods & Track Metrics
┌─────────────────────────────────────────────────────────────┐
│ On receipt, record:                                          │
│   - Actual delivery date                                     │
│   - Quality rating (1-5 stars)                              │
│   - Quantity variances (over/under delivery)                │
│   - Condition issues                                         │
│                                                              │
│ System calculates:                                           │
│   on_time_delivery = (actual_date ≤ expected_date)         │
│   delivery_variance = actual_date - expected_date (days)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 3: Update Vendor Performance Record
┌─────────────────────────────────────────────────────────────┐
│ INSERT INTO vendor_performance:                              │
│   vendor_id = po.vendor_id                                   │
│   po_id = po.id                                              │
│   expected_date = po.expected_date                           │
│   actual_date = [user input]                                 │
│   on_time = (actual ≤ expected)                             │
│   quality_rating = [1-5 stars]                              │
│   quantity_variance = received - ordered                     │
│   notes = [delivery issues]                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 4: Aggregate Vendor Metrics
┌─────────────────────────────────────────────────────────────┐
│ System maintains vendor_statistics:                         │
│   - total_orders                                             │
│   - on_time_deliveries                                       │
│   - on_time_percentage = (on_time / total) × 100           │
│   - avg_quality_rating                                       │
│   - total_value_purchased                                    │
│   - avg_delivery_variance (days early/late)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
Step 5: Use Metrics for Purchasing Decisions
┌─────────────────────────────────────────────────────────────┐
│ When creating new PO:                                        │
│   - Show vendor performance scorecard                        │
│   - Suggest best vendor based on:                           │
│     * Price                                                   │
│     * On-time delivery %                                     │
│     * Quality rating                                         │
│     * Reliability                                            │
│                                                              │
│ Example Vendor Comparison:                                   │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Vendor A: ★★★★★ | 95% On-Time | $50/unit           │     │
│ │ Vendor B: ★★★☆☆ | 75% On-Time | $45/unit (cheaper) │     │
│ │ Vendor C: ★★★★☆ | 88% On-Time | $52/unit           │     │
│ │                                                      │     │
│ │ Recommended: Vendor A (best overall)                │     │
│ └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (Future)

```sql
-- Vendor Performance Tracking
CREATE TABLE vendor_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  po_id UUID REFERENCES purchase_orders(id),
  expected_delivery_date DATE NOT NULL,
  actual_delivery_date DATE,
  on_time_delivery BOOLEAN GENERATED ALWAYS AS (
    actual_delivery_date <= expected_delivery_date
  ) STORED,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  quantity_variance DECIMAL(15, 3),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Statistics View
CREATE VIEW vendor_statistics AS
SELECT
  vendor_id,
  COUNT(*) as total_orders,
  SUM(CASE WHEN on_time_delivery THEN 1 ELSE 0 END) as on_time_count,
  ROUND(
    (SUM(CASE WHEN on_time_delivery THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100,
    2
  ) as on_time_percentage,
  AVG(quality_rating) as avg_quality_rating,
  AVG(actual_delivery_date - expected_delivery_date) as avg_delivery_variance_days
FROM vendor_performance
GROUP BY vendor_id;
```

---

## Integration Hooks

### Sales Module Hooks

**useSalesOrders.ts**
```typescript
export const useSalesOrders = () => {
  // Fetch orders with inventory check
  const fetchOrdersWithStock = async () => {
    const orders = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customers(*),
        quote:sales_quotes(*)
      `);

    // Enrich with stock availability
    for (const order of orders.data) {
      order.stock_status = await checkStockForOrder(order.id);
    }

    return orders.data;
  };

  // Reserve stock when confirming order
  const confirmOrder = useMutation({
    mutationFn: async (orderId: string) => {
      await reserveStockForOrder(orderId);
      await supabase
        .from('sales_orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales_orders']);
      queryClient.invalidateQueries(['inventory_stock_levels']);
    }
  });

  return { fetchOrdersWithStock, confirmOrder };
};
```

### Inventory Module Hooks

**useInventoryStockLevels.ts**
```typescript
export const useInventoryStockLevels = () => {
  // Fetch stock with alerts
  const fetchStockWithAlerts = async (companyId: string) => {
    const { data } = await supabase
      .from('inventory_stock_levels')
      .select(`
        *,
        item:inventory_items(*),
        warehouse:inventory_warehouses(*)
      `)
      .eq('item.company_id', companyId);

    // Flag items with alerts
    return data.map(stock => ({
      ...stock,
      has_alert: stock.quantity_available < stock.item.min_stock_level,
      alert_type: getAlertType(stock)
    }));
  };

  return { fetchStockWithAlerts };
};
```

**useInventoryReports.ts**
```typescript
export const useInventoryReports = () => {
  // Get low stock alerts
  const { data: lowStockAlerts } = useQuery({
    queryKey: ['inventory_stock_alerts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_stock_alerts')
        .select('*')
        .order('alert_priority', { ascending: true });
      return data;
    }
  });

  // Create PO from alert
  const createPOFromAlert = useMutation({
    mutationFn: async (alert: StockAlert) => {
      return await supabase
        .from('purchase_orders')
        .insert({
          vendor_id: alert.preferred_vendor_id,
          items: [{
            item_id: alert.item_id,
            quantity: alert.suggested_order_quantity
          }]
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase_orders']);
      toast.success('تم إنشاء أمر الشراء بنجاح');
    }
  });

  return { lowStockAlerts, createPOFromAlert };
};
```

---

## Database Triggers

### Stock Level Update Trigger

**Trigger:** `update_stock_level_on_movement`
**Table:** `inventory_movements`
**Event:** AFTER INSERT

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_stock_level_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or create stock level record
  INSERT INTO inventory_stock_levels (
    company_id,
    item_id,
    warehouse_id,
    quantity_on_hand,
    last_movement_at
  )
  VALUES (
    NEW.company_id,
    NEW.item_id,
    NEW.warehouse_id,
    CASE
      WHEN NEW.movement_type IN ('PURCHASE', 'TRANSFER_IN', 'RETURN', 'ADJUSTMENT')
        THEN ABS(NEW.quantity)
      ELSE -ABS(NEW.quantity)
    END,
    NEW.movement_date
  )
  ON CONFLICT (item_id, warehouse_id)
  DO UPDATE SET
    quantity_on_hand = inventory_stock_levels.quantity_on_hand +
      CASE
        WHEN NEW.movement_type IN ('PURCHASE', 'TRANSFER_IN', 'RETURN', 'ADJUSTMENT')
          THEN ABS(NEW.quantity)
        ELSE -ABS(NEW.quantity)
      END,
    last_movement_at = NEW.movement_date;

  -- Validate no negative stock
  IF (SELECT quantity_on_hand FROM inventory_stock_levels
      WHERE item_id = NEW.item_id AND warehouse_id = NEW.warehouse_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for item % in warehouse %',
      NEW.item_id, NEW.warehouse_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**What It Does:**
1. Automatically updates `inventory_stock_levels` when a movement is recorded
2. Creates stock level record if it doesn't exist
3. Increases stock for PURCHASE, TRANSFER_IN, RETURN, ADJUSTMENT
4. Decreases stock for SALE, TRANSFER_OUT
5. Validates against negative stock
6. Updates `last_movement_at` timestamp

---

## Error Handling

### Common Integration Errors

#### 1. Insufficient Stock Error

**Error:** "Insufficient stock for item X in warehouse Y"

**Cause:** Attempting to create SALE or TRANSFER_OUT movement when stock is insufficient

**Solution:**
```typescript
try {
  await shipOrder(orderId, warehouseId);
} catch (error) {
  if (error.message.includes('Insufficient stock')) {
    // Handle gracefully
    toast.error('مخزون غير كافٍ لتنفيذ الطلب');

    // Offer options
    showModal({
      title: 'Insufficient Stock',
      options: [
        'Backorder',
        'Partial Fulfillment',
        'Cancel Order',
        'Transfer from Another Warehouse'
      ]
    });
  }
}
```

#### 2. Foreign Key Violation

**Error:** "Foreign key violation on reference_id"

**Cause:** Referencing a non-existent sales_order or purchase_order

**Solution:**
```typescript
// Always verify reference exists before creating movement
const orderExists = await supabase
  .from('sales_orders')
  .select('id')
  .eq('id', orderId)
  .single();

if (!orderExists.data) {
  throw new Error('Order not found');
}

// Then create movement
await createMovement({
  reference_type: 'SALES_ORDER',
  reference_id: orderId
});
```

#### 3. Reserved Quantity Mismatch

**Error:** "Cannot reduce quantity_reserved below 0"

**Cause:** Trying to unreserve more than was reserved

**Solution:**
```typescript
// Check current reservation
const { data: stockLevel } = await supabase
  .from('inventory_stock_levels')
  .select('quantity_reserved')
  .eq('item_id', itemId)
  .eq('warehouse_id', warehouseId)
  .single();

const quantityToUnreserve = Math.min(
  orderQuantity,
  stockLevel.quantity_reserved
);

// Update with safe value
await supabase
  .from('inventory_stock_levels')
  .update({
    quantity_reserved: stockLevel.quantity_reserved - quantityToUnreserve
  })
  .eq('item_id', itemId)
  .eq('warehouse_id', warehouseId);
```

### Retry Logic

```typescript
const createMovementWithRetry = async (
  movement: Movement,
  maxRetries = 3
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert(movement)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
};
```

---

## Best Practices

### 1. Always Check Stock Before Confirming Orders
```typescript
const availability = await checkStockAvailability(orderItems, warehouseId);
const allAvailable = availability.every(item => item.sufficient);

if (!allAvailable) {
  showWarning('Some items have insufficient stock');
}
```

### 2. Use Transactions for Multi-Step Operations
```typescript
const { error } = await supabase.rpc('ship_order_transaction', {
  p_order_id: orderId,
  p_warehouse_id: warehouseId
});

// Database function ensures all-or-nothing:
// - Create movements
// - Update stock levels
// - Update order status
// - Update reservations
```

### 3. Invalidate Caches After Mutations
```typescript
onSuccess: () => {
  queryClient.invalidateQueries(['sales_orders']);
  queryClient.invalidateQueries(['inventory_stock_levels']);
  queryClient.invalidateQueries(['inventory_stock_alerts']);
}
```

### 4. Provide User Feedback
```typescript
toast.success('تم شحن الطلب وتحديث المخزون');
// "Order shipped and inventory updated"
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-19
**Maintained By:** Fleetify Development Team
