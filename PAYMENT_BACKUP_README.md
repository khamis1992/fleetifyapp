# Payment Backup - February 1-2, 2026

## 📋 Backup Summary

**Backup Date**: February 3, 2026  
**Cutoff Date**: February 1, 2026 00:26:10  
**Total Payments**: 9 payments  
**Total Amount**: 15,600 QAR  
**Company**: Al-Araf Car Rental (شركة العراف لتأجير السيارات)

---

## 📊 Payment Details

### By Customer:

1. **محمد فوأد شوشان** (Contract 319)
   - 5 payments
   - Total: 8,000 QAR
   - Phone: 55146823
   - Payments: PAY-1769938193638-1, PAY-1769938193638-2, PAY-1769938193638-3, PAY-1769938235554-1, PAY-1769938235554-2

2. **ياسين سرحان كمال بن عايد** (Contract LTO202459)
   - 1 payment
   - Total: 2,100 QAR
   - Phone: 71002048
   - Payment: PAY-1770017422608-1

3. **محمد عماد النعماني** (Contract C-ALF-0070)
   - 1 payment
   - Total: 1,600 QAR
   - Phone: 51230549
   - Payment: PAY-1770019130378-1

4. **عبد المنعم حسن حمدي** (Contract AGR-202504-400949)
   - 1 payment
   - Total: 1,500 QAR
   - Phone: 70184904
   - Payment: PAY-1770022626871-1

5. **مهدي حسني** (Contract C-ALF-0104)
   - 1 payment
   - Total: 2,100 QAR
   - Phone: 30180684
   - Payment: PAY-1770033849304-1

### By Date:
- **February 1, 2026**: 5 payments (8,000 QAR)
- **February 2, 2026**: 4 payments (7,600 QAR)

---

## 📁 Backup Files

### 1. `PAYMENT_BACKUP_2026-02-01.sql`
- **Format**: SQL INSERT statements
- **Usage**: Direct database restore
- **Features**: 
  - Uses `ON CONFLICT DO UPDATE` for safe restore
  - Includes all payment fields
  - Includes verification query
  - Can be run multiple times safely

### 2. `PAYMENT_BACKUP_2026-02-01.json`
- **Format**: JSON
- **Usage**: Human-readable reference
- **Features**:
  - Structured data with customer/contract/invoice info
  - Easy to review and verify
  - Can be used for manual data entry if needed

---

## 🔄 How to Restore Payments

### Option 1: Using SQL File (Recommended)

1. **After database restore**, connect to Supabase:
```bash
psql -h db.qwhunliohlkkahbspfiu.supabase.co -U postgres -d postgres
```

2. **Run the backup SQL file**:
```bash
\i PAYMENT_BACKUP_2026-02-01.sql
```

3. **Verify restoration**:
```sql
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
```

**Expected Result**: 9 payments, 15,600 QAR

### Option 2: Using Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `PAYMENT_BACKUP_2026-02-01.sql`
3. Paste and run
4. Verify using the verification query

### Option 3: Using Supabase CLI

```bash
supabase db execute --file PAYMENT_BACKUP_2026-02-01.sql
```

---

## ✅ Verification Checklist

After restoring, verify:

- [ ] All 9 payments exist in the database
- [ ] Total amount is 15,600 QAR
- [ ] All invoices are properly linked
- [ ] Payment statuses are 'completed'
- [ ] Customer balances are correct
- [ ] Invoice `paid_amount` fields are updated

### Verification Queries:

```sql
-- 1. Check payment count and total
SELECT COUNT(*), SUM(amount) FROM payments 
WHERE created_at > '2026-02-01 00:26:10';
-- Expected: 9 payments, 15,600 QAR

-- 2. Check invoice updates
SELECT 
  i.invoice_number,
  i.total_amount,
  i.paid_amount,
  i.payment_status
FROM invoices i
WHERE i.id IN (
  '748c9afb-23b3-42e8-9985-48ebfee3f06c',
  '4f32967a-7156-4f3f-9baf-64c161d1a768',
  '3231a65f-df48-458c-9c31-c6434b8ad782',
  'a2b283d3-447e-458c-8122-8126036a4999',
  '05da3547-fd4c-45f4-83e9-0f36e6819bd3',
  'b0a5dd31-0892-46ca-9367-b1df7131f091',
  '87613ff1-83bb-4f33-a3b0-521050629f1f',
  'a6521b36-07ca-4b6f-b8ac-7c9d4d179c3d',
  '69be0975-b068-4041-8488-7abc8800abeb'
);

-- 3. Check customer balances
SELECT 
  c.first_name,
  c.last_name,
  COUNT(p.id) as payment_count,
  SUM(p.amount) as total_paid
FROM customers c
JOIN payments p ON p.customer_id = c.id
WHERE p.created_at > '2026-02-01 00:26:10'
GROUP BY c.id, c.first_name, c.last_name;
```

---

## ⚠️ Important Notes

1. **Idempotency**: The SQL script uses `ON CONFLICT DO UPDATE`, so it's safe to run multiple times
2. **Invoice Updates**: After restoring payments, you may need to manually update invoice `paid_amount` and `payment_status` fields
3. **Journal Entries**: All payments have `journal_entry_id = NULL`, so no journal entries need to be restored
4. **Timestamps**: Original `created_at` and `updated_at` timestamps are preserved
5. **User ID**: All payments were created by user `05e2b94f-80a4-45ee-927f-60dafe81a1af`

---

## 🔍 Additional Information

### Payment Method Distribution:
- Cash: 9 payments (100%)

### Payment Status:
- Completed: 9 payments (100%)

### Date Range:
- First Payment: 2026-02-01 09:29:53
- Last Payment: 2026-02-02 12:04:09

---

## 📞 Support

If you encounter any issues during restoration:
1. Check that all referenced customers, contracts, and invoices exist
2. Verify company_id matches your database
3. Check that user_id (created_by) exists
4. Review error messages for foreign key violations

---

## 🎯 Quick Restore Command

```bash
# Using Supabase CLI
cd c:\Users\khamis\Desktop\fleetifyapp
supabase db execute --file PAYMENT_BACKUP_2026-02-01.sql

# Or using psql
psql -h db.qwhunliohlkkahbspfiu.supabase.co -U postgres -d postgres -f PAYMENT_BACKUP_2026-02-01.sql
```

---

**Backup Created**: February 3, 2026  
**Status**: ✅ Ready for Restore
