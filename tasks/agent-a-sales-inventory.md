# Agent A: Sales & Inventory Integration

## 🎯 Your Mission
Build seamless integration between sales and inventory systems with automatic stock management and vendor restocking.

**Timeline**: 4 days
**Your Branch**: `agent-a-sales-inventory`

---

## Day 1: Foundation (8 hours)

### Task 1.1: Database Migrations ⏱️ 2 hours

Create file: `supabase/migrations/20251020000001_sales_inventory_integration.sql`

```sql
-- Inventory Transactions Table
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('sale', 'purchase', 'adjustment', 'return', 'reservation', 'release')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(15,2),
  reference_type VARCHAR(50), -- 'sales_order', 'purchase_order', 'manual'
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  warehouse_id UUID REFERENCES inventory_warehouses(id)
);

CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);

-- Stock Reservations Table
CREATE TABLE stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'released', 'expired')),
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_stock_reservations_item ON stock_reservations(item_id, status);
CREATE INDEX idx_stock_reservations_order ON stock_reservations(sales_order_id);

-- Purchase Orders Table
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  po_number VARCHAR(50) UNIQUE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'sent', 'received', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Purchase Order Line Items
CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  line_total DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX idx_po_lines_order ON purchase_order_lines(purchase_order_id);

-- Low Stock View with Vendor Info
CREATE OR REPLACE VIEW low_stock_with_vendor_info AS
SELECT
  ii.id,
  ii.item_name,
  ii.item_code,
  ii.current_stock_level,
  ii.min_stock_level,
  ii.reorder_quantity,
  ii.cost_price,
  v.id as preferred_vendor_id,
  v.vendor_name,
  v.email as vendor_email,
  v.phone as vendor_phone,
  (ii.min_stock_level - COALESCE(ii.current_stock_level, 0)) as shortage_quantity,
  ((ii.min_stock_level - COALESCE(ii.current_stock_level, 0)) * ii.cost_price) as estimated_cost
FROM inventory_items ii
LEFT JOIN vendors v ON v.id = ii.preferred_vendor_id
WHERE COALESCE(ii.current_stock_level, 0) <= ii.min_stock_level
  AND ii.is_active = true;

-- Enable RLS
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies (company-scoped)
CREATE POLICY "Users can view their company's inventory transactions"
  ON inventory_transactions FOR SELECT
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create inventory transactions"
  ON inventory_transactions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Similar policies for other tables...
```

**Acceptance**: All tables created, RLS policies working

---

### Task 1.2: Inventory Transactions Hook ⏱️ 3 hours

Create file: `src/hooks/useInventoryTransactions.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InventoryTransaction {
  id: string;
  company_id: string;
  item_id: string;
  transaction_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'reservation' | 'release';
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  warehouse_id?: string;
}

export const useInventoryTransactions = (itemId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-transactions', itemId, user?.profile?.company_id],
    queryFn: async (): Promise<InventoryTransaction[]> => {
      if (!user?.profile?.company_id) return [];

      let query = supabase
        .from('inventory_transactions')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false });

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transaction: Omit<InventoryTransaction, 'id' | 'created_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      // Start transaction
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert({
          ...transaction,
          company_id: user.profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update current stock level (if not reservation)
      if (transaction.transaction_type !== 'reservation') {
        const multiplier = ['sale', 'reservation'].includes(transaction.transaction_type) ? -1 : 1;

        const { error: updateError } = await supabase.rpc('update_stock_level', {
          item_id_param: transaction.item_id,
          quantity_change: transaction.quantity * multiplier
        });

        if (updateError) throw updateError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'تم تسجيل الحركة',
        description: 'تم تسجيل حركة المخزون بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل تسجيل حركة المخزون',
        variant: 'destructive',
      });
      console.error('Stock movement error:', error);
    },
  });
};
```

**Acceptance**: Hook creates transactions, updates stock levels

---

### Task 1.3: Stock Reservation Hook ⏱️ 3 hours

Create file: `src/hooks/useStockReservation.ts`

