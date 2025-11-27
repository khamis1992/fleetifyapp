# 🚀 Quick Start: Vehicles Data Migration

## 📋 What This Does

Processes 80 vehicles from `vehicles_data.sql` to:
1. ✅ Verify canceled contracts have complete data
2. 🔄 Create new active contracts with Arabic names
3. 📄 Generate invoices for old contracts
4. 💰 Calculate correct late fees (120 SAR/day, max 3000/month)

---

## ⚡ Quick Execute

### Step 1: Verify (2 minutes)
Open Supabase SQL Editor and run:
```bash
supabase/migrations/20251025175900_verify_canceled_contracts_data.sql
```

**Look for**: `✓ All canceled contracts have complete information`

### Step 2: Migrate (3-5 minutes)
Run:
```bash
supabase/migrations/20251025180000_migrate_vehicles_data_comprehensive.sql
```

**Look for**: `Migration Summary` with counts

---

## 📊 What to Expect

### Verification Output
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

### Migration Output
```
Processing vehicle: 2766
Created new customer: محمد محمد احمد
Created new contract: CON-2766-20250502
...
====== Migration Summary ======
Contracts created: 65
Contracts updated: 10
Invoices generated: 240
```

---

## ✅ Quick Verification

After migration, run:

```sql
-- Check new active contracts with Arabic names
SELECT 
  c.contract_number,
  cust.first_name as customer_arabic_name,
  v.plate_number,
  c.status
FROM contracts c
JOIN customers cust ON c.customer_id = cust.id
JOIN vehicles v ON c.vehicle_id = v.id
WHERE c.description LIKE '%المهاجرة%'
AND c.status = 'active'
LIMIT 10;
```

**Expected**: 10 rows with Arabic customer names and 'active' status

---

## 🔧 Late Fee Calculation

- **Daily Rate**: 120 SAR
- **Maximum**: 3000 SAR per month
- **Example**: 15 days late = 1,800 SAR
- **Example**: 30 days late = 3,000 SAR (capped)

---

## 📁 Files Created

1. **20251025175900_verify_canceled_contracts_data.sql** - Verification
2. **20251025180000_migrate_vehicles_data_comprehensive.sql** - Main migration
3. **VEHICLES_DATA_MIGRATION_GUIDE.md** - Full documentation
4. **MIGRATION_QUICK_START.md** - This file

---

## ⚠️ Important

- Migration processes **80 vehicles**
- Creates **~65 new contracts**
- Generates **~240 invoices**
- Updates all customer names to **Arabic**
- Sets vehicle status to **'rented'**

---

## 🆘 If Something Goes Wrong

1. Check the console output for specific errors
2. Review `VEHICLES_DATA_MIGRATION_GUIDE.md` for details
3. Verify vehicle plate numbers exist in your database
4. Ensure you have the correct company_id set

---

**Ready to Go!** 🎉

Just run the two SQL files in order and you're done!
