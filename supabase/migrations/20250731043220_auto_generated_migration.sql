-- Copy data from journal_entry_headers to journal_entries
INSERT INTO journal_entries (
  id,
  company_id,
  entry_number,
  entry_date,
  description,
  total_debit,
  total_credit,
  status,
  created_by,
  created_at,
  updated_at
)
SELECT 
  id,
  company_id,
  entry_number,
  entry_date,
  description,
  total_amount,
  total_amount,
  status,
  created_by,
  created_at,
  updated_at
FROM journal_entry_headers
WHERE NOT EXISTS (
  SELECT 1 FROM journal_entries 
  WHERE journal_entries.id = journal_entry_headers.id
);

-- Copy data from journal_entry_lines that reference headers to ones that reference journal_entries
INSERT INTO journal_entry_lines (
  id,
  journal_entry_id,
  account_id,
  line_description,
  debit_amount,
  credit_amount,
  cost_center_id
)
SELECT 
  gen_random_uuid() as id,
  header_id as journal_entry_id,
  account_id,
  description as line_description,
  debit_amount,
  credit_amount,
  cost_center_id
FROM journal_entry_lines jel
WHERE jel.header_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM journal_entry_lines existing 
  WHERE existing.journal_entry_id = jel.header_id 
  AND existing.account_id = jel.account_id
  AND existing.debit_amount = jel.debit_amount
  AND existing.credit_amount = jel.credit_amount
);