# Task: Process Agreements - Arabic Names & Historical Invoices

## Objective
Process Excel file to create/update rental agreements with Arabic names, verify cancelled agreements data integrity, and generate historical invoices for replaced contracts.

**Business Impact:**
- Ensure all active agreements use Arabic names for better localization
- Complete data integrity for cancelled agreements
- Generate proper invoices for contract transitions to maintain financial accuracy

## Acceptance Criteria
- [ ] All cancelled agreements verified to have complete information
- [ ] Agreement details page displays all information for cancelled agreements
- [ ] Excel file processed successfully
- [ ] Agreements updated/created with Arabic names
- [ ] Historical invoices created for replaced contracts (monthly on 1st + 3000 SAR late fee)
- [ ] Build and typecheck pass after changes

## Scope & Impact Radius

### Modules/Files to be Created:
- `src/scripts/processAgreementsFromExcel.ts` - Script to process Excel file
- `src/scripts/generateHistoricalInvoices.ts` - Script to create historical invoices
- `tasks/agreements_processing_summary.md` - Execution summary

### Modules/Files to be Modified:
- Database: `contracts` table (status updates, new records)
- Database: `invoices` table (new historical invoices)
- Database: `customers` table (potential name updates)

### Database Tables Affected:
- `contracts` - Update cancelled to active, create new
- `customers` - Update Arabic names
- `invoices` - Create historical invoices
- `vehicles` - Reference for matching

### Out-of-Scope:
- UI changes (existing pages should work)
- Changing invoice calculation logic
- Modifying contract workflow

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Excel file format mismatch | High | Medium | Validate Excel structure first, provide clear error messages |
| Duplicate contracts created | High | Medium | Check by vehicle number before creating |
| Incorrect invoice amounts | Critical | Low | Validate calculation: monthly_amount + 3000 |
| Data loss during updates | Critical | Low | Use database transactions, create backup queries |
| Performance issues with bulk operations | Medium | Medium | Process in batches, use proper indexing |

## Implementation Steps

### Step 1: Verify Cancelled Agreements Data Integrity ✅

**Objective:** Ensure all cancelled agreements have complete information

**Tasks:**
- [ ] Query database for cancelled contracts
- [ ] Check for NULL/missing values in key fields
- [ ] Verify ContractDetailsDialog displays all cancelled contract info
- [ ] Create report of any incomplete records

**SQL Query:**
```sql
SELECT
    id,
    contract_number,
    customer_id,
    vehicle_id,
    status,
    monthly_amount,
    start_date,
    end_date,
    CASE
        WHEN customer_id IS NULL THEN 'Missing customer'
        WHEN vehicle_id IS NULL THEN 'Missing vehicle'
        WHEN monthly_amount IS NULL THEN 'Missing amount'
        WHEN start_date IS NULL THEN 'Missing start_date'
        ELSE 'Complete'
    END as data_status
FROM contracts
WHERE status = 'cancelled'
ORDER BY contract_date DESC;
```

### Step 2: Analyze Excel File Structure

**Objective:** Understand the Excel file columns and data

**Expected Columns:**
- Car Number/Vehicle Number (رقم السيارة)
- Customer Name (اسم العميل) - Arabic
- Monthly Rent Amount (الإيجار الشهري)
- Start Date (تاريخ البدء)
- End Date (تاريخ الانتهاء)
- Phone Number (رقم الجوال)
- National ID (رقم الهوية)

**Tasks:**
- [ ] Read Excel file headers
- [ ] Map Excel columns to database fields
- [ ] Validate data format (dates, numbers, Arabic text)

### Step 3: Process Excel File - Create/Update Agreements

**Objective:** For each row in Excel, create new agreement or update existing cancelled one

**Logic:**
```
FOR EACH row in Excel:
    1. Extract vehicle_number from Excel
    2. Query database for contracts with this vehicle_number
    3. IF exists cancelled contract with same vehicle:
        - Update status to 'active'
        - Update customer name to Arabic name from Excel
        - Update monthly_amount if different
        - Update start_date, end_date from Excel
        - Store old contract end_date for invoice generation
    4. ELSE:
        - Create new contract
        - Use Arabic name from Excel
        - Link to existing customer OR create new customer
    5. Track: (old_contract_id, new_start_date) for invoice generation
```

### Step 4: Generate Historical Invoices

**Objective:** Create monthly invoices for replaced contracts from old end date to new start date

