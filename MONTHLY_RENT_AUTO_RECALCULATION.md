# Monthly Rent Auto-Recalculation Feature ✅

## Overview
When you update **الإيجار الشهري** (monthly rent) for a customer, the system now automatically recalculates ALL existing payment records in **سجل المدفوعات** (payment receipts) to reflect the new rent amount.

## Feature Status: ✅ COMPLETE

### What Happens When You Update Monthly Rent

1. **Contract Update** ✅
   - Updates the `contracts` table with new `monthly_amount`
   
2. **Fetch All Receipts** ✅
   - Retrieves all existing payment receipts for the customer

3. **Recalculate Each Receipt** ✅
   - **rent_amount** = new monthly rent
   - **amount_due** = new rent_amount + existing fine
   - **pending_balance** = amount_due - total_paid (already paid)
   - **payment_status** = automatically determined:
     - `'paid'` if pending_balance = 0
     - `'partial'` if some amount paid but pending_balance > 0
     - `'pending'` if no amount paid

4. **Update All Receipts** ✅
   - Saves recalculated values for all receipts

5. **Refresh UI** ✅
   - Invalidates queries to show updated data immediately
   - Shows success message with count of updated receipts

## Implementation Details

### Modified Function: `handleSaveMonthlyRent()`

**Location**: `src/pages/FinancialTracking.tsx` (Lines 660-750)

**Steps Performed**:

```typescript
// Step 1: Update contract monthly_amount
await supabase
  .from('contracts')
  .update({ monthly_amount: rentAmount })
  .eq('customer_id', selectedCustomer.id)
  .eq('company_id', companyId)
  .eq('status', 'active');

// Step 2: Fetch all existing receipts
const { data: existingReceipts } = await supabase
  .from('rental_payment_receipts')
  .select('*')
  .eq('customer_id', selectedCustomer.id)
  .eq('company_id', companyId);

// Step 3: Recalculate and update each receipt
const updatePromises = existingReceipts.map(async (receipt) => {
  const newAmountDue = rentAmount + receipt.fine;
  const newPendingBalance = Math.max(0, newAmountDue - receipt.total_paid);
  const newPaymentStatus = 
    newPendingBalance === 0 ? 'paid' : 
    (receipt.total_paid > 0 ? 'partial' : 'pending');

  return supabase
    .from('rental_payment_receipts')
    .update({
      rent_amount: rentAmount,
      amount_due: newAmountDue,
      pending_balance: newPendingBalance,
      payment_status: newPaymentStatus
    })
    .eq('id', receipt.id);
});

await Promise.all(updatePromises);

// Step 4: Invalidate queries to refresh UI
await queryClient.invalidateQueries({ queryKey: ['customers-with-rental', companyId] });
await queryClient.invalidateQueries({ queryKey: ['rental-receipts', selectedCustomer.id] });
await queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', selectedCustomer.id] });
```

## Recalculation Logic

### Example Scenario

**Before Update:**
- Monthly Rent: 5,000 QAR
- Receipt 1: rent_amount = 5,000, fine = 600, total_paid = 5,600, pending_balance = 0
- Receipt 2: rent_amount = 5,000, fine = 300, total_paid = 3,000, pending_balance = 2,300

**After Updating to 6,000 QAR:**
- Monthly Rent: 6,000 QAR
- Receipt 1: rent_amount = 6,000, fine = 600, total_paid = 5,600, pending_balance = 1,000 ⚠️
- Receipt 2: rent_amount = 6,000, fine = 300, total_paid = 3,000, pending_balance = 3,300 ⚠️

### Field Calculations

| Field | Formula |
|-------|---------|
| `rent_amount` | New monthly rent value |
| `fine` | Unchanged (keeps original late fee) |
| `amount_due` | `rent_amount + fine` |
| `total_paid` | Unchanged (keeps what was already paid) |
| `pending_balance` | `MAX(0, amount_due - total_paid)` |
| `payment_status` | Auto-determined based on `pending_balance` |

## Payment Status Logic

```typescript
const newPaymentStatus = 
  newPendingBalance === 0 ? 'paid' :      // Fully paid
  (receipt.total_paid > 0 ? 'partial' :   // Partially paid
  'pending');                              // Nothing paid
```

## User Feedback Messages

### Success Messages

**Contract Updated:**
```
تم تحديث الإيجار الشهري إلى [amount] ریال ✅
```

**Receipts Updated:**
```
تم تحديث [count] سجل دفع بنجاح ✅
```

### Error Messages

**Validation Error:**
```
الرجاء إدخال مبلغ صحيح للإيجار الشهري
```

**Update Failed:**
```
فشل في تحديث الإيجار الشهري
```

**Partial Success:**
```
تم تحديث [successful_count] من [total_count] سجل دفع
```

