-- Migration: Merge Duplicate Customer Accounts
-- Purpose: Consolidate duplicate customer names, merge all payments under one account,
--          and delete duplicate accounts without payments
-- Created: 2025-10-14

-- Create a function to merge duplicate customers
CREATE OR REPLACE FUNCTION merge_duplicate_customers()
RETURNS TABLE(
  merged_name TEXT,
  master_customer_id UUID,
  duplicate_ids UUID[],
  payments_transferred INTEGER,
  contracts_transferred INTEGER,
  duplicates_deleted INTEGER
) AS $$
DECLARE
  duplicate_group RECORD;
  master_id UUID;
  duplicate_id UUID;
  payments_count INTEGER;
  contracts_count INTEGER;
  total_payments INTEGER := 0;
  total_contracts INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  -- Loop through each group of duplicate customers (same name within same company)
  FOR duplicate_group IN
    SELECT 
      CONCAT(first_name, ' ', last_name) as full_name,
      company_id,
      ARRAY_AGG(id ORDER BY 
        -- Prioritize: 1) Most payments, 2) Earliest created
        (SELECT COUNT(*) FROM rental_payment_receipts WHERE customer_id = c.id) DESC,
        created_at ASC
      ) as customer_ids
    FROM customers c
    GROUP BY CONCAT(first_name, ' ', last_name), company_id
    HAVING COUNT(*) > 1
  LOOP
    -- The first customer in the array is the master (most payments or earliest)
    master_id := duplicate_group.customer_ids[1];
    payments_count := 0;
    contracts_count := 0;

    -- Process each duplicate (skip the first one as it's the master)
    FOR i IN 2..array_length(duplicate_group.customer_ids, 1) LOOP
      duplicate_id := duplicate_group.customer_ids[i];

      -- Transfer rental payment receipts to master account
      WITH updated_receipts AS (
        UPDATE rental_payment_receipts
        SET customer_id = master_id
        WHERE customer_id = duplicate_id
        RETURNING id
      )
      SELECT COUNT(*) INTO payments_count FROM updated_receipts;
      total_payments := total_payments + payments_count;

      -- Transfer contracts to master account
      WITH updated_contracts AS (
        UPDATE contracts
        SET customer_id = master_id
        WHERE customer_id = duplicate_id
        RETURNING id
      )
      SELECT COUNT(*) INTO contracts_count FROM updated_contracts;
      total_contracts := total_contracts + contracts_count;

      -- Transfer customer accounts if any
      UPDATE customer_accounts
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer customer aging analysis if any
      UPDATE customer_aging_analysis
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer customer balances if any
      UPDATE customer_balances
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer customer credit history if any
      UPDATE customer_credit_history
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer customer deposits if any
      UPDATE customer_deposits
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer customer financial summary if any
      UPDATE customer_financial_summary
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer customer notes if any
      UPDATE customer_notes
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer document expiry alerts if any
      UPDATE document_expiry_alerts
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer invoices if any
      UPDATE invoices
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer legal AI access logs if any
      UPDATE legal_ai_access_logs
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer legal AI queries if any
      UPDATE legal_ai_queries
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer legal memos if any
      UPDATE legal_memos
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer payments if any
      UPDATE payments
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer penalties if any
      UPDATE penalties
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer quotations if any
      UPDATE quotations
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Transfer transactions if any
      UPDATE transactions
      SET customer_id = master_id
      WHERE customer_id = duplicate_id;

      -- Delete the duplicate customer (now that all references are transferred)
      DELETE FROM customers WHERE id = duplicate_id;
      total_deleted := total_deleted + 1;

      RAISE NOTICE 'Merged customer % into master % (Payments: %, Contracts: %)',
        duplicate_id, master_id, payments_count, contracts_count;
    END LOOP;

    -- Update the customer_name in all receipts to match master account's name
    UPDATE rental_payment_receipts
    SET customer_name = duplicate_group.full_name
    WHERE customer_id = master_id;

    -- Return summary for this duplicate group
    RETURN QUERY SELECT
      duplicate_group.full_name::TEXT,
      master_id,
      duplicate_group.customer_ids[2:array_length(duplicate_group.customer_ids, 1)]::UUID[],
      total_payments,
      total_contracts,
      total_deleted;

    -- Reset counters for next group
    total_payments := 0;
    total_contracts := 0;
    total_deleted := 0;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Execute the merge function and display results
DO $$
DECLARE
  merge_result RECORD;
  grand_total_payments INTEGER := 0;
  grand_total_contracts INTEGER := 0;
  grand_total_deleted INTEGER := 0;
  duplicate_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DUPLICATE CUSTOMER MERGE PROCESS STARTED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Execute the merge and collect results
  FOR merge_result IN SELECT * FROM merge_duplicate_customers() LOOP
    duplicate_count := duplicate_count + 1;
    grand_total_payments := grand_total_payments + merge_result.payments_transferred;
    grand_total_contracts := grand_total_contracts + merge_result.contracts_transferred;
    grand_total_deleted := grand_total_deleted + merge_result.duplicates_deleted;

    RAISE NOTICE 'Group %: "%"', duplicate_count, merge_result.merged_name;
    RAISE NOTICE '  Master Account ID: %', merge_result.master_customer_id;
    RAISE NOTICE '  Duplicates Merged: % accounts', merge_result.duplicates_deleted;
    RAISE NOTICE '  Payments Transferred: %', merge_result.payments_transferred;
    RAISE NOTICE '  Contracts Transferred: %', merge_result.contracts_transferred;
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MERGE PROCESS COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Duplicate Groups Processed: %', duplicate_count;
  RAISE NOTICE 'Total Duplicate Accounts Deleted: %', grand_total_deleted;
  RAISE NOTICE 'Total Payments Transferred: %', grand_total_payments;
  RAISE NOTICE 'Total Contracts Transferred: %', grand_total_contracts;
  RAISE NOTICE '========================================';
END;
$$;

-- Verify the results
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT CONCAT(first_name, ' ', last_name) as full_name, company_id
    FROM customers
    GROUP BY CONCAT(first_name, ' ', last_name), company_id
    HAVING COUNT(*) > 1
  ) duplicates;

  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICATION:';
  RAISE NOTICE 'Remaining duplicate customer groups: %', remaining_duplicates;
  
  IF remaining_duplicates = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All duplicates have been merged!';
  ELSE
    RAISE WARNING '⚠️  WARNING: % duplicate groups still remain', remaining_duplicates;
  END IF;
END;
$$;

-- Clean up the temporary function
DROP FUNCTION IF EXISTS merge_duplicate_customers();

-- Add a comment to track this migration
COMMENT ON TABLE customers IS 'Customer records - Duplicates merged on 2025-10-14';

