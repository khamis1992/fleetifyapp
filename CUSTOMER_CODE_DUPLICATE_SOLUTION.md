# Customer Code Duplicate Error - Solution Guide

## 🐛 Error Details

```
ERROR: 23505: duplicate key value violates unique constraint "customers_company_customer_code_unique"
DETAIL: Key (company_id, customer_code)=(24bc0b21-4e2d-4413-9842-31719a3669f4, IND-25-0709) already exists.
```

**Error Code:** `23505` (Unique Violation)  
**Table:** `customers`  
**Constraint:** `customers_company_customer_code_unique`  
**Duplicate Code:** `IND-25-0709`  
**Company ID:** `24bc0b21-4e2d-4413-9842-31719a3669f4`

---

## 🔍 Root Cause

Your INSERT statement is **NOT providing a `customer_code`**, so PostgreSQL is either:
1. Using a DEFAULT value that's already taken
2. A trigger is generating `customer_code` automatically
3. The code generation logic is not checking for existing codes

The constraint `customers_company_customer_code_unique` ensures that within each company, customer codes are unique. The code `IND-25-0709` already exists in your database.

---

## ✅ Solution Options

### Option 1: Check if Customer Exists First (Recommended)

Before inserting, check if a customer with the same phone number already exists:

```sql
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id UUID;
BEGIN
  -- Check if customer exists by phone
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = v_company_id
    AND phone = '50529648'
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    RAISE NOTICE '✅ Customer already exists: %', v_customer_id;
  ELSE
    -- Customer doesn't exist, create with unique code
    -- (See Option 2 for code generation)
    RAISE NOTICE '❌ Customer not found, creating new...';
  END IF;
END;
$$;
```

### Option 2: Generate Unique Customer Code

```sql
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id UUID;
  v_customer_code TEXT;
  v_max_code INT;
BEGIN
  -- Find the highest existing code number
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 
    0
  ) INTO v_max_code
  FROM customers
  WHERE company_id = v_company_id
    AND customer_code LIKE 'IND-25-%';

  -- Generate next code
  v_customer_code := 'IND-25-' || LPAD((v_max_code + 1)::TEXT, 4, '0');

  RAISE NOTICE '📝 Generated new code: %', v_customer_code;

  -- Insert with generated code
  INSERT INTO customers (
    id,
    company_id,
    first_name_ar,
    customer_type,
    phone,
    customer_code,  -- ✅ Include this!
    is_active,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'هيثم خليفة يعلي',
    'individual',
    '50529648',
    v_customer_code,  -- ✅ Use generated code
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_customer_id;

  RAISE NOTICE '✅ Created customer: % with code: %', v_customer_id, v_customer_code;
END;
$$;
```

### Option 3: Use Existing Database Function

If a `generate_customer_code` function exists:

```sql
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id UUID;
  v_customer_code TEXT;
BEGIN
  -- Use database function to generate code
  SELECT generate_customer_code(v_company_id, 'individual') 
  INTO v_customer_code;

  RAISE NOTICE '📝 Generated code: %', v_customer_code;

  -- Insert with function-generated code
  INSERT INTO customers (
    id,
    company_id,
    first_name_ar,
    customer_type,
    phone,
    customer_code,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'هيثم خليفة يعلي',
    'individual',
    '50529648',
    v_customer_code,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_customer_id;

  RAISE NOTICE '✅ Customer created: %', v_customer_id;
END;
$$;
```

### Option 4: Upsert (Insert or Update)

```sql
INSERT INTO customers (
  id,
  company_id,
  first_name_ar,
  customer_type,
  phone,
  customer_code,
  is_active,
  created_at,
  updated_at
)
SELECT
  COALESCE(c.id, gen_random_uuid()),
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'هيثم خليفة يعلي',
  'individual',
  '50529648',
  COALESCE(c.customer_code, (
    SELECT 'IND-25-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1)::TEXT, 4, '0')
    FROM customers
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND customer_code LIKE 'IND-25-%'
  )),
  true,
  COALESCE(c.created_at, NOW()),
  NOW()
FROM (
  SELECT id, customer_code, created_at
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50529648'
  LIMIT 1
) c
ON CONFLICT (company_id, customer_code) 
DO UPDATE SET
  first_name_ar = EXCLUDED.first_name_ar,
  phone = EXCLUDED.phone,
  updated_at = NOW()
RETURNING id, customer_code;
```

