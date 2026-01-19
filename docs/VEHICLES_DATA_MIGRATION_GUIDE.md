# 🚗 Vehicles Data Migration Guide

## 📋 Overview

This migration handles comprehensive contract management based on the vehicles data SQL file. It covers:

1. ✅ **Verification** - Ensuring canceled contracts have complete information
2. 🔄 **Contract Updates** - Creating/updating agreements with Arabic names
3. 📄 **Invoice Generation** - Auto-generating invoices for old contracts
4. 💰 **Payment Adjustment** - Correct late fees calculation (120 SAR/day, max 3000/month)

---

## 🎯 Migration Tasks

### Task 1: Verify Canceled Contracts Data

**Purpose**: Ensure all canceled contracts have complete information for viewing

**Migration File**: `20251025175900_verify_canceled_contracts_data.sql`

**What it does**:
- Checks all canceled contracts for missing data:
  - ❌ Missing customer information
  - ❌ Missing vehicle information
  - ❌ Missing dates (start/end)
  - ❌ Missing amounts (monthly/total)
- Creates a detailed view `canceled_contracts_details` for easy review
- Provides summary statistics

**Usage**:
```sql
-- View all canceled contracts with completeness check
SELECT * FROM canceled_contracts_details;

-- Quick summary
SELECT 
  COUNT(*) as total_canceled,
  SUM(CASE WHEN customer_check LIKE '%Missing%' THEN 1 ELSE 0 END) as issues
FROM canceled_contracts_details;
```

---

### Task 2: Comprehensive Migration

**Purpose**: Process all vehicles data and create/update agreements

**Migration File**: `20251025180000_migrate_vehicles_data_comprehensive.sql`

#### What it does:

**A. Find or Create Customers**
- Searches for existing customers by phone number
- Creates new customers if not found
- Updates customer names to Arabic versions from the data file

**B. Process Contracts by Vehicle**

For each vehicle:

1. **If NO existing contract** → Create new active contract

2. **If CANCELED/EXPIRED contract exists**:
   - Generate monthly invoices for old contract (from start date to new contract start date)
   - Each invoice is for the 1st of the month
   - Default late fee: 3000 SAR (assuming unpaid)
   - Create new active contract with:
     - Status: `active`
     - Customer: Arabic name from data file
     - Monthly amount from data file
     - 12-month duration

3. **If ACTIVE contract exists**:
   - Keep existing contract
   - Update customer name if different

**C. Invoice Generation Logic**

For old contracts being replaced:
```sql
-- Example: Old contract from 2024-01-01, new contract starts 2025-01-01
-- Generates invoices for:
-- 2024-01-01, 2024-02-01, 2024-03-01, ..., 2024-12-01
-- Each invoice = monthly_amount + 3000 late fee
```

**D. Payment Matching**

For each payment found in the system:
1. Find matching unpaid invoice (earliest invoice on or before payment date)
2. Calculate correct late fee:
   - 120 SAR per day after the 1st
   - Maximum 3000 SAR per month
3. Mark invoice as paid
4. Update late fee to correct amount

---

## 💰 Late Fee Calculation

### Formula

```javascript
lateFee = Math.min(daysLate * 120, 3000)

Where:
- daysLate = paymentDate - dueDate (1st of month)
- Daily rate = 120 SAR
- Maximum per month = 3000 SAR
```

### Examples

| Due Date | Payment Date | Days Late | Calculation | Late Fee |
|----------|--------------|-----------|-------------|----------|
| 2025-01-01 | 2025-01-01 | 0 | - | 0 SAR |
| 2025-01-01 | 2025-01-05 | 4 | 4 × 120 | 480 SAR |
| 2025-01-01 | 2025-01-15 | 14 | 14 × 120 | 1,680 SAR |
| 2025-01-01 | 2025-01-31 | 30 | min(30 × 120, 3000) | 3,000 SAR |
| 2025-01-01 | 2025-02-15 | 45 | min(45 × 120, 3000) | 3,000 SAR (capped) |

---

## 📊 Data Processed

### Vehicles Count: **80 vehicles**

### Sample Data:
```
Vehicle 2766: محمد محمد احمد (70007983) - 1600 SAR/month
Vehicle 2767: عبد الغفور دوار (77122519) - 1500 SAR/month
Vehicle 7034: محمد احمد عمر متعافي (50225055) - 1600 SAR/month
... (and 77 more)
```

---

## 🚀 How to Run

### Step 1: Verify Current State
```bash
# Connect to Supabase SQL Editor
# Run the verification migration first
```

Run: `20251025175900_verify_canceled_contracts_data.sql`

**Expected Output**:
```
====== Canceled Contracts Verification ======
Total canceled contracts: XX
✓ All canceled contracts have customer information
✓ All canceled contracts have vehicle information
✓ All canceled contracts have date information
✓ All canceled contracts have amount information

====== Summary ======
Total Issues Found: 0
✓ All canceled contracts have complete information
```

### Step 2: Run Main Migration
```bash
# Run the comprehensive migration
```

Run: `20251025180000_migrate_vehicles_data_comprehensive.sql`

**Expected Output**:
```
Processing vehicle: 2766
Created new customer: محمد محمد احمد
Created new contract: CON-2766-20250502
...
Processing vehicle: 8213
Updated customer name to: يحي هلال الصغري
Generating invoices for old contract...
Generated 12 invoices for contract CON-...
Marked invoice as paid with late fee: 840

====== Migration Summary ======
Contracts created: 65
Contracts updated: 10
Invoices generated: 240
===============================
```

---

## 🔍 Post-Migration Verification

### 1. Check Canceled Contracts
```sql
-- View all canceled contracts details
SELECT * FROM canceled_contracts_details
LIMIT 10;

-- Should show all fields populated with ✓ marks
```

