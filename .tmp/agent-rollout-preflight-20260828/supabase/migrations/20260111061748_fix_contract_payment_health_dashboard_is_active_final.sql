-- Fix the view to use status instead of is_active (final fix)
DROP VIEW IF EXISTS contract_payment_health_dashboard CASCADE;

CREATE VIEW contract_payment_health_dashboard AS
SELECT
    c.id AS contract_id,
    c.contract_number,
    c.contract_type,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    c.monthly_amount,
    c.status AS contract_status,
    c.start_date,
    c.end_date,
    -- Health indicators
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 0 THEN 'needs_review'
        WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN 'overpaid'
        WHEN c.contract_amount > 0 AND c.total_paid > (c.contract_amount * 0.90) THEN 'nearly_complete'
        WHEN c.total_paid > 0 THEN 'active'
        ELSE 'no_payments'
    END AS payment_health,
    -- Payment percentage
    CASE
        WHEN c.contract_amount > 0 THEN
            ROUND((c.total_paid / c.contract_amount * 100)::numeric, 2)
        ELSE NULL
    END AS payment_percentage,
    -- Overpayment amount
    CASE
        WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN
            c.total_paid - c.contract_amount
        ELSE NULL
    END AS overpayment_amount,
    -- Suspicious payment flag
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 10000 THEN true
        WHEN c.contract_amount > 0 AND c.total_paid > (c.contract_amount * 1.10) THEN true
        ELSE false
    END AS needs_review
FROM contracts c
WHERE c.status = 'active'
ORDER BY
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 10000 THEN 1
        WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN 2
        ELSE 3
    END,
    c.total_paid DESC;

COMMENT ON VIEW contract_payment_health_dashboard IS
'Dashboard view showing payment health status for all active contracts. Use to identify contracts that need review.';

GRANT SELECT ON contract_payment_health_dashboard TO authenticated;;
