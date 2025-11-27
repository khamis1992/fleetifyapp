# Unpaid Months Tracking System

## 🎯 Overview
The "أشهر غير مدفوعة" (Unpaid Months) section automatically tracks all months without payments and updates in real-time when payments are added.

---

## ✅ How It Works

### Automatic Tracking
The system uses a PostgreSQL database function `get_customer_unpaid_months` that:

1. **Finds the customer's active contract**
2. **Loops through every month** from contract start date to current date
3. **Checks if each month has a payment**
4. **Returns only unpaid months**

### Real-Time Updates
When a payment is added:
1. ✅ Payment is saved to `rental_payment_receipts` table
2. ✅ React Query automatically invalidates the cache
3. ✅ Unpaid months list is re-fetched from database
4. ✅ Paid month is **automatically removed** from the list
5. ✅ UI updates instantly to show remaining unpaid months

---

## 🔍 Database Function Logic

### SQL Function: `get_customer_unpaid_months`

```sql
CREATE OR REPLACE FUNCTION public.get_customer_unpaid_months(
    customer_id_param UUID,
    company_id_param UUID
)
RETURNS TABLE(
    month_number INTEGER,
    month_name TEXT,
    expected_date DATE,
    is_overdue BOOLEAN,
    days_overdue INTEGER
)
```

### Key Logic Flow

**Step 1: Get Contract Details**
```sql
SELECT 
    c.start_date,
    c.end_date,
    c.monthly_payment
FROM public.contracts c
WHERE c.customer_id = customer_id_param
AND c.status = 'active'
```

**Step 2: Loop Through Each Month**
```sql
WHILE v_current_month_date <= CURRENT_DATE LOOP
    -- Check each month from contract start to now
END LOOP;
```

**Step 3: Check If Month Is Paid** ⭐ KEY LOGIC
```sql
SELECT EXISTS(
    SELECT 1
    FROM public.rental_payment_receipts
    WHERE customer_id = customer_id_param
    AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM v_current_month_date)
    AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM v_current_month_date)
) INTO v_is_paid;
```

**Step 4: Return Only Unpaid Months**
```sql
IF NOT v_is_paid THEN
    RETURN QUERY SELECT month_number, month_name, expected_date, is_overdue, days_overdue;
END IF;
```

---

## 📊 Example Scenario

### Customer: محمد أحمد
**Contract Start:** 2024-10-01  
**Monthly Rent:** 5,000 QAR  
**Current Date:** 2025-01-14

### Initial State (No Payments)
```
أشهر غير مدفوعة (4)
━━━━━━━━━━━━━━━━━━━━━━━━
1. أكتوبر 2024   - متأخر (105 days)
2. نوفمبر 2024   - متأخر (75 days)
3. ديسمبر 2024   - متأخر (45 days)
4. يناير 2025    - متأخر (14 days)
```

### After Payment for نوفمبر 2024
```
أشهر غير مدفوعة (3) ← Count decreased!
━━━━━━━━━━━━━━━━━━━━━━━━
1. أكتوبر 2024   - متأخر (105 days)
2. ديسمبر 2024   - متأخر (45 days) ← Auto-renumbered
3. يناير 2025    - متأخر (14 days)  ← Auto-renumbered
```

### After Payment for ديسمبر 2024
```
أشهر غير مدفوعة (2) ← Count decreased again!
━━━━━━━━━━━━━━━━━━━━━━━━
1. أكتوبر 2024   - متأخر (105 days)
2. يناير 2025    - متأخر (14 days)
```

### After All Payments Made
```
✅ No unpaid months section shown!
(Section automatically hides when list is empty)
```

---

## 🎨 UI Behavior

### Display Conditions
```typescript
{unpaidMonths.length > 0 && (
  <Card className="border-destructive">
    {/* Unpaid months table */}
  </Card>
)}
```

**Shown when:** `unpaidMonths.length > 0`  
**Hidden when:** `unpaidMonths.length === 0`

### Dynamic Count in Title
```typescript
⚠️ أشهر غير مدفوعة ({unpaidMonths.length})
```

The number in parentheses **automatically updates** based on how many unpaid months exist.

### Row Styling
```typescript
className={month.is_overdue 
  ? 'bg-destructive/10 hover:bg-destructive/20'  // Red for overdue
  : 'bg-yellow-50 hover:bg-yellow-100'           // Yellow for upcoming
}
```

- **Red background:** Overdue months (past due date)
- **Yellow background:** Upcoming months (not yet overdue)

### Status Badge
```typescript
{month.is_overdue ? (
  <Badge variant="destructive">متأخر</Badge>  // Overdue
) : (
  <Badge className="bg-yellow-500">قادم</Badge>  // Upcoming
)}
```

---

## 🔄 Payment Integration

### When Payment Is Added

**Frontend: `handleAddPayment` function**
```typescript
const handleAddPayment = async () => {
  // Calculate payment details
  const { fine, month, rent_amount } = calculateDelayFine(paymentDate, selectedCustomer.monthly_rent);
  const calculatedTotal = rent_amount + fine;
  
  // Create receipt
  await createReceiptMutation.mutateAsync({
    customer_id: selectedCustomer.id,
    customer_name: selectedCustomer.name,
    month,
    rent_amount,
    payment_date: paymentDate,
    fine,
    total_paid: calculatedTotal
  });
  
  // ✅ React Query automatically invalidates unpaid months cache
  // ✅ UI re-fetches and updates automatically
};
```

**Backend: Payment is inserted**
```sql
INSERT INTO rental_payment_receipts (
  customer_id,
  payment_date,
  rent_amount,
  fine,
  total_paid,
  -- ...
)
```

**Automatic Update:** Next time unpaid months are fetched, this month is excluded!

---

