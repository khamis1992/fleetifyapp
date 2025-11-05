-- Create views for payment tracking functionality
-- This migration is based on actual database schema verification via Supabase MCP

-- Drop existing views if they exist
DROP VIEW IF EXISTS payment_timeline_invoices CASCADE;
DROP VIEW IF EXISTS payment_timeline_details CASCADE;
DROP VIEW IF EXISTS payment_method_statistics CASCADE;
DROP VIEW IF EXISTS bank_reconciliation_summary CASCADE;

-- ============================================================================
-- VIEW 1: Payment Timeline Invoices
-- ============================================================================
-- Shows invoice summary with payment progress
CREATE OR REPLACE VIEW payment_timeline_invoices AS
SELECT 
    invoices.id AS invoice_id,
    invoices.invoice_number,
    COALESCE(customers.first_name || ' ' || customers.last_name, customers.email) AS customer_name_ar,
    COALESCE(customers.first_name || ' ' || customers.last_name, customers.email) AS customer_name_en,
    invoices.invoice_date AS invoice_date,
    invoices.due_date,
    invoices.total_amount,
    invoices.status::text AS payment_status,
    COALESCE(
        SUM(CASE WHEN payments.status::text = 'completed' THEN payments.amount ELSE 0 END), 
        0
    ) AS total_paid,
    invoices.total_amount - COALESCE(
        SUM(CASE WHEN payments.status::text = 'completed' THEN payments.amount ELSE 0 END), 
        0
    ) AS outstanding_balance,
    CASE 
        WHEN invoices.total_amount = 0 THEN 0
        ELSE (
            COALESCE(SUM(CASE WHEN payments.status::text = 'completed' THEN payments.amount ELSE 0 END), 0) 
            / invoices.total_amount
        ) * 100
    END AS payment_progress_percentage,
    COUNT(payments.id) AS total_payment_attempts,
    COUNT(CASE WHEN payments.status::text = 'completed' THEN 1 END) AS successful_payments,
    COUNT(CASE WHEN payments.status::text = 'pending' THEN 1 END) AS pending_payments,
    COUNT(CASE WHEN payments.status::text IN ('failed', 'refunded') THEN 1 END) AS failed_payments,
    MIN(payments.payment_date) FILTER (WHERE payments.status::text = 'completed') AS first_payment_date,
    MAX(payments.payment_date) FILTER (WHERE payments.status::text = 'completed') AS last_payment_date,
    ARRAY_AGG(DISTINCT payments.payment_method::text) FILTER (WHERE payments.payment_method IS NOT NULL) AS payment_methods_used
FROM 
    invoices
    LEFT JOIN customers ON invoices.customer_id = customers.id
    LEFT JOIN payments ON invoices.id = payments.invoice_id
GROUP BY 
    invoices.id, 
    invoices.invoice_number, 
    customers.first_name, 
    customers.last_name, 
    customers.email, 
    invoices.invoice_date, 
    invoices.due_date, 
    invoices.total_amount, 
    invoices.status
ORDER BY 
    invoices.invoice_date DESC;

-- ============================================================================
-- VIEW 2: Payment Timeline Details
-- ============================================================================
-- Shows individual payment details with cumulative totals
CREATE OR REPLACE VIEW payment_timeline_details AS
WITH payment_cumulative AS (
    SELECT 
        payments.id AS payment_id,
        payments.invoice_id,
        payments.payment_date,
        payments.amount,
        payments.status,
        SUM(payments.amount) OVER (
            PARTITION BY payments.invoice_id 
            ORDER BY payments.payment_date, payments.created_at
        ) AS cumulative_amount
    FROM payments
    WHERE payments.status::text = 'completed'
)
SELECT 
    payments.id AS payment_id,
    payments.payment_number,
    payments.payment_date,
    payments.amount,
    payments.payment_method::text AS payment_method,
    payments.status::text AS status,
    payments.reference_number AS transaction_reference,
    payments.reference_number AS bank_reference,
    invoices.total_amount AS invoice_total,
    COALESCE(pc.cumulative_amount, 0) AS cumulative_paid,
    invoices.total_amount - COALESCE(pc.cumulative_amount, 0) AS remaining_balance,
    ROW_NUMBER() OVER (
        PARTITION BY payments.invoice_id 
        ORDER BY payments.payment_date
    ) AS payment_sequence,
    payments.notes
FROM 
    payments
    JOIN invoices ON payments.invoice_id = invoices.id
    LEFT JOIN payment_cumulative pc ON payments.id = pc.payment_id;

-- ============================================================================
-- VIEW 3: Payment Method Statistics
-- ============================================================================
-- Aggregates payment data by payment method
CREATE OR REPLACE VIEW payment_method_statistics AS
SELECT 
    payment_method::text AS payment_method,
    COUNT(id) AS total_transactions,
    SUM(amount) AS total_amount,
    AVG(amount) AS average_amount,
    COUNT(CASE WHEN status::text = 'completed' THEN id END) AS completed_transactions,
    COUNT(CASE WHEN status::text = 'pending' THEN id END) AS pending_transactions,
    COUNT(CASE WHEN status::text IN ('failed', 'refunded') THEN id END) AS failed_transactions
FROM 
    payments
GROUP BY 
    payment_method
ORDER BY 
    total_amount DESC NULLS LAST;

-- ============================================================================
-- VIEW 4: Bank Reconciliation Summary
-- ============================================================================
-- Overall payment reconciliation summary
CREATE OR REPLACE VIEW bank_reconciliation_summary AS
SELECT 
    COUNT(payments.id) AS total_payments,
    COALESCE(SUM(payments.amount), 0) AS total_amount,
    COUNT(CASE WHEN payments.status::text = 'completed' THEN payments.id END) AS completed_payments,
    COALESCE(SUM(CASE WHEN payments.status::text = 'completed' THEN payments.amount ELSE 0 END), 0) AS completed_amount,
    COUNT(CASE WHEN payments.status::text = 'pending' THEN payments.id END) AS pending_payments,
    COALESCE(SUM(CASE WHEN payments.status::text = 'pending' THEN payments.amount ELSE 0 END), 0) AS pending_amount,
    (
        SELECT COUNT(id) 
        FROM invoices 
        WHERE status::text != 'paid'
    ) AS outstanding_invoices_count,
    (
        SELECT COALESCE(SUM(total_amount - paid_amount), 0)
        FROM invoices 
        WHERE status::text != 'paid'
    ) AS outstanding_invoices_amount
FROM 
    payments;
