-- Accounts Receivable Aging Report Migration
-- ===============================================
-- Purpose: AR aging analysis with customer breakdown and collection prioritization
-- Features: 5 aging buckets, customer analysis, payment history, Excel export ready
-- Date: 2025-01-26
-- ===============================================

-- Step 1: Create function to calculate aging bucket
CREATE OR REPLACE FUNCTION get_aging_bucket(p_days_overdue INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_days_overdue <= 0 THEN
        RETURN 'current';
    ELSIF p_days_overdue BETWEEN 1 AND 30 THEN
        RETURN '1-30';
    ELSIF p_days_overdue BETWEEN 31 AND 60 THEN
        RETURN '31-60';
    ELSIF p_days_overdue BETWEEN 61 AND 90 THEN
        RETURN '61-90';
    ELSE
        RETURN '90+';
    END IF;
END;
$$;

-- Step 2: Create view for invoice aging details
CREATE OR REPLACE VIEW invoice_aging_details AS
SELECT 
    i.id as invoice_id,
    i.company_id,
    i.invoice_number,
    i.customer_id,
    c.first_name_ar || ' ' || c.last_name_ar as customer_name_ar,
    c.first_name_en || ' ' || c.last_name_en as customer_name_en,
    c.phone as customer_phone,
    c.email as customer_email,
    c.civil_id as customer_civil_id,
    
    -- Invoice details
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.payment_status,
    
    -- Calculate amounts
    i.total_amount - COALESCE(
        (SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND status = 'completed'),
        0
    ) as outstanding_amount,
    
    -- Calculate aging
    CURRENT_DATE - i.due_date as days_overdue,
    get_aging_bucket(CURRENT_DATE - i.due_date) as aging_bucket,
    
    -- Priority calculation (based on amount and days)
    CASE 
        WHEN CURRENT_DATE - i.due_date > 90 THEN 1
        WHEN CURRENT_DATE - i.due_date > 60 THEN 2
        WHEN CURRENT_DATE - i.due_date > 30 THEN 3
        WHEN CURRENT_DATE - i.due_date > 0 THEN 4
        ELSE 5
    END as collection_priority,
    
    -- Payment history
    (SELECT COUNT(*) FROM payments WHERE invoice_id = i.id) as payment_count,
    (SELECT MAX(payment_date) FROM payments WHERE invoice_id = i.id) as last_payment_date,
    
    -- Related data
    i.contract_id,
    i.created_at,
    i.updated_at
    
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.payment_status IN ('unpaid', 'partial')
  AND i.total_amount > 0;

-- Step 3: Create customer AR aging summary view
CREATE OR REPLACE VIEW customer_ar_aging_summary AS
SELECT 
    company_id,
    customer_id,
    customer_name_ar,
    customer_name_en,
    customer_phone,
    customer_email,
    customer_civil_id,
    
    -- Total outstanding
    COUNT(*) as total_invoices,
    SUM(outstanding_amount) as total_outstanding,
    
    -- Aging buckets
    SUM(CASE WHEN aging_bucket = 'current' THEN outstanding_amount ELSE 0 END) as current_amount,
    SUM(CASE WHEN aging_bucket = '1-30' THEN outstanding_amount ELSE 0 END) as days_1_30,
    SUM(CASE WHEN aging_bucket = '31-60' THEN outstanding_amount ELSE 0 END) as days_31_60,
    SUM(CASE WHEN aging_bucket = '61-90' THEN outstanding_amount ELSE 0 END) as days_61_90,
    SUM(CASE WHEN aging_bucket = '90+' THEN outstanding_amount ELSE 0 END) as days_90_plus,
    
    -- Invoice counts per bucket
    COUNT(*) FILTER (WHERE aging_bucket = 'current') as current_count,
    COUNT(*) FILTER (WHERE aging_bucket = '1-30') as days_1_30_count,
    COUNT(*) FILTER (WHERE aging_bucket = '31-60') as days_31_60_count,
    COUNT(*) FILTER (WHERE aging_bucket = '61-90') as days_61_90_count,
    COUNT(*) FILTER (WHERE aging_bucket = '90+') as days_90_plus_count,
    
    -- Collection metrics
    MIN(collection_priority) as highest_priority,
    MAX(days_overdue) as max_days_overdue,
    AVG(days_overdue) as avg_days_overdue,
    
    -- Last activity
    MAX(last_payment_date) as last_payment_date,
    SUM(payment_count) as total_payments_received
    
FROM invoice_aging_details
GROUP BY 
    company_id,
    customer_id,
    customer_name_ar,
    customer_name_en,
    customer_phone,
    customer_email,
    customer_civil_id
ORDER BY total_outstanding DESC;

-- Step 4: Create company-wide AR aging summary
CREATE OR REPLACE VIEW company_ar_aging_summary AS
SELECT 
    company_id,
    
    -- Overall totals
    COUNT(DISTINCT customer_id) as total_customers_with_ar,
    COUNT(*) as total_outstanding_invoices,
    SUM(outstanding_amount) as total_ar_amount,
    
    -- Aging bucket totals
    SUM(CASE WHEN aging_bucket = 'current' THEN outstanding_amount ELSE 0 END) as current_total,
    SUM(CASE WHEN aging_bucket = '1-30' THEN outstanding_amount ELSE 0 END) as days_1_30_total,
    SUM(CASE WHEN aging_bucket = '31-60' THEN outstanding_amount ELSE 0 END) as days_31_60_total,
    SUM(CASE WHEN aging_bucket = '61-90' THEN outstanding_amount ELSE 0 END) as days_61_90_total,
    SUM(CASE WHEN aging_bucket = '90+' THEN outstanding_amount ELSE 0 END) as days_90_plus_total,
    
    -- Percentages
    ROUND(100.0 * SUM(CASE WHEN aging_bucket = 'current' THEN outstanding_amount ELSE 0 END) / 
        NULLIF(SUM(outstanding_amount), 0), 2) as current_percentage,
    ROUND(100.0 * SUM(CASE WHEN aging_bucket = '1-30' THEN outstanding_amount ELSE 0 END) / 
        NULLIF(SUM(outstanding_amount), 0), 2) as days_1_30_percentage,
    ROUND(100.0 * SUM(CASE WHEN aging_bucket = '31-60' THEN outstanding_amount ELSE 0 END) / 
        NULLIF(SUM(outstanding_amount), 0), 2) as days_31_60_percentage,
    ROUND(100.0 * SUM(CASE WHEN aging_bucket = '61-90' THEN outstanding_amount ELSE 0 END) / 
        NULLIF(SUM(outstanding_amount), 0), 2) as days_61_90_percentage,
    ROUND(100.0 * SUM(CASE WHEN aging_bucket = '90+' THEN outstanding_amount ELSE 0 END) / 
        NULLIF(SUM(outstanding_amount), 0), 2) as days_90_plus_percentage,
    
    -- Collection metrics
    AVG(days_overdue) as avg_days_overdue,
    MAX(days_overdue) as max_days_overdue,
    
    -- High priority count (overdue > 60 days)
    COUNT(*) FILTER (WHERE days_overdue > 60) as high_priority_count,
    SUM(outstanding_amount) FILTER (WHERE days_overdue > 60) as high_priority_amount
    
FROM invoice_aging_details
GROUP BY company_id;

-- Step 5: Create collections priority list view
CREATE OR REPLACE VIEW collections_priority_list AS
SELECT 
    c.company_id,
    c.customer_id,
    c.customer_name_ar,
    c.customer_name_en,
    c.customer_phone,
    c.customer_email,
    c.total_outstanding,
    c.total_invoices,
    c.max_days_overdue,
    c.days_90_plus as critical_amount,
    c.days_61_90 as high_risk_amount,
    
    -- Priority score calculation
    (
        -- Amount weight (40%)
        (c.total_outstanding / NULLIF((SELECT MAX(total_outstanding) FROM customer_ar_aging_summary WHERE company_id = c.company_id), 0)) * 40 +
        
        -- Days overdue weight (40%)
        (c.max_days_overdue / NULLIF((SELECT MAX(max_days_overdue) FROM customer_ar_aging_summary WHERE company_id = c.company_id), 0)) * 40 +
        
        -- Number of invoices weight (20%)
        (c.total_invoices / NULLIF((SELECT MAX(total_invoices) FROM customer_ar_aging_summary WHERE company_id = c.company_id), 0)) * 20
    ) as priority_score,
    
    -- Risk category
    CASE 
        WHEN c.days_90_plus > 0 THEN 'critical'
        WHEN c.days_61_90 > 0 THEN 'high'
        WHEN c.days_31_60 > 0 THEN 'medium'
        WHEN c.days_1_30 > 0 THEN 'low'
        ELSE 'watch'
    END as risk_category,
    
    -- Collection action
    CASE 
        WHEN c.days_90_plus > 0 THEN 'legal_action'
        WHEN c.days_61_90 > 0 THEN 'final_notice'
        WHEN c.days_31_60 > 0 THEN 'follow_up_call'
        WHEN c.days_1_30 > 0 THEN 'reminder_email'
        ELSE 'monitor'
    END as recommended_action,
    
    c.last_payment_date,
    c.total_payments_received,
    
    -- DSO calculation (Days Sales Outstanding)
    ROUND(c.avg_days_overdue, 0) as avg_dso

FROM customer_ar_aging_summary c
WHERE c.total_outstanding > 0
ORDER BY 
    CASE 
        WHEN c.days_90_plus > 0 THEN 1
        WHEN c.days_61_90 > 0 THEN 2
        WHEN c.days_31_60 > 0 THEN 3
        WHEN c.days_1_30 > 0 THEN 4
        ELSE 5
    END,
    c.total_outstanding DESC;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status_due_date 
    ON invoices(payment_status, due_date) 
    WHERE payment_status IN ('unpaid', 'partial');

CREATE INDEX IF NOT EXISTS idx_invoices_customer_payment_status 
    ON invoices(customer_id, payment_status) 
    WHERE payment_status IN ('unpaid', 'partial');

CREATE INDEX IF NOT EXISTS idx_payments_invoice_status 
    ON payments(invoice_id, status) 
    WHERE status = 'completed';

-- Step 7: Grant permissions
GRANT SELECT ON invoice_aging_details TO authenticated;
GRANT SELECT ON customer_ar_aging_summary TO authenticated;
GRANT SELECT ON company_ar_aging_summary TO authenticated;
GRANT SELECT ON collections_priority_list TO authenticated;
GRANT EXECUTE ON FUNCTION get_aging_bucket TO authenticated;

-- Step 8: Add comments
COMMENT ON VIEW invoice_aging_details IS 'Detailed invoice-level AR aging analysis with customer information';
COMMENT ON VIEW customer_ar_aging_summary IS 'Customer-wise AR aging summary with bucket breakdown';
COMMENT ON VIEW company_ar_aging_summary IS 'Company-wide AR aging totals and percentages';
COMMENT ON VIEW collections_priority_list IS 'Prioritized list of customers for collections follow-up';
COMMENT ON FUNCTION get_aging_bucket IS 'Categorize days overdue into aging buckets';

-- Step 9: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AR Aging Report System created successfully';
    RAISE NOTICE '📊 Views: invoice_aging_details, customer_ar_aging_summary, company_ar_aging_summary, collections_priority_list';
    RAISE NOTICE '🔧 Function: get_aging_bucket';
    RAISE NOTICE '📋 Aging Buckets: Current, 1-30, 31-60, 61-90, 90+ days';
    RAISE NOTICE '🎯 Features: Customer breakdown, Priority scoring, Risk categories, Recommended actions';
    RAISE NOTICE '📈 Metrics: Total AR, Aging percentages, DSO, Payment history';
    RAISE NOTICE '🔒 Permissions granted to authenticated users';
END $$;