```typescript
export const useStockReservation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const createStockMovement = useCreateStockMovement();

  const reserveStock = useMutation({
    mutationFn: async ({
      item_id,
      quantity,
      sales_order_id
    }: {
      item_id: string;
      quantity: number;
      sales_order_id: string;
    }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      // Check available stock
      const { data: item } = await supabase
        .from('inventory_items')
        .select('current_stock_level')
        .eq('id', item_id)
        .single();

      const available = item?.current_stock_level || 0;
      if (available < quantity) {
        throw new Error(`مخزون غير كافي. المتاح: ${available}, المطلوب: ${quantity}`);
      }

      // Create reservation
      const { data, error } = await supabase
        .from('stock_reservations')
        .insert({
          company_id: user.profile.company_id,
          item_id,
          quantity,
          sales_order_id,
          status: 'active',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create transaction record
      await createStockMovement.mutateAsync({
        item_id,
        quantity,
        transaction_type: 'reservation',
        reference_type: 'sales_order',
        reference_id: sales_order_id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      toast({ title: 'تم حجز المخزون', description: 'تم حجز الكمية بنجاح' });
    },
  });

  const confirmReservation = useMutation({
    mutationFn: async (reservationId: string) => {
      // Mark reservation as confirmed
      const { data, error } = await supabase
        .from('stock_reservations')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', reservationId)
        .select()
        .single();

      if (error) throw error;

      // Create actual stock deduction
      await createStockMovement.mutateAsync({
        item_id: data.item_id,
        quantity: data.quantity,
        transaction_type: 'sale',
        reference_type: 'sales_order',
        reference_id: data.sales_order_id!,
      });

      return data;
    },
  });

  return { reserveStock, confirmReservation };
};
```

**Acceptance**: Can reserve, confirm, release stock

---

## Day 2: Sales → Inventory Flow (8 hours)

### Task 2.1: Update Sales Order Hook ⏱️ 4 hours

Modify: `src/hooks/useSalesOrders.ts`

Add stock checking and reservation to order creation:

```typescript
export const useCreateSalesOrder = () => {
  const { reserveStock } = useStockReservation();

  return useMutation({
    mutationFn: async (orderData) => {
      // 1. Check stock availability for all items
      for (const item of orderData.items) {
        const { data: inventoryItem } = await supabase
          .from('inventory_items')
          .select('current_stock_level, item_name')
          .eq('id', item.item_id)
          .single();

        if ((inventoryItem?.current_stock_level || 0) < item.quantity) {
          throw new Error(
            `مخزون ${inventoryItem?.item_name} غير كافي. المتاح: ${inventoryItem?.current_stock_level}`
          );
        }
      }

      // 2. Create order
      const { data: order, error } = await supabase
        .from('sales_orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      // 3. Reserve stock for all items
      for (const item of orderData.items) {
        await reserveStock.mutateAsync({
          item_id: item.item_id,
          quantity: item.quantity,
          sales_order_id: order.id,
        });
      }

      return order;
    },
    // ... rest of mutation config
  });
};
```

**Acceptance**: Order creation checks stock and creates reservations

---

### Task 2.2: Order Inventory Check Component ⏱️ 3 hours

Create: `src/components/sales/OrderInventoryCheck.tsx`

