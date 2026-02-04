-- ================================================================
-- PAYMENT BACKUP - Created: 2026-02-03
-- ================================================================
-- Backup of all payments created after: 2026-02-01 00:26:10
-- Total Payments: 9
-- Company: Al-Araf Car Rental (24bc0b21-4e2d-4413-9842-31719a3669f4)
-- ================================================================

-- IMPORTANT: Run this script AFTER database restore to re-add lost payments
-- This script uses INSERT with ON CONFLICT to safely restore payments

-- ================================================================
-- PAYMENT 1: محمد فوأد شوشان - Contract 319
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  '59859a74-6f6b-4e68-9649-aec52e3b8727',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1769938193638-1',
  '2026-02-01',
  'cash',
  'cash',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0',
  '748c9afb-23b3-42e8-9985-48ebfee3f06c',
  1600.00,
  'QAR',
  'دفعة لفاتورة INV-C-ALF-0055-2024-09',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-01 09:29:53.933177+00',
  '2026-02-01 09:29:53.933177+00',
  'f775fada-6251-4f7e-83ec-f8e003459e10',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0-748c9afb-23b3-42e8-9985-48ebfee3f06c-2026-02-01-1600'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- PAYMENT 2: محمد فوأد شوشان - Contract 319
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  '1ddfc24f-11b0-4f66-9333-96d1d04b9a14',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1769938193638-2',
  '2026-02-01',
  'cash',
  'cash',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0',
  '4f32967a-7156-4f3f-9baf-64c161d1a768',
  1600.00,
  'QAR',
  'دفعة لفاتورة INV-R-319-202503',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-01 09:29:56.274276+00',
  '2026-02-01 09:29:56.274276+00',
  'f775fada-6251-4f7e-83ec-f8e003459e10',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0-4f32967a-7156-4f3f-9baf-64c161d1a768-2026-02-01-1600'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- PAYMENT 3: محمد فوأد شوشان - Contract 319
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  '8d0b3d60-3872-4554-ad8c-564df2050afe',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1769938193638-3',
  '2026-02-01',
  'cash',
  'cash',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0',
  '3231a65f-df48-458c-9c31-c6434b8ad782',
  1600.00,
  'QAR',
  'دفعة لفاتورة INV-C-ALF-0055-013',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-01 09:29:57.874211+00',
  '2026-02-01 09:29:57.874211+00',
  'f775fada-6251-4f7e-83ec-f8e003459e10',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0-3231a65f-df48-458c-9c31-c6434b8ad782-2026-02-01-1600'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- PAYMENT 4: محمد فوأد شوشان - Contract 319
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  '85a38d1d-66d9-4a29-ab6b-3487eee10928',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1769938235554-1',
  '2026-02-01',
  'cash',
  'cash',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0',
  'a2b283d3-447e-458c-8122-8126036a4999',
  1600.00,
  'QAR',
  'دفعة لفاتورة INV-C-ALF-0055-014',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-01 09:30:35.817346+00',
  '2026-02-01 09:30:35.817346+00',
  'f775fada-6251-4f7e-83ec-f8e003459e10',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0-a2b283d3-447e-458c-8122-8126036a4999-2026-02-01-1600'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- PAYMENT 5: محمد فوأد شوشان - Contract 319
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  '60d8d0d4-f7ea-4222-b30f-eba5da192ee6',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1769938235554-2',
  '2026-02-01',
  'cash',
  'cash',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0',
  '05da3547-fd4c-45f4-83e9-0f36e6819bd3',
  1600.00,
  'QAR',
  'دفعة لفاتورة INV-2026-000181',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-01 09:30:37.375482+00',
  '2026-02-01 09:30:37.375482+00',
  'f775fada-6251-4f7e-83ec-f8e003459e10',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  '274d83f7-6220-4fe0-bcd1-e986feabeaa0-05da3547-fd4c-45f4-83e9-0f36e6819bd3-2026-02-01-1600'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- PAYMENT 6: ياسين سرحان كمال بن عايد - Contract LTO202459
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  '24b090a4-aa98-42a6-b8b3-28d22e0ad583',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1770017422608-1',
  '2026-02-02',
  'cash',
  'cash',
  'd5f01bab-4846-4da2-869f-a111afbd9e11',
  'b0a5dd31-0892-46ca-9367-b1df7131f091',
  2100.00,
  'QAR',
  'دفعة لفاتورة INV-202602-00072',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-02 07:30:22.830623+00',
  '2026-02-02 07:30:22.830623+00',
  '369ae770-8a45-4e2d-a7ff-bcb42aba5445',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  'd5f01bab-4846-4da2-869f-a111afbd9e11-b0a5dd31-0892-46ca-9367-b1df7131f091-2026-02-02-2100'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- PAYMENT 7: محمد عماد النعماني - Contract C-ALF-0070
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  '6ba18275-9138-4caa-b92e-6383faa07c4a',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1770019130378-1',
  '2026-02-02',
  'cash',
  'cash',
  'bacc7a09-335d-47cf-8cde-96d08983941d',
  '87613ff1-83bb-4f33-a3b0-521050629f1f',
  1600.00,
  'QAR',
  'دفعة لفاتورة INV-C-ALF-0070-2025-04',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-02 07:58:50.476107+00',
  '2026-02-02 07:58:50.476107+00',
  '6b4f33e5-05ff-4bcc-809a-45a184bd916b',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  'bacc7a09-335d-47cf-8cde-96d08983941d-87613ff1-83bb-4f33-a3b0-521050629f1f-2026-02-02-1600'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- PAYMENT 8: عبد المنعم حسن حمدي - Contract AGR-202504-400949
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  'c6a6351b-6c2d-4b07-a0ce-daee019f46a9',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1770022626871-1',
  '2026-02-02',
  'cash',
  'cash',
  '8d6ff2ab-2a6a-4d2a-bbfd-2ed2b5bba89f',
  'a6521b36-07ca-4b6f-b8ac-7c9d4d179c3d',
  1500.00,
  'QAR',
  'دفعة لفاتورة INV-2026-000253',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-02 08:57:07.133189+00',
  '2026-02-02 08:57:07.133189+00',
  'cef308de-167c-4387-8e42-b5e75707acf7',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  '8d6ff2ab-2a6a-4d2a-bbfd-2ed2b5bba89f-a6521b36-07ca-4b6f-b8ac-7c9d4d179c3d-2026-02-02-1500'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- PAYMENT 9: مهدي حسني - Contract C-ALF-0104
