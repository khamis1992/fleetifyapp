# Fix Four Data Integrity Issues - Fleetify

## Context
- Company: العراف لتأجير السيارات (Al-Araf Car Rental)
- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
- Database: Supabase qwhunliohlkkahbspfiu
- Verified issues from read-only database investigation

## Todo Items

### 1. Link desktop-import contracts to vehicles
- [x] Create data-fix migration to link 36 contracts with NULL vehicle_id to matching vehicles by plate_number
- [x] Add trigger/function to auto-link on contract insert when vehicle_id is NULL but license_plate matches
- [x] Test the auto-link function

### 2. Fix vehicle status sync for legal/active contracts  
- [x] Investigate `system_agent_vehicle_derived_state` logic for under_legal_procedure contracts
- [x] Review whether the logic correctly treats both 'active' and 'under_legal_procedure' (when vehicle_returned=false) as occupying
- [x] Create migration to fix 2 'available' vehicles with active contracts (plates 2780, 7066)
- [x] Verify 18 'rented' vehicles with only under_legal_procedure contracts are correctly handled
- [x] Document expected behavior in migration comments

### 3. Merge duplicate plates with whitespace differences
- [x] Create migration to merge 3 duplicate plate pairs:
  - `185 513` / `185513`
  - `185 573` / `185573`  
  - `599 720` / `599720`
- [x] For each pair: identify keep/retire, move FKs (contracts, maintenance, etc.), deactivate retired vehicle
- [x] Update trigger `enforce_vehicle_plate_uniqueness` to normalize ALL whitespace (not just trim+collapse)
- [x] Add test case for the normalization

### 4. Add unique constraint on customers.national_id
- [x] Create migration to add partial unique index on (company_id, national_id) WHERE national_id IS NOT NULL AND BTRIM(national_id) != ''
- [x] Verify 0 duplicates exist today before applying constraint
- [x] Test that NULLs and blanks are allowed multiple times

### 5. Testing & Documentation
- [ ] Write standalone SQL script that can be run manually on production
- [ ] Test all migrations in dev environment (if accessible)
- [ ] Create git branch, commit, and push changes
- [ ] Create PR with detailed description

---

## Review Section
(To be filled after completion)
