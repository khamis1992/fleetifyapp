CREATE OR REPLACE VIEW collections_priority_list AS
SELECT
  i.customer_id,
  COALESCE(
    NULLIF(CONCAT_WS(' ', c.first_name_ar, c.last_name_ar), ''),
    NULLIF(CONCAT_WS(' ', c.first_name, c.last_name), ''),
    c.company_name_ar,
    c.company_name,
    'غير معروف'
  ) AS customer_name_ar,
  COALESCE(
    NULLIF(CONCAT_WS(' ', c.first_name, c.last_name), ''),
    c.company_name,
    c.first_name_ar,
    'Unknown'
  ) AS customer_name_en,
  c.phone AS customer_phone,
  c.email AS customer_email,
  SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS total_outstanding,
  COUNT(*) AS total_invoices,
  MAX(CURRENT_DATE - i.due_date) AS max_days_overdue,
  SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS critical_amount,
  SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '60 days' AND i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS high_risk_amount,
  (MAX(CURRENT_DATE - i.due_date) * 0.5 + SUM(i.total_amount - COALESCE(i.paid_amount, 0)) / 1000) AS priority_score,
  CASE
    WHEN MAX(CURRENT_DATE - i.due_date) >= 90 THEN 'critical'
    WHEN MAX(CURRENT_DATE - i.due_date) >= 60 THEN 'high'
    WHEN MAX(CURRENT_DATE - i.due_date) >= 30 THEN 'medium'
    ELSE 'low'
  END AS risk_category,
  CASE
    WHEN MAX(CURRENT_DATE - i.due_date) >= 90 THEN 'legal_action'
    WHEN MAX(CURRENT_DATE - i.due_date) >= 60 THEN 'final_notice'
    WHEN MAX(CURRENT_DATE - i.due_date) >= 30 THEN 'follow_up_call'
    ELSE 'monitor'
  END AS recommended_action,
  MAX(p.payment_date)::text AS last_payment_date,
  AVG(CURRENT_DATE - i.due_date) AS avg_dso
FROM invoices i
JOIN customers c ON c.id = i.customer_id
LEFT JOIN payments p ON p.customer_id = i.customer_id
WHERE i.payment_status NOT IN ('paid', 'cancelled')
GROUP BY i.customer_id, c.first_name_ar, c.last_name_ar, c.first_name, c.last_name, c.company_name_ar, c.company_name, c.phone, c.email;;
