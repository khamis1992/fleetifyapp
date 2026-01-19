# Fix for ReferenceError: Cannot access 'vehicleData' before initialization

## Problem
The application was throwing a `ReferenceError: Cannot access 'vehicleData' before initialization` error when accessing the Contract Details Dialog.

## Root Cause
This is a temporal dead zone (TDZ) error that occurs in JavaScript when a variable is accessed before it's declared. In this case:
- `vehicleData` was being referenced in a `useEffect` hook on line 293
- But `vehicleData` was declared later as a `useMemo` on line 298
- This violates JavaScript's temporal dead zone rules where variables declared with `const` cannot be accessed before their declaration

## Solution Applied
Reordered the code in `ContractDetailsDialog.tsx` to ensure `vehicleData` is declared before it's used.

### File Modified: `src/components/contracts/ContractDetailsDialog.tsx`

**Before (lines 273-310):**
```typescript
// useEffect that references vehicleData (line 293)
React.useEffect(() => {
  if (contract) {
    // ... logging code ...
    console.log('🚗 [CONTRACT_DETAILS] Vehicle data to display:', vehicleData);
  }
}, [contract, vehicleData]);

// vehicleData declaration (line 298)
const vehicleData = React.useMemo(() => {
  // ... vehicle data logic ...
}, [contract, vehicle]);
```

**After (lines 273-334):**
```typescript
// vehicleData declaration moved BEFORE the useEffect
const vehicleData = React.useMemo(() => {
  // ... vehicle data logic ...
}, [contract, vehicle]);

// useEffect that references vehicleData - now safely after declaration
React.useEffect(() => {
  if (contract) {
    // ... logging code ...
    console.log('🚗 [CONTRACT_DETAILS] Vehicle data to display:', vehicleData);
  }
}, [contract, vehicleData]);
```

## Technical Explanation
### What is Temporal Dead Zone?
The Temporal Dead Zone (TDZ) is a behavior in JavaScript where variables declared with `let` and `const` exist in a "dead zone" from the start of their enclosing scope until they are declared. During this zone, any attempt to access the variable results in a ReferenceError.

### Why this happened
React components are just JavaScript functions, and hooks like `useEffect` and `useMemo` are executed in the order they appear in the code. When the component renders:
1. The `useEffect` hook was being registered first
2. Inside the `useEffect`, it tried to reference `vehicleData`
3. But `vehicleData` hadn't been declared yet (it was declared after the `useEffect`)
4. This caused the ReferenceError

## Verification
After the fix, the development server starts without errors and the Contract Details Dialog loads successfully without throwing any ReferenceErrors.

## Prevention Tips
To prevent this error in the future:

1. **Declaration Order**: Always declare variables/hooks before using them in other hooks
2. **Hook Dependencies**: Be careful with hook dependencies - ensure all referenced variables are declared
3. **Linting**: Use ESLint with React hooks rules to catch these errors at development time
4. **Component Structure**: Follow a consistent pattern for hook declarations:
   - State hooks (`useState`)
   - Computed values (`useMemo`)
   - Effects (`useEffect`)

## Testing
After this fix, open any contract in the system and verify:
1. No console errors appear
2. The Contract Details Dialog opens successfully
3. Vehicle information displays correctly (if present)
4. Debug logs show vehicle data properly