-- ================================================================
INSERT INTO payments (
  id, company_id, payment_number, payment_date, payment_type, payment_method,
  customer_id, invoice_id, amount, currency, notes, payment_status,
  created_by, created_at, updated_at, contract_id, transaction_type,
  late_fine_amount, late_fine_status, late_fine_type, late_fine_days_overdue,
  reconciliation_status, allocation_status, linking_confidence, processing_status,
  days_overdue, late_fee_amount, late_fee_days, payment_completion_status, idempotency_key
) VALUES (
  'ddabdfa3-08b5-4dfa-b529-112ef44d4354',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'PAY-1770033849304-1',
  '2026-02-02',
  'cash',
  'cash',
  '85edef2e-ee24-42fe-8fd6-a598366ea13d',
  '69be0975-b068-4041-8488-7abc8800abeb',
  2100.00,
  'QAR',
  'دفعة لفاتورة INV-202602-00036',
  'completed',
  '05e2b94f-80a4-45ee-927f-60dafe81a1af',
  '2026-02-02 12:04:09.971693+00',
  '2026-02-02 12:04:09.971693+00',
  '941d135d-fc1d-40ca-a0ca-5309fae2e91b',
  'receipt',
  0,
  'none',
  'none',
  0,
  'pending',
  'unallocated',
  '0',
  'pending',
  0,
  0.00,
  0,
  'completed',
  '85edef2e-ee24-42fe-8fd6-a598366ea13d-69be0975-b068-4041-8488-7abc8800abeb-2026-02-02-2100'
) ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  updated_at = EXCLUDED.updated_at;

-- ================================================================
-- SUMMARY
-- ================================================================
-- Total Payments: 9
-- Total Amount: 15,600 QAR
-- Date Range: 2026-02-01 to 2026-02-02
-- 
-- Customers:
-- 1. محمد فوأد شوشان (Contract 319) - 5 payments - 8,000 QAR
-- 2. ياسين سرحان كمال بن عايد (Contract LTO202459) - 1 payment - 2,100 QAR
-- 3. محمد عماد النعماني (Contract C-ALF-0070) - 1 payment - 1,600 QAR
-- 4. عبد المنعم حسن حمدي (Contract AGR-202504-400949) - 1 payment - 1,500 QAR
-- 5. مهدي حسني (Contract C-ALF-0104) - 1 payment - 2,100 QAR
-- 
-- Created by: User ID 05e2b94f-80a4-45ee-927f-60dafe81a1af
-- ================================================================

-- Verification Query (Run after restore to verify):
SELECT 
  COUNT(*) as restored_payments,
  SUM(amount) as total_amount,
  MIN(created_at) as first_payment,
  MAX(created_at) as last_payment
FROM payments 
WHERE id IN (
  '59859a74-6f6b-4e68-9649-aec52e3b8727',
  '1ddfc24f-11b0-4f66-9333-96d1d04b9a14',
  '8d0b3d60-3872-4554-ad8c-564df2050afe',
  '85a38d1d-66d9-4a29-ab6b-3487eee10928',
  '60d8d0d4-f7ea-4222-b30f-eba5da192ee6',
  '24b090a4-aa98-42a6-b8b3-28d22e0ad583',
  '6ba18275-9138-4caa-b92e-6383faa07c4a',
  'c6a6351b-6c2d-4b07-a0ce-daee019f46a9',
  'ddabdfa3-08b5-4dfa-b529-112ef44d4354'
);

-- Expected Result: 9 payments, 15,600 QAR
