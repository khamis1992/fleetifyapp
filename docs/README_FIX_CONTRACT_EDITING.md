# Fix for Contract Editing Issue

## Issue
When editing contract details, the contract data was not showing properly because:
1. The `editData` state was only initialized once when the component mounted
2. When viewing different contracts, the `editData` state was not updated to reflect the new contract data
3. This caused the edit forms to show stale or empty data

## Solution Applied

### 1. Fixed State Initialization
- Changed the `editData` state initialization from `React.useState(contract || {})` to `React.useState({})`
- Added a `useEffect` hook that updates `editData` whenever the `contract` prop changes
- This ensures that when a user selects a different contract to view/edit, the edit form data is properly updated

### 2. Improved Edit Form Handling
- Updated all input fields in the edit mode to use values from `editData` instead of `contract`
- Added proper fallback values for all input fields to prevent undefined errors
- Ensured that all form fields are properly populated when switching to edit mode

### 3. Better Data Synchronization
- The fix ensures that when a user switches between viewing different contracts, the edit data is always synchronized with the currently selected contract
- When editing is enabled, the form now correctly shows the current contract's data

## Key Changes

### ContractDetailsDialog.tsx
- Fixed `editData` state initialization to be an empty object initially
- Added a `useEffect` hook to update `editData` when the `contract` prop changes
- Updated all input fields in edit mode to use values from `editData` with proper fallbacks
- Ensured consistent data flow between view and edit modes

## Testing
To verify the fix:
1. Navigate to the contracts list
2. Click "View" on any contract to open the details dialog
3. Click "Edit" to switch to edit mode - verify that all contract data is properly displayed in the form fields
4. Close the dialog and open a different contract
5. Click "Edit" again - verify that the form now shows the correct data for the newly selected contract
6. Make some changes and save - verify that the changes are properly saved

## Benefits
- Contract editing now works correctly for all contracts
- Data is properly synchronized when switching between different contracts
- Edit forms are always populated with the correct contract data
- Improved user experience when editing contract details

## Technical Details
The core issue was a React state management problem where:
- Initial implementation: `const [editData, setEditData] = React.useState(contract || {});`
- This only set the state once when the component mounted, but didn't update when the `contract` prop changed
- Fixed implementation: Added a `useEffect` hook to update `editData` whenever `contract` changes

This is a common React pattern for keeping local state synchronized with props.