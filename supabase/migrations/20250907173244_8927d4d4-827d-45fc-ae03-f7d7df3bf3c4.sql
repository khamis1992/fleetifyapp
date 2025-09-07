-- إضافة ملف تجريبي للأرشيف
INSERT INTO csv_file_archives (
  company_id,
  file_name,
  original_file_name,
  file_size_bytes,
  file_content,
  upload_type,
  uploaded_by,
  processing_status,
  total_rows,
  successful_rows,
  failed_rows,
  metadata
) VALUES (
  '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c',
  'contracts_sample_20240907.csv',
  'عقود_تجريبية.csv',
  256,
  'customer_name,contract_type,start_date,end_date,contract_amount,monthly_amount
أحمد محمد,monthly_rental,2024-01-01,2024-12-31,3600,300
فاطمة أحمد,weekly_rental,2024-02-01,2024-02-28,800,200',
  'contracts',
  '33104f93-57e7-4e5d-993f-a1e6be1cb121',
  'completed',
  3,
  2,
  1,
  '{"uploadMode": "smart", "file_type": "text/csv", "archived_at": "2024-09-07T17:30:00.000Z"}'::jsonb
);