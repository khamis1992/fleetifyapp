-- التحقق من وجود مخالفات مرورية
SELECT COUNT(*) as total_violations FROM traffic_violations;

-- التحقق من المخالفات المرتبطة بعقود
SELECT 
  tv.id,
  tv.violation_date,
  tv.fine_amount,
  tv.status,
  c.contract_number,
  c.status as contract_status
FROM traffic_violations tv
LEFT JOIN contracts c ON tv.contract_id = c.id
LIMIT 10;

