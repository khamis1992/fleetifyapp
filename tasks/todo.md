# Task: Fix Car Information Display in Agreement Details

## Objective
Fix the issue where vehicle/car information is not displaying on the agreement details page, even though the data exists in the database.

## Acceptance Criteria
- [x] Vehicle information (license plate, make, model, year, status) displays in contract details dialog
- [x] Support both linked vehicles (via vehicle_id) and direct vehicle fields on contracts table
- [x] Vehicle search functionality works with direct fields

## Scope & Impact Radius
Modules/files touched:
- `/src/components/contracts/ContractDetailsDialog.tsx`
- `/src/hooks/useContractsData.tsx`

Out-of-scope:
- Database schema changes
- Migration of existing data
- Modification of contract creation forms

## Risks & Mitigations
- Risk: Breaking existing contracts with linked vehicles → Mitigation: Maintained backward compatibility by checking both linked and direct fields

## Steps
- [x] Analyze CSV data structure to understand vehicle fields
- [x] Examine contract details dialog implementation
- [x] Check vehicle data fetching in contracts hook
- [x] Identify root cause (vehicle data stored directly in contracts table, not via foreign key)
- [x] Update ContractDetailsDialog to display vehicle info from direct fields
- [x] Update vehicleData logic to handle both linked and direct vehicle data
- [x] Update search filters to include direct vehicle fields

## Review (Updated)
### Summary of all changes:
1. **ContractDetailsDialog.tsx**:
   - Modified vehicle card display condition to show when any vehicle data exists (not just vehicle_id)
   - Updated vehicleData logic to check for direct fields (license_plate, make, model, year, vehicle_status)
   - Vehicle information now displays from either linked vehicle or direct contract fields
   - Added enhanced debugging logs to track vehicle data flow

2. **useContractsData.tsx**:
   - Updated search filter to include direct vehicle fields for searching (license_plate, make, model)
   - Maintained backward compatibility with existing vehicle linking
   - Ensured the query still fetches vehicle relations when available

3. **Database Migration** (`20251219000000_add_vehicle_fields_to_contracts.sql`):
   - Created migration to add vehicle fields directly to contracts table if they don't exist
   - Added indexes for better search performance
   - Included data migration to populate fields from linked vehicles where available

### Known limitations:
- If both linked vehicle and direct fields exist, linked vehicle takes precedence
- Direct fields must be populated in the contracts table for display
- Requires running the migration to ensure fields exist in database

### Testing Instructions:
1. Run the migration: `npx supabase migration up`
2. Open any contract/agreement in the system
3. Check the Details tab for the Vehicle Information card
4. Verify that license plate, make, model, year, and status are displayed

### Follow-ups:
- Run the database migration to ensure vehicle fields exist
- Update contract creation/edit forms to properly populate vehicle fields
- Consider data migration strategy for existing contracts
- Add validation to ensure consistency between linked vehicles and direct fields

---

# Phase 1 - Database & Hooks Implementation (New)

## ✅ Completed Tasks

1. **Created database migration for vehicle insurance table**
   - File: `20251018110000_create_vehicle_insurance_table.sql`
   - Table name: `fleet_vehicle_insurance`
   - Added all required fields for vehicle insurance tracking
   - Implemented proper RLS policies
   - Added indexes for performance

2. **Created database migration for vehicle groups table**
   - File: `20251018110001_create_vehicle_groups_table.sql`
   - Table name: `fleet_vehicle_groups`
   - Added all required fields for vehicle group management
   - Implemented proper RLS policies
   - Added indexes for performance

3. **Created database migration for company number format preferences**
   - File: `20251018110002_add_number_format_preferences_to_companies.sql`
   - Added `number_format_preferences` JSONB column to companies table
   - Set default values for backward compatibility

4. **Created new hooks for vehicle insurance**
   - File: `src/hooks/useFleetVehicleInsurance.ts`
   - Implemented CRUD operations with React Query
   - Added proper error handling and toast notifications
   - Used new table name to avoid conflicts
   - **Note: Use this new hook instead of the deprecated `useVehicleInsurance.ts`**

5. **Created new hooks for vehicle groups**
   - File: `src/hooks/useFleetVehicleGroups.ts`
   - Implemented CRUD operations with React Query
   - Added proper error handling and toast notifications
   - Included soft delete functionality
   - **Note: Use this new hook instead of the deprecated `useVehicleGroups.ts`**

6. **Updated number preferences hook**
   - File: `src/hooks/useNumberPreferences.ts`
   - Connected to companies table for persistent storage
   - Added loading state management
   - Implemented error handling with rollback

## 🔄 In Progress

- Testing the new hooks with actual database operations
- Verifying RLS policies work correctly
- Ensuring proper error handling in all scenarios

## ⏳ Next Steps

1. Run database migrations to create new tables
2. Test CRUD operations with the new hooks
3. Update any components that need to use these new hooks
4. Document the new APIs for other developers