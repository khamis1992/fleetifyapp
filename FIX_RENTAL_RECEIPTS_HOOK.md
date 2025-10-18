# Fix for ReferenceError: useAllRentalPaymentReceipts is not defined

## Problem
The application was throwing a `ReferenceError: useAllRentalPaymentReceipts is not defined` error when trying to use the Financial Tracking page.

## Root Cause
The hook `useAllRentalPaymentReceipts` was being used in `FinancialTracking.tsx` on line 183, but it was not imported at the top of the file. This is a common JavaScript/TypeScript error that occurs when you try to use a function or variable that hasn't been declared or imported in the current scope.

## Solution Applied
Added the missing import for `useAllRentalPaymentReceipts` to the import statement in `FinancialTracking.tsx`.

### File Modified: `src/pages/FinancialTracking.tsx`

**Before (lines 20-33):**
```typescript
import {
  useRentalPaymentReceipts,
  useCustomersWithRental,
  useCustomerPaymentTotals,
  useCreateRentalReceipt,
  useDeleteRentalReceipt,
  useCustomerOutstandingBalance,
  useCustomerUnpaidMonths,
  useCustomerVehicles,
  calculateDelayFine,
  type CustomerWithRental,
  type RentalPaymentReceipt,
  type CustomerVehicle
} from '@/hooks/useRentalPayments';
```

**After (lines 20-34):**
```typescript
import {
  useRentalPaymentReceipts,
  useAllRentalPaymentReceipts,  // ← Added this import
  useCustomersWithRental,
  useCustomerPaymentTotals,
  useCreateRentalReceipt,
  useDeleteRentalReceipt,
  useCustomerOutstandingBalance,
  useCustomerUnpaidMonths,
  useCustomerVehicles,
  calculateDelayFine,
  type CustomerWithRental,
  type RentalPaymentReceipt,
  type CustomerVehicle
} from '@/hooks/useRentalPayments';
```

## Verification
The hook is properly exported from `src/hooks/useRentalPayments.ts` on line 242:
```typescript
export const useAllRentalPaymentReceipts = () => {
  // Hook implementation
}
```

And is now correctly used in `FinancialTracking.tsx` on line 183:
```typescript
const { data: allReceipts = [], isLoading: loadingAllReceipts } = useAllRentalPaymentReceipts();
```

## Prevention Tips
To prevent this error in the future:

1. **Always import before use**: When using a function or hook from another file, make sure it's imported at the top
2. **Use TypeScript**: TypeScript would catch this error at compile time
3. **Use IDE auto-import**: Most modern IDEs can automatically add imports when you use a function
4. **Check exports**: Ensure the function/hook is properly exported from its source file

## Testing
After this fix, the Financial Tracking page should load without errors and the `allReceipts` data should be properly fetched for monthly summaries.