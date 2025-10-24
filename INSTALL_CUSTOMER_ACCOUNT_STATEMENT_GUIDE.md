# Customer Account Statement Function - Installation Guide

## 📋 Overview

This guide will help you install the `get_customer_account_statement_by_code` database function to enable customer account statements in your Fleetify application.

## ⚠️ Prerequisites

- Access to Supabase Dashboard
- Database connection to project: `qwhunliohlkkahbspfiu`
- Super admin or database owner permissions

## 🚀 Installation Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu
   - Login with your credentials

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Or go to: `Dashboard → SQL Editor`

3. **Create New Query**
   - Click "+ New Query" button
   - Or use existing query tab

4. **Copy the SQL File**
   - Open: `CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql`
   - Select all content (Ctrl+A)
   - Copy (Ctrl+C)

5. **Paste and Execute**
   - Paste the SQL content into the query editor
   - Click "Run" button or press **Ctrl+Enter**
   - Wait for execution to complete

6. **Verify Success**
   - Check for success message in the results panel
   - Should see: ✅ Function created successfully!

### Option 2: Via Supabase CLI

```bash
# Navigate to project directory
cd c:\Users\khami\fleetifyapp-1

# Run the SQL file
supabase db execute -f CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql
```

## 🧪 Testing the Function

After installation, test the function with this query:

```sql
-- Replace with actual values from your database
SELECT * FROM get_customer_account_statement_by_code(
  'YOUR_COMPANY_ID'::UUID,        -- Your company UUID
  'C001',                          -- Customer code
  NULL::DATE,                      -- From date (NULL = all history)
  NULL::DATE                       -- To date (NULL = latest)
);
```

### Test with Date Range

```sql
SELECT * FROM get_customer_account_statement_by_code(
  'YOUR_COMPANY_ID'::UUID,
  'C001',
  '2024-01-01'::DATE,              -- From January 1, 2024
  '2024-12-31'::DATE               -- To December 31, 2024
);
```

## ✅ Verification Checklist

After installation, verify:

- [ ] Function exists in database
- [ ] Test query returns results without errors
- [ ] Customer details page loads without "خطأ في تحميل البيانات" error
- [ ] Account statement tab shows transactions (if customer has any)

## 🔍 What the Function Does

This function generates a comprehensive customer account statement including:

### Data Sources
- **Invoices**: Customer invoices (debit transactions)
- **Payments**: Customer payments (credit transactions)
- **Journal Entries**: Manual accounting adjustments

### Features
- ✅ **Opening Balance**: Calculates balance before date range
- ✅ **Running Balance**: Shows cumulative balance after each transaction
- ✅ **Date Filtering**: Optional from/to date parameters
- ✅ **Multi-Currency**: Supports 3 decimal places (KWD precision)
- ✅ **Transaction Types**: Categorizes invoices, payments, and journal entries

### Return Columns

| Column | Type | Description |
|--------|------|-------------|
| `transaction_id` | TEXT | Unique transaction identifier |
| `transaction_date` | DATE | Date of transaction |
| `transaction_type` | TEXT | Type: invoice, payment, journal_debit, journal_credit |
| `description` | TEXT | Transaction description |
| `reference_number` | TEXT | Invoice/payment number |
| `debit_amount` | DECIMAL(15,3) | Amount owed by customer |
| `credit_amount` | DECIMAL(15,3) | Amount paid by customer |
| `running_balance` | DECIMAL(15,3) | Cumulative balance |
| `source_table` | TEXT | Source: invoices, payments, journal_entries |

## 🐛 Troubleshooting

### Error: "function does not exist"

**Problem**: Function was not created or name mismatch

**Solution**:
1. Verify you ran the SQL file completely
2. Check for any error messages during execution
3. Try running the CREATE statement again

### Error: "permission denied"

**Problem**: User lacks privileges to create functions

**Solution**:
```sql
-- Grant permissions (run as database owner)
GRANT CREATE ON SCHEMA public TO your_user;
```

### Error: "table does not exist"

**Problem**: Required tables (customers, invoices, payments) don't exist

**Solution**:
1. Verify you're connected to the correct database
2. Check table names match your schema
3. Modify function if using different table names

### Error: "column does not exist"

**Problem**: Table schemas don't match function expectations

**Solution**:
```sql
-- Check actual column names
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('customers', 'invoices', 'payments')
ORDER BY table_name, ordinal_position;
```

Common column name differences to adjust:
- `status` vs `payment_status` in payments table
- `description` vs `notes` in payments table
- `entry_number` vs `journal_entry_number` in journal_entries

## 📊 Performance Notes

- Function uses indexed columns (`customer_code`, `company_id`, `invoice_date`, `payment_date`)
- Large date ranges may take longer to process
- Consider adding date range filters for faster results
- Opening balance calculation adds ~100-200ms for large datasets

## 🔄 Updates and Maintenance

If you need to update the function:

1. Run the SQL file again (it includes DROP IF EXISTS)
2. Changes will take effect immediately
3. No need to restart application

## 📞 Support

If you encounter issues:

1. Check Supabase logs: `Dashboard → Logs → Postgres Logs`
2. Verify table structures match function expectations
3. Test with simple queries first
4. Contact Fleetify support with error details

## 🎉 Success!

Once installed successfully, you should see:
- ✅ No more "خطأ في تحميل البيانات" errors
- ✅ Customer account statements display properly
- ✅ Export and print functionality works
- ✅ Running balances calculate correctly

---

**File Location**: `CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql`
**Last Updated**: 2025-10-24
**Supabase Project**: qwhunliohlkkahbspfiu
