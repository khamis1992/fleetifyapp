# Phase 7B Features Guide

**Version:** 1.3
**Date:** 2025-10-19
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Sales/CRM Module](#salescrm-module)
3. [Inventory Management](#inventory-management)
4. [Integration Workflows](#integration-workflows)
5. [Analytics & Reporting](#analytics--reporting)
6. [Security & Access Control](#security--access-control)
7. [Best Practices](#best-practices)

---

## Overview

Phase 7B transforms Fleetify from a fleet management system into a complete Enterprise Resource Planning (ERP) solution. This expansion adds comprehensive Sales/CRM capabilities and advanced multi-warehouse inventory management.

### What's New

**Sales & CRM:**
- Lead capture and qualification
- Opportunity pipeline management
- Quote generation with line items
- Order tracking and fulfillment

**Inventory:**
- Multi-warehouse stock management
- Real-time inventory tracking
- Stock movements audit trail
- Automated reorder alerts
- Advanced analytics (valuation, aging, turnover)

**System Enhancements:**
- 15 new database tables
- 45+ performance indexes
- 35+ Row-Level Security policies
- 10 new React Query hooks
- 6 analytical views and functions

---

## Sales/CRM Module

### Lead Management

**Purpose:** Track potential customers from initial contact to conversion

**Workflow:**
```
New Lead → Contact → Qualify → Convert to Opportunity
                            ↓
                     Mark as Unqualified/Lost
```

#### Lead Statuses
- **New** - Initial contact received
- **Contacted** - First outreach made
- **Qualified** - Meets criteria for sales pursuit
- **Unqualified** - Does not meet criteria
- **Converted** - Moved to opportunity
- **Lost** - No longer pursuing

#### Key Features
- Track lead source (website, referral, cold call, trade show, etc.)
- Assign leads to sales representatives
- Add notes and contact details
- Bilingual support (Arabic & English)

#### Access Route
Navigate to: **Sales → Leads** (القوائم)

---

### Sales Pipeline (Opportunities)

**Purpose:** Manage deals through the sales cycle with revenue forecasting

**Pipeline Stages:**
```
Lead → Qualified → Proposal → Negotiation → Won/Lost
```

#### Stage Descriptions

| Stage | Arabic | Description | Typical Actions |
|-------|--------|-------------|-----------------|
| Lead | قائمة محتملة | Initial interest | Research, qualification |
| Qualified | مؤهل | Meets criteria | Needs assessment |
| Proposal | عرض | Quote submitted | Follow-up, clarify |
| Negotiation | تفاوض | Terms discussion | Pricing, contracts |
| Won | فوز | Deal closed | Generate order |
| Lost | خسارة | Deal lost | Document reasons |

#### Key Features
- **Estimated Value** - Expected deal size
- **Probability** - Win likelihood (0-100%)
- **Expected Close Date** - Forecasted closure
- **Assigned To** - Sales rep ownership
- Link to originating lead

#### Revenue Forecasting
Weighted pipeline value = Sum(Estimated Value × Probability ÷ 100)

#### Access Route
Navigate to: **Sales → Opportunities** (الفرص)

---

### Quote Generation

**Purpose:** Create professional quotations for customers

#### Quote Lifecycle
```
Draft → Sent → Accepted → Generate Order
                     ↓
                  Rejected/Expired
```

#### Key Features
- **Unique Quote Number** - Auto-generated or manual
- **Line Items** - JSONB array for flexible products/services
- **Automatic Calculations**:
  - Subtotal = Sum of line item totals
  - Tax = Configurable tax rate
  - Total = Subtotal + Tax
- **Validity Period** - Quote expiration date
- **Customer Link** - Associate with customer record
- **Opportunity Link** - Track which opportunity generated quote

#### Quote Statuses
- **Draft** - Being prepared
- **Sent** - Delivered to customer
- **Accepted** - Customer approved
- **Rejected** - Customer declined
- **Expired** - Past validity date

#### Access Route
Navigate to: **Sales → Quotes** (العروض)

---

### Order Fulfillment

**Purpose:** Track confirmed orders from acceptance to delivery

#### Order Workflow
```
Pending → Confirmed → Processing → Shipped → Delivered
                                         ↓
                                    Cancelled
```

#### Key Features
- **Order Number** - Unique identifier
- **Order Date** - When order was placed
- **Delivery Date** - Expected/actual delivery
- **Items** - JSONB array with quantities and prices
- **Total Amount** - Final order value
- **Quote Conversion** - Link back to original quote
- **Inventory Integration** - Auto-reserve stock on confirmation

#### Order Statuses

| Status | Arabic | Description | Next Steps |
|--------|--------|-------------|------------|
| Pending | قيد الانتظار | Awaiting confirmation | Verify availability |
| Confirmed | مؤكد | Order accepted | Begin processing |
| Processing | قيد المعالجة | Being prepared | Pick and pack |
| Shipped | تم الشحن | In transit | Track delivery |
| Delivered | تم التسليم | Customer received | Close order |
| Cancelled | ملغي | Order cancelled | Restore inventory |

#### Access Route
Navigate to: **Sales → Orders** (الطلبات)

---

## Inventory Management

### Multi-Warehouse System

**Purpose:** Track stock across multiple physical locations

#### Warehouse Setup

1. **Create Warehouses**
   - Warehouse name (English & Arabic)
   - Unique warehouse code
   - Location details (address, city, country)
   - Assign warehouse manager
   - Contact information (phone, email)
   - Set default warehouse

2. **Access Route**
   Navigate to: **Inventory → Warehouses** (المستودعات)

---

### Item Management

**Purpose:** Maintain master data for all inventory items

#### Item Configuration

**Identification:**
- Item Name (English & Arabic)
- Item Code (unique per company)
- SKU (Stock Keeping Unit)
- Barcode (for scanning)

**Classification:**
- Category (hierarchical)
- Item Type: Product, Service, Component

**Pricing:**
- Cost Price (what you pay)
- Unit Price (what you charge)
- Unit of Measure (Unit, Box, Kg, etc.)

**Stock Control:**
- Minimum Stock Level - Alert threshold
- Maximum Stock Level - Overstock threshold
- Reorder Point - When to order more
- Reorder Quantity - How much to order
- Track inventory? (Yes/No)

#### Access Route
Navigate to: **Inventory → Items** (الأصناف)

---

### Stock Levels & Tracking

**Purpose:** Real-time visibility of stock quantities per warehouse

#### Stock Quantities

For each item in each warehouse:

```
Quantity on Hand = Physical stock in warehouse
Quantity Reserved = Allocated to orders
Quantity Available = On Hand - Reserved
```

**Example:**
- On Hand: 100 units
- Reserved: 25 units (for pending orders)
- Available: 75 units (can be sold/used)

#### Last Movement Tracking
- **Last Counted At** - Physical stock take date
- **Last Movement At** - Most recent in/out transaction

#### Access Route
Navigate to: **Inventory → Stock Levels** (مستويات المخزون)

---

### Stock Movements (Audit Trail)

**Purpose:** Complete history of all stock changes

#### Movement Types

| Type | Arabic | Description | Stock Impact |
|------|--------|-------------|--------------|
| PURCHASE | شراء | Received from vendor | Increase |
| SALE | بيع | Sold to customer | Decrease |
| ADJUSTMENT | تسوية | Manual correction | Increase/Decrease |
| TRANSFER_IN | تحويل وارد | From another warehouse | Increase |
| TRANSFER_OUT | تحويل صادر | To another warehouse | Decrease |
| RETURN | إرجاع | Customer return | Increase |

#### Movement Details
- **Movement Date** - When it occurred
- **Quantity** - How many units
- **Unit Cost** - Cost per unit
- **Total Cost** - Quantity × Unit Cost
- **Reference** - Link to invoice, PO, or sales order
- **Notes** - Additional context

#### Automated Recording
- Purchase orders create PURCHASE movements
- Sales orders create SALE movements
- Inventory adjustments create ADJUSTMENT movements
- Inter-warehouse transfers create TRANSFER_OUT and TRANSFER_IN pairs

#### Access Route
Navigate to: **Inventory → Movements** (الحركات)

---

### Stock Takes (Physical Counts)

**Purpose:** Verify actual stock matches system records

#### Stock Take Process

1. **Create Stock Take**
   - Select warehouse
   - Assign stock take number
   - Set stock take date
   - Status: DRAFT

2. **Count Items**
   - For each item, record:
     - System Quantity (from database)
     - Counted Quantity (actual count)
     - Variance (Counted - System)
     - Variance Value (Variance × Cost Price)

3. **Review & Approve**
   - Review variances
   - Investigate discrepancies
   - Approve stock take
   - System creates ADJUSTMENT movements for variances

#### Stock Take Statuses
- **DRAFT** - Being prepared
- **IN_PROGRESS** - Counting underway
- **COMPLETED** - Approved and finalized
- **CANCELLED** - Abandoned

#### Access Route
Navigate to: **Inventory → Stock Takes** (الجرد)

---

### Item Categories

**Purpose:** Organize items hierarchically for better management

#### Category Features
- Parent-child relationships (nested categories)
- Bilingual names (English & Arabic)
- Descriptions for each category

**Example Hierarchy:**
```
Vehicles
├── Cars
│   ├── Sedans
│   └── SUVs
├── Trucks
└── Motorcycles

Parts
├── Engine Parts
├── Electrical
└── Body Parts
```

#### Access Route
Navigate to: **Inventory → Categories** (الفئات)

---

## Integration Workflows

### Workflow 1: Sales Order → Inventory Fulfillment

**Complete end-to-end order processing**

```
Step 1: Create Sales Order
↓
Step 2: System Checks Inventory Availability
  - Query inventory_stock_levels for each item
  - Check quantity_available ≥ ordered quantity
↓
Step 3: Reserve Stock (Order Confirmed)
  - Increase quantity_reserved
  - quantity_available auto-decreases (computed column)
↓
Step 4: Ship Order
  - Create SALE movement
  - Decrease quantity_on_hand
  - Decrease quantity_reserved
  - quantity_available updates automatically
↓
Step 5: Order Status → Shipped
```

**UI Flow:**
1. Sales rep creates order in **Sales → Orders**
2. System shows stock availability warnings if insufficient
3. On confirmation, stock is reserved automatically
4. Warehouse ships order and marks as "Shipped"
5. Inventory automatically reduces
6. Customer receives goods, order marked "Delivered"

---

### Workflow 2: Low Stock → Purchase Order

**Automated reorder process**

```
Step 1: Stock Level Drops Below Reorder Point
↓
Step 2: System Generates Low Stock Alert
  - Appears in inventory_stock_alerts view
  - Shows shortage quantity
  - Suggests reorder quantity
↓
Step 3: User Creates Purchase Order
  - Navigate to Purchasing → Purchase Orders
  - Click "Create PO from Low Stock Alert"
  - System pre-fills:
    * Item details
    * Suggested quantity (from reorder_quantity)
    * Preferred vendor (if configured)
↓
Step 4: Submit PO to Vendor
  - PO status: Draft → Sent → Approved
↓
Step 5: Receive Goods
  - Record receipt in system
  - Create PURCHASE movement
  - quantity_on_hand increases automatically
↓
Step 6: Stock Level Restored
  - Alert cleared
  - Stock available for sale
```

**UI Flow:**
1. View **Inventory → Stock Alerts** (تنبيهات المخزون)
2. Click alert row to see item details
3. Click "Create Purchase Order" button
4. PO form opens with pre-filled data
5. Adjust quantity if needed
6. Submit to vendor
7. When goods arrive, mark PO as "Received"
8. Stock levels update automatically

---

### Workflow 3: Inter-Warehouse Transfer

**Move stock between locations**

```
Step 1: Create Transfer Request
  - Select from_warehouse
  - Select to_warehouse
  - Select item and quantity
↓
Step 2: System Validates
  - Check quantity_available in from_warehouse ≥ transfer quantity
↓
Step 3: Record Transfer
  - Create TRANSFER_OUT movement in source warehouse
  - Automatically creates TRANSFER_IN movement in destination warehouse
  - Both movements linked by reference_id
↓
Step 4: Stock Levels Update
  - Source warehouse: quantity_on_hand decreases
  - Destination warehouse: quantity_on_hand increases
  - Both updates happen atomically (trigger ensures consistency)
```

**UI Flow:**
1. Navigate to **Inventory → Transfers** (التحويلات)
2. Click "New Transfer"
3. Select source and destination warehouses
4. Add items with quantities
5. Click "Execute Transfer"
6. System validates and creates movements
7. Both warehouses' stock levels update instantly

---

## Analytics & Reporting

### Inventory Valuation Report

**Purpose:** Calculate total inventory value by warehouse and category

**Access:** Call `calculate_inventory_valuation()` function

**Parameters:**
- `company_id` (required)
- `warehouse_id` (optional - filter to specific warehouse)
- `category_id` (optional - filter to specific category)

**Returns:**

| Column | Description |
|--------|-------------|
| warehouse_name | Warehouse name |
| category_name | Item category |
| total_items | Count of distinct items |
| total_quantity | Sum of quantities on hand |
| total_cost_value | Quantity × Cost Price |
| total_selling_value | Quantity × Unit Price |
| potential_profit | Selling Value - Cost Value |

**Use Cases:**
- Monthly financial reporting
- Insurance valuation
- Identify high-value stock
- Category profitability analysis

---

### Inventory Aging Analysis

**Purpose:** Identify slow-moving and obsolete inventory

**Access:** Query `inventory_aging_analysis` view

**Aging Categories:**

| Category | Arabic | Days Since Last Movement |
|----------|--------|--------------------------|
| Active | نشط | < 30 days |
| Slow-moving | بطيء الحركة | 30-90 days |
| Stagnant | راكد | 90-180 days |
| Very Stagnant | راكد جداً | > 180 days |
| No Movement | لا توجد حركة | Never moved |

**Columns:**
- item_name, item_code, SKU
- warehouse_name, category_name
- quantity_on_hand
- days_since_last_movement
- aging_category
- tied_up_value (quantity × cost price)

**Use Cases:**
- Identify items to discount or liquidate
- Free up warehouse space
- Reduce capital tied up in inventory
- Prevent obsolescence

**Action Items:**
- Very Stagnant (>180 days): Consider liquidation
- Stagnant (>90 days): Run promotions
- Slow-moving (>30 days): Monitor closely

---

### Inventory Turnover Analysis

**Purpose:** Measure how fast inventory moves

**Access:** Query `inventory_turnover_analysis` view

**Analysis Period:** Last 90 days

**Turnover Ratio Formula:**
```
Turnover Ratio = (Sales Quantity / Average Inventory) × (90 / Days Active)
```

**Turnover Categories:**

| Category | Arabic | Criteria |
|----------|--------|----------|
| Fast-moving | سريع الحركة | Sales > 3× current stock |
| Medium-moving | متوسط الحركة | Sales > current stock |
| Slow-moving | بطيء الحركة | Sales < current stock |
| No movement | لا توجد حركة | No sales |

**Columns:**
- item_name, warehouse_name, category_name
- current_stock, quantity_available
- movements_last_90_days
- sales_quantity_last_90_days
- purchase_quantity_last_90_days
- turnover_ratio
- turnover_category
- first_movement_date, last_movement_date

**Use Cases:**
- Optimize stock levels
- Identify best sellers
- Adjust reorder quantities
- Improve cash flow

**Optimal Turnover:**
- Fast-moving: Ensure adequate stock to avoid stockouts
- Slow-moving: Reduce order quantities

---

### Stock Level Alerts

**Purpose:** Proactive stock management warnings

**Access:** Query `inventory_stock_alerts` view

**Alert Types (Priority Order):**

| Priority | Alert Type | Arabic | Trigger Condition |
|----------|------------|--------|-------------------|
| 1 | Out of Stock | نفذ المخزون | quantity_available = 0 |
| 2 | Below Minimum | أقل من الحد الأدنى | available < min_stock_level |
| 3 | Reorder Point | نقطة إعادة الطلب | available ≤ reorder_point |
| 4 | Overstock | تخزين زائد | on_hand > max_stock_level |

**Columns:**
- item_name, warehouse_name, category_name
- quantity_on_hand, quantity_reserved, quantity_available
- min_stock_level, max_stock_level, reorder_point
- alert_type, alert_priority
- shortage_quantity
- suggested_order_quantity
- last_movement_at

**Automated Actions:**
- Priority 1 & 2: Generate purchase order recommendations
- Priority 3: Notify purchasing team
- Priority 4: Notify warehouse manager (potential waste)

**UI Display:**
Navigate to **Inventory → Stock Alerts** (تنبيهات المخزون)
- Sorted by priority (most urgent first)
- Color-coded by severity
- Click alert to create PO directly

---

### Sales Pipeline Metrics

**Purpose:** Real-time sales performance dashboard

**Access:** Query `sales_pipeline_metrics` view

**Metrics by Stage:**

| Metric | Description |
|--------|-------------|
| lead_count | Opportunities in "Lead" stage |
| qualified_count | Opportunities in "Qualified" stage |
| proposal_count | Opportunities in "Proposal" stage |
| negotiation_count | Opportunities in "Negotiation" stage |
| won_count | Closed-won deals |
| lost_count | Closed-lost deals |
| lead_value | Total estimated value in Lead stage |
| qualified_value | Total estimated value in Qualified stage |
| ... | Values for all stages |
| avg_opportunity_value | Average deal size |
| total_pipeline_value | Sum of all open opportunities |

**Use Cases:**
- Sales forecasting
- Team performance monitoring
- Pipeline health checks
- Revenue predictions

**UI Display:**
Navigate to **Sales → Dashboard** (لوحة المبيعات)
- Visual pipeline funnel
- Stage-by-stage conversion rates
- Weighted forecast (value × probability)

---

## Security & Access Control

### Row-Level Security (RLS)

**Implementation:** All 15 tables have RLS enabled

**Policy Pattern:**
```sql
-- Users can only access data from their company
CREATE POLICY "company_isolation"
ON table_name FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM user_profiles
    WHERE user_id = auth.uid()
  )
);
```

**Applies To:**
- Sales: leads, opportunities, quotes, orders
- Inventory: categories, warehouses, items, stock levels, movements, stock takes

**Benefits:**
- Multi-tenant data isolation
- No data leakage between companies
- Enforced at database level (cannot bypass)

---

### User Permissions

**Role-Based Access (Future Enhancement):**

**Sales Module:**
- Sales Rep: Create/edit leads, opportunities, quotes
- Sales Manager: View all reps' data, approve quotes
- Admin: Full access

**Inventory Module:**
- Warehouse Staff: Record movements, conduct stock takes
- Inventory Manager: Adjust stock, approve stock takes
- Purchasing: Create purchase orders, receive goods
- Admin: Full access

**Note:** Current implementation uses company-level isolation. Role-based permissions can be added via additional RLS policies.

---

## Best Practices

### Sales Pipeline Management

**1. Consistent Stage Definitions**
- Define clear criteria for each stage
- Train sales team on when to advance opportunities
- Review pipeline regularly for accuracy

**2. Probability Guidelines**
- Lead: 10-20%
- Qualified: 25-40%
- Proposal: 50-60%
- Negotiation: 70-90%
- Won: 100%
- Lost: 0%

**3. Regular Pipeline Reviews**
- Weekly: Sales rep reviews own pipeline
- Monthly: Sales manager reviews team pipeline
- Quarterly: Forecast vs. actual analysis

**4. Quote Follow-up**
- Set reminders for quote expiration
- Follow up before expiration date
- Update status promptly (accepted/rejected)

---

### Inventory Management

**1. Set Optimal Stock Levels**

**Minimum Stock Level:**
```
Min = (Average Daily Sales × Lead Time) + Safety Stock
```
**Example:**
- Average Daily Sales: 5 units
- Vendor Lead Time: 7 days
- Safety Stock: 10 units (2 days)
- Min Stock Level = (5 × 7) + 10 = 45 units

**Reorder Point:**
```
Reorder Point = Average Daily Sales × (Lead Time + Safety Period)
```
**Example:**
- Reorder Point = 5 × (7 + 2) = 45 units

**Reorder Quantity:**
- Economic Order Quantity (EOQ) for cost optimization
- Or: 2× minimum stock level for simplicity

**2. Regular Stock Takes**
- Monthly: High-value items
- Quarterly: Medium-value items
- Annually: Low-value items
- Investigate variances > 5%

**3. ABC Analysis**

Categorize inventory by value:
- **A Items** (70% of value, 20% of items): Tight control, weekly review
- **B Items** (20% of value, 30% of items): Moderate control, monthly review
- **C Items** (10% of value, 50% of items): Loose control, quarterly review

**4. FIFO/FEFO Management**
- First In, First Out (FIFO) for non-perishables
- First Expired, First Out (FEFO) for perishables
- Tag stock with receipt dates

**5. Prevent Stockouts**
- Monitor stock alerts daily
- Maintain safety stock for critical items
- Diversify suppliers for key items
- Track supplier lead times

**6. Reduce Excess Stock**
- Review aging reports monthly
- Discount slow-moving items
- Consider returns to vendors (if possible)
- Donate obsolete inventory

---

### Integration Best Practices

**1. Sales → Inventory Flow**
- Always check stock availability before confirming orders
- Reserve stock immediately on order confirmation
- Update order status when stock is shipped
- Handle backorders systematically

**2. Inventory → Purchasing Flow**
- Act on low stock alerts promptly
- Consolidate purchase orders to reduce freight costs
- Track vendor performance (on-time delivery, quality)
- Maintain preferred vendor lists

**3. Data Quality**
- Use consistent naming conventions
- Keep item codes and SKUs unique
- Update cost prices regularly
- Archive inactive items (don't delete)

---

## Troubleshooting

### Common Issues

**Issue: Stock level doesn't update after movement**
- **Cause:** Trigger may not have fired
- **Solution:** Check inventory_movements table for the movement record. If exists, manually run:
  ```sql
  UPDATE inventory_stock_levels
  SET quantity_on_hand = (
    SELECT SUM(CASE WHEN movement_type IN ('PURCHASE', 'TRANSFER_IN')
                    THEN quantity
                    ELSE -quantity END)
    FROM inventory_movements
    WHERE item_id = [item_id] AND warehouse_id = [warehouse_id]
  )
  WHERE item_id = [item_id] AND warehouse_id = [warehouse_id];
  ```

**Issue: Negative stock error**
- **Cause:** Trying to sell/transfer more than available
- **Solution:** Check quantity_available before creating SALE or TRANSFER_OUT movement

**Issue: Quote not converting to order**
- **Cause:** Quote status must be "accepted"
- **Solution:** Update quote status to "accepted" before generating order

**Issue: Stock alert not appearing**
- **Cause:** Item may not have min_stock_level set
- **Solution:** Edit item and set min_stock_level, reorder_point, reorder_quantity

---

## Support & Documentation

**Additional Resources:**
- [API Reference](API_REFERENCE_PHASE_7B.md) - Hook documentation
- [Integration Guide](MODULE_INTEGRATIONS.md) - Workflow diagrams
- [User Guide](USER_GUIDE_PHASE_7B.md) - Step-by-step tutorials
- [Migration Guide](../supabase/migrations/README_PHASE_7B.md) - Database setup

**Need Help?**
- Check [CHANGELOG_FLEETIFY_REVIEW.md](../CHANGELOG_FLEETIFY_REVIEW.md) for latest updates
- Review database schema in migration files
- Consult hook source code for implementation details

---

**Document Version:** 1.0
**Last Updated:** 2025-10-19
**Maintained By:** Fleetify Development Team