```typescript
import { AlertCircle, CheckCircle2, Package } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface OrderInventoryCheckProps {
  items: Array<{
    item_id: string;
    item_name: string;
    quantity: number;
  }>;
}

export const OrderInventoryCheck = ({ items }: OrderInventoryCheckProps) => {
  const { data: stockLevels, isLoading } = useQuery({
    queryKey: ['stock-check', items.map(i => i.item_id)],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_items')
        .select('id, item_name, current_stock_level')
        .in('id', items.map(i => i.item_id));
      return data;
    },
  });

  if (isLoading) return <div>جاري التحقق من المخزون...</div>;

  const checks = items.map(item => {
    const stock = stockLevels?.find(s => s.id === item.item_id);
    const available = stock?.current_stock_level || 0;
    const sufficient = available >= item.quantity;

    return {
      ...item,
      available,
      sufficient,
      shortage: sufficient ? 0 : item.quantity - available,
    };
  });

  const allAvailable = checks.every(c => c.sufficient);

  return (
    <div className="space-y-3">
      <Alert variant={allAvailable ? 'default' : 'destructive'}>
        <Package className="h-4 w-4" />
        <AlertDescription>
          {allAvailable
            ? '✓ جميع الأصناف متوفرة في المخزون'
            : '⚠️ بعض الأصناف غير متوفرة بالكمية المطلوبة'}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        {checks.map(check => (
          <div key={check.item_id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              {check.sufficient ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">{check.item_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={check.sufficient ? 'default' : 'destructive'}>
                المتاح: {check.available}
              </Badge>
              <Badge variant="outline">المطلوب: {check.quantity}</Badge>
              {!check.sufficient && (
                <Badge variant="destructive">نقص: {check.shortage}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Acceptance**: Shows real-time stock availability in order form

---

### Task 2.3: Quote → Order Conversion ⏱️ 1 hour

Add to `src/hooks/useSalesQuotes.ts`:

```typescript
export const useConvertQuoteToOrder = () => {
  const createOrder = useCreateSalesOrder();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      // Get quote details
      const { data: quote } = await supabase
        .from('sales_quotes')
        .select('*, sales_quote_lines(*)')
        .eq('id', quoteId)
        .single();

      if (!quote) throw new Error('Quote not found');

      // Create order from quote
      const orderData = {
        customer_id: quote.customer_id,
        quote_id: quoteId,
        order_date: new Date().toISOString(),
        status: 'pending',
        total_amount: quote.total_amount,
        items: quote.sales_quote_lines.map(line => ({
          item_id: line.item_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
        })),
      };

      return createOrder.mutateAsync(orderData);
    },
  });
};
```

**Acceptance**: One-click quote to order conversion with stock check

---

## Day 3: Vendor Integration & Purchase Orders (8 hours)

### Task 3.1: Purchase Orders Hook ⏱️ 4 hours

Create: `src/hooks/usePurchaseOrders.ts`

```typescript
export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (poData: {
      vendor_id: string;
      items: Array<{ item_id: string; quantity: number; unit_price: number }>;
      expected_delivery_date?: string;
      notes?: string;
    }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      // Generate PO number
      const po_number = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      // Calculate total
      const total_amount = poData.items.reduce(
        (sum, item) => sum + (item.quantity * item.unit_price),
        0
      );

      // Create PO
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: user.profile.company_id,
          po_number,
          vendor_id: poData.vendor_id,
          status: 'draft',
          order_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: poData.expected_delivery_date,
          total_amount,
          notes: poData.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create PO lines
      const { error: linesError } = await supabase
        .from('purchase_order_lines')
        .insert(
          poData.items.map(item => ({
            purchase_order_id: po.id,
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }))
        );

      if (linesError) throw linesError;

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'تم إنشاء أمر الشراء', description: 'تم إنشاء أمر الشراء بنجاح' });
    },
  });
};

export const useReceivePurchaseOrder = () => {
  const createStockMovement = useCreateStockMovement();

  return useMutation({
    mutationFn: async ({
      poId,
      receivedItems
    }: {
      poId: string;
      receivedItems: Array<{ line_id: string; quantity: number }>;
    }) => {
      // Update PO status
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', poId)
        .select('*, purchase_order_lines(*)')
        .single();

      if (error) throw error;

      // Update received quantities and create stock movements
      for (const received of receivedItems) {
        const line = po.purchase_order_lines.find(l => l.id === received.line_id);
        if (!line) continue;

        // Update received quantity
        await supabase
          .from('purchase_order_lines')
          .update({ received_quantity: received.quantity })
          .eq('id', received.line_id);

        // Create stock movement
        await createStockMovement.mutateAsync({
          item_id: line.item_id,
          quantity: received.quantity,
          unit_cost: line.unit_price,
          transaction_type: 'purchase',
          reference_type: 'purchase_order',
          reference_id: poId,
        });
      }

      return po;
    },
  });
};
```

**Acceptance**: Can create PO, receive goods, update stock

---

### Continue with remaining tasks...

**Your daily checklist:**
- [ ] Morning: Pull latest from `main`
- [ ] Code with tests
- [ ] Push to your branch EOD
- [ ] Sync with Agent B & C

**Questions?** Ask in the coordination channel!