---

## 🔧 Quick Fixes

### Fix 1: Find Existing Customer

```sql
-- Check if customer already exists
SELECT id, customer_code, first_name_ar, phone
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND phone = '50529648';
```

If the customer exists, use their ID instead of creating a new one.

### Fix 2: Find Next Available Code

```sql
-- Find next available customer code
SELECT 'IND-25-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1)::TEXT, 4, '0') as next_code
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND customer_code LIKE 'IND-25-%';
```

Use this code in your INSERT statement.

### Fix 3: Check What Code is Being Used

```sql
-- See all existing codes for this company
SELECT customer_code, first_name_ar, phone, created_at
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND customer_code LIKE 'IND-25-%'
ORDER BY customer_code DESC
LIMIT 20;
```

---

## 📋 Best Practices

### 1. Always Include `customer_code` in INSERT

```sql
-- ❌ BAD - Missing customer_code
INSERT INTO customers (company_id, first_name_ar, ...)
VALUES (...);

-- ✅ GOOD - Includes customer_code
INSERT INTO customers (company_id, first_name_ar, customer_code, ...)
VALUES ('...', '...', 'IND-25-0710', ...);
```

### 2. Use Transaction with Duplicate Check

```sql
BEGIN;

-- Check for duplicate
SELECT id FROM customers 
WHERE company_id = '...' AND phone = '...'
FOR UPDATE;  -- Lock row to prevent race conditions

-- If not exists, insert
-- Otherwise, use existing ID

COMMIT;
```

### 3. Handle Exceptions

```sql
BEGIN
  INSERT INTO customers (...) VALUES (...);
EXCEPTION
  WHEN unique_violation THEN
    -- Log or handle duplicate
    RAISE NOTICE 'Customer code already exists, using timestamp-based code';
    -- Retry with different code
END;
```

---

## 🎯 Recommended Solution

Use the complete script in `scripts/fix-duplicate-customer-code.sql`:

```bash
# Run from Supabase Dashboard or CLI
psql -U postgres -d fleetify -f scripts/fix-duplicate-customer-code.sql
```

Or execute manually in Supabase SQL Editor.

---

## 🧪 Testing

### Test 1: Verify Existing Customer
```sql
SELECT * FROM customers 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND customer_code = 'IND-25-0709';
```

### Test 2: Find Next Code
```sql
SELECT 
  COUNT(*) as total_customers,
  MAX(customer_code) as last_code,
  'IND-25-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1)::TEXT, 4, '0') as next_code
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND customer_code LIKE 'IND-25-%';
```

### Test 3: Check Constraint
```sql
-- View constraint details
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'customers'::regclass
  AND conname = 'customers_company_customer_code_unique';
```

---

## 📊 Current Database State

To understand your current situation:

```sql
-- Count customers by code pattern
SELECT 
  SUBSTRING(customer_code FROM '^[A-Z]+-[0-9]+-') as code_pattern,
  COUNT(*) as count
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY 1
ORDER BY 2 DESC;

-- Find potential duplicates
SELECT customer_code, COUNT(*) as duplicates
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY customer_code
HAVING COUNT(*) > 1;
```

---

## 🔐 Security Note

The unique constraint `customers_company_customer_code_unique` is **working correctly**. It prevents duplicate customer codes within a company, which is the intended behavior. The error is telling you that you need to:

1. Check if the customer already exists
2. Generate a new unique code if creating a new customer
3. Handle the duplicate case gracefully

---

## 📞 Support

If the error persists:

1. **Check if `generate_customer_code` function exists**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%customer_code%';
   ```

2. **Review migration files** for customer code generation logic

3. **Check for triggers** on the customers table:
   ```sql
   SELECT tgname, tgtype, tgenabled 
   FROM pg_trigger 
   WHERE tgrelid = 'customers'::regclass;
   ```

---

**Status:** ✅ Solution Provided  
**Files Created:** `scripts/fix-duplicate-customer-code.sql`  
**Next Step:** Run the fix script or use one of the solution options above
