# Tasks

- [x] Investigate duplicated customer profiles <!-- id: 1 -->
- [x] Check customer details for UUIDs c5d375c3-6f0d-4967-a04e-f9d842942020 and b8ecb837-e5d6-4fd2-8714-a8ecf515f45e in `customers` table <!-- id: 2 -->
- [x] Fetch contracts for both customer UUIDs from `contracts` table <!-- id: 3 -->
- [x] Compare contracts to determine if they are identical <!-- id: 4 -->
- [x] Analyze why two profiles exist (e.g., different phone numbers, emails, creation sources) <!-- id: 5 -->
- [x] Report findings to the user <!-- id: 6 -->

## Review
- **Findings**: The customer "Abdel Ghafoor Darrar" is duplicated.
  - Profile 1 (`b8ecb...`): "عبد الغفور" (Space), created 13:16. Contract: AGR-202504-408522 (3 years, 54k).
  - Profile 2 (`c5d37...`): "عبدالغفور" (No Space), created 13:17. Contract: AGR-202502-0422 (10 years, 195k).
- **Reason**: Manual data entry error. Both profiles have same Phone and ID. Contracts are for the *same vehicle* (Bestune T77) but different terms/dates. It seems the user re-entered the customer to create a new corrected/different contract instead of editing the first one.

## Fixes (Deletion Issue)
- **Problem**: Deleting contract `AGR-202502-0422` failed with 409 Conflict and a React warning.
- **Root Cause**:
  1. **Backend**: The contract had 5 linked traffic violations. The deletion function was not clearing these violations before deleting the contract, causing a foreign key constraint error.
  2. **Frontend**: The delete confirmation dialog had a `<div>` nested inside a `<p>` (via `AlertDialogDescription`), causing React warnings.
- **Solution**:
  1. Updated `ContractDetailsPageRedesigned.tsx` to explicitly delete related traffic violations before deleting the contract.
  2. Fixed the dialog structure by using `asChild` on `AlertDialogDescription` to allow proper nesting of `<div>` elements.

## Update (Traffic Violations)
- **Change**: Modified the deletion logic to **unlink** traffic violations instead of deleting them.
- **Implementation**: Instead of `DELETE FROM traffic_violations`, the code now executes `UPDATE traffic_violations SET contract_id = NULL`.
- **Reason**: This preserves the traffic violations in the system (linked to the vehicle) so they can be re-assigned to the correct contract later, while still allowing the incorrect contract to be deleted.

## New Feature (Customer Deletion)
- **Feature**: Added "Delete Customer" option to the customer details page.
- **Changes**:
  - Updated `CustomerDetailsPageNew.tsx` to enable the deletion option in the dropdown menu.
  - Implemented `handleDeleteCustomer` function to delete the customer from Supabase.
  - Added a confirmation dialog (`AlertDialog`) that warns about active contracts and outstanding debts before deletion.
  - Ensured that deleting a customer will trigger database cascades (if configured) or fail if constraints exist (users are warned about active contracts).
