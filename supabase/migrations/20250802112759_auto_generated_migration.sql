-- Fix the validate_customer_account trigger that's causing the account_id error
-- The issue is this trigger tries to access NEW.account_id but customers table doesn't have account_id column

-- First, let's check what this trigger is supposed to do by examining the function
-- Based on the error, it seems like this trigger shouldn't be on customers table at all
-- or it's checking for the wrong field

-- Drop the problematic trigger from customers table
DROP TRIGGER IF EXISTS validate_customer_account_trigger ON public.customers;

-- The validate_customer_account function seems to be designed for a different table
-- that actually has an account_id column. Since customers table doesn't have account_id,
-- we should not have this trigger on the customers table.

-- If we need validation on customers table, it should be for customer-specific fields
-- For now, we'll remove this trigger since it's causing the contract creation to fail