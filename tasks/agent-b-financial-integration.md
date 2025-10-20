# Agent B: Financial Integration

## 🎯 Your Mission
Automate accounting with AR/AP tracking, auto-generated journal entries, and COGS calculations for complete financial integration.

**Timeline**: 4 days
**Your Branch**: `agent-b-financial`

---

## Day 1: Foundation & Configuration (8 hours)

### Task 1.1: Database Migrations ⏱️ 2 hours

Create file: `supabase/migrations/20251020000002_financial_integration.sql`

```sql
-- Auto Journal Configuration Table
CREATE TABLE auto_journal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  config_type VARCHAR(50) NOT NULL, -- 'sales', 'purchase', 'payment', 'cogs'
  account_mapping JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, config_type)
);

-- Example mapping structure:
-- {
--   "revenue_account_id": "uuid",
--   "ar_account_id": "uuid",
--   "ap_account_id": "uuid",
--   "inventory_account_id": "uuid",
--   "cogs_account_id": "uuid",
--   "cash_account_id": "uuid"
-- }

-- Accounts Receivable Transactions
CREATE TABLE ar_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'credit_note', 'adjustment')),
  amount DECIMAL(15,2) NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ar_customer ON ar_transactions(customer_id);
CREATE INDEX idx_ar_status ON ar_transactions(status);
CREATE INDEX idx_ar_due_date ON ar_transactions(due_date);

-- Accounts Payable Transactions
CREATE TABLE ap_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('bill', 'payment', 'debit_note', 'adjustment')),
  amount DECIMAL(15,2) NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ap_vendor ON ap_transactions(vendor_id);
CREATE INDEX idx_ap_status ON ap_transactions(status);
CREATE INDEX idx_ap_due_date ON ap_transactions(due_date);

-- Alter journal_entries to track source
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;

CREATE INDEX idx_journal_entries_source ON journal_entries(source_type, source_id);
CREATE UNIQUE INDEX idx_journal_entries_unique_source ON journal_entries(source_type, source_id)
  WHERE is_auto_generated = true;

-- Accounts Receivable Aging View
CREATE OR REPLACE VIEW accounts_receivable_aging AS
WITH customer_balances AS (
  SELECT
    c.id as customer_id,
    c.first_name || ' ' || c.last_name as customer_name,
    c.company_name,
    SUM(art.balance) as total_outstanding,
    SUM(CASE WHEN art.due_date >= CURRENT_DATE THEN art.balance ELSE 0 END) as current_amount,
    SUM(CASE WHEN art.due_date < CURRENT_DATE AND art.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN art.balance ELSE 0 END) as overdue_30,
    SUM(CASE WHEN art.due_date < CURRENT_DATE - INTERVAL '30 days' AND art.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN art.balance ELSE 0 END) as overdue_60,
    SUM(CASE WHEN art.due_date < CURRENT_DATE - INTERVAL '60 days' THEN art.balance ELSE 0 END) as overdue_90_plus,
    MIN(art.due_date) as oldest_invoice_date
  FROM customers c
  LEFT JOIN ar_transactions art ON art.customer_id = c.id AND art.status IN ('pending', 'partial', 'overdue')
  WHERE c.is_active = true
  GROUP BY c.id, c.first_name, c.last_name, c.company_name
)
SELECT * FROM customer_balances WHERE total_outstanding > 0;

-- Accounts Payable Aging View
CREATE OR REPLACE VIEW accounts_payable_aging AS
WITH vendor_balances AS (
  SELECT
    v.id as vendor_id,
    v.vendor_name,
    SUM(apt.balance) as total_outstanding,
    SUM(CASE WHEN apt.due_date >= CURRENT_DATE THEN apt.balance ELSE 0 END) as current_amount,
    SUM(CASE WHEN apt.due_date < CURRENT_DATE AND apt.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN apt.balance ELSE 0 END) as overdue_30,
    SUM(CASE WHEN apt.due_date < CURRENT_DATE - INTERVAL '30 days' AND apt.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN apt.balance ELSE 0 END) as overdue_60,
    SUM(CASE WHEN apt.due_date < CURRENT_DATE - INTERVAL '60 days' THEN apt.balance ELSE 0 END) as overdue_90_plus,
    MIN(apt.due_date) as oldest_bill_date
  FROM vendors v
  LEFT JOIN ap_transactions apt ON apt.vendor_id = v.id AND apt.status IN ('pending', 'partial', 'overdue')
  WHERE v.is_active = true
  GROUP BY v.id, v.vendor_name
)
SELECT * FROM vendor_balances WHERE total_outstanding > 0;

-- Enable RLS
ALTER TABLE auto_journal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's journal config"
  ON auto_journal_config FOR SELECT
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their company's journal config"
  ON auto_journal_config FOR ALL
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Similar for AR/AP...

-- Function to check if entry is balanced
CREATE OR REPLACE FUNCTION check_journal_entry_balanced()
RETURNS TRIGGER AS $$
DECLARE
  total_debit DECIMAL(15,2);
  total_credit DECIMAL(15,2);
BEGIN
  SELECT
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry not balanced: DR=% CR=%', total_debit, total_credit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_journal_balanced
  AFTER INSERT OR UPDATE ON journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION check_journal_entry_balanced();
```

