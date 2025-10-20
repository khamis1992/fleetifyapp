# API Reference - Phase 7B

**Version:** 1.0
**Date:** 2025-10-19
**Phase:** 7B - Module Expansion

## Table of Contents

1. [Overview](#overview)
2. [Sales/CRM Hooks](#salescrm-hooks)
3. [Inventory Hooks](#inventory-hooks)
4. [Common Patterns](#common-patterns)
5. [Type Definitions](#type-definitions)
6. [Error Handling](#error-handling)

---

## Overview

Phase 7B introduces 10 new React Query hooks for managing Sales and Inventory data. All hooks follow consistent patterns:

- **Authentication:** Automatically filtered by company_id from authenticated user
- **Caching:** React Query handles caching and invalidation
- **Optimistic Updates:** Immediate UI feedback before server confirmation
- **Error Handling:** Integrated with toast notifications
- **TypeScript:** Fully typed for IDE autocomplete and type safety

### Hook Naming Convention

- `use[Entity]` - Fetch multiple records (e.g., `useSalesLeads`)
- `use[Entity]` (singular) - Fetch single record by ID (e.g., `useSalesLead`)
- `useCreate[Entity]` - Create new record
- `useUpdate[Entity]` - Update existing record
- `useDelete[Entity]` - Delete record

---

## Sales/CRM Hooks

### useSalesLeads

Fetch and manage sales leads.

**Location:** `src/hooks/useSalesLeads.ts`

#### Query Hook: `useSalesLeads(filters?)`

Fetch all leads for the current company with optional filtering.

**Parameters:**
```typescript
interface SalesLeadFilters {
  status?: string;          // Filter by status (new, contacted, qualified, etc.)
  source?: string;          // Filter by lead source (website, referral, etc.)
  assigned_to?: string;     // Filter by assigned user ID
  is_active?: boolean;      // Filter active/inactive leads
  search?: string;          // Search lead_name, email, phone
}
```

**Returns:**
```typescript
interface SalesLead {
  id: string;
  company_id: string;
  lead_name: string;
  lead_name_ar?: string;
  email?: string;
  phone?: string;
  source?: string;          // website, referral, cold_call, trade_show
  status: string;           // new, contacted, qualified, unqualified, converted, lost
  assigned_to?: string;     // User ID
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
```

**Usage Example:**
```typescript
import { useSalesLeads } from '@/hooks/useSalesLeads';

function LeadsPage() {
  // Fetch all active leads
  const { data: leads, isLoading } = useSalesLeads({
    is_active: true
  });

  // Fetch leads by status
  const { data: newLeads } = useSalesLeads({
    status: 'new',
    is_active: true
  });

  // Search leads
  const { data: searchResults } = useSalesLeads({
    search: 'john'  // Searches name, email, phone
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {leads?.map(lead => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
```

#### Query Hook: `useSalesLead(leadId)`

Fetch a single lead by ID.

**Parameters:**
- `leadId: string` - The lead's UUID

**Returns:**
- `SalesLead | null`

**Usage Example:**
```typescript
const { data: lead, isLoading } = useSalesLead('lead-uuid-123');

if (!lead) return <div>Lead not found</div>;

return <LeadDetails lead={lead} />;
```

#### Mutation Hook: `useCreateSalesLead()`

Create a new sales lead.

**Parameters:**
```typescript
interface CreateSalesLeadParams {
  lead_name: string;
  lead_name_ar?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;          // Defaults to 'new'
  assigned_to?: string;
  notes?: string;
}
```

**Usage Example:**
```typescript
import { useCreateSalesLead } from '@/hooks/useSalesLeads';

function CreateLeadForm() {
  const createLead = useCreateSalesLead();

  const handleSubmit = async (formData: CreateSalesLeadParams) => {
    try {
      await createLead.mutateAsync(formData);
      toast.success('Lead created successfully');
    } catch (error) {
      toast.error('Failed to create lead');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

#### Mutation Hook: `useUpdateSalesLead()`

Update an existing lead.

**Parameters:**
```typescript
interface UpdateSalesLeadParams {
  id: string;
  // Any SalesLead fields to update
  status?: string;
  assigned_to?: string;
  notes?: string;
  // ... other fields
}
```

**Usage Example:**
```typescript
const updateLead = useUpdateSalesLead();

// Change lead status
await updateLead.mutateAsync({
  id: 'lead-uuid',
  status: 'qualified'
});

// Assign to sales rep
await updateLead.mutateAsync({
  id: 'lead-uuid',
  assigned_to: 'user-uuid'
});
```

#### Mutation Hook: `useDeleteSalesLead()`

Delete a lead (soft delete by setting is_active = false).

**Parameters:**
- `leadId: string`

**Usage Example:**
```typescript
const deleteLead = useDeleteSalesLead();

await deleteLead.mutateAsync('lead-uuid');
```

---

### useSalesOpportunities

Manage sales pipeline opportunities.

**Location:** `src/hooks/useSalesOpportunities.ts`

#### Query Hook: `useSalesOpportunities(filters?)`

**Parameters:**
```typescript
interface OpportunityFilters {
  stage?: string;           // lead, qualified, proposal, negotiation, won, lost
  assigned_to?: string;
  lead_id?: string;         // Filter by originating lead
  is_active?: boolean;
  search?: string;
}
```

**Returns:**
```typescript
interface SalesOpportunity {
  id: string;
  company_id: string;
  lead_id?: string;
  opportunity_name: string;
  opportunity_name_ar?: string;
  stage: string;            // lead, qualified, proposal, negotiation, won, lost
  estimated_value: number;  // Revenue forecast
  probability: number;      // 0-100
  expected_close_date?: string;
  assigned_to?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
```

**Usage Example:**
```typescript
import { useSalesOpportunities } from '@/hooks/useSalesOpportunities';

function SalesPipeline() {
  // Fetch all opportunities
  const { data: opportunities } = useSalesOpportunities({
    is_active: true
  });

  // Group by stage
  const byStage = opportunities?.reduce((acc, opp) => {
    if (!acc[opp.stage]) acc[opp.stage] = [];
    acc[opp.stage].push(opp);
    return acc;
  }, {});

  return (
    <div className="pipeline">
      {['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map(stage => (
        <PipelineColumn
          key={stage}
          stage={stage}
          opportunities={byStage[stage] || []}
        />
      ))}
    </div>
  );
}
```

#### Mutation Hook: `useCreateSalesOpportunity()`

**Parameters:**
```typescript
interface CreateOpportunityParams {
  opportunity_name: string;
  opportunity_name_ar?: string;
  lead_id?: string;         // Link to originating lead
  stage?: string;           // Defaults to 'lead'
  estimated_value: number;
  probability?: number;     // Defaults to 10
  expected_close_date?: string;
  assigned_to?: string;
  notes?: string;
}
```

**Usage Example:**
```typescript
const createOpp = useCreateSalesOpportunity();

// Convert lead to opportunity
await createOpp.mutateAsync({
  opportunity_name: 'ABC Corp - Fleet Management',
  lead_id: 'lead-uuid',
  estimated_value: 150000,
  probability: 25,
  stage: 'qualified',
  expected_close_date: '2025-12-31',
  assigned_to: salesRepId
});
```

#### Mutation Hook: `useUpdateSalesOpportunity()`

**Usage Example:**
```typescript
const updateOpp = useUpdateSalesOpportunity();

// Move to next stage
await updateOpp.mutateAsync({
  id: 'opp-uuid',
  stage: 'proposal',
  probability: 50
});

// Mark as won
await updateOpp.mutateAsync({
  id: 'opp-uuid',
  stage: 'won',
  probability: 100
});
```

---

### useSalesQuotes

Generate and manage sales quotations.

**Location:** `src/hooks/useSalesQuotes.ts`

#### Query Hook: `useSalesQuotes(filters?)`

**Parameters:**
```typescript
interface QuoteFilters {
  status?: string;          // draft, sent, accepted, rejected, expired
  opportunity_id?: string;
  customer_id?: string;
  is_active?: boolean;
  search?: string;          // Search by quote_number
}
```

**Returns:**
```typescript
interface SalesQuote {
  id: string;
  company_id: string;
  opportunity_id?: string;
  customer_id?: string;
  quote_number: string;     // Unique identifier
  items: QuoteItem[];       // JSONB array
  subtotal: number;
  tax: number;
  total: number;
  valid_until?: string;
  status: string;           // draft, sent, accepted, rejected, expired
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface QuoteItem {
  item_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;            // quantity × unit_price
}
```

**Usage Example:**
```typescript
import { useSalesQuotes } from '@/hooks/useSalesQuotes';

function QuotesPage() {
  // Fetch pending quotes
  const { data: quotes } = useSalesQuotes({
    status: 'sent',
    is_active: true
  });

  // Calculate total pipeline value
  const totalValue = quotes?.reduce((sum, q) => sum + q.total, 0) || 0;

  return (
    <div>
      <h2>Total Pending Quotes: ${totalValue.toLocaleString()}</h2>
      {quotes?.map(quote => (
        <QuoteCard key={quote.id} quote={quote} />
      ))}
    </div>
  );
}
```

#### Mutation Hook: `useCreateSalesQuote()`

**Parameters:**
```typescript
interface CreateQuoteParams {
  quote_number: string;
  opportunity_id?: string;
  customer_id?: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  valid_until?: string;
  status?: string;          // Defaults to 'draft'
  notes?: string;
}
```

**Usage Example:**
```typescript
const createQuote = useCreateSalesQuote();

await createQuote.mutateAsync({
  quote_number: 'Q-2025-001',
  customer_id: 'customer-uuid',
  items: [
    {
      item_name: 'Vehicle Rental - Monthly',
      description: 'Toyota Camry 2024',
      quantity: 12,
      unit_price: 1200,
      total: 14400
    },
    {
      item_name: 'Insurance Coverage',
      quantity: 1,
      unit_price: 500,
      total: 500
    }
  ],
  subtotal: 14900,
  tax: 2235,    // 15% VAT
  total: 17135,
  valid_until: '2025-11-19',
  status: 'draft'
});
```

---

### useSalesOrders

Track orders from quote to delivery.

**Location:** `src/hooks/useSalesOrders.ts`

#### Query Hook: `useSalesOrders(filters?)`

**Parameters:**
```typescript
interface OrderFilters {
  status?: string;          // pending, confirmed, processing, shipped, delivered, cancelled
  quote_id?: string;
  customer_id?: string;
  is_active?: boolean;
  search?: string;          // Search by order_number
}
```

**Returns:**
```typescript
interface SalesOrder {
  id: string;
  company_id: string;
  quote_id?: string;
  customer_id?: string;
  order_number: string;
  order_date: string;
  delivery_date?: string;
  status: string;           // pending, confirmed, processing, shipped, delivered, cancelled
  items: OrderItem[];       // JSONB array
  total: number;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  item_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}
```

**Usage Example:**
```typescript
import { useSalesOrders } from '@/hooks/useSalesOrders';

function OrdersPage() {
  // Fetch orders by status
  const { data: pendingOrders } = useSalesOrders({ status: 'pending' });
  const { data: shippedOrders } = useSalesOrders({ status: 'shipped' });

  return (
    <div>
      <section>
        <h3>Pending Orders ({pendingOrders?.length || 0})</h3>
        {pendingOrders?.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </section>

      <section>
        <h3>Shipped Orders ({shippedOrders?.length || 0})</h3>
        {shippedOrders?.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </section>
    </div>
  );
}
```

#### Mutation Hook: `useCreateSalesOrder()`

**Parameters:**
```typescript
interface CreateOrderParams {
  order_number: string;
  quote_id?: string;
  customer_id?: string;
  order_date: string;
  delivery_date?: string;
  status?: string;          // Defaults to 'pending'
  items: OrderItem[];
  total: number;
  notes?: string;
}
```

**Usage Example:**
```typescript
const createOrder = useCreateSalesOrder();

// Create order from accepted quote
await createOrder.mutateAsync({
  order_number: generateOrderNumber(),
  quote_id: quote.id,
  customer_id: quote.customer_id,
  order_date: new Date().toISOString(),
  status: 'pending',
  items: quote.items,       // Copy from quote
  total: quote.total
});
```

#### Mutation Hook: `useUpdateSalesOrder()`

**Usage Example:**
```typescript
const updateOrder = useUpdateSalesOrder();

// Confirm order
await updateOrder.mutateAsync({
  id: 'order-uuid',
  status: 'confirmed'
});

// Ship order
await updateOrder.mutateAsync({
  id: 'order-uuid',
  status: 'shipped',
  delivery_date: new Date().toISOString()
});

// Mark as delivered
await updateOrder.mutateAsync({
  id: 'order-uuid',
  status: 'delivered'
});
```

---

## Inventory Hooks

### useInventoryCategories

Manage hierarchical inventory categories.

**Location:** `src/hooks/useInventoryCategories.ts`

#### Query Hook: `useInventoryCategories(filters?)`

**Parameters:**
```typescript
interface CategoryFilters {
  is_active?: boolean;
  parent_category_id?: string | null;  // null = top-level categories
  search?: string;
}
```

**Returns:**
```typescript
interface InventoryCategory {
  id: string;
  company_id: string;
  category_name: string;
  category_name_ar?: string;
  description?: string;
  parent_category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data
  parent_category?: {
    category_name: string;
    category_name_ar?: string;
  };
  // Calculated fields
  item_count?: number;
  subcategory_count?: number;
}
```

**Usage Example:**
```typescript
import { useInventoryCategories } from '@/hooks/useInventoryCategories';

function CategoriesTree() {
  // Fetch top-level categories
  const { data: topCategories } = useInventoryCategories({
    parent_category_id: null,
    is_active: true
  });

  // Fetch subcategories for a specific parent
  const { data: subcategories } = useInventoryCategories({
    parent_category_id: 'parent-uuid'
  });

  return (
    <div className="category-tree">
      {topCategories?.map(category => (
        <CategoryNode
          key={category.id}
          category={category}
          itemCount={category.item_count}
          subcategoryCount={category.subcategory_count}
        />
      ))}
    </div>
  );
}
```

#### Mutation Hook: `useCreateInventoryCategory()`

**Parameters:**
```typescript
interface CreateCategoryParams {
  category_name: string;
  category_name_ar?: string;
  description?: string;
  parent_category_id?: string;
}
```

**Usage Example:**
```typescript
const createCategory = useCreateInventoryCategory();

// Create top-level category
await createCategory.mutateAsync({
  category_name: 'Vehicle Parts',
  category_name_ar: 'قطع غيار المركبات',
  description: 'All parts and accessories for vehicles'
});

// Create subcategory
await createCategory.mutateAsync({
  category_name: 'Engine Parts',
  category_name_ar: 'قطع المحرك',
  parent_category_id: 'vehicle-parts-uuid'
});
```

---

### useInventoryItems

Manage inventory item master data.

**Location:** `src/hooks/useInventoryItems.ts`

#### Query Hook: `useInventoryItems(filters?)`

**Parameters:**
```typescript
interface ItemFilters {
  category_id?: string;
  item_type?: string;       // Product, Service, Component
  is_tracked?: boolean;
  is_active?: boolean;
  search?: string;          // Search name, code, SKU, barcode
}
```

**Returns:**
```typescript
interface InventoryItem {
  id: string;
  company_id: string;
  item_name: string;
  item_name_ar?: string;
  item_code?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  description?: string;
  unit_of_measure: string;  // Unit, Box, Kg, etc.
  unit_price: number;
  cost_price: number;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_active: boolean;
  is_tracked: boolean;
  item_type: string;        // Product, Service, Component
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
```

**Usage Example:**
```typescript
import { useInventoryItems } from '@/hooks/useInventoryItems';

function ItemsPage() {
  // Fetch all active, tracked items
  const { data: items } = useInventoryItems({
    is_active: true,
    is_tracked: true
  });

  // Search items
  const [search, setSearch] = useState('');
  const { data: searchResults } = useInventoryItems({
    search: search
  });

  // Filter by category
  const { data: engineParts } = useInventoryItems({
    category_id: 'engine-parts-uuid'
  });

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} />
      {searchResults?.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

#### Mutation Hook: `useCreateInventoryItem()`

**Parameters:**
```typescript
interface CreateItemParams {
  item_name: string;
  item_name_ar?: string;
  item_code?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  description?: string;
  unit_of_measure?: string;
  unit_price: number;
  cost_price: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_tracked?: boolean;
  item_type?: string;
  image_url?: string;
  notes?: string;
}
```

**Usage Example:**
```typescript
const createItem = useCreateInventoryItem();

await createItem.mutateAsync({
  item_name: 'Brake Pads - Front',
  item_name_ar: 'فحمات الفرامل - أمامي',
  item_code: 'BP-001',
  sku: 'BP-FRONT-001',
  barcode: '1234567890123',
  category_id: 'brake-parts-uuid',
  unit_of_measure: 'Set',
  unit_price: 120.00,
  cost_price: 80.00,
  min_stock_level: 10,
  max_stock_level: 100,
  reorder_point: 15,
  reorder_quantity: 50,
  is_tracked: true,
  item_type: 'Product'
});
```

---

### useInventoryStockLevels

Query real-time stock levels across warehouses.

**Location:** `src/hooks/useInventoryStockLevels.ts`

#### Query Hook: `useInventoryStockLevels(filters?)`

**Parameters:**
```typescript
interface StockLevelFilters {
  item_id?: string;
  warehouse_id?: string;
  low_stock?: boolean;      // Only items below min_stock_level
}
```

**Returns:**
```typescript
interface InventoryStockLevel {
  id: string;
  company_id: string;
  item_id: string;
  warehouse_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;  // GENERATED: on_hand - reserved
  last_counted_at?: string;
  last_movement_at?: string;
  updated_at: string;
  // Joined data
  item?: InventoryItem;
  warehouse?: InventoryWarehouse;
}
```

**Usage Example:**
```typescript
import { useInventoryStockLevels } from '@/hooks/useInventoryStockLevels';

function StockLevelsPage() {
  // Fetch all stock levels
  const { data: stockLevels } = useInventoryStockLevels();

  // Fetch stock for specific warehouse
  const { data: mainWarehouseStock } = useInventoryStockLevels({
    warehouse_id: 'main-warehouse-uuid'
  });

  // Fetch stock for specific item
  const { data: itemStock } = useInventoryStockLevels({
    item_id: 'item-uuid'
  });

  // Fetch low stock items
  const { data: lowStock } = useInventoryStockLevels({
    low_stock: true
  });

  return (
    <div>
      <h3>Low Stock Items ({lowStock?.length || 0})</h3>
      {lowStock?.map(stock => (
        <StockAlert
          key={stock.id}
          item={stock.item}
          warehouse={stock.warehouse}
          available={stock.quantity_available}
          min={stock.item.min_stock_level}
        />
      ))}
    </div>
  );
}
```

---

### useInventoryWarehouses

Manage warehouse locations.

**Location:** `src/hooks/useInventoryWarehouses.ts`

#### Query Hook: `useInventoryWarehouses(filters?)`

**Parameters:**
```typescript
interface WarehouseFilters {
  is_active?: boolean;
  manager_id?: string;
}
```

**Returns:**
```typescript
interface InventoryWarehouse {
  id: string;
  company_id: string;
  warehouse_name: string;
  warehouse_name_ar?: string;
  warehouse_code?: string;
  location_address?: string;
  location_city?: string;
  location_country: string;
  manager_id?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

**Usage Example:**
```typescript
import { useInventoryWarehouses } from '@/hooks/useInventoryWarehouses';

function WarehouseSelector() {
  const { data: warehouses } = useInventoryWarehouses({
    is_active: true
  });

  const defaultWarehouse = warehouses?.find(w => w.is_default);

  return (
    <select defaultValue={defaultWarehouse?.id}>
      {warehouses?.map(warehouse => (
        <option key={warehouse.id} value={warehouse.id}>
          {warehouse.warehouse_name} ({warehouse.location_city})
        </option>
      ))}
    </select>
  );
}
```

---

### useInventoryReports

Access analytical views and reports.

**Location:** `src/hooks/useInventoryReports.ts`

#### Query Hook: `useInventoryValuationReport(filters?)`

Calculate total inventory value by warehouse and category.

**Parameters:**
```typescript
interface ValuationFilters {
  warehouse_id?: string;
  category_id?: string;
}
```

**Returns:**
```typescript
interface ValuationReport {
  warehouse_id: string;
  warehouse_name: string;
  category_id: string;
  category_name: string;
  total_items: number;
  total_quantity: number;
  total_cost_value: number;
  total_selling_value: number;
  potential_profit: number;
}
```

**Usage Example:**
```typescript
import { useInventoryValuationReport } from '@/hooks/useInventoryReports';

function ValuationDashboard() {
  const { data: valuation } = useInventoryValuationReport();

  const grandTotal = valuation?.reduce((sum, row) => sum + row.total_cost_value, 0) || 0;

  return (
    <div>
      <h2>Total Inventory Value: ${grandTotal.toLocaleString()}</h2>
      <table>
        <thead>
          <tr>
            <th>Warehouse</th>
            <th>Category</th>
            <th>Items</th>
            <th>Quantity</th>
            <th>Cost Value</th>
            <th>Selling Value</th>
            <th>Potential Profit</th>
          </tr>
        </thead>
        <tbody>
          {valuation?.map((row, idx) => (
            <tr key={idx}>
              <td>{row.warehouse_name}</td>
              <td>{row.category_name}</td>
              <td>{row.total_items}</td>
              <td>{row.total_quantity}</td>
              <td>${row.total_cost_value.toLocaleString()}</td>
              <td>${row.total_selling_value.toLocaleString()}</td>
              <td>${row.potential_profit.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Query Hook: `useInventoryAgingReport()`

Identify slow-moving inventory.

**Returns:**
```typescript
interface AgingReport {
  item_id: string;
  item_name: string;
  item_code: string;
  sku: string;
  category_name: string;
  warehouse_name: string;
  quantity_on_hand: number;
  quantity_available: number;
  last_movement_at?: string;
  days_since_last_movement: number;
  aging_category: string;   // Active, Slow-moving, Stagnant, Very Stagnant
  tied_up_value: number;
}
```

**Usage Example:**
```typescript
import { useInventoryAgingReport } from '@/hooks/useInventoryReports';

function AgingAnalysis() {
  const { data: aging } = useInventoryAgingReport();

  const stagnant = aging?.filter(item =>
    item.aging_category.includes('Stagnant') ||
    item.aging_category.includes('راكد')
  );

  const totalStagnantValue = stagnant?.reduce((sum, item) => sum + item.tied_up_value, 0) || 0;

  return (
    <div>
      <h3>Stagnant Inventory: ${totalStagnantValue.toLocaleString()}</h3>
      <table>
        {stagnant?.map(item => (
          <tr key={item.item_id}>
            <td>{item.item_name}</td>
            <td>{item.warehouse_name}</td>
            <td>{item.days_since_last_movement} days</td>
            <td>{item.aging_category}</td>
            <td>${item.tied_up_value.toLocaleString()}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

#### Query Hook: `useStockAlerts()`

Get proactive stock management alerts.

**Returns:**
```typescript
interface StockAlert {
  item_id: string;
  item_name: string;
  warehouse_name: string;
  category_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  min_stock_level: number;
  reorder_point: number;
  alert_type: string;           // Out of Stock, Below Minimum, Reorder Point, Overstock
  alert_priority: number;       // 1-4 (1 = most urgent)
  shortage_quantity: number;
  suggested_order_quantity: number;
  last_movement_at?: string;
}
```

**Usage Example:**
```typescript
import { useStockAlerts } from '@/hooks/useInventoryReports';

function StockAlertsDashboard() {
  const { data: alerts } = useStockAlerts();

  const urgentAlerts = alerts?.filter(a => a.alert_priority <= 2);

  return (
    <div>
      <h3>Urgent Alerts ({urgentAlerts?.length || 0})</h3>
      {urgentAlerts?.map(alert => (
        <AlertCard
          key={alert.item_id}
          alert={alert}
          onCreatePO={() => createPOFromAlert(alert)}
        />
      ))}
    </div>
  );
}
```

---

### useInventoryAdjustment

Create manual stock adjustments.

**Location:** `src/hooks/useInventoryAdjustment.ts`

#### Mutation Hook: `useCreateInventoryAdjustment()`

**Parameters:**
```typescript
interface CreateAdjustmentParams {
  item_id: string;
  warehouse_id: string;
  quantity: number;         // Positive = increase, Negative = decrease
  reason: string;
  notes?: string;
}
```

**Usage Example:**
```typescript
import { useCreateInventoryAdjustment } from '@/hooks/useInventoryAdjustment';

function AdjustStockForm() {
  const createAdjustment = useCreateInventoryAdjustment();

  const handleAdjust = async (formData: CreateAdjustmentParams) => {
    try {
      await createAdjustment.mutateAsync(formData);
      toast.success('Stock adjusted successfully');
    } catch (error) {
      toast.error('Failed to adjust stock');
    }
  };

  // Increase stock (e.g., found missing inventory)
  await handleAdjust({
    item_id: 'item-uuid',
    warehouse_id: 'warehouse-uuid',
    quantity: 10,
    reason: 'Found during stock take',
    notes: 'Discovered in back storage area'
  });

  // Decrease stock (e.g., damaged goods)
  await handleAdjust({
    item_id: 'item-uuid',
    warehouse_id: 'warehouse-uuid',
    quantity: -5,
    reason: 'Damaged',
    notes: 'Water damage from roof leak'
  });
}
```

---

## Common Patterns

### Pagination Pattern

Currently using client-side pagination. Server-side pagination can be added with:

```typescript
const { data: items, isLoading } = useInventoryItems({
  page: 1,
  pageSize: 50
});
```

### Infinite Scroll Pattern

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteQuery({
  queryKey: ['inventory-items-infinite'],
  queryFn: async ({ pageParam = 0 }) => {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .range(pageParam * 50, (pageParam + 1) * 50 - 1);
    return data;
  },
  getNextPageParam: (lastPage, pages) => {
    return lastPage.length === 50 ? pages.length : undefined;
  }
});
```

### Optimistic Updates Pattern

```typescript
const updateItem = useMutation({
  mutationFn: async (params) => {
    return await supabase
      .from('inventory_items')
      .update(params)
      .eq('id', params.id);
  },
  onMutate: async (newItem) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries(['inventory-items']);

    // Snapshot previous value
    const previous = queryClient.getQueryData(['inventory-items']);

    // Optimistically update cache
    queryClient.setQueryData(['inventory-items'], (old) =>
      old.map(item => item.id === newItem.id ? newItem : item)
    );

    return { previous };
  },
  onError: (err, newItem, context) => {
    // Rollback on error
    queryClient.setQueryData(['inventory-items'], context.previous);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries(['inventory-items']);
  }
});
```

---

## Type Definitions

### Import Types

```typescript
// Sales types
import type {
  SalesLead,
  SalesOpportunity,
  SalesQuote,
  SalesOrder,
  QuoteItem,
  OrderItem
} from '@/hooks/useSales*';

// Inventory types
import type {
  InventoryCategory,
  InventoryItem,
  InventoryWarehouse,
  InventoryStockLevel,
  ValuationReport,
  AgingReport,
  StockAlert
} from '@/hooks/useInventory*';
```

### Custom Type Guards

```typescript
// Check if lead is qualified
const isQualifiedLead = (lead: SalesLead): boolean => {
  return lead.status === 'qualified';
};

// Check if opportunity is in late stage
const isLateStageOpportunity = (opp: SalesOpportunity): boolean => {
  return ['proposal', 'negotiation', 'won'].includes(opp.stage);
};

// Check if item has low stock
const hasLowStock = (stock: InventoryStockLevel, item: InventoryItem): boolean => {
  return stock.quantity_available < item.min_stock_level;
};
```

---

## Error Handling

### Standard Error Pattern

All hooks use consistent error handling:

```typescript
const { data, error, isError, isLoading } = useSalesLeads();

if (isError) {
  return <ErrorMessage error={error} />;
}

if (isLoading) {
  return <LoadingSpinner />;
}

return <LeadsList data={data} />;
```

### Toast Notifications

Mutations automatically show toast notifications:

```typescript
const createLead = useCreateSalesLead();

// Success toast shown automatically
await createLead.mutateAsync(formData);

// Error toast shown automatically on failure
// Customize with onError callback:
createLead.mutate(formData, {
  onError: (error) => {
    toast.error(`Failed to create lead: ${error.message}`);
  }
});
```

### Custom Error Messages

```typescript
try {
  await createOrder.mutateAsync(orderData);
} catch (error) {
  if (error.message.includes('Insufficient stock')) {
    toast.error('بعض الأصناف غير متوفرة في المخزون');
  } else if (error.code === 'PGRST116') {
    toast.error('Quote not found or already converted');
  } else {
    toast.error('حدث خطأ غير متوقع');
  }
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-19
**Maintained By:** Fleetify Development Team