### 2. Check New Active Contracts
```sql
SELECT 
  c.contract_number,
  CASE 
    WHEN cust.customer_type = 'individual' 
    THEN cust.first_name 
    ELSE cust.company_name 
  END as customer_name,
  v.plate_number,
  c.monthly_amount,
  c.start_date,
  c.status
FROM contracts c
JOIN customers cust ON c.customer_id = cust.id
JOIN vehicles v ON c.vehicle_id = v.id
WHERE c.status = 'active'
AND c.description LIKE '%المهاجرة%'
ORDER BY c.created_at DESC
LIMIT 20;
```

### 3. Check Generated Invoices
```sql
SELECT 
  i.invoice_number,
  i.invoice_date,
  i.subtotal as rent_amount,
  i.late_fee_amount,
  i.total_amount,
  i.status,
  c.contract_number
FROM invoices i
JOIN contracts c ON i.contract_id = c.id
WHERE c.description LIKE '%المهاجرة%'
ORDER BY i.invoice_date DESC
LIMIT 20;
```

### 4. Check Payment Matching
```sql
SELECT 
  i.invoice_number,
  i.invoice_date,
  i.late_fee_amount,
  p.payment_date,
  p.amount,
  EXTRACT(DAY FROM (p.payment_date::DATE - i.invoice_date)) as days_late
FROM invoices i
JOIN payments p ON i.customer_id = p.customer_id
WHERE i.status = 'paid'
AND i.late_fee_amount > 0
ORDER BY i.invoice_date DESC
LIMIT 20;
```

---

## ⚠️ Important Notes

### 1. **Company ID**
The migration uses the first company in the database. If you have multiple companies, update the migration to target the correct company:

```sql
-- Change this line in the migration:
SELECT id INTO v_company_id FROM companies LIMIT 1;

-- To this (with your company ID):
v_company_id := 'your-company-uuid-here';
```

### 2. **Contract Duration**
All new contracts are created with 12-month duration. Adjust if needed:

```sql
v_end_date := v_vehicle_record.contract_start_date + INTERVAL '12 months';
-- Change to: + INTERVAL '24 months' for 2 years
```

### 3. **Late Fee Rates**
Current settings:
- Daily rate: **120 SAR**
- Monthly cap: **3000 SAR**

To change, modify the `calculate_late_fee()` function:

```sql
calculated_fee := LEAST(days_late * 120, 3000);
-- Change to: LEAST(days_late * 150, 4000) for 150/day, max 4000
```

### 4. **Invoice Generation**
Invoices are generated on the 1st of each month. The system:
- Checks if invoice already exists (prevents duplicates)
- Creates invoice with due date = 1st of month
- Adds 3000 SAR late fee for unpaid invoices
- Adjusts late fee when payment is matched

---

## 🔧 Troubleshooting

### Issue 1: Vehicle Not Found
```
WARNING: Vehicle with plate 2766 not found, skipping
```

**Solution**: Ensure all vehicles from the SQL file exist in your database first.

### Issue 2: Different Customer for Active Contract
```
WARNING: Active contract exists with different customer for vehicle 2766
```

**Solution**: Manually review the contract and decide whether to:
- Keep existing contract
- Cancel and create new one
- Transfer contract to new customer

### Issue 3: Invoice Already Exists
The system automatically skips duplicate invoices. This is normal behavior.

### Issue 4: Payment Not Matched
If payments exist but aren't matching invoices:
- Check payment dates are within contract period
- Verify customer_id matches
- Ensure invoices exist for the payment period

---

## 📝 Database Schema Updates

### New View Created
```sql
canceled_contracts_details
-- Shows all canceled contracts with completeness checks
```

### Temporary Functions (Auto-Cleaned)
```sql
calculate_late_fee(due_date, payment_date)
-- Returns late fee based on 120/day, max 3000

generate_monthly_invoices_for_contract(...)
-- Generates monthly invoices for a contract period
```

These functions are automatically dropped after migration completes.

---

## 📈 Expected Results

### Contracts
- **Created**: ~65 new active contracts
- **Updated**: ~10 existing contracts (name updates)
- **Status**: All vehicles should have active rental status

### Invoices
- **Generated**: ~240 invoices (for old contracts)
- **Status**: Mix of paid/unpaid based on payment matching
- **Late Fees**: Correctly calculated based on payment dates

### Customers
- **Names**: All updated to Arabic versions
- **Phone**: Matched correctly with existing data

### Vehicles
- **Status**: Updated to 'rented' for active contracts

---

## ✅ Success Criteria

Migration is successful when:

1. ✓ All canceled contracts have complete information (customer, vehicle, dates, amounts)
2. ✓ All 80 vehicles from SQL file are processed
3. ✓ New active contracts created with Arabic customer names
4. ✓ Invoices generated for old contracts up to new contract start date
5. ✓ Payments matched with correct late fees (120/day, max 3000)
6. ✓ Vehicle statuses updated to 'rented'
7. ✓ No duplicate contracts or invoices created

---

## 🆘 Support

If you encounter issues:

1. **Check Migration Logs** - Review NOTICE/WARNING messages
2. **Verify Data** - Run the verification queries above
3. **Review Canceled Contracts View** - Check `canceled_contracts_details`
4. **Manual Fixes** - Address any specific data issues found
5. **Re-run if Needed** - The migration is idempotent for most operations

---

## 📅 Migration Timeline

- **Created**: 2025-10-25
- **Version**: 20251025180000
- **Status**: Ready for execution
- **Estimated Time**: 2-5 minutes for 80 vehicles

---

**✨ Migration Complete!**

After successful execution, all active agreements will have Arabic names, old contracts will have proper invoices, and late fees will be correctly calculated.
