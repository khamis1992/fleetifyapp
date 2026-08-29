CREATE OR REPLACE VIEW customer_ar_aging_summary AS
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
  COUNT(*) AS total_invoices,
  SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS total_outstanding,
  SUM(CASE WHEN i.due_date IS NULL OR i.due_date >= CURRENT_DATE THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS current_amount,
  SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS days_1_30,
  SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '30 days' AND i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS days_31_60,
  SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '60 days' AND i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS days_61_90,
  SUM(CASE WHEN i.due_date < CURRENT_DATE - INTERVAL '90 days' THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS days_90_plus,
  MAX(CURRENT_DATE - i.due_date) AS max_days_overdue,
  MAX(p.payment_date)::text AS last_payment_date
FROM invoices i
JOIN customers c ON c.id = i.customer_id
LEFT JOIN payments p ON p.customer_id = i.customer_id
WHERE i.payment_status NOT IN ('paid', 'cancelled')
GROUP BY i.customer_id, c.first_name_ar, c.last_name_ar, c.first_name, c.last_name, c.company_name_ar, c.company_name, c.phone, c.email;;
