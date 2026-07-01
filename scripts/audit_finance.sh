#!/bin/bash
cd /c/Users/khamis/Documents/fleetifyapp
SRK=$(grep VITE_SUPABASE_SERVICE_ROLE_KEY .env | cut -d'"' -f2)
CID="24bc0b21-4e2d-4413-9842-31719a3669f4"
BASE="https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
AUTH="apikey: $SRK"
BAUTH="Authorization: Bearer $SRK"

# 1. Journal entries
curl -s "$BASE/journal_entries?select=id,entry_number,total_debit,total_credit,status&company_id=eq.$CID&limit=1000" -H "$AUTH" -H "$BAUTH" > /tmp/je.json

# 2. Journal entry lines (check debit=credit per entry)
curl -s "$BASE/journal_entry_lines?select=id,journal_entry_id,debit_amount,credit_amount,line_number&limit=5000" -H "$AUTH" -H "$BAUTH" > /tmp/jel.json

# 3. Chart of accounts
curl -s "$BASE/chart_of_accounts?select=id,account_code,account_name,account_type,balance_type,is_active,is_header,account_level,current_balance,parent_account_id&company_id=eq.$CID&limit=500" -H "$AUTH" -H "$BAUTH" > /tmp/coa.json

# 4. Payments
curl -s "$BASE/payments?select=id,amount,payment_status,payment_date,invoice_id,contract_id,journal_entry_id,transaction_type&company_id=eq.$CID&limit=100" -H "$AUTH" -H "$BAUTH" > /tmp/pay.json

# 5. Invoices
curl -s "$BASE/invoices?select=id,invoice_number,total_amount,paid_amount,balance_due,payment_status,status,journal_entry_id,invoice_type&company_id=eq.$CID&limit=100" -H "$AUTH" -H "$BAUTH" > /tmp/inv.json

# 6. Accounting periods
curl -s "$BASE/accounting_periods?select=id,period_name,start_date,end_date,status&company_id=eq.$CID&limit=50" -H "$AUTH" -H "$BAUTH" > /tmp/periods.json

# 7. Audit trail count
curl -s "$BASE/audit_trail?select=id&company_id=eq.$CID&limit=1" -H "$AUTH" -H "$BAUTH" -H "Prefer: count=exact" -D /tmp/audit_hdr.json > /dev/null

# 8. Bank transactions
curl -s "$BASE/bank_transactions?select=id,amount,transaction_type,reconciliation_status&company_id=eq.$CID&limit=50" -H "$AUTH" -H "$BAUTH" > /tmp/bt.json

# 9. Deposits
curl -s "$BASE/customer_deposits?select=id,amount,status&company_id=eq.$CID&limit=50" -H "$AUTH" -H "$BAUTH" > /tmp/dep.json

# 10. Budgets
curl -s "$BASE/budgets?select=id,budget_name,total_amount,status&company_id=eq.$CID&limit=20" -H "$AUTH" -H "$BAUTH" > /tmp/bud.json

echo "Data fetched. Run audit_analysis.py next."