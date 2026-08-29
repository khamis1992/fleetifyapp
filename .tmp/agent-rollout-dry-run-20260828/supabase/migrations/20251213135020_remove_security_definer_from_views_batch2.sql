-- Remove SECURITY DEFINER from more views (batch 2)

-- 6. v_linkable_accounts
CREATE OR REPLACE VIEW public.v_linkable_accounts AS
SELECT id,
    company_id,
    account_code,
    account_name,
    account_name_ar,
    account_type,
    account_subtype,
    parent_account_id,
    is_active,
    is_system,
    balance_type,
    current_balance,
    description,
    created_at,
    updated_at,
    account_level,
    sort_order,
    is_header,
    is_default,
    parent_account_code,
    can_link_customers,
    can_link_vendors,
    can_link_employees,
    CASE
        WHEN can_link_customers THEN 'customers'
        WHEN can_link_vendors THEN 'vendors'
        WHEN can_link_employees THEN 'employees'
        ELSE 'none'
    END AS primary_link_type,
    (can_link_customers::int + can_link_vendors::int + can_link_employees::int) AS link_count
FROM chart_of_accounts ca
WHERE is_header = false 
    AND is_active = true 
    AND (can_link_customers = true OR can_link_vendors = true OR can_link_employees = true);

-- 7. security_policy_violations
CREATE OR REPLACE VIEW public.security_policy_violations AS
SELECT 'users_without_company' AS violation_type,
    count(*) AS count,
    array_agg(profiles.user_id) AS affected_users
FROM profiles
WHERE profiles.company_id IS NULL AND profiles.is_active = true
UNION ALL
SELECT 'orphaned_records' AS violation_type,
    count(*) AS count,
    array_agg(contracts.id) AS affected_users
FROM contracts
WHERE NOT contracts.company_id IN (SELECT companies.id FROM companies)
UNION ALL
SELECT 'inactive_users_with_active_data' AS violation_type,
    count(*) AS count,
    array_agg(DISTINCT contracts.created_by) AS affected_users
FROM contracts
WHERE contracts.created_by IN (SELECT profiles.user_id FROM profiles WHERE profiles.is_active = false);

-- 8. inventory_suppliers_summary
CREATE OR REPLACE VIEW public.inventory_suppliers_summary AS
SELECT s.id,
    s.company_id,
    s.company_name,
    s.company_name_ar,
    s.contact_person,
    s.email,
    s.phone,
    s.address,
    s.city,
    s.country,
    s.tax_number,
    s.commercial_register,
    s.payment_terms,
    s.delivery_terms,
    s.rating,
    s.is_active,
    s.is_preferred,
    s.lead_time_days,
    s.minimum_order_value,
    s.website,
    s.notes,
    s.created_at,
    s.updated_at,
    s.created_by,
    c.category_name,
    sp.evaluation_period,
    sp.quality_score,
    sp.average_lead_time_days,
    sp.order_accuracy_rate,
    sp.price_competitiveness_score,
    sp.total_orders,
    sp.total_order_value
FROM inventory_suppliers s
LEFT JOIN inventory_supplier_category_mapping scm ON s.id = scm.supplier_id
LEFT JOIN inventory_supplier_categories c ON scm.category_id = c.id
LEFT JOIN LATERAL (
    SELECT *
    FROM inventory_supplier_performance
    WHERE supplier_id = s.id
    ORDER BY evaluation_period DESC
    LIMIT 1
) sp ON true
WHERE s.is_active = true
ORDER BY s.rating DESC, sp.quality_score DESC NULLS LAST;

-- 9. v_pending_waivers
CREATE OR REPLACE VIEW public.v_pending_waivers AS
SELECT id,
    rule_id,
    rule_name,
    reason,
    requested_by,
    expires_at,
    created_at
FROM cto_waivers
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 10. active_payment_plans_summary
CREATE OR REPLACE VIEW public.active_payment_plans_summary AS
SELECT pp.id,
    pp.company_id,
    pp.customer_id,
    COALESCE(c.first_name || ' ' || c.last_name, c.first_name, c.last_name, '') AS customer_name,
    pp.invoice_id,
    pp.total_amount,
    pp.number_of_payments,
    pp.frequency,
    pp.status,
    count(pi.id) AS total_installments,
    count(pi.id) FILTER (WHERE pi.status = 'paid') AS paid_installments,
    count(pi.id) FILTER (WHERE pi.status = 'overdue') AS overdue_installments,
    sum(pi.amount) AS total_plan_amount,
    sum(pi.paid_amount) AS total_paid_amount,
    pp.start_date,
    pp.end_date
FROM payment_plans pp
LEFT JOIN payment_installments pi ON pp.id = pi.payment_plan_id
LEFT JOIN customers c ON pp.customer_id = c.id
WHERE pp.status = 'active'
GROUP BY pp.id, c.first_name, c.last_name;;
