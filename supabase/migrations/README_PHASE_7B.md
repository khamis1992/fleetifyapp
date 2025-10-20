# Phase 7B Database Migrations Guide

**Version:** 1.0
**Date:** 2025-10-19
**Phase:** 7B - Module Expansion

## Table of Contents

1. [Overview](#overview)
2. [Migration Files](#migration-files)
3. [Migration Order](#migration-order)
4. [Schema Overview](#schema-overview)
5. [Running Migrations](#running-migrations)
6. [Rollback Procedures](#rollback-procedures)
7. [Testing Migrations](#testing-migrations)

---

## Overview

Phase 7B introduces 3 major migration files that create the Sales/CRM and Inventory management modules. These migrations add 15 new tables, 45+ indexes, 35+ RLS policies, and 6 analytical views/functions to the Fleetify database.

### Migration Statistics

| Metric | Count |
|--------|-------|
| Migration Files | 3 |
| Tables Created | 15 |
| Indexes Created | 45+ |
| RLS Policies | 35+ |
| Views | 5 |
| Functions | 2 |
| Triggers | 6 |
| Total Lines | ~1,035 |

---

## Migration Files

### 1. Sales System Migration

**File:** `20251019000000_create_sales_system.sql`
**Size:** 294 lines
**Created:** 2025-10-19 00:00:00

**Creates:**
- 4 tables: `sales_leads`, `sales_opportunities`, `sales_quotes`, `sales_orders`
- 24 performance indexes
- 16 RLS policies
- 4 timestamp triggers
- 1 analytical view: `sales_pipeline_metrics`

**Purpose:** Complete Sales/CRM module for lead tracking, opportunity management, quote generation, and order fulfillment.

---

### 2. Inventory System Migration

**File:** `20251019200000_create_inventory_system.sql`
**Size:** 468 lines
**Created:** 2025-10-19 20:00:00

**Creates:**
- 7 tables:
  - `inventory_categories`
  - `inventory_warehouses`
  - `inventory_items`
  - `inventory_stock_levels`
  - `inventory_movements`
  - `inventory_stock_takes`
  - `inventory_stock_take_lines`
- 20+ performance indexes
- 20+ RLS policies
- 2 base views: `inventory_low_stock_items`, `inventory_valuation`
- 2 triggers:
  - `update_inventory_timestamp` - Auto-update timestamps
  - `update_stock_level_on_movement` - Auto-adjust stock levels

**Purpose:** Multi-warehouse inventory management with real-time tracking and audit trail.

---

### 3. Inventory Features Enhancement

**File:** `20251019210015_enhance_inventory_features.sql`
**Size:** 273 lines
**Created:** 2025-10-19 21:00:15

**Creates:**
- 5 additional performance indexes
- 1 stored function: `calculate_inventory_valuation()`
- 3 analytical views:
  - `inventory_aging_analysis`
  - `inventory_turnover_analysis`
  - `inventory_stock_alerts`
- 1 helper function: `get_item_movement_summary()`

**Purpose:** Advanced analytics and reporting capabilities for inventory management.

---

## Migration Order

**IMPORTANT:** Migrations must be applied in this exact order:

```
1. 20251019000000_create_sales_system.sql
   ↓
2. 20251019200000_create_inventory_system.sql
   ↓
3. 20251019210015_enhance_inventory_features.sql
```

**Reason:** Migration #3 depends on tables created in Migration #2. Running out of order will cause foreign key errors.

---

## Schema Overview

### Entity Relationship Diagram (Text Format)

```
companies
    ↓
    ├─── sales_leads
    │       ↓
    │    sales_opportunities
    │           ↓
    │       sales_quotes
    │           ↓
    │       sales_orders
    │
    └─── inventory_categories (self-referencing for hierarchy)
            ↓
         inventory_items
            ↓
         inventory_stock_levels ←──┐
            ↓                       │
         inventory_movements ───────┘
            ↓
         inventory_warehouses
```

### Foreign Key Relationships

**Sales Module:**
```sql
sales_opportunities.lead_id → sales_leads.id
sales_quotes.opportunity_id → sales_opportunities.id
sales_quotes.customer_id → customers.id
sales_orders.quote_id → sales_quotes.id
sales_orders.customer_id → customers.id
```

**Inventory Module:**
```sql
inventory_categories.parent_category_id → inventory_categories.id (self-ref)
inventory_items.category_id → inventory_categories.id
inventory_stock_levels.item_id → inventory_items.id
inventory_stock_levels.warehouse_id → inventory_warehouses.id
inventory_movements.item_id → inventory_items.id
inventory_movements.warehouse_id → inventory_warehouses.id
inventory_stock_takes.warehouse_id → inventory_warehouses.id
inventory_stock_take_lines.stock_take_id → inventory_stock_takes.id
inventory_stock_take_lines.item_id → inventory_items.id
```

**All Tables:**
```sql
*.company_id → companies.id
*.created_by → auth.users.id
*.assigned_to → auth.users.id (sales module)
```

---

### Index Strategy

#### Composite Indexes

Used for queries that filter on multiple columns:

```sql
-- Example: Find movements for a specific item in a warehouse
CREATE INDEX idx_inventory_movements_item_warehouse
ON inventory_movements(item_id, warehouse_id, movement_date DESC);

-- Enables fast queries like:
SELECT * FROM inventory_movements
WHERE item_id = 'xyz' AND warehouse_id = 'abc'
ORDER BY movement_date DESC;
```

#### Partial Indexes

Used for specific subsets of data:

```sql
-- Example: Only index active items with barcodes
CREATE INDEX idx_inventory_items_barcode
ON inventory_items(barcode)
WHERE barcode IS NOT NULL;
```

#### Foreign Key Indexes

All foreign keys have indexes for join performance:

```sql
CREATE INDEX idx_sales_leads_company_id ON sales_leads(company_id);
CREATE INDEX idx_sales_opportunities_lead_id ON sales_opportunities(lead_id);
```

#### Covering Indexes

Some indexes include additional columns for index-only scans:

```sql
CREATE INDEX idx_inventory_stock_levels_item_warehouse
ON inventory_stock_levels(item_id, warehouse_id)
INCLUDE (quantity_on_hand, quantity_reserved, quantity_available);
```

---

### RLS Policy Explanations

All tables use Row-Level Security to enforce multi-tenant data isolation.

**Standard Policy Pattern:**
```sql
-- SELECT: Users can view their company's data
CREATE POLICY "company_isolation_select"
ON table_name FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can insert into their company
CREATE POLICY "company_isolation_insert"
ON table_name FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update their company's data
CREATE POLICY "company_isolation_update"
ON table_name FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete their company's data
CREATE POLICY "company_isolation_delete"
ON table_name FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
  )
);
```

**Benefits:**
- Enforced at database level (cannot bypass)
- Automatic filtering in all queries
- No data leakage between companies
- Works with Supabase authentication

**Testing RLS:**
```sql
-- Switch to specific user context
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'user-uuid-here';

-- Query should only return data for that user's company
SELECT * FROM sales_leads;
```

---

## Running Migrations

### Method 1: Supabase CLI (Recommended)

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Pull latest migrations
supabase db pull

# Apply migrations
supabase db push

# Verify migrations
supabase db diff
```

### Method 2: SQL Editor (Manual)

1. Log into Supabase Dashboard
2. Navigate to SQL Editor
3. Open each migration file in order
4. Execute SQL
5. Verify no errors in output

### Method 3: Supabase API

```bash
curl -X POST https://your-project.supabase.co/rest/v1/migrations \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: text/plain" \
  --data-binary @supabase/migrations/20251019000000_create_sales_system.sql
```

---

## Rollback Procedures

### Complete Rollback (All Phase 7B Changes)

**WARNING:** This will delete all Sales and Inventory data. Backup first!

```sql
-- Step 3: Drop enhancement features
DROP FUNCTION IF EXISTS get_item_movement_summary CASCADE;
DROP VIEW IF EXISTS inventory_stock_alerts CASCADE;
DROP VIEW IF EXISTS inventory_turnover_analysis CASCADE;
DROP VIEW IF EXISTS inventory_aging_analysis CASCADE;
DROP FUNCTION IF EXISTS calculate_inventory_valuation CASCADE;

-- Step 2: Drop inventory system
DROP TABLE IF EXISTS inventory_stock_take_lines CASCADE;
DROP TABLE IF EXISTS inventory_stock_takes CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory_stock_levels CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_warehouses CASCADE;
DROP TABLE IF EXISTS inventory_categories CASCADE;
DROP FUNCTION IF EXISTS update_stock_level_on_movement CASCADE;
DROP FUNCTION IF EXISTS update_inventory_timestamp CASCADE;

-- Step 1: Drop sales system
DROP VIEW IF EXISTS sales_pipeline_metrics CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS sales_quotes CASCADE;
DROP TABLE IF EXISTS sales_opportunities CASCADE;
DROP TABLE IF EXISTS sales_leads CASCADE;
```

### Partial Rollback (Analytics Only)

Keep base tables but remove analytics:

```sql
DROP FUNCTION IF EXISTS get_item_movement_summary CASCADE;
DROP VIEW IF EXISTS inventory_stock_alerts CASCADE;
DROP VIEW IF EXISTS inventory_turnover_analysis CASCADE;
DROP VIEW IF EXISTS inventory_aging_analysis CASCADE;
DROP FUNCTION IF EXISTS calculate_inventory_valuation CASCADE;
DROP VIEW IF EXISTS sales_pipeline_metrics CASCADE;
```

### Rollback Single Table

```sql
-- Example: Remove sales_orders table only
DROP TABLE IF EXISTS sales_orders CASCADE;

-- Note: This will also drop foreign keys referencing this table
```

---

## Testing Migrations

### Pre-Migration Checks

```sql
-- 1. Verify companies table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'companies'
);

-- 2. Verify user_profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'user_profiles'
);

-- 3. Verify customers table exists (for sales foreign keys)
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'customers'
);

-- 4. Check current table count
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';
```

### Post-Migration Verification

```sql
-- 1. Verify all tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'sales_%'
  OR table_name LIKE 'inventory_%'
ORDER BY table_name;

-- Expected: 15 tables

-- 2. Verify indexes created
SELECT indexname
FROM pg_indexes
WHERE tablename LIKE 'sales_%'
  OR tablename LIKE 'inventory_%'
ORDER BY indexname;

-- Expected: 45+ indexes

-- 3. Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'sales_%' OR tablename LIKE 'inventory_%');

-- Expected: All should have rowsecurity = true

-- 4. Verify policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'sales_%'
  OR tablename LIKE 'inventory_%'
ORDER BY tablename, policyname;

-- Expected: 35+ policies

-- 5. Verify triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table LIKE 'sales_%'
  OR event_object_table LIKE 'inventory_%'
ORDER BY event_object_table;

-- Expected: 6 triggers

-- 6. Verify views
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND (table_name LIKE 'sales_%' OR table_name LIKE 'inventory_%');

-- Expected: 5 views

-- 7. Verify functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%inventory%' OR routine_name LIKE '%sales%');

-- Expected: 2+ functions
```

### Functional Testing

```sql
-- Test 1: Insert a sales lead
INSERT INTO sales_leads (
  company_id,
  lead_name,
  email,
  status
) VALUES (
  'your-company-uuid',
  'Test Lead',
  'test@example.com',
  'new'
);

-- Test 2: Insert inventory category
INSERT INTO inventory_categories (
  company_id,
  category_name
) VALUES (
  'your-company-uuid',
  'Test Category'
);

-- Test 3: Insert inventory item
INSERT INTO inventory_items (
  company_id,
  item_name,
  item_code,
  unit_price,
  cost_price
) VALUES (
  'your-company-uuid',
  'Test Item',
  'TEST-001',
  100.00,
  75.00
);

-- Test 4: Insert inventory warehouse
INSERT INTO inventory_warehouses (
  company_id,
  warehouse_name,
  is_default
) VALUES (
  'your-company-uuid',
  'Test Warehouse',
  true
);

-- Test 5: Create inventory movement (should auto-update stock level)
INSERT INTO inventory_movements (
  company_id,
  item_id,
  warehouse_id,
  movement_type,
  quantity,
  unit_cost,
  total_cost
) VALUES (
  'your-company-uuid',
  (SELECT id FROM inventory_items WHERE item_code = 'TEST-001'),
  (SELECT id FROM inventory_warehouses WHERE warehouse_name = 'Test Warehouse'),
  'PURCHASE',
  50,
  75.00,
  3750.00
);

-- Verify stock level was auto-created
SELECT * FROM inventory_stock_levels
WHERE item_id = (SELECT id FROM inventory_items WHERE item_code = 'TEST-001');

-- Expected: quantity_on_hand = 50, quantity_available = 50

-- Test 6: Query analytical views
SELECT * FROM sales_pipeline_metrics;
SELECT * FROM inventory_stock_alerts;
SELECT * FROM inventory_aging_analysis;
SELECT * FROM inventory_turnover_analysis;

-- Test 7: Call analytical functions
SELECT * FROM calculate_inventory_valuation('your-company-uuid');
SELECT * FROM get_item_movement_summary(
  (SELECT id FROM inventory_items WHERE item_code = 'TEST-001')
);

-- Cleanup test data
DELETE FROM inventory_movements WHERE company_id = 'your-company-uuid';
DELETE FROM inventory_stock_levels WHERE company_id = 'your-company-uuid';
DELETE FROM inventory_items WHERE company_id = 'your-company-uuid';
DELETE FROM inventory_warehouses WHERE company_id = 'your-company-uuid';
DELETE FROM inventory_categories WHERE company_id = 'your-company-uuid';
DELETE FROM sales_leads WHERE company_id = 'your-company-uuid';
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Foreign Key Violation

**Error:**
```
ERROR: insert or update on table "sales_opportunities" violates foreign key constraint
DETAIL: Key (lead_id)=(xyz) is not present in table "sales_leads".
```

**Solution:**
- Ensure lead exists before creating opportunity
- Or set `lead_id = NULL` if not converting from lead

#### Issue 2: RLS Policy Blocking Access

**Error:**
```
ERROR: new row violates row-level security policy for table "sales_leads"
```

**Solution:**
```sql
-- Check if user has company_id in user_profiles
SELECT * FROM user_profiles WHERE user_id = auth.uid();

-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE sales_leads DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
```

#### Issue 3: Trigger Not Firing

**Error:** Stock level not updating after movement

**Solution:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_stock_on_movement';

-- Manually trigger update
SELECT update_stock_level_on_movement();

-- Or re-create trigger:
DROP TRIGGER IF EXISTS trigger_update_stock_on_movement ON inventory_movements;
CREATE TRIGGER trigger_update_stock_on_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_level_on_movement();
```

#### Issue 4: Negative Stock Error

**Error:**
```
ERROR: Insufficient stock for item abc in warehouse xyz
```

**Solution:**
- This is by design to prevent negative stock
- Check current stock level before creating SALE movement
- Or create ADJUSTMENT movement to correct stock levels

---

## Performance Considerations

### Index Maintenance

```sql
-- Analyze tables for query planner
ANALYZE sales_leads;
ANALYZE sales_opportunities;
ANALYZE inventory_items;
ANALYZE inventory_stock_levels;
ANALYZE inventory_movements;

-- Reindex if performance degrades
REINDEX TABLE inventory_movements;

-- Vacuum to reclaim space
VACUUM FULL inventory_movements;
```

### View Materialization (Future Enhancement)

For large datasets, consider materializing views:

```sql
CREATE MATERIALIZED VIEW inventory_stock_alerts_mat AS
SELECT * FROM inventory_stock_alerts;

-- Create index on materialized view
CREATE INDEX idx_stock_alerts_mat_priority
ON inventory_stock_alerts_mat(alert_priority);

-- Refresh periodically
REFRESH MATERIALIZED VIEW inventory_stock_alerts_mat;
```

---

## Backup Recommendations

### Before Migration

```bash
# Full database backup
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f backup_before_phase7b.sql

# Or use Supabase dashboard: Database → Backups
```

### After Migration

```bash
# Backup just Phase 7B tables
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -t 'sales_*' \
  -t 'inventory_*' \
  -f backup_phase7b_tables.sql
```

---

## Additional Resources

- [Supabase Migration Documentation](https://supabase.com/docs/guides/cli/managing-migrations)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [PHASE_7B_FEATURES.md](../docs/PHASE_7B_FEATURES.md) - Feature documentation
- [API_REFERENCE_PHASE_7B.md](../docs/API_REFERENCE_PHASE_7B.md) - Hook documentation
- [MODULE_INTEGRATIONS.md](../docs/MODULE_INTEGRATIONS.md) - Integration workflows

---

## Support

**Questions or Issues?**
- Review migration SQL files for detailed comments
- Check [CHANGELOG_FLEETIFY_REVIEW.md](../CHANGELOG_FLEETIFY_REVIEW.md) for known issues
- Consult Supabase logs: Dashboard → Logs → Database

---

**Document Version:** 1.0
**Last Updated:** 2025-10-19
**Maintained By:** Fleetify Development Team
