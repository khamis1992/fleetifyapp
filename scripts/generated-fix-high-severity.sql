
-- ==========================================
-- Auto-Generated Fix SQL for High-Severity Contracts
-- Generated: 2026-01-10T10:35:26.531Z
-- ==========================================
-- IMPORTANT: Review this SQL before running!
-- Run in your Supabase SQL Editor
-- ==========================================

-- Contract: 319
-- Set contract amount to QAR 68,800 based on invoice total
UPDATE contracts
SET contract_amount = 68800
WHERE id = 'f775fada-6251-4f7e-83ec-f8e003459e10';

-- Contract: AGR-202504-424958
-- Set contract amount to QAR 54,950 based on invoice total
UPDATE contracts
SET contract_amount = 54950
WHERE id = 'fda9b7b5-20ce-4d07-976c-bcab7cfeb4cb';

-- Contract: C-ALF-0077
-- Set contract amount to QAR 19,800 based on total paid
UPDATE contracts
SET contract_amount = 19800
WHERE id = 'b2166cb4-c103-40c6-b1e7-bb558d1690ca';

-- Contract: LTO2024100
-- Set contract amount to QAR 1,965,600 based on invoice total
UPDATE contracts
SET contract_amount = 1965600
WHERE id = 'aa53e5ec-62c6-4098-af3e-e5e4cd5f34f0';

-- Contract: LTO2024103
-- Set contract amount to QAR 36,000 based on invoice total
UPDATE contracts
SET contract_amount = 36000
WHERE id = '4f461fb4-b2af-482c-9a4d-2f081c5386e8';

-- Contract: LTO2024104
-- Set contract amount to QAR 68,040 based on invoice total
UPDATE contracts
SET contract_amount = 68040
WHERE id = 'cd8a5d6d-676c-47a1-8974-e7b28540c3d4';

-- Contract: LTO2024115
-- Set contract amount to QAR 113,400 based on invoice total
UPDATE contracts
SET contract_amount = 113400
WHERE id = 'eff359f1-0241-4f31-879f-86fb5e9d0157';

-- Contract: LTO2024124
-- Set contract amount to QAR 115,000 based on invoice total
UPDATE contracts
SET contract_amount = 115000
WHERE id = '622fce10-727e-49e0-ab45-8d2b305d452e';

-- Contract: LTO2024156
-- Set contract amount to QAR 102,000 based on invoice total
UPDATE contracts
SET contract_amount = 102000
WHERE id = '9862e3ad-242e-4f62-bc12-5f7bd2a20bbf';

-- Contract: LTO2024248
-- Set contract amount to QAR 84,000 based on invoice total
UPDATE contracts
SET contract_amount = 84000
WHERE id = '860daa14-26ed-44b5-b314-9b8696bf9d40';

-- Contract: LTO2024251
-- Set contract amount to QAR 58,750 based on invoice total
UPDATE contracts
SET contract_amount = 58750
WHERE id = '83e5fdc8-4812-4918-877c-0d7da2167383';

-- Contract: LTO2024261
-- Set contract amount to QAR 82,250 based on invoice total
UPDATE contracts
SET contract_amount = 82250
WHERE id = 'c5502c18-3bbc-45fb-9c15-f125238806d5';

-- Contract: LTO2024263
-- Set contract amount to QAR 84,600 based on invoice total
UPDATE contracts
SET contract_amount = 84600
WHERE id = '74b821cd-3952-4285-af17-d17ad7703d5b';

-- Contract: LTO202427
-- Set contract amount to QAR 132,300 based on invoice total
UPDATE contracts
SET contract_amount = 132300
WHERE id = '3beb3058-3ea7-4b1c-91c8-7a71e74f4c65';

-- Contract: LTO2024270
-- Set contract amount to QAR 61,750 based on invoice total
UPDATE contracts
SET contract_amount = 61750
WHERE id = '1e945362-da71-4d11-9993-04684745e9f9';

-- Contract: LTO2024273
-- Set contract amount to QAR 89,250 based on invoice total
UPDATE contracts
SET contract_amount = 89250
WHERE id = '804ebaa8-1653-461f-8e6b-67fe60a431dc';