**Acceptance**: All tables created, views working, RLS enabled

---

### Task 1.2: Auto Journal Entries Hook ⏱️ 3 hours

Create file: `src/hooks/useAutoJournalEntries.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface JournalEntryLine {
  account_id: string;
  line_number: number;
  debit_amount: number;
  credit_amount: number;
  line_description: string;
}

export const useAutoJournalEntries = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create Sales Journal Entry
  const createSalesJournalEntry = useMutation({
    mutationFn: async ({
      sales_order_id,
      customer_id,
      amount,
      description
    }: {
      sales_order_id: string;
      customer_id: string;
      amount: number;
      description: string;
    }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      // Get account mappings
      const { data: config } = await supabase
        .from('auto_journal_config')
        .select('account_mapping')
        .eq('company_id', user.profile.company_id)
        .eq('config_type', 'sales')
        .eq('is_enabled', true)
        .single();

      if (!config) throw new Error('Sales journal configuration not found');

      const mapping = config.account_mapping as {
        revenue_account_id: string;
        ar_account_id: string;
      };

      // Generate entry number
      const entry_number = `JE-SALES-${Date.now().toString().slice(-8)}`;

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: user.profile.company_id,
          entry_date: new Date().toISOString().split('T')[0],
          entry_number,
          description: description || 'Auto-generated sales entry',
          source_type: 'sales_order',
          source_id: sales_order_id,
          is_auto_generated: true,
          status: 'posted',
          created_by: user.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create entry lines
      const lines: JournalEntryLine[] = [
        {
          account_id: mapping.ar_account_id, // Debit AR
          line_number: 1,
          debit_amount: amount,
          credit_amount: 0,
          line_description: 'Accounts Receivable'
        },
        {
          account_id: mapping.revenue_account_id, // Credit Revenue
          line_number: 2,
          debit_amount: 0,
          credit_amount: amount,
          line_description: 'Sales Revenue'
        }
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(
          lines.map(line => ({
            ...line,
            journal_entry_id: entry.id
          }))
        );

      if (linesError) throw linesError;

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({
        title: 'تم إنشاء القيد',
        description: 'تم إنشاء قيد المبيعات تلقائياً',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ في القيد',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Create Purchase Journal Entry
  const createPurchaseJournalEntry = useMutation({
    mutationFn: async ({
      purchase_order_id,
      vendor_id,
      amount,
      description
    }: {
      purchase_order_id: string;
      vendor_id: string;
      amount: number;
      description: string;
    }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      const { data: config } = await supabase
        .from('auto_journal_config')
        .select('account_mapping')
        .eq('company_id', user.profile.company_id)
        .eq('config_type', 'purchase')
        .eq('is_enabled', true)
        .single();

      if (!config) throw new Error('Purchase journal configuration not found');

      const mapping = config.account_mapping as {
        inventory_account_id: string;
        ap_account_id: string;
      };

      const entry_number = `JE-PURCH-${Date.now().toString().slice(-8)}`;

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: user.profile.company_id,
          entry_date: new Date().toISOString().split('T')[0],
          entry_number,
          description: description || 'Auto-generated purchase entry',
          source_type: 'purchase_order',
          source_id: purchase_order_id,
          is_auto_generated: true,
          status: 'posted',
          created_by: user.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // DR: Inventory, CR: Accounts Payable
      const lines: JournalEntryLine[] = [
        {
          account_id: mapping.inventory_account_id,
          line_number: 1,
          debit_amount: amount,
          credit_amount: 0,
          line_description: 'Inventory Asset'
        },
        {
          account_id: mapping.ap_account_id,
          line_number: 2,
          debit_amount: 0,
          credit_amount: amount,
          line_description: 'Accounts Payable'
        }
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(
          lines.map(line => ({
            ...line,
            journal_entry_id: entry.id
          }))
        );

      if (linesError) throw linesError;

      return entry;
    },
  });

  // Create Payment Journal Entry
  const createPaymentJournalEntry = useMutation({
    mutationFn: async ({
      payment_id,
      amount,
      payment_type,
      account_id
    }: {
      payment_id: string;
      amount: number;
      payment_type: 'customer' | 'vendor';
      account_id: string; // AR or AP account
    }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      const { data: config } = await supabase
        .from('auto_journal_config')
        .select('account_mapping')
        .eq('company_id', user.profile.company_id)
        .eq('config_type', 'payment')
        .eq('is_enabled', true)
        .single();

      if (!config) throw new Error('Payment journal configuration not found');

      const mapping = config.account_mapping as {
        cash_account_id: string;
      };

      const entry_number = `JE-PAY-${Date.now().toString().slice(-8)}`;

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: user.profile.company_id,
          entry_date: new Date().toISOString().split('T')[0],
          entry_number,
          description: `Auto-generated ${payment_type} payment entry`,
          source_type: 'payment',
          source_id: payment_id,
          is_auto_generated: true,
          status: 'posted',
          created_by: user.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Customer payment: DR: Cash, CR: AR
      // Vendor payment: DR: AP, CR: Cash
      const lines: JournalEntryLine[] = payment_type === 'customer' ? [
        {
          account_id: mapping.cash_account_id,
          line_number: 1,
          debit_amount: amount,
          credit_amount: 0,
          line_description: 'Cash/Bank'
        },
        {
          account_id: account_id, // AR account
          line_number: 2,
          debit_amount: 0,
          credit_amount: amount,
          line_description: 'Accounts Receivable'
        }
      ] : [
        {
          account_id: account_id, // AP account
          line_number: 1,
          debit_amount: amount,
          credit_amount: 0,
          line_description: 'Accounts Payable'
        },
        {
          account_id: mapping.cash_account_id,
          line_number: 2,
          debit_amount: 0,
          credit_amount: amount,
          line_description: 'Cash/Bank'
        }
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(
          lines.map(line => ({
            ...line,
            journal_entry_id: entry.id
          }))
        );

      if (linesError) throw linesError;

      return entry;
    },
  });

  // Create COGS Journal Entry
  const createCOGSJournalEntry = useMutation({
    mutationFn: async ({
      sales_order_id,
      items
    }: {
      sales_order_id: string;
      items: Array<{ item_id: string; quantity: number; unit_cost: number }>;
    }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      const { data: config } = await supabase
        .from('auto_journal_config')
        .select('account_mapping')
        .eq('company_id', user.profile.company_id)
        .eq('config_type', 'cogs')
        .eq('is_enabled', true)
        .single();

      if (!config) throw new Error('COGS journal configuration not found');

      const mapping = config.account_mapping as {
        cogs_account_id: string;
        inventory_account_id: string;
      };

      const total_cost = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

      const entry_number = `JE-COGS-${Date.now().toString().slice(-8)}`;

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: user.profile.company_id,
          entry_date: new Date().toISOString().split('T')[0],
          entry_number,
          description: 'Auto-generated COGS entry',
          source_type: 'sales_order',
          source_id: sales_order_id,
          is_auto_generated: true,
          status: 'posted',
          created_by: user.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // DR: COGS, CR: Inventory
      const lines: JournalEntryLine[] = [
        {
          account_id: mapping.cogs_account_id,
          line_number: 1,
          debit_amount: total_cost,
          credit_amount: 0,
          line_description: 'Cost of Goods Sold'
        },
        {
          account_id: mapping.inventory_account_id,
          line_number: 2,
          debit_amount: 0,
          credit_amount: total_cost,
          line_description: 'Inventory Asset'
        }
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(
          lines.map(line => ({
            ...line,
            journal_entry_id: entry.id
          }))
        );

      if (linesError) throw linesError;

      return entry;
    },
  });

  return {
    createSalesJournalEntry,
    createPurchaseJournalEntry,
    createPaymentJournalEntry,
    createCOGSJournalEntry,
  };
};
```

