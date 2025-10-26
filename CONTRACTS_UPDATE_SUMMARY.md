# Contract Update Summary - Al-Arraf Company

## 📋 Original Request
Update all contracts with status `under_review` to `cancelled` in Al-Arraf company.
- **Expected Count**: 409 contracts
- **Company ID**: `24bc0b21-4e2d-4413-9842-31719a3669f4`

---

## 🛠️ Solutions Created

### 1. Batch Update Script (Recommended) ✅
**File**: `update_contracts_batch.mjs`

**Features**:
- Updates 50 contracts per batch
- 2-second delay between batches
- Automatic progress tracking
- Error handling
- Final statistics

**Usage**:
```bash
node update_contracts_batch.mjs
```

### 2. SQL Batch Files

#### a) Single Batch (Run 5 times)
**File**: `.qoder/update_single_batch.sql`
- Updates 100 contracts per run
- Run 5 times to update all 409

#### b) Complete Batch Script
**File**: `.qoder/update_contracts_batched.sql`
- 5 pre-configured batches
- Copy and paste once in Supabase

#### c) Simple Update
**File**: `.qoder/update_contracts_simple.sql`
- Single update (may timeout with large numbers)

---

## ⚠️ Issues Encountered

### Issue 1: Timeout Error
```
Error: SQL query ran into an upstream timeout
```
**Cause**: Updating 409 contracts at once exceeded Supabase timeout limit  
**Solution**: Created batch update solutions (see above)

### Issue 2: RLS Access
```
0 contracts found with status 'under_review'
```
**Possible Causes**:
1. Row Level Security (RLS) blocking access
2. Contracts already updated
3. Different status value in database

---

## ✅ Recommended Approach

### Option A: Supabase Dashboard (Most Reliable)

1. Go to: https://supabase.com/dashboard
2. Open SQL Editor
3. Copy this query:

```sql
-- Check first
SELECT COUNT(*) FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'under_review';

-- If count > 0, run update in batches:
UPDATE contracts
SET status = 'cancelled', updated_at = NOW()
WHERE id IN (
    SELECT id FROM contracts 
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND status = 'under_review'
    LIMIT 100
);
```

4. Run the UPDATE query 5 times (once every 30 seconds)

### Option B: Browser Console (If logged in)

1. Login to the application
2. Press F12 → Console
3. Paste and run:

```javascript
const { supabase } = await import('/src/integrations/supabase/client.js');
const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';

// Check count
const { count } = await supabase
  .from('contracts')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', COMPANY_ID)
  .eq('status', 'under_review');

console.log('Contracts to update:', count);

// Update in batches
async function updateBatch() {
  const { data: ids } = await supabase
    .from('contracts')
    .select('id')
    .eq('company_id', COMPANY_ID)
    .eq('status', 'under_review')
    .limit(50);
  
  if (ids.length === 0) {
    console.log('✅ Done!');
    return;
  }
  
  const { error } = await supabase
    .from('contracts')
    .update({ status: 'cancelled' })
    .in('id', ids.map(c => c.id));
  
  console.log(`Updated ${ids.length} contracts`);
  
  // Wait 2 seconds, then run again
  setTimeout(updateBatch, 2000);
}

// Start if count > 0
if (count > 0) updateBatch();
```

---

## 📊 Verification Queries

### Check Status Distribution
```sql
SELECT status, COUNT(*) as count
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY count DESC;
```

### Check Recent Updates
```sql
SELECT COUNT(*) as recently_cancelled
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND status = 'cancelled'
  AND updated_at >= NOW() - INTERVAL '1 hour';
```

---

## 📁 All Created Files

1. `update_contracts_batch.mjs` - Node.js batch script
2. `.qoder/update_single_batch.sql` - Single batch SQL
3. `.qoder/update_contracts_batched.sql` - Full batch SQL
4. `.qoder/update_contracts_simple.sql` - Simple SQL
5. `.qoder/update_alaraf_contracts_to_cancelled.sql` - Advanced SQL
6. `check_alaraf_contracts.mjs` - Status checker
7. `update_alaraf_contracts.mjs` - Original script
8. `UPDATE_ALARAF_CONTRACTS_GUIDE.md` - Full guide
9. `UPDATE_CONTRACTS_SOLUTION.md` - Solutions doc
10. `BATCH_UPDATE_GUIDE.md` - Batch update guide
11. `CONTRACTS_UPDATE_SUMMARY.md` - This file

---

## ⏭️ Next Steps

1. **Choose a method** from Options A or B above
2. **Verify** the current count of contracts
3. **Execute** the update
4. **Confirm** the results
5. **Report back** with the outcome

---

**Status**: ⏳ Awaiting Execution  
**Last Updated**: 2025-10-26  
**Priority**: Medium
