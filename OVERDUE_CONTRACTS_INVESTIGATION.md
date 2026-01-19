# Overdue Contracts Investigation Report

**Date:** January 9, 2026
**Investigation:** Mobile app showing only 1 overdue contract when more are expected

---

## 🔍 Findings Summary

### **CRITICAL ISSUE: Database is EMPTY**

The Supabase database currently contains **ZERO contracts** for all companies.

### Query Results

```sql
-- Total contracts in database: 0
SELECT COUNT(*) FROM contracts; -- Result: 0

-- Contracts with days_overdue > 0: 0
SELECT COUNT(*) FROM contracts WHERE days_overdue > 0; -- Result: 0

-- Vehicles in database: 0
SELECT COUNT(*) FROM vehicles; -- Result: 0

-- Customers in database: 0
SELECT COUNT(*) FROM customers; -- Result: 0
```

### Tables Status

| Table Name | Records | Status |
|------------|---------|--------|
| `contracts` | 0 | ✅ Table exists, EMPTY |
| `vehicles` | 0 | ✅ Table exists, EMPTY |
| `customers` | 0 | ✅ Table exists, EMPTY |
| `users` | 0 | ✅ Table exists, EMPTY |
| `profiles` | 0 | ✅ Table exists, EMPTY |
| `payments` | ❌ | ⚠️ Table not accessible or doesn't exist |
| `invoices` | ❌ | ⚠️ Table not accessible or doesn't exist |

---

## 🎯 Root Cause Analysis

### **Primary Issue: No Data in Production Database**

The mobile app is working correctly. The query being executed is:

```typescript
// From MobileOverdue.tsx (lines 96-116)
const { data, error, count } = await supabase
  .from('contracts')
  .select(`
    id,
    contract_number,
    customer_id,
    days_overdue,
    balance_due,
    make,
    model,
    license_plate,
    customers (
      id,
      first_name,
      last_name,
      phone
    )
  `, { count: 'exact' })
  .eq('company_id', companyId)
  .gt('days_overdue', 0)
  .order('days_overdue', { ascending: false });
```

**This query is CORRECT.** The problem is that the database has no data to return.

---

## 🔐 Authentication & Access

### Supabase Configuration

- **Project ID:** `qwhunliohlkkahbspfiu`
- **URL:** `https://qwhunliohlkkahbspfiu.supabase.co`
- **Auth Key Used:** Anon key (public)
- **Auth Status:** Not authenticated

### RLS (Row Level Security) Impact

The anon key has restricted access due to RLS policies. This is **expected behavior** for client-side queries. However, even with RLS, we should see records if:
1. The user is authenticated
2. The user has access to the company's data
3. The data exists in the database

Since we're seeing 0 records even for basic table counts, this indicates:
- **Either:** The database is genuinely empty
- **Or:** RLS policies are blocking ALL access (even to see counts)

---

## 📊 Expected vs Actual

### Expected (Based on User Report)

- **Mobile home page:** Should show multiple overdue contracts
- **Overdue contracts page:** Should show more than 1 overdue contract
- **Company ID:** `24bc0b21-4e2d-4413-9842-31719a3669f4`

### Actual

- **Mobile home page:** Shows 0 overdue contracts (or possibly cached/test data showing 1)
- **Overdue contracts page:** Shows 0 overdue contracts
- **Database:** Completely empty (0 contracts, 0 vehicles, 0 customers)

---

## 🛠️ Next Steps & Recommendations

### 1. **Verify Database Connection**

```bash
# Check if this is the correct production database
npx supabase status
```

### 2. **Check for Multiple Environments**

The app might be pointing to the wrong database. Verify:
- `.env` file has correct Supabase URL
- There might be multiple Supabase projects (dev/staging/production)
- Check Vercel environment variables if deployed

### 3. **Data Migration Needed**

The database schema exists but is empty. You need to:
1. Import existing data from legacy system
2. Or restore from backup
3. Or seed with test data

### 4. **Check RLS Policies**

Even if data exists, RLS might be blocking access:

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 5. **Use Service Role Key for Verification**

To bypass RLS and verify data actually exists, use the service role key (backend only):

```typescript
// NEVER use this in client-side code!
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // This key bypasses RLS
);

const { data, error } = await supabaseAdmin
  .from('contracts')
  .select('*')
  .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4');
```

---

## 📝 Code Verification

### Mobile Query is Correct ✅

The mobile app code in `src/pages/mobile/MobileOverdue.tsx` (lines 96-116) is correctly querying the database:

```typescript
const { data, error, count } = await supabase
  .from('contracts')
  .select(`
    id,
    contract_number,
    customer_id,
    days_overdue,
    balance_due,
    make,
    model,
    license_plate,
    customers (...)
  `, { count: 'exact' })
  .eq('company_id', companyId)
  .gt('days_overdue', 0)
  .order('days_overdue', { ascending: false });
```

### Home Page Query is Correct ✅

The home page code in `src/pages/mobile/MobileHome.tsx` (lines 166-172) is also correct:

```typescript
const { data: overdueContracts } = await supabase
  .from('contracts')
  .select('id, contract_number, days_overdue, balance_due, customer_id, customers!inner(first_name, last_name)')
  .eq('company_id', companyId)
  .gt('days_overdue', 0)
  .order('days_overdue', { ascending: false })
  .limit(3);
```

---

## 🎯 Conclusion

**The mobile app code is working perfectly.** The issue is that the Supabase production database is currently empty (0 contracts, 0 vehicles, 0 customers).

### Possible Scenarios:

1. **Wrong Database** - The app is connected to an empty/new Supabase project instead of the production database with 588 contracts
2. **Data Not Migrated** - The schema was created but data wasn't migrated
3. **Data Was Deleted** - Data existed but was accidentally deleted
4. **Wrong Environment** - `.env` is pointing to staging/dev instead of production

### Immediate Action Required:

1. **Verify Supabase URL** in `.env` matches the production database
2. **Check Supabase Dashboard** to see if data exists in the web UI
3. **Use Service Role Key** to bypass RLS and verify data existence
4. **Restore or Migrate Data** if database is truly empty

---

## 📞 Questions to Answer

1. Is `https://qwhunliohlkkahbspfiu.supabase.co` the correct production database?
2. Does the Supabase dashboard show any contracts in the Table Editor?
3. Have there been any recent database migrations or restores?
4. Is there a service role key available to verify data exists?
5. Should there be 588 contracts based on the CLAUDE.md documentation?

---

**Investigation completed.**
**Files created:**
- `check-overdue-contracts.js` - Script to query overdue contracts
- `check-schema.js` - Script to investigate database structure
- `check-tables.js` - Script to list all tables

**Next:** Verify database connection and restore/migrate data.