**Invoice Calculation:**
- Invoice Date: 1st of each month
- Amount: monthly_amount + 3000 SAR (late fee - الغرامات المتأخرة)
- Period: From old contract end date to new contract start date
- Status: 'overdue' (since they're historical)

**Example:**
```
Old Contract End Date: 2024-06-30
New Contract Start Date: 2025-10-25

Invoices to Create:
- 2024-07-01: 5000 + 3000 = 8000 SAR
- 2024-08-01: 5000 + 3000 = 8000 SAR
- 2024-09-01: 5000 + 3000 = 8000 SAR
- 2024-10-01: 5000 + 3000 = 8000 SAR
(Current month not included as new contract starts)
```

**SQL Template:**
```sql
INSERT INTO invoices (
    company_id,
    customer_id,
    contract_id,
    invoice_number,
    invoice_date,
    due_date,
    total_amount,
    status,
    notes
) VALUES (
    :company_id,
    :customer_id,
    :old_contract_id,
    :invoice_number,
    :invoice_date,
    :due_date,
    :monthly_amount + 3000,
    'overdue',
    'فاتورة تاريخية - غرامة تأخير'
);
```

### Step 5: Verification & Testing

**Tasks:**
- [ ] Verify all Excel rows processed
- [ ] Check agreement details page shows complete info
- [ ] Verify Arabic names are correct
- [ ] Verify invoice count matches expected
- [ ] Verify invoice amounts are correct
- [ ] Test ContractDetailsDialog with cancelled contracts
- [ ] Test ContractDetailsDialog with new active contracts

## Data Validation Rules

### Excel Data Validation:
- Vehicle Number: Required, non-empty
- Customer Name (Arabic): Required, Arabic characters
- Monthly Amount: Required, > 0
- Start Date: Required, valid date format
- Phone: Optional, valid phone format
- National ID: Optional

### Database Validation:
- Contract must have customer_id (FK)
- Contract must have vehicle_id (FK)
- Monthly amount must be > 0
- Start date must be < End date
- Invoice amounts must match: monthly_amount + 3000

## Execution Plan

### Phase 1: Verification (Manual)
1. Run SQL query to check cancelled contracts data
2. Review ContractDetailsDialog component
3. Verify all fields are displayed

### Phase 2: Excel Processing (Script)
1. Create TypeScript script to read Excel
2. Process each row with validation
3. Update/Create contracts
4. Log all changes

### Phase 3: Invoice Generation (Script)
1. For each replaced contract
2. Calculate month range
3. Generate invoices
4. Link to old contract and customer

### Phase 4: Manual Verification
1. Check database counts
2. Verify Arabic names
3. Test UI displays
4. Verify invoice totals

## Rollback Plan

**If issues occur:**

1. **Backup Query (Run BEFORE execution):**
```sql
-- Backup contracts that will be modified
CREATE TABLE contracts_backup_20251025 AS
SELECT * FROM contracts
WHERE vehicle_id IN (
    SELECT DISTINCT vehicle_id FROM contracts WHERE status = 'cancelled'
);

-- Backup for rollback
CREATE TABLE invoices_backup_20251025 AS
SELECT * FROM invoices WHERE created_at >= '2025-10-25';
```

2. **Rollback Procedure:**
```sql
-- Restore modified contracts
UPDATE contracts c
SET
    status = b.status,
    customer_id = b.customer_id,
    monthly_amount = b.monthly_amount,
    updated_at = b.updated_at
FROM contracts_backup_20251025 b
WHERE c.id = b.id;

-- Delete newly created invoices
DELETE FROM invoices
WHERE id IN (
    SELECT id FROM invoices
    WHERE created_at >= '2025-10-25'
    AND notes LIKE '%فاتورة تاريخية%'
);
```

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cancelled contracts with complete data | 100% | SQL count query |
| Excel rows processed successfully | 100% | Script log |
| Active contracts with Arabic names | 100% | Database query |
| Historical invoices created | Expected count | Count by date range |
| Invoice amounts correct | 100% | Validation query |
| UI displays all contract info | Yes | Manual test |

## Testing Checklist

**Before Execution:**
- [ ] Backup database queries ready
- [ ] Excel file validated
- [ ] Script tested on sample data
- [ ] Connection to database verified

**After Execution:**
- [ ] Check contracts count: `SELECT status, COUNT(*) FROM contracts GROUP BY status`
- [ ] Check Arabic names: `SELECT id, customer_id FROM contracts WHERE status = 'active'`
- [ ] Check invoices created: `SELECT COUNT(*) FROM invoices WHERE notes LIKE '%فاتورة تاريخية%'`
- [ ] Test ContractDetailsDialog with cancelled contract
- [ ] Test ContractDetailsDialog with new active contract
- [ ] Verify invoice amounts include late fee (+ 3000)

## Security Considerations

- [ ] No secrets in script code
- [ ] Validate all Excel input data
- [ ] Use parameterized queries to prevent SQL injection
- [ ] Verify company_id isolation (multi-tenant)
- [ ] Audit log all changes
- [ ] Secure Excel file handling

## Expected Output

**Console Logs:**
```
Processing Excel file: بيانات_المركبات_نظيف.xlsx
Total rows: XXX

Processing row 1: Vehicle ABC123
- Found cancelled contract: contract-XXX
- Updating to active status
- Customer name updated to Arabic: محمد أحمد
- Historical invoices to create: 4 months
- Invoices created: 4

Processing row 2: Vehicle XYZ456
- No existing contract found
- Creating new contract
- Customer created: فاطمة علي
...

Summary:
- Contracts updated: XX
- Contracts created: XX
- Invoices created: XXX
- Total amount: XXX SAR
```

---

**Created:** 2025-10-25
**Status:** 📋 PLANNING - Ready to Execute
**Risk Level:** Medium-High (data updates + bulk operations)
**Estimated Duration:** 2-3 hours (including verification)