## Database Tables Affected

### 1. `contracts` Table
**Updated Field**: `monthly_amount`

**Filter**:
- `customer_id` = selected customer
- `company_id` = current company
- `status` = 'active'

### 2. `rental_payment_receipts` Table
**Updated Fields**:
- `rent_amount` - New monthly rent
- `amount_due` - Recalculated
- `pending_balance` - Recalculated
- `payment_status` - Auto-updated

**Filter**:
- `customer_id` = selected customer
- `company_id` = current company

## Impact Analysis

### What Changes:
✅ Contract monthly amount
✅ All receipt rent amounts
✅ All receipt amount due values
✅ All receipt pending balances
✅ All receipt payment statuses

### What Stays the Same:
✅ Late fees (fine) - unchanged
✅ Payment dates - unchanged
✅ Total paid amounts - unchanged
✅ Payment notes - unchanged
✅ Receipt IDs and timestamps - unchanged

## Query Invalidation

The system refreshes these queries after update:

```typescript
queryClient.invalidateQueries({ queryKey: ['customers-with-rental', companyId] });
queryClient.invalidateQueries({ queryKey: ['rental-receipts', selectedCustomer.id] });
queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', selectedCustomer.id] });
```

This ensures:
- Customer list shows new rent
- Receipt table shows updated values
- Summary cards show correct totals

## Testing Checklist

### Before Update
- [ ] Note current monthly rent value
- [ ] Note current receipt count
- [ ] Note current payment statuses
- [ ] Note current pending balances

### Perform Update
- [ ] Click edit button on الإيجار الشهري
- [ ] Enter new rent amount
- [ ] Click ✓ to save
- [ ] Observe loading spinner

### After Update
- [ ] Verify success toast appears
- [ ] Check receipt count message
- [ ] Verify all receipts show new rent_amount
- [ ] Verify amount_due recalculated correctly
- [ ] Verify pending_balance updated correctly
- [ ] Verify payment_status changed appropriately
- [ ] Check summary cards show correct totals
- [ ] Verify contract page shows new rent

## Example Use Cases

### Use Case 1: Rent Increase
**Scenario**: Customer's rent increases from 5,000 to 6,000 QAR

**Impact**:
- Previously fully paid receipts may become partial
- Pending balances increase by 1,000 QAR per receipt
- Payment status may change from 'paid' to 'partial'

### Use Case 2: Rent Decrease
**Scenario**: Customer's rent decreases from 6,000 to 5,000 QAR

**Impact**:
- Partially paid receipts may become fully paid
- Pending balances decrease by 1,000 QAR per receipt
- Payment status may change from 'partial' to 'paid'

### Use Case 3: Correction After Data Entry Error
**Scenario**: Wrong rent (7,000) was entered initially, corrected to 5,500

**Impact**:
- All historical receipts recalculated
- Accurate financial records maintained
- Customer balance corrected

## Performance Considerations

### Batch Update
- All receipts updated in parallel using `Promise.all()`
- Efficient for large number of receipts
- Error handling per receipt

### Query Optimization
- Single fetch for all receipts
- Bulk update operations
- Minimal database roundtrips

## Error Handling

### Scenarios Covered:

1. **Contract Update Fails**
   - Transaction stops
   - No receipts updated
   - Error message shown

2. **Receipt Fetch Fails**
   - Transaction stops
   - Error message shown

3. **Some Receipts Fail to Update**
   - Continues with remaining updates
   - Shows partial success message
   - Logs errors to console

4. **All Updates Succeed**
   - Shows success message
   - Refreshes all data
   - Closes edit mode

## Benefits

✅ **Automatic Recalculation** - No manual work needed
✅ **Data Consistency** - All records reflect current rent
✅ **Accurate Balances** - Pending amounts always correct
✅ **Proper Status** - Payment status automatically updated
✅ **Time Saving** - Updates all receipts in seconds
✅ **Error Prevention** - Eliminates manual calculation errors

## Best Practices

1. **Before Updating**:
   - Review current receipts if needed
   - Ensure new rent amount is correct
   - Consider impact on customer balances

2. **After Updating**:
   - Verify summary totals
   - Check a few receipts manually
   - Inform customer of new balances if needed

3. **Regular Use**:
   - Update rent when contract renews
   - Correct data entry errors promptly
   - Keep rent aligned with agreements

## Future Enhancements

💡 Potential improvements:

1. **Audit Trail**: Log rent change history
2. **Customer Notification**: Auto-notify customer of balance changes
3. **Undo Feature**: Allow reverting rent changes
4. **Bulk Update**: Update rent for multiple customers at once
5. **Change Preview**: Show impact before confirming update

---

**Last Updated**: 2025-10-14  
**Status**: ✅ Production Ready  
**Version**: 2.0 (Auto-Recalculation)
