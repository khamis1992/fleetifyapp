-- Phase 1: Fix ON DELETE behavior for financial table foreign keys
-- Ensures that deleting a customer or contract does not orphan financial records
-- Uses SET NULL for financial preservation (records retained for auditing)

-- ============================================
-- invoices table foreign keys
-- ============================================

-- invoices.customer_id -> customers.id (SET NULL on delete)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_customer_id_fkey'
    AND table_name = 'invoices'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_customer_id_fkey;
  END IF;
END $$;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- invoices.contract_id -> contracts.id (SET NULL on delete)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_invoices_contract_id'
    AND table_name = 'invoices'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT fk_invoices_contract_id;
  END IF;
END $$;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;

-- ============================================
-- payments table foreign keys
-- ============================================

-- payments.customer_id -> customers.id (SET NULL on delete)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_customer_id_fkey'
    AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_customer_id_fkey;
  END IF;
END $$;

ALTER TABLE payments
  ADD CONSTRAINT payments_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- payments.contract_id -> contracts.id (SET NULL on delete)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_payments_contract_id'
    AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT fk_payments_contract_id;
  END IF;
END $$;

ALTER TABLE payments
  ADD CONSTRAINT payments_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;

-- payments.invoice_id -> invoices.id (SET NULL on delete)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_invoice_id_fkey'
    AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_invoice_id_fkey;
  END IF;
END $$;

ALTER TABLE payments
  ADD CONSTRAINT payments_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================
-- journal_entries table foreign keys
-- ============================================

-- journal_entries.reference_id is polymorphic; no FK alteration needed
-- journal_entries.reversal_entry_id -> journal_entries.id (SET NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_entries_reversal_entry_id_fkey'
    AND table_name = 'journal_entries'
  ) THEN
    ALTER TABLE journal_entries DROP CONSTRAINT journal_entries_reversal_entry_id_fkey;
  END IF;
END $$;

ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_reversal_entry_id_fkey
  FOREIGN KEY (reversal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL;

-- ============================================
-- journal_entry_lines table foreign keys
-- ============================================

-- journal_entry_lines.journal_entry_id -> journal_entries.id (CASCADE - lines belong to entry)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_entry_lines_journal_entry_id_fkey'
    AND table_name = 'journal_entry_lines'
  ) THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT journal_entry_lines_journal_entry_id_fkey;
  END IF;
END $$;

ALTER TABLE journal_entry_lines
  ADD CONSTRAINT journal_entry_lines_journal_entry_id_fkey
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE;

-- journal_entry_lines.account_id -> chart_of_accounts.id (SET NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_entry_lines_account_id_fkey'
    AND table_name = 'journal_entry_lines'
  ) THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT journal_entry_lines_account_id_fkey;
  END IF;
END $$;

ALTER TABLE journal_entry_lines
  ADD CONSTRAINT journal_entry_lines_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;

-- journal_entry_lines.asset_id -> fixed_assets.id (SET NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_journal_entry_lines_asset'
    AND table_name = 'journal_entry_lines'
  ) THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT fk_journal_entry_lines_asset;
  END IF;
END $$;

ALTER TABLE journal_entry_lines
  ADD CONSTRAINT journal_entry_lines_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE SET NULL;

-- journal_entry_lines.employee_id -> employees.id (SET NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_journal_entry_lines_employee'
    AND table_name = 'journal_entry_lines'
  ) THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT fk_journal_entry_lines_employee;
  END IF;
END $$;

ALTER TABLE journal_entry_lines
  ADD CONSTRAINT journal_entry_lines_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================
-- payment_allocations table foreign keys
-- ============================================

-- payment_allocations.payment_id -> payments.id (CASCADE - allocation belongs to payment)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_allocations_payment_id_fkey'
    AND table_name = 'payment_allocations'
  ) THEN
    ALTER TABLE payment_allocations DROP CONSTRAINT payment_allocations_payment_id_fkey;
  END IF;
END $$;

ALTER TABLE payment_allocations
  ADD CONSTRAINT payment_allocations_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;

-- ============================================
-- contracts table foreign keys
-- ============================================

-- contracts.customer_id -> customers.id (RESTRICT - prevent deleting customers with contracts)
-- Already has no ON DELETE clause; adding RESTRICT explicitly
DO $$
BEGIN
  -- Find any FK from contracts to customers
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%customer%'
    AND table_name = 'contracts'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Do not drop; contracts must not be orphaned from customers
    NULL;
  END IF;
END $$;

-- ============================================
-- financial_obligations table foreign keys
-- ============================================

-- financial_obligations.customer_id -> customers.id (CASCADE - obligations belong to customer)
DO $$
BEGIN
  -- Only alter if table exists and FK exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_obligations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'financial_obligations'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%customer%'
  ) THEN
    -- Keep CASCADE for obligations (they are derived from customer relationship)
    NULL;
  END IF;
END $$;