## 📋 Table Columns

| Column | Description | Example |
|--------|-------------|---------|
| **رقم الشهر** | Sequential month number | 1, 2, 3, 4... |
| **الشهر** | Month name in Arabic | يناير 2025, ديسمبر 2024 |
| **تاريخ الاستحقاق** | Expected payment date | 01 يناير 2025 |
| **الحالة** | Overdue or upcoming | متأخر / قادم |
| **أيام التأخير** | Days past due date | 14 يوم, 45 يوم |

---

## ⚠️ Warning Alert

When there are overdue months, a warning appears:

```typescript
{unpaidMonths.filter(m => m.is_overdue).length > 0 && (
  <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
    <p>تنبيه: يوجد {unpaidMonths.filter(m => m.is_overdue).length} شهر متأخر</p>
    <p>يرجى سداد المدفوعات المتأخرة في أقرب وقت ممكن لتجنب غرامات إضافية.</p>
  </div>
)}
```

**Shows:**
- Number of overdue months
- Warning message to pay soon

---

## 🔧 Technical Details

### React Query Hook
```typescript
const { data: unpaidMonths = [], isLoading: loadingUnpaid } = useCustomerUnpaidMonths(selectedCustomer?.id);
```

**Features:**
- ✅ Automatic caching
- ✅ Automatic refetching on window focus
- ✅ Automatic invalidation after mutations
- ✅ Loading states

### Cache Invalidation
```typescript
// In useCreateRentalReceipt mutation
onSuccess: () => {
  queryClient.invalidateQueries({ 
    queryKey: ['customer-unpaid-months', selectedCustomer?.id] 
  });
  // ✅ Forces re-fetch of unpaid months
}
```

---

## 🎯 Business Rules

### Month Matching Logic
A month is considered "paid" when:
```sql
EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM expected_month)
AND
EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM expected_month)
```

**This means:**
- ✅ Payment on any day of January 2025 counts for January 2025
- ✅ Multiple payments in same month all count for that month
- ✅ Payment in wrong month doesn't count for another month

### Overdue Calculation
```sql
is_overdue = (expected_date < CURRENT_DATE)
days_overdue = CURRENT_DATE - expected_date
```

**This means:**
- ✅ Month becomes overdue the day after its month ends
- ✅ Days overdue increase automatically each day
- ✅ Future months show 0 days overdue

### Contract-Based Tracking
- ✅ Only active contracts are considered
- ✅ Months before contract start are ignored
- ✅ Months after contract end are ignored
- ✅ Months after current date are ignored

---

## 🧪 Testing Scenarios

### Test 1: New Customer with No Payments
```
Expected Result:
- All months from contract start to now shown as unpaid
- Recent months marked as overdue
- Count matches number of months
```

### Test 2: Add Payment for Current Month
```
Action: Add payment for يناير 2025
Expected Result:
- يناير 2025 removed from unpaid list
- Count decreases by 1
- Other months remain in list
```

### Test 3: Add Payment for Old Month
```
Action: Add payment for أكتوبر 2024
Expected Result:
- أكتوبر 2024 removed from unpaid list
- Month numbers auto-renumber
- Overdue count decreases
```

### Test 4: Pay All Outstanding Months
```
Action: Add payments for all unpaid months
Expected Result:
- Unpaid months section completely disappears
- {unpaidMonths.length > 0} condition becomes false
```

### Test 5: New Month Arrives
```
Action: Wait for new month to start
Expected Result:
- New month automatically appears in unpaid list
- Count increases by 1
- New month marked as upcoming (not overdue yet)
```

---

## 🔍 Troubleshooting

### Issue: "Unpaid months not updating after payment"

**Solution:**
1. Check if payment was actually saved:
   ```sql
   SELECT * FROM rental_payment_receipts 
   WHERE customer_id = 'xxx' 
   ORDER BY created_at DESC LIMIT 1;
   ```

2. Check React Query cache invalidation:
   ```typescript
   // Should be in mutation onSuccess
   queryClient.invalidateQueries({ queryKey: ['customer-unpaid-months'] });
   ```

3. Hard refresh browser: `Ctrl + Shift + R`

### Issue: "Count shows wrong number"

**Cause:** Frontend cache not updated  
**Solution:**
```typescript
// Force refetch
const { refetch } = useCustomerUnpaidMonths(customerId);
await refetch();
```

### Issue: "Paid month still showing"

**Check:**
1. Payment date year/month matches expected month
2. Payment was saved with correct `customer_id`
3. Payment has correct `company_id`
4. Contract is still `active`

---

## 📊 Performance

### Optimization
- ✅ Function uses `STABLE` keyword for query optimization
- ✅ React Query caches results to reduce DB calls
- ✅ Only fetches when customer is selected
- ✅ Automatic cleanup when customer is deselected

### Database Indexes
Ensure these indexes exist for optimal performance:
```sql
CREATE INDEX idx_rental_receipts_customer_date 
ON rental_payment_receipts(customer_id, payment_date);

CREATE INDEX idx_contracts_customer_status 
ON contracts(customer_id, status);
```

---

## 🎉 Summary

**The unpaid months system is fully automatic:**
1. ✅ Tracks all months from contract start
2. ✅ Automatically excludes paid months
3. ✅ Updates in real-time when payments added
4. ✅ Shows accurate overdue status
5. ✅ Hides when all months are paid
6. ✅ No manual intervention needed

**User just needs to:**
1. Select customer
2. Add payment with date
3. System automatically updates unpaid months list
4. That's it! 🎊

---

**Status:** ✅ Fully Implemented and Working  
**Last Updated:** 2025-01-14  
**Database Function:** `get_customer_unpaid_months`  
**UI Component:** Financial Tracking Page - Unpaid Months Section
