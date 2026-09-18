-- Drop and recreate with proper type casting
DROP FUNCTION IF EXISTS get_crm_customers_data(UUID);

CREATE OR REPLACE FUNCTION get_crm_customers_data(p_company_id UUID)
RETURNS TABLE (
  customer_id UUID,
  customer_code TEXT,
  first_name TEXT,
  last_name TEXT,
  first_name_ar TEXT,
  last_name_ar TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  contract_id UUID,
  contract_number TEXT,
  contract_status TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  days_until_expiry INTEGER,
  total_invoices INTEGER,
  total_invoiced_amount DECIMAL,
  total_paid_amount DECIMAL,
  outstanding_amount DECIMAL,
  overdue_invoices INTEGER,
  overdue_amount DECIMAL,
  total_interactions INTEGER,
  last_interaction_date TIMESTAMPTZ,
  last_interaction_type TEXT,
  days_since_last_interaction INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  WITH customer_contracts AS (
    SELECT
      c.id AS customer_id,
      c.customer_code::TEXT,
      c.first_name::TEXT,
      c.last_name::TEXT,
      c.first_name_ar::TEXT,
      c.last_name_ar::TEXT,
      c.phone::TEXT,
      c.email::TEXT,
      c.is_active,
      c.created_at,
      co.id AS contract_id,
      co.contract_number::TEXT,
      co.status::TEXT AS contract_status,
      co.start_date AS contract_start_date,
      co.end_date AS contract_end_date,
      CASE
        WHEN co.end_date IS NULL THEN NULL
        WHEN co.end_date < v_today THEN -1 * (v_today - co.end_date)
        ELSE co.end_date - v_today
      END AS days_until_expiry
    FROM customers c
    LEFT JOIN contracts co ON co.customer_id = c.id
      AND co.status = 'active'
    WHERE c.company_id = p_company_id
      AND c.is_active = true
  ),
  customer_invoices AS (
    SELECT
      cc.customer_id,
      COUNT(i.id)::INTEGER AS total_invoices,
      COALESCE(SUM(i.total_amount), 0) AS total_invoiced_amount,
      COALESCE(SUM(i.paid_amount), 0) AS total_paid_amount,
      COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS outstanding_amount,
      COUNT(CASE
        WHEN i.payment_status != 'paid'
          AND i.due_date IS NOT NULL
          AND i.due_date < CURRENT_DATE
        THEN 1
      END)::INTEGER AS overdue_invoices,
      COALESCE(SUM(CASE
        WHEN i.payment_status != 'paid'
          AND i.due_date IS NOT NULL
          AND i.due_date < CURRENT_DATE
        THEN i.total_amount - i.paid_amount
      END), 0) AS overdue_amount
    FROM customer_contracts cc
    LEFT JOIN invoices i ON i.customer_id = cc.customer_id
      AND i.company_id = p_company_id
    GROUP BY cc.customer_id
  ),
  customer_interactions AS (
    SELECT
      cc.customer_id,
      COUNT(cn.id)::INTEGER AS total_interactions,
      MAX(cn.created_at) AS last_interaction_date,
      (SELECT cn2.note_type::TEXT FROM customer_notes cn2 
       WHERE cn2.customer_id = cc.customer_id 
       ORDER BY cn2.created_at DESC LIMIT 1) AS last_interaction_type,
      CASE
        WHEN MAX(cn.created_at) IS NULL THEN NULL
        ELSE (v_today - DATE(MAX(cn.created_at)))::INTEGER
      END AS days_since_last_interaction
    FROM customer_contracts cc
    LEFT JOIN customer_notes cn ON cn.customer_id = cc.customer_id
      AND cn.company_id = p_company_id
    GROUP BY cc.customer_id
  )
  SELECT
    cc.customer_id,
    cc.customer_code,
    cc.first_name,
    cc.last_name,
    cc.first_name_ar,
    cc.last_name_ar,
    cc.phone,
    cc.email,
    cc.is_active,
    cc.created_at,
    cc.contract_id,
    cc.contract_number,
    cc.contract_status,
    cc.contract_start_date,
    cc.contract_end_date,
    cc.days_until_expiry,
    ci.total_invoices,
    ci.total_invoiced_amount,
    ci.total_paid_amount,
    ci.outstanding_amount,
    ci.overdue_invoices,
    ci.overdue_amount,
    cint.total_interactions,
    cint.last_interaction_date,
    cint.last_interaction_type,
    cint.days_since_last_interaction
  FROM customer_contracts cc
  LEFT JOIN customer_invoices ci ON ci.customer_id = cc.customer_id
  LEFT JOIN customer_interactions cint ON cint.customer_id = cc.customer_id
  ORDER BY cc.created_at DESC;
END;
$$;;
