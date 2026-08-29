-- Drop unused payment-related tables (all have 0 rows)
-- These tables were created for features that were never implemented or used

-- AI Analysis tables (0 rows)
DROP TABLE IF EXISTS payment_ai_analysis CASCADE;

-- Allocation system tables (0 rows except allocation_rules which has 4 rows - keeping that one)
DROP TABLE IF EXISTS payment_allocations CASCADE;

-- Retry/Queue tables (0 rows)
DROP TABLE IF EXISTS payment_attempts CASCADE;
DROP TABLE IF EXISTS payment_queue CASCADE;
DROP TABLE IF EXISTS failed_transactions CASCADE;

-- Analytics tables (0 rows)
DROP TABLE IF EXISTS payment_behavior_analytics CASCADE;
DROP TABLE IF EXISTS customer_payment_scores CASCADE;

-- Linking tracking tables (0 rows)
DROP TABLE IF EXISTS payment_contract_linking_attempts CASCADE;
DROP TABLE IF EXISTS payment_contract_matching CASCADE;

-- Payment plans tables (0 rows)
DROP TABLE IF EXISTS payment_installments CASCADE;
DROP TABLE IF EXISTS payment_plans CASCADE;
DROP TABLE IF EXISTS payment_promises CASCADE;

-- Notification tables (0 rows)
DROP TABLE IF EXISTS payment_notifications CASCADE;
DROP TABLE IF EXISTS payment_reminders CASCADE;

-- Add comment to document cleanup
COMMENT ON SCHEMA public IS 'Cleaned up 14 unused payment tables on 2026-01-10';;
