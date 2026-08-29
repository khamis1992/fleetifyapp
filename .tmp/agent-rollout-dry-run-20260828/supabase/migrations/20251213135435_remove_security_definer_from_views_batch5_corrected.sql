-- Remove SECURITY DEFINER from more views (batch 5) - simpler views

-- 20. inventory_purchase_order_summary
CREATE OR REPLACE VIEW public.inventory_purchase_order_summary AS
SELECT company_id,
    status,
    count(*) AS order_count,
    sum(total_amount) AS total_value,
    avg(total_amount) AS average_order_value,
    date_trunc('month', order_date) AS order_month
FROM inventory_purchase_orders po
GROUP BY company_id, status, date_trunc('month', order_date)
ORDER BY order_month DESC, status;

-- 21. v_recent_failures
CREATE OR REPLACE VIEW public.v_recent_failures AS
SELECT id,
    run_id,
    pr_number,
    stage,
    actor,
    details,
    violations,
    created_at
FROM cto_agent_audit
WHERE status = 'fail'
ORDER BY created_at DESC
LIMIT 50;

-- 22. v_account_linking_stats
CREATE OR REPLACE VIEW public.v_account_linking_stats AS
SELECT company_id,
    count(*) AS total_accounts,
    count(*) FILTER (WHERE is_header = true) AS header_accounts,
    count(*) FILTER (WHERE is_header = false) AS detail_accounts,
    count(*) FILTER (WHERE is_system = true) AS system_accounts,
    count(*) FILTER (WHERE can_link_customers = true) AS customer_linkable,
    count(*) FILTER (WHERE can_link_vendors = true) AS vendor_linkable,
    count(*) FILTER (WHERE can_link_employees = true) AS employee_linkable,
    count(*) FILTER (WHERE can_link_customers = true OR can_link_vendors = true OR can_link_employees = true) AS total_linkable
FROM chart_of_accounts
WHERE is_active = true
GROUP BY company_id;

-- 23. template_performance_summary  
CREATE OR REPLACE VIEW public.template_performance_summary AS
SELECT id,
    company_id,
    name,
    stage,
    channel,
    status,
    sent_count,
    opened_count,
    clicked_count,
    response_count,
    conversion_rate,
    CASE WHEN sent_count > 0 THEN (opened_count::numeric / sent_count::numeric * 100) ELSE 0 END AS open_rate,
    CASE WHEN sent_count > 0 THEN (clicked_count::numeric / sent_count::numeric * 100) ELSE 0 END AS click_rate,
    CASE WHEN sent_count > 0 THEN (response_count::numeric / sent_count::numeric * 100) ELSE 0 END AS response_rate
FROM reminder_templates
WHERE status = 'active'
ORDER BY sent_count DESC;;
