# Payment Schedule Generation Scripts

This directory contains scripts to generate missing payment schedules for contract invoices.

## Problem Statement

Contract invoices were created without corresponding payment schedule records. This causes issues with:
- Payment tracking and reconciliation
- Reporting on payment status
- Automatic invoice generation from payment schedules
- Customer account statements

## Solution

Two approaches are provided:

1. **SQL Migration/Function** (Recommended) - Database-side logic
2. **TypeScript Script** - Node.js script that can be run from command line

---

## Option 1: SQL Functions (Recommended)

### File: `supabase/migrations/20260110000000_generate_payment_schedules_from_invoices.sql`

This migration creates three database functions:

### 1. `get_missing_payment_schedules_summary()`

View which contracts are missing payment schedules.

```sql
SELECT * FROM get_missing_payment_schedules_summary();
```

Returns:
- contract_id
- contract_number
- invoice_count
- schedule_count
- missing_schedules
- total_invoice_amount
- first_invoice_date
- last_invoice_date

### 2. `generate_payment_schedules_for_contract(contract_id, dry_run)`

Generate payment schedules for a specific contract.

```sql
-- Preview (dry run) - shows what would be created
SELECT generate_payment_schedules_for_contract(
    'contract-uuid-here',
    true  -- dry run
);

-- Actually create the payment schedules
SELECT generate_payment_schedules_for_contract('contract-uuid-here');
```

### 3. `generate_payment_schedules_all_contracts(dry_run, contract_type, status)`

Generate payment schedules for all contracts.

```sql
-- Preview for all active contracts
SELECT generate_payment_schedules_all_contracts(true);

-- Generate for all active contracts
SELECT generate_payment_schedules_all_contracts();

-- Generate only for rental contracts
SELECT generate_payment_schedules_all_contracts(false, 'rental');
```

---

## Option 2: TypeScript Script

### File: `scripts/generate-payment-schedules-from-invoices.ts`

### Installation

The script requires `ts-node` to run TypeScript directly:

```bash
npm install -D ts-node @types/node
```

### Usage

```bash
# For a specific contract by number (e.g., C-ALF-0085)
npx ts-node scripts/generate-payment-schedules-from-invoices.ts --contract-number C-ALF-0085

# For a specific contract by ID
npx ts-node scripts/generate-payment-schedules-from-invoices.ts --contract-id <uuid>

# For all contracts
npx ts-node scripts/generate-payment-schedules-from-invoices.ts --all-contracts

# Dry run to preview changes
npx ts-node scripts/generate-payment-schedules-from-invoices.ts --all-contracts --dry-run

# Verbose output
npx ts-node scripts/generate-payment-schedules-from-invoices.ts --contract-number C-ALF-0085 --verbose

# Help
npx ts-node scripts/generate-payment-schedules-from-invoices.ts --help
```

### Environment Variables

The script uses the Supabase connection from environment variables or falls back to defaults:

```bash
# Optional: Override default Supabase URL
export SUPABASE_URL="https://your-project.supabase.co"

# Required: Service role key (not anon key)
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

---

## Quick Start Guide for Contract C-ALF-0085

### Step 1: Check the current situation

```sql
-- Check invoices for this contract
SELECT
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.payment_status,
    cps.id AS schedule_id
FROM invoices i
LEFT JOIN contract_payment_schedules cps ON cps.invoice_id = i.id
WHERE i.contract_id = (SELECT id FROM contracts WHERE contract_number = 'C-ALF-0085')
ORDER BY i.invoice_date;
```

### Step 2: Preview what will be created (dry run)

```sql
SELECT generate_payment_schedules_for_contract(
    (SELECT id FROM contracts WHERE contract_number = 'C-ALF-0085'),
    true  -- dry run
);
```

### Step 3: Generate the payment schedules

```sql
SELECT generate_payment_schedules_for_contract(
    (SELECT id FROM contracts WHERE contract_number = 'C-ALF-0085')
);
```

### Step 4: Verify the results

```sql
-- Check payment schedules were created
SELECT
    cps.id,
    cps.installment_number,
    cps.amount,
    cps.due_date,
    cps.status,
    cps.invoice_id,
    i.invoice_number
FROM contract_payment_schedules cps
INNER JOIN invoices i ON i.id = cps.invoice_id
WHERE cps.contract_id = (SELECT id FROM contracts WHERE contract_number = 'C-ALF-0085')
ORDER BY cps.installment_number;
```

---

## How Payment Schedules Are Generated

The generation logic follows these rules:

1. **One schedule per invoice** - Each invoice gets exactly one payment schedule
2. **Idempotent** - Running multiple times won't create duplicates
3. **Installment number** - Calculated from months since contract start date
4. **Status** - Based on invoice payment status:
   - `paid` invoices -> `paid` status
   - `partially_paid` invoices -> `partially_paid` status
   - Overdue invoices -> `overdue` status
   - Others -> `pending` status
5. **Due date** - Uses invoice's due_date, or invoice_date, or contract start date
6. **Amount** - Uses the invoice's total_amount
7. **Description** - Auto-generated in format: "Installment N - YYYY-MM (Invoice#)"

---

## Rollback

If you need to remove auto-generated payment schedules:

```sql
-- Remove schedules generated for a specific contract
DELETE FROM contract_payment_schedules
WHERE contract_id = 'contract-uuid-here'
AND notes LIKE 'Auto-generated from invoice%';

-- Or remove all auto-generated schedules
DELETE FROM contract_payment_schedules
WHERE notes LIKE 'Auto-generated from invoice%';
```

---

## Safety Features

- **Idempotent**: Can be run multiple times without creating duplicates
- **Validation**: Skips invalid invoices (zero amount, no contract, already paid)
- **Dry Run**: Preview changes before applying them
- **Error Handling**: Continues processing even if individual records fail
- **Logging**: Detailed output of what was created and what was skipped

---

## Troubleshooting

### Issue: "Contract not found"
- Verify the contract number or ID is correct
- Check you're querying the correct company_id

### Issue: "No payment schedules created"
- Check if invoices already have payment schedules (via invoice_id link)
- Verify invoice total_amount is > 0
- Check if invoices are already paid (they may be skipped)

### Issue: "Permission denied"
- For SQL functions: Ensure RLS policies allow access
- For TypeScript script: Use service_role_key, not anon key

### Issue: "Installment numbers are wrong"
- The script calculates based on invoice_date vs contract start_date
- You may need to manually adjust installment_number after generation

---

## Related Files

- Database Schema: `src/integrations/supabase/types.ts`
- Payment Schedule Hook: `src/hooks/usePaymentSchedules.ts`
- Contract Operations: `src/hooks/business/useContractOperations.ts`
- Contract Calculations: `src/lib/contract-calculations.ts`
