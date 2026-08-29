CREATE OR REPLACE VIEW company_ar_aging_summary AS
SELECT
  COUNT(DISTINCT i.customer_id) AS total_customers_with_ar,
  COUNT(*) AS total_outstanding_invoices,
  COALESCE(SUM(i.total_amount - COALESCE(i.paid_amount, 0)), 0) AS total_ar_amount,
  COALESCE(SUM(CASE WHEN i.due_date IS NULL OR i.due_date >= CURRENT_DATE THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0) AS current_total,
  COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0) AS days_1_30_total,
  COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '30 days' AND i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0) AS days_31_60_total,
  COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '60 days' AND i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0) AS days_61_90_total,
  COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0) AS days_90_plus_total,
  CASE WHEN SUM(i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    THEN ROUND(SUM(CASE WHEN i.due_date IS NULL OR i.due_date >= CURRENT_DATE THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) * 100.0 / NULLIF(SUM(i.total_amount - COALESCE(i.paid_amount, 0)), 0), 1)
    ELSE 0 END AS current_percentage,
  CASE WHEN SUM(i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    THEN ROUND(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) * 100.0 / NULLIF(SUM(i.total_amount - COALESCE(i.paid_amount, 0)), 0), 1)
    ELSE 0 END AS days_1_30_percentage,
  CASE WHEN SUM(i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    THEN ROUND(SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '30 days' AND i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) * 100.0 / NULLIF(SUM(i.total_amount - COALESCE(i.paid_amount, 0)), 0), 1)
    ELSE 0 END AS days_31_60_percentage,
  CASE WHEN SUM(i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    THEN ROUND(SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '60 days' AND i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) * 100.0 / NULLIF(SUM(i.total_amount - COALESCE(i.paid_amount, 0)), 0), 1)
    ELSE 0 END AS days_61_90_percentage,
  CASE WHEN SUM(i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    THEN ROUND(SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) * 100.0 / NULLIF(SUM(i.total_amount - COALESCE(i.paid_amount, 0)), 0), 1)
    ELSE 0 END AS days_90_plus_percentage,
  COALESCE(AVG(CURRENT_DATE - i.due_date) FILTER (WHERE i.due_date < CURRENT_DATE), 0) AS avg_days_overdue,
  COUNT(*) FILTER (WHERE i.due_date < CURRENT_DATE - INTERVAL '60 days') AS high_priority_count,
  COALESCE(SUM(i.total_amount - COALESCE(i.paid_amount, 0)) FILTER (WHERE i.due_date < CURRENT_DATE - INTERVAL '60 days'), 0) AS high_priority_amount
FROM invoices i
WHERE i.payment_status NOT IN ('paid', 'cancelled');;
