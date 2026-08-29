CREATE OR REPLACE VIEW pending_late_fees AS
SELECT
  lf.id,
  lf.invoice_id,
  i.invoice_number,
  COALESCE(
    NULLIF(CONCAT_WS(' ', c.first_name_ar, c.last_name_ar), ''),
    NULLIF(CONCAT_WS(' ', c.first_name, c.last_name), ''),
    c.company_name_ar,
    c.company_name,
    'غير معروف'
  ) AS customer_name,
  lf.original_amount,
  lf.days_overdue,
  lf.fee_amount,
  lf.fee_type,
  lf.status,
  lf.created_at,
  EXTRACT(EPOCH FROM (NOW() - lf.created_at)) / 3600 AS hours_pending
FROM late_fees lf
JOIN invoices i ON i.id = lf.invoice_id
JOIN customers c ON c.id = i.customer_id
WHERE lf.status IN ('pending', 'waived')
ORDER BY lf.created_at DESC;;
