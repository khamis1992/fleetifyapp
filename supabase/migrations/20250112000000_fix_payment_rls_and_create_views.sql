-- Complete migration for Fleetify payment system fixes
-- Based on actual database schema from project: qwhunliohlkkahbspfiu
-- Database has: company_id in all tables, account_code (not account_number), 
-- invoice_date (not issue_date), payment_status (not status enum)

-- =============================================================================
-- PART 1: Fix RLS Policies for Payments
-- =============================================================================

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their company payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments for their company" ON public.payments;
DROP POLICY IF EXISTS "Users can update their company payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete their company payments" ON public.payments;
DROP POLICY IF EXISTS "Enable read access for authenticated users with company" ON public.payments;
DROP POLICY IF EXISTS "Users can read payments for their company" ON public.payments;

-- Create new simple policies using company_id from profiles
CREATE POLICY "Users can read their company payments"
ON public.payments FOR SELECT
USING (
    company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create payments for their company"
ON public.payments FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their company payments"
ON public.payments FOR UPDATE
USING (
    company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their company payments"
ON public.payments FOR DELETE
USING (
    company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
    )
);

-- =============================================================================
-- PART 2: Payment Tracking Views
-- =============================================================================

-- Drop existing views
DROP VIEW IF EXISTS payment_timeline_invoices CASCADE;
DROP VIEW IF EXISTS payment_timeline_details CASCADE;
DROP VIEW IF EXISTS payment_method_statistics CASCADE;
DROP VIEW IF EXISTS bank_reconciliation_summary CASCADE;

-- VIEW 1: Invoice Payment Timeline
CREATE OR REPLACE VIEW payment_timeline_invoices AS
SELECT 
    inv.id AS invoice_id,
    inv.invoice_number,
    inv.company_id,
    COALESCE(cust.first_name_ar || ' ' || cust.last_name_ar, cust.company_name_ar, cust.first_name || ' ' || cust.last_name) AS customer_name_ar,
    COALESCE(cust.first_name || ' ' || cust.last_name, cust.company_name, cust.first_name_ar || ' ' || cust.last_name_ar) AS customer_name_en,
    inv.invoice_date,
    inv.due_date,
    inv.total_amount,
    inv.payment_status,
    COALESCE(SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount ELSE 0 END), 0) AS total_paid,
    inv.total_amount - COALESCE(SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount ELSE 0 END), 0) AS outstanding_balance,
    CASE 
        WHEN inv.total_amount = 0 THEN 0
        ELSE (COALESCE(SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount ELSE 0 END), 0) / inv.total_amount) * 100
    END AS payment_progress_percentage,
    COUNT(pay.id) AS total_payment_attempts,
    COUNT(CASE WHEN pay.payment_status = 'completed' THEN 1 END) AS successful_payments,
    COUNT(CASE WHEN pay.payment_status = 'pending' THEN 1 END) AS pending_payments,
    COUNT(CASE WHEN pay.payment_status IN ('failed', 'cancelled') THEN 1 END) AS failed_payments
FROM 
    invoices inv
    LEFT JOIN customers cust ON inv.customer_id = cust.id
    LEFT JOIN payments pay ON inv.id = pay.invoice_id
GROUP BY 
    inv.id, inv.invoice_number, inv.company_id, 
    cust.first_name_ar, cust.last_name_ar, cust.company_name_ar,
    cust.first_name, cust.last_name, cust.company_name,
    inv.invoice_date, inv.due_date, inv.total_amount, inv.payment_status
ORDER BY 
    inv.invoice_date DESC;

-- VIEW 2: Payment Method Statistics  
CREATE OR REPLACE VIEW payment_method_statistics AS
SELECT 
    company_id,
    payment_method,
    COUNT(id) AS total_transactions,
    COALESCE(SUM(amount), 0) AS total_amount,
    COALESCE(AVG(amount), 0) AS average_amount,
    COUNT(CASE WHEN payment_status = 'completed' THEN id END) AS completed_transactions,
    COUNT(CASE WHEN payment_status = 'pending' THEN id END) AS pending_transactions,
    COUNT(CASE WHEN payment_status IN ('failed', 'cancelled') THEN id END) AS failed_transactions
FROM payments
GROUP BY company_id, payment_method;

-- VIEW 3: Bank Reconciliation Summary
CREATE OR REPLACE VIEW bank_reconciliation_summary AS
SELECT 
    company_id,
    COUNT(id) AS total_payments,
    COALESCE(SUM(amount), 0) AS total_amount,
    COUNT(CASE WHEN payment_status = 'completed' THEN id END) AS total_completed_payments,
    COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END), 0) AS completed_amount
FROM payments
GROUP BY company_id;