-- Contract: LTO2024285
-- Set contract amount to QAR 2,073,600 based on invoice total
UPDATE contracts
SET contract_amount = 2073600
WHERE id = '3b1f6393-7d0e-4744-8233-2ed4cedd2956';

-- Contract: LTO202429
-- Set contract amount to QAR 13,000 based on total paid
UPDATE contracts
SET contract_amount = 13000
WHERE id = '816f510c-5f0e-4508-acbe-447c388ecc59';

-- Contract: LTO2024340
-- Set contract amount to QAR 57,000 based on invoice total
UPDATE contracts
SET contract_amount = 57000
WHERE id = 'c01c6b4b-9223-433e-827c-097ca3cdd985';

-- Contract: LTO202437
-- Set contract amount to QAR 75,840 based on invoice total
UPDATE contracts
SET contract_amount = 75840
WHERE id = '662e4640-2b0a-4a21-a05a-b44681f8c1eb';

-- Contract: LTO202453
-- Set contract amount to QAR 27,950 based on total paid
UPDATE contracts
SET contract_amount = 27950
WHERE id = '53c5144d-2edf-4ef1-9eff-6ef7536c2c4f';

-- Contract: LTO202494
-- Set contract amount to QAR 150,354 based on total paid
UPDATE contracts
SET contract_amount = 150354
WHERE id = '5d865671-8459-4b71-a15c-49aaae4730a2';

-- Contract: MR2024181
-- Set contract amount to QAR 75,669.94 based on total paid
UPDATE contracts
SET contract_amount = 75669.94
WHERE id = '807c0bff-c005-4039-af20-3ae89e76e05d';

-- Contract: MR2024232
-- Set contract amount to QAR 10,899.98 based on total paid
UPDATE contracts
SET contract_amount = 10899.98
WHERE id = '901ae14f-2d90-4128-8fd6-f8810fc43c37';

-- Contract: MR202476
-- Set contract amount to QAR 11,820 based on total paid
UPDATE contracts
SET contract_amount = 11820
WHERE id = 'f7e4b588-af25-45c3-a45d-4af58c0480b6';

-- Contract: Ret-2018212
-- Set contract amount to QAR 198,213 based on total paid
UPDATE contracts
SET contract_amount = 198213
WHERE id = '8539f784-4ee1-4667-b62d-3c2b70919fa3';

-- Contract: Ret-2018218
-- Set contract amount to QAR 14,400 based on total paid
UPDATE contracts
SET contract_amount = 14400
WHERE id = 'ee7a5173-680b-4f5a-8bdf-cbb219993cd0';

-- Contracts needing payment investigation
-- Contract: C-ALF-0001 - Overpayment: QAR 42,861
-- Contract: C-ALF-0068 - Overpayment: QAR 54,551
-- Contract: C-ALF-0083 - Overpayment: QAR 14,700

-- These contracts have suspicious payment amounts that need manual review
-- Run: npx tsx scripts/investigate-contract-payments.ts C-ALF-0001 C-ALF-0068 C-ALF-0083


-- ==========================================
-- Verification Query
-- ==========================================
SELECT
    contract_number,
    contract_amount,
    total_paid,
    balance_due,
    CASE
        WHEN contract_amount = 0 THEN 'ZERO_AMOUNT'
        WHEN total_paid > contract_amount THEN 'OVERPAID'
        ELSE 'OK'
    END AS status
FROM contracts
WHERE contract_number IN ('319', 'AGR-202504-424958', 'C-ALF-0001', 'C-ALF-0068', 'C-ALF-0077', 'C-ALF-0083', 'LTO2024100', 'LTO2024103', 'LTO2024104', 'LTO2024115', 'LTO2024124', 'LTO2024156', 'LTO2024248', 'LTO2024251', 'LTO2024261', 'LTO2024263', 'LTO202427', 'LTO2024270', 'LTO2024273', 'LTO2024285', 'LTO202429', 'LTO2024340', 'LTO202437', 'LTO202453', 'LTO202494', 'MR2024181', 'MR2024232', 'MR202476', 'Ret-2018212', 'Ret-2018218')
ORDER BY
    CASE
        WHEN contract_amount = 0 THEN 1
        WHEN total_paid > contract_amount THEN 2
        ELSE 3
    END,
    total_paid DESC;