**Acceptance**: All journal entry types working, balanced entries

---

### Task 1.3: Account Mapping Configuration UI ⏱️ 3 hours

Update file: `src/pages/finance/AccountMappings.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AccountMappings() {
  const { data: accounts } = useChartOfAccounts();
  const [salesConfig, setSalesConfig] = useState({
    is_enabled: false,
    revenue_account_id: '',
    ar_account_id: '',
  });

  const saveConfiguration = async (config_type: string, config: any) => {
    const { error } = await supabase
      .from('auto_journal_config')
      .upsert({
        company_id: user.profile.company_id,
        config_type,
        account_mapping: config,
        is_enabled: config.is_enabled,
      }, {
        onConflict: 'company_id,config_type'
      });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات القيود التلقائية للمبيعات</CardTitle>
          <CardDescription>
            اختر الحسابات المحاسبية لتسجيل المبيعات تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sales-enabled">تفعيل القيود التلقائية للمبيعات</Label>
            <Switch
              id="sales-enabled"
              checked={salesConfig.is_enabled}
              onCheckedChange={(checked) =>
                setSalesConfig({ ...salesConfig, is_enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="revenue-account">حساب الإيرادات</Label>
            <Select
              value={salesConfig.revenue_account_id}
              onValueChange={(value) =>
                setSalesConfig({ ...salesConfig, revenue_account_id: value })
              }
            >
              <SelectTrigger id="revenue-account">
                <SelectValue placeholder="اختر حساب الإيرادات" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  ?.filter(a => a.account_type === 'revenue')
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ar-account">حساب العملاء (ذمم مدينة)</Label>
            <Select
              value={salesConfig.ar_account_id}
              onValueChange={(value) =>
                setSalesConfig({ ...salesConfig, ar_account_id: value })
              }
            >
              <SelectTrigger id="ar-account">
                <SelectValue placeholder="اختر حساب العملاء" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  ?.filter(a => a.account_type === 'asset')
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => saveConfiguration('sales', salesConfig)}>
            حفظ الإعدادات
          </Button>
        </CardContent>
      </Card>

      {/* Similar cards for Purchase, Payment, COGS configurations */}
    </div>
  );
}
```

**Acceptance**: Can configure and save account mappings for all types

---

## Day 2: AR Automation (8 hours)

### Task 2.1: Accounts Receivable Hook ⏱️ 3 hours

