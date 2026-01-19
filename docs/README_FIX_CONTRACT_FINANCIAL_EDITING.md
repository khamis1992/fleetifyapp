# Fix for Contract Financial Information Editing Issue

## Issue
When editing contract details, the financial information (contract amount and monthly amount) was not showing properly because:
1. The input fields were not properly initialized with the contract data
2. The editData state was not correctly populated with financial information when switching between contracts
3. This caused the financial fields to show as empty or with default values (0) when editing

## Solution Applied

### 1. Fixed Financial Information Fields
- Updated the financial input fields to properly display contract data when editing
- Added proper fallback values that check both `editData` and the original `contract` object
- Ensured that when switching between contracts, the financial data is correctly displayed

### 2. Improved Data Initialization
- Enhanced the `useEffect` hook that updates `editData` when the contract changes
- Ensured all contract fields including financial information are properly copied to `editData`
- Added proper initialization for all editable fields

### 3. Better Field Value Handling
- Updated all input fields to check both `editData` and the original `contract` object for values
- This ensures that when editing is first enabled, the fields show the current contract data
- When changes are made, they are stored in `editData` but the original contract data is still available as fallback

## Key Changes

### ContractDetailsDialog.tsx
- Fixed financial input fields to properly display contract amount and monthly amount
- Enhanced the `useEffect` hook for better data initialization
- Updated all input fields to use proper fallback values
- Ensured consistent data flow between view and edit modes for financial information

## Testing
To verify the fix:
1. Navigate to the contracts list
2. Click "View" on any contract to open the details dialog
3. Click "Edit" to switch to edit mode - verify that all financial data is properly displayed in the form fields
4. Verify that contract amount and monthly amount show the correct values
5. Close the dialog and open a different contract
6. Click "Edit" again - verify that the financial form fields now show the correct data for the newly selected contract
7. Make changes to financial fields and save - verify that the changes are properly saved

## Benefits
- Contract financial information editing now works correctly for all contracts
- Data is properly synchronized when switching between different contracts
- Financial form fields are always populated with the correct contract data
- Improved user experience when editing contract financial details

## Technical Details
The core issue was in the input field value binding:
- Initial implementation had issues with accessing properties on the editData object
- Fixed by adding proper fallback checks that look at both editData and the original contract object
- Enhanced the data initialization to ensure all contract fields are properly copied to editData

This approach ensures that:
1. When editing is first enabled, fields show current contract data
2. When changes are made, they are stored in editData
3. When switching contracts, the form is properly re-initialized with new contract data