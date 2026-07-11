-- PRODUCTION READINESS: Complete migration
-- Applies all Phase 1-4 fixes with IF EXISTS guards and idempotent operations.
-- Safe to run multiple times.

-- =============================================================================
-- 1. Fix financial foreign keys ON DELETE behavior
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoices_customer_id_fkey' AND table_name = 'invoices') THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_customer_id_fkey;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_invoices_contract_id' AND table_name = 'invoices') THEN
    ALTER TABLE invoices DROP CONSTRAINT fk_invoices_contract_id;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_customer_id_fkey' AND table_name = 'payments') THEN
    ALTER TABLE payments DROP CONSTRAINT payments_customer_id_fkey;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_payments_contract_id' AND table_name = 'payments') THEN
    ALTER TABLE payments DROP CONSTRAINT fk_payments_contract_id;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_invoice_id_fkey' AND table_name = 'payments') THEN
    ALTER TABLE payments DROP CONSTRAINT payments_invoice_id_fkey;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'journal_entries_reversal_entry_id_fkey' AND table_name = 'journal_entries') THEN
    ALTER TABLE journal_entries DROP CONSTRAINT journal_entries_reversal_entry_id_fkey;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_reversal_entry_id_fkey FOREIGN KEY (reversal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'journal_entry_lines_journal_entry_id_fkey' AND table_name = 'journal_entry_lines') THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT journal_entry_lines_journal_entry_id_fkey;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entry_lines ADD CONSTRAINT journal_entry_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'journal_entry_lines_account_id_fkey' AND table_name = 'journal_entry_lines') THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT journal_entry_lines_account_id_fkey;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entry_lines ADD CONSTRAINT journal_entry_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_journal_entry_lines_asset' AND table_name = 'journal_entry_lines') THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT fk_journal_entry_lines_asset;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entry_lines ADD CONSTRAINT journal_entry_lines_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_journal_entry_lines_employee' AND table_name = 'journal_entry_lines') THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT fk_journal_entry_lines_employee;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE journal_entry_lines ADD CONSTRAINT journal_entry_lines_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payment_allocations (may not exist yet in some environments)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_allocations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_allocations_payment_id_fkey' AND table_name = 'payment_allocations') THEN
      ALTER TABLE payment_allocations DROP CONSTRAINT payment_allocations_payment_id_fkey;
    END IF;
    ALTER TABLE payment_allocations ADD CONSTRAINT payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;