Create file: `src/hooks/useAccountsReceivable.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAutoJournalEntries } from './useAutoJournalEntries';

export interface ARTransaction {
  id: string;
  company_id: string;
  customer_id: string;
  sales_order_id?: string;
  invoice_id?: string;
  transaction_type: 'invoice' | 'payment' | 'credit_note' | 'adjustment';
  amount: number;
  balance: number;
  due_date?: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  journal_entry_id?: string;
  created_at: string;
}

export const useAccountsReceivable = (customerId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ar-transactions', customerId, user?.profile?.company_id],
    queryFn: async (): Promise<ARTransaction[]> => {
      if (!user?.profile?.company_id) return [];

      let query = supabase
        .from('ar_transactions')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateARInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createSalesJournalEntry } = useAutoJournalEntries();

  return useMutation({
    mutationFn: async ({
      customer_id,
      sales_order_id,
      amount,
      due_date,
      description
    }: {
      customer_id: string;
      sales_order_id: string;
      amount: number;
      due_date: string;
      description: string;
    }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      // Create AR transaction
      const { data: arTx, error: arError } = await supabase
        .from('ar_transactions')
        .insert({
          company_id: user.profile.company_id,
          customer_id,
          sales_order_id,
          transaction_type: 'invoice',
          amount,
          balance: amount, // Initial balance = amount
          due_date,
          status: 'pending',
        })
        .select()
        .single();

      if (arError) throw arError;

      // Create journal entry
      const journal = await createSalesJournalEntry.mutateAsync({
        sales_order_id,
        customer_id,
        amount,
        description,
      });

      // Link journal entry to AR transaction
      await supabase
        .from('ar_transactions')
        .update({ journal_entry_id: journal.id })
        .eq('id', arTx.id);

      return arTx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-transactions'] });
      toast({ title: 'تم إنشاء الفاتورة', description: 'تم إنشاء فاتورة العميل والقيد المحاسبي' });
    },
  });
};

export const useARAgingReport = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ar-aging', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('accounts_receivable_aging')
        .select('*')
        .order('total_outstanding', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};
```

**Acceptance**: AR transactions created automatically with journal entries

---

### Task 2.2: Payment Invoice Linker Component ⏱️ 3 hours

Create file: `src/components/finance/PaymentInvoiceLinker.tsx`

```typescript
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAccountsReceivable } from '@/hooks/useAccountsReceivable';
import { Badge } from '@/components/ui/badge';

interface PaymentInvoiceLinkerProps {
  customerId: string;
  paymentAmount: number;
  onAllocationComplete: (allocations: Array<{ invoice_id: string; amount: number }>) => void;
}

export const PaymentInvoiceLinker = ({
  customerId,
  paymentAmount,
  onAllocationComplete
}: PaymentInvoiceLinkerProps) => {
  const { data: arTransactions } = useAccountsReceivable(customerId);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const pendingInvoices = arTransactions?.filter(
    tx => tx.transaction_type === 'invoice' && tx.status !== 'paid'
  ) || [];

  const totalAllocated = Object.values(allocations).reduce((sum, amt) => sum + amt, 0);
  const remainingAmount = paymentAmount - totalAllocated;

  const handleAutoAllocate = () => {
    const newAllocations: Record<string, number> = {};
    let remaining = paymentAmount;

    // Allocate to oldest invoices first
    for (const invoice of pendingInvoices) {
      if (remaining <= 0) break;

      const allocateAmount = Math.min(invoice.balance, remaining);
      newAllocations[invoice.id] = allocateAmount;
      remaining -= allocateAmount;
    }

    setAllocations(newAllocations);
  };

  const handleManualAllocation = (invoiceId: string, amount: number) => {
    setAllocations(prev => ({
      ...prev,
      [invoiceId]: amount
    }));
  };

  const handleSubmit = () => {
    const allocationArray = Object.entries(allocations)
      .filter(([_, amount]) => amount > 0)
      .map(([invoice_id, amount]) => ({ invoice_id, amount }));

    onAllocationComplete(allocationArray);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>ربط الدفعة بالفواتير</span>
          <div className="text-sm space-x-4 rtl:space-x-reverse">
            <span>المبلغ المدفوع: {paymentAmount.toFixed(2)} ر.ق</span>
            <span className={remainingAmount < 0 ? 'text-red-600' : 'text-green-600'}>
              المتبقي: {remainingAmount.toFixed(2)} ر.ق
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleAutoAllocate} variant="outline" className="w-full">
          توزيع تلقائي على الفواتير
        </Button>

        <div className="space-y-2">
          {pendingInvoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              لا توجد فواتير مستحقة لهذا العميل
            </p>
          ) : (
            pendingInvoices.map(invoice => (
              <div key={invoice.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">فاتورة #{invoice.sales_order_id?.slice(-8)}</span>
                    <Badge variant={invoice.status === 'overdue' ? 'destructive' : 'default'}>
                      {invoice.status === 'overdue' ? 'متأخرة' : invoice.status === 'partial' ? 'جزئية' : 'معلقة'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    المبلغ المستحق: {invoice.balance.toFixed(2)} ر.ق
                    {invoice.due_date && ` | تاريخ الاستحقاق: ${new Date(invoice.due_date).toLocaleDateString('ar-QA')}`}
                  </p>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={invoice.balance}
                    value={allocations[invoice.id] || ''}
                    onChange={(e) => handleManualAllocation(invoice.id, parseFloat(e.target.value) || 0)}
                    placeholder="المبلغ"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={totalAllocated === 0 || remainingAmount < 0}
          className="w-full"
        >
          تأكيد الربط
        </Button>
      </CardContent>
    </Card>
  );
};
```

