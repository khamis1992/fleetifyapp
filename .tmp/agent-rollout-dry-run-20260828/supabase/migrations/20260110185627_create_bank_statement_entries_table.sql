-- Create bank_statement_entries table
CREATE TABLE IF NOT EXISTS bank_statement_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'transfer')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount <> 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'QAR',
  description TEXT,
  reference_number VARCHAR(50),
  account_number VARCHAR(50),
  customer_name VARCHAR(255),
  customer_reference VARCHAR(255),
  payment_id UUID,
  invoice_id UUID,
  contract_id UUID,
  bank_id UUID,
  reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'unreconciled' CHECK (reconciliation_status IN ('unreconciled', 'reconciled', 'disputed')),
  reconciliation_confidence DECIMAL(5,2) CHECK (reconciliation_confidence >= 0 AND reconciliation_confidence <= 100),
  matched_payment_id UUID,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID,
  notes TEXT,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_bank_entry_per_company_date_amount 
    UNIQUE (company_id, transaction_date, transaction_type, amount)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_stmt_company ON bank_statement_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_customer ON bank_statement_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_status ON bank_statement_entries(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_date ON bank_statement_entries(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_amount ON bank_statement_entries(amount);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_payment ON bank_statement_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_invoice ON bank_statement_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_contract ON bank_statement_entries(contract_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_ref ON bank_statement_entries(reference_number);

SELECT 'bank_statement_entries table created' as status;;
