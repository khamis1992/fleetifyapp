# 🔧 Fix for PGRST200 Error: Missing Foreign Key Constraint

## Error Details
```
❌ Error fetching customer vehicles: {
  code: 'PGRST200',
  details: "Searched for a foreign key relationship between 'contracts' and 'vehicles' in the schema 'public', but no matches were found.",
  hint: "Perhaps you meant 'invoices' instead of 'vehicles'.",
  message: "Could not find a relationship between 'contracts' and 'vehicles' in the schema cache"
}
```

## Root Cause Analysis

According to Supabase/PostgREST documentation and our memory knowledge:

> **In Supabase/PostgREST, explicit foreign key constraints must be defined for table relationships to be recognized by the API layer. Missing foreign key constraints will result in 'Could not find a relationship' errors even if reference columns exist.**

### The Problem
1. The `contracts` table has a `vehicle_id` column
2. The `vehicles` table exists with an `id` primary key
3. **BUT**: No foreign key constraint links them in the database schema
4. PostgREST cannot find the relationship in its schema cache
5. Automatic joins fail with PGRST200 error

### Why the Two-Query Workaround Was Needed
The previous fix used a two-query approach because:
- It bypasses PostgREST's relationship system entirely
- Works without requiring database schema changes
- But it's less efficient and doesn't use PostgREST's built-in features

## The Proper Solution: Add Foreign Key Constraint

### Step 1: Apply the Migration

You have two options:

#### Option A: Using Supabase Dashboard (Recommended for Production)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open and run the file: [`add_contracts_vehicles_fk.sql`](file://c:\Users\khamis\Desktop\fleetifyapp-3\add_contracts_vehicles_fk.sql)
4. Verify success message: "Foreign key constraint contracts_vehicle_id_fkey added successfully"

#### Option B: Using Supabase CLI (Recommended for Development)
```bash
# Create a new migration
npx supabase migration new add_contracts_vehicles_fk

# Copy the SQL from add_contracts_vehicles_fk.sql to the new migration file

# Apply the migration
npx supabase db push
```

### Step 2: Verify the Constraint

Run this query in Supabase SQL Editor:
```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'contracts'
    AND kcu.column_name = 'vehicle_id';
```

**Expected Result:**
```
constraint_name             | table_name | column_name | foreign_table_name | foreign_column_name
----------------------------|------------|-------------|--------------------|--------------------- 
contracts_vehicle_id_fkey   | contracts  | vehicle_id  | vehicles           | id
```

### Step 3: Refresh PostgREST Schema Cache

The SQL script includes a NOTIFY command, but you can also manually refresh:

**In Supabase Dashboard:**
1. Go to **API** settings
2. Click **Restart API** or wait a few minutes for automatic cache refresh

**Or run this SQL:**
```sql
NOTIFY pgrst, 'reload schema';
```

## After Adding the Foreign Key

### Option 1: Use the Optimized Single-Query Approach (Recommended)

Once the foreign key is added, you can update the code to use PostgREST's automatic join:

```typescript
export const useCustomerVehicles = (customerId: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-vehicles', companyId, customerId],
    queryFn: async () => {
      if (!companyId || !customerId) {
        return [];
      }

      // Now this will work with the foreign key in place!
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          monthly_amount,
          start_date,
          end_date,
          status,
          vehicle_id,
          vehicles (
            id,
            plate_number,
            make,
            model,
            year,
            color_ar
          )
        `)
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .eq('status', 'active')
        .not('vehicle_id', 'is', null);

      if (error) {
        console.error('❌ Error fetching customer vehicles:', error);
        throw error;
      }

      // Transform to CustomerVehicle format
      const vehicles: CustomerVehicle[] = (data || [])
        .filter((contract: any) => contract.vehicles)
        .map((contract: any) => ({
          id: contract.vehicles.id,
          plate_number: contract.vehicles.plate_number || '',
          make: contract.vehicles.make || '',
          model: contract.vehicles.model || '',
          year: contract.vehicles.year,
          color_ar: contract.vehicles.color_ar,
          contract_id: contract.id,
          monthly_amount: contract.monthly_amount || 0,
          contract_start_date: contract.start_date,
          contract_end_date: contract.end_date,
          contract_status: contract.status
        }));

      return vehicles;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 60 * 1000, // 1 minute
  });
};
```

### Option 2: Keep the Two-Query Approach (Current)

The existing two-query approach will continue to work and doesn't require any database changes. It's perfectly valid and only slightly less efficient.

## Benefits of Adding the Foreign Key

### 1. **Database Integrity**
- Ensures referential integrity
- Prevents orphaned records
- Automatic cleanup with ON DELETE SET NULL

### 2. **PostgREST Performance**
- Single query instead of two
- Less network overhead
- Built-in optimization by PostgREST

### 3. **Developer Experience**
- Cleaner, more readable code
- Follows PostgREST best practices
- Better autocomplete in PostgREST

### 4. **Future Proofing**
- Other features can use the relationship
- Better query planning by PostgreSQL
- Easier to add more vehicle-related queries

## Migration Safety

The SQL script is designed to be safe:

✅ **Idempotent**: Can be run multiple times without errors
✅ **Non-Destructive**: Uses `ON DELETE SET NULL` instead of CASCADE
✅ **Backwards Compatible**: Existing code will continue to work
✅ **Verifiable**: Includes verification query
✅ **Documented**: Adds comment to the constraint

## Rollback (If Needed)

If you need to remove the constraint:
```sql
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_vehicle_id_fkey;
```

## Testing After Migration

1. **Hard refresh browser**: `Ctrl + Shift + R`
2. **Open Financial Tracking page**
3. **Select a customer with vehicles**
4. **Verify in console**: Should see NO PGRST200 errors
5. **Check network tab**: Should see successful vehicle queries

### Expected Console Output (Success)
```
✅ Customer vehicles loaded successfully
```

Instead of:
```
❌ Error fetching customer vehicles: {code: 'PGRST200', ...}
```

## Summary

| Aspect | Two-Query Approach (Current) | Foreign Key Approach (Recommended) |
|--------|------------------------------|-------------------------------------|
| **Queries** | 2 separate queries | 1 optimized query |
| **DB Changes** | None required | Requires FK constraint |
| **Performance** | Good (slight overhead) | Better (single query) |
| **Complexity** | More code | Cleaner code |
| **Safety** | Works immediately | Requires migration |
| **Best Practice** | Workaround | PostgREST standard |

## Next Steps

1. ✅ SQL migration file created: [`add_contracts_vehicles_fk.sql`](file://c:\Users\khamis\Desktop\fleetifyapp-3\add_contracts_vehicles_fk.sql)
2. ⏳ **YOU DO**: Apply the migration in Supabase Dashboard
3. ⏳ **YOU DO**: Verify the constraint was created
4. ⏳ **YOU DO**: Refresh PostgREST schema cache
5. ⏳ **YOU DO**: Hard refresh browser to clear old errors
6. ⏳ **OPTIONAL**: Update code to use single-query approach

---

**Remember**: The current two-query approach works fine. Adding the foreign key is an **optimization** and **best practice**, not a critical fix. Both approaches are valid.