**Acceptance**: Can allocate payments to specific invoices, auto-allocate available

---

### Task 2.3: Customer Payment Flow Integration ⏱️ 2 hours

Update file: `src/pages/finance/Payments.tsx` to integrate AR payment processing:

```typescript
import { useState } from 'react';
import { PaymentInvoiceLinker } from '@/components/finance/PaymentInvoiceLinker';
import { useAutoJournalEntries } from '@/hooks/useAutoJournalEntries';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Payments() {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const { createPaymentJournalEntry } = useAutoJournalEntries();
  const { toast } = useToast();

  const handlePaymentAllocation = async (
    allocations: Array<{ invoice_id: string; amount: number }>
  ) => {
    try {
      // Start database transaction
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          customer_id: selectedCustomer,
          amount: paymentAmount,
          payment_method: 'bank_transfer',
          payment_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Process each allocation
      for (const allocation of allocations) {
        // Get AR transaction
        const { data: arTx, error: arError } = await supabase
          .from('ar_transactions')
          .select('*')
          .eq('id', allocation.invoice_id)
          .single();

        if (arError) throw arError;

        // Calculate new balance
        const newBalance = arTx.balance - allocation.amount;
        const newStatus = newBalance === 0 ? 'paid' : newBalance < arTx.amount ? 'partial' : 'pending';

        // Update AR transaction
        await supabase
          .from('ar_transactions')
          .update({
            balance: newBalance,
            status: newStatus,
          })
          .eq('id', allocation.invoice_id);

        // Create payment AR transaction
        await supabase
          .from('ar_transactions')
          .insert({
            company_id: arTx.company_id,
            customer_id: selectedCustomer,
            transaction_type: 'payment',
            amount: -allocation.amount, // Negative for payment
            balance: newBalance,
          });
      }

      // Create journal entry
      await createPaymentJournalEntry.mutateAsync({
        payment_id: payment.id,
        amount: paymentAmount,
        payment_type: 'customer',
        account_id: allocations[0].invoice_id, // Use AR account from config
      });

      toast({
        title: 'تم تسجيل الدفعة',
        description: `تم تسجيل دفعة بمبلغ ${paymentAmount} ر.ق وربطها بالفواتير`,
      });

      // Reset form
      setSelectedCustomer(null);
      setPaymentAmount(0);

    } catch (error) {
      toast({
        title: 'خطأ في تسجيل الدفعة',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer selection and payment amount inputs */}

      {selectedCustomer && paymentAmount > 0 && (
        <PaymentInvoiceLinker
          customerId={selectedCustomer}
          paymentAmount={paymentAmount}
          onAllocationComplete={handlePaymentAllocation}
        />
      )}
    </div>
  );
}
```

**Acceptance**: Customer payments automatically update AR balances and create journal entries

---

## Day 3: AP Automation & COGS (8 hours)

### Task 3.1: Accounts Payable Hook ⏱️ 2 hours

Create file: `src/hooks/useAccountsPayable.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAutoJournalEntries } from './useAutoJournalEntries';

export interface APTransaction {
  id: string;
  company_id: string;
  vendor_id: string;
  purchase_order_id?: string;
  transaction_type: 'bill' | 'payment' | 'debit_note' | 'adjustment';
  amount: number;
  balance: number;
  due_date?: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  journal_entry_id?: string;
  created_at: string;
}

export const useAccountsPayable = (vendorId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ap-transactions', vendorId, user?.profile?.company_id],
    queryFn: async (): Promise<APTransaction[]> => {
      if (!user?.profile?.company_id) return [];

      let query = supabase
        .from('ap_transactions')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateAPBill = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createPurchaseJournalEntry } = useAutoJournalEntries();

  return useMutation({
    mutationFn: async ({
      vendor_id,
      purchase_order_id,
      amount,
      due_date,
      description
    }: {
      vendor_id: string;
      purchase_order_id: string;
      amount: number;
      due_date: string;
      description: string;
    }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      // Create AP transaction
      const { data: apTx, error: apError } = await supabase
        .from('ap_transactions')
        .insert({
          company_id: user.profile.company_id,
          vendor_id,
          purchase_order_id,
          transaction_type: 'bill',
          amount,
          balance: amount,
          due_date,
          status: 'pending',
        })
        .select()
        .single();

      if (apError) throw apError;

      // Create journal entry
      const journal = await createPurchaseJournalEntry.mutateAsync({
        purchase_order_id,
        vendor_id,
        amount,
        description,
      });

      // Link journal entry to AP transaction
      await supabase
        .from('ap_transactions')
        .update({ journal_entry_id: journal.id })
        .eq('id', apTx.id);

      return apTx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-transactions'] });
      toast({ title: 'تم إنشاء الفاتورة', description: 'تم إنشاء فاتورة المورّد والقيد المحاسبي' });
    },
  });
};

export const useAPAgingReport = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ap-aging', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('accounts_payable_aging')
        .select('*')
        .order('total_outstanding', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};
```

