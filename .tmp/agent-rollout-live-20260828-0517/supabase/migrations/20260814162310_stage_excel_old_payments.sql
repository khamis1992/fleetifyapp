CREATE TABLE IF NOT EXISTS public._audit_excel_old_payments (
  txn integer PRIMARY KEY,
  plate text NOT NULL,
  amount numeric NOT NULL,
  pdate date NOT NULL
);
TRUNCATE public._audit_excel_old_payments;;
