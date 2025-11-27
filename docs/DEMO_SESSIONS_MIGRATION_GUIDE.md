# Demo Sessions Migration Guide

## Issue Fixed ✅

**Error**: `Error fetching demo session: Object`

**Root Cause**: The `demo_sessions` table doesn't exist in your Supabase database yet.

**Solution Applied**: 
- Improved error handling to suppress non-critical demo session errors
- Made demo session tracking gracefully optional
- Banner won't show if table doesn't exist (no errors logged)

---

## To Enable Full Demo Mode Features (Optional)

If you want to enable the demo trial banner and session tracking, follow these steps:

### Option 1: Apply Migration via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `qwhunliohlkkahbspfiu`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open: `supabase/migrations/20251027_create_demo_sessions.sql`
   - Copy the entire content

4. **Execute Migration**
   - Paste the SQL into the editor
   - Click "Run" button
   - Verify: "Success. No rows returned"

### Option 2: Apply via Supabase CLI

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref qwhunliohlkkahbspfiu

# Push migration
npx supabase db push
```

---

## What This Migration Does

✅ Creates `demo_sessions` table for trial tracking
✅ Adds `is_demo` flag to `companies` table
✅ Adds `is_demo_user` flag to `profiles` table
✅ Sets up Row Level Security (RLS) policies
✅ Creates auto-update triggers for `updated_at`
✅ Creates function to deactivate expired trials

---

## After Migration

Once the migration is applied:

1. **Demo Trial Banner Will Show**
   - Shows remaining trial days for demo accounts
   - Warning when < 3 days remaining
   - Alert when trial expired

2. **Demo Account Features**
   - 7-day free trial tracking
   - Auto-deactivation after expiry
   - Sample data generation (vehicles, customers, contracts)

3. **Demo Login**
   - Email: `demo@fleetify.app`
   - Password: `FleetifyDemo2025!`
   - One-click "Try Demo" button on login page

---

## Verify Migration Success

Run this query in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'demo_sessions'
);

-- Check if columns added
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('is_demo', 'trial_end_date');

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'is_demo_user';
```

Expected results:
- `demo_sessions` table: `exists = true`
- `companies` columns: `is_demo`, `trial_end_date`
- `profiles` column: `is_demo_user`

---

## Current Status

✅ **Error Suppressed** - No more console errors
✅ **App Works Normally** - Demo features gracefully disabled if table missing
⏳ **Migration Pending** - Apply migration to enable full demo mode

---

## Notes

- The app will work perfectly **without** applying this migration
- Demo session tracking is **optional** and non-critical
- The "Try Demo" button will still work (creates demo account)
- Trial banner only shows if migration is applied

---

*Last Updated: 2025-10-26*