**Acceptance**: AP transactions created automatically with journal entries

---

### Task 3.2: COGS Tracking Integration ⏱️ 3 hours

Update Agent A's `useSalesOrders` hook to trigger COGS calculation:

Create file: `src/hooks/useCOGSTracking.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoJournalEntries } from './useAutoJournalEntries';

export const useCOGSTracking = () => {
  const { user } = useAuth();
  const { createCOGSJournalEntry } = useAutoJournalEntries();
  const queryClient = useQueryClient();

  const calculateCOGS = useMutation({
    mutationFn: async ({ sales_order_id }: { sales_order_id: string }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID required');

      // Get sales order items
      const { data: orderLines, error: linesError } = await supabase
        .from('sales_order_lines')
        .select('item_id, quantity, unit_price')
        .eq('sales_order_id', sales_order_id);

      if (linesError) throw linesError;

      // Calculate COGS for each item using FIFO
      const cogsItems = await Promise.all(
        orderLines.map(async (line) => {
          // Get inventory transactions for this item (purchases in FIFO order)
          const { data: purchases, error: purchaseError } = await supabase
            .from('inventory_transactions')
            .select('quantity, unit_cost')
            .eq('item_id', line.item_id)
            .eq('transaction_type', 'purchase')
            .order('created_at', { ascending: true });

          if (purchaseError) throw purchaseError;

          // Calculate weighted average cost (simplified FIFO)
          let remainingQty = line.quantity;
          let totalCost = 0;

          for (const purchase of purchases) {
            if (remainingQty <= 0) break;

            const qtyToUse = Math.min(remainingQty, purchase.quantity);
            totalCost += qtyToUse * (purchase.unit_cost || 0);
            remainingQty -= qtyToUse;
          }

          const avgCost = line.quantity > 0 ? totalCost / line.quantity : 0;

          return {
            item_id: line.item_id,
            quantity: line.quantity,
            unit_cost: avgCost,
          };
        })
      );

      // Create COGS journal entry
      await createCOGSJournalEntry.mutateAsync({
        sales_order_id,
        items: cogsItems,
      });

      return cogsItems;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
  });

  return { calculateCOGS };
};
```

**Integration Point**: Add to Agent A's order confirmation:

```typescript
// In useSalesOrders.tsx, after stock deduction
const { calculateCOGS } = useCOGSTracking();

const confirmOrder = async (orderId: string) => {
  // ... existing stock deduction code ...

  // Calculate and record COGS
  await calculateCOGS.mutateAsync({ sales_order_id: orderId });
};
```

**Acceptance**: COGS automatically calculated and journalized on order confirmation

---

### Task 3.3: AP Dashboard Component ⏱️ 3 hours

Create file: `src/components/finance/APDashboard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccountsPayable, useAPAgingReport } from '@/hooks/useAccountsPayable';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Clock, DollarSign } from 'lucide-react';

export const APDashboard = () => {
  const { data: apTransactions } = useAccountsPayable();
  const { data: agingReport } = useAPAgingReport();

  const totalPayable = apTransactions?.reduce((sum, tx) => sum + tx.balance, 0) || 0;
  const overdueCount = apTransactions?.filter(tx => tx.status === 'overdue').length || 0;
  const dueThisWeek = apTransactions?.filter(tx => {
    if (!tx.due_date) return false;
    const due = new Date(tx.due_date);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return due <= weekFromNow && tx.status === 'pending';
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الذمم الدائنة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayable.toFixed(2)} ر.ق</div>
            <p className="text-xs text-muted-foreground">
              {apTransactions?.filter(tx => tx.status !== 'paid').length} فاتورة مستحقة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فواتير متأخرة</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">تحتاج إلى دفع عاجل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مستحقة هذا الأسبوع</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dueThisWeek}</div>
            <p className="text-xs text-muted-foreground">خلال 7 أيام</p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Report */}
      <Card>
        <CardHeader>
          <CardTitle>تقرير أعمار الذمم الدائنة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المورّد</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">حالي</TableHead>
                <TableHead className="text-right">30 يوم</TableHead>
                <TableHead className="text-right">60 يوم</TableHead>
                <TableHead className="text-right">90+ يوم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agingReport?.map((row) => (
                <TableRow key={row.vendor_id}>
                  <TableCell className="font-medium">{row.vendor_name}</TableCell>
                  <TableCell className="text-right">{row.total_outstanding.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.current_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-orange-600">{row.overdue_30.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-600">{row.overdue_60.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-700 font-bold">{row.overdue_90_plus.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

**Acceptance**: AP dashboard shows summary, aging report, and overdue bills

---

## Day 4: Testing & Audit Trail (8 hours)

### Task 4.1: Auto-Entry Review Component ⏱️ 3 hours

Create file: `src/components/finance/AutoEntryReview.tsx`

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const AutoEntryReview = () => {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const { data: autoEntries } = useQuery({
    queryKey: ['auto-journal-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines(
            account_id,
            debit_amount,
            credit_amount,
            line_description,
            chart_of_accounts(account_code, account_name)
          )
        `)
        .eq('is_auto_generated', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const { data: entryDetails } = useQuery({
    queryKey: ['journal-entry-details', selectedEntry],
    queryFn: async () => {
      if (!selectedEntry) return null;

      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines(
            *,
            chart_of_accounts(*)
          )
        `)
        .eq('id', selectedEntry)
        .single();

      if (error) throw error;

      // Calculate balance check
      const totalDebit = data.journal_entry_lines.reduce((sum, line) => sum + line.debit_amount, 0);
      const totalCredit = data.journal_entry_lines.reduce((sum, line) => sum + line.credit_amount, 0);
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

      return { ...data, totalDebit, totalCredit, isBalanced };
    },
    enabled: !!selectedEntry,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>مراجعة القيود التلقائية</span>
            <Badge variant="outline">{autoEntries?.length || 0} قيد</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم القيد</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {autoEntries?.map((entry) => {
                const totalDebit = entry.journal_entry_lines?.reduce((sum, line) => sum + line.debit_amount, 0) || 0;
                const totalCredit = entry.journal_entry_lines?.reduce((sum, line) => sum + line.credit_amount, 0) || 0;
                const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono">{entry.entry_number}</TableCell>
                    <TableCell>{new Date(entry.entry_date).toLocaleDateString('ar-QA')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {entry.source_type === 'sales_order' ? 'مبيعات' :
                         entry.source_type === 'purchase_order' ? 'مشتريات' :
                         entry.source_type === 'payment' ? 'دفعة' : entry.source_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="text-right font-medium">{totalDebit.toFixed(2)} ر.ق</TableCell>
                    <TableCell>
                      {isBalanced ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          متوازن
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          غير متوازن
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(entry.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Entry Details Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل القيد: {entryDetails?.entry_number}</DialogTitle>
          </DialogHeader>
          {entryDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">التاريخ:</span>{' '}
                  {new Date(entryDetails.entry_date).toLocaleDateString('ar-QA')}
                </div>
                <div>
                  <span className="text-muted-foreground">المصدر:</span>{' '}
                  {entryDetails.source_type}
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">الوصف:</span>{' '}
                  {entryDetails.description}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحساب</TableHead>
                    <TableHead className="text-right">مدين</TableHead>
                    <TableHead className="text-right">دائن</TableHead>
                    <TableHead>الوصف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entryDetails.journal_entry_lines?.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {line.chart_of_accounts?.account_code} - {line.chart_of_accounts?.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.debit_amount > 0 ? line.debit_amount.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit_amount > 0 ? line.credit_amount.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell>{line.line_description}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell className="text-right">{entryDetails.totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{entryDetails.totalCredit.toFixed(2)}</TableCell>
                    <TableCell>
                      {entryDetails.isBalanced ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          متوازن
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          فرق: {Math.abs(entryDetails.totalDebit - entryDetails.totalCredit).toFixed(2)}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

**Acceptance**: Can review all auto-generated entries, verify balance, drill into details

---

### Task 4.2: Integration Testing ⏱️ 3 hours

Create file: `src/tests/financial-integration.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Financial Integration Tests', () => {
  let testCompanyId: string;
  let testCustomerId: string;
  let testVendorId: string;
  let testSalesOrderId: string;

  beforeAll(async () => {
    // Setup test data
    // Note: In production, use a dedicated test database
  });

  describe('AR Automation', () => {
    it('should create AR transaction when sales order is confirmed', async () => {
      // Create sales order
      const { data: order } = await supabase
        .from('sales_orders')
        .insert({
          company_id: testCompanyId,
          customer_id: testCustomerId,
          total_amount: 1000,
          status: 'confirmed',
        })
        .select()
        .single();

      // Check AR transaction created
      const { data: arTx } = await supabase
        .from('ar_transactions')
        .select('*')
        .eq('sales_order_id', order.id)
        .single();

      expect(arTx).toBeDefined();
      expect(arTx.amount).toBe(1000);
      expect(arTx.balance).toBe(1000);
      expect(arTx.status).toBe('pending');
    });

    it('should create journal entry for AR transaction', async () => {
      const { data: arTx } = await supabase
        .from('ar_transactions')
        .select('*')
        .eq('sales_order_id', testSalesOrderId)
        .single();

      expect(arTx.journal_entry_id).toBeDefined();

      // Check journal entry
      const { data: journalEntry } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines(*)
        `)
        .eq('id', arTx.journal_entry_id)
        .single();

      expect(journalEntry.is_auto_generated).toBe(true);
      expect(journalEntry.source_type).toBe('sales_order');

      // Verify balanced entry
      const totalDebit = journalEntry.journal_entry_lines.reduce((sum, line) => sum + line.debit_amount, 0);
      const totalCredit = journalEntry.journal_entry_lines.reduce((sum, line) => sum + line.credit_amount, 0);
      expect(totalDebit).toBe(totalCredit);
    });

    it('should update AR balance when payment is received', async () => {
      // Record payment
      const payment = await supabase
        .from('ar_transactions')
        .insert({
          company_id: testCompanyId,
          customer_id: testCustomerId,
          transaction_type: 'payment',
          amount: -500, // Negative for payment
          balance: 500, // Remaining balance
        })
        .select()
        .single();

      expect(payment.data.balance).toBe(500);
    });
  });

  describe('AP Automation', () => {
    it('should create AP transaction when purchase order is received', async () => {
      const { data: po } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: testCompanyId,
          vendor_id: testVendorId,
          total_amount: 2000,
          status: 'received',
        })
        .select()
        .single();

      const { data: apTx } = await supabase
        .from('ap_transactions')
        .select('*')
        .eq('purchase_order_id', po.id)
        .single();

      expect(apTx).toBeDefined();
      expect(apTx.amount).toBe(2000);
      expect(apTx.journal_entry_id).toBeDefined();
    });
  });

  describe('COGS Calculation', () => {
    it('should calculate COGS using FIFO method', async () => {
      // Setup: Create inventory with known costs
      // Test: Confirm sales order
      // Verify: COGS journal entry matches expected FIFO cost
    });
  });

  describe('Double-Entry Validation', () => {
    it('should prevent unbalanced journal entries', async () => {
      const { data: entry } = await supabase
        .from('journal_entries')
        .insert({
          company_id: testCompanyId,
          entry_number: 'TEST-001',
          entry_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      // Try to insert unbalanced lines
      const insertPromise = supabase
        .from('journal_entry_lines')
        .insert([
          { journal_entry_id: entry.id, account_id: 'xxx', debit_amount: 100, credit_amount: 0 },
          { journal_entry_id: entry.id, account_id: 'yyy', debit_amount: 0, credit_amount: 90 }, // Unbalanced!
        ]);

      // Should throw error from trigger
      await expect(insertPromise).rejects.toThrow();
    });
  });
});
```

**Acceptance**: All integration tests pass, coverage > 80%

---

### Task 4.3: Feature Flags & Documentation ⏱️ 2 hours

Update `.env.example`:

```bash
# Financial Integration Feature Flags
VITE_ENABLE_AUTO_JOURNAL_ENTRIES=false
VITE_ENABLE_AR_AUTOMATION=false
VITE_ENABLE_AP_AUTOMATION=false
VITE_ENABLE_COGS_TRACKING=false
```

Create file: `src/config/featureFlags.ts`

```typescript
export const FEATURE_FLAGS = {
  AUTO_JOURNAL_ENTRIES: import.meta.env.VITE_ENABLE_AUTO_JOURNAL_ENTRIES === 'true',
  AR_AUTOMATION: import.meta.env.VITE_ENABLE_AR_AUTOMATION === 'true',
  AP_AUTOMATION: import.meta.env.VITE_ENABLE_AP_AUTOMATION === 'true',
  COGS_TRACKING: import.meta.env.VITE_ENABLE_COGS_TRACKING === 'true',
};

// Wrapper hooks with feature flag checks
export const useAutoJournalEntriesWithFlag = () => {
  const baseHook = useAutoJournalEntries();

  return {
    ...baseHook,
    createSalesJournalEntry: FEATURE_FLAGS.AUTO_JOURNAL_ENTRIES
      ? baseHook.createSalesJournalEntry
      : { mutateAsync: async () => null },
  };
};
```

Update `README.md` section:

```markdown
## Phase 9B: Financial Integration

### Features
- ✅ Auto-generated journal entries for sales, purchases, payments
- ✅ Accounts Receivable automation with aging reports
- ✅ Accounts Payable automation with vendor tracking
- ✅ COGS calculation using FIFO method
- ✅ Payment-to-invoice allocation
- ✅ Double-entry validation

### Setup
1. Run migration: `supabase/migrations/20251020000002_financial_integration.sql`
2. Configure account mappings in Finance → Settings → Account Mappings
3. Enable feature flags in `.env.local`:
   ```
   VITE_ENABLE_AUTO_JOURNAL_ENTRIES=true
   VITE_ENABLE_AR_AUTOMATION=true
   VITE_ENABLE_AP_AUTOMATION=true
   VITE_ENABLE_COGS_TRACKING=true
   ```

### Rollback Plan
1. Disable feature flags
2. Run down migration if needed
3. Manual journal entries still work as before
```

**Acceptance**: Feature flags control all new functionality, documentation complete

---

## 🎯 Final Checklist

- [ ] All 12 tasks completed
- [ ] Database migrations tested
- [ ] All hooks return correct data
- [ ] Journal entries always balanced
- [ ] AR/AP automation working
- [ ] COGS calculated correctly
- [ ] Feature flags implemented
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Code reviewed by Agent A/C
- [ ] Merged to main

**Daily Checklist:**
- [ ] Morning: Pull from `main`, sync with Agent A
- [ ] Coordinate hook ownership (you own payments, A owns orders)
- [ ] Test journal entries are balanced
- [ ] Push EOD, notify agents

**Questions?** Check coordination channel!